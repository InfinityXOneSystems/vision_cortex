/**
 * 🧠 VISION CORTEX QUANTUM AI BRAIN - SERVER
 * 
 * Central intelligence system that feeds all other services
 * Google Cloud Run optimized with inter-service communication
 * 
 * @author Infinity X One Systems
 * @version 2.0.0
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { QuantumIntelligenceCore } from './intelligence/quantum-core';
import { IntelligenceSyncService } from './services/intelligence-sync';
import { TaxonomyIntegration } from './integrations/taxonomy-integration';
import { IndexIntegration } from './integrations/index-integration';
import { AutoBuilderIntegration } from './integrations/auto-builder-integration';
import { HealthMonitor } from './services/health-monitor';
import { 
  IntelligenceSynthesisRequest,
  SynthesisRequestSchema,
  SignalQuerySchema,
  AnomalyQuerySchema
} from './intelligence/types';

const app = express();

// Security: Disable X-Powered-By header  
app.disable('x-powered-by');

const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ============================================================================
// GLOBAL CONFIGURATION
// ============================================================================

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('🧠 VISION CORTEX QUANTUM AI BRAIN INITIALIZING...');
console.log(`📊 Environment: ${NODE_ENV}`);
console.log(`🌐 Port: ${PORT}`);

// ============================================================================
// CORE SYSTEMS INITIALIZATION
// ============================================================================

const quantumCore = new QuantumIntelligenceCore();
const syncService = new IntelligenceSyncService();
const taxonomyIntegration = new TaxonomyIntegration();
const indexIntegration = new IndexIntegration();
const autoBuilderIntegration = new AutoBuilderIntegration({
  baseUrl: process.env.AUTO_BUILDER_URL || 'http://localhost:3001',
  apiKey: process.env.AUTO_BUILDER_API_KEY || 'dev-key',
  timeout: 5000
});
const healthMonitor = new HealthMonitor();

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: [
    'https://infinityxoneintelligence.com',
    'https://vision-cortex-*.run.app',
    'https://real-estate-intelligence-*.run.app',
    'https://auto-builder-*.run.app',
    'http://localhost:3000',
    'http://localhost:4000'
  ],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ============================================================================
// QUANTUM INTELLIGENCE ENDPOINTS
// ============================================================================

/**
 * 🎯 Intelligence Synthesis Engine
 * Core endpoint for generating asymmetric intelligence
 */
app.post('/vision-cortex/intelligence/synthesize', async (req, res) => {
  try {
    const validatedRequest = SynthesisRequestSchema.parse(req.body);
    
    console.log(`🔄 Synthesizing intelligence: "${validatedRequest.question}"`);
    
    const intelligence = await quantumCore.synthesizeIntelligence(validatedRequest);
    
    // Broadcast to connected services
    await syncService.broadcastIntelligence(intelligence);
    
    // Emit real-time update
    io.emit('intelligence:synthesized', {
      intelligence,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      intelligence,
      meta: {
        synthesis_time: Date.now(),
        version: '2.0.0',
        quantum_brain: true
      }
    });
    
  } catch (error) {
    console.error('❌ Intelligence synthesis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Intelligence synthesis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 📡 Signal Detection Engine
 */
app.get('/vision-cortex/signals', async (req, res) => {
  try {
    const query = SignalQuerySchema.parse(req.query);
    
    // TODO: Implement signal detection
    const signals = [
      {
        signal: 'Quantum Processing Anomaly',
        strength: 0.89,
        description: 'Multi-model consensus breakdown detected in real estate domain',
        first_detected: new Date().toISOString(),
        trend_direction: 'strengthening'
      }
    ];
    
    res.json({
      success: true,
      signals,
      meta: {
        detection_time: Date.now(),
        quantum_brain: true
      }
    });
    
  } catch (error) {
    console.error('❌ Signal detection failed:', error);
    res.status(500).json({
      success: false,
      error: 'Signal detection failed'
    });
  }
});

/**
 * 🚨 Anomaly Detection Engine
 */
app.get('/vision-cortex/anomalies', async (req, res) => {
  try {
    const query = AnomalyQuerySchema.parse(req.query);
    
    // TODO: Implement anomaly detection
    const anomalies = [
      {
        anomaly: 'Cross-system intelligence divergence',
        explanation: 'Taxonomy and index systems showing conflicting patterns',
        impact: 'May indicate emerging market shift not captured by traditional metrics',
        severity: 'medium',
        affected_domains: ['real_estate', 'taxonomy'],
        detection_timestamp: new Date().toISOString()
      }
    ];
    
    res.json({
      success: true,
      anomalies,
      meta: {
        detection_time: Date.now(),
        quantum_brain: true
      }
    });
    
  } catch (error) {
    console.error('❌ Anomaly detection failed:', error);
    res.status(500).json({
      success: false,
      error: 'Anomaly detection failed'
    });
  }
});

/**
 * 🔒 Classified Intelligence Preview
 */
app.get('/vision-cortex/classified/preview', async (req, res) => {
  try {
    const preview = {
      summary: 'High-confidence asymmetric opportunity detected across multiple domains',
      redacted: true,
      unlock_message: 'Full intelligence coordinates require quantum-level access',
      preview_signals: ['Multi-domain convergence', 'Temporal advantage window'],
      confidence_indicator: 'high'
    };
    
    res.json({
      success: true,
      preview,
      meta: {
        quantum_brain: true,
        access_level: 'preview'
      }
    });
    
  } catch (error) {
    console.error('❌ Classified preview failed:', error);
    res.status(500).json({
      success: false,
      error: 'Classified preview failed'
    });
  }
});

// ============================================================================
// INTER-SERVICE INTEGRATION ENDPOINTS
// ============================================================================

/**
 * 📚 Taxonomy System Integration
 */
app.post('/vision-cortex/integrations/taxonomy/sync', async (req, res) => {
  try {
    await taxonomyIntegration.syncWithTaxonomy(req.body);
    
    res.json({
      success: true,
      message: 'Taxonomy sync completed',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Taxonomy sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Taxonomy sync failed'
    });
  }
});

/**
 * 🗂️ Index System Integration
 */
app.post('/vision-cortex/integrations/index/sync', async (req, res) => {
  try {
    await indexIntegration.syncWithIndex(req.body);
    
    res.json({
      success: true,
      message: 'Index sync completed',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Index sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Index sync failed'
    });
  }
});

/**
 * 🔧 Auto Builder Integration
 */
app.post('/vision-cortex/integrations/auto-builder/sync', async (req, res) => {
  try {
    await autoBuilderIntegration.syncWithAutoBuilder(req.body);
    
    res.json({
      success: true,
      message: 'Auto Builder sync completed',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Auto Builder sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Auto Builder sync failed'
    });
  }
});

// ============================================================================
// SYSTEM STATUS & HEALTH ENDPOINTS
// ============================================================================

/**
 * 🏥 Health Check (Google Cloud Run)
 */
app.get('/health', async (req, res) => {
  try {
    const status = await healthMonitor.getSystemHealth();
    
    res.json({
      status: 'healthy',
      quantum_brain: true,
      system: status,
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 📊 System Status
 */
app.get('/vision-cortex/status', async (req, res) => {
  try {
    const status = quantumCore.getSystemStatus();
    const syncStatus = syncService.getSyncStatus();
    
    res.json({
      success: true,
      status: {
        quantum_core: status,
        sync_service: syncStatus,
        integrations: {
          taxonomy: taxonomyIntegration.getStatus(),
          index: indexIntegration.getStatus(),
          auto_builder: autoBuilderIntegration.getStatus()
        }
      },
      quantum_brain: true
    });
    
  } catch (error) {
    console.error('❌ Status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Status check failed'
    });
  }
});

// ============================================================================
// WEBSOCKET REAL-TIME INTELLIGENCE
// ============================================================================

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.emit('quantum:connected', {
    message: 'Connected to Vision Cortex Quantum AI Brain',
    timestamp: new Date().toISOString(),
    capabilities: ['intelligence', 'signals', 'anomalies', 'real-time-sync']
  });
  
  socket.on('intelligence:request', async (request) => {
    try {
      const intelligence = await quantumCore.synthesizeIntelligence(request);
      socket.emit('intelligence:response', intelligence);
    } catch (error) {
      socket.emit('intelligence:error', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((error: any, req: any, res: any, next: any) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    quantum_brain: true
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    quantum_brain: true,
    available_endpoints: [
      '/vision-cortex/intelligence/synthesize',
      '/vision-cortex/signals',
      '/vision-cortex/anomalies',
      '/vision-cortex/classified/preview',
      '/health',
      '/vision-cortex/status'
    ]
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startQuantumBrain() {
  try {
    // Initialize all integrations
    await taxonomyIntegration.initialize();
    await indexIntegration.initialize();
    await autoBuilderIntegration.initialize();
    await syncService.initialize();
    
    // Start server
    server.listen(parseInt(PORT), '0.0.0.0', () => {
      console.log('🚀 VISION CORTEX QUANTUM AI BRAIN OPERATIONAL');
      console.log(`📡 Server: http://0.0.0.0:${PORT}`);
      console.log(`🌐 WebSocket: ws://0.0.0.0:${PORT}`);
      console.log(`🧠 Quantum Intelligence: ACTIVE`);
      console.log(`🔄 Inter-service sync: ENABLED`);
      console.log(`📊 Health endpoint: /health`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start Quantum AI Brain:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('💤 Quantum AI Brain shutdown complete');
    process.exit(0);
  });
});

// Start the quantum intelligence system
startQuantumBrain().catch(console.error);

export { app, server, io };