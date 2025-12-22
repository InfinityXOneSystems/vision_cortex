/**
 * Vision Cortex Core - Central orchestration system
 */

import { MemorySystem } from '../memory/memory-system';
import { MultiModelOrchestrator } from '../models/multi-model-orchestrator';
import { ReasoningEngine } from '../reasoning/reasoning-engine';
import { AutonomousExecutor } from '../autonomous/autonomous-executor';
import { Logger } from 'winston';
import { logger } from '../utils/logger';

export interface VisionCortexConfig {
  memory: {
    vectorDimensions: number;
    maxContextLength: number;
    persistencePath?: string;
  };
  models: {
    primary: string;
    fallback: string[];
    apiKeys: Record<string, string>;
  };
  reasoning: {
    maxDepth: number;
    timeout: number;
  };
  autonomous: {
    enabled: boolean;
    maxExecutionTime: number;
  };
}

export interface ProcessingContext {
  sessionId: string;
  userId?: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface VisionCortexResponse {
  success: boolean;
  data?: any;
  reasoning?: string[];
  confidence?: number;
  executionTime: number;
  error?: string;
}

export class VisionCortexCore {
  private memory: MemorySystem;
  private models: MultiModelOrchestrator;
  private reasoning: ReasoningEngine;
  private autonomous: AutonomousExecutor;
  private logger: Logger;
  private config: VisionCortexConfig;

  constructor(config: VisionCortexConfig) {
    this.config = config;
    this.logger = logger.child({ component: 'VisionCortexCore' });
    
    this.memory = new MemorySystem(config.memory);
    this.models = new MultiModelOrchestrator(config.models);
    this.reasoning = new ReasoningEngine(config.reasoning);
    this.autonomous = new AutonomousExecutor(config.autonomous);
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Vision Cortex Core...');
    
    try {
      await this.memory.initialize();
      await this.models.initialize();
      await this.reasoning.initialize();
      await this.autonomous.initialize();
      
      this.logger.info('Vision Cortex Core initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Vision Cortex Core', error);
      throw error;
    }
  }

  async processRequest(
    input: string,
    context: ProcessingContext
  ): Promise<VisionCortexResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Processing request', { sessionId: context.sessionId });
      
      // 1. Memory retrieval
      const relevantMemories = await this.memory.search(input, {
        limit: 10,
        threshold: 0.7
      });
      
      // 2. Reasoning phase
      const reasoningContext = {
        input,
        memories: relevantMemories,
        ...context
      };
      
      const reasoning = await this.reasoning.process(reasoningContext);
      
      // 3. Model orchestration
      const modelResponse = await this.models.generate({
        input,
        reasoning: reasoning.steps,
        context: reasoningContext
      });
      
      // 4. Memory storage
      await this.memory.store({
        content: input,
        response: modelResponse.content,
        reasoning: reasoning.steps,
        timestamp: new Date(),
        sessionId: context.sessionId
      });
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        data: modelResponse.content,
        reasoning: reasoning.steps,
        confidence: modelResponse.confidence,
        executionTime
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Error processing request', { error, sessionId: context.sessionId });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime
      };
    }
  }

  async executeAutonomous(
    task: string,
    context: ProcessingContext
  ): Promise<VisionCortexResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.config.autonomous.enabled) {
        throw new Error('Autonomous execution is disabled');
      }
      
      const result = await this.autonomous.execute(task, context);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        data: result.output,
        reasoning: result.steps,
        executionTime
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Error in autonomous execution', { error, task });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Autonomous execution failed',
        executionTime
      };
    }
  }

  async getSystemStatus() {
    return {
      memory: await this.memory.getStatus(),
      models: await this.models.getStatus(),
      reasoning: await this.reasoning.getStatus(),
      autonomous: await this.autonomous.getStatus()
    };
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Vision Cortex Core...');
    
    await Promise.allSettled([
      this.memory.shutdown(),
      this.models.shutdown(),
      this.reasoning.shutdown(),
      this.autonomous.shutdown()
    ]);
    
    this.logger.info('Vision Cortex Core shutdown complete');
  }
}