/**
 * Court Docket Crawler - Real-time tracking of foreclosure, probate, eviction, divorce proceedings
 * Target: +40% closing rate impact via urgency-based targeting
 *
 * Data Sources:
 * - County clerk websites (automated scraping)
 * - PACER (federal court data)
 * - CourtListener API
 * - State-specific court docket systems
 *
 * Critical Data Points:
 * - Foreclosure sale dates (exact countdown)
 * - Probate hearing schedules (executor deadlines)
 * - Eviction hearing dates (72-hour post-hearing countdowns)
 * - Divorce decree dates (asset division deadlines)
 */

import { EventEmitter } from "events";
import { RedisEventBus, EventChannels } from "../../utils/redis-event-bus";

export interface CourtCase {
  caseNumber: string;
  caseType: "foreclosure" | "probate" | "eviction" | "divorce";
  county: string;
  state: string;
  filingDate: Date;
  hearingDate?: Date;
  saleDate?: Date;
  partyNames: string[];
  propertyAddress?: string;
  propertyValue?: number;
  debtAmount?: number;
  urgencyScore: number;
  daysUntilDeadline: number;
  status: "filed" | "hearing-scheduled" | "judgment-entered" | "sale-pending" | "closed";
  metadata: {
    plaintiffAttorney?: string;
    defendantStatus?: string;
    contested: boolean;
    priorFilings?: number;
  };
}

export interface ForeclosureCase extends CourtCase {
  caseType: "foreclosure";
  lender: string;
  loanAmount: number;
  defaultDate: Date;
  auctionDate: Date;
  auctionLocation: string;
  redemptionPeriod?: number; // days
  minBid?: number;
}

export interface ProbateCase extends CourtCase {
  caseType: "probate";
  deceasedName: string;
  dateOfDeath: Date;
  executor: string;
  estateValue: number;
  assetsListed: {
    type: string;
    value: number;
    address?: string;
  }[];
  heirs: string[];
  contestedWill: boolean;
  administratorDeadline: Date;
}

export interface EvictionCase extends CourtCase {
  caseType: "eviction";
  landlord: string;
  tenant: string;
  unpaidRent: number;
  monthsDelinquent: number;
  evictionReason: "non-payment" | "lease-violation" | "holdover";
  writ72HourCountdown?: Date;
}

export interface DivorceCase extends CourtCase {
  caseType: "divorce";
  spouseA: string;
  spouseB: string;
  maritalAssets: {
    type: string;
    value: number;
    ownershipSplit?: string;
  }[];
  buyoutDeadline?: Date;
  settlementAmount?: number;
  childCustody: boolean;
}

export class CourtDocketCrawler extends EventEmitter {
  private eventBus: RedisEventBus;
  private crawlInterval: NodeJS.Timeout | null = null;
  private activeSources: Map<string, boolean> = new Map();

  constructor(redisConfig?: { host: string; port: number }) {
    super();
    this.eventBus = new RedisEventBus(redisConfig);
  }

  /**
   * Initialize crawler and subscribe to event bus
   */
  async initialize(): Promise<void> {
    await this.eventBus.connect();
    await this.eventBus.subscribe(EventChannels.TAXONOMY_UPDATE, (event) => {
      if (event.event_type === "crawler_start") {
        this.emit("crawler:initialized", { timestamp: new Date() });
      }
    });
  }

  /**
   * Start automated crawling on interval (default: every 6 hours)
   */
  startCrawling(intervalHours: number = 6): void {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    this.crawlInterval = setInterval(async () => {
      await this.crawlAllSources();
    }, intervalMs);

    // Initial crawl
    this.crawlAllSources();
    this.emit("crawler:started", { intervalHours });
  }

  /**
   * Stop automated crawling
   */
  stopCrawling(): void {
    if (this.crawlInterval) {
      clearInterval(this.crawlInterval);
      this.crawlInterval = null;
      this.emit("crawler:stopped");
    }
  }

  /**
   * Crawl all configured court data sources
   */
  public async crawlAllSources(): Promise<void> {
    const sources = [
      { name: "foreclosure", fn: this.crawlForeclosureCases.bind(this) },
      { name: "probate", fn: this.crawlProbateCases.bind(this) },
      { name: "eviction", fn: this.crawlEvictionCases.bind(this) },
      { name: "divorce", fn: this.crawlDivorceCases.bind(this) },
    ];

    const results = await Promise.allSettled(
      sources.map(async (source) => {
        this.activeSources.set(source.name, true);
        const cases = await source.fn();
        this.activeSources.set(source.name, false);
        return { source: source.name, count: cases.length };
      })
    );

    const successfulCrawls = results.filter(
      (r) => r.status === "fulfilled"
    ).length;
    await this.eventBus.publish(EventChannels.BUILDER_TRIGGERED, "crawl_complete", {
      successful: successfulCrawls,
      total: sources.length,
      timestamp: new Date(),
    });
  }

  /**
   * Crawl foreclosure filings (70-80% close rate target)
   */
  async crawlForeclosureCases(
    county?: string,
    state?: string
  ): Promise<ForeclosureCase[]> {
    // TODO: Integrate with county clerk APIs, PACER, CourtListener
    // Priority counties: High-volume foreclosure markets (FL, CA, NV, AZ)

    const mockCases: ForeclosureCase[] = []; // Placeholder for actual API integration

    // Scoring logic: Urgency = days until auction
    for (const caseData of mockCases) {
      const daysUntilAuction = Math.ceil(
        (caseData.auctionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      caseData.daysUntilDeadline = daysUntilAuction;
      caseData.urgencyScore = this.calculateUrgencyScore(
        daysUntilAuction,
        caseData.loanAmount
      );

      // Alert if high urgency (< 30 days to auction)
      if (daysUntilAuction <= 30) {
        await this.eventBus.publish(
          EventChannels.ISSUE_DETECTED,
          "foreclosure_urgent",
          {
            caseNumber: caseData.caseNumber,
            daysRemaining: daysUntilAuction,
            propertyValue: caseData.propertyValue,
            loanAmount: caseData.loanAmount,
          }
        );
      }
    }

    this.emit("foreclosure:cases-crawled", { count: mockCases.length });
    return mockCases;
  }

  /**
   * Crawl probate filings (75% close rate on executor-driven sales)
   */
  async crawlProbateCases(
    county?: string,
    state?: string
  ): Promise<ProbateCase[]> {
    const mockCases: ProbateCase[] = [];

    for (const caseData of mockCases) {
      const daysUntilDeadline = Math.ceil(
        (caseData.administratorDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      caseData.daysUntilDeadline = daysUntilDeadline;
      caseData.urgencyScore = this.calculateUrgencyScore(
        daysUntilDeadline,
        caseData.estateValue
      );

      // High urgency if contested OR deadline < 60 days
      if (caseData.contestedWill || daysUntilDeadline <= 60) {
        await this.eventBus.publish(
          EventChannels.ISSUE_DETECTED,
          "probate_urgent",
          {
            caseNumber: caseData.caseNumber,
            contested: caseData.contestedWill,
            daysRemaining: daysUntilDeadline,
            estateValue: caseData.estateValue,
          }
        );
      }
    }

    this.emit("probate:cases-crawled", { count: mockCases.length });
    return mockCases;
  }

  /**
   * Crawl eviction filings (85% close rate on post-judgment evictions)
   */
  async crawlEvictionCases(
    county?: string,
    state?: string
  ): Promise<EvictionCase[]> {
    const mockCases: EvictionCase[] = [];

    for (const caseData of mockCases) {
      let daysUntilDeadline = 0;
      if (caseData.writ72HourCountdown) {
        const hoursUntilEviction =
          (caseData.writ72HourCountdown.getTime() - Date.now()) / (1000 * 60 * 60);
        daysUntilDeadline = Math.ceil(hoursUntilEviction / 24);
      } else if (caseData.hearingDate) {
        daysUntilDeadline = Math.ceil(
          (caseData.hearingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
      }

      caseData.daysUntilDeadline = daysUntilDeadline;
      caseData.urgencyScore = this.calculateUrgencyScore(
        daysUntilDeadline,
        caseData.unpaidRent
      );

      // Critical urgency if 72-hour writ issued (< 3 days)
      if (daysUntilDeadline <= 3 && caseData.writ72HourCountdown) {
        await this.eventBus.publish(
          EventChannels.ISSUE_DETECTED,
          "eviction_critical",
          {
            caseNumber: caseData.caseNumber,
            hoursRemaining: daysUntilDeadline * 24,
            propertyAddress: caseData.propertyAddress,
            unpaidRent: caseData.unpaidRent,
          }
        );
      }
    }

    this.emit("eviction:cases-crawled", { count: mockCases.length });
    return mockCases;
  }

  /**
   * Crawl divorce filings with property division (75% close rate)
   */
  async crawlDivorceCases(
    county?: string,
    state?: string
  ): Promise<DivorceCase[]> {
    const mockCases: DivorceCase[] = [];

    for (const caseData of mockCases) {
      let daysUntilDeadline = 0;
      if (caseData.buyoutDeadline) {
        daysUntilDeadline = Math.ceil(
          (caseData.buyoutDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
      } else if (caseData.hearingDate) {
        daysUntilDeadline = Math.ceil(
          (caseData.hearingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
      }

      caseData.daysUntilDeadline = daysUntilDeadline;
      const totalAssetValue = caseData.maritalAssets.reduce(
        (sum, asset) => sum + asset.value,
        0
      );
      caseData.urgencyScore = this.calculateUrgencyScore(
        daysUntilDeadline,
        totalAssetValue
      );

      // High urgency if buyout deadline < 90 days
      if (caseData.buyoutDeadline && daysUntilDeadline <= 90) {
        await this.eventBus.publish(
          EventChannels.ISSUE_DETECTED,
          "divorce_buyout_urgent",
          {
            caseNumber: caseData.caseNumber,
            daysRemaining: daysUntilDeadline,
            assetValue: totalAssetValue,
            buyoutAmount: caseData.settlementAmount,
          }
        );
      }
    }

    this.emit("divorce:cases-crawled", { count: mockCases.length });
    return mockCases;
  }

  /**
   * Calculate urgency score based on days remaining and financial value
   * Formula: urgencyScore = (1 / daysRemaining^0.5) * log10(value) * 100
   */
  private calculateUrgencyScore(daysRemaining: number, value: number): number {
    if (daysRemaining <= 0) return 1000; // Maximum urgency
    const timeComponent = 1 / Math.sqrt(daysRemaining);
    const valueComponent = Math.log10(Math.max(value, 1));
    return Math.round(timeComponent * valueComponent * 100);
  }

  /**
   * Get crawler status and metrics
   */
  getStatus(): {
    crawling: boolean;
    activeSources: string[];
    uptime: number;
  } {
    return {
      crawling: this.crawlInterval !== null,
      activeSources: Array.from(this.activeSources.entries())
        .filter(([_, active]) => active)
        .map(([name]) => name),
      uptime: process.uptime(),
    };
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup(): Promise<void> {
    this.stopCrawling();
    await this.eventBus.disconnect();
  }
}

/**
 * Integration with taxonomy scoring system:
 *
 * Foreclosure Conversion Formula (from taxonomy):
 * - 0-30 days to auction: 80%+ conversion
 * - 30-90 days: 68% conversion
 * - 90-180 days: 54% conversion
 *
 * Probate Conversion Formula:
 * - Contested will: 75% conversion (urgent)
 * - Executor deadline < 60 days: 72% conversion
 * - Multiple heirs + real estate: 65% conversion
 *
 * Eviction Conversion Formula:
 * - 72-hour writ: 85%+ conversion (critical)
 * - Hearing scheduled < 14 days: 78% conversion
 * - Post-judgment > 30 days: 60% conversion
 *
 * Divorce Conversion Formula:
 * - Buyout deadline < 90 days: 75% conversion
 * - Asset division ordered: 68% conversion
 * - Contested property: 72% conversion
 */


