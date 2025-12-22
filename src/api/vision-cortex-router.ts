/**
 * 🌐 VISION CORTEX API ROUTER
 * 
 * Hostinger Horizons AI Frontend Integration Layer
 * Implements exact API endpoints for seamless integration
 * 
 * @author Infinity X One Systems
 * @version 1.0.0
 */

import { Router } from 'express';
import { Request, Response } from 'express';
import { VisionCortexCore } from '../core/vision-cortex-core';
import { MemorySystem } from '../memory/memory-system';
import { AutonomousExecutor } from '../autonomous/autonomous-executor';
import { ReasoningEngine } from '../reasoning/reasoning-engine';
import { MultiModelOrchestrator } from '../models/multi-model-orchestrator';

export interface ChatRequest {
  message: string;
  context?: any;
  model?: 'vertex-ai' | 'claude' | 'gpt-4' | 'gemini' | 'auto';
  stream?: boolean;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface ChatResponse {
  response: string;
  model: string;
  reasoning?: string;
  confidence: number;
  sessionId: string;
  metadata: {
    tokens: number;
    latency: number;
    model_routing: string;
    timestamp: string;
  };
}

export interface ReasoningTraceRequest {
  task: string;
  context?: any;
  depth?: 'shallow' | 'medium' | 'deep';
  includeSteps?: boolean;
}

export interface MemoryQueryRequest {
  query: string;
  limit?: number;
  filters?: Record<string, any>;
  similarityThreshold?: number;
}

export interface AutonomousExecuteRequest {
  goal: string;
  constraints?: string[];
  maxSteps?: number;
  timeLimit?: number;
  context?: any;
}

export class VisionCortexAPIRouter {
  private router: Router;
  private visionCore: VisionCortexCore;
  private memorySystem: MemorySystem;
  private autonomousExecutor: AutonomousExecutor;
  private reasoningEngine: ReasoningEngine;
  private modelOrchestrator: MultiModelOrchestrator;

  constructor() {
    this.router = Router();
    this.initializeComponents();
    this.setupRoutes();
  }

  private async initializeComponents(): Promise<void> {
    this.visionCore = new VisionCortexCore();
    this.memorySystem = new MemorySystem();
    this.autonomousExecutor = new AutonomousExecutor();
    this.reasoningEngine = new ReasoningEngine();
    this.modelOrchestrator = new MultiModelOrchestrator();

    await Promise.all([
      this.visionCore.initialize(),
      this.memorySystem.initialize(),
      this.autonomousExecutor.initialize(),
      this.reasoningEngine.initialize(),
      this.modelOrchestrator.initialize()
    ]);
  }

  private setupRoutes(): void {
    // HOSTINGER HORIZONS AI INTEGRATION ENDPOINTS

    /**
     * POST /api/vision-cortex/chat
     * Multi-model reasoning with routing
     */
    this.router.post('/chat', this.handleChat.bind(this));

    /**
     * POST /api/vision-cortex/reasoning/trace
     * Autonomous reasoning execution with full trace
     */
    this.router.post('/reasoning/trace', this.handleReasoningTrace.bind(this));

    /**
     * GET /api/vision-cortex/memory/query
     * Persistent vector memory retrieval
     */
    this.router.get('/memory/query', this.handleMemoryQuery.bind(this));

    /**
     * POST /api/vision-cortex/autonomous/execute
     * Long-horizon planning & execution
     */
    this.router.post('/autonomous/execute', this.handleAutonomousExecute.bind(this));

    // Additional utility endpoints for Hostinger integration
    this.router.get('/health', this.handleHealth.bind(this));
    this.router.get('/capabilities', this.handleCapabilities.bind(this));
    this.router.post('/session/create', this.handleSessionCreate.bind(this));
    this.router.get('/session/:sessionId', this.handleSessionGet.bind(this));
  }

  /**
   * POST /api/vision-cortex/chat
   * Multi-model reasoning with intelligent routing
   */
  private async handleChat(req: Request, res: Response): Promise<void> {
    try {
      const chatRequest: ChatRequest = req.body;
      
      // Validate request
      if (!chatRequest.message) {
        res.status(400).json({
          error: 'Missing required field: message',
          code: 'INVALID_REQUEST'
        });
        return;
      }

      console.log(`🧠 Vision Cortex Chat - Model: ${chatRequest.model || 'auto'}`);
      
      // Route to appropriate model based on request or auto-detection
      const selectedModel = chatRequest.model || await this.modelOrchestrator.selectOptimalModel(chatRequest.message);
      
      // Process through Vision Cortex with multi-model reasoning
      const startTime = Date.now();
      const response = await this.visionCore.processChat({
        message: chatRequest.message,
        context: chatRequest.context,
        model: selectedModel,
        sessionId: chatRequest.sessionId,
        metadata: chatRequest.metadata
      });

      const latency = Date.now() - startTime;

      // Store in persistent memory
      await this.memorySystem.storeInteraction({
        query: chatRequest.message,
        response: response.content,
        model: selectedModel,
        sessionId: response.sessionId,
        timestamp: new Date(),
        metadata: { latency, confidence: response.confidence }
      });

      const chatResponse: ChatResponse = {
        response: response.content,
        model: selectedModel,
        reasoning: response.reasoning,
        confidence: response.confidence,
        sessionId: response.sessionId,
        metadata: {
          tokens: response.tokens || 0,
          latency,
          model_routing: this.modelOrchestrator.getRoutingReason(),
          timestamp: new Date().toISOString()
        }
      };

      // Handle streaming if requested
      if (chatRequest.stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Stream the response
        const chunks = this.chunkResponse(chatResponse.response);
        for (const chunk of chunks) {
          res.write(`data: ${JSON.stringify({ chunk, ...chatResponse })}\n\n`);
          await this.delay(50); // Natural typing speed
        }
        res.write(`data: [DONE]\n\n`);
        res.end();
      } else {
        res.json(chatResponse);
      }

    } catch (error) {
      console.error('❌ Vision Cortex Chat Error:', error);
      res.status(500).json({
        error: 'Internal server error during chat processing',
        code: 'CHAT_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/vision-cortex/reasoning/trace
   * Autonomous reasoning execution with full trace
   */
  private async handleReasoningTrace(req: Request, res: Response): Promise<void> {
    try {
      const traceRequest: ReasoningTraceRequest = req.body;
      
      if (!traceRequest.task) {
        res.status(400).json({
          error: 'Missing required field: task',
          code: 'INVALID_REQUEST'
        });
        return;
      }

      console.log(`🔍 Reasoning Trace - Depth: ${traceRequest.depth || 'medium'}`);
      
      const startTime = Date.now();
      const reasoningResult = await this.reasoningEngine.executeWithTrace({
        task: traceRequest.task,
        context: traceRequest.context,
        depth: traceRequest.depth || 'medium',
        includeSteps: traceRequest.includeSteps !== false
      });

      const duration = Date.now() - startTime;

      // Store reasoning trace in memory
      await this.memorySystem.storeReasoningTrace({
        task: traceRequest.task,
        trace: reasoningResult,
        duration,
        timestamp: new Date()
      });

      res.json({
        task: traceRequest.task,
        reasoning: {
          conclusion: reasoningResult.conclusion,
          confidence: reasoningResult.confidence,
          steps: traceRequest.includeSteps ? reasoningResult.steps : undefined,
          chain_of_thought: reasoningResult.chainOfThought,
          evidence: reasoningResult.evidence
        },
        metadata: {
          duration,
          depth: traceRequest.depth || 'medium',
          step_count: reasoningResult.steps?.length || 0,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Reasoning Trace Error:', error);
      res.status(500).json({
        error: 'Internal server error during reasoning trace',
        code: 'REASONING_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/vision-cortex/memory/query
   * Persistent vector memory retrieval
   */
  private async handleMemoryQuery(req: Request, res: Response): Promise<void> {
    try {
      const queryRequest: MemoryQueryRequest = {
        query: req.query.q as string,
        limit: parseInt(req.query.limit as string) || 10,
        filters: req.query.filters ? JSON.parse(req.query.filters as string) : {},
        similarityThreshold: parseFloat(req.query.threshold as string) || 0.7
      };

      if (!queryRequest.query) {
        res.status(400).json({
          error: 'Missing required query parameter: q',
          code: 'INVALID_REQUEST'
        });
        return;
      }

      console.log(`🧠 Memory Query: "${queryRequest.query}"`);

      const startTime = Date.now();
      const memoryResults = await this.memorySystem.semanticSearch({
        query: queryRequest.query,
        limit: queryRequest.limit,
        filters: queryRequest.filters,
        threshold: queryRequest.similarityThreshold
      });

      const queryTime = Date.now() - startTime;

      res.json({
        query: queryRequest.query,
        results: memoryResults.map(result => ({
          content: result.content,
          metadata: result.metadata,
          similarity: result.similarity,
          timestamp: result.timestamp,
          type: result.type
        })),
        metadata: {
          total_results: memoryResults.length,
          query_time: queryTime,
          similarity_threshold: queryRequest.similarityThreshold,
          filters_applied: Object.keys(queryRequest.filters).length > 0,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Memory Query Error:', error);
      res.status(500).json({
        error: 'Internal server error during memory query',
        code: 'MEMORY_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/vision-cortex/autonomous/execute
   * Long-horizon planning & execution
   */
  private async handleAutonomousExecute(req: Request, res: Response): Promise<void> {
    try {
      const executeRequest: AutonomousExecuteRequest = req.body;
      
      if (!executeRequest.goal) {
        res.status(400).json({
          error: 'Missing required field: goal',
          code: 'INVALID_REQUEST'
        });
        return;
      }

      console.log(`🎯 Autonomous Execute: "${executeRequest.goal}"`);

      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Start autonomous execution
      const execution = await this.autonomousExecutor.execute({
        id: executionId,
        goal: executeRequest.goal,
        constraints: executeRequest.constraints || [],
        maxSteps: executeRequest.maxSteps || 50,
        timeLimit: executeRequest.timeLimit || 300000, // 5 minutes
        context: executeRequest.context
      });

      // Store execution in memory
      await this.memorySystem.storeExecution({
        executionId,
        goal: executeRequest.goal,
        result: execution,
        timestamp: new Date()
      });

      res.json({
        execution_id: executionId,
        goal: executeRequest.goal,
        status: execution.status,
        result: {
          outcome: execution.outcome,
          confidence: execution.confidence,
          steps_taken: execution.steps.length,
          final_state: execution.finalState
        },
        execution_trace: {
          steps: execution.steps.map(step => ({
            step_number: step.stepNumber,
            action: step.action,
            result: step.result,
            confidence: step.confidence,
            timestamp: step.timestamp
          })),
          total_duration: execution.totalDuration,
          constraints_violated: execution.constraintsViolated || []
        },
        metadata: {
          max_steps: executeRequest.maxSteps || 50,
          time_limit: executeRequest.timeLimit || 300000,
          constraints_count: executeRequest.constraints?.length || 0,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Autonomous Execute Error:', error);
      res.status(500).json({
        error: 'Internal server error during autonomous execution',
        code: 'EXECUTION_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Utility endpoints for Hostinger integration

  private async handleHealth(req: Request, res: Response): Promise<void> {
    const health = await this.visionCore.getSystemHealth();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {
        vision_cortex: health.visionCortex,
        memory_system: health.memory,
        autonomous_executor: health.autonomous,
        reasoning_engine: health.reasoning,
        model_orchestrator: health.models
      },
      uptime: process.uptime(),
      version: '1.0.0'
    });
  }

  private async handleCapabilities(req: Request, res: Response): Promise<void> {
    res.json({
      capabilities: [
        'multi_model_chat',
        'reasoning_trace',
        'persistent_memory',
        'autonomous_execution',
        'vector_search',
        'session_management',
        'streaming_responses'
      ],
      models: {
        available: ['vertex-ai', 'claude', 'gpt-4', 'gemini'],
        primary: 'vertex-ai',
        routing: 'automatic'
      },
      endpoints: {
        chat: '/api/vision-cortex/chat',
        reasoning: '/api/vision-cortex/reasoning/trace',
        memory: '/api/vision-cortex/memory/query',
        autonomous: '/api/vision-cortex/autonomous/execute'
      }
    });
  }

  private async handleSessionCreate(req: Request, res: Response): Promise<void> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.memorySystem.createSession(sessionId, req.body.metadata || {});
    res.json({ sessionId, created: new Date().toISOString() });
  }

  private async handleSessionGet(req: Request, res: Response): Promise<void> {
    const { sessionId } = req.params;
    const session = await this.memorySystem.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found', code: 'SESSION_NOT_FOUND' });
      return;
    }
    res.json(session);
  }

  // Helper methods

  private chunkResponse(text: string): string[] {
    const words = text.split(' ');
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const word of words) {
      if (currentChunk.length + word.length + 1 <= 50) {
        currentChunk += (currentChunk ? ' ' : '') + word;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = word;
      }
    }
    
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getRouter(): Router {
    return this.router;
  }
}

export default VisionCortexAPIRouter;