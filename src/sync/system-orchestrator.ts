/**
 * 🔄 SYSTEM SYNC ORCHESTRATOR
 * Coordinates Vision Cortex with Taxonomy, Index, Auto Builder, and all intelligence systems
 */

import axios from 'axios';
import { EventEmitter } from 'events';

interface SystemEndpoint {
  name: string;
  url: string;
  type: 'intelligence' | 'data' | 'builder' | 'taxonomy';
  syncInterval: number;
  lastSync: Date;
  isHealthy: boolean;
}

export class SystemSyncOrchestrator extends EventEmitter {
  private systems: Map<string, SystemEndpoint> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.initializeSystems();
    this.startSyncMonitoring();
  }

  private initializeSystems(): void {
    // Intelligence Systems
    this.addSystem('real-estate-intelligence', {
      name: 'Real Estate Intelligence',
      url: process.env.REAL_ESTATE_URL || 'https://real-estate-intelligence-service-url',
      type: 'intelligence',
      syncInterval: 30000, // 30 seconds
      lastSync: new Date(),
      isHealthy: true
    });

    // Data Systems
    this.addSystem('taxonomy', {
      name: 'Taxonomy System',
      url: process.env.TAXONOMY_URL || 'https://taxonomy-service-url',
      type: 'taxonomy', 
      syncInterval: 60000, // 1 minute
      lastSync: new Date(),
      isHealthy: true
    });

    this.addSystem('index', {
      name: 'Index System',
      url: process.env.INDEX_URL || 'https://index-service-url',
      type: 'data',
      syncInterval: 45000, // 45 seconds
      lastSync: new Date(),
      isHealthy: true
    });

    // Builder Systems
    this.addSystem('auto-builder', {
      name: 'Auto Builder',
      url: process.env.AUTO_BUILDER_URL || 'https://auto-builder-service-url',
      type: 'builder',
      syncInterval: 120000, // 2 minutes
      lastSync: new Date(),
      isHealthy: true
    });

    console.log(`🔄 Initialized ${this.systems.size} system sync endpoints`);
  }

  private addSystem(id: string, system: SystemEndpoint): void {
    this.systems.set(id, system);
  }

  private startSyncMonitoring(): void {
    this.systems.forEach((system, id) => {
      const interval = setInterval(async () => {
        await this.syncWithSystem(id, system);
      }, system.syncInterval);
      
      this.syncIntervals.set(id, interval);
    });

    console.log('🚀 System sync monitoring started');
  }

  private async syncWithSystem(id: string, system: SystemEndpoint): Promise<void> {
    try {
      // Health check first
      const healthResponse = await axios.get(`${system.url}/health`, { timeout: 5000 });
      
      if (healthResponse.status !== 200) {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }

      // Send intelligence data based on system type
      let syncData: any = {};
      
      switch (system.type) {
        case 'intelligence':
          syncData = await this.prepareIntelligenceSync(system);
          break;
        case 'taxonomy':
          syncData = await this.prepareTaxonomySync(system);
          break;
        case 'data':
          syncData = await this.prepareDataSync(system);
          break;
        case 'builder':
          syncData = await this.prepareBuilderSync(system);
          break;
      }

      // Send sync data
      await axios.post(`${system.url}/sync/vision-cortex`, {
        timestamp: new Date().toISOString(),
        source: 'vision-cortex-quantum-brain',
        data: syncData
      }, { timeout: 10000 });

      // Update system status
      system.lastSync = new Date();
      system.isHealthy = true;
      
      this.emit('sync:success', { system: id, timestamp: new Date() });
      console.log(`✅ Synced with ${system.name}`);

    } catch (error) {
      system.isHealthy = false;
      this.emit('sync:error', { system: id, error: error.message });
      console.error(`❌ Sync failed with ${system.name}:`, error.message);
    }
  }

  private async prepareIntelligenceSync(system: SystemEndpoint): Promise<any> {
    return {
      type: 'intelligence_feed',
      quantum_insights: await this.getLatestIntelligence(),
      market_signals: await this.getMarketSignals(),
      anomaly_alerts: await this.getAnomalyAlerts()
    };
  }

  private async prepareTaxonomySync(system: SystemEndpoint): Promise<any> {
    return {
      type: 'taxonomy_intelligence',
      classifications: await this.getIntelligenceClassifications(),
      domain_mappings: await this.getDomainMappings(),
      pattern_clusters: await this.getPatternClusters()
    };
  }

  private async prepareDataSync(system: SystemEndpoint): Promise<any> {
    return {
      type: 'data_intelligence',
      indexed_insights: await this.getIndexedIntelligence(),
      search_enhancements: await this.getSearchEnhancements(),
      correlation_data: await this.getCorrelationData()
    };
  }

  private async prepareBuilderSync(system: SystemEndpoint): Promise<any> {
    return {
      type: 'builder_intelligence',
      build_optimizations: await this.getBuildOptimizations(),
      architecture_insights: await this.getArchitectureInsights(),
      performance_recommendations: await this.getPerformanceRecommendations()
    };
  }

  // Mock intelligence data methods - replace with actual quantum core integration
  private async getLatestIntelligence(): Promise<any[]> {
    return [
      { insight: 'Market volatility pattern detected', confidence: 0.92, domain: 'real_estate' },
      { insight: 'Technology adoption acceleration', confidence: 0.88, domain: 'technology' }
    ];
  }

  private async getMarketSignals(): Promise<any[]> {
    return [
      { signal: 'Liquidity concentration shift', strength: 0.84, region: 'southeast' }
    ];
  }

  private async getAnomalyAlerts(): Promise<any[]> {
    return [
      { anomaly: 'Unusual capital flow pattern', severity: 'medium', timestamp: new Date() }
    ];
  }

  private async getIntelligenceClassifications(): Promise<any[]> {
    return [
      { category: 'predictive_intelligence', subcategory: 'market_timing', count: 15 }
    ];
  }

  private async getDomainMappings(): Promise<any[]> {
    return [
      { domain: 'real_estate', intelligence_types: ['prediction', 'signal', 'anomaly'] }
    ];
  }

  private async getPatternClusters(): Promise<any[]> {
    return [
      { cluster: 'behavioral_lag_patterns', size: 23, confidence: 0.91 }
    ];
  }

  private async getIndexedIntelligence(): Promise<any[]> {
    return [
      { index: 'market_intelligence_v2', entries: 1247, last_updated: new Date() }
    ];
  }

  private async getSearchEnhancements(): Promise<any[]> {
    return [
      { enhancement: 'semantic_intelligence_search', boost_factor: 1.3 }
    ];
  }

  private async getCorrelationData(): Promise<any[]> {
    return [
      { correlation: 'cross_domain_intelligence', strength: 0.87, domains: ['real_estate', 'financial'] }
    ];
  }

  private async getBuildOptimizations(): Promise<any[]> {
    return [
      { optimization: 'intelligence_api_caching', performance_gain: '34%' }
    ];
  }

  private async getArchitectureInsights(): Promise<any[]> {
    return [
      { insight: 'Microservice intelligence distribution', recommendation: 'implement_quantum_routing' }
    ];
  }

  private async getPerformanceRecommendations(): Promise<any[]> {
    return [
      { recommendation: 'parallel_intelligence_processing', impact: 'high', priority: 1 }
    ];
  }

  public getSystemsStatus(): any {
    const status = Array.from(this.systems.entries()).map(([id, system]) => ({
      id,
      name: system.name,
      type: system.type,
      healthy: system.isHealthy,
      last_sync: system.lastSync,
      sync_interval_ms: system.syncInterval
    }));

    return {
      total_systems: this.systems.size,
      healthy_systems: status.filter(s => s.healthy).length,
      systems: status
    };
  }

  public async forceSync(systemId?: string): Promise<void> {
    if (systemId) {
      const system = this.systems.get(systemId);
      if (system) {
        await this.syncWithSystem(systemId, system);
      }
    } else {
      // Force sync all systems
      for (const [id, system] of this.systems.entries()) {
        await this.syncWithSystem(id, system);
      }
    }
  }

  public stopSync(): void {
    this.syncIntervals.forEach(interval => clearInterval(interval));
    this.syncIntervals.clear();
    console.log('🛑 System sync monitoring stopped');
  }
}