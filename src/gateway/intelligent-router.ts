/**
 * 🔀 INTELLIGENT ROUTER - Smart Request Routing & Load Balancing
 * Routes requests to optimal intelligence systems with circuit breakers
 */

import { Request, Response, NextFunction } from 'express';
import { IntelligenceSystem } from './system-registry';
import SystemRegistry from './system-registry';

export interface RoutingRule {
  pattern: string | RegExp;
  targetSystem: string;
  priority: number;
  conditions?: {
    method?: string[];
    headers?: Record<string, string>;
    bodyContains?: string[];
  };
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(private config: CircuitBreakerConfig) {}

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  public getState(): string {
    return this.state;
  }
}

export class IntelligentRouter {
  private routingRules: RoutingRule[] = [];
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private loadBalancer: LoadBalancer;

  constructor() {
    this.initializeDefaultRules();
    this.loadBalancer = new LoadBalancer();
    this.initializeCircuitBreakers();
  }

  private initializeDefaultRules(): void {
    // Vision Cortex routing rules
    this.routingRules = [
      {
        pattern: /^\/api\/vision-cortex/,
        targetSystem: 'vision-cortex',
        priority: 100,
        conditions: { method: ['GET', 'POST'] }
      },
      {
        pattern: /^\/api\/real-estate/,
        targetSystem: 'real-estate',
        priority: 100,
        conditions: { method: ['GET', 'POST'] }
      },
      {
        pattern: /^\/api\/agents/,
        targetSystem: 'agents',
        priority: 100,
        conditions: { method: ['GET', 'POST'] }
      },
      {
        pattern: /^\/api\/analytics/,
        targetSystem: 'analytics',
        priority: 100,
        conditions: { method: ['GET', 'POST'] }
      },
      {
        pattern: /^\/api\/memory/,
        targetSystem: 'memory',
        priority: 100,
        conditions: { method: ['GET', 'POST'] }
      },
      {
        pattern: /^\/api\/security/,
        targetSystem: 'security',
        priority: 100,
        conditions: { method: ['GET', 'POST'] }
      },
      // Smart routing based on content
      {
        pattern: /.*/,
        targetSystem: 'vision-cortex',
        priority: 1,
        conditions: {
          bodyContains: ['quantum', 'reasoning', 'autonomous', 'multi-model']
        }
      },
      {
        pattern: /.*/,
        targetSystem: 'real-estate',
        priority: 1,
        conditions: {
          bodyContains: ['property', 'market', 'real estate', 'valuation', 'investment']
        }
      }
    ];
  }

  private initializeCircuitBreakers(): void {
    const config: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 30000 // 30 seconds
    };

    for (const system of SystemRegistry.getAll()) {
      this.circuitBreakers.set(system.id, new CircuitBreaker(config));
    }
  }

  public async route(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetSystem = await this.findTargetSystem(req);
      
      if (!targetSystem) {
        res.status(404).json({ 
          error: 'No suitable system found for request',
          path: req.path,
          method: req.method
        });
        return;
      }

      // Check system availability and circuit breaker
      const circuitBreaker = this.circuitBreakers.get(targetSystem.id);
      if (!circuitBreaker) {
        throw new Error(`No circuit breaker found for system ${targetSystem.id}`);
      }

      // Execute request through circuit breaker
      await circuitBreaker.execute(async () => {
        await this.forwardRequest(req, res, targetSystem);
      });

    } catch (error) {
      console.error('Routing error:', error);
      res.status(500).json({ 
        error: 'Internal routing error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async findTargetSystem(req: Request): Promise<IntelligenceSystem | null> {
    // Sort rules by priority (highest first)
    const sortedRules = this.routingRules
      .slice()
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.matchesRule(req, rule)) {
        const system = SystemRegistry.get(rule.targetSystem);
        
        if (system && system.health.status === 'online') {
          return system;
        }
        
        // If primary system is down, try load balancer for alternative
        const alternatives = SystemRegistry.getByType(system?.type || 'vision-cortex');
        const onlineAlternative = alternatives.find(alt => 
          alt.id !== rule.targetSystem && alt.health.status === 'online'
        );
        
        if (onlineAlternative) {
          console.log(`🔄 Routing to alternative system: ${onlineAlternative.name}`);
          return onlineAlternative;
        }
      }
    }

    return null;
  }

  private matchesRule(req: Request, rule: RoutingRule): boolean {
    // Check path pattern
    const pathMatches = rule.pattern instanceof RegExp 
      ? rule.pattern.test(req.path)
      : req.path.includes(rule.pattern);

    if (!pathMatches) return false;

    // Check conditions
    if (rule.conditions) {
      // Check method
      if (rule.conditions.method && !rule.conditions.method.includes(req.method)) {
        return false;
      }

      // Check headers
      if (rule.conditions.headers) {
        for (const [key, value] of Object.entries(rule.conditions.headers)) {
          if (req.headers[key.toLowerCase()] !== value) {
            return false;
          }
        }
      }

      // Check body content
      if (rule.conditions.bodyContains && req.body) {
        const bodyString = JSON.stringify(req.body).toLowerCase();
        const hasContent = rule.conditions.bodyContains.some(content => 
          bodyString.includes(content.toLowerCase())
        );
        if (!hasContent) return false;
      }
    }

    return true;
  }

  private async forwardRequest(
    req: Request, 
    res: Response, 
    targetSystem: IntelligenceSystem
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Here you'd implement actual HTTP forwarding
      // For now, simulate the forwarding
      const targetUrl = `${targetSystem.baseUrl}${req.path}`;
      
      console.log(`🎯 Routing ${req.method} ${req.path} → ${targetSystem.name}`);
      
      // Update system metrics
      targetSystem.health.responseTime = Date.now() - startTime;
      targetSystem.health.lastCheck = new Date();
      
      // Mock response for now - replace with actual HTTP forwarding
      res.json({
        routed_to: {
          system: targetSystem.name,
          url: targetUrl,
          method: req.method,
          responseTime: Date.now() - startTime
        },
        circuit_breaker: this.circuitBreakers.get(targetSystem.id)?.getState(),
        original_request: {
          path: req.path,
          method: req.method,
          body: req.body,
          query: req.query
        }
      });
      
    } catch (error) {
      // Update system status on failure
      targetSystem.health.status = 'degraded';
      targetSystem.health.lastCheck = new Date();
      throw error;
    }
  }

  public addRoutingRule(rule: RoutingRule): void {
    this.routingRules.push(rule);
    // Re-sort by priority
    this.routingRules.sort((a, b) => b.priority - a.priority);
  }

  public getRoutingRules(): RoutingRule[] {
    return [...this.routingRules];
  }

  public getCircuitBreakerStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    for (const [systemId, breaker] of this.circuitBreakers) {
      status[systemId] = breaker.getState();
    }
    return status;
  }
}

class LoadBalancer {
  private requestCounts: Map<string, number> = new Map();

  public selectSystem(systems: IntelligenceSystem[]): IntelligenceSystem | null {
    if (systems.length === 0) return null;
    if (systems.length === 1) return systems[0];

    // Round-robin load balancing
    const sortedSystems = systems.sort((a, b) => {
      const countA = this.requestCounts.get(a.id) || 0;
      const countB = this.requestCounts.get(b.id) || 0;
      return countA - countB;
    });

    const selected = sortedSystems[0];
    this.requestCounts.set(selected.id, (this.requestCounts.get(selected.id) || 0) + 1);
    
    return selected;
  }

  public getStats(): Record<string, number> {
    return Object.fromEntries(this.requestCounts);
  }
}

export default IntelligentRouter;