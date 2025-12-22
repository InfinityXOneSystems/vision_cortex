/**
 * 🗂️ INDEX INTEGRATION SERVICE
 * 
 * Integrates with index system for document and knowledge indexing
 * Provides semantic search and retrieval capabilities
 * 
 * @author Infinity X One Systems
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import axios from 'axios';

interface IndexDocument {
  id: string;
  title: string;
  content: string;
  domain: string;
  metadata: {
    created_at: string;
    updated_at: string;
    source: string;
    confidence: number;
    semantic_tags: string[];
    embeddings?: number[];
  };
}

interface SearchResult {
  document: IndexDocument;
  relevance_score: number;
  matching_segments: string[];
}

interface IndexIntelligence {
  query: string;
  results: SearchResult[];
  semantic_clusters: {
    cluster_id: string;
    documents: string[];
    theme: string;
    confidence: number;
  }[];
  knowledge_gaps: string[];
}

export class IndexIntegration extends EventEmitter {
  private indexServiceUrl: string;
  private isConnected: boolean = false;
  private documentCache: Map<string, IndexDocument> = new Map();
  private lastSync: Date | null = null;

  constructor() {
    super();
    
    this.indexServiceUrl = process.env.INDEX_SERVICE_URL || 'https://index-service.run.app';
    
    console.log('🗂️ Index Integration initialized');
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔄 Connecting to Index service...');
      
      // Test connection
      const response = await axios.get(`${this.indexServiceUrl}/health`, {
        timeout: 10000
      });
      
      if (response.status === 200) {
        this.isConnected = true;
        console.log('✅ Index service connected');
        
        // Initial index sync
        await this.performInitialSync();
        
      } else {
        throw new Error(`Index service unhealthy: ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to connect to Index service:', error.message);
      this.isConnected = false;
    }
  }

  /**
   * 🔄 Sync with Index System
   */
  async syncWithIndex(data: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Index service not connected');
    }

    try {
      console.log('🗂️ Syncing with index system...');
      
      const payload = {
        source: 'vision-cortex-quantum-brain',
        intelligence_data: data,
        timestamp: new Date().toISOString(),
        sync_type: 'intelligence_indexing'
      };

      const response = await axios.post(`${this.indexServiceUrl}/api/sync/vision-cortex`, payload, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'X-Source-System': 'vision-cortex'
        }
      });

      this.lastSync = new Date();
      
      // Process index updates
      if (response.data.index_updates) {
        await this.processIndexUpdates(response.data.index_updates);
      }
      
      console.log('✅ Index sync completed');
      this.emit('index:synced', response.data);
      
    } catch (error) {
      console.error('❌ Index sync failed:', error.message);
      this.emit('index:sync-failed', error);
      throw error;
    }
  }

  /**
   * 🔍 Semantic Search
   */
  async semanticSearch(query: string, domain?: string, limit: number = 10): Promise<IndexIntelligence> {
    if (!this.isConnected) {
      throw new Error('Index service not connected');
    }

    try {
      console.log(`🔍 Performing semantic search: "${query}"`);
      
      const response = await axios.post(`${this.indexServiceUrl}/api/search/semantic`, {
        query,
        domain,
        limit,
        include_clusters: true,
        include_gaps: true,
        source: 'vision-cortex-quantum-brain'
      }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const intelligence = response.data;
      
      // Update document cache with results
      intelligence.results?.forEach((result: SearchResult) => {
        this.documentCache.set(result.document.id, result.document);
      });
      
      this.emit('search:completed', {
        query,
        results_count: intelligence.results?.length || 0
      });
      
      return intelligence;
      
    } catch (error) {
      console.error('❌ Semantic search failed:', error.message);
      throw error;
    }
  }

  /**
   * 📄 Index Document
   */
  async indexDocument(document: Partial<IndexDocument>): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Index service not connected');
    }

    try {
      const response = await axios.post(`${this.indexServiceUrl}/api/documents/index`, {
        ...document,
        source: 'vision-cortex-quantum-brain',
        timestamp: new Date().toISOString()
      }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const documentId = response.data.document_id;
      
      // Update cache
      if (response.data.document) {
        this.documentCache.set(documentId, response.data.document);
      }
      
      console.log(`✅ Document indexed: ${documentId}`);
      this.emit('document:indexed', { document_id: documentId });
      
      return documentId;
      
    } catch (error) {
      console.error('❌ Document indexing failed:', error.message);
      throw error;
    }
  }

  /**
   * 📊 Get Knowledge Clusters
   */
  async getKnowledgeClusters(domain: string): Promise<any[]> {
    if (!this.isConnected) {
      throw new Error('Index service not connected');
    }

    try {
      const response = await axios.get(`${this.indexServiceUrl}/api/knowledge/clusters`, {
        params: { 
          domain,
          source: 'vision-cortex-quantum-brain'
        },
        timeout: 10000
      });

      const clusters = response.data.clusters;
      
      this.emit('clusters:retrieved', {
        domain,
        clusters_count: clusters.length
      });
      
      return clusters;
      
    } catch (error) {
      console.error('❌ Failed to get knowledge clusters:', error.message);
      throw error;
    }
  }

  /**
   * 📈 Get Knowledge Intelligence
   */
  async getKnowledgeIntelligence(domain: string): Promise<any> {
    if (!this.isConnected) {
      console.log('⚠️  Index service offline, using cached data');
      return this.getCachedIntelligence(domain);
    }

    try {
      const response = await axios.post(`${this.indexServiceUrl}/api/intelligence/knowledge`, {
        domain,
        source: 'vision-cortex-quantum-brain',
        analysis_type: 'comprehensive'
      }, {
        timeout: 15000
      });

      const intelligence = response.data;
      
      this.emit('knowledge:intelligence', intelligence);
      
      return intelligence;
      
    } catch (error) {
      console.error('❌ Failed to get knowledge intelligence:', error.message);
      return this.getCachedIntelligence(domain);
    }
  }

  /**
   * 🔄 Perform Initial Sync
   */
  private async performInitialSync(): Promise<void> {
    try {
      console.log('🗂️ Performing initial index sync...');
      
      // Get index summary
      const summaryResponse = await axios.get(`${this.indexServiceUrl}/api/summary`, {
        timeout: 10000
      });
      
      const summary = summaryResponse.data;
      console.log(`📊 Index summary: ${summary.total_documents} documents, ${summary.domains?.length || 0} domains`);
      
      // Sync recent documents for each domain
      if (summary.domains) {
        for (const domain of summary.domains) {
          await this.syncRecentDocuments(domain, 50); // Sync 50 recent docs per domain
        }
      }
      
      this.lastSync = new Date();
      console.log('✅ Initial index sync completed');
      
    } catch (error) {
      console.error('❌ Initial index sync failed:', error.message);
    }
  }

  /**
   * 📄 Sync Recent Documents
   */
  private async syncRecentDocuments(domain: string, limit: number): Promise<void> {
    try {
      const response = await axios.get(`${this.indexServiceUrl}/api/documents/recent`, {
        params: { domain, limit },
        timeout: 10000
      });
      
      const documents = response.data.documents || [];
      
      // Update cache
      documents.forEach((doc: IndexDocument) => {
        this.documentCache.set(doc.id, doc);
      });
      
      console.log(`📄 Synced ${documents.length} recent documents for domain: ${domain}`);
      
    } catch (error) {
      console.error(`❌ Failed to sync documents for domain ${domain}:`, error.message);
    }
  }

  /**
   * 🔄 Process Index Updates
   */
  private async processIndexUpdates(updates: any[]): Promise<void> {
    console.log(`🔄 Processing ${updates.length} index updates...`);
    
    for (const update of updates) {
      try {
        switch (update.type) {
          case 'document_indexed':
          case 'document_updated':
            this.documentCache.set(update.document.id, update.document);
            break;
            
          case 'document_deleted':
            this.documentCache.delete(update.document_id);
            break;
            
          case 'cluster_created':
          case 'cluster_updated':
            await this.updateClusterCache(update.cluster);
            break;
        }
        
        this.emit('index:update-processed', update);
        
      } catch (error) {
        console.error('❌ Failed to process index update:', error);
      }
    }
    
    console.log('✅ Index updates processed');
  }

  /**
   * 🗂️ Update Cluster Cache
   */
  private async updateClusterCache(cluster: any): Promise<void> {
    // Update cluster-related documents in cache
    for (const docId of cluster.document_ids || []) {
      const doc = this.documentCache.get(docId);
      if (doc) {
        doc.metadata.updated_at = new Date().toISOString();
      }
    }
  }

  /**
   * 📚 Get Cached Intelligence
   */
  private getCachedIntelligence(domain: string): any {
    const relevantDocs = Array.from(this.documentCache.values())
      .filter(doc => doc.domain === domain)
      .slice(0, 10);
    
    return {
      source: 'cached',
      domain,
      document_count: relevantDocs.length,
      recent_documents: relevantDocs,
      knowledge_gaps: ['Real-time data unavailable (service offline)'],
      confidence: 0.6,
      message: 'Generated from cached index data'
    };
  }

  /**
   * 📊 Get Status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      service_url: this.indexServiceUrl,
      cached_documents: this.documentCache.size,
      last_sync: this.lastSync?.toISOString() || null,
      capabilities: ['semantic_search', 'document_indexing', 'knowledge_clusters', 'intelligence_analysis']
    };
  }

  /**
   * 🧹 Clear Cache
   */
  clearCache(): void {
    this.documentCache.clear();
    console.log('🧹 Index cache cleared');
  }
}