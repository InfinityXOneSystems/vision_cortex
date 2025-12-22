/**
 * 🚀 MODULAR LLM PROVIDER SYSTEM
 * Vertex AI + Google Models Integration with Real Estate Intelligence Router
 */

import { VertexAI } from '@google-cloud/vertexai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Anthropic } from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { LLMProvider, LLMResponse, ProviderType } from './types';

export abstract class BaseLLMProvider {
  protected provider: LLMProvider;
  
  constructor(provider: LLMProvider) {
    this.provider = provider;
  }
  
  abstract query(prompt: string, options?: any): Promise<LLMResponse>;
  abstract healthCheck(): Promise<boolean>;
}

export class VertexAIProvider extends BaseLLMProvider {
  private vertexAI: VertexAI;
  
  constructor(provider: LLMProvider) {
    super(provider);
    this.vertexAI = new VertexAI({
      project: provider.gcp_project || process.env.GCP_PROJECT_ID || 'infinity-x-one-systems',
      location: provider.gcp_region || process.env.GCP_REGION || 'us-east1'
    });
  }
  
  async query(prompt: string, options: {imageData?: string, temperature?: number} = {}): Promise<LLMResponse> {
    const startTime = Date.now();
    const model = this.vertexAI.getGenerativeModel({ model: this.provider.model });
    
    let content: any = [{ text: prompt }];
    if (options.imageData) {
      content.push({
        inlineData: { mimeType: 'image/jpeg', data: options.imageData }
      });
    }
    
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: content }],
      generationConfig: {
        maxOutputTokens: this.provider.max_tokens,
        temperature: options.temperature || this.provider.temperature
      }
    });
    
    return {
      provider: this.provider.name,
      model: this.provider.model,
      response: response.response?.candidates?.[0]?.content?.parts?.[0]?.text || '',
      confidence: 0.92,
      tokens_used: Math.ceil((response.response?.candidates?.[0]?.content?.parts?.[0]?.text || '').length / 4),
      latency_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('Health check');
      return true;
    } catch { return false; }
  }
}

export class GoogleGeminiProvider extends BaseLLMProvider {
  private gemini: GoogleGenerativeAI;
  
  constructor(provider: LLMProvider) {
    super(provider);
    this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY!);
  }
  
  async query(prompt: string, options: any = {}): Promise<LLMResponse> {
    const startTime = Date.now();
    const model = this.gemini.getGenerativeModel({ model: this.provider.model });
    const response = await model.generateContent(prompt);
    
    return {
      provider: this.provider.name,
      model: this.provider.model,
      response: response.response.text(),
      confidence: 0.90,
      tokens_used: Math.ceil(response.response.text().length / 4),
      latency_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('Health check');
      return true;
    } catch { return false; }
  }
}

export class AnthropicProvider extends BaseLLMProvider {
  private anthropic: Anthropic;
  
  constructor(provider: LLMProvider) {
    super(provider);
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  
  async query(prompt: string, options: any = {}): Promise<LLMResponse> {
    const startTime = Date.now();
    const response = await this.anthropic.messages.create({
      model: this.provider.model,
      max_tokens: this.provider.max_tokens,
      temperature: options.temperature || this.provider.temperature,
      messages: [{ role: 'user', content: prompt }]
    });
    
    return {
      provider: this.provider.name,
      model: this.provider.model,
      response: response.content?.[0]?.type === 'text' ? (response.content[0] as any).text : '',
      confidence: 0.95,
      tokens_used: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      latency_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('Health check');
      return true;
    } catch { return false; }
  }
}

export class ProviderFactory {
  static create(provider: LLMProvider): BaseLLMProvider {
    switch (provider.provider_type || provider.name) {
      case 'vertex-ai':
      case 'vertex-ai-flash':
        return new VertexAIProvider(provider);
      case 'google-gemini':
        return new GoogleGeminiProvider(provider);
      case 'anthropic':
        return new AnthropicProvider(provider);
      default:
        throw new Error(`Unsupported provider: ${provider.name}`);
    }
  }
}