/**
 * 🔧 SYSTEM REGISTRY - Dynamic Intelligence System Discovery
 * Auto-detects and manages all intelligence systems
 */

export interface SystemEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
}

export interface SystemCapability {
  name: string;
  type: 'ai-model' | 'data-processing' | 'analysis' | 'automation' | 'security';
  description: string;
}

export interface IntelligenceSystem {
  id: string;
  name: string;
  type: 'vision-cortex' | 'real-estate' | 'agents' | 'analytics' | 'memory' | 'security';
  baseUrl: string;
  version: string;
  endpoints: SystemEndpoint[];
  capabilities: SystemCapability[];
  health: {
    status: 'online' | 'offline' | 'degraded';
    lastCheck: Date;
    responseTime: number;
  };
  mcp: {
    enabled: boolean;
    serverUrl?: string;
    tools?: string[];
  };
}

export class SystemRegistry {
  private systems: Map<string, IntelligenceSystem> = new Map();
  private discoveryInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeKnownSystems();
    this.startAutoDiscovery();
  }

  private initializeKnownSystems(): void {
    // Vision Cortex System
    this.register({
      id: 'vision-cortex',
      name: 'Vision Cortex Quantum Intelligence',
      type: 'vision-cortex',
      baseUrl: 'http://localhost:8080',
      version: '1.0.0',
      endpoints: [
        { path: '/api/vision-cortex/chat', method: 'POST', description: 'Multi-model chat interface' },
        { path: '/api/vision-cortex/reasoning/trace', method: 'POST', description: 'Autonomous reasoning trace' },
        { path: '/api/vision-cortex/memory/query', method: 'GET', description: 'Vector memory search' },
        { path: '/api/vision-cortex/autonomous/execute', method: 'POST', description: 'Long-horizon planning' }
      ],
      capabilities: [
        { name: 'quantum-reasoning', type: 'ai-model', description: 'Advanced quantum cognitive processing' },
        { name: 'multi-model-orchestration', type: 'ai-model', description: 'Orchestrate multiple AI models' },
        { name: 'autonomous-execution', type: 'automation', description: 'Self-directed task execution' },
        { name: 'memory-management', type: 'data-processing', description: 'Vector-based memory system' }
      ],
      health: { status: 'online', lastCheck: new Date(), responseTime: 0 },
      mcp: { enabled: true, serverUrl: 'http://localhost:8080/mcp' }
    });

    // Real Estate Intelligence
    this.register({
      id: 'real-estate',
      name: 'Real Estate Intelligence System',
      type: 'real-estate',
      baseUrl: 'http://localhost:8081',
      version: '1.0.0',
      endpoints: [
        { path: '/api/real-estate/chat', method: 'POST', description: 'Real estate AI assistant' },
        { path: '/api/real-estate/market/analysis', method: 'GET', description: 'Market trend analysis' },
        { path: '/api/real-estate/property/evaluate', method: 'POST', description: 'Property valuation' },
        { path: '/api/real-estate/trends', method: 'GET', description: 'Market trends and predictions' }
      ],
      capabilities: [
        { name: 'market-analysis', type: 'analysis', description: 'Real estate market analysis' },
        { name: 'property-evaluation', type: 'analysis', description: 'Automated property valuation' },
        { name: 'trend-prediction', type: 'ai-model', description: 'Market trend forecasting' },
        { name: 'investment-analysis', type: 'analysis', description: 'Investment opportunity analysis' }
      ],
      health: { status: 'online', lastCheck: new Date(), responseTime: 0 },
      mcp: { enabled: true, serverUrl: 'http://localhost:8081/mcp' }
    });

    // Agent Systems
    this.register({
      id: 'agents',
      name: 'Multi-Agent Orchestration System',
      type: 'agents',
      baseUrl: 'http://localhost:8082',
      version: '1.0.0',
      endpoints: [
        { path: '/api/agents/deploy', method: 'POST', description: 'Deploy new agent instances' },
        { path: '/api/agents/orchestrate', method: 'POST', description: 'Orchestrate multi-agent workflows' },
        { path: '/api/agents/templates', method: 'GET', description: 'Agent template management' },
        { path: '/api/agents/automation', method: 'POST', description: 'Automation task execution' }
      ],
      capabilities: [
        { name: 'agent-deployment', type: 'automation', description: 'Dynamic agent deployment' },
        { name: 'workflow-orchestration', type: 'automation', description: 'Multi-agent workflow coordination' },
        { name: 'template-management', type: 'automation', description: 'Agent template system' },
        { name: 'task-automation', type: 'automation', description: 'Automated task execution' }
      ],
      health: { status: 'online', lastCheck: new Date(), responseTime: 0 },
      mcp: { enabled: true, serverUrl: 'http://localhost:8082/mcp' }
    });

    // Continue with other systems...
    this.registerAnalyticsSystem();
    this.registerMemorySystem();
    this.registerSecuritySystem();
  }

  private registerAnalyticsSystem(): void {
    this.register({
      id: 'analytics',
      name: 'Analytics Intelligence Platform',
      type: 'analytics',
      baseUrl: 'http://localhost:8083',
      version: '1.0.0',
      endpoints: [
        { path: '/api/analytics/analyze', method: 'POST', description: 'Data analysis and insights' },
        { path: '/api/analytics/reports', method: 'GET', description: 'Generate analytical reports' },
        { path: '/api/analytics/metrics', method: 'GET', description: 'System performance metrics' },
        { path: '/api/analytics/insights', method: 'POST', description: 'AI-driven insights generation' }
      ],
      capabilities: [
        { name: 'data-analysis', type: 'analysis', description: 'Advanced data analytics' },
        { name: 'report-generation', type: 'data-processing', description: 'Automated report creation' },
        { name: 'metrics-collection', type: 'data-processing', description: 'System metrics monitoring' },
        { name: 'insight-generation', type: 'ai-model', description: 'AI-powered insights' }
      ],
      health: { status: 'online', lastCheck: new Date(), responseTime: 0 },
      mcp: { enabled: true, serverUrl: 'http://localhost:8083/mcp' }
    });
  }

  private registerMemorySystem(): void {
    this.register({
      id: 'memory',
      name: 'Distributed Memory System',
      type: 'memory',
      baseUrl: 'http://localhost:8084',
      version: '1.0.0',
      endpoints: [
        { path: '/api/memory/store', method: 'POST', description: 'Store vector embeddings' },
        { path: '/api/memory/retrieve', method: 'GET', description: 'Retrieve stored memories' },
        { path: '/api/memory/search', method: 'POST', description: 'Semantic memory search' },
        { path: '/api/memory/context', method: 'GET', description: 'Context management' }
      ],
      capabilities: [
        { name: 'vector-storage', type: 'data-processing', description: 'Vector embedding storage' },
        { name: 'semantic-search', type: 'ai-model', description: 'Semantic similarity search' },
        { name: 'context-management', type: 'data-processing', description: 'Conversation context' },
        { name: 'memory-consolidation', type: 'data-processing', description: 'Memory optimization' }
      ],
      health: { status: 'online', lastCheck: new Date(), responseTime: 0 },
      mcp: { enabled: true, serverUrl: 'http://localhost:8084/mcp' }
    });
  }

  private registerSecuritySystem(): void {
    this.register({
      id: 'security',
      name: 'Security Intelligence System',
      type: 'security',
      baseUrl: 'http://localhost:8085',
      version: '1.0.0',
      endpoints: [
        { path: '/api/security/scan', method: 'POST', description: 'Security vulnerability scanning' },
        { path: '/api/security/audit', method: 'GET', description: 'Security audit reports' },
        { path: '/api/security/encrypt', method: 'POST', description: 'Data encryption services' },
        { path: '/api/security/validate', method: 'POST', description: 'Input validation and sanitization' }
      ],
      capabilities: [
        { name: 'vulnerability-scanning', type: 'security', description: 'Automated security scanning' },
        { name: 'audit-logging', type: 'security', description: 'Security audit trails' },
        { name: 'data-encryption', type: 'security', description: 'End-to-end encryption' },
        { name: 'input-validation', type: 'security', description: 'Input sanitization' }
      ],
      health: { status: 'online', lastCheck: new Date(), responseTime: 0 },
      mcp: { enabled: true, serverUrl: 'http://localhost:8085/mcp' }
    });
  }

  public register(system: IntelligenceSystem): void {
    this.systems.set(system.id, system);
    console.log(`📝 Registered system: ${system.name} (${system.id})`);
  }

  public get(systemId: string): IntelligenceSystem | undefined {
    return this.systems.get(systemId);
  }

  public getAll(): IntelligenceSystem[] {
    return Array.from(this.systems.values());
  }

  public getByType(type: IntelligenceSystem['type']): IntelligenceSystem[] {
    return Array.from(this.systems.values()).filter(system => system.type === type);
  }

  public getOnlineSystems(): IntelligenceSystem[] {
    return Array.from(this.systems.values()).filter(system => system.health.status === 'online');
  }

  public async healthCheck(systemId?: string): Promise<void> {
    const systemsToCheck = systemId 
      ? [this.systems.get(systemId)].filter(Boolean) as IntelligenceSystem[]
      : Array.from(this.systems.values());

    for (const system of systemsToCheck) {
      try {
        const startTime = Date.now();
        // Here you'd implement actual health check HTTP request
        // const response = await fetch(`${system.baseUrl}/health`);
        const responseTime = Date.now() - startTime;
        
        system.health = {
          status: 'online', // response.ok ? 'online' : 'degraded',
          lastCheck: new Date(),
          responseTime
        };
      } catch (error) {
        system.health = {
          status: 'offline',
          lastCheck: new Date(),
          responseTime: -1
        };
      }
    }
  }

  private startAutoDiscovery(): void {
    // Health check every 30 seconds
    this.discoveryInterval = setInterval(() => {
      this.healthCheck();
    }, 30000);

    console.log('🔍 Auto-discovery started for intelligence systems');
  }

  public stopAutoDiscovery(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
  }

  public getSystemStats(): any {
    const stats = {
      total: this.systems.size,
      online: 0,
      offline: 0,
      degraded: 0,
      byType: {} as Record<string, number>
    };

    for (const system of this.systems.values()) {
      stats[system.health.status]++;
      stats.byType[system.type] = (stats.byType[system.type] || 0) + 1;
    }

    return stats;
  }
}

export default new SystemRegistry();