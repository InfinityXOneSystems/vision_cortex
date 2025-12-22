/**
 * 📚 TAXONOMY INTEGRATION SERVICE
 * 
 * Integrates with taxonomy system for knowledge classification and organization
 * Feeds taxonomic intelligence back to the quantum brain
 * 
 * @author Infinity X One Systems
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import axios from 'axios';

interface TaxonomyNode {
  id: string;
  name: string;
  category: string;
  parent_id?: string;
  children: string[];
  metadata: {
    confidence: number;
    usage_count: number;
    last_updated: string;
    semantic_tags: string[];
  };
}

interface TaxonomyIntelligence {
  classification: string;
  confidence: number;
  related_nodes: TaxonomyNode[];
  semantic_relationships: {
    node_id: string;
    relationship_type: 'parent' | 'child' | 'sibling' | 'semantic';
    strength: number;
  }[];
}

export class TaxonomyIntegration extends EventEmitter {
  private taxonomyServiceUrl: string;
  private isConnected: boolean = false;
  private taxonomyCache: Map<string, TaxonomyNode> = new Map();
  private lastSync: Date | null = null;

  constructor() {
    super();
    
    this.taxonomyServiceUrl = process.env.TAXONOMY_SERVICE_URL || 'https://taxonomy-service.run.app';
    
    console.log('📚 Taxonomy Integration initialized');
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔄 Connecting to Taxonomy service...');
      
      // Test connection
      const response = await axios.get(`${this.taxonomyServiceUrl}/health`, {
        timeout: 10000
      });
      
      if (response.status === 200) {
        this.isConnected = true;
        console.log('✅ Taxonomy service connected');
        
        // Initial taxonomy sync
        await this.performInitialSync();
        
      } else {
        throw new Error(`Taxonomy service unhealthy: ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to connect to Taxonomy service:', error.message);
      this.isConnected = false;
    }
  }

  /**
   * 🔄 Sync with Taxonomy System
   */
  async syncWithTaxonomy(data: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Taxonomy service not connected');
    }

    try {
      console.log('📚 Syncing with taxonomy system...');
      
      const payload = {
        source: 'vision-cortex-quantum-brain',
        intelligence_data: data,
        timestamp: new Date().toISOString(),
        sync_type: 'intelligence_classification'
      };

      const response = await axios.post(`${this.taxonomyServiceUrl}/api/sync/vision-cortex`, payload, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'X-Source-System': 'vision-cortex'
        }
      });

      this.lastSync = new Date();
      
      // Process taxonomy response
      if (response.data.taxonomy_updates) {
        await this.processTaxonomyUpdates(response.data.taxonomy_updates);
      }
      
      console.log('✅ Taxonomy sync completed');
      this.emit('taxonomy:synced', response.data);
      
    } catch (error) {
      console.error('❌ Taxonomy sync failed:', error.message);
      this.emit('taxonomy:sync-failed', error);
      throw error;
    }
  }

  /**
   * 🔍 Classify Content Using Taxonomy
   */
  async classifyContent(content: string, domain: string): Promise<TaxonomyIntelligence> {
    if (!this.isConnected) {
      throw new Error('Taxonomy service not connected');
    }

    try {
      const response = await axios.post(`${this.taxonomyServiceUrl}/api/classify`, {
        content,
        domain,
        source: 'vision-cortex-quantum-brain'
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const classification = response.data;
      
      // Enhance with local taxonomy cache
      const enhancedClassification = await this.enhanceWithCache(classification);
      
      this.emit('content:classified', {
        content: content.substring(0, 100) + '...',
        classification: enhancedClassification
      });
      
      return enhancedClassification;
      
    } catch (error) {
      console.error('❌ Content classification failed:', error.message);
      throw error;
    }
  }

  /**
   * 🗂️ Get Taxonomy Hierarchy
   */
  async getTaxonomyHierarchy(domain: string): Promise<TaxonomyNode[]> {
    if (!this.isConnected) {
      throw new Error('Taxonomy service not connected');
    }

    try {
      const response = await axios.get(`${this.taxonomyServiceUrl}/api/taxonomy/hierarchy`, {
        params: { domain },
        timeout: 10000
      });

      const hierarchy = response.data.hierarchy;
      
      // Update local cache
      hierarchy.forEach((node: TaxonomyNode) => {
        this.taxonomyCache.set(node.id, node);
      });
      
      return hierarchy;
      
    } catch (error) {
      console.error('❌ Failed to get taxonomy hierarchy:', error.message);
      throw error;
    }
  }

  /**
   * 📊 Get Taxonomy Intelligence
   */
  async getTaxonomyIntelligence(query: string): Promise<any> {
    if (!this.isConnected) {
      console.log('⚠️  Taxonomy service offline, using cached data');
      return this.getCachedIntelligence(query);
    }

    try {
      const response = await axios.post(`${this.taxonomyServiceUrl}/api/intelligence`, {
        query,
        source: 'vision-cortex-quantum-brain',
        include_relationships: true,
        include_metadata: true
      }, {
        timeout: 15000
      });

      const intelligence = response.data;
      
      this.emit('taxonomy:intelligence', intelligence);
      
      return intelligence;
      
    } catch (error) {
      console.error('❌ Failed to get taxonomy intelligence:', error.message);
      return this.getCachedIntelligence(query);
    }
  }

  /**
   * 🔄 Perform Initial Sync
   */
  private async performInitialSync(): Promise<void> {
    try {
      console.log('📚 Performing initial taxonomy sync...');
      
      // Get all domains
      const domainsResponse = await axios.get(`${this.taxonomyServiceUrl}/api/domains`, {
        timeout: 10000
      });
      
      const domains = domainsResponse.data.domains || [];
      
      // Sync each domain
      for (const domain of domains) {
        const hierarchy = await this.getTaxonomyHierarchy(domain);
        console.log(`📚 Synced taxonomy for domain: ${domain} (${hierarchy.length} nodes)`);
      }
      
      this.lastSync = new Date();
      console.log('✅ Initial taxonomy sync completed');
      
    } catch (error) {
      console.error('❌ Initial taxonomy sync failed:', error.message);
    }
  }

  /**
   * 🔄 Process Taxonomy Updates
   */
  private async processTaxonomyUpdates(updates: any[]): Promise<void> {
    console.log(`🔄 Processing ${updates.length} taxonomy updates...`);
    
    for (const update of updates) {
      try {
        switch (update.type) {
          case 'node_created':
          case 'node_updated':
            this.taxonomyCache.set(update.node.id, update.node);
            break;
            
          case 'node_deleted':
            this.taxonomyCache.delete(update.node_id);
            break;
            
          case 'relationship_created':
          case 'relationship_updated':
            await this.updateRelationships(update.relationship);
            break;
        }
        
        this.emit('taxonomy:update-processed', update);
        
      } catch (error) {
        console.error('❌ Failed to process taxonomy update:', error);
      }
    }
    
    console.log('✅ Taxonomy updates processed');
  }

  /**
   * 🔗 Update Relationships
   */
  private async updateRelationships(relationship: any): Promise<void> {
    // Update relationship data in cache
    const sourceNode = this.taxonomyCache.get(relationship.source_id);
    const targetNode = this.taxonomyCache.get(relationship.target_id);
    
    if (sourceNode && targetNode) {
      // Update relationship metadata
      sourceNode.metadata.last_updated = new Date().toISOString();
      targetNode.metadata.last_updated = new Date().toISOString();
    }
  }

  /**
   * 📚 Enhance Classification with Cache
   */
  private async enhanceWithCache(classification: any): Promise<TaxonomyIntelligence> {
    const relatedNodes: TaxonomyNode[] = [];
    
    // Find related nodes in cache
    for (const nodeId of classification.related_node_ids || []) {
      const node = this.taxonomyCache.get(nodeId);
      if (node) {
        relatedNodes.push(node);
      }
    }
    
    return {
      classification: classification.category || 'unknown',
      confidence: classification.confidence || 0.5,
      related_nodes: relatedNodes,
      semantic_relationships: classification.relationships || []
    };
  }

  /**
   * 📚 Get Cached Intelligence
   */
  private getCachedIntelligence(query: string): any {
    // Simple cache-based intelligence
    const relevantNodes = Array.from(this.taxonomyCache.values())
      .filter(node => 
        node.name.toLowerCase().includes(query.toLowerCase()) ||
        node.metadata.semantic_tags.some(tag => 
          tag.toLowerCase().includes(query.toLowerCase())
        )
      )
      .slice(0, 5);
    
    return {
      source: 'cached',
      query,
      relevant_nodes: relevantNodes,
      confidence: 0.6,
      message: 'Generated from cached taxonomy data (service offline)'
    };
  }

  /**
   * 📊 Get Status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      service_url: this.taxonomyServiceUrl,
      cached_nodes: this.taxonomyCache.size,
      last_sync: this.lastSync?.toISOString() || null,
      capabilities: ['classification', 'hierarchy', 'intelligence', 'relationships']
    };
  }

  /**
   * 🧹 Clear Cache
   */
  clearCache(): void {
    this.taxonomyCache.clear();
    console.log('🧹 Taxonomy cache cleared');
  }
}