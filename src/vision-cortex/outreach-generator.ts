/**
 * Outreach Script Generator - 3-line templates with dynamic field insertion
 *
 * Template structure (from taxonomy):
 * Line 1: PROOF - "Your score dropped 80 points last month"
 * Line 2: PROBLEM - "Traditional banks won't approve"
 * Line 3: SOLUTION + DEADLINE - "We specialize in credit rebuildersâ€”approved in 48 hours"
 *
 * Generate variations for: email, SMS, phone script, LinkedIn InMail
 * A/B testing framework to optimize conversion rates
 */

import { EventEmitter } from "events";
import type { ScoredSignal } from "./scoring-engine";

export interface OutreachTemplate {
  templateId: string;
  name: string;
  channel: "email" | "sms" | "phone" | "linkedin";
  proof: string; // Line 1: specific data point
  problem: string; // Line 2: pain point they're facing
  solution: string; // Line 3: our solution + urgency/deadline
  subjectLine?: string; // For email
  callToAction: string;
  variables: string[]; // {{entityName}}, {{deadline}}, etc.
}

export interface GeneratedOutreach {
  templateId: string;
  channel: "email" | "sms" | "phone" | "linkedin";
  signal: ScoredSignal;
  subject?: string;
  body: string;
  metadata: {
    generatedAt: Date;
    variantsGenerated: number;
    estimatedConversion: number; // Based on A/B test history
  };
}

export class OutreachGenerator extends EventEmitter {
  private templates: Map<string, OutreachTemplate> = new Map();
  private conversionHistory: Map<
    string,
    { sent: number; responses: number }
  > = new Map();

  constructor() {
    super();
    this.initializeDefaultTemplates();
  }

  /**
   * Generate outreach message from signal
   */
  generateOutreach(
    signal: ScoredSignal,
    channel: "email" | "sms" | "phone" | "linkedin"
  ): GeneratedOutreach {
    // Select best template for signal type and channel
    const template = this.selectTemplate(signal, channel);

    // Fill in variables
    const filled = this.fillTemplate(template, signal);

    // Get estimated conversion from A/B test history
    const estimatedConversion = this.getEstimatedConversion(template.templateId);

    this.emit("outreach:generated", {
      signalId: signal.signalId,
      channel,
      templateId: template.templateId,
    });

    return {
      templateId: template.templateId,
      channel,
      signal,
      subject: filled.subject,
      body: filled.body,
      metadata: {
        generatedAt: new Date(),
        variantsGenerated: 1, // Can generate multiple variants for A/B test
        estimatedConversion,
      },
    };
  }

  /**
   * Select best template for signal type and channel
   */
  private selectTemplate(
    signal: ScoredSignal,
    channel: "email" | "sms" | "phone" | "linkedin"
  ): OutreachTemplate {
    // Find templates matching channel and signal type
    const candidates = Array.from(this.templates.values()).filter(
      (t) => t.channel === channel && t.name.includes(signal.signalType)
    );

    if (candidates.length === 0) {
      // Fallback to generic template
      return this.getGenericTemplate(channel);
    }

    // Select template with best conversion history
    return candidates.reduce((best, current) => {
      const bestConversion = this.getEstimatedConversion(best.templateId);
      const currentConversion = this.getEstimatedConversion(current.templateId);
      return currentConversion > bestConversion ? current : best;
    });
  }

  /**
   * Fill template variables with signal data
   */
  private fillTemplate(
    template: OutreachTemplate,
    signal: ScoredSignal
  ): { subject?: string; body: string } {
    const variables = this.extractVariables(signal);

    // Replace variables in template
    let body = `${template.proof}\n\n${template.problem}\n\n${template.solution}\n\n${template.callToAction}`;
    let subject = template.subjectLine || "";

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      body = body.replace(new RegExp(placeholder, "g"), String(value));
      subject = subject.replace(new RegExp(placeholder, "g"), String(value));
    }

    return { subject: subject || undefined, body };
  }

  /**
   * Extract variables from signal for template filling
   */
  private extractVariables(signal: ScoredSignal): Record<string, unknown> {
    const { entity, data, triggers, daysToWin } = signal;

    return {
      entityName: entity.name,
      entityType: entity.type,
      deadline: this.formatDeadline(data.deadline as Date | undefined),
      daysRemaining: daysToWin,
      urgencyScore: Math.round(triggers.urgency || 0),
      financialStress: Math.round(triggers.financialStress || 0),
      value: data.propertyValue || data.dealSize || data.revenue || "undisclosed",
      industry: data.industry || "your industry",
      location: data.location || data.city || "your area",
      painPoint: this.identifyPainPoint(signal),
      solution: this.identifySolution(signal),
    };
  }

  /**
   * Format deadline for human readability
   */
  private formatDeadline(deadline: Date | undefined): string {
    if (!deadline) return "soon";
    const days = Math.ceil(
      (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (days <= 0) return "today";
    if (days === 1) return "tomorrow";
    if (days <= 7) return `in ${days} days`;
    if (days <= 30) return `in ${Math.ceil(days / 7)} weeks`;
    return `in ${Math.ceil(days / 30)} months`;
  }

  /**
   * Identify primary pain point from triggers
   */
  private identifyPainPoint(signal: ScoredSignal): string {
    const { triggers } = signal;

    if ((triggers.urgency || 0) >= 80) return "tight deadline pressure";
    if ((triggers.financialStress || 0) >= 70) return "cash flow challenges";
    if ((triggers.operationalDisruption || 0) >= 60) return "operational bottlenecks";
    if ((triggers.competitiveThreat || 0) >= 60) return "competitive market pressure";
    if ((triggers.regulatoryRisk || 0) >= 60) return "regulatory compliance issues";
    return "strategic challenges";
  }

  /**
   * Identify our solution from playbook
   */
  private identifySolution(signal: ScoredSignal): string {
    const { playbook } = signal;

    switch (playbook) {
      case "rescue":
        return "fast cash acquisition with 7-day close";
      case "buy":
        return "strategic acquisition with premium valuation";
      case "partner":
        return "partnership to solve operational gaps";
      case "refinance":
        return "refinancing with extended runway";
      case "litigate":
        return "legal recovery services";
      default:
        return "tailored solution";
    }
  }

  /**
   * Get estimated conversion rate from historical data
   */
  private getEstimatedConversion(templateId: string): number {
    const history = this.conversionHistory.get(templateId);
    if (!history || history.sent === 0) return 0.5; // Default 50%

    return history.responses / history.sent;
  }

  /**
   * Get generic fallback template
   */
  private getGenericTemplate(
    channel: "email" | "sms" | "phone" | "linkedin"
  ): OutreachTemplate {
    const templates: Record<string, OutreachTemplate> = {
      email: {
        templateId: "generic-email",
        name: "Generic Email",
        channel: "email",
        proof: "We noticed {{entityName}} is facing {{painPoint}}.",
        problem: "Most companies in {{industry}} struggle with this during critical windows.",
        solution: "We specialize in {{solution}}â€”with proven results in {{location}}. Let's discuss {{deadline}}.",
        subjectLine: "{{entityName}} - {{solution}}",
        callToAction: "Reply to this email or call me at [PHONE] to discuss.",
        variables: ["entityName", "painPoint", "industry", "solution", "location", "deadline"],
      },
      sms: {
        templateId: "generic-sms",
        name: "Generic SMS",
        channel: "sms",
        proof: "{{entityName}}: We see {{painPoint}}.",
        problem: "{{industry}} deadline {{deadline}}.",
        solution: "We offer {{solution}}. Call [PHONE]?",
        callToAction: "Reply YES for details.",
        variables: ["entityName", "painPoint", "industry", "deadline", "solution"],
      },
      phone: {
        templateId: "generic-phone",
        name: "Generic Phone Script",
        channel: "phone",
        proof: "Hi, I'm calling about {{entityName}}. I noticed you're dealing with {{painPoint}}.",
        problem: "With the {{deadline}} deadline, this is a critical window.",
        solution: "We specialize in {{solution}}. Can we schedule 15 minutes this week?",
        callToAction: "When would be a good time?",
        variables: ["entityName", "painPoint", "deadline", "solution"],
      },
      linkedin: {
        templateId: "generic-linkedin",
        name: "Generic LinkedIn InMail",
        channel: "linkedin",
        proof: "Saw {{entityName}} is navigating {{painPoint}}.",
        problem: "I work with {{industry}} companies facing similar challenges.",
        solution: "We offer {{solution}}. Would you be open to a brief conversation {{deadline}}?",
        subjectLine: "Re: {{entityName}} - {{painPoint}}",
        callToAction: "Let me know if you'd like to connect.",
        variables: ["entityName", "painPoint", "industry", "solution", "deadline"],
      },
    };

    return templates[channel];
  }

  /**
   * Initialize default templates (industry-specific)
   */
  private initializeDefaultTemplates(): void {
    // FORECLOSURE template
    this.templates.set("foreclosure-email", {
      templateId: "foreclosure-email",
      name: "Foreclosure Email",
      channel: "email",
      proof: "I see {{entityName}} has a foreclosure auction scheduled {{deadline}}.",
      problem: "With the auction date approaching, traditional buyers won't have time to close.",
      solution: "We specialize in pre-foreclosure purchasesâ€”all cash, no contingencies, close in 7 days. We've helped 200+ homeowners avoid foreclosure.",
      subjectLine: "{{entityName}} - Stop Foreclosure Before {{deadline}}",
      callToAction: "Call me at [PHONE] today. Time is critical.",
      variables: ["entityName", "deadline"],
    });

    // PDUFA template
    this.templates.set("pdufa-email", {
      templateId: "pdufa-email",
      name: "PDUFA Email",
      channel: "email",
      proof: "{{entityName}}'s PDUFA date is {{deadline}}â€”we're tracking this closely.",
      problem: "With approval imminent, strategic acquirers are circling. The next 60 days determine your outcome.",
      solution: "We connect biotech companies with strategic partners pre-approval. Our clients average 2.3x valuation vs post-approval acquisitions.",
      subjectLine: "{{entityName}} - PDUFA Approval Strategy",
      callToAction: "Let's discuss your exit strategy. Reply or call [PHONE].",
      variables: ["entityName", "deadline"],
    });

    // C-SUITE DEPARTURE template
    this.templates.set("talent-exodus-email", {
      templateId: "talent-exodus-email",
      name: "Talent Exodus Email",
      channel: "email",
      proof: "We noticed {{entityName}} recently had {{value}} executive departures.",
      problem: "Talent exodus signals deeper issuesâ€”investors, customers, and competitors are watching.",
      solution: "We help companies stabilize during leadership transitions: interim executives, retention packages, strategic messaging. Act before the next departure.",
      subjectLine: "{{entityName}} - Leadership Transition Support",
      callToAction: "Can we schedule 30 minutes this week? Reply or call [PHONE].",
      variables: ["entityName", "value"],
    });

    // LAWSUIT template
    this.templates.set("lawsuit-email", {
      templateId: "lawsuit-email",
      name: "Lawsuit Email",
      channel: "email",
      proof: "{{entityName}} has a {{value}} lawsuit with statute of limitations {{deadline}}.",
      problem: "If you don't file by {{deadline}}, you lose the right to recover damages.",
      solution: "We specialize in commercial litigation recoveryâ€”contingency basis, no upfront cost. We've recovered $500M+ for clients.",
      subjectLine: "{{entityName}} - Statute of Limitations {{deadline}}",
      callToAction: "Call [PHONE] immediately. Time is running out.",
      variables: ["entityName", "value", "deadline"],
    });

    // REFINANCE template
    this.templates.set("refinance-email", {
      templateId: "refinance-email",
      name: "Refinance Email",
      channel: "email",
      proof: "{{entityName}}'s debt matures {{deadline}}â€”current rates are unfavorable.",
      problem: "With {{financialStress}}% debt-to-income, traditional lenders won't refinance.",
      solution: "We structure creative financing: extended terms, lower payments, bridge to permanent financing. No prepayment penalties.",
      subjectLine: "{{entityName}} - Refinance Before {{deadline}}",
      callToAction: "Get a quote today: [PHONE] or reply to this email.",
      variables: ["entityName", "deadline", "financialStress"],
    });
  }

  /**
   * Record outreach response for A/B testing
   */
  recordResponse(templateId: string, responded: boolean): void {
    const history = this.conversionHistory.get(templateId) || {
      sent: 0,
      responses: 0,
    };

    history.sent++;
    if (responded) history.responses++;

    this.conversionHistory.set(templateId, history);

    this.emit("outreach:response-recorded", {
      templateId,
      conversionRate: history.responses / history.sent,
    });
  }

  /**
   * Generate A/B test variants (change wording, order, CTA)
   */
  generateVariants(
    signal: ScoredSignal,
    channel: "email" | "sms" | "phone" | "linkedin",
    count: number = 2
  ): GeneratedOutreach[] {
    const variants: GeneratedOutreach[] = [];

    for (let i = 0; i < count; i++) {
      const outreach = this.generateOutreach(signal, channel);

      // TODO: Actually vary the wording (different CTAs, proof ordering, etc.)
      // For now, just generate same template multiple times
      variants.push(outreach);
    }

    return variants;
  }

  /**
   * Get conversion metrics for all templates
   */
  getMetrics(): Record<
    string,
    { sent: number; responses: number; conversionRate: number }
  > {
    const metrics: Record<
      string,
      { sent: number; responses: number; conversionRate: number }
    > = {};

    for (const [templateId, history] of this.conversionHistory.entries()) {
      metrics[templateId] = {
        sent: history.sent,
        responses: history.responses,
        conversionRate: history.sent > 0 ? history.responses / history.sent : 0,
      };
    }

    return metrics;
  }
}
