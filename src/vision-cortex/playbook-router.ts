/**
 * Playbook Router - Decision tree execution and routing logic
 *
 * Routes scored signals to specialized playbooks based on:
 * - Signal type (foreclosure, PDUFA, talent exodus, etc.)
 * - Score threshold (high/medium/low)
 * - Trigger combination (urgency + financial stress â†’ rescue vs buy)
 *
 * Playbooks: buy, partner, refinance, rescue, litigate, walk
 * Each playbook has decision tree: if data missing â†’ fetch; if score low â†’ switch play
 */

import { EventEmitter } from "events";
import type { ScoredSignal } from "./scoring-engine";

export interface PlaybookAction {
  actionId: string;
  type: "fetch_data" | "contact" | "offer" | "negotiate" | "close" | "abort";
  description: string;
  requiredData?: string[];
  optional: boolean;
  estimatedTimeHours: number;
  successCriteria: string;
}

export interface PlaybookResult {
  playbookName: string;
  signal: ScoredSignal;
  actions: PlaybookAction[];
  estimatedTimeline: string;
  successProbability: number;
  fallbackPlaybook?: string;
}

export class PlaybookRouter extends EventEmitter {
  /**
   * Route signal to appropriate playbook and return action plan
   */
  routeToPlaybook(signal: ScoredSignal): PlaybookResult {
    const playbookName = signal.playbook;

    // Check if we have required data, otherwise fetch first
    const missingData = this.checkMissingData(signal);
    if (missingData.length > 0) {
      return this.createDataFetchPlaybook(signal, missingData);
    }

    // Route to specialized playbook
    switch (playbookName) {
      case "rescue":
        return this.rescuePlaybook(signal);
      case "buy":
        return this.buyPlaybook(signal);
      case "partner":
        return this.partnerPlaybook(signal);
      case "refinance":
        return this.refinancePlaybook(signal);
      case "litigate":
        return this.litigatePlaybook(signal);
      case "walk":
        return this.walkPlaybook(signal);
      default:
        return this.buyPlaybook(signal); // Default
    }
  }

  /**
   * Check for missing required data
   */
  private checkMissingData(signal: ScoredSignal): string[] {
    const missing: string[] = [];
    const { data } = signal;

    // Common required fields
    if (!data.contactInfo) missing.push("contactInfo");
    if (!data.decisionMaker) missing.push("decisionMaker");
    if (signal.entity.type === "company" && !data.revenue) missing.push("revenue");
    if (signal.entity.type === "property" && !data.propertyValue) missing.push("propertyValue");

    return missing;
  }

  /**
   * Data fetch playbook - gather missing information first
   */
  private createDataFetchPlaybook(
    signal: ScoredSignal,
    missingData: string[]
  ): PlaybookResult {
    const actions: PlaybookAction[] = missingData.map((field, index) => ({
      actionId: `fetch-${field}-${index}`,
      type: "fetch_data",
      description: `Fetch ${field} from public sources`,
      requiredData: [],
      optional: false,
      estimatedTimeHours: 2,
      successCriteria: `${field} found and validated`,
    }));

    // Add re-score action after fetching data
    actions.push({
      actionId: "re-score",
      type: "contact",
      description: "Re-score signal with complete data and route to appropriate playbook",
      optional: false,
      estimatedTimeHours: 0.5,
      successCriteria: "Signal re-scored and routed",
    });

    this.emit("playbook:routed", {
      signalId: signal.signalId,
      playbook: "data_fetch",
      missingData,
    });

    return {
      playbookName: "data_fetch",
      signal,
      actions,
      estimatedTimeline: `${actions.length * 2} hours`,
      successProbability: 0.85, // High chance of finding public data
      fallbackPlaybook: signal.playbook, // Return to original playbook after data fetch
    };
  }

  /**
   * RESCUE PLAYBOOK - High urgency + high financial stress
   * Fast cash offer, no contingencies, close in 7-14 days
   */
  private rescuePlaybook(signal: ScoredSignal): PlaybookResult {
    const actions: PlaybookAction[] = [
      {
        actionId: "research-distress",
        type: "fetch_data",
        description: "Research distress signals: debt load, cash runway, pending lawsuits",
        estimatedTimeHours: 4,
        optional: false,
        successCriteria: "Full financial picture obtained",
      },
      {
        actionId: "contact-decision-maker",
        type: "contact",
        description: "Direct contact to decision-maker (skip gatekeepers)",
        estimatedTimeHours: 2,
        optional: false,
        successCriteria: "Call scheduled within 24 hours",
      },
      {
        actionId: "fast-cash-offer",
        type: "offer",
        description: "Present fast cash offer: 70-80% of fair value, no contingencies, close in 7 days",
        estimatedTimeHours: 1,
        optional: false,
        successCriteria: "Offer delivered and acknowledged",
      },
      {
        actionId: "urgency-reminder",
        type: "negotiate",
        description: "Remind of deadline pressure (auction, foreclosure, bankruptcy filing)",
        estimatedTimeHours: 1,
        optional: false,
        successCriteria: "Decision timeline established",
      },
      {
        actionId: "close-fast",
        type: "close",
        description: "Execute rapid close: wire funds, minimal due diligence",
        estimatedTimeHours: 24,
        optional: false,
        successCriteria: "Deal closed within 14 days",
      },
    ];

    return {
      playbookName: "rescue",
      signal,
      actions,
      estimatedTimeline: "7-14 days",
      successProbability: signal.probabilityToWin,
      fallbackPlaybook: "walk", // If they reject fast cash, probably shopping for better deal
    };
  }

  /**
   * BUY PLAYBOOK - Strategic acquisition, lower urgency
   * Full due diligence, negotiate best terms, 30-90 day close
   */
  private buyPlaybook(signal: ScoredSignal): PlaybookResult {
    const actions: PlaybookAction[] = [
      {
        actionId: "full-analysis",
        type: "fetch_data",
        description: "Complete financial analysis: 3 years financials, market position, growth projections",
        estimatedTimeHours: 20,
        optional: false,
        successCriteria: "Investment memo completed",
      },
      {
        actionId: "warm-intro",
        type: "contact",
        description: "Warm introduction through mutual connection (LinkedIn, board member)",
        estimatedTimeHours: 8,
        optional: true,
        successCriteria: "Intro call scheduled",
      },
      {
        actionId: "strategic-pitch",
        type: "offer",
        description: "Present strategic rationale: synergies, market expansion, talent acquisition",
        estimatedTimeHours: 4,
        optional: false,
        successCriteria: "LOI signed",
      },
      {
        actionId: "due-diligence",
        type: "negotiate",
        description: "Full due diligence: legal, financial, operational, technical",
        estimatedTimeHours: 120,
        optional: false,
        successCriteria: "DD complete, no material issues",
      },
      {
        actionId: "negotiate-terms",
        type: "negotiate",
        description: "Negotiate final terms: price, earnout, employment agreements",
        estimatedTimeHours: 40,
        optional: false,
        successCriteria: "Purchase agreement signed",
      },
      {
        actionId: "close-deal",
        type: "close",
        description: "Close transaction with full legal protections",
        estimatedTimeHours: 80,
        optional: false,
        successCriteria: "Deal closed, ownership transferred",
      },
    ];

    return {
      playbookName: "buy",
      signal,
      actions,
      estimatedTimeline: "60-90 days",
      successProbability: signal.probabilityToWin * 0.9, // Longer timeline reduces probability
      fallbackPlaybook: "partner", // If acquisition too expensive, propose partnership
    };
  }

  /**
   * PARTNER PLAYBOOK - Operational disruption, want to avoid full acquisition
   * Joint venture, strategic partnership, revenue share
   */
  private partnerPlaybook(signal: ScoredSignal): PlaybookResult {
    const actions: PlaybookAction[] = [
      {
        actionId: "identify-pain-point",
        type: "fetch_data",
        description: "Identify specific operational pain point we can solve",
        estimatedTimeHours: 8,
        optional: false,
        successCriteria: "Clear value proposition identified",
      },
      {
        actionId: "solution-pitch",
        type: "contact",
        description: "Pitch partnership: we solve X, you provide Y, revenue share Z",
        estimatedTimeHours: 4,
        optional: false,
        successCriteria: "Partnership interest confirmed",
      },
      {
        actionId: "pilot-proposal",
        type: "offer",
        description: "Propose 90-day pilot: low risk, prove value quickly",
        estimatedTimeHours: 2,
        optional: false,
        successCriteria: "Pilot agreement signed",
      },
      {
        actionId: "execute-pilot",
        type: "close",
        description: "Execute pilot, demonstrate value, negotiate long-term partnership",
        estimatedTimeHours: 720, // 90 days
        optional: false,
        successCriteria: "Long-term partnership secured",
      },
    ];

    return {
      playbookName: "partner",
      signal,
      actions,
      estimatedTimeline: "90-120 days",
      successProbability: signal.probabilityToWin * 0.95, // Lower commitment increases probability
      fallbackPlaybook: "buy", // If partnership successful, propose acquisition later
    };
  }

  /**
   * REFINANCE PLAYBOOK - Financial stress but viable business
   * Debt restructuring, new financing, bridge loan
   */
  private refinancePlaybook(signal: ScoredSignal): PlaybookResult {
    const actions: PlaybookAction[] = [
      {
        actionId: "assess-financials",
        type: "fetch_data",
        description: "Assess current debt structure, cash flow, collateral",
        estimatedTimeHours: 12,
        optional: false,
        successCriteria: "Financial model completed",
      },
      {
        actionId: "refinance-proposal",
        type: "offer",
        description: "Propose refinance structure: better terms, extended runway, collateral requirements",
        estimatedTimeHours: 8,
        optional: false,
        successCriteria: "Term sheet accepted",
      },
      {
        actionId: "underwriting",
        type: "negotiate",
        description: "Full underwriting: validate cash flows, assess risk, finalize terms",
        estimatedTimeHours: 40,
        optional: false,
        successCriteria: "Loan approved",
      },
      {
        actionId: "close-financing",
        type: "close",
        description: "Close financing, pay off old debt, establish monitoring covenants",
        estimatedTimeHours: 20,
        optional: false,
        successCriteria: "Financing closed",
      },
    ];

    return {
      playbookName: "refinance",
      signal,
      actions,
      estimatedTimeline: "30-45 days",
      successProbability: signal.probabilityToWin * 0.85,
      fallbackPlaybook: "rescue", // If refinance fails, pivot to acquisition
    };
  }

  /**
   * LITIGATE PLAYBOOK - Legal dispute or recovery opportunity
   * Demand letter, settlement negotiation, litigation if necessary
   */
  private litigatePlaybook(signal: ScoredSignal): PlaybookResult {
    const actions: PlaybookAction[] = [
      {
        actionId: "legal-analysis",
        type: "fetch_data",
        description: "Legal analysis: case strength, statute of limitations, damages estimate",
        estimatedTimeHours: 16,
        optional: false,
        successCriteria: "Legal memo completed",
      },
      {
        actionId: "demand-letter",
        type: "contact",
        description: "Send demand letter: clear claim, damages, settlement deadline",
        estimatedTimeHours: 4,
        optional: false,
        successCriteria: "Demand delivered",
      },
      {
        actionId: "settlement-negotiation",
        type: "negotiate",
        description: "Negotiate settlement: aim for 60-80% of damages, quick resolution",
        estimatedTimeHours: 20,
        optional: false,
        successCriteria: "Settlement reached",
      },
      {
        actionId: "litigate",
        type: "close",
        description: "File lawsuit if settlement fails (this action only if necessary)",
        estimatedTimeHours: 500,
        optional: true,
        successCriteria: "Judgment obtained",
      },
    ];

    return {
      playbookName: "litigate",
      signal,
      actions,
      estimatedTimeline: "45-90 days (settlement) or 12-24 months (litigation)",
      successProbability: signal.probabilityToWin * 0.7, // Litigation risky
      fallbackPlaybook: "walk", // If case weak, abandon
    };
  }

  /**
   * WALK PLAYBOOK - Low score, not worth pursuing
   * Document reason, set alert for future triggers
   */
  private walkPlaybook(signal: ScoredSignal): PlaybookResult {
    const actions: PlaybookAction[] = [
      {
        actionId: "document-reason",
        type: "abort",
        description: `Document why walking: score ${signal.score}, probability ${(signal.probabilityToWin * 100).toFixed(0)}%`,
        estimatedTimeHours: 0.5,
        optional: false,
        successCriteria: "Reason documented",
      },
      {
        actionId: "set-alert",
        type: "fetch_data",
        description: "Set alert for future triggers: if score increases, revisit",
        estimatedTimeHours: 0.5,
        optional: true,
        successCriteria: "Alert configured",
      },
    ];

    return {
      playbookName: "walk",
      signal,
      actions,
      estimatedTimeline: "Immediate",
      successProbability: 0,
      fallbackPlaybook: undefined,
    };
  }

  /**
   * Execute playbook action (placeholder for actual execution)
   */
  executeAction(action: PlaybookAction): Promise<{ success: boolean; result: unknown }> {
    this.emit("action:started", { actionId: action.actionId });

    // TODO: Implement actual action execution
    // - fetch_data: call data sources, scrape websites, query APIs
    // - contact: send email/SMS, make phone call, LinkedIn InMail
    // - offer: generate offer document, send to contact
    // - negotiate: track back-and-forth, update terms
    // - close: generate closing documents, wire funds, file paperwork
    // - abort: mark signal as closed, send to archive

    return Promise.resolve({ success: true, result: "Action executed (placeholder)" });
  }

  /**
   * Get playbook metrics
   */
  getMetrics(): Record<string, { count: number; avgSuccessRate: number }> {
    // TODO: Track actual playbook outcomes
    return {
      rescue: { count: 0, avgSuccessRate: 0.82 },
      buy: { count: 0, avgSuccessRate: 0.68 },
      partner: { count: 0, avgSuccessRate: 0.75 },
      refinance: { count: 0, avgSuccessRate: 0.71 },
      litigate: { count: 0, avgSuccessRate: 0.55 },
      walk: { count: 0, avgSuccessRate: 0 },
    };
  }
}
