/**
 * 🏥 HEALTH MONITOR
 * Monitors system health and performance metrics
 */

import { EventEmitter } from 'events';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, boolean>;
  metrics: {
    uptime: number;
    memory_usage: number;
    response_time: number;
    error_rate: number;
  };
  timestamp: string;
}

export class HealthMonitor extends EventEmitter {
  private healthChecks: Map<string, () => Promise<boolean>> = new Map();
  private metrics = {
    startTime: Date.now(),
    totalRequests: 0,
    errorCount: 0,
    responseTimeSum: 0
  };

  public registerHealthCheck(name: string, checkFn: () => Promise<boolean>): void {
    this.healthChecks.set(name, checkFn);
  }

  public async getHealthStatus(): Promise<HealthStatus> {
    const services: Record<string, boolean> = {};
    
    for (const [name, checkFn] of this.healthChecks) {
      try {
        services[name] = await checkFn();
      } catch {
        services[name] = false;
      }
    }

    const healthyServices = Object.values(services).filter(Boolean).length;
    const totalServices = Object.keys(services).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyServices === totalServices) status = 'healthy';
    else if (healthyServices > totalServices * 0.5) status = 'degraded';
    else status = 'unhealthy';

    return {
      status,
      services,
      metrics: {
        uptime: Date.now() - this.metrics.startTime,
        memory_usage: process.memoryUsage().heapUsed / 1024 / 1024,
        response_time: this.metrics.totalRequests > 0 ? this.metrics.responseTimeSum / this.metrics.totalRequests : 0,
        error_rate: this.metrics.totalRequests > 0 ? this.metrics.errorCount / this.metrics.totalRequests : 0
      },
      timestamp: new Date().toISOString()
    };
  }

  public recordRequest(responseTime: number, isError = false): void {
    this.metrics.totalRequests++;
    this.metrics.responseTimeSum += responseTime;
    if (isError) this.metrics.errorCount++;
  }
}