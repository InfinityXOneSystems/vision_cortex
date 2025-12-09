/**
 * LinkedIn Talent Migration Tracker - Real-time tracking of key talent movements
 * Target: 68% acquisition probability for healthcare M&A, 64% exit probability for PE/VC
 *
 * Data Sources:
 * - LinkedIn API (job changes, company updates)
 * - Crunchbase (executive moves)
 * - Company press releases (C-suite announcements)
 * - SEC filings (insider transactions)
 *
 * Critical Data Points:
 * - Job changes by industry (who's leaving where?)
 * - Company departures (mass exodus signals)
 * - KOL movements (key opinion leaders in pharma/biotech)
 * - Talent concentration mapping (competitor talent wars)
 */

import { EventEmitter } from "events";
import { RedisEventBus, EventChannels } from "../../utils/redis-event-bus";

export interface TalentMove {
  moveId: string;
  person: {
    name: string;
    title: string;
    seniority: "C-suite" | "VP" | "Director" | "Manager" | "IC";
    skills: string[];
    linkedinUrl?: string;
  };
  departure: {
    company: string;
    industry: string;
    departureDate: Date;
    reason?: "new-opportunity" | "layoff" | "retirement" | "unknown";
    companySize: "startup" | "growth" | "midmarket" | "enterprise";
  };
  arrival?: {
    company: string;
    industry: string;
    startDate: Date;
    companySize: "startup" | "growth" | "midmarket" | "enterprise";
  };
  urgencyScore: number;
  signalType: "exodus" | "kol-move" | "competitor-poach" | "talent-concentration" | "c-suite-departure";
  metadata: {
    departureCount?: number; // Total departures from company in past 90 days
    competitorHiring?: boolean;
    industryTrend?: string;
  };
}

export interface CompanyTalentHealth {
  company: string;
  industry: string;
  totalEmployees: number;
  departures90Days: number;
  attritionRate: number; // % over 90 days
  keyRoleDepartures: {
    role: string;
    count: number;
    trend: "increasing" | "stable" | "decreasing";
  }[];
  competitorTargeting: boolean;
  urgencyScore: number;
  acquirability: "high" | "medium" | "low";
}

export interface KOLMovement {
  kol: {
    name: string;
    specialty: string;
    citations: number;
    influence: "high" | "medium" | "low";
  };
  fromCompany: string;
  toCompany: string;
  moveDate: Date;
  significance: "critical" | "high" | "medium";
  implications: {
    productImpact?: string[];
    pipelineRisk?: string;
    competitorAdvantage?: string;
  };
}

export class LinkedInTalentTracker extends EventEmitter {
  private eventBus: RedisEventBus;
  private trackingInterval: NodeJS.Timeout | null = null;
  private activeTracking: Map<string, boolean> = new Map();

  constructor(redisConfig?: { host: string; port: number }) {
    super();
    this.eventBus = new RedisEventBus(redisConfig);
  }

  async initialize(): Promise<void> {
    await this.eventBus.connect();
    await this.eventBus.subscribe(EventChannels.TAXONOMY_UPDATE, (event) => {
      if (event.event_type === "talent_tracker_start") {
        this.emit("tracker:initialized", { timestamp: new Date() });
      }
    });
  }

  /**
   * Start automated tracking (default: every 12 hours)
   */
  startTracking(intervalHours: number = 12): void {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    this.trackingInterval = setInterval(async () => {
      await this.trackAllMovements();
    }, intervalMs);

    this.trackAllMovements(); // Initial track
    this.emit("tracker:started", { intervalHours });
  }

  stopTracking(): void {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
      this.emit("tracker:stopped");
    }
  }

  private async trackAllMovements(): Promise<void> {
    const trackers = [
      { name: "job-changes", fn: this.trackJobChanges.bind(this) },
      { name: "company-health", fn: this.analyzeCompanyTalentHealth.bind(this) },
      { name: "kol-movements", fn: this.trackKOLMovements.bind(this) },
    ];

    const results = await Promise.allSettled(
      trackers.map(async (tracker) => {
        this.activeTracking.set(tracker.name, true);
        const data = await tracker.fn();
        this.activeTracking.set(tracker.name, false);
        return { tracker: tracker.name, count: Array.isArray(data) ? data.length : 1 };
      })
    );

    const successfulTracks = results.filter(
      (r) => r.status === "fulfilled"
    ).length;
    await this.eventBus.publish(EventChannels.BUILDER_TRIGGERED, "talent_track_complete", {
      successful: successfulTracks,
      total: trackers.length,
      timestamp: new Date(),
    });
  }

  /**
   * Track job changes across target industries
   */
  async trackJobChanges(industry?: string, company?: string): Promise<TalentMove[]> {
    // TODO: Integrate with LinkedIn API, Crunchbase, press releases
    const mockMoves: TalentMove[] = [];

    for (const move of mockMoves) {
      move.urgencyScore = this.calculateMoveUrgency(
        move.person.seniority,
        move.departure.company,
        move.metadata.departureCount || 0,
        move.signalType
      );

      // Alert on mass exodus (5+ departures in 90 days)
      if (move.signalType === "exodus" && (move.metadata.departureCount || 0) >= 5) {
        await this.eventBus.publish(
          EventChannels.ISSUE_DETECTED,
          "talent_exodus",
          {
            company: move.departure.company,
            industry: move.departure.industry,
            departureCount: move.metadata.departureCount,
            seniority: move.person.seniority,
          }
        );
      }

      // Alert on C-suite departure
      if (move.person.seniority === "C-suite") {
        await this.eventBus.publish(
          EventChannels.ISSUE_DETECTED,
          "csuite_departure",
          {
            person: move.person.name,
            title: move.person.title,
            company: move.departure.company,
            arrivalCompany: move.arrival?.company,
          }
        );
      }

      // Alert on competitor poaching
      if (move.signalType === "competitor-poach" && move.metadata.competitorHiring) {
        await this.eventBus.publish(
          EventChannels.ISSUE_DETECTED,
          "competitor_poaching",
          {
            fromCompany: move.departure.company,
            toCompany: move.arrival?.company,
            role: move.person.title,
            industry: move.departure.industry,
          }
        );
      }
    }

    this.emit("job-changes:tracked", { count: mockMoves.length });
    return mockMoves;
  }

  /**
   * Analyze company talent health (attrition, key role departures)
   */
  async analyzeCompanyTalentHealth(company?: string): Promise<CompanyTalentHealth[]> {
    // TODO: Aggregate LinkedIn data by company
    const mockHealth: CompanyTalentHealth[] = [];

    for (const health of mockHealth) {
      health.urgencyScore = this.calculateCompanyHealthUrgency(
        health.attritionRate,
        health.departures90Days,
        health.keyRoleDepartures.length
      );

      // Determine acquirability
      if (health.attritionRate > 20 || health.keyRoleDepartures.filter(r => r.trend === "increasing").length >= 3) {
        health.acquirability = "high";
      } else if (health.attritionRate > 10) {
        health.acquirability = "medium";
      } else {
        health.acquirability = "low";
      }

      // Alert on high attrition + key role departures (acquisition signal)
      if (health.attritionRate > 15 && health.keyRoleDepartures.length >= 3) {
        await this.eventBus.publish(
          EventChannels.ISSUE_DETECTED,
          "high_attrition_company",
          {
            company: health.company,
            attritionRate: `${health.attritionRate.toFixed(1)}%`,
            departures90Days: health.departures90Days,
            acquirability: health.acquirability,
          }
        );
      }
    }

    this.emit("company-health:analyzed", { count: mockHealth.length });
    return mockHealth;
  }

  /**
   * Track KOL (key opinion leader) movements in pharma/biotech
   */
  async trackKOLMovements(specialty?: string): Promise<KOLMovement[]> {
    // TODO: Integrate with PubMed, LinkedIn, company announcements
    const mockMovements: KOLMovement[] = [];

    for (const movement of mockMovements) {
      // KOL moves are always high urgency (pipeline impact)
      if (movement.significance === "critical" || movement.kol.influence === "high") {
        await this.eventBus.publish(
          EventChannels.ISSUE_DETECTED,
          "kol_movement_critical",
          {
            kol: movement.kol.name,
            specialty: movement.kol.specialty,
            fromCompany: movement.fromCompany,
            toCompany: movement.toCompany,
            productImpact: movement.implications.productImpact,
            pipelineRisk: movement.implications.pipelineRisk,
          }
        );
      }
    }

    this.emit("kol-movements:tracked", { count: mockMovements.length });
    return mockMovements;
  }

  /**
   * Calculate urgency of talent move: C-suite + exodus + competitor poach = highest urgency
   */
  private calculateMoveUrgency(
    seniority: string,
    company: string,
    departureCount: number,
    signalType: string
  ): number {
    const seniorityScore = seniority === "C-suite" ? 800 : seniority === "VP" ? 600 : seniority === "Director" ? 400 : 200;
    const exodusMultiplier = departureCount >= 5 ? 1.5 : departureCount >= 3 ? 1.3 : 1.0;
    const signalMultiplier = signalType === "exodus" ? 1.5 : signalType === "competitor-poach" ? 1.4 : 1.0;
    return Math.round(seniorityScore * exodusMultiplier * signalMultiplier);
  }

  /**
   * Calculate company health urgency: high attrition + key departures = acquisition signal
   */
  private calculateCompanyHealthUrgency(
    attritionRate: number,
    departures: number,
    keyRoleDepartures: number
  ): number {
    const attritionComponent = attritionRate * 30; // 20% attrition = 600 score
    const departureComponent = departures * 10;
    const keyRoleComponent = keyRoleDepartures * 50;
    return Math.round(attritionComponent + departureComponent + keyRoleComponent);
  }

  getStatus(): {
    tracking: boolean;
    activeSources: string[];
    uptime: number;
  } {
    return {
      tracking: this.trackingInterval !== null,
      activeSources: Array.from(this.activeTracking.entries())
        .filter(([_, active]) => active)
        .map(([name]) => name),
      uptime: process.uptime(),
    };
  }

  async cleanup(): Promise<void> {
    this.stopTracking();
    await this.eventBus.disconnect();
  }
}

/**
 * Integration with taxonomy scoring:
 *
 * Talent Migration Conversion (from Healthcare M&A taxonomy):
 * - C-suite departure: 68% acquisition probability
 * - 5+ departures in 90 days (exodus): 72% acquisition probability
 * - KOL departure to competitor: 65% acquisition probability (defensive)
 * - Attrition rate > 20%: 60% acquisition probability
 *
 * PE/VC Conversion (from PE/VC taxonomy):
 * - CEO departure + no succession: 64% exit probability
 * - Engineering team attrition > 30%: 58% distressed acquisition probability
 * - Sales team exodus: 55% fire-sale probability
 *
 * Timing Multiplier:
 * - Talent signals precede financial distress by 3-6 months
 * - Act immediately on C-suite departure (window closes fast)
 * - Mass exodus = 60-90 day acquisition window before market awareness
 */
