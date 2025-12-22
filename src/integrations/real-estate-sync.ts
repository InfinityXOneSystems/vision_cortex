/**
 * 🏠 REAL ESTATE INTELLIGENCE SYNC MODULE
 * 
 * Handles bidirectional synchronization between Vision Cortex and 
 * Real Estate Intelligence systems for seamless data flow
 * 
 * @author Infinity X One Systems
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as path from 'path';
import axios from 'axios';

export interface SyncConfiguration {
  realEstateRoot: string;
  visionCortexRoot: string;
  syncInterval: number; // milliseconds
  enabledSources: string[];
  apiEndpoints: {
    realEstate: string;
    visionCortex: string;
  };
  credentials: {
    apiKey?: string;
    bearerToken?: string;
  };
}

export interface SyncReport {
  timestamp: string;
  source: 'real_estate' | 'vision_cortex';
  target: 'real_estate' | 'vision_cortex';
  operations: {
    signals_synced: number;
    intelligence_shared: number;
    errors: number;
    warnings: number;
  };
  details: SyncOperation[];
  duration: number;
  next_sync: string;
}

export interface SyncOperation {
  type: 'signal' | 'intelligence' | 'alert' | 'config';
  operation: 'create' | 'update' | 'delete';
  id: string;
  status: 'success' | 'error' | 'warning';
  message?: string;
  data?: any;
}

export class RealEstateIntelligenceSync extends EventEmitter {
  private config: SyncConfiguration;
  private syncTimer?: NodeJS.Timeout;
  private isRunning: boolean = false;
  private lastSync: Date = new Date(0);

  constructor(config: SyncConfiguration) {
    super();
    this.config = config;
  }

  /**
   * Initialize the sync system
   */
  async initialize(): Promise<void> {
    console.log('🏠 Initializing Real Estate Intelligence Sync...');
    
    // Validate paths
    await this.validatePaths();
    
    // Check API connectivity
    await this.checkConnectivity();
    
    // Load existing sync state
    await this.loadSyncState();
    
    console.log('✅ Real Estate Intelligence Sync initialized');
    this.emit('sync:initialized');
  }

  /**
   * Start continuous synchronization
   */
  startSync(): void {
    if (this.isRunning) {
      console.log('⚠️ Sync already running');
      return;
    }

    console.log(`🔄 Starting sync with ${this.config.syncInterval}ms interval`);
    this.isRunning = true;
    
    // Initial sync
    this.performSync();
    
    // Schedule periodic syncs
    this.syncTimer = setInterval(() => {
      this.performSync();
    }, this.config.syncInterval);
    
    this.emit('sync:started');
  }

  /**
   * Stop synchronization
   */
  stopSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
    
    this.isRunning = false;
    console.log('⏸️ Sync stopped');
    this.emit('sync:stopped');
  }

  /**
   * Perform a complete sync cycle
   */
  private async performSync(): Promise<SyncReport[]> {
    const startTime = Date.now();
    console.log('🔄 Starting sync cycle...');
    
    try {
      const reports: SyncReport[] = [];
      
      // Sync from Real Estate to Vision Cortex
      const reToVcReport = await this.syncRealEstateToVisionCortex();
      reports.push(reToVcReport);
      
      // Sync from Vision Cortex to Real Estate
      const vcToReReport = await this.syncVisionCortexToRealEstate();
      reports.push(vcToReReport);
      
      // Update sync state
      this.lastSync = new Date();
      await this.saveSyncState();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Sync cycle completed in ${duration}ms`);
      
      this.emit('sync:completed', { reports, duration });
      return reports;
      
    } catch (error) {
      console.error('❌ Sync cycle failed:', error);
      this.emit('sync:error', error);
      throw error;
    }
  }

  /**
   * Sync signals and intelligence from Real Estate Intelligence to Vision Cortex
   */
  private async syncRealEstateToVisionCortex(): Promise<SyncReport> {
    const startTime = Date.now();
    const operations: SyncOperation[] = [];
    
    try {
      // Get new signals from Real Estate Intelligence
      const signals = await this.getRealEstateSignals();
      
      for (const signal of signals) {
        try {
          await this.sendSignalToVisionCortex(signal);
          operations.push({
            type: 'signal',
            operation: 'create',
            id: signal.id,
            status: 'success',
            data: { source: 'real_estate', type: signal.type }
          });
        } catch (error) {
          operations.push({
            type: 'signal',
            operation: 'create',
            id: signal.id,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      // Get market intelligence updates
      const intelligence = await this.getRealEstateIntelligence();
      
      for (const intel of intelligence) {
        try {
          await this.sendIntelligenceToVisionCortex(intel);
          operations.push({
            type: 'intelligence',
            operation: 'update',
            id: intel.id,
            status: 'success',
            data: { source: 'real_estate', domain: intel.domain }
          });
        } catch (error) {
          operations.push({
            type: 'intelligence',
            operation: 'update',
            id: intel.id,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      const report: SyncReport = {
        timestamp: new Date().toISOString(),
        source: 'real_estate',
        target: 'vision_cortex',
        operations: {
          signals_synced: operations.filter(op => op.type === 'signal' && op.status === 'success').length,
          intelligence_shared: operations.filter(op => op.type === 'intelligence' && op.status === 'success').length,
          errors: operations.filter(op => op.status === 'error').length,
          warnings: operations.filter(op => op.status === 'warning').length
        },
        details: operations,
        duration: Date.now() - startTime,
        next_sync: new Date(Date.now() + this.config.syncInterval).toISOString()
      };
      
      console.log(`📊 RE→VC: ${report.operations.signals_synced} signals, ${report.operations.intelligence_shared} intelligence`);
      return report;
      
    } catch (error) {
      throw new Error(`Real Estate to Vision Cortex sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync processed intelligence and alerts from Vision Cortex to Real Estate Intelligence
   */
  private async syncVisionCortexToRealEstate(): Promise<SyncReport> {
    const startTime = Date.now();
    const operations: SyncOperation[] = [];
    
    try {
      // Get processed intelligence from Vision Cortex
      const processedIntelligence = await this.getVisionCortexIntelligence();
      
      for (const intel of processedIntelligence) {
        try {
          await this.sendIntelligenceToRealEstate(intel);
          operations.push({
            type: 'intelligence',
            operation: 'create',
            id: intel.id,
            status: 'success',
            data: { source: 'vision_cortex', confidence: intel.confidence }
          });
        } catch (error) {
          operations.push({
            type: 'intelligence',
            operation: 'create',
            id: intel.id,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      // Get alerts from Vision Cortex
      const alerts = await this.getVisionCortexAlerts();
      
      for (const alert of alerts) {
        try {
          await this.sendAlertToRealEstate(alert);
          operations.push({
            type: 'alert',
            operation: 'create',
            id: alert.id,
            status: 'success',
            data: { source: 'vision_cortex', priority: alert.priority }
          });
        } catch (error) {
          operations.push({
            type: 'alert',
            operation: 'create',
            id: alert.id,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      const report: SyncReport = {
        timestamp: new Date().toISOString(),
        source: 'vision_cortex',
        target: 'real_estate',
        operations: {
          signals_synced: 0, // Vision Cortex doesn't sync signals back
          intelligence_shared: operations.filter(op => op.type === 'intelligence' && op.status === 'success').length,
          errors: operations.filter(op => op.status === 'error').length,
          warnings: operations.filter(op => op.status === 'warning').length
        },
        details: operations,
        duration: Date.now() - startTime,
        next_sync: new Date(Date.now() + this.config.syncInterval).toISOString()
      };
      
      console.log(`📊 VC→RE: ${report.operations.intelligence_shared} intelligence, ${operations.filter(op => op.type === 'alert').length} alerts`);
      return report;
      
    } catch (error) {
      throw new Error(`Vision Cortex to Real Estate sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate required paths exist
   */
  private async validatePaths(): Promise<void> {
    const paths = [
      this.config.realEstateRoot,
      this.config.visionCortexRoot
    ];
    
    for (const pathToCheck of paths) {
      try {
        await fs.access(pathToCheck);
      } catch (error) {
        throw new Error(`Required path does not exist: ${pathToCheck}`);
      }
    }
  }

  /**
   * Check API connectivity
   */
  private async checkConnectivity(): Promise<void> {
    const endpoints = [
      { name: 'Real Estate Intelligence', url: this.config.apiEndpoints.realEstate },
      { name: 'Vision Cortex', url: this.config.apiEndpoints.visionCortex }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${endpoint.url}/health`, {
          timeout: 5000,
          headers: this.getAuthHeaders()
        });
        
        if (response.status !== 200) {
          console.warn(`⚠️ ${endpoint.name} API returned ${response.status}`);
        }
      } catch (error) {
        console.warn(`⚠️ Cannot connect to ${endpoint.name} API: ${endpoint.url}`);
        // Don't fail initialization - APIs might not be running yet
      }
    }
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.config.credentials.apiKey) {
      headers['X-API-Key'] = this.config.credentials.apiKey;
    }
    
    if (this.config.credentials.bearerToken) {
      headers['Authorization'] = `Bearer ${this.config.credentials.bearerToken}`;
    }
    
    return headers;
  }

  // ============================================================================
  // API INTEGRATION METHODS
  // ============================================================================

  private async getRealEstateSignals(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.config.apiEndpoints.realEstate}/api/signals`, {
        headers: this.getAuthHeaders(),
        params: { since: this.lastSync.toISOString() }
      });
      return response.data.signals || [];
    } catch (error) {
      console.warn('Could not fetch Real Estate signals:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  private async getRealEstateIntelligence(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.config.apiEndpoints.realEstate}/api/intelligence`, {
        headers: this.getAuthHeaders(),
        params: { since: this.lastSync.toISOString() }
      });
      return response.data.intelligence || [];
    } catch (error) {
      console.warn('Could not fetch Real Estate intelligence:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  private async getVisionCortexIntelligence(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.config.apiEndpoints.visionCortex}/vision-cortex/intelligence`, {
        headers: this.getAuthHeaders(),
        params: { since: this.lastSync.toISOString(), domain: 'real_estate' }
      });
      return response.data.intelligence || [];
    } catch (error) {
      console.warn('Could not fetch Vision Cortex intelligence:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  private async getVisionCortexAlerts(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.config.apiEndpoints.visionCortex}/vision-cortex/alerts`, {
        headers: this.getAuthHeaders(),
        params: { since: this.lastSync.toISOString(), domain: 'real_estate' }
      });
      return response.data.alerts || [];
    } catch (error) {
      console.warn('Could not fetch Vision Cortex alerts:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  private async sendSignalToVisionCortex(signal: any): Promise<void> {
    await axios.post(`${this.config.apiEndpoints.visionCortex}/vision-cortex/signals`, signal, {
      headers: this.getAuthHeaders()
    });
  }

  private async sendIntelligenceToVisionCortex(intelligence: any): Promise<void> {
    await axios.post(`${this.config.apiEndpoints.visionCortex}/vision-cortex/intelligence`, intelligence, {
      headers: this.getAuthHeaders()
    });
  }

  private async sendIntelligenceToRealEstate(intelligence: any): Promise<void> {
    await axios.post(`${this.config.apiEndpoints.realEstate}/api/intelligence`, intelligence, {
      headers: this.getAuthHeaders()
    });
  }

  private async sendAlertToRealEstate(alert: any): Promise<void> {
    await axios.post(`${this.config.apiEndpoints.realEstate}/api/alerts`, alert, {
      headers: this.getAuthHeaders()
    });
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  private async loadSyncState(): Promise<void> {
    const stateFile = path.join(this.config.visionCortexRoot, 'sync-state.json');
    
    try {
      const stateData = await fs.readFile(stateFile, 'utf8');
      const state = JSON.parse(stateData);
      this.lastSync = new Date(state.lastSync || 0);
    } catch (error) {
      // State file doesn't exist or is invalid - start fresh
      this.lastSync = new Date(0);
    }
  }

  private async saveSyncState(): Promise<void> {
    const stateFile = path.join(this.config.visionCortexRoot, 'sync-state.json');
    const state = {
      lastSync: this.lastSync.toISOString(),
      timestamp: new Date().toISOString()
    };
    
    await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
  }

  /**
   * Get sync status and statistics
   */
  getSyncStatus(): {
    isRunning: boolean;
    lastSync: string;
    nextSync: string;
    uptime: number;
  } {
    return {
      isRunning: this.isRunning,
      lastSync: this.lastSync.toISOString(),
      nextSync: new Date(Date.now() + this.config.syncInterval).toISOString(),
      uptime: this.isRunning ? Date.now() - this.lastSync.getTime() : 0
    };
  }

  /**
   * Manual sync trigger
   */
  async triggerSync(): Promise<SyncReport[]> {
    if (!this.isRunning) {
      throw new Error('Sync system not running');
    }
    
    console.log('🔄 Manual sync triggered');
    return await this.performSync();
  }
}

export default RealEstateIntelligenceSync;