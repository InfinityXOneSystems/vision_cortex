/**
 * Ollama LLM Client - Local inference via Docker
 * Supports model switching (llama2, mistral, neural-chat, etc.)
 * Streaming and non-streaming modes
 */

import axios, { AxiosInstance } from "axios";
import { EventEmitter } from "events";

export interface OllamaConfig {
  baseUrl?: string; // Default: http://localhost:11434
  model?: string; // Default: llama2
  temperature?: number; // 0-1
  topK?: number;
  topP?: number;
  timeout?: number; // ms
}

export interface OllamaResponse {
  response: string;
  model: string;
  created_at: string;
  done: boolean;
  total_duration: number;
  load_duration: number;
  prompt_eval_duration: number;
  eval_duration: number;
  eval_count: number;
}

export class OllamaClient extends EventEmitter {
  private client: AxiosInstance;
  private baseUrl: string;
  private model: string;
  private temperature: number;
  private topK: number;
  private topP: number;

  constructor(config: OllamaConfig = {}) {
    super();
    this.baseUrl = config.baseUrl || "http://localhost:11434";
    this.model = config.model || "llama2";
    this.temperature = config.temperature ?? 0.7;
    this.topK = config.topK ?? 40;
    this.topP = config.topP ?? 0.9;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: config.timeout || 30000,
    });
  }

  /**
   * Health check - verify Ollama is running and model is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get("/api/tags");
      const models = response.data.models || [];
      const modelExists = models.some(
        (m: any) => m.name && m.name.startsWith(this.model)
      );
      this.emit("health:checked", {
        status: modelExists ? "healthy" : "model-missing",
        model: this.model,
        availableModels: models.map((m: any) => m.name),
      });
      return modelExists;
    } catch (error) {
      this.emit("health:error", { error: String(error) });
      return false;
    }
  }

  /**
   * Generate completion (non-streaming)
   */
  async generate(prompt: string): Promise<string> {
    try {
      const response = await this.client.post<OllamaResponse>(
        "/api/generate",
        {
          model: this.model,
          prompt,
          stream: false,
          temperature: this.temperature,
          top_k: this.topK,
          top_p: this.topP,
        }
      );
      this.emit("generate:complete", {
        model: this.model,
        promptLength: prompt.length,
        responseLength: response.data.response.length,
      });
      return response.data.response.trim();
    } catch (error) {
      this.emit("generate:error", { error: String(error) });
      throw new Error(`Ollama generation failed: ${String(error)}`);
    }
  }

  /**
   * Streaming generation with callback
   */
  async generateStreaming(
    prompt: string,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    try {
      let fullResponse = "";
      const response = await this.client.post(
        "/api/generate",
        {
          model: this.model,
          prompt,
          stream: true,
          temperature: this.temperature,
          top_k: this.topK,
          top_p: this.topP,
        },
        {
          responseType: "stream",
        }
      );

      return new Promise((resolve, reject) => {
        response.data.on("data", (chunk: Buffer) => {
          try {
            const lines = chunk.toString().split("\n").filter((l) => l);
            for (const line of lines) {
              const data = JSON.parse(line);
              if (data.response) {
                fullResponse += data.response;
                onChunk(data.response);
              }
            }
          } catch (e) {
            // Silently ignore parse errors
          }
        });

        response.data.on("end", () => {
          this.emit("generate:streaming-complete", {
            model: this.model,
            totalLength: fullResponse.length,
          });
          resolve(fullResponse.trim());
        });

        response.data.on("error", (error: Error) => {
          reject(error);
        });
      });
    } catch (error) {
      this.emit("generate:streaming-error", { error: String(error) });
      throw new Error(`Ollama streaming failed: ${String(error)}`);
    }
  }

  /**
   * JSON mode - force structured output
   */
  async generateJSON<T>(prompt: string): Promise<T> {
    const jsonPrompt = `${prompt}\n\nRespond ONLY with valid JSON, no other text.`;
    const response = await this.generate(jsonPrompt);

    try {
      // Extract JSON from response (may be wrapped in markdown or other text)
      const jsonMatch =
        response.match(/\{[\s\S]*\}/) || response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      return JSON.parse(jsonMatch[0]) as T;
    } catch (error) {
      this.emit("generate:json-error", {
        error: String(error),
        rawResponse: response,
      });
      throw new Error(`Failed to parse JSON from Ollama: ${String(error)}`);
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.get("/api/tags");
      return (response.data.models || []).map((m: any) => m.name);
    } catch (error) {
      this.emit("models:list-error", { error: String(error) });
      return [];
    }
  }

  /**
   * Pull a model (download from ollama.ai registry)
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      const response = await this.client.post(
        "/api/pull",
        { name: modelName },
        { responseType: "stream" }
      );

      return new Promise((resolve, reject) => {
        response.data.on("data", (chunk: Buffer) => {
          const lines = chunk.toString().split("\n").filter((l) => l);
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              this.emit("model:pull-progress", {
                status: data.status,
                digest: data.digest,
                total: data.total,
                completed: data.completed,
              });
            } catch (e) {
              // Ignore parse errors
            }
          }
        });

        response.data.on("end", () => {
          this.emit("model:pulled", { model: modelName });
          resolve();
        });

        response.data.on("error", reject);
      });
    } catch (error) {
      this.emit("model:pull-error", { error: String(error) });
      throw new Error(`Failed to pull model: ${String(error)}`);
    }
  }

  /**
   * Switch active model
   */
  setModel(modelName: string): void {
    this.model = modelName;
    this.emit("model:switched", { model: modelName });
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }
}
