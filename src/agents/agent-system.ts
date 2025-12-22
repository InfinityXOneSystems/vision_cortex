/**
 * Vision Cortex Multi-Agent Communication System
 * 
 * Implements autonomous agents that communicate via Redis events and shared memory
 * Agents: Crawler, Ingestor, Predictor, Visionary, Strategist, Validator, Evolver, Documenter
 * 
 * Workflow: Ingest → Predict → Envision → Strategize → Validate → Evolve → Document
 */

import { EventEmitter } from "events";
import { RedisEventBus, EventChannels } from "../utils/redis-event-bus";
import { AgentMemory, AgentThought, ConversationThread } from "../vision-cortex/agent-memory";

// Export AgentThought for use by other modules
export { AgentThought };
import { RAGMemory, MemoryEntry } from "../rag-memory/memory";
import { VisionCortexOrchestrator } from "../vision-cortex/orchestrator";

export type AgentId = 
  | "crawler-agent"
  | "ingestor-agent" 
  | "predictor-agent"
  | "visionary-agent"
  | "strategist-agent"
  | "validator-agent"
  | "evolver-agent"
  | "documenter-agent";

export interface AgentConfig {
  agentId: AgentId;
  capabilities: string[];
  priority: number; // 1-10, higher = more priority in conversations
  expertise: string[];
  redisUrl?: string;
}

export interface AgentMessage {
  messageId: string;
  fromAgent: AgentId;
  toAgent: AgentId | undefined; // undefined = broadcast
  timestamp: Date;
  subject: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  threadId?: string;
  requiresResponse: boolean;
  metadata: Record<string, unknown>;
}

export interface WorkflowStage {
  stage: 'ingest' | 'predict' | 'envision' | 'strategize' | 'validate' | 'evolve' | 'document';
  data: unknown;
  timestamp: Date;
  agentId: AgentId;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  results?: unknown;
}

export interface WorkflowPipeline {
  pipelineId: string;
  stages: WorkflowStage[];
  currentStage: number;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'failed' | 'paused';
  metadata: Record<string, unknown>;
}

/**
 * Base Agent Class - All specialized agents extend this
 */
export abstract class BaseAgent extends EventEmitter {
  protected agentMemory: AgentMemory;
  protected ragMemory: RAGMemory;
  protected eventBus: RedisEventBus;
  protected conversations: Map<string, ConversationThread> = new Map();
  protected activeWorkflows: Map<string, WorkflowPipeline> = new Map();

  constructor(public config: AgentConfig) {
    super();
    
    // Initialize communication systems
    this.eventBus = new RedisEventBus({
      redis_url: config.redisUrl || process.env.REDIS_URL || "redis://localhost:6379",
      service_name: config.agentId,
    });

    this.agentMemory = new AgentMemory({
      redisUrl: config.redisUrl || process.env.REDIS_URL || "redis://localhost:6379",
    });

    this.ragMemory = new RAGMemory();
    
    this.setupEventHandlers();
  }

  /** Initialize the agent */
  async initialize(): Promise<void> {
    await this.eventBus.connect();
    await this.agentMemory.initialize();
    
    console.log(`🤖 Agent ${this.config.agentId} initialized with capabilities:`, this.config.capabilities);
    
    // Subscribe to agent communications
    await this.eventBus.subscribe(EventChannels.AGENT_COMMUNICATION, (event) => {
      this.handleIncomingMessage(event.payload as AgentMessage);
    });

    // Subscribe to workflow events
    await this.eventBus.subscribe(EventChannels.WORKFLOW_STAGE, (event) => {
      this.handleWorkflowStage(event.payload as WorkflowPipeline);
    });

    this.emit('agent:initialized', { agentId: this.config.agentId });
  }

  /** Abstract method for processing agent-specific logic */
  abstract process(data: unknown): Promise<unknown>;

  /** Abstract method for agent-specific analysis */
  abstract analyze(context: unknown): Promise<AgentThought>;

  /** Send message to another agent or broadcast */
  async sendMessage(
    content: string, 
    subject: string,
    toAgent?: AgentId,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    requiresResponse: boolean = false,
    threadId?: string
  ): Promise<string> {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const message: AgentMessage = {
      messageId,
      fromAgent: this.config.agentId,
      toAgent,
      timestamp: new Date(),
      subject,
      content,
      priority,
      requiresResponse,
      threadId,
      metadata: { capabilities: this.config.capabilities, expertise: this.config.expertise },
    };

    // Store in agent memory
    const thought: AgentThought = {
      thought_id: `thought-${messageId}`,
      agent_id: this.config.agentId,
      timestamp: new Date(),
      topic: subject,
      content: `Sent: ${content}`,
      confidence: 0.8,
      metadata: { type: 'outbound_message', toAgent, priority },
    };

    await this.agentMemory.storeThought(thought);
    
    // Publish via Redis
    await this.eventBus.publish(EventChannels.AGENT_COMMUNICATION, 'agent_message', message);

    console.log(`📤 ${this.config.agentId} → ${toAgent || 'BROADCAST'}: ${subject}`);
    return messageId;
  }

  /** Handle incoming messages from other agents */
  private async handleIncomingMessage(message: AgentMessage): Promise<void> {
    // Skip if not addressed to this agent (unless broadcast)
    if (message.toAgent && message.toAgent !== this.config.agentId) return;
    if (message.fromAgent === this.config.agentId) return; // Skip own messages

    console.log(`📥 ${this.config.agentId} received from ${message.fromAgent}: ${message.subject}`);

    // Store in memory
    const thought: AgentThought = {
      thought_id: `thought-recv-${message.messageId}`,
      agent_id: this.config.agentId,
      timestamp: new Date(),
      topic: message.subject,
      content: `Received: ${message.content}`,
      confidence: 0.8,
      metadata: { type: 'inbound_message', fromAgent: message.fromAgent, priority: message.priority },
    };

    await this.agentMemory.storeThought(thought);

    // Process message based on agent capability
    const response = await this.processMessage(message);
    
    // Send response if required
    if (message.requiresResponse && response) {
      await this.sendMessage(
        response,
        `Re: ${message.subject}`,
        message.fromAgent,
        'medium',
        false,
        message.threadId
      );
    }

    this.emit('message:received', message);
  }

  /** Process incoming message (to be overridden by specific agents) */
  protected async processMessage(message: AgentMessage): Promise<string | null> {
    // Default behavior: acknowledge receipt
    if (message.requiresResponse) {
      return `Acknowledged: ${message.subject}. Processing with ${this.config.capabilities.join(', ')}.`;
    }
    return null;
  }

  /** Handle workflow stage events */
  private async handleWorkflowStage(workflow: WorkflowPipeline): Promise<void> {
    // Check if this agent should handle this stage
    const currentStage = workflow.stages[workflow.currentStage];
    const canHandle = this.canHandleStage(currentStage.stage);

    if (canHandle && currentStage.status === 'pending') {
      console.log(`🔄 ${this.config.agentId} taking over workflow stage: ${currentStage.stage}`);
      
      // Mark stage as in-progress
      currentStage.status = 'in-progress';
      currentStage.agentId = this.config.agentId;
      
      try {
        // Process the stage
        const results = await this.process(currentStage.data);
        
        // Mark as completed
        currentStage.status = 'completed';
        currentStage.results = results;
        
        // Advance pipeline to next stage
        workflow.currentStage += 1;
        
        // Publish updated workflow
        await this.eventBus.publish(EventChannels.WORKFLOW_STAGE, 'workflow_updated', workflow);

        console.log(`✅ ${this.config.agentId} completed stage: ${currentStage.stage}`);
        
      } catch (error) {
        console.error(`❌ ${this.config.agentId} failed stage: ${currentStage.stage}`, error);
        currentStage.status = 'failed';
        workflow.status = 'failed';
        await this.eventBus.publish(EventChannels.WORKFLOW_STAGE, 'workflow_failed', workflow);
      }
    }
  }

  /** Check if agent can handle a specific workflow stage */
  protected abstract canHandleStage(stage: string): boolean;

  /** Store insight in RAG memory */
  async storeInsight(content: string, source: string, metadata: Record<string, unknown> = {}): Promise<string> {
    return await this.ragMemory.addMemory(content, source, {
      ...metadata,
      agentId: this.config.agentId,
      timestamp: new Date(),
      expertise: this.config.expertise,
    });
  }

  /** Search RAG memory for relevant insights */
  async searchInsights(query: string, limit: number = 5): Promise<MemoryEntry[]> {
    const results = await this.ragMemory.search({ query, limit });
    return results.entries;
  }

  /** Create or join a conversation thread */
  async startConversation(topic: string, participants: AgentId[]): Promise<string> {
    const threadId = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const thread: ConversationThread = {
      thread_id: threadId,
      topic,
      participants: participants,
      created_at: new Date(),
      thoughts: [],
    };

    this.conversations.set(threadId, thread);
    
    // Notify participants
    for (const participant of participants) {
      if (participant !== this.config.agentId) {
        await this.sendMessage(
          `Invited to conversation: ${topic}`,
          'Conversation Invitation',
          participant,
          'medium',
          false,
          threadId
        );
      }
    }

    return threadId;
  }

  /** Setup event handlers */
  private setupEventHandlers(): void {
    this.on('agent:initialized', () => {
      console.log(`✅ Agent ${this.config.agentId} ready for communication`);
    });

    this.on('message:received', (message: AgentMessage) => {
      // Emit to specific handlers based on message type
      this.emit(`message:${message.subject.toLowerCase().replace(/\s+/g, '_')}`, message);
    });
  }

  /** Shutdown agent gracefully */
  async shutdown(): Promise<void> {
    console.log(`🔄 Shutting down agent ${this.config.agentId}...`);
    
    // Close Redis connections
    await this.eventBus.disconnect();
    
    this.emit('agent:shutdown', { agentId: this.config.agentId });
    console.log(`✅ Agent ${this.config.agentId} shutdown complete`);
  }
}

/**
 * Multi-Agent System Coordinator
 * Manages agent lifecycle, workflows, and inter-agent communication
 */
export class MultiAgentSystem extends EventEmitter {
  private agents: Map<AgentId, BaseAgent> = new Map();
  private workflows: Map<string, WorkflowPipeline> = new Map();
  private eventBus: RedisEventBus;

  constructor(private config: { redisUrl?: string } = {}) {
    super();
    
    this.eventBus = new RedisEventBus({
      redis_url: config.redisUrl || process.env.REDIS_URL || "redis://localhost:6379",
      service_name: "multi-agent-system",
    } as any);
  }

  /** Initialize the multi-agent system */
  async initialize(): Promise<void> {
    await this.eventBus.connect();
    console.log("🚀 Multi-Agent System initialized");
  }

  /** Register an agent with the system */
  async registerAgent(agent: BaseAgent): Promise<void> {
    await agent.initialize();
    this.agents.set(agent.config.agentId, agent);
    
    console.log(`📋 Registered agent: ${agent.config.agentId}`);
    this.emit('agent:registered', agent.config.agentId);
  }

  /** Start a new workflow pipeline */
  async startWorkflow(
    pipelineId: string,
    initialData: unknown,
    metadata: Record<string, unknown> = {}
  ): Promise<string> {
    const pipeline: WorkflowPipeline = {
      pipelineId,
      stages: [
        { stage: 'ingest', data: initialData, timestamp: new Date(), agentId: 'ingestor-agent', status: 'pending' },
        { stage: 'predict', data: null, timestamp: new Date(), agentId: 'predictor-agent', status: 'pending' },
        { stage: 'envision', data: null, timestamp: new Date(), agentId: 'visionary-agent', status: 'pending' },
        { stage: 'strategize', data: null, timestamp: new Date(), agentId: 'strategist-agent', status: 'pending' },
        { stage: 'validate', data: null, timestamp: new Date(), agentId: 'validator-agent', status: 'pending' },
        { stage: 'evolve', data: null, timestamp: new Date(), agentId: 'evolver-agent', status: 'pending' },
        { stage: 'document', data: null, timestamp: new Date(), agentId: 'documenter-agent', status: 'pending' },
      ],
      currentStage: 0,
      startTime: new Date(),
      status: 'active',
      metadata,
    };

    this.workflows.set(pipelineId, pipeline);
    
    // Start the pipeline by publishing to Redis
    await this.eventBus.publish(EventChannels.WORKFLOW_STAGE, 'workflow_started', pipeline);
    
    console.log(`🚀 Started workflow pipeline: ${pipelineId}`);
    return pipelineId;
  }

  /** Get workflow status */
  getWorkflowStatus(pipelineId: string): WorkflowPipeline | undefined {
    return this.workflows.get(pipelineId);
  }

  /** Broadcast message to all agents */
  async broadcastMessage(
    content: string,
    subject: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    fromAgent: AgentId = 'multi-agent-system' as AgentId
  ): Promise<void> {
    const message: AgentMessage = {
      messageId: `broadcast-${Date.now()}`,
      fromAgent,
      toAgent: undefined,
      timestamp: new Date(),
      subject,
      content,
      priority,
      requiresResponse: false,
      threadId: undefined,
      metadata: { type: 'system_broadcast' },
    };

    await this.eventBus.publish(EventChannels.AGENT_COMMUNICATION, 'broadcast_message', message);
    console.log(`📢 System broadcast: ${subject}`);
  }

  /** Get active agents */
  getActiveAgents(): AgentId[] {
    return Array.from(this.agents.keys());
  }

  /** Shutdown all agents */
  async shutdown(): Promise<void> {
    console.log("🔄 Shutting down Multi-Agent System...");
    
    // Shutdown all agents
    for (const agent of this.agents.values()) {
      await agent.shutdown();
    }
    
    // Close Redis connection
    await this.eventBus.disconnect();
    
    console.log("✅ Multi-Agent System shutdown complete");
  }
}