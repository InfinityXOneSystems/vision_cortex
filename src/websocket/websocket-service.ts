/**
 * 🔄 WEBSOCKET SERVICE
 * Real-time intelligence streaming for Vision Cortex
 * 
 * @author Infinity X One Systems
 * @version 2.0.0
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { WebSocketEventType, WebSocketIntelligenceEvent } from '../intelligence/types';

export interface IntelligenceStream {
  user_id?: string;
  intelligence_types: string[];
  regions: string[];
  confidence_threshold: number;
  real_time: boolean;
}

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private connectedClients: Map<string, Socket> = new Map();
  private subscriptions: Map<string, IntelligenceStream> = new Map();

  constructor() {
    console.log('🔄 WebSocket Service initialized');
  }

  initialize(server: HttpServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: [
          'https://infinityxoneintelligence.com',
          'http://localhost:3000',
          'http://localhost:4000'
        ],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      this.connectedClients.set(socket.id, socket);

      // Handle intelligence subscription
      socket.on('subscribe:intelligence', (stream: IntelligenceStream) => {
        this.subscriptions.set(socket.id, stream);
        console.log(`📡 Client ${socket.id} subscribed to intelligence stream`);
        
        socket.emit('subscription:confirmed', {
          client_id: socket.id,
          stream: stream,
          timestamp: new Date().toISOString()
        });
      });

      // Handle real-time data requests
      socket.on('request:market-data', (params: any) => {
        this.handleMarketDataRequest(socket, params);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
        this.subscriptions.delete(socket.id);
      });
    });

    console.log('✅ WebSocket Service ready');
  }

  broadcastIntelligence(intelligence: any): void {
    if (!this.io) return;

    this.subscriptions.forEach((stream, clientId) => {
      const socket = this.connectedClients.get(clientId);
      if (!socket) return;

      // Check if intelligence matches subscription filters
      if (this.matchesSubscription(intelligence, stream)) {
        const event: WebSocketIntelligenceEvent = {
          event_type: 'intelligence:synthesized' as WebSocketEventType,
          intelligence_id: intelligence.id,
          data: intelligence,
          priority: this.determinePriority(intelligence),
          timestamp: new Date().toISOString(),
          expires_at: intelligence.decay_window
        };
        
        socket.emit('intelligence.new', event);
        
        // Also emit legacy format for backward compatibility
        socket.emit('intelligence:new', {
          intelligence,
          timestamp: new Date().toISOString(),
          stream_id: clientId
        });
      }
    });
  }

  broadcastMarketUpdate(update: any): void {
    if (!this.io) {
      return;
    }

    this.io.emit('market:update', {
      update,
      timestamp: new Date().toISOString()
    });
  }

  private matchesSubscription(intelligence: any, stream: IntelligenceStream): boolean {
    // Check intelligence type filter
    if (stream.intelligence_types.length > 0) {
      if (!stream.intelligence_types.includes(intelligence.intelligence_type)) {
        return false;
      }
    }

    // Check confidence threshold
    if (intelligence.confidence < stream.confidence_threshold) {
      return false;
    }

    // Check region filter
    if (stream.regions.length > 0) {
      const intelligenceRegion = intelligence.geography?.state || intelligence.geography?.country;
      if (!intelligenceRegion || !stream.regions.includes(intelligenceRegion)) {
        return false;
      }
    }

    return true;
  }

  private handleMarketDataRequest(socket: Socket, params: any): void {
    // Simulate real-time market data
    const marketData = {
      region: params.region || 'Port St. Lucie, FL',
      metrics: {
        median_price: 425000 + (Math.random() - 0.5) * 10000,
        price_change_30d: (Math.random() - 0.5) * 0.1,
        inventory_days: 45 + Math.random() * 30,
        new_listings: Math.floor(Math.random() * 100) + 50
      },
      timestamp: new Date().toISOString()
    };

    socket.emit('market:data', marketData);
  }

  // 🌐 FAANG-Ready Event Broadcasting
  broadcastSignalThresholdCrossed(signal: any): void {
    this.broadcastEvent({
      event_type: 'signal:strengthened',
      intelligence_id: signal.id,
      data: signal,
      priority: 'high',
      timestamp: new Date().toISOString()
    });
  }
  
  broadcastAnomalyDetected(anomaly: any): void {
    this.broadcastEvent({
      event_type: 'anomaly:detected',
      intelligence_id: anomaly.id,
      data: anomaly,
      priority: anomaly.severity === 'critical' ? 'urgent' : 'high',
      timestamp: new Date().toISOString()
    });
  }
  
  broadcastConfidenceIncrease(intelligence: any, oldConfidence: number): void {
    this.broadcastEvent({
      event_type: 'confidence:increased',
      intelligence_id: intelligence.id,
      data: { intelligence, old_confidence: oldConfidence },
      priority: 'medium',
      timestamp: new Date().toISOString()
    });
  }
  
  private broadcastEvent(event: WebSocketIntelligenceEvent): void {
    if (!this.io) return;
    
    this.io.emit(event.event_type, event);
    console.log(`📡 Broadcasted ${event.event_type} event: ${event.intelligence_id}`);
  }
  
  private determinePriority(intelligence: any): 'low' | 'medium' | 'high' | 'urgent' {
    if (intelligence.confidence_conviction_metrics?.conviction_level === 'extreme') {
      return 'urgent';
    }
    if (intelligence.confidence > 0.8) {
      return 'high';
    }
    if (intelligence.confidence > 0.6) {
      return 'medium';
    }
    return 'low';
  }

  close(): void {
    if (this.io) {
      this.io.close();
      console.log('🔄 WebSocket Service closed');
    }
  }
}