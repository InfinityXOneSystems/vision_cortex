/**
 * 🌐 INFINITY X ONE - OMNI GATEWAY SYSTEM
 * 
 * Ultimate Modular API Gateway with MCP Protocol Support
 * Seamless Inter-Intelligence System Communication Hub
 * 
 * Features:
 * - Model Context Protocol (MCP) Support
 * - Dynamic Service Discovery
 * - Circuit Breakers & Failover
 * - Real-time Health Monitoring
 * - Modular Intelligence System Integration
 * 
 * @author Infinity X One Systems
 * @version 2.0.0
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';

// MCP Protocol Support
import { MCPClient, MCPServer, Tool, Resource } from './mcp/mcp-protocol';

// Intelligence System Routers
import VisionCortexAPIRouter from '../api/vision-cortex-router';
import RealEstateAPIRouter from '../api/real-estate-router';

// Core Gateway Components
import { CircuitBreaker } from './core/circuit-breaker';
import { ServiceRegistry } from './core/service-registry';
import { LoadBalancer } from './core/load-balancer';
import { AuthenticationManager } from './core/auth-manager';
import { HealthMonitor } from './core/health-monitor';
import { RequestTracer } from './core/request-tracer';

// Types & Interfaces
export interface IntelligenceService {
  name: string;
  type: 'primary' | 'secondary' | 'utility';
  baseUrl: string;
  healthEndpoint: string;
  capabilities: string[];
  priority: number;
  version: string;
  mcp: {
    enabled: boolean;
    tools?: Tool[];
    resources?: Resource[];
    prompts?: any[];
  };
  endpoints: {
    [key: string]: {
      path: string;
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      description: string;
      auth?: boolean;
      rateLimit?: number;
    };
  };
}

export interface GatewayConfig {
  port: number;
  enableWebSocket: boolean;
  enableMCP: boolean;
  rateLimiting: {
    windowMs: number;
    max: number;
  };
  circuitBreaker: {
    failureThreshold: number;
    resetTimeout: number;
  };
  services: IntelligenceService[];
  cors: {
    origins: string[];
    credentials: boolean;
  };
}

export interface RoutingDecision {
  targetService: string;
  endpoint: string;
  method: string;
  confidence: number;
  reasoning: string;
  fallbacks: string[];
  metadata: {
    loadBalancing: boolean;
    circuitBreakerStatus: string;
    estimatedLatency: number;
  };
}

export class OmniGateway extends EventEmitter {
  private app: Application;
  private server: any;
  private wss?: WebSocketServer;
  private config: GatewayConfig;
  
  // Core Components
  private serviceRegistry: ServiceRegistry;
  private loadBalancer: LoadBalancer;
  private authManager: AuthenticationManager;
  private healthMonitor: HealthMonitor;
  private requestTracer: RequestTracer;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  
  // MCP Support
  private mcpServer?: MCPServer;
  private mcpClients: Map<string, MCPClient> = new Map();
  
  // Intelligence System Routers
  private visionCortexRouter: VisionCortexAPIRouter;
  private realEstateRouter: RealEstateAPIRouter;
  
  // Service Clients
  private serviceClients: Map<string, AxiosInstance> = new Map();
  
  constructor(config: GatewayConfig) {
    super();
    this.config = config;
    this.app = express();
    this.initializeComponents();
  }

  /**
   * Initialize all gateway components
   */
  private async initializeComponents(): Promise<void> {
    console.log('🚀 Initializing Omni Gateway System...');
    
    // Initialize core components
    this.serviceRegistry = new ServiceRegistry();
    this.loadBalancer = new LoadBalancer();
    this.authManager = new AuthenticationManager();
    this.healthMonitor = new HealthMonitor();
    this.requestTracer = new RequestTracer();
    
    // Initialize intelligence system routers
    this.visionCortexRouter = new VisionCortexAPIRouter();
    this.realEstateRouter = new RealEstateAPIRouter();
    
    // Register intelligence services
    await this.registerIntelligenceSystems();
    
    // Initialize MCP if enabled
    if (this.config.enableMCP) {
      await this.initializeMCP();
    }
    
    // Setup middleware and routes
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    
    console.log('✅ Omni Gateway System initialized');
  }

  /**
   * Register all intelligence systems with the gateway
   */
  private async registerIntelligenceSystems(): Promise<void> {
    console.log('📋 Registering Intelligence Systems...');
    
    const defaultServices: IntelligenceService[] = [
      {
        name: 'vision-cortex',
        type: 'primary',
        baseUrl: process.env.VISION_CORTEX_URL || 'http://localhost:3001',
        healthEndpoint: '/health',
        capabilities: ['chat', 'reasoning', 'memory', 'autonomous'],
        priority: 1,
        version: '1.0.0',
        mcp: {
          enabled: true,
          tools: [
            { name: 'vision_cortex_chat', description: 'Multi-model chat with reasoning' },
            { name: 'vision_cortex_memory', description: 'Vector memory search' },
            { name: 'vision_cortex_autonomous', description: 'Autonomous task execution' }
          ],
          resources: [
            { uri: 'vision://memory/global', name: 'Global Memory Store' },
            { uri: 'vision://models/routing', name: 'Model Router' }
          ]
        },
        endpoints: {
          chat: { path: '/api/vision-cortex/chat', method: 'POST', description: 'Multi-model chat', auth: true },
          reasoning: { path: '/api/vision-cortex/reasoning/trace', method: 'POST', description: 'Reasoning trace', auth: true },
          memory: { path: '/api/vision-cortex/memory/query', method: 'GET', description: 'Memory query', auth: true },
          autonomous: { path: '/api/vision-cortex/autonomous/execute', method: 'POST', description: 'Autonomous execution', auth: true },
          health: { path: '/api/vision-cortex/health', method: 'GET', description: 'Health check', auth: false }
        }
      },
      {
        name: 'real-estate-intelligence',
        type: 'primary',
        baseUrl: process.env.REAL_ESTATE_URL || 'http://localhost:3002',
        healthEndpoint: '/health',
        capabilities: ['market-analysis', 'property-evaluation', 'investment-insights', 'trend-prediction'],
        priority: 2,
        version: '1.0.0',
        mcp: {
          enabled: true,
          tools: [
            { name: 'real_estate_chat', description: 'Real estate domain chat' },
            { name: 'market_analysis', description: 'Market trend analysis' },
            { name: 'property_evaluation', description: 'Property valuation' }
          ],
          resources: [
            { uri: 'realestate://market/data', name: 'Market Data Store' },
            { uri: 'realestate://properties/listings', name: 'Property Listings' }
          ]
        },
        endpoints: {
          chat: { path: '/api/real-estate/chat', method: 'POST', description: 'Real estate chat', auth: true },
          market: { path: '/api/real-estate/market/analysis', method: 'GET', description: 'Market analysis', auth: true },
          evaluate: { path: '/api/real-estate/property/evaluate', method: 'POST', description: 'Property evaluation', auth: true },
          trends: { path: '/api/real-estate/trends', method: 'GET', description: 'Market trends', auth: false },
          health: { path: '/api/real-estate/health', method: 'GET', description: 'Health check', auth: false }
        }
      },
      {
        name: 'agents-system',
        type: 'primary',
        baseUrl: process.env.AGENTS_URL || 'http://localhost:3003',
        healthEndpoint: '/health',
        capabilities: ['agent-orchestration', 'task-automation', 'workflow-management'],
        priority: 3,
        version: '1.0.0',
        mcp: {
          enabled: true,
          tools: [
            { name: 'create_agent', description: 'Create new agent' },
            { name: 'execute_workflow', description: 'Execute agent workflow' },
            { name: 'monitor_agents', description: 'Monitor agent status' }
          ]
        },
        endpoints: {
          create: { path: '/api/agents/create', method: 'POST', description: 'Create agent', auth: true },
          execute: { path: '/api/agents/execute', method: 'POST', description: 'Execute workflow', auth: true },
          status: { path: '/api/agents/status', method: 'GET', description: 'Agent status', auth: true },
          health: { path: '/api/agents/health', method: 'GET', description: 'Health check', auth: false }
        }
      },
      {
        name: 'analytics-system',
        type: 'secondary',
        baseUrl: process.env.ANALYTICS_URL || 'http://localhost:3004',
        healthEndpoint: '/health',
        capabilities: ['data-analysis', 'metrics', 'reporting', 'visualization'],
        priority: 4,
        version: '1.0.0',
        mcp: {
          enabled: true,
          tools: [
            { name: 'generate_report', description: 'Generate analytics report' },
            { name: 'query_metrics', description: 'Query system metrics' }
          ]
        },
        endpoints: {
          analyze: { path: '/api/analytics/analyze', method: 'POST', description: 'Data analysis', auth: true },
          metrics: { path: '/api/analytics/metrics', method: 'GET', description: 'System metrics', auth: true },
          reports: { path: '/api/analytics/reports', method: 'GET', description: 'Generated reports', auth: true },
          health: { path: '/api/analytics/health', method: 'GET', description: 'Health check', auth: false }
        }
      },
      {
        name: 'memory-system',
        type: 'utility',
        baseUrl: process.env.MEMORY_URL || 'http://localhost:3005',
        healthEndpoint: '/health',
        capabilities: ['vector-storage', 'semantic-search', 'knowledge-graph', 'embeddings'],
        priority: 5,
        version: '1.0.0',
        mcp: {
          enabled: true,
          tools: [
            { name: 'store_memory', description: 'Store memory vector' },
            { name: 'search_memory', description: 'Semantic memory search' },
            { name: 'update_knowledge', description: 'Update knowledge graph' }
          ]
        },
        endpoints: {
          store: { path: '/api/memory/store', method: 'POST', description: 'Store memory', auth: true },
          search: { path: '/api/memory/search', method: 'GET', description: 'Search memory', auth: true },
          knowledge: { path: '/api/memory/knowledge', method: 'GET', description: 'Knowledge graph', auth: true },
          health: { path: '/api/memory/health', method: 'GET', description: 'Health check', auth: false }
        }
      },
      {
        name: 'security-system',
        type: 'utility',
        baseUrl: process.env.SECURITY_URL || 'http://localhost:3006',
        healthEndpoint: '/health',
        capabilities: ['authentication', 'authorization', 'threat-detection', 'audit'],
        priority: 6,
        version: '1.0.0',
        mcp: {
          enabled: true,
          tools: [
            { name: 'authenticate_user', description: 'User authentication' },
            { name: 'check_permissions', description: 'Permission validation' },
            { name: 'detect_threats', description: 'Security threat detection' }
          ]
        },
        endpoints: {
          auth: { path: '/api/security/auth', method: 'POST', description: 'Authentication', auth: false },
          validate: { path: '/api/security/validate', method: 'POST', description: 'Token validation', auth: false },
          threats: { path: '/api/security/threats', method: 'GET', description: 'Threat detection', auth: true },
          health: { path: '/api/security/health', method: 'GET', description: 'Health check', auth: false }
        }
      }
    ];

    // Register services with the service registry
    for (const service of [...defaultServices, ...this.config.services]) {
      await this.serviceRegistry.register(service);
      
      // Initialize circuit breaker for each service
      this.circuitBreakers.set(service.name, new CircuitBreaker({
        failureThreshold: this.config.circuitBreaker.failureThreshold,
        resetTimeout: this.config.circuitBreaker.resetTimeout
      }));
      
      // Create HTTP client for each service
      this.serviceClients.set(service.name, axios.create({
        baseURL: service.baseUrl,
        timeout: 30000,
        headers: {
          'User-Agent': 'Omni-Gateway/2.0.0',
          'X-Gateway-Version': '2.0.0'
        }
      }));
      
      // Initialize MCP client if service supports MCP
      if (service.mcp.enabled && this.config.enableMCP) {
        const mcpClient = new MCPClient({
          name: service.name,
          baseUrl: service.baseUrl,
          tools: service.mcp.tools || [],
          resources: service.mcp.resources || []
        });
        this.mcpClients.set(service.name, mcpClient);
      }
      
      console.log(`✅ Registered: ${service.name} (${service.type})`);
    }
    
    // Start health monitoring
    this.healthMonitor.startMonitoring(Array.from(this.serviceRegistry.getAllServices()));
  }

  /**
   * Initialize Model Context Protocol (MCP) support
   */
  private async initializeMCP(): Promise<void> {
    console.log('🔌 Initializing MCP Protocol Support...');
    
    this.mcpServer = new MCPServer({
      name: 'omni-gateway',
      version: '2.0.0',
      capabilities: {
        tools: true,
        resources: true,
        prompts: true,
        logging: true
      }
    });
    
    // Register gateway-level MCP tools
    await this.mcpServer.registerTools([
      {
        name: 'route_request',
        description: 'Route request to appropriate intelligence system',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            target_system: { type: 'string' },
            context: { type: 'object' }
          }
        }
      },
      {
        name: 'get_system_health',
        description: 'Get health status of all intelligence systems',
        inputSchema: {
          type: 'object',
          properties: {
            system_name: { type: 'string', optional: true }
          }
        }
      },
      {
        name: 'execute_cross_system',
        description: 'Execute task across multiple intelligence systems',
        inputSchema: {
          type: 'object',
          properties: {
            task: { type: 'string' },
            systems: { type: 'array', items: { type: 'string' } },
            coordination_mode: { type: 'string', enum: ['sequential', 'parallel', 'consensus'] }
          }
        }
      }
    ]);
    
    console.log('✅ MCP Protocol initialized');
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      }
    }));
    
    // CORS
    this.app.use(cors({
      origin: this.config.cors.origins,
      credentials: this.config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Session-ID']
    }));
    
    // Compression
    this.app.use(compression());
    
    // Rate limiting
    this.app.use(rateLimit({
      windowMs: this.config.rateLimiting.windowMs,
      max: this.config.rateLimiting.max,
      message: 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false
    }));
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request tracing
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const traceId = this.requestTracer.startTrace(req);
      req.headers['x-trace-id'] = traceId;
      res.setHeader('X-Trace-ID', traceId);
      next();
    });
    
    // Authentication middleware
    this.app.use('/api', this.authManager.authenticate.bind(this.authManager));
  }

  /**
   * Setup routing for all intelligence systems
   */
  private setupRoutes(): void {
    console.log('🛣️ Setting up intelligent routing...');
    
    // Mount intelligence system routers
    this.app.use('/api/vision-cortex', this.visionCortexRouter.getRouter());
    this.app.use('/api/real-estate', this.realEstateRouter.getRouter());
    
    // Dynamic routing for registered services
    this.app.use('/api/:serviceName/*', this.handleDynamicRouting.bind(this));
    
    // Gateway management endpoints
    this.setupGatewayRoutes();
    
    // MCP endpoints
    if (this.config.enableMCP) {
      this.setupMCPRoutes();
    }
    
    // Health check endpoint
    this.app.get('/health', this.handleGatewayHealth.bind(this));
    
    // Catch-all intelligent routing
    this.app.use('/api/*', this.handleIntelligentRouting.bind(this));
    
    console.log('✅ Intelligent routing configured');
  }

  /**
   * Setup gateway management routes
   */
  private setupGatewayRoutes(): void {
    const gatewayRouter = express.Router();
    
    // Service registry endpoints
    gatewayRouter.get('/services', (req, res) => {
      res.json({
        services: this.serviceRegistry.getAllServices(),
        total: this.serviceRegistry.getServiceCount(),
        healthy: this.healthMonitor.getHealthyServices().length,
        timestamp: new Date().toISOString()
      });
    });
    
    gatewayRouter.post('/services/register', async (req, res) => {
      try {
        const service: IntelligenceService = req.body;
        await this.serviceRegistry.register(service);
        res.json({ success: true, service: service.name });
      } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Registration failed' });
      }
    });
    
    gatewayRouter.delete('/services/:serviceName', async (req, res) => {
      try {
        await this.serviceRegistry.unregister(req.params.serviceName);
        res.json({ success: true, service: req.params.serviceName });
      } catch (error) {
        res.status(404).json({ error: 'Service not found' });
      }
    });
    
    // Health monitoring endpoints
    gatewayRouter.get('/health/detailed', (req, res) => {
      res.json({
        gateway: 'healthy',
        services: this.healthMonitor.getAllHealthStatus(),
        circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([name, cb]) => ({
          service: name,
          state: cb.getState(),
          failures: cb.getFailureCount(),
          lastFailure: cb.getLastFailureTime()
        })),
        loadBalancer: this.loadBalancer.getStats(),
        timestamp: new Date().toISOString()
      });
    });
    
    // Metrics and monitoring
    gatewayRouter.get('/metrics', (req, res) => {
      res.json({
        requests: this.requestTracer.getMetrics(),
        services: this.serviceRegistry.getMetrics(),
        performance: this.loadBalancer.getPerformanceMetrics(),
        timestamp: new Date().toISOString()
      });
    });
    
    this.app.use('/gateway', gatewayRouter);
  }

  /**
   * Setup MCP protocol routes
   */
  private setupMCPRoutes(): void {
    const mcpRouter = express.Router();
    
    // MCP server info
    mcpRouter.get('/info', (req, res) => {
      res.json(this.mcpServer?.getServerInfo());
    });
    
    // MCP tools
    mcpRouter.get('/tools', (req, res) => {
      res.json({
        tools: this.mcpServer?.getTools(),
        clients: Array.from(this.mcpClients.keys())
      });
    });
    
    // MCP tool execution
    mcpRouter.post('/tools/execute', async (req, res) => {
      try {
        const { tool, arguments: args, target_system } = req.body;
        
        let result;
        if (target_system && this.mcpClients.has(target_system)) {
          // Execute on specific system
          result = await this.mcpClients.get(target_system)?.executeTool(tool, args);
        } else {
          // Execute on gateway
          result = await this.mcpServer?.executeTool(tool, args);
        }
        
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Execution failed' 
        });
      }
    });
    
    // MCP resources
    mcpRouter.get('/resources', (req, res) => {
      const allResources = Array.from(this.mcpClients.values())
        .flatMap(client => client.getResources());
      res.json({ resources: allResources });
    });
    
    this.app.use('/mcp', mcpRouter);
  }

  /**
   * Handle dynamic routing to registered services
   */
  private async handleDynamicRouting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const serviceName = req.params.serviceName;
      const service = this.serviceRegistry.getService(serviceName);
      
      if (!service) {
        res.status(404).json({
          error: `Service '${serviceName}' not found`,
          available_services: this.serviceRegistry.getAllServices().map(s => s.name)
        });
        return;
      }
      
      // Check circuit breaker
      const circuitBreaker = this.circuitBreakers.get(serviceName);
      if (circuitBreaker && circuitBreaker.isOpen()) {
        res.status(503).json({
          error: `Service '${serviceName}' is temporarily unavailable`,
          circuit_breaker_state: 'OPEN',
          retry_after: circuitBreaker.getNextRetryTime()
        });
        return;
      }
      
      // Forward request to service
      await this.forwardRequest(req, res, service);
      
    } catch (error) {
      console.error('Dynamic routing error:', error);
      next(error);
    }
  }

  /**
   * Handle intelligent routing based on request analysis
   */
  private async handleIntelligentRouting(req: Request, res: Response): Promise<void> {
    try {
      const routingDecision = await this.analyzeAndRoute(req);
      
      if (!routingDecision.targetService) {
        res.status(404).json({
          error: 'No suitable service found for request',
          analysis: routingDecision,
          available_services: this.serviceRegistry.getAllServices().map(s => s.name)
        });
        return;
      }
      
      const service = this.serviceRegistry.getService(routingDecision.targetService);
      if (!service) {
        res.status(500).json({
          error: 'Routing decision references unavailable service',
          decision: routingDecision
        });
        return;
      }
      
      // Forward to selected service
      await this.forwardRequest(req, res, service, routingDecision);
      
    } catch (error) {
      console.error('Intelligent routing error:', error);
      res.status(500).json({
        error: 'Routing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Analyze request and determine optimal routing
   */
  private async analyzeAndRoute(req: Request): Promise<RoutingDecision> {
    const path = req.path.toLowerCase();
    const body = req.body || {};
    const query = req.query || {};
    
    // Analyze request content for intelligent routing
    const content = JSON.stringify({ path, body, query, headers: req.headers });
    
    let targetService = '';
    let confidence = 0;
    let reasoning = '';
    
    // Intelligence system routing logic
    if (path.includes('chat') || body.message) {
      if (path.includes('real-estate') || this.containsRealEstateKeywords(content)) {
        targetService = 'real-estate-intelligence';
        confidence = 0.9;
        reasoning = 'Real estate keywords detected in request';
      } else {
        targetService = 'vision-cortex';
        confidence = 0.8;
        reasoning = 'General chat request routed to Vision Cortex';
      }
    } else if (path.includes('memory') || path.includes('search')) {
      targetService = 'memory-system';
      confidence = 0.95;
      reasoning = 'Memory/search operation detected';
    } else if (path.includes('agent') || path.includes('workflow')) {
      targetService = 'agents-system';
      confidence = 0.9;
      reasoning = 'Agent/workflow operation detected';
    } else if (path.includes('analytic') || path.includes('metric')) {
      targetService = 'analytics-system';
      confidence = 0.85;
      reasoning = 'Analytics operation detected';
    } else if (path.includes('auth') || path.includes('security')) {
      targetService = 'security-system';
      confidence = 0.95;
      reasoning = 'Security operation detected';
    }
    
    // Load balancing for the selected service
    const selectedService = this.loadBalancer.selectInstance(targetService);
    
    return {
      targetService: selectedService || targetService,
      endpoint: req.path,
      method: req.method,
      confidence,
      reasoning,
      fallbacks: this.getFallbackServices(targetService),
      metadata: {
        loadBalancing: !!selectedService,
        circuitBreakerStatus: this.circuitBreakers.get(targetService)?.getState() || 'UNKNOWN',
        estimatedLatency: this.healthMonitor.getAverageLatency(targetService)
      }
    };
  }

  /**
   * Forward request to target service
   */
  private async forwardRequest(
    req: Request, 
    res: Response, 
    service: IntelligenceService,
    routingDecision?: RoutingDecision
  ): Promise<void> {
    try {
      const client = this.serviceClients.get(service.name);
      if (!client) {
        throw new Error(`No client configured for service: ${service.name}`);
      }
      
      const startTime = Date.now();
      
      const response = await client.request({
        method: req.method as any,
        url: req.path,
        data: req.body,
        params: req.query,
        headers: {
          ...req.headers,
          'X-Forwarded-By': 'Omni-Gateway',
          'X-Service-Target': service.name,
          'X-Routing-Decision': routingDecision ? JSON.stringify(routingDecision) : undefined
        }
      });
      
      const latency = Date.now() - startTime;
      
      // Update health metrics
      this.healthMonitor.recordSuccess(service.name, latency);
      
      // Add gateway metadata to response
      res.set({
        'X-Gateway-Service': service.name,
        'X-Gateway-Latency': latency.toString(),
        'X-Gateway-Version': '2.0.0'
      });
      
      res.status(response.status).json(response.data);
      
    } catch (error) {
      // Record failure for health monitoring
      this.healthMonitor.recordFailure(service.name);
      
      // Trigger circuit breaker
      const circuitBreaker = this.circuitBreakers.get(service.name);
      if (circuitBreaker) {
        circuitBreaker.recordFailure();
      }
      
      throw error;
    }
  }

  /**
   * Setup WebSocket support for real-time communication
   */
  private setupWebSocket(): void {
    if (!this.config.enableWebSocket) return;
    
    console.log('🔌 Setting up WebSocket support...');
    
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    
    this.wss.on('connection', (ws: WebSocket, req) => {
      console.log('🔗 WebSocket connection established');
      
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          const response = await this.handleWebSocketMessage(message);
          ws.send(JSON.stringify(response));
        } catch (error) {
          ws.send(JSON.stringify({
            error: 'Invalid message format',
            details: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      });
      
      ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
      });
    });
  }

  /**
   * Handle WebSocket messages
   */
  private async handleWebSocketMessage(message: any): Promise<any> {
    const { type, payload } = message;
    
    switch (type) {
      case 'route_request':
        const routingDecision = await this.analyzeAndRoute({
          path: payload.path,
          method: payload.method,
          body: payload.body,
          query: payload.query,
          headers: payload.headers || {}
        } as Request);
        return { type: 'routing_decision', payload: routingDecision };
        
      case 'health_check':
        return {
          type: 'health_status',
          payload: {
            gateway: 'healthy',
            services: this.healthMonitor.getAllHealthStatus(),
            timestamp: new Date().toISOString()
          }
        };
        
      case 'mcp_execute':
        if (this.mcpServer) {
          const result = await this.mcpServer.executeTool(payload.tool, payload.arguments);
          return { type: 'mcp_result', payload: result };
        }
        return { type: 'error', payload: 'MCP not enabled' };
        
      default:
        return { type: 'error', payload: `Unknown message type: ${type}` };
    }
  }

  /**
   * Gateway health check
   */
  private async handleGatewayHealth(req: Request, res: Response): Promise<void> {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      uptime: process.uptime(),
      services: {
        total: this.serviceRegistry.getServiceCount(),
        healthy: this.healthMonitor.getHealthyServices().length,
        unhealthy: this.healthMonitor.getUnhealthyServices().length
      },
      features: {
        mcp: this.config.enableMCP,
        websocket: this.config.enableWebSocket,
        loadBalancing: true,
        circuitBreaking: true,
        intelligentRouting: true
      }
    };
    
    res.json(healthStatus);
  }

  // Helper methods
  
  private containsRealEstateKeywords(content: string): boolean {
    const keywords = [
      'property', 'real estate', 'house', 'home', 'apartment', 'condo',
      'market', 'price', 'buy', 'sell', 'rent', 'lease', 'investment',
      'mortgage', 'listing', 'broker', 'agent', 'mls', 'sqft', 'bedroom'
    ];
    
    return keywords.some(keyword => content.toLowerCase().includes(keyword));
  }
  
  private getFallbackServices(primaryService: string): string[] {
    const fallbacks: { [key: string]: string[] } = {
      'vision-cortex': ['real-estate-intelligence', 'agents-system'],
      'real-estate-intelligence': ['vision-cortex', 'analytics-system'],
      'agents-system': ['vision-cortex'],
      'analytics-system': ['memory-system'],
      'memory-system': ['vision-cortex'],
      'security-system': []
    };
    
    return fallbacks[primaryService] || [];
  }

  /**
   * Start the Omni Gateway
   */
  public async start(): Promise<void> {
    await this.initializeComponents();
    
    if (this.config.enableWebSocket && this.server) {
      this.server.listen(this.config.port, () => {
        console.log(`🚀 Omni Gateway started on port ${this.config.port}`);
        console.log(`🌐 WebSocket support enabled`);
        console.log(`🔌 MCP support: ${this.config.enableMCP ? 'enabled' : 'disabled'}`);
        console.log(`📋 Registered services: ${this.serviceRegistry.getServiceCount()}`);
      });
    } else {
      this.app.listen(this.config.port, () => {
        console.log(`🚀 Omni Gateway started on port ${this.config.port}`);
        console.log(`🔌 MCP support: ${this.config.enableMCP ? 'enabled' : 'disabled'}`);
        console.log(`📋 Registered services: ${this.serviceRegistry.getServiceCount()}`);
      });
    }
    
    this.emit('gateway:started');
  }

  /**
   * Stop the Omni Gateway
   */
  public async stop(): Promise<void> {
    console.log('🛑 Stopping Omni Gateway...');
    
    // Stop health monitoring
    this.healthMonitor.stopMonitoring();
    
    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }
    
    // Close MCP connections
    for (const [name, client] of this.mcpClients) {
      await client.disconnect();
    }
    
    if (this.mcpServer) {
      await this.mcpServer.stop();
    }
    
    console.log('✅ Omni Gateway stopped');
    this.emit('gateway:stopped');
  }

  // Getters for monitoring and management
  
  public getServiceRegistry(): ServiceRegistry {
    return this.serviceRegistry;
  }
  
  public getHealthMonitor(): HealthMonitor {
    return this.healthMonitor;
  }
  
  public getLoadBalancer(): LoadBalancer {
    return this.loadBalancer;
  }
  
  public getMCPServer(): MCPServer | undefined {
    return this.mcpServer;
  }
  
  public getMCPClients(): Map<string, MCPClient> {
    return this.mcpClients;
  }
}

export default OmniGateway;