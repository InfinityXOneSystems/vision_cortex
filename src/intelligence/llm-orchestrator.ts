/**
 * 🤖 MULTI-LLM ORCHESTRATION SYSTEM
 * 
 * Orchestrates multiple LLM providers to generate cross-model intelligence
 * Handles load balancing, failover, and response optimization
 * 
 * @author Infinity X One Systems
 * @version 2.0.0
 */

import axios from 'axios';
import { EventEmitter } from 'events';
import {
  LLMProvider,
  LLMResponse,
  DEFAULT_LLM_PROVIDERS
} from './types';

export class LLMOrchestrator extends EventEmitter {
  private providers: Map<string, LLMProvider> = new Map();
  private healthStatus: Map<string, boolean> = new Map();
  private responseCache: Map<string, LLMResponse[]> = new Map();
  private requestCounts: Map<string, number> = new Map();

  constructor(initialProviders: LLMProvider[] = DEFAULT_LLM_PROVIDERS) {
    super();
    
    initialProviders.forEach(provider => {
      this.providers.set(provider.name, provider);
      this.healthStatus.set(provider.name, false);
      this.requestCounts.set(provider.name, 0);
    });
    
    console.log(`🤖 LLM Orchestrator initialized with ${this.providers.size} providers`);
  }

  async initialize(): Promise<void> {
    console.log('🔄 Initializing LLM providers...');
    
    const healthChecks = Array.from(this.providers.values()).map(async (provider) => {
      try {
        const isHealthy = await this.checkProviderHealth(provider);
        this.healthStatus.set(provider.name, isHealthy);
        
        if (isHealthy) {
          console.log(`✅ ${provider.name} (${provider.model}) - READY`);
        } else {
          console.log(`⚠️  ${provider.name} (${provider.model}) - UNAVAILABLE`);
        }
      } catch (error) {
        console.log(`❌ ${provider.name} (${provider.model}) - ERROR`);
        this.healthStatus.set(provider.name, false);
      }
    });
    
    await Promise.all(healthChecks);
    
    const activeCount = Array.from(this.healthStatus.values()).filter(status => status).length;
    console.log(`🚀 ${activeCount}/${this.providers.size} LLM providers operational`);
    
    // Start health monitoring
    setInterval(() => this.monitorProviderHealth(), 300000); // Every 5 minutes
  }

  /**
   * 🎯 Query Multiple Models in Parallel
   */
  async queryMultipleModels(
    prompt: string,
    domain: string,
    options: {
      maxProviders?: number;
      timeout?: number;
      requireConsensus?: boolean;
    } = {}
  ): Promise<LLMResponse[]> {
    
    const {
      maxProviders = 3,
      timeout = 30000,
      requireConsensus = false
    } = options;

    console.log(`🔄 Querying ${Math.min(maxProviders, this.getActiveProviders().length)} models...`);
    
    const activeProviders = this.getActiveProviders()
      .sort((a, b) => b.reliability_score - a.reliability_score)
      .slice(0, maxProviders);

    if (activeProviders.length === 0) {
      throw new Error('No active LLM providers available');
    }

    const queryPromises = activeProviders.map(async (provider) => {
      try {
        return await this.queryProvider(provider, prompt, domain, timeout);
      } catch (error) {
        console.error(`❌ ${provider.name} query failed:`, error.message);
        
        // Mark provider as unhealthy if it fails
        this.healthStatus.set(provider.name, false);
        
        return null;
      }
    });

    const responses = await Promise.all(queryPromises);
    const validResponses = responses.filter(r => r !== null) as LLMResponse[];

    if (validResponses.length === 0) {
      throw new Error('All LLM providers failed to respond');
    }

    console.log(`✅ Received ${validResponses.length} valid responses`);
    
    // Cache responses for analysis
    const cacheKey = this.generateCacheKey(prompt, domain);
    this.responseCache.set(cacheKey, validResponses);

    return validResponses;
  }

  /**
   * 🎯 Query Single Provider
   */
  private async queryProvider(
    provider: LLMProvider,
    prompt: string,
    domain: string,
    timeout: number
  ): Promise<LLMResponse> {
    
    const startTime = Date.now();
    
    // Increment request count
    const currentCount = this.requestCounts.get(provider.name) || 0;
    this.requestCounts.set(provider.name, currentCount + 1);

    try {
      console.log(`📡 Querying ${provider.name}:${provider.model}...`);
      
      const payload = this.buildProviderPayload(provider, prompt, domain);
      const headers = this.buildProviderHeaders(provider);

      const response = await axios.post(provider.endpoint, payload, {
        headers,
        timeout,
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const extractedResponse = this.extractResponse(provider, response.data);
      const latency = Date.now() - startTime;

      const llmResponse: LLMResponse = {
        provider: provider.name,
        model: provider.model,
        response: extractedResponse.text,
        confidence: extractedResponse.confidence || 0.8,
        tokens_used: extractedResponse.tokens || 0,
        latency_ms: latency,
        timestamp: new Date().toISOString(),
        hallucination_flags: []
      };

      console.log(`✅ ${provider.name} responded in ${latency}ms`);
      return llmResponse;

    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`❌ ${provider.name} failed after ${latency}ms:`, error.message);
      throw error;
    }
  }

  /**
   * 🔧 Build Provider-Specific Payload
   */
  private buildProviderPayload(provider: LLMProvider, prompt: string, domain: string): any {
    const enhancedPrompt = `
${prompt}

DOMAIN CONTEXT: ${domain}
PROVIDER SPECIALIZATION: ${provider.specialization.join(', ')}
EXPECTED OUTPUT: Asymmetric intelligence with specific predictions and actionable insights.
    `.trim();

    switch (provider.name) {
      case 'openai':
        return {
          model: provider.model,
          messages: [
            {
              role: 'system',
              content: 'You are part of Vision Cortex, a quantum intelligence system. Focus on non-obvious, predictive insights.'
            },
            {
              role: 'user', 
              content: enhancedPrompt
            }
          ],
          max_tokens: provider.max_tokens,
          temperature: provider.temperature
        };

      case 'anthropic':
        return {
          model: provider.model,
          messages: [
            {
              role: 'user',
              content: enhancedPrompt
            }
          ],
          max_tokens: provider.max_tokens,
          temperature: provider.temperature
        };

      case 'google':
        return {
          contents: [
            {
              parts: [{ text: enhancedPrompt }]
            }
          ],
          generationConfig: {
            maxOutputTokens: provider.max_tokens,
            temperature: provider.temperature
          }
        };

      default:
        return {
          prompt: enhancedPrompt,
          max_tokens: provider.max_tokens,
          temperature: provider.temperature
        };
    }
  }

  /**
   * 🔧 Build Provider-Specific Headers
   */
  private buildProviderHeaders(provider: LLMProvider): Record<string, string> {
    const baseHeaders = {
      'Content-Type': 'application/json'
    };

    switch (provider.name) {
      case 'openai':
        return {
          ...baseHeaders,
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        };

      case 'anthropic':
        return {
          ...baseHeaders,
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01'
        };

      case 'google':
        return {
          ...baseHeaders,
          'x-goog-api-key': process.env.GOOGLE_API_KEY || ''
        };

      default:
        return baseHeaders;
    }
  }

  /**
   * 📤 Extract Response from Provider-Specific Format
   */
  private extractResponse(provider: LLMProvider, responseData: any): {text: string, confidence?: number, tokens?: number} {
    try {
      switch (provider.name) {
        case 'openai':
          return {
            text: responseData.choices?.[0]?.message?.content || '',
            tokens: responseData.usage?.total_tokens || 0
          };

        case 'anthropic':
          return {
            text: responseData.content?.[0]?.text || '',
            tokens: responseData.usage?.output_tokens || 0
          };

        case 'google':
          return {
            text: responseData.candidates?.[0]?.content?.parts?.[0]?.text || '',
            tokens: responseData.usageMetadata?.totalTokenCount || 0
          };

        default:
          return {
            text: responseData.text || responseData.response || '',
            tokens: 0
          };
      }
    } catch (error) {
      console.error(`❌ Failed to extract response from ${provider.name}:`, error);
      return { text: '', tokens: 0 };
    }
  }

  /**
   * 🏥 Health Check for Provider
   */
  private async checkProviderHealth(provider: LLMProvider): Promise<boolean> {
    try {
      const testPrompt = 'Respond with "OK" if you can receive this message.';
      const payload = this.buildProviderPayload(provider, testPrompt, 'system_check');
      const headers = this.buildProviderHeaders(provider);

      const response = await axios.post(provider.endpoint, payload, {
        headers,
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * 📊 Monitor Provider Health (Background Task)
   */
  private async monitorProviderHealth(): Promise<void> {
    console.log('🔄 Monitoring LLM provider health...');
    
    for (const provider of this.providers.values()) {
      const isHealthy = await this.checkProviderHealth(provider);
      const wasHealthy = this.healthStatus.get(provider.name);
      
      this.healthStatus.set(provider.name, isHealthy);
      
      if (isHealthy && !wasHealthy) {
        console.log(`✅ ${provider.name} is back online`);
        this.emit('provider:recovered', { provider: provider.name });
      } else if (!isHealthy && wasHealthy) {
        console.log(`⚠️  ${provider.name} went offline`);
        this.emit('provider:failed', { provider: provider.name });
      }
    }
  }

  /**
   * 📋 Get Active Providers
   */
  getActiveProviders(): LLMProvider[] {
    return Array.from(this.providers.values()).filter(provider => 
      this.healthStatus.get(provider.name) === true
    );
  }

  /**
   * 📊 Get Provider Statistics
   */
  getProviderStats() {
    const stats = Array.from(this.providers.values()).map(provider => ({
      name: provider.name,
      model: provider.model,
      healthy: this.healthStatus.get(provider.name) || false,
      requests: this.requestCounts.get(provider.name) || 0,
      specialization: provider.specialization,
      reliability: provider.reliability_score
    }));

    return {
      total_providers: this.providers.size,
      active_providers: this.getActiveProviders().length,
      providers: stats
    };
  }

  /**
   * 🔧 Cache Key Generation
   */
  private generateCacheKey(prompt: string, domain: string): string {
    const hash = Buffer.from(`${prompt}:${domain}`).toString('base64').slice(0, 16);
    return `llm:${hash}`;
  }

  /**
   * 🧹 Clear Response Cache
   */
  clearCache(): void {
    this.responseCache.clear();
    console.log('🧹 LLM response cache cleared');
  }
}