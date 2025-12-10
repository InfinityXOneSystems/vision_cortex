import { EventEmitter } from "events";
import { RedisEventBus, EventChannels } from "../utils/redis-event-bus";
import { CourtDocketCrawler } from "./crawlers/court-docket-crawler";
import { FDAApprovalTracker } from "./crawlers/fda-approval-tracker";
import { LinkedInTalentTracker } from "./crawlers/linkedin-talent-tracker";
import { ScoringEngine, type Signal, type ScoredSignal } from "./scoring-engine";

// Industries covered by the Vision Cortex taxonomy (10 industries Ã— 10 niches)
type Industry =
  | "commercial_real_estate"
  | "healthcare_mna"
  | "private_equity"
  | "oil_and_gas"
  | "financial_services"
  | "corporate_mna"
  | "insurance"
  | "legal_services"
  | "staffing"
  | "logistics";

interface UniversalIngestorConfig {
  redisUrl?: string;
  ingestIntervalMinutes?: number; // optional global override
}

interface IndustryPlan {
  cadenceMinutes: number;
  sources: Array<{ name: string; run: () => Promise<Signal[]> }>;
}

/**
 * Universal Ingestor orchestrates all industries and routes signals through Redis + local events.
 * - Runs 24/7 under Docker (see vision_cortex/docker/*)
 * - Each industry has a source plan and cadence; can be globally overridden via env
 */
export class UniversalIngestor extends EventEmitter {
  private eventBus?: RedisEventBus;
  private scoringEngine: ScoringEngine;
  private courtCrawler: CourtDocketCrawler;
  private fdaTracker: FDAApprovalTracker;
  private linkedInTracker: LinkedInTalentTracker;
  private plans: Record<Industry, IndustryPlan>;
  private timers: NodeJS.Timer[] = [];

  constructor(private config: UniversalIngestorConfig = {}) {
    super();

    const redisUrl = config.redisUrl || process.env.REDIS_URL || "redis://localhost:6379";
    this.eventBus = new RedisEventBus({ redis_url: redisUrl, service_name: "vision-cortex-universal" } as any);

    const redisHostPort = this.parseRedisUrl(redisUrl);
    this.courtCrawler = new CourtDocketCrawler(redisHostPort as any);
    this.fdaTracker = new FDAApprovalTracker(redisHostPort as any);
    this.linkedInTracker = new LinkedInTalentTracker(redisHostPort as any);

    this.scoringEngine = new ScoringEngine();

    const defaultCadence = config.ingestIntervalMinutes || Number(process.env.INGEST_INTERVAL_MINUTES) || 180;

    this.plans = {
      commercial_real_estate: {
        cadenceMinutes: defaultCadence,
        sources: [
          { name: "court-dockets", run: () => this.courtCrawler.crawlAllSources() },
          { name: "generic-cre-signals", run: () => this.generateGenericSignals("commercial_real_estate") },
        ],
      },
      healthcare_mna: {
        cadenceMinutes: defaultCadence,
        sources: [
          { name: "fda-approvals", run: () => this.fdaTracker.trackAllEvents() },
          { name: "generic-healthcare-signals", run: () => this.generateGenericSignals("healthcare_mna") },
        ],
      },
      private_equity: {
        cadenceMinutes: defaultCadence,
        sources: [
          { name: "talent-migration", run: () => this.linkedInTracker.trackKOLMovements() },
          { name: "generic-pe-signals", run: () => this.generateGenericSignals("private_equity") },
        ],
      },
      oil_and_gas: {
        cadenceMinutes: defaultCadence,
        sources: [
          { name: "generic-oil-gas", run: () => this.generateGenericSignals("oil_and_gas") },
        ],
      },
      financial_services: {
        cadenceMinutes: defaultCadence,
        sources: [
          { name: "court-dockets", run: () => this.courtCrawler.crawlAllSources() },
          { name: "generic-financial", run: () => this.generateGenericSignals("financial_services") },
        ],
      },
      corporate_mna: {
        cadenceMinutes: defaultCadence,
        sources: [
          { name: "talent-migration", run: () => this.linkedInTracker.trackKOLMovements() },
          { name: "generic-corp-mna", run: () => this.generateGenericSignals("corporate_mna") },
        ],
      },
      insurance: {
        cadenceMinutes: defaultCadence,
        sources: [
          { name: "court-dockets", run: () => this.courtCrawler.crawlAllSources() },
          { name: "generic-insurance", run: () => this.generateGenericSignals("insurance") },
        ],
      },
      legal_services: {
        cadenceMinutes: defaultCadence,
        sources: [
          { name: "court-dockets", run: () => this.courtCrawler.crawlAllSources() },
          { name: "generic-legal", run: () => this.generateGenericSignals("legal_services") },
        ],
      },
      staffing: {
        cadenceMinutes: defaultCadence,
        sources: [
          { name: "talent-migration", run: () => this.linkedInTracker.trackKOLMovements() },
          { name: "generic-staffing", run: () => this.generateGenericSignals("staffing") },
        ],
      },
      logistics: {
        cadenceMinutes: defaultCadence,
        sources: [
          { name: "generic-logistics", run: () => this.generateGenericSignals("logistics") },
        ],
      },
    } as Record<Industry, IndustryPlan>;
  }

  /** Initialize dependencies (connect event bus, crawlers) */
  async initialize(): Promise<void> {
    if (this.eventBus) {
      await this.eventBus.connect();
    }
    await Promise.all([
      this.courtCrawler.initialize?.(),
      this.fdaTracker.initialize?.(),
      this.linkedInTracker.initialize?.(),
    ]);
  }

  /** Start 24/7 ingestion */
  start(): void {
    Object.entries(this.plans).forEach(([industry, plan]) => {
      // Immediate run
      void this.runIndustry(industry as Industry);
      const timer = setInterval(() => {
        void this.runIndustry(industry as Industry);
      }, plan.cadenceMinutes * 60 * 1000);
      this.timers.push(timer);
    });
    this.emit("universal:started");
    console.log("Universal Ingestor started");
  }

  /** Stop ingestion */
  stop(): void {
    this.timers.forEach((t) => clearInterval(t as any));
    this.timers = [];
    this.emit("universal:stopped");
  }

  /** Run a single industry plan once */
  async runIndustry(industry: Industry): Promise<void> {
    const plan = this.plans[industry];
    if (!plan) return;

    console.log(`[ingestor] running ${industry} with ${plan.sources.length} sources`);
    for (const source of plan.sources) {
      try {
        const signals = await source.run();
        await this.processSignals(industry, source.name, signals);
      } catch (err) {
        console.error("[ingestor] source failed", { industry, source: source.name, err });
      }
    }
  }

  private async processSignals(industry: Industry, sourceName: string, signals: Signal[]): Promise<void> {
    for (const signal of signals) {
      const scored = this.score(signal);

      // Publish to Redis for downstream orchestrator
      if (this.eventBus) {
        await this.eventBus.publish(
          EventChannels.SIGNAL_INGESTED,
          `${industry}:${sourceName}`,
          scored as unknown as Record<string, unknown>
        );
      }

      // Emit locally for in-process consumers
      this.emit("signal:ingested", { industry, source: sourceName, signal: scored });
    }
  }

  private score(signal: Signal): ScoredSignal {
    return this.scoringEngine.scoreSignal(signal);
  }

  /**
   * Generate placeholder signals when a specialized crawler is not available yet.
   * This keeps the universal ingestor emitting data for every industry until
   * bespoke sources are added.
   */
  private async generateGenericSignals(industry: Industry): Promise<Signal[]> {
    const now = new Date();
    const signal: Signal = {
      signalId: `${industry}-${now.getTime()}`,
      signalType: `${industry}-generic-opportunity`,
      source: "generic-ingestor",
      entity: { id: `${industry}-entity`, type: "company", name: `${industry}-target` },
      triggers: { urgency: 45, financialStress: 50, competitiveThreat: 40 },
      data: { placeholder: true, note: "replace with industry-specific crawler" },
      timestamp: now,
    };
    return [signal];
  }

  private parseRedisUrl(redisUrl: string): { host: string; port: number } {
    try {
      const url = new URL(redisUrl);
      return { host: url.hostname, port: Number(url.port) || 6379 };
    } catch (err) {
      console.warn("Failed to parse REDIS_URL, defaulting to localhost:6379", err);
      return { host: "localhost", port: 6379 };
    }
  }
}

// Allow standalone execution (useful in Docker)
if (require.main === module) {
  const ingestor = new UniversalIngestor();
  void ingestor.initialize().then(() => ingestor.start());
}


