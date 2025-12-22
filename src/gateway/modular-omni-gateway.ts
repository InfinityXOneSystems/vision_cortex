/**
 * 🌐 MODULAR OMNI GATEWAY
 * Complete modular intelligence system communication hub with MCP support
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import SystemRegistry from './system-registry';
import IntelligentRouter from './intelligent-router';
import { MCPServer, MCPClient } from './mcp/mcp-protocol';

export interface GatewayConfig {
  port: number;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  mcp: {
    enabled: boolean;
    serverPort: number;
  };
}

export class ModularOmniGateway {
  private app: Express;
  private router: IntelligentRouter;
  private mcpServer: MCPServer;
  private config: GatewayConfig;

  constructor(config: Partial<GatewayConfig> = {}) {
    this.config = {
      port: 3000,
      cors: {
        origin: ['http://localhost:3000', 'https://*.hostinger.com'],
        credentials: true
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000 // requests per window
      },
      mcp: {
        enabled: true,
        serverPort: 3001
      },
      ...config
    };

    this.app = express();
    this.router = new IntelligentRouter();
    this.initializeMCP();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private initializeMCP(): void {
    if (this.config.mcp.enabled) {
      this.mcpServer = new MCPServer({
        name: 'omni-gateway-mcp',
        version: '1.0.0',
        capabilities: {
          tools: true,
          resources: true,
          prompts: true
        }
      });
    }
  }

  private setupMiddleware(): void {
    // Security
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: this.config.cors.origin,
      credentials: this.config.cors.credentials
    }));

    // Rate limiting
    this.app.use(rateLimit({
      windowMs: this.config.rateLimit.windowMs,
      max: this.config.rateLimit.max,
      message: 'Too many requests from this IP'
    }));

    // Body parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, res: Response, next) => {
      console.log(`🌐 ${req.method} ${req.path} from ${req.ip}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', this.gatewayHealth.bind(this));
    
    // System discovery
    this.app.get('/systems', this.listSystems.bind(this));
    this.app.get('/systems/:systemId/health', this.checkSystemHealth.bind(this));
    this.app.get('/systems/stats', this.getSystemStats.bind(this));
    
    // MCP Protocol endpoints
    if (this.config.mcp.enabled) {
      this.app.post('/mcp/tools/list', this.listMCPTools.bind(this));
      this.app.post('/mcp/tools/call', this.callMCPTool.bind(this));
      this.app.get('/mcp/resources/list', this.listMCPResources.bind(this));
      this.app.get('/mcp/server/info', this.getMCPServerInfo.bind(this));
    }
    
    // Cross-system communication
    this.app.post('/communicate', this.facilitateCommunication.bind(this));
    this.app.post('/broadcast', this.broadcastMessage.bind(this));
    
    // Gateway management
    this.app.get('/routing/rules', this.getRoutingRules.bind(this));
    this.app.post('/routing/rules', this.addRoutingRule.bind(this));
    this.app.get('/circuit-breakers', this.getCircuitBreakerStatus.bind(this));
    
    // Load balancing stats
    this.app.get('/load-balancer/stats', this.getLoadBalancerStats.bind(this));
    
    // Dynamic system registration
    this.app.post('/systems/register', this.registerSystem.bind(this));
    this.app.delete('/systems/:systemId', this.unregisterSystem.bind(this));
    
    // Intelligent routing (catch-all - must be last)
    this.app.use('/api/*', this.router.route.bind(this.router));
  }

  private async gatewayHealth(req: Request, res: Response): Promise<void> {
    const systemStats = SystemRegistry.getSystemStats();
    
    res.json({
      gateway: {
        status: 'online',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime()
      },
      systems: systemStats,
      mcp: this.config.mcp.enabled ? this.mcpServer.getServerInfo() : null,
      circuit_breakers: this.router.getCircuitBreakerStatus()
    });
  }

  private async listSystems(req: Request, res: Response): Promise<void> {
    const systems = SystemRegistry.getAll().map(system => ({
      id: system.id,
      name: system.name,
      type: system.type,
      status: system.health.status,
      version: system.version,
      endpoints: system.endpoints.length,
      capabilities: system.capabilities.map(c => c.name),
      mcp: system.mcp.enabled,
      responseTime: system.health.responseTime,
      lastCheck: system.health.lastCheck
    }));
    
    res.json({ systems });
  }

  private async checkSystemHealth(req: Request, res: Response): Promise<void> {
    const { systemId } = req.params;
    const system = SystemRegistry.get(systemId);
    
    if (!system) {
      res.status(404).json({ error: 'System not found' });
      return;
    }
    
    await SystemRegistry.healthCheck(systemId);
    const updatedSystem = SystemRegistry.get(systemId);
    
    res.json({
      system: updatedSystem!.name,
      status: updatedSystem!.health.status,
      responseTime: updatedSystem!.health.responseTime,
      lastCheck: updatedSystem!.health.lastCheck
    });
  }

  private async getSystemStats(req: Request, res: Response): Promise<void> {
    const stats = SystemRegistry.getSystemStats();
    res.json(stats);
  }

  private async listMCPTools(req: Request, res: Response): Promise<void> {
    if (!this.mcpServer) {
      res.status(503).json({ error: 'MCP not enabled' });
      return;
    }
    
    const tools = this.mcpServer.getTools();
    res.json({ tools });
  }

  private async callMCPTool(req: Request, res: Response): Promise<void> {
    if (!this.mcpServer) {
      res.status(503).json({ error: 'MCP not enabled' });
      return;
    }
    
    const { tool, args } = req.body;
    
    try {
      const result = await this.mcpServer.executeTool(tool, args);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ 
        error: 'Tool execution failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async listMCPResources(req: Request, res: Response): Promise<void> {
    // Aggregate resources from all MCP-enabled systems
    const resources: any[] = [];
    
    for (const system of SystemRegistry.getAll()) {
      if (system.mcp.enabled) {
        resources.push({
          systemId: system.id,
          systemName: system.name,
          mcpUrl: system.mcp.serverUrl,
          tools: system.mcp.tools || []
        });
      }
    }
    
    res.json({ resources });
  }

  private async getMCPServerInfo(req: Request, res: Response): Promise<void> {
    if (!this.mcpServer) {
      res.status(503).json({ error: 'MCP not enabled' });
      return;
    }
    
    res.json(this.mcpServer.getServerInfo());
  }

  private async facilitateCommunication(req: Request, res: Response): Promise<void> {
    const { fromSystem, toSystem, action, data, method = 'POST' } = req.body;
    
    const source = SystemRegistry.get(fromSystem);
    const target = SystemRegistry.get(toSystem);
    
    if (!source || !target) {
      res.status(404).json({ error: 'Invalid system IDs' });
      return;
    }
    
    try {
      const result = await this.executeCommunication(source, target, action, data, method);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ 
        error: 'Communication failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async broadcastMessage(req: Request, res: Response): Promise<void> {
    const { message, targetTypes, excludeSystems = [] } = req.body;
    
    let targetSystems = SystemRegistry.getAll();
    
    if (targetTypes && Array.isArray(targetTypes)) {
      targetSystems = targetSystems.filter(system => 
        targetTypes.includes(system.type)
      );
    }
    
    targetSystems = targetSystems.filter(system => 
      !excludeSystems.includes(system.id) && system.health.status === 'online'
    );
    
    const results = await Promise.allSettled(
      targetSystems.map(async system => ({
        systemId: system.id,
        systemName: system.name,
        result: await this.sendMessage(system, message)
      }))
    );
    
    res.json({
      broadcast: true,
      targetCount: targetSystems.length,
      results: results.map((result, index) => ({
        system: targetSystems[index].id,
        status: result.status,
        value: result.status === 'fulfilled' ? result.value : result.reason
      }))
    });
  }

  private async executeCommunication(
    source: any,
    target: any,
    action: string,
    data: any,
    method: string
  ): Promise<any> {
    // MCP communication if both systems support it
    if (source.mcp.enabled && target.mcp.enabled) {
      return await this.mcpCommunication(source, target, action, data);
    }
    
    // HTTP communication fallback
    return await this.httpCommunication(target, action, data, method);
  }

  private async mcpCommunication(source: any, target: any, action: string, data: any): Promise<any> {
    // Implementation would connect to target system's MCP server
    return {
      protocol: 'MCP',
      source: source.name,
      target: target.name,
      action,
      data,
      success: true
    };
  }

  private async httpCommunication(target: any, action: string, data: any, method: string): Promise<any> {
    // Implementation would make HTTP request to target system
    return {
      protocol: 'HTTP',
      target: target.name,
      action,
      method,
      data,
      success: true
    };
  }

  private async sendMessage(system: any, message: any): Promise<any> {
    // Implementation would send message to system
    return {
      systemId: system.id,
      message,
      timestamp: new Date().toISOString()
    };
  }

  private async getRoutingRules(req: Request, res: Response): Promise<void> {
    const rules = this.router.getRoutingRules();
    res.json({ rules });
  }

  private async addRoutingRule(req: Request, res: Response): Promise<void> {
    const rule = req.body;
    this.router.addRoutingRule(rule);
    res.json({ success: true, rule });
  }

  private async getCircuitBreakerStatus(req: Request, res: Response): Promise<void> {
    const status = this.router.getCircuitBreakerStatus();
    res.json({ circuitBreakers: status });
  }

  private async getLoadBalancerStats(req: Request, res: Response): Promise<void> {
    // This would be implemented in the router's load balancer
    res.json({ stats: {} });
  }

  private async registerSystem(req: Request, res: Response): Promise<void> {
    const system = req.body;
    SystemRegistry.register(system);
    res.json({ success: true, system: system.id });
  }

  private async unregisterSystem(req: Request, res: Response): Promise<void> {
    const { systemId } = req.params;
    // Implementation would remove system from registry
    res.json({ success: true, removed: systemId });
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.config.port, () => {
        console.log('\n🚀 MODULAR OMNI GATEWAY LAUNCHED! 🚀\n');
        console.log(`🌐 Gateway running on port ${this.config.port}`);
        console.log(`🔧 MCP enabled: ${this.config.mcp.enabled}`);
        console.log(`📊 Systems registered: ${SystemRegistry.getAll().length}`);
        console.log(`🛡️  Security: Helmet + CORS + Rate Limiting`);
        console.log(`🎯 Intelligent routing with circuit breakers`);
        console.log(`🔄 Load balancing across systems`);
        console.log('\n📡 Available Systems:');
        
        for (const system of SystemRegistry.getAll()) {
          console.log(`  ✅ ${system.name} (${system.type}) - ${system.health.status}`);
        }
        
        console.log('\n🌐 Ready for seamless intelligence system communication!\n');
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    console.log('🛑 Shutting down Modular Omni Gateway...');
    
    if (this.mcpServer) {
      await this.mcpServer.stop();
    }
    
    SystemRegistry.stopAutoDiscovery();
    console.log('✅ Gateway stopped');
  }
}

export default ModularOmniGateway;