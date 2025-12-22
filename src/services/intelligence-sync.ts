/**
 * 🔄 INTELLIGENCE SYNC SERVICE
 * 
 * Orchestrates synchronization between Vision Cortex and all intelligence systems
 * Handles real-time data flow and inter-service communication
 * 
 * @author Infinity X One Systems
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import axios from 'axios';
import { CoreIntelligenceEnvelope } from '../intelligence/types';

interface ServiceEndpoint {
  name: string;
  url: string;
  type: 'intelligence' | 'data' | 'processing';
  healthEndpoint: string;
  syncEndpoint: string;
  isActive: boolean;
  lastSync: Date | null;
}

export class IntelligenceSyncService extends EventEmitter {
  private services: Map<string, ServiceEndpoint> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    
    // Initialize service endpoints from environment
    this.initializeServiceEndpoints();
    
    console.log('🔄 Intelligence Sync Service initialized');
  }

  async initialize(): Promise<void> {
    console.log('🚀 Starting Intelligence Sync Service...');
    
    // Initial health checks
    await this.performHealthChecks();
    
    // Start periodic sync
    this.startPeriodicSync();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    console.log('✅ Intelligence Sync Service operational');
  }

  /**
   * 📡 Initialize Service Endpoints
   */
  private initializeServiceEndpoints(): void {
    const serviceConfigs = [
      {
        name: 'taxonomy',
        url: process.env.TAXONOMY_SERVICE_URL || 'https://taxonomy-service.run.app',
        type: 'data' as const,
        healthEndpoint: '/health',
        syncEndpoint: '/api/sync/vision-cortex'
      },
      {
        name: 'index',
        url: process.env.INDEX_SERVICE_URL || 'https://index-service.run.app', 
        type: 'data' as const,
        healthEndpoint: '/health',
        syncEndpoint: '/api/sync/vision-cortex'
      },
      {
        name: 'auto-builder',
        url: process.env.AUTO_BUILDER_SERVICE_URL || 'https://auto-builder-service.run.app',
        type: 'processing' as const,
        healthEndpoint: '/api/health',
        syncEndpoint: '/api/sync/intelligence'
      },
      {
        name: 'real-estate-intelligence',
        url: process.env.REAL_ESTATE_SERVICE_URL || 'https://real-estate-intelligence.run.app',
        type: 'intelligence' as const,
        healthEndpoint: '/health',
        syncEndpoint: '/api/intelligence/sync'
      },
      {
        name: 'omni-gateway',
        url: process.env.GATEWAY_SERVICE_URL || 'https://omni-gateway.run.app',
        type: 'processing' as const,
        healthEndpoint: '/health', 
        syncEndpoint: '/api/sync/intelligence'
      }
    ];

    serviceConfigs.forEach(config => {
      this.services.set(config.name, {
        ...config,
        isActive: false,
        lastSync: null
      });
    });

    console.log(`📡 Configured ${this.services.size} service endpoints`);
  }

  /**
   * 🏥 Perform Health Checks
   */
  private async performHealthChecks(): Promise<void> {
    console.log('🔍 Performing health checks on all services...');

    const healthPromises = Array.from(this.services.entries()).map(async ([name, service]) => {
      try {
        const response = await axios.get(`${service.url}${service.healthEndpoint}`, {
          timeout: 10000,
          validateStatus: (status) => status < 500
        });

        const isHealthy = response.status === 200;
        service.isActive = isHealthy;

        if (isHealthy) {
          console.log(`✅ ${name}: HEALTHY`);
        } else {
          console.log(`⚠️  ${name}: DEGRADED (${response.status})`);
        }

        this.emit('service:health', { service: name, healthy: isHealthy, status: response.status });

      } catch (error) {
        console.log(`❌ ${name}: OFFLINE`);
        service.isActive = false;
        this.emit('service:health', { service: name, healthy: false, error: error.message });
      }
    });

    await Promise.all(healthPromises);

    const activeServices = Array.from(this.services.values()).filter(s => s.isActive).length;
    console.log(`📊 Services: ${activeServices}/${this.services.size} active`);
  }

  /**
   * 📡 Broadcast Intelligence to All Services
   */
  async broadcastIntelligence(intelligence: CoreIntelligenceEnvelope): Promise<void> {
    console.log('📡 Broadcasting intelligence to all active services...');

    const activeServices = Array.from(this.services.entries()).filter(([_, service]) => service.isActive);
    
    if (activeServices.length === 0) {
      console.log('⚠️  No active services for intelligence broadcast');
      return;
    }

    const broadcastPromises = activeServices.map(async ([name, service]) => {
      try {
        const payload = {
          source: 'vision-cortex-quantum-brain',
          intelligence,
          timestamp: new Date().toISOString(),
          quantum_signature: true
        };

        const response = await axios.post(`${service.url}${service.syncEndpoint}`, payload, {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'X-Vision-Cortex-Source': 'quantum-brain',
            'X-Intelligence-Type': intelligence.intelligence_type
          }
        });

        service.lastSync = new Date();
        console.log(`✅ Broadcast to ${name}: SUCCESS`);

        this.emit('intelligence:broadcasted', { service: name, intelligence });

      } catch (error) {
        console.error(`❌ Broadcast to ${name}: FAILED`, error.message);
        this.emit('intelligence:broadcast-failed', { service: name, error: error.message });
      }
    });

    await Promise.all(broadcastPromises);
    console.log(`📡 Intelligence broadcast completed to ${activeServices.length} services`);
  }

  /**
   * 🔄 Sync Specific Service
   */
  async syncWithService(serviceName: string, data: any): Promise<boolean> {
    const service = this.services.get(serviceName);
    
    if (!service) {
      console.error(`❌ Service not found: ${serviceName}`);
      return false;
    }

    if (!service.isActive) {
      console.error(`❌ Service offline: ${serviceName}`);
      return false;
    }

    try {
      const payload = {
        source: 'vision-cortex-quantum-brain',
        data,
        timestamp: new Date().toISOString(),
        quantum_signature: true
      };

      const response = await axios.post(`${service.url}${service.syncEndpoint}`, payload, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'X-Vision-Cortex-Source': 'quantum-brain'
        }
      });

      service.lastSync = new Date();
      console.log(`✅ Sync with ${serviceName}: SUCCESS`);

      this.emit('service:synced', { service: serviceName, response: response.data });
      return true;

    } catch (error) {
      console.error(`❌ Sync with ${serviceName}: FAILED`, error.message);
      this.emit('service:sync-failed', { service: serviceName, error: error.message });
      return false;
    }
  }

  /**
   * 📊 Get Intelligence from External Services
   */
  async pullIntelligenceFromServices(): Promise<any[]> {
    console.log('🔍 Pulling intelligence from external services...');

    const activeServices = Array.from(this.services.entries()).filter(([_, service]) => 
      service.isActive && service.type === 'intelligence'
    );

    const pullPromises = activeServices.map(async ([name, service]) => {
      try {
        const response = await axios.get(`${service.url}/api/intelligence/latest`, {
          timeout: 10000,
          headers: {
            'X-Vision-Cortex-Request': 'true'
          }
        });

        console.log(`✅ Pulled intelligence from ${name}`);
        return {
          source: name,
          intelligence: response.data,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        console.error(`❌ Failed to pull from ${name}:`, error.message);
        return null;
      }
    });

    const results = await Promise.all(pullPromises);
    const validResults = results.filter(r => r !== null);

    console.log(`📊 Pulled intelligence from ${validResults.length} services`);
    return validResults;
  }

  /**
   * 🔄 Start Periodic Sync
   */
  private startPeriodicSync(): void {
    // Sync every 30 seconds
    this.syncInterval = setInterval(async () => {
      try {
        await this.pullIntelligenceFromServices();
      } catch (error) {
        console.error('❌ Periodic sync failed:', error);
      }
    }, 30000);

    console.log('🔄 Periodic sync started (30s intervals)');
  }

  /**
   * 🏥 Start Health Monitoring
   */
  private startHealthMonitoring(): void {
    // Health check every 2 minutes
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 120000);

    console.log('🏥 Health monitoring started (2min intervals)');
  }

  /**
   * 📊 Get Sync Status
   */
  getSyncStatus() {
    const services = Array.from(this.services.entries()).map(([name, service]) => ({
      name,
      url: service.url,
      type: service.type,
      active: service.isActive,
      last_sync: service.lastSync?.toISOString() || null
    }));

    const activeCount = services.filter(s => s.active).length;

    return {
      total_services: this.services.size,
      active_services: activeCount,
      sync_health: activeCount / this.services.size,
      services,
      periodic_sync: this.syncInterval !== null,
      health_monitoring: this.healthCheckInterval !== null
    };
  }

  /**
   * 🛑 Shutdown
   */
  shutdown(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    console.log('🛑 Intelligence Sync Service shutdown');
  }
}