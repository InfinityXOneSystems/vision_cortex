/**
 * Memory System - Vector-based memory storage and retrieval
 */

import { Embeddings } from '@google-cloud/vertexai';
import { Storage } from '@google-cloud/storage';
import { Logger } from 'winston';
import { logger } from '../utils/logger';

export interface MemoryConfig {
  vectorDimensions: number;
  maxContextLength: number;
  persistencePath?: string;
}

export interface MemoryEntry {
  id?: string;
  content: string;
  vector?: number[];
  metadata?: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
}

export interface MemorySearchOptions {
  limit?: number;
  threshold?: number;
  filter?: Record<string, any>;
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  similarity: number;
}

export class MemorySystem {
  private config: MemoryConfig;
  private logger: Logger;
  private storage: Storage;
  private memories: Map<string, MemoryEntry> = new Map();
  private embeddings: Embeddings | null = null;

  constructor(config: MemoryConfig) {
    this.config = config;
    this.logger = logger.child({ component: 'MemorySystem' });
    this.storage = new Storage();
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Memory System...');
    
    try {
      // Initialize embeddings if available
      try {
        this.embeddings = new Embeddings();
        this.logger.info('Embeddings initialized');
      } catch (error) {
        this.logger.warn('Failed to initialize embeddings, using fallback', error);
      }
      
      // Load persisted memories if path provided
      if (this.config.persistencePath) {
        await this.loadMemories();
      }
      
      this.logger.info('Memory System initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Memory System', error);
      throw error;
    }
  }

  async store(entry: Omit<MemoryEntry, 'id' | 'vector'>): Promise<string> {
    const id = this.generateId();
    
    try {
      // Generate vector embedding
      let vector: number[] | undefined;
      if (this.embeddings) {
        const embedding = await this.embeddings.embedText(entry.content);
        vector = Array.from(embedding.values);
      } else {
        // Fallback: simple hash-based vector
        vector = this.generateFallbackVector(entry.content);
      }
      
      const memoryEntry: MemoryEntry = {
        ...entry,
        id,
        vector
      };
      
      this.memories.set(id, memoryEntry);
      
      // Persist if configured
      if (this.config.persistencePath) {
        await this.persistMemory(memoryEntry);
      }
      
      this.logger.debug('Memory stored', { id, content: entry.content.substring(0, 100) });
      return id;
      
    } catch (error) {
      this.logger.error('Failed to store memory', { error, id });
      throw error;
    }
  }

  async search(
    query: string,
    options: MemorySearchOptions = {}
  ): Promise<MemorySearchResult[]> {
    const { limit = 10, threshold = 0.7 } = options;
    
    try {
      // Generate query vector
      let queryVector: number[];
      if (this.embeddings) {
        const embedding = await this.embeddings.embedText(query);
        queryVector = Array.from(embedding.values);
      } else {
        queryVector = this.generateFallbackVector(query);
      }
      
      // Calculate similarities
      const results: MemorySearchResult[] = [];
      
      for (const [id, memory] of this.memories) {
        if (!memory.vector) continue;
        
        const similarity = this.cosineSimilarity(queryVector, memory.vector);
        
        if (similarity >= threshold) {
          results.push({
            entry: memory,
            similarity
          });
        }
      }
      
      // Sort by similarity and limit results
      results.sort((a, b) => b.similarity - a.similarity);
      return results.slice(0, limit);
      
    } catch (error) {
      this.logger.error('Failed to search memories', { error, query });
      return [];
    }
  }

  async getMemory(id: string): Promise<MemoryEntry | null> {
    return this.memories.get(id) || null;
  }

  async deleteMemory(id: string): Promise<boolean> {
    const deleted = this.memories.delete(id);
    
    if (deleted && this.config.persistencePath) {
      await this.deletePersistentMemory(id);
    }
    
    return deleted;
  }

  async getStatus() {
    return {
      totalMemories: this.memories.size,
      vectorDimensions: this.config.vectorDimensions,
      embeddingsEnabled: !!this.embeddings,
      persistenceEnabled: !!this.config.persistencePath
    };
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFallbackVector(text: string): number[] {
    // Simple fallback vector generation using character codes
    const vector = new Array(this.config.vectorDimensions).fill(0);
    
    for (let i = 0; i < text.length && i < this.config.vectorDimensions; i++) {
      vector[i % this.config.vectorDimensions] += text.charCodeAt(i) / 256;
    }
    
    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
  }

  private async loadMemories(): Promise<void> {
    // Implementation would load from GCS or local file
    this.logger.info('Loading memories from persistence storage...');
  }

  private async persistMemory(memory: MemoryEntry): Promise<void> {
    // Implementation would persist to GCS or local file
    this.logger.debug('Persisting memory', { id: memory.id });
  }

  private async deletePersistentMemory(id: string): Promise<void> {
    // Implementation would delete from persistence storage
    this.logger.debug('Deleting persistent memory', { id });
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Memory System...');
    
    if (this.config.persistencePath) {
      // Save all memories before shutdown
      await this.saveAllMemories();
    }
    
    this.memories.clear();
    this.logger.info('Memory System shutdown complete');
  }

  private async saveAllMemories(): Promise<void> {
    this.logger.info('Saving all memories before shutdown...');
    // Implementation would save all memories to persistence
  }
}