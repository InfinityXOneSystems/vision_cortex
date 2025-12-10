/**
 * Vision Cortex Scoring Engine - Probabilistic deal scoring with timing decay
 *
 * Implements the universal conversion formula from taxonomy:
 * score = (probability-to-win Ã— days-to-win Ã— profit-lift)
 *         Ã— urgency_weight^2 Ã— stress_weight Ã— decay(time)
 *
 * Weights (from taxonomy):
 * - Urgency: highest weight (squared in formula)
 * - Financial stress: 2nd highest
 * - Operational disruption: 3rd
 * - Competitive threat, regulatory risk, strategic vulnerability: tied 4th
 *
 * Decay function: score drops as time passes without action
 */

import { EventEmitter } from "events";

export interface Signal {
  signalId: string;
  signalType: string;
  source: string;
  entity: {
    id: string;
    type: "company" | "property" | "person";
    name: string;
  };
  triggers: {
    urgency?: number; // 0-100 (days to deadline)
    financialStress?: number; // 0-100 (debt load, cash burn)
    operationalDisruption?: number; // 0-100 (tenant loss, production halt)
    competitiveThreat?: number; // 0-100 (market share loss)
    regulatoryRisk?: number; // 0-100 (compliance deadline)
    strategicVulnerability?: number; // 0-100 (tech obsolescence)
  };
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface ScoredSignal extends Signal {
  score: number; // 0-1000
  probabilityToWin: number; // 0-1
  daysToWin: number;
  profitLift: number; // multiplier
  urgencyScore: number;
  decayFactor: number;
  playbook: string;
  priority: "critical" | "high" | "medium" | "low";
}

export class ScoringEngine extends EventEmitter {
  private weights = {
    urgency: 2.5, // Squared in formula
    financialStress: 1.8,
    operationalDisruption: 1.5,
    competitiveThreat: 1.2,
    regulatoryRisk: 1.2,
    strategicVulnerability: 1.2,
  };

  private decayParams = {
    halfLife: 14, // Days until score halves
    minDecay: 0.2, // Never decay below 20%
  };

  /**
   * Score a signal using the universal conversion formula
   */
  scoreSignal(signal: Signal): ScoredSignal {
    // Calculate individual components
    const probabilityToWin = this.calculateProbabilityToWin(signal);
    const daysToWin = this.estimateDaysToWin(signal);
    const profitLift = this.estimateProfitLift(signal);
    const urgencyScore = this.calculateWeightedUrgency(signal.triggers);
    const decayFactor = this.calculateDecay(signal.timestamp);

    // Apply formula: P(win) Ã— days Ã— profit Ã— weights Ã— decay
    const rawScore =
      probabilityToWin *
      Math.log10(daysToWin + 1) * // Log scale for days
      profitLift *
      urgencyScore *
      decayFactor;

    // Normalize to 0-1000 scale
    const score = Math.min(Math.round(rawScore * 100), 1000);

    // Determine playbook based on signal type and score
    const playbook = this.selectPlaybook(signal, score);

    // Assign priority
    const priority = this.assignPriority(score, signal.triggers.urgency || 0);

    const scoredSignal: ScoredSignal = {
      ...signal,
      score,
      probabilityToWin,
      daysToWin,
      profitLift,
      urgencyScore,
      decayFactor,
      playbook,
      priority,
    };

    this.emit("signal:scored", {
      signalId: signal.signalId,
      score,
      priority,
      playbook,
    });

    return scoredSignal;
  }

  /**
   * Calculate probability to win based on trigger intensities
   * Formula: weighted average of all triggers present
   */
  private calculateProbabilityToWin(signal: Signal): number {
    const { triggers } = signal;
    let totalWeight = 0;
    let weightedSum = 0;

    Object.entries(triggers).forEach(([key, value]) => {
      if (value !== undefined) {
        const weight = this.weights[key as keyof typeof this.weights] || 1;
        totalWeight += weight;
        weightedSum += (value / 100) * weight;
      }
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  /**
   * Estimate days to close based on urgency and signal type
   */
  private estimateDaysToWin(signal: Signal): number {
    const urgency = signal.triggers.urgency || 50;

    // Urgency inversely correlates with time (high urgency = short timeline)
    if (urgency >= 90) return 7; // Critical urgency: 1 week
    if (urgency >= 75) return 14; // High urgency: 2 weeks
    if (urgency >= 50) return 30; // Medium urgency: 1 month
    if (urgency >= 25) return 60; // Low urgency: 2 months
    return 90; // Very low urgency: 3 months
  }

  /**
   * Estimate profit lift multiplier based on deal characteristics
   */
  private estimateProfitLift(signal: Signal): number {
    const baseMultiplier = 1.0;

    // Financial stress increases profit potential (distressed pricing)
    const stressMultiplier =
      1 + ((signal.triggers.financialStress || 0) / 100) * 0.5;

    // Operational disruption creates value-add opportunity
    const disruptionMultiplier =
      1 + ((signal.triggers.operationalDisruption || 0) / 100) * 0.3;

    return baseMultiplier * stressMultiplier * disruptionMultiplier;
  }

  /**
   * Calculate weighted urgency score (urgency has highest weight, squared)
   */
  private calculateWeightedUrgency(triggers: Signal["triggers"]): number {
    let score = 0;

    if (triggers.urgency) {
      score +=
        Math.pow(triggers.urgency / 100, 2) * Math.pow(this.weights.urgency, 2);
    }
    if (triggers.financialStress) {
      score +=
        (triggers.financialStress / 100) * this.weights.financialStress;
    }
    if (triggers.operationalDisruption) {
      score +=
        (triggers.operationalDisruption / 100) *
        this.weights.operationalDisruption;
    }
    if (triggers.competitiveThreat) {
      score +=
        (triggers.competitiveThreat / 100) * this.weights.competitiveThreat;
    }
    if (triggers.regulatoryRisk) {
      score += (triggers.regulatoryRisk / 100) * this.weights.regulatoryRisk;
    }
    if (triggers.strategicVulnerability) {
      score +=
        (triggers.strategicVulnerability / 100) *
        this.weights.strategicVulnerability;
    }

    return Math.min(score, 10); // Cap at 10x multiplier
  }

  /**
   * Calculate time decay: score drops as signal ages
   * Formula: decay = max(minDecay, e^(-t/halfLife))
   */
  private calculateDecay(signalTimestamp: Date): number {
    const ageInDays =
      (Date.now() - signalTimestamp.getTime()) / (1000 * 60 * 60 * 24);
    const decay = Math.exp(-ageInDays / this.decayParams.halfLife);
    return Math.max(decay, this.decayParams.minDecay);
  }

  /**
   * Select playbook based on signal type and score
   * Playbooks: buy, partner, refinance, rescue, litigate, walk
   */
  private selectPlaybook(signal: Signal, score: number): string {
    // High urgency + high stress = rescue/buy
    if ((signal.triggers.urgency || 0) >= 80 && (signal.triggers.financialStress || 0) >= 70) {
      return "rescue";
    }

    // High score + low stress = strategic buy
    if (score >= 700 && (signal.triggers.financialStress || 0) < 50) {
      return "buy";
    }

    // Medium score + operational issues = partner
    if (score >= 500 && (signal.triggers.operationalDisruption || 0) >= 60) {
      return "partner";
    }

    // Financial stress + regulatory = refinance
    if ((signal.triggers.financialStress || 0) >= 60 && (signal.triggers.regulatoryRisk || 0) >= 50) {
      return "refinance";
    }

    // Litigation signals = litigate
    if (signal.signalType.includes("lawsuit") || signal.signalType.includes("litigation")) {
      return "litigate";
    }

    // Low score = walk away
    if (score < 300) {
      return "walk";
    }

    return "buy"; // Default
  }

  /**
   * Assign priority tier based on score and urgency
   */
  private assignPriority(
    score: number,
    urgency: number
  ): "critical" | "high" | "medium" | "low" {
    if (score >= 800 || urgency >= 90) return "critical";
    if (score >= 600 || urgency >= 75) return "high";
    if (score >= 400 || urgency >= 50) return "medium";
    return "low";
  }

  /**
   * Batch score multiple signals and return sorted by score
   */
  batchScore(signals: Signal[]): ScoredSignal[] {
    const scored = signals.map((signal) => this.scoreSignal(signal));
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Update weights based on actual win/loss outcomes (feedback loop)
   */
  updateWeights(outcomes: Array<{ signal: ScoredSignal; won: boolean }>): void {
    // TODO: Implement machine learning weight adjustment
    // For now, simple heuristic: increase weights for winning signals
    const winningSignals = outcomes.filter((o) => o.won);
    const totalWins = winningSignals.length;

    if (totalWins === 0) return;

    // Calculate average trigger values for winning signals
    const avgTriggers: Record<string, number> = {};
    Object.keys(this.weights).forEach((key) => {
      const sum = winningSignals.reduce(
        (acc, o) => acc + (o.signal.triggers[key as keyof typeof o.signal.triggers] || 0),
        0
      );
      avgTriggers[key] = sum / totalWins;
    });

    // Adjust weights proportionally (increase high-value triggers)
    Object.keys(this.weights).forEach((key) => {
      const currentWeight = this.weights[key as keyof typeof this.weights];
      const triggerValue = avgTriggers[key];
      const adjustment = ((triggerValue ?? 0) / 100) * 0.1; // 10% max adjustment
      this.weights[key as keyof typeof this.weights] = currentWeight * (1 + adjustment);
    });

    this.emit("weights:updated", { weights: this.weights });
  }
}

