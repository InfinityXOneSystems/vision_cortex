/**
 * Vision Cortex Intelligence Client SDK
 *
 * TypeScript client for querying the centralized Vision Cortex intelligence hub
 * Use this in Foundation, Aura, Real Estate, and all other systems
 */

import type {
  TimeHorizon,
  Signal,
  Prediction,
  Capability,
  EvolutionResult,
  ValidationCriteria,
  ValidationResult,
  Task,
  Constraints,
  OptimizedTask,
  Context,
  Goal,
  Strategy,
} from "./intelligence-api";

export interface IntelligenceClientConfig {
  baseUrl: string;
  apiKey: string;
  systemId: string;
  timeout?: number;
  enableWebSocket?: boolean;
}

export class VisionCortexClient {
  private config: IntelligenceClientConfig;
  private ws: WebSocket | null = null;
  private wsReconnectAttempts = 0;
  private wsMaxReconnectAttempts = 5;

  constructor(config: IntelligenceClientConfig) {
    this.config = {
      timeout: 30000, // 30s default
      enableWebSocket: false,
      ...config,
    };

    if (this.config.enableWebSocket) {
      this.connectWebSocket();
    }
  }

  // ============================================================================
  // INTELLIGENCE METHODS
  // ============================================================================

  /**
   * Get multi-horizon predictions
   */
  async predict(horizon: TimeHorizon, signals: Signal[], context?: any): Promise<Prediction> {
    return this.request<Prediction>("/api/predict", {
      horizon,
      signals,
      context,
    });
  }

  /**
   * Evolve capabilities through recursive self-improvement
   */
  async evolve(capabilities: Capability[], context?: any): Promise<EvolutionResult> {
    return this.request<EvolutionResult>("/api/evolve", {
      capabilities,
      context,
    });
  }

  /**
   * Validate outputs with multi-perspective verification
   */
  async validate(
    output: any,
    criteria: ValidationCriteria,
    context?: any
  ): Promise<ValidationResult> {
    return this.request<ValidationResult>("/api/validate", {
      output,
      criteria,
      context,
    });
  }

  /**
   * Optimize tasks for maximum performance
   */
  async optimize(task: Task, constraints: Constraints, context?: any): Promise<OptimizedTask> {
    return this.request<OptimizedTask>("/api/optimize", {
      task,
      constraints,
      context,
    });
  }

  /**
   * Generate strategic reasoning for complex goals
   */
  async reason(context: Context, goal: Goal, additionalContext?: any): Promise<Strategy> {
    return this.request<Strategy>("/api/reason", {
      context,
      goal,
      additionalContext,
    });
  }

  /**
   * Batch multiple intelligence queries for efficiency
   */
  async batch(
    queries: Array<{
      type: "predict" | "evolve" | "validate" | "optimize" | "reason";
      payload: any;
    }>
  ): Promise<any[]> {
    const response = await this.request<{ results: any[] }>("/api/batch", { queries });
    return response.results;
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  /**
   * Quick prediction for common horizons
   */
  async predictNearTerm(signals: Signal[]): Promise<Prediction> {
    return this.predict("24h", signals);
  }

  async predictMidTerm(signals: Signal[]): Promise<Prediction> {
    return this.predict("1w", signals);
  }

  async predictLongTerm(signals: Signal[]): Promise<Prediction> {
    return this.predict("1y", signals);
  }

  /**
   * Quick validation with standard criteria
   */
  async quickValidate(output: any): Promise<ValidationResult> {
    return this.validate(output, {
      type: "output",
      rules: [
        {
          name: "completeness",
          condition: (v) => v !== null && v !== undefined,
          severity: "error",
        },
      ],
      perspectives: ["quality", "correctness"],
    });
  }

  /**
   * Quick optimization for common tasks
   */
  async quickOptimize(taskType: string, payload: any): Promise<OptimizedTask> {
    return this.optimize(
      {
        id: `task-${Date.now()}`,
        type: taskType,
        payload,
        priority: 1,
      },
      {
        maxDuration: 60000, // 1 minute
      }
    );
  }

  // ============================================================================
  // WEBSOCKET METHODS
  // ============================================================================

  /**
   * Connect to WebSocket for real-time intelligence streaming
   */
  private connectWebSocket(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = this.config.baseUrl.replace(/^http/, "ws");
    const url = `${wsUrl}?system=${this.config.systemId}&apiKey=${this.config.apiKey}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("Vision Cortex WebSocket connected");
      this.wsReconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleWebSocketMessage(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    this.ws.onerror = (error) => {
      console.error("Vision Cortex WebSocket error:", error);
    };

    this.ws.onclose = () => {
      console.log("Vision Cortex WebSocket disconnected");
      this.attemptReconnect();
    };
  }

  private handleWebSocketMessage(message: any): void {
    // Emit events for real-time updates
    // Systems can listen to these events
    console.log("WebSocket message:", message.type, message.data || message.result);
  }

  private attemptReconnect(): void {
    if (this.wsReconnectAttempts >= this.wsMaxReconnectAttempts) {
      console.error("Max WebSocket reconnect attempts reached");
      return;
    }

    this.wsReconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.wsReconnectAttempts), 30000);

    setTimeout(() => {
      console.log(`Attempting WebSocket reconnect (${this.wsReconnectAttempts}/${this.wsMaxReconnectAttempts})`);
      this.connectWebSocket();
    }, delay);
  }

  /**
   * Send query via WebSocket (faster for frequent queries)
   */
  async sendWebSocketQuery(type: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error("WebSocket not connected"));
      }

      const requestId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const handleMessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "result" && message.requestId === requestId) {
            this.ws!.removeEventListener("message", handleMessage);
            resolve(message.result);
          } else if (message.type === "error" && message.requestId === requestId) {
            this.ws!.removeEventListener("message", handleMessage);
            reject(new Error(message.error));
          }
        } catch (error) {
          reject(error);
        }
      };

      this.ws.addEventListener("message", handleMessage);

      this.ws.send(JSON.stringify({ type, payload, requestId }));

      // Timeout
      setTimeout(() => {
        this.ws!.removeEventListener("message", handleMessage);
        reject(new Error("WebSocket query timeout"));
      }, this.config.timeout);
    });
  }

  /**
   * Close WebSocket connection
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async request<T>(endpoint: string, body: any): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "x-system-id": this.config.systemId,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; uptime: number }> {
    const response = await fetch(`${this.config.baseUrl}/health`);
    return response.json();
  }

  /**
   * Get intelligence API metrics
   */
  async getMetrics(): Promise<any> {
    const response = await fetch(`${this.config.baseUrl}/api/metrics`, {
      headers: {
        "x-api-key": this.config.apiKey,
        "x-system-id": this.config.systemId,
      },
    });
    return response.json();
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create Vision Cortex client from environment variables
 */
export function createVisionCortexClient(systemId: string): VisionCortexClient {
  return new VisionCortexClient({
    baseUrl: process.env.VISION_CORTEX_URL || "http://localhost:4000",
    apiKey: process.env.VISION_CORTEX_API_KEY || "",
    systemId,
    timeout: 30000,
    enableWebSocket: process.env.VISION_CORTEX_WS === "true",
  });
}

/**
 * Singleton instances for common systems
 */
export const foundationIntelligence = createVisionCortexClient("foundation");
export const auraIntelligence = createVisionCortexClient("aura");
export const realEstateIntelligence = createVisionCortexClient("real-estate");
export const agentsIntelligence = createVisionCortexClient("agents");

// Export types
export type {
  TimeHorizon,
  Signal,
  Prediction,
  Capability,
  EvolutionResult,
  ValidationCriteria,
  ValidationResult,
  Task,
  Constraints,
  OptimizedTask,
  Context,
  Goal,
  Strategy,
};
