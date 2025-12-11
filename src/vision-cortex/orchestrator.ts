/**
 * Vision Cortex Orchestrator - Integrates all Vision Cortex components
 *
 * Wires together the complete intelligence pipeline:
 * 1. Crawlers ingest signals from 50+ sources
 * 2. Entity Resolver deduplicates across sources
 * 3. Scoring Engine calculates probability/timing
 * 4. Alert System fires countdown alerts (T-30/14/7/2)
 * 5. Playbook Router executes decision trees
 * 6. Outreach Generator creates personalized messages
 *
 * Event-driven architecture using RedisEventBus
 */

import { EventEmitter } from "events";
import { RedisEventBus, EventChannels } from "../utils/redis-event-bus";
import { CourtDocketCrawler } from "./crawlers/court-docket-crawler";
import { FDAApprovalTracker } from "./crawlers/fda-approval-tracker";
import { LinkedInTalentTracker } from "./crawlers/linkedin-talent-tracker";
import { LLMEntityResolver } from "./llm-entity-resolver";
import { ScoringEngine, type Signal, type ScoredSignal } from "./scoring-engine";
import { CountdownAlertSystem } from "./alert-system";
import { PlaybookRouter } from "./playbook-router";
import { OutreachGenerator } from "./outreach-generator";

export interface VisionCortexConfig {
  redis?: { host: string; port: number };
  ollama?: { baseUrl?: string; model?: string };
  crawlers?: {
    courtDocket?: { enabled: boolean; intervalHours?: number };
    fda?: { enabled: boolean; intervalHours?: number };
    linkedIn?: { enabled: boolean; intervalHours?: number };
  };
  alerts?: {
    enabled: boolean;
    checkIntervalHours?: number;
  };
  outreach?: {
    defaultChannel?: "email" | "sms" | "phone" | "linkedin";
  };
}

export class VisionCortexOrchestrator extends EventEmitter {
  private eventBus: RedisEventBus;
  private LLMEntityResolver: LLMEntityResolver;
  private scoringEngine: ScoringEngine;
  private alertSystem: CountdownAlertSystem;
  private playbookRouter: PlaybookRouter;
  private outreachGenerator: OutreachGenerator;

  // Crawlers
  private courtDocketCrawler?: CourtDocketCrawler;
  private fdaTracker?: FDAApprovalTracker;
  private linkedInTracker?: LinkedInTalentTracker;

  private config: VisionCortexConfig;

  constructor(config: VisionCortexConfig = {}) {
    super();
    this.config = config;

    // Initialize core components
    this.eventBus = new RedisEventBus(config.redis);
    this.LLMEntityResolver = new LLMEntityResolver(config.ollama);
    this.scoringEngine = new ScoringEngine();
    this.alertSystem = new CountdownAlertSystem(config.redis);
    this.playbookRouter = new PlaybookRouter();
    this.outreachGenerator = new OutreachGenerator();

    // Initialize crawlers if enabled
    if (config.crawlers?.courtDocket?.enabled) {
      this.courtDocketCrawler = new CourtDocketCrawler(config.redis);
    }
    if (config.crawlers?.fda?.enabled) {
      this.fdaTracker = new FDAApprovalTracker(config.redis);
    }
    if (config.crawlers?.linkedIn?.enabled) {
      this.linkedInTracker = new LinkedInTalentTracker(config.redis);
    }
  }

  /**
   * Initialize all components and wire up event handlers
   */
  async initialize(): Promise<void> {
    console.log("Initializing Vision Cortex Orchestrator...");

    // Connect event bus
    await this.eventBus.connect();

    // Initialize LLM entity resolver
    await this.LLMEntityResolver.initialize();

    // Initialize alert system
    await this.alertSystem.initialize();

    // Wire up event handlers
    this.wireEventHandlers();

    // Start crawlers
    if (this.courtDocketCrawler) {
      await this.courtDocketCrawler.initialize();
      this.courtDocketCrawler.startCrawling(
        this.config.crawlers?.courtDocket?.intervalHours || 24
      );
    }

    if (this.fdaTracker) {
      await this.fdaTracker.initialize();
      this.fdaTracker.startTracking(
        this.config.crawlers?.fda?.intervalHours || 24
      );
    }

    if (this.linkedInTracker) {
      await this.linkedInTracker.initialize();
      this.linkedInTracker.startTracking(
        this.config.crawlers?.linkedIn?.intervalHours || 24
      );
    }

    // Start alert monitoring
    if (this.config.alerts?.enabled !== false) {
      this.alertSystem.startMonitoring(
        this.config.alerts?.checkIntervalHours || 6
      );
    }

    this.emit("orchestrator:initialized");
    console.log("Vision Cortex Orchestrator initialized successfully");
  }

  /**
   * Wire up event handlers for the complete pipeline
   */
  private wireEventHandlers(): void {
    // 1. SIGNAL INGESTION â†’ ENTITY RESOLUTION
    this.eventBus.subscribe(EventChannels.SIGNAL_INGESTED, async (event) => {
      const signal = event.payload as Signal;
      const entity = await this.LLMEntityResolver.resolveEntity(signal);

      this.emit("signal:resolved", {
        signalId: signal.signalId,
        entityId: entity.entityId,
      });

      // Forward to scoring
      this.scoreSignal(signal);
    });

    // 2. SIGNAL SCORED â†’ ALERTS + PLAYBOOK
    this.scoringEngine.on("signal:scored", (scoredData) => {
      const { signalId, score, priority } = scoredData;

      // Add to alert monitoring
      // Note: Need to get the full ScoredSignal, not just metadata
      // This is a placeholder - in real implementation, pass full signal
      this.emit("signal:awaiting-alert", { signalId, score, priority });

      // Route to playbook
      // Same note - need full ScoredSignal
      this.emit("signal:awaiting-playbook", { signalId, score, priority });
    });

    // 3. ALERT TRIGGERED â†’ OUTREACH
    this.alertSystem.on("alert:triggered", (alert) => {
      this.emit("alert:ready", alert);

      // Generate outreach for critical alerts
      if (alert.priority === "critical") {
        // Note: Need full ScoredSignal to generate outreach
        this.emit("outreach:pending", { alertId: alert.alertId });
      }
    });

    // 4. PLAYBOOK ROUTED â†’ EXECUTION
    this.playbookRouter.on("playbook:routed", (routeData) => {
      this.emit("playbook:executing", routeData);
    });

    // 5. OUTREACH GENERATED â†’ SEND
    this.outreachGenerator.on("outreach:generated", (outreachData) => {
      this.emit("outreach:ready", outreachData);
      // TODO: Integrate with email/SMS/phone/LinkedIn APIs
    });
  }

  /**
   * Manual signal ingestion (for testing or external sources)
   */
  async ingestSignal(signal: Signal): Promise<ScoredSignal> {
    // Publish to event bus
    await this.eventBus.publish(
      EventChannels.SIGNAL_INGESTED,
      "manual_ingestion",
      signal as unknown as Record<string, unknown>
    );

    // Resolve entity
    const entity = await this.LLMEntityResolver.resolveEntity(signal);

    // Score signal
    const scoredSignal = this.scoringEngine.scoreSignal(signal);

    // Add to alert monitoring
    this.alertSystem.addSignal(scoredSignal);

    // Route to playbook
    const playbook = this.playbookRouter.routeToPlaybook(scoredSignal);

    this.emit("signal:processed", {
      signalId: signal.signalId,
      entityId: entity.entityId,
      score: scoredSignal.score,
      playbook: playbook.playbookName,
    });

    return scoredSignal;
  }

  /**
   * Score a signal using scoring engine
   */
  private scoreSignal(signal: Signal): ScoredSignal {
    return this.scoringEngine.scoreSignal(signal);
  }

  /**
   * Generate outreach for a signal
   */
  async generateOutreach(
    scoredSignal: ScoredSignal,
    channel?: "email" | "sms" | "phone" | "linkedin"
  ): Promise<ReturnType<OutreachGenerator["generateOutreach"]>> {
    const targetChannel =
      channel || this.config.outreach?.defaultChannel || "email";
    return this.outreachGenerator.generateOutreach(scoredSignal, targetChannel);
  }

  /**
   * Get system-wide metrics
   */
  getMetrics(): {
    entities: ReturnType<LLMEntityResolver["getStats"]>;
    alerts: ReturnType<CountdownAlertSystem["getMetrics"]>;
    playbooks: ReturnType<PlaybookRouter["getMetrics"]>;
    outreach: ReturnType<OutreachGenerator["getMetrics"]>;
  } {
    return {
      entities: this.LLMEntityResolver.getStats(),
      alerts: this.alertSystem.getMetrics(),
      playbooks: this.playbookRouter.getMetrics(),
      outreach: this.outreachGenerator.getMetrics(),
    };
  }

  /**
   * Search entities
   */
  searchEntities(query: string, limit?: number): ReturnType<LLMEntityResolver["searchEntities"]> {
    return this.LLMEntityResolver.searchEntities(query, limit);
  }

  /**
   * Get entity timeline
   */
  getEntityTimeline(entityId: string): ReturnType<LLMEntityResolver["getEntityTimeline"]> {
    return this.LLMEntityResolver.getEntityTimeline(entityId);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(priority?: "critical" | "high" | "medium"): ReturnType<CountdownAlertSystem["getActiveAlerts"]> {
    return this.alertSystem.getActiveAlerts(priority);
  }

  /**
   * Shutdown all components
   */
  async shutdown(): Promise<void> {
    console.log("Shutting down Vision Cortex Orchestrator...");

    // Stop crawlers
    if (this.courtDocketCrawler) {
      this.courtDocketCrawler.stopCrawling();
      await this.courtDocketCrawler.cleanup();
    }

    if (this.fdaTracker) {
      this.fdaTracker.stopTracking();
      await this.fdaTracker.cleanup();
    }

    if (this.linkedInTracker) {
      this.linkedInTracker.stopTracking();
      await this.linkedInTracker.cleanup();
    }

    // Stop alert monitoring
    this.alertSystem.stopMonitoring();
    await this.alertSystem.cleanup();

    // Disconnect event bus
    await this.eventBus.disconnect();

    this.emit("orchestrator:shutdown");
    console.log("Vision Cortex Orchestrator shutdown complete");
  }
}

/**
 * Example usage:
 *
 * const orchestrator = new VisionCortexOrchestrator({
 *   redis: { host: "localhost", port: 6379 },
 *   crawlers: {
 *     courtDocket: { enabled: true, intervalHours: 24 },
 *     fda: { enabled: true, intervalHours: 24 },
 *     linkedIn: { enabled: true, intervalHours: 12 },
 *   },
 *   alerts: { enabled: true, checkIntervalHours: 6 },
 *   outreach: { defaultChannel: "email" },
 * });
 *
 * await orchestrator.initialize();
 *
 * // Manual signal ingestion
 * const signal: Signal = {
 *   signalId: "test-123",
 *   signalType: "foreclosure",
 *   source: "county-clerk",
 *   entity: { id: "prop-456", type: "property", name: "123 Main St" },
 *   triggers: { urgency: 90, financialStress: 85 },
 *   data: { propertyValue: 500000, auctionDate: new Date("2025-02-15") },
 *   timestamp: new Date(),
 * };
 *
 * const scoredSignal = await orchestrator.ingestSignal(signal);
 * console.log(`Score: ${scoredSignal.score}, Playbook: ${scoredSignal.playbook}`);
 *
 * // Generate outreach
 * const outreach = await orchestrator.generateOutreach(scoredSignal, "email");
 * console.log(outreach.body);
 *
 * // Get metrics
 * const metrics = orchestrator.getMetrics();
 * console.log(metrics);
 */










