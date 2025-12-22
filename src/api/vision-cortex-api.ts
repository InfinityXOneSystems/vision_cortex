/**
 * 🧠 VISION CORTEX INTELLIGENCE API
 * 
 * Core API endpoints for Hostinger Horizons AI frontend integration
 * Provides multi-model reasoning, autonomous execution, and memory retrieval
 * 
 * @author Infinity X One Systems
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express';
import { VisionCortexCore } from '../core/vision-cortex-core';
import { AutonomousReasoning } from '../reasoning/autonomous-reasoning';
import { VectorMemoryService } from '../memory/vector-memory-service';
import { AutonomousExecutor } from '../autonomous/autonomous-executor';
import { AuthenticationMiddleware } from '../middleware/auth-middleware';
import { RateLimitMiddleware } from '../middleware/rate-limit-middleware';
import { ValidationMiddleware } from '../middleware/validation-middleware';
import { z } from 'zod';

export class VisionCortexAPI {
  private router: Router;
  private visionCortex: VisionCortexCore;
  private reasoning: AutonomousReasoning;
  private memory: VectorMemoryService;
  private executor: AutonomousExecutor;

  constructor() {
    this.router = Router();
    this.visionCortex = new VisionCortexCore();
    this.reasoning = new AutonomousReasoning();
    this.memory = new VectorMemoryService();
    this.executor = new AutonomousExecutor();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Apply authentication middleware
    this.router.use(AuthenticationMiddleware.validate);
    
    // Apply rate limiting
    this.router.use(RateLimitMiddleware.create({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // per window
      message: 'Too many requests to Vision Cortex API'
    }));
  }

  private setupRoutes(): void {
    // Multi-model reasoning with routing
    this.router.post('/chat', 
      ValidationMiddleware.validate(this.getChatSchema()),
      this.handleChat.bind(this)
    );

    // Autonomous reasoning execution
    this.router.post('/reasoning/trace',
      ValidationMiddleware.validate(this.getReasoningSchema()),
      this.handleReasoningTrace.bind(this)
    );

    // Persistent vector memory retrieval
    this.router.get('/memory/query',
      ValidationMiddleware.validate(this.getMemoryQuerySchema()),
      this.handleMemoryQuery.bind(this)
    );

    // Long-horizon planning & execution
    this.router.post('/autonomous/execute',
      ValidationMiddleware.validate(this.getAutonomousExecuteSchema()),
      this.handleAutonomousExecute.bind(this)
    );

    // Health check endpoint
    this.router.get('/health', this.handleHealthCheck.bind(this));

    // System status endpoint
    this.router.get('/status', this.handleSystemStatus.bind(this));
  }

  /**
   * POST /api/vision-cortex/chat — Multi-model reasoning with routing
   */
  private async handleChat(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { 
        message, 
        context = {}, 
        model_preference = 'auto', 
        reasoning_mode = 'balanced',
        session_id,
        temperature = 0.7,
        max_tokens = 2000
      } = req.body;

      console.log(`🧠 Vision Cortex Chat: ${message.substring(0, 100)}...`);

      // Multi-model reasoning with automatic routing
      const response = await this.visionCortex.processChat({
        message,
        context,
        preferences: {
          model: model_preference,
          reasoning: reasoning_mode,
          temperature,
          maxTokens: max_tokens
        },
        sessionId: session_id,
        metadata: {
          userAgent: req.headers['user-agent'],
          source: 'hostinger-frontend',
          timestamp: new Date().toISOString()
        }
      });

      const processingTime = Date.now() - startTime;

      res.json({
        success: true,
        response: {
          message: response.message,
          reasoning: response.reasoning,
          confidence: response.confidence,
          model_used: response.modelUsed,
          processing_time_ms: processingTime,
          session_id: response.sessionId,
          context_updated: response.contextUpdated,
          memory_stored: response.memoryStored
        },
        metadata: {
          timestamp: new Date().toISOString(),
          api_version: '1.0.0',
          processing_time_ms: processingTime
        }
      });

    } catch (error) {
      console.error('❌ Vision Cortex Chat Error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CHAT_PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        }
      });
    }
  }

  /**
   * POST /api/vision-cortex/reasoning/trace — Autonomous reasoning execution
   */
  private async handleReasoningTrace(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const {
        prompt,
        reasoning_depth = 'deep',
        trace_execution = true,
        context = {},
        session_id
      } = req.body;

      console.log(`🔄 Autonomous Reasoning: ${prompt.substring(0, 100)}...`);

      // Execute autonomous reasoning with full trace
      const reasoning = await this.reasoning.executeWithTrace({
        prompt,
        depth: reasoning_depth,
        traceExecution: trace_execution,
        context,
        sessionId: session_id
      });

      const processingTime = Date.now() - startTime;

      res.json({
        success: true,
        reasoning: {
          result: reasoning.result,
          trace: reasoning.trace,
          steps: reasoning.steps,
          confidence: reasoning.confidence,
          execution_path: reasoning.executionPath,
          decision_points: reasoning.decisionPoints,
          processing_time_ms: processingTime
        },
        metadata: {
          session_id: reasoning.sessionId,
          reasoning_depth,
          steps_executed: reasoning.steps.length,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Reasoning Trace Error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REASONING_TRACE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        }
      });
    }
  }

  /**
   * GET /api/vision-cortex/memory/query — Persistent vector memory retrieval
   */
  private async handleMemoryQuery(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const {
        query,
        limit = 10,
        similarity_threshold = 0.7,
        memory_types = ['conversation', 'knowledge', 'reasoning'],
        session_id,
        include_metadata = true
      } = req.query;

      console.log(`🧠 Memory Query: ${query}`);

      // Query vector memory with semantic search
      const results = await this.memory.queryMemory({
        query: query as string,
        limit: Number(limit),
        similarityThreshold: Number(similarity_threshold),
        memoryTypes: Array.isArray(memory_types) ? memory_types as string[] : [memory_types as string],
        sessionId: session_id as string,
        includeMetadata: include_metadata === 'true'
      });

      const processingTime = Date.now() - startTime;

      res.json({
        success: true,
        results: {
          memories: results.memories,
          total_found: results.totalFound,
          similarity_scores: results.similarityScores,
          memory_types_searched: results.memoryTypesSearched,
          processing_time_ms: processingTime
        },
        query_info: {
          query: query as string,
          similarity_threshold: Number(similarity_threshold),
          limit: Number(limit),
          session_id: session_id as string
        },
        metadata: {
          timestamp: new Date().toISOString(),
          memory_index_version: results.indexVersion
        }
      });

    } catch (error) {
      console.error('❌ Memory Query Error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'MEMORY_QUERY_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        }
      });
    }
  }

  /**
   * POST /api/vision-cortex/autonomous/execute — Long-horizon planning & execution
   */
  private async handleAutonomousExecute(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const {
        objective,
        constraints = [],
        execution_mode = 'careful',
        max_steps = 50,
        context = {},
        session_id,
        callbacks = {}
      } = req.body;

      console.log(`🚀 Autonomous Execute: ${objective}`);

      // Execute long-horizon autonomous planning
      const execution = await this.executor.executeLongHorizon({
        objective,
        constraints,
        executionMode: execution_mode,
        maxSteps: max_steps,
        context,
        sessionId: session_id,
        callbacks: {
          onStepComplete: callbacks.step_complete ? 
            (step: any) => this.notifyHostinger('step_complete', step, session_id) : undefined,
          onPlanUpdate: callbacks.plan_update ?
            (plan: any) => this.notifyHostinger('plan_update', plan, session_id) : undefined,
          onError: callbacks.error ?
            (error: any) => this.notifyHostinger('error', error, session_id) : undefined
        }
      });

      const processingTime = Date.now() - startTime;

      res.json({
        success: true,
        execution: {
          result: execution.result,
          plan: execution.plan,
          steps_executed: execution.stepsExecuted,
          steps_remaining: execution.stepsRemaining,
          execution_status: execution.status,
          confidence: execution.confidence,
          processing_time_ms: processingTime
        },
        objective_info: {
          objective,
          execution_mode,
          max_steps,
          constraints_applied: constraints.length
        },
        metadata: {
          session_id: execution.sessionId,
          timestamp: new Date().toISOString(),
          execution_id: execution.executionId
        }
      });

    } catch (error) {
      console.error('❌ Autonomous Execute Error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTONOMOUS_EXECUTE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        }
      });
    }
  }

  /**
   * Health check endpoint
   */
  private async handleHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.visionCortex.getHealthStatus();
      
      res.json({
        success: true,
        status: 'healthy',
        services: health.services,
        uptime: health.uptime,
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * System status endpoint
   */
  private async handleSystemStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await this.visionCortex.getSystemStatus();
      
      res.json({
        success: true,
        system: {
          vision_cortex: status.visionCortex,
          reasoning: status.reasoning,
          memory: status.memory,
          autonomous: status.autonomous
        },
        performance: status.performance,
        resources: status.resources,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Notify Hostinger frontend about execution updates
   */
  private async notifyHostinger(event: string, data: any, sessionId?: string): Promise<void> {
    try {
      // Implementation would depend on Hostinger's webhook/callback system
      console.log(`📡 Hostinger Notification: ${event} for session ${sessionId}`);
      
      // Example: Send to Hostinger webhook if configured
      if (process.env.HOSTINGER_WEBHOOK_URL) {
        // await axios.post(process.env.HOSTINGER_WEBHOOK_URL, { event, data, sessionId });
      }
    } catch (error) {
      console.warn('⚠️ Failed to notify Hostinger:', error);
    }
  }

  // ============================================================================
  // VALIDATION SCHEMAS
  // ============================================================================

  private getChatSchema() {
    return z.object({
      message: z.string().min(1).max(10000),
      context: z.object({}).optional(),
      model_preference: z.enum(['auto', 'gpt-4', 'claude', 'gemini', 'vertex']).optional(),
      reasoning_mode: z.enum(['fast', 'balanced', 'deep', 'creative']).optional(),
      session_id: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      max_tokens: z.number().min(1).max(8000).optional()
    });
  }

  private getReasoningSchema() {
    return z.object({
      prompt: z.string().min(1).max(5000),
      reasoning_depth: z.enum(['shallow', 'balanced', 'deep', 'exhaustive']).optional(),
      trace_execution: z.boolean().optional(),
      context: z.object({}).optional(),
      session_id: z.string().optional()
    });
  }

  private getMemoryQuerySchema() {
    return z.object({
      query: z.string().min(1).max(1000),
      limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
      similarity_threshold: z.string().transform(Number).pipe(z.number().min(0).max(1)).optional(),
      memory_types: z.union([z.string(), z.array(z.string())]).optional(),
      session_id: z.string().optional(),
      include_metadata: z.enum(['true', 'false']).optional()
    });
  }

  private getAutonomousExecuteSchema() {
    return z.object({
      objective: z.string().min(1).max(2000),
      constraints: z.array(z.string()).optional(),
      execution_mode: z.enum(['careful', 'balanced', 'aggressive']).optional(),
      max_steps: z.number().min(1).max(200).optional(),
      context: z.object({}).optional(),
      session_id: z.string().optional(),
      callbacks: z.object({
        step_complete: z.boolean().optional(),
        plan_update: z.boolean().optional(),
        error: z.boolean().optional()
      }).optional()
    });
  }

  /**
   * Get the configured router
   */
  getRouter(): Router {
    return this.router;
  }
}

export default VisionCortexAPI;