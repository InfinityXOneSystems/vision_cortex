/**
 * Vision Cortex Agent System Activator
 * 
 * Starts all 8 specialized agents and begins the intelligence workflow:
 * Crawl → Ingest → Predict → Envision → Strategize → Validate → Evolve → Document
 */

import { 
  CrawlerAgent, 
  IngestorAgent, 
  PredictorAgent, 
  VisionaryAgent, 
  StrategistAgent 
} from './src/agents/specialized-agents';

import { 
  ValidatorAgent, 
  EvolverAgent, 
  DocumenterAgent 
} from './src/agents/workflow-agents';

import { AgentOrchestrator } from './src/agent-orchestrator/orchestrator';
import { createLogger } from './src/utils/centralized-logger';

const logger = createLogger('AgentSystem');

export class VisionCortexAgentSystem {
  private orchestrator: AgentOrchestrator;
  private agents: {
    crawler: CrawlerAgent;
    ingestor: IngestorAgent;
    predictor: PredictorAgent;
    visionary: VisionaryAgent;
    strategist: StrategistAgent;
    validator: ValidatorAgent;
    evolver: EvolverAgent;
    documenter: DocumenterAgent;
  };

  constructor() {
    this.orchestrator = new AgentOrchestrator();
    
    // Initialize all 8 agents
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    
    this.agents = {
      crawler: new CrawlerAgent({ 
        agentId: 'crawler-agent', 
        capabilities: [], 
        priority: 8,
        expertise: [],
        redisUrl 
      }),
      ingestor: new IngestorAgent({ 
        agentId: 'ingestor-agent', 
        capabilities: [], 
        priority: 7,
        expertise: [],
        redisUrl 
      }),
      predictor: new PredictorAgent({ 
        agentId: 'predictor-agent', 
        capabilities: [], 
        priority: 6,
        expertise: [],
        redisUrl 
      }),
      visionary: new VisionaryAgent({ 
        agentId: 'visionary-agent', 
        capabilities: [], 
        priority: 5,
        expertise: [],
        redisUrl 
      }),
      strategist: new StrategistAgent({ 
        agentId: 'strategist-agent', 
        capabilities: [], 
        priority: 4,
        expertise: [],
        redisUrl 
      }),
      validator: new ValidatorAgent({ 
        agentId: 'validator-agent', 
        capabilities: [], 
        priority: 3,
        expertise: [],
        redisUrl 
      }),
      evolver: new EvolverAgent({ 
        agentId: 'evolver-agent', 
        capabilities: [], 
        priority: 2,
        expertise: [],
        redisUrl 
      }),
      documenter: new DocumenterAgent({ 
        agentId: 'documenter-agent', 
        capabilities: [], 
        priority: 1,
        expertise: [],
        redisUrl 
      })
    };
  }

  /**
   * Start all agents and begin the intelligence workflow
   */
  async startSystem(): Promise<void> {
    logger.info('🚀 Starting Vision Cortex Agent System...');
    
    try {
      // Initialize all agents
      await Promise.all([
        this.agents.crawler.initialize(),
        this.agents.ingestor.initialize(),
        this.agents.predictor.initialize(),
        this.agents.visionary.initialize(),
        this.agents.strategist.initialize(),
        this.agents.validator.initialize(),
        this.agents.evolver.initialize(),
        this.agents.documenter.initialize()
      ]);

      logger.info('✅ All 8 agents initialized successfully');

      // Start the continuous intelligence workflow
      await this.startContinuousWorkflow();

    } catch (error) {
      logger.error('❌ Failed to start agent system:', error);
      throw error;
    }
  }

  /**
   * Execute the complete intelligence workflow pipeline
   */
  async runFullCycle(): Promise<void> {
    logger.info('🔄 Starting full intelligence cycle...');
    
    try {
      // 1. CRAWL - Acquire data signals
      logger.info('📡 Stage 1: Data Acquisition (Crawler Agent)');
      const rawSignals = await this.agents.crawler.process({});
      
      // 2. INGEST - Normalize and structure data
      logger.info('⚡ Stage 2: Data Ingestion (Ingestor Agent)');
      const processedSignals = await this.agents.ingestor.process(rawSignals);
      
      // 3. PREDICT - Generate market predictions
      logger.info('🔮 Stage 3: Prediction Analysis (Predictor Agent)');
      const predictions = await this.agents.predictor.process(processedSignals);
      
      // 4. ENVISION - Create strategic vision
      logger.info('👁️ Stage 4: Vision Generation (Visionary Agent)');
      const vision = await this.agents.visionary.process(predictions);
      
      // 5. STRATEGIZE - Formulate action plans
      logger.info('🎯 Stage 5: Strategy Formulation (Strategist Agent)');
      const strategy = await this.agents.strategist.process(vision);
      
      // 6. VALIDATE - Assess risks and validate strategy
      logger.info('🛡️ Stage 6: Validation & Risk Assessment (Validator Agent)');
      const validation = await this.agents.validator.process(strategy);
      
      // 7. EVOLVE - Learn and adapt system
      logger.info('🧬 Stage 7: System Evolution (Evolver Agent)');
      const evolution = await this.agents.evolver.process(validation);
      
      // 8. DOCUMENT - Capture knowledge and insights
      logger.info('📚 Stage 8: Documentation (Documenter Agent)');
      const documentation = await this.agents.documenter.process(evolution);

      logger.info('✅ Full intelligence cycle completed successfully');
      logger.info('📊 Results:', {
        signalsProcessed: rawSignals?.length || 0,
        predictionsGenerated: predictions?.predictions?.length || 0,
        strategiesCreated: strategy?.strategies?.length || 0,
        validationScore: validation?.validation_score || 0,
        documentsCreated: documentation?.documents?.length || 0
      });

    } catch (error) {
      logger.error('❌ Intelligence cycle failed:', error);
      throw error;
    }
  }

  /**
   * Start continuous workflow execution
   */
  private async startContinuousWorkflow(): Promise<void> {
    logger.info('🔄 Starting continuous intelligence workflow...');
    
    // Run initial cycle
    await this.runFullCycle();
    
    // Schedule continuous execution every 30 minutes
    setInterval(async () => {
      try {
        logger.info('⏰ Starting scheduled intelligence cycle...');
        await this.runFullCycle();
      } catch (error) {
        logger.error('❌ Scheduled cycle failed:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

  /**
   * Get system status
   */
  getSystemStatus(): any {
    return {
      timestamp: new Date(),
      systemStatus: 'active',
      agentCount: 8,
      agents: Object.entries(this.agents).map(([name, agent]) => ({
        name,
        id: agent['config']?.agentId || name,
        status: 'active', // Would be dynamic in production
        capabilities: agent['config']?.capabilities || []
      }))
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('🔄 Shutting down Vision Cortex Agent System...');
    
    // Cleanup agents
    await Promise.all(Object.values(this.agents).map(agent => 
      agent['shutdown'] ? agent['shutdown']() : Promise.resolve()
    ));
    
    logger.info('✅ System shutdown complete');
  }
}

/**
 * CLI Entry Point - Start the agent system
 */
async function main() {
  const system = new VisionCortexAgentSystem();
  
  try {
    await system.startSystem();
    
    // Keep process alive
    process.on('SIGINT', async () => {
      logger.info('🛑 Received shutdown signal...');
      await system.shutdown();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('❌ Failed to start system:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export default VisionCortexAgentSystem;