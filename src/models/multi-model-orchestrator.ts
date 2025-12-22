/**
 * Multi-Model Orchestrator - Manages multiple AI models
 */

import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Logger } from 'winston';
import { logger } from '../utils/logger';

export interface ModelConfig {
  primary: string;
  fallback: string[];
  apiKeys: Record<string, string>;
}

export interface GenerationRequest {
  input: string;
  reasoning?: string[];
  context?: any;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerationResponse {
  content: string;
  model: string;
  confidence: number;
  tokenUsage: {
    input: number;
    output: number;
  };
}

export interface ModelStatus {
  name: string;
  available: boolean;
  latency?: number;
  errorRate?: number;
}

export class MultiModelOrchestrator {
  private config: ModelConfig;
  private logger: Logger;
  private vertexAI: VertexAI | null = null;
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private geminiModel: GenerativeModel | null = null;
  private modelStats: Map<string, ModelStatus> = new Map();

  constructor(config: ModelConfig) {
    this.config = config;
    this.logger = logger.child({ component: 'MultiModelOrchestrator' });
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Multi-Model Orchestrator...');
    
    try {
      // Initialize Vertex AI (Gemini)
      if (this.config.apiKeys.GOOGLE_CLOUD_PROJECT) {
        this.vertexAI = new VertexAI({
          project: this.config.apiKeys.GOOGLE_CLOUD_PROJECT,
          location: 'us-central1'
        });
        
        this.geminiModel = this.vertexAI.getGenerativeModel({
          model: 'gemini-1.5-pro'
        });
        
        this.modelStats.set('gemini-1.5-pro', {
          name: 'gemini-1.5-pro',
          available: true
        });
        
        this.logger.info('Vertex AI (Gemini) initialized');
      }
      
      // Initialize OpenAI
      if (this.config.apiKeys.OPENAI_API_KEY) {
        this.openai = new OpenAI({
          apiKey: this.config.apiKeys.OPENAI_API_KEY
        });
        
        this.modelStats.set('gpt-4', {
          name: 'gpt-4',
          available: true
        });
        
        this.logger.info('OpenAI initialized');
      }
      
      // Initialize Anthropic
      if (this.config.apiKeys.ANTHROPIC_API_KEY) {
        this.anthropic = new Anthropic({
          apiKey: this.config.apiKeys.ANTHROPIC_API_KEY
        });
        
        this.modelStats.set('claude-3-sonnet', {
          name: 'claude-3-sonnet',
          available: true
        });
        
        this.logger.info('Anthropic initialized');
      }
      
      this.logger.info('Multi-Model Orchestrator initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Multi-Model Orchestrator', error);
      throw error;
    }
  }

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    const model = request.model || this.config.primary;
    const startTime = Date.now();
    
    try {
      this.logger.info('Generating response', { model, inputLength: request.input.length });
      
      let response: GenerationResponse;
      
      // Try primary model first
      try {
        response = await this.generateWithModel(model, request);
      } catch (error) {
        this.logger.warn(`Primary model ${model} failed, trying fallback`, error);
        
        // Try fallback models
        for (const fallbackModel of this.config.fallback) {
          try {
            response = await this.generateWithModel(fallbackModel, request);
            break;
          } catch (fallbackError) {
            this.logger.warn(`Fallback model ${fallbackModel} failed`, fallbackError);
          }
        }
        
        if (!response!) {
          throw new Error('All models failed to generate response');
        }
      }
      
      // Update model statistics
      const latency = Date.now() - startTime;
      this.updateModelStats(response.model, true, latency);
      
      return response;
      
    } catch (error) {
      this.updateModelStats(model, false);
      this.logger.error('Failed to generate response', { error, model });
      throw error;
    }
  }

  private async generateWithModel(
    model: string,
    request: GenerationRequest
  ): Promise<GenerationResponse> {
    switch (true) {
      case model.startsWith('gemini'):
        return this.generateWithGemini(request);
      
      case model.startsWith('gpt'):
        return this.generateWithOpenAI(model, request);
      
      case model.startsWith('claude'):
        return this.generateWithAnthropic(model, request);
      
      default:
        throw new Error(`Unsupported model: ${model}`);
    }
  }

  private async generateWithGemini(request: GenerationRequest): Promise<GenerationResponse> {
    if (!this.geminiModel) {
      throw new Error('Gemini model not initialized');
    }
    
    const prompt = this.buildPrompt(request);
    
    const result = await this.geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.maxTokens || 1024
      }
    });
    
    const response = result.response;
    const text = response.text();
    
    return {
      content: text,
      model: 'gemini-1.5-pro',
      confidence: 0.8, // Placeholder
      tokenUsage: {
        input: this.estimateTokens(prompt),
        output: this.estimateTokens(text)
      }
    };
  }

  private async generateWithOpenAI(
    model: string,
    request: GenerationRequest
  ): Promise<GenerationResponse> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized');
    }
    
    const prompt = this.buildPrompt(request);
    
    const completion = await this.openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 1024
    });
    
    const choice = completion.choices[0];
    if (!choice?.message?.content) {
      throw new Error('No response from OpenAI');
    }
    
    return {
      content: choice.message.content,
      model,
      confidence: 0.85,
      tokenUsage: {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0
      }
    };
  }

  private async generateWithAnthropic(
    model: string,
    request: GenerationRequest
  ): Promise<GenerationResponse> {
    if (!this.anthropic) {
      throw new Error('Anthropic not initialized');
    }
    
    const prompt = this.buildPrompt(request);
    
    const message = await this.anthropic.messages.create({
      model,
      max_tokens: request.maxTokens || 1024,
      temperature: request.temperature || 0.7,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }
    
    return {
      content: content.text,
      model,
      confidence: 0.9,
      tokenUsage: {
        input: message.usage.input_tokens,
        output: message.usage.output_tokens
      }
    };
  }

  private buildPrompt(request: GenerationRequest): string {
    let prompt = request.input;
    
    if (request.reasoning && request.reasoning.length > 0) {
      prompt = `Context: Based on the following reasoning steps:\n${request.reasoning.join('\n')}\n\nUser Input: ${prompt}`;
    }
    
    if (request.context) {
      prompt = `Additional Context: ${JSON.stringify(request.context)}\n\n${prompt}`;
    }
    
    return prompt;
  }

  private estimateTokens(text: string): number {
    // Simple token estimation (roughly 4 characters per token)
    return Math.ceil(text.length / 4);
  }

  private updateModelStats(model: string, success: boolean, latency?: number): void {
    const stats = this.modelStats.get(model);
    if (!stats) return;
    
    if (success && latency) {
      stats.latency = stats.latency ? (stats.latency + latency) / 2 : latency;
      stats.errorRate = stats.errorRate ? stats.errorRate * 0.9 : 0;
    } else {
      stats.errorRate = stats.errorRate ? stats.errorRate * 1.1 : 0.1;
    }
    
    this.modelStats.set(model, stats);
  }

  async getStatus(): Promise<ModelStatus[]> {
    return Array.from(this.modelStats.values());
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Multi-Model Orchestrator...');
    
    // Clean up any persistent connections if needed
    this.vertexAI = null;
    this.openai = null;
    this.anthropic = null;
    this.geminiModel = null;
    this.modelStats.clear();
    
    this.logger.info('Multi-Model Orchestrator shutdown complete');
  }
}