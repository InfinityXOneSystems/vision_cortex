/**
 * Countdown Alert System - T-30/14/7/2 day alerts for every time-based trigger
 *
 * Monitors all signals with deadlines and fires alerts at critical thresholds:
 * - T-30 days: Early warning (plan strategy)
 * - T-14 days: Action required (initiate contact)
 * - T-7 days: Urgent (close imminent)
 * - T-2 days: Critical (last chance)
 */

import { EventEmitter } from "events";
import { RedisEventBus, EventChannels } from "../utils/redis-event-bus";
import type { ScoredSignal } from "./scoring-engine";

export interface Alert {
  alertId: string;
  signalId: string;
  entity: {
    id: string;
    name: string;
    type: string;
  };
  deadline: Date;
  daysRemaining: number;
  threshold: 30 | 14 | 7 | 2;
  priority: "critical" | "high" | "medium";
  message: string;
  actionItems: string[];
  createdAt: Date;
  acknowledged: boolean;
}

export class CountdownAlertSystem extends EventEmitter {
  private eventBus: RedisEventBus;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private activeAlerts: Map<string, Alert> = new Map();
  private firedAlerts: Set<string> = new Set(); // Track to avoid duplicates

  constructor(redisConfig?: { host: string; port: number }) {
    super();
    this.eventBus = new RedisEventBus(redisConfig);
  }

  async initialize(): Promise<void> {
    await this.eventBus.connect();
    this.emit("alert-system:initialized");
  }

  /**
   * Start monitoring signals for countdown alerts (check every 6 hours)
   */
  startMonitoring(intervalHours: number = 6): void {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    this.monitoringInterval = setInterval(async () => {
      await this.checkAllDeadlines();
    }, intervalMs);

    this.checkAllDeadlines(); // Initial check
    this.emit("alert-system:started", { intervalHours });
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.emit("alert-system:stopped");
    }
  }

  /**
   * Add a signal to monitoring (extract deadline from signal data)
   */
  addSignal(signal: ScoredSignal): void {
    const deadline = this.extractDeadline(signal);
    if (!deadline) return; // No deadline, skip

    const daysRemaining = this.calculateDaysRemaining(deadline);
    const thresholds: Array<30 | 14 | 7 | 2> = [30, 14, 7, 2];

    // Check if any threshold crossed
    for (const threshold of thresholds) {
      if (daysRemaining <= threshold && daysRemaining > 0) {
        const alertKey = `${signal.signalId}-T${threshold}`;

        // Skip if already fired
        if (this.firedAlerts.has(alertKey)) continue;

        const alert = this.createAlert(signal, deadline, threshold);
        this.activeAlerts.set(alert.alertId, alert);
        this.firedAlerts.add(alertKey);

        // Emit alert
        this.emit("alert:triggered", alert);

        // Publish to event bus
        this.eventBus.publish(EventChannels.ISSUE_DETECTED, "deadline_alert", {
          alertId: alert.alertId,
          entity: alert.entity.name,
          daysRemaining: alert.daysRemaining,
          threshold: alert.threshold,
          priority: alert.priority,
        });
      }
    }
  }

  /**
   * Check all monitored signals for new alerts
   */
  private async checkAllDeadlines(): Promise<void> {
    // TODO: Query all active signals from database
    // For now, this is triggered by addSignal() calls
    this.emit("alert-system:check-complete", {
      activeAlerts: this.activeAlerts.size,
      timestamp: new Date(),
    });
  }

  /**
   * Extract deadline from signal data (various formats)
   */
  private extractDeadline(signal: ScoredSignal): Date | null {
    const { data } = signal;

    // Check common deadline field names
    const deadlineFields = [
      "deadline",
      "auctionDate",
      "saleDate",
      "hearingDate",
      "pdufaDate",
      "buyoutDeadline",
      "responseDeadline",
      "expirationDate",
      "maturityDate",
    ];

    for (const field of deadlineFields) {
      if (data[field]) {
        const date = new Date(data[field] as string);
        if (!isNaN(date.getTime())) return date;
      }
    }

    return null;
  }

  /**
   * Calculate days remaining until deadline
   */
  private calculateDaysRemaining(deadline: Date): number {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Create alert object with action items
   */
  private createAlert(
    signal: ScoredSignal,
    deadline: Date,
    threshold: 30 | 14 | 7 | 2
  ): Alert {
    const daysRemaining = this.calculateDaysRemaining(deadline);
    const priority = this.determinePriority(threshold, signal.priority);
    const message = this.generateMessage(signal, daysRemaining, threshold);
    const actionItems = this.generateActionItems(signal, threshold);

    return {
      alertId: `${signal.signalId}-T${threshold}-${Date.now()}`,
      signalId: signal.signalId,
      entity: signal.entity,
      deadline,
      daysRemaining,
      threshold,
      priority,
      message,
      actionItems,
      createdAt: new Date(),
      acknowledged: false,
    };
  }

  /**
   * Determine alert priority based on threshold and signal priority
   */
  private determinePriority(
    threshold: number,
    signalPriority: string
  ): "critical" | "high" | "medium" {
    if (threshold <= 2) return "critical";
    if (threshold <= 7 && signalPriority === "critical") return "critical";
    if (threshold <= 7) return "high";
    if (threshold <= 14 && signalPriority === "critical") return "high";
    return "medium";
  }

  /**
   * Generate human-readable alert message
   */
  private generateMessage(
    signal: ScoredSignal,
    daysRemaining: number,
    threshold: number
  ): string {
    const entityName = signal.entity.name;
    const deadlineType = signal.signalType;

    if (threshold === 2) {
      return `🚨 CRITICAL: ${entityName} - ${deadlineType} in ${daysRemaining} days! Last chance to act.`;
    }
    if (threshold === 7) {
      return `⚠️ URGENT: ${entityName} - ${deadlineType} in ${daysRemaining} days. Close imminent.`;
    }
    if (threshold === 14) {
      return `📢 ACTION REQUIRED: ${entityName} - ${deadlineType} in ${daysRemaining} days. Initiate contact now.`;
    }
    return `📋 EARLY WARNING: ${entityName} - ${deadlineType} in ${daysRemaining} days. Plan strategy.`;
  }

  /**
   * Generate action items based on threshold
   */
  private generateActionItems(
    signal: ScoredSignal,
    threshold: number
  ): string[] {
    const playbook = signal.playbook;

    if (threshold === 2) {
      return [
        "Make final offer immediately",
        "Escalate to decision-maker",
        "Prepare alternative exit if rejected",
      ];
    }
    if (threshold === 7) {
      return [
        "Send personalized outreach (see template)",
        "Schedule call within 24 hours",
        "Prepare term sheet",
      ];
    }
    if (threshold === 14) {
      return [
        `Execute ${playbook} playbook`,
        "Research entity background",
        "Draft initial outreach message",
      ];
    }
    return [
      "Add to prospect pipeline",
      "Set up monitoring for updates",
      "Prepare preliminary analysis",
    ];
  }

  /**
   * Acknowledge alert (mark as seen)
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    this.emit("alert:acknowledged", { alertId });
    return true;
  }

  /**
   * Get all active (unacknowledged) alerts
   */
  getActiveAlerts(priority?: "critical" | "high" | "medium"): Alert[] {
    const alerts = Array.from(this.activeAlerts.values()).filter(
      (alert) => !alert.acknowledged
    );

    if (priority) {
      return alerts.filter((alert) => alert.priority === priority);
    }

    return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  /**
   * Get alert metrics
   */
  getMetrics(): {
    totalAlerts: number;
    activeAlerts: number;
    criticalAlerts: number;
    acknowledgedAlerts: number;
  } {
    const alerts = Array.from(this.activeAlerts.values());
    return {
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter((a) => !a.acknowledged).length,
      criticalAlerts: alerts.filter(
        (a) => a.priority === "critical" && !a.acknowledged
      ).length,
      acknowledgedAlerts: alerts.filter((a) => a.acknowledged).length,
    };
  }

  /**
   * Cleanup old alerts (> 30 days past deadline)
   */
  cleanupOldAlerts(): number {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    let removed = 0;

    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.deadline.getTime() < thirtyDaysAgo) {
        this.activeAlerts.delete(alertId);
        removed++;
      }
    }

    if (removed > 0) {
      this.emit("alerts:cleaned", { removed });
    }

    return removed;
  }

  async cleanup(): Promise<void> {
    this.stopMonitoring();
    await this.eventBus.disconnect();
  }
}
