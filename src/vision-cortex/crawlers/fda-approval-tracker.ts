/**
 * FDA Approval Tracker - Real-time tracking of drug approvals, clinical trials, safety data
 * Target: 90% deal probability for pharmaceutical M&A
 *
 * Data Sources:
 * - FDA API (drugs@FDA, PDUFA dates, clinical trials)
 * - ClinicalTrials.gov
 * - FDA warning letters
 * - Breakthrough therapy designations
 *
 * Critical Data Points:
 * - PDUFA date (exact FDA decision deadline)
 * - Clinical trial enrollment status
 * - Safety data releases (AdCom meetings)
 * - Warning letter issuance (manufacturing issues)
 */

import { EventEmitter } from "events";
import { RedisEventBus, EventChannels } from "../../utils/redis-event-bus";

export interface FDAEvent {
  eventId: string;
  eventType: "pdufa" | "clinical-trial" | "safety-data" | "warning-letter" | "breakthrough-designation";
  company: string;
  drug: string;
  indication: string;
  status: "pending" | "approved" | "rejected" | "delayed" | "withdrawn";
  pdufaDate?: Date;
  decisionDate?: Date;
  urgencyScore: number;
  daysUntilDecision: number;
  metadata: {
    nda_number?: string;
    trial_phase?: string;
    enrollment_status?: string;
    safety_concerns?: string[];
    competitor_drugs?: string[];
  };
}

export interface PDUFAEvent extends FDAEvent {
  eventType: "pdufa";
  pdufaDate: Date;
  drugClass: string;
  marketSize: number; // Annual market in $M
  analystConsensus: "approve" | "reject" | "uncertain";
  adcomDate?: Date; // Advisory committee meeting
  adcomVote?: { yes: number; no: number; abstain: number };
  priority_review: boolean;
}

export interface ClinicalTrialEvent extends FDAEvent {
  eventType: "clinical-trial";
  nctNumber: string;
  phase: "Phase 1" | "Phase 2" | "Phase 3" | "Phase 4";
  enrollmentTarget: number;
  currentEnrollment: number;
  enrollmentRate: number; // patients per month
  estimatedCompletion: Date;
  primaryEndpoint: string;
  interimAnalysisDate?: Date;
}

export interface SafetyDataEvent extends FDAEvent {
  eventType: "safety-data";
  reportType: "adcom" | "fda-review" | "safety-signal" | "recall";
  severityLevel: "critical" | "major" | "minor";
  patientImpact: number;
  recallClass?: 1 | 2 | 3;
}

export interface WarningLetterEvent extends FDAEvent {
  eventType: "warning-letter";
  facility: string;
  violationType: "manufacturing" | "labeling" | "clinical" | "marketing";
  issueDate: Date;
  responseDeadline: Date;
  productionImpact: "halted" | "reduced" | "monitored";
}

export class FDAApprovalTracker extends EventEmitter {
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
      if (event.event_type === "fda_tracker_start") {
        this.emit("tracker:initialized", { timestamp: new Date() });
      }
    });
  }

  /**
   * Start automated tracking (default: every 24 hours)
   */
  startTracking(intervalHours: number = 24): void {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    this.trackingInterval = setInterval(async () => {
      await this.trackAllEvents();
    }, intervalMs);

    this.trackAllEvents(); // Initial track
    this.emit("tracker:started", { intervalHours });
  }

  stopTracking(): void {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
      this.emit("tracker:stopped");
    }
  }

  private async trackAllEvents(): Promise<void> {
    const trackers = [
      { name: "pdufa", fn: this.trackPDUFADates.bind(this) },
      { name: "clinical-trials", fn: this.trackClinicalTrials.bind(this) },
      { name: "safety-data", fn: this.trackSafetyData.bind(this) },
      { name: "warning-letters", fn: this.trackWarningLetters.bind(this) },
    ];

    const results = await Promise.allSettled(
      trackers.map(async (tracker) => {
        this.activeTracking.set(tracker.name, true);
        const events = await tracker.fn();
        this.activeTracking.set(tracker.name, false);
        return { tracker: tracker.name, count: events.length };
      })
    );

    const successfulTracks = results.filter(
      (r) => r.status === "fulfilled"
    ).length;
    await this.eventBus.publish(EventChannels.BUILDER_TRIGGERED, "fda_track_complete", {
      successful: successfulTracks,
      total: trackers.length,
      timestamp: new Date(),
    });
  }

  /**
   * Track PDUFA dates (FDA decision deadlines) - 90% M&A probability
   */
  async trackPDUFADates(company?: string): Promise<PDUFAEvent[]> {
    // TODO: Integrate with FDA API, scrape FDA.gov PDUFA calendar
    const mockEvents: PDUFAEvent[] = [];

    for (const event of mockEvents) {
      const daysUntilDecision = Math.ceil(
        (event.pdufaDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      event.daysUntilDecision = daysUntilDecision;
      event.urgencyScore = this.calculatePDUFAUrgency(
        daysUntilDecision,
        event.marketSize,
        event.analystConsensus
      );

      // High urgency if PDUFA < 60 days OR AdCom < 30 days
      if (daysUntilDecision <= 60 || (event.adcomDate && Math.ceil((event.adcomDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 30)) {
        await this.eventBus.publish(
          EventChannels.ISSUE_DETECTED,
          "pdufa_imminent",
          {
            drug: event.drug,
            company: event.company,
            daysRemaining: daysUntilDecision,
            marketSize: event.marketSize,
            consensus: event.analystConsensus,
          }
        );
      }
    }

    this.emit("pdufa:tracked", { count: mockEvents.length });
    return mockEvents;
  }

  /**
   * Track clinical trial enrollment and completion timelines
   */
  async trackClinicalTrials(phase?: string): Promise<ClinicalTrialEvent[]> {
    // TODO: Integrate with ClinicalTrials.gov API
    const mockEvents: ClinicalTrialEvent[] = [];

    for (const event of mockEvents) {
      const daysUntilCompletion = Math.ceil(
        (event.estimatedCompletion.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      event.daysUntilDecision = daysUntilCompletion;

      // Calculate enrollment progress
      const enrollmentProgress = event.currentEnrollment / event.enrollmentTarget;
      event.urgencyScore = this.calculateTrialUrgency(
        daysUntilCompletion,
        event.phase,
        enrollmentProgress
      );

      // Alert if Phase 3 nearing completion (high M&A probability)
      if (event.phase === "Phase 3" && enrollmentProgress >= 0.8) {
        await this.eventBus.publish(
          EventChannels.ISSUE_DETECTED,
          "phase3_nearing_completion",
          {
            drug: event.drug,
            company: event.company,
            enrollmentProgress: `${Math.round(enrollmentProgress * 100)}%`,
            estimatedCompletion: event.estimatedCompletion,
          }
        );
      }
    }

    this.emit("clinical-trials:tracked", { count: mockEvents.length });
    return mockEvents;
  }

  /**
   * Track safety data releases and AdCom meetings
   */
  async trackSafetyData(): Promise<SafetyDataEvent[]> {
    // TODO: Integrate with FDA safety reporting systems
    const mockEvents: SafetyDataEvent[] = [];

    for (const event of mockEvents) {
      event.daysUntilDecision = 0; // Safety events are immediate
      event.urgencyScore = this.calculateSafetyUrgency(
        event.severityLevel,
        event.patientImpact
      );

      // Critical alert for recalls or major safety signals
      if (event.severityLevel === "critical" || event.recallClass === 1) {
        await this.eventBus.publish(
          EventChannels.ISSUE_DETECTED,
          "critical_safety_event",
          {
            drug: event.drug,
            company: event.company,
            severity: event.severityLevel,
            patientImpact: event.patientImpact,
            recallClass: event.recallClass,
          }
        );
      }
    }

    this.emit("safety-data:tracked", { count: mockEvents.length });
    return mockEvents;
  }

  /**
   * Track FDA warning letters (manufacturing violations)
   */
  async trackWarningLetters(): Promise<WarningLetterEvent[]> {
    // TODO: Scrape FDA warning letters database
    const mockEvents: WarningLetterEvent[] = [];

    for (const event of mockEvents) {
      const daysUntilResponse = Math.ceil(
        (event.responseDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      event.daysUntilDecision = daysUntilResponse;
      event.urgencyScore = this.calculateWarningLetterUrgency(
        daysUntilResponse,
        event.violationType,
        event.productionImpact
      );

      // Alert if production halted (severe M&A impact)
      if (event.productionImpact === "halted") {
        await this.eventBus.publish(
          EventChannels.ISSUE_DETECTED,
          "production_halted",
          {
            drug: event.drug,
            company: event.company,
            facility: event.facility,
            violation: event.violationType,
            responseDeadline: event.responseDeadline,
          }
        );
      }
    }

    this.emit("warning-letters:tracked", { count: mockEvents.length });
    return mockEvents;
  }

  /**
   * Calculate PDUFA urgency: closer to date + larger market + positive consensus = higher urgency
   */
  private calculatePDUFAUrgency(
    daysRemaining: number,
    marketSize: number,
    consensus: "approve" | "reject" | "uncertain"
  ): number {
    if (daysRemaining <= 0) return 1000;
    const timeComponent = 1 / Math.sqrt(daysRemaining);
    const marketComponent = Math.log10(Math.max(marketSize, 1));
    const consensusMultiplier = consensus === "approve" ? 1.5 : consensus === "uncertain" ? 1.2 : 0.8;
    return Math.round(timeComponent * marketComponent * consensusMultiplier * 100);
  }

  /**
   * Calculate trial urgency: Phase 3 + high enrollment + near completion = highest urgency
   */
  private calculateTrialUrgency(
    daysRemaining: number,
    phase: string,
    enrollmentProgress: number
  ): number {
    const phaseMultiplier = phase === "Phase 3" ? 2.0 : phase === "Phase 2" ? 1.5 : 1.0;
    const enrollmentMultiplier = 1 + enrollmentProgress;
    const timeComponent = daysRemaining > 0 ? 1 / Math.sqrt(daysRemaining) : 10;
    return Math.round(timeComponent * phaseMultiplier * enrollmentMultiplier * 100);
  }

  /**
   * Calculate safety event urgency: critical severity + high patient impact = maximum urgency
   */
  private calculateSafetyUrgency(
    severity: "critical" | "major" | "minor",
    patientImpact: number
  ): number {
    const severityScore = severity === "critical" ? 1000 : severity === "major" ? 600 : 300;
    const impactComponent = Math.log10(Math.max(patientImpact, 1)) * 50;
    return Math.round(severityScore + impactComponent);
  }

  /**
   * Calculate warning letter urgency: production halted + near deadline = highest urgency
   */
  private calculateWarningLetterUrgency(
    daysUntilResponse: number,
    violation: string,
    productionImpact: "halted" | "reduced" | "monitored"
  ): number {
    const impactScore = productionImpact === "halted" ? 900 : productionImpact === "reduced" ? 600 : 300;
    const violationMultiplier = violation === "manufacturing" ? 1.5 : 1.2;
    const timeComponent = daysUntilResponse > 0 ? 1 / Math.sqrt(daysUntilResponse) : 10;
    return Math.round((impactScore + timeComponent * 50) * violationMultiplier);
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
 * PDUFA Date Conversion (from Healthcare M&A taxonomy):
 * - 0-60 days to PDUFA: 90% acquisition probability
 * - 60-180 days: 78% probability
 * - AdCom positive vote: +15% probability boost
 * - Breakthrough designation: +20% probability boost
 *
 * Clinical Trial Conversion:
 * - Phase 3 completion imminent: 85% acquisition probability
 * - Phase 2 positive interim data: 72% probability
 * - Enrollment ahead of schedule: +10% probability boost
 *
 * Safety Event Conversion:
 * - Critical safety signal: -40% acquisition probability (but distressed asset opportunity)
 * - Class 1 recall: 60% fire-sale acquisition probability
 * - Warning letter + production halt: 55% distressed acquisition probability
 */
