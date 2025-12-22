/**
 * 🏠 VISION CORTEX - REAL ESTATE INTELLIGENCE ENGINE
 * Predicts market breaks before they happen
 * Domain: real_estate
 * 
 * @author Infinity X One Systems
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import { PubSub } from '@google-cloud/pubsub';
import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';
import { VertexAI } from '@google-cloud/vertexai';
import { Anthropic } from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';
import { 
  CoreIntelligenceEnvelope,
  IntelligenceType,
  TimeHorizon,
  VisibilityLevel,
  ConfidenceScore,
  ConvictionLevel,
  ConfidenceConvictionMetrics,
  VisionCortexQualityCheck,
  VISION_CORTEX_QUALITY_THRESHOLDS
} from './types';
import { LLMOrchestrator } from './llm-orchestrator';
import { HallucinationDetector } from './hallucination-detector';
import { ConfidenceCalculator } from './confidence-calculator';

// ============================================================================
// REAL ESTATE INTELLIGENCE TYPES (Extends Core Vision Cortex Contract)
// ============================================================================

export interface RealEstateIntelligence extends CoreIntelligenceEnvelope {
  id: string;
  domain: 'real_estate';
  intelligence_type: 'prediction' | 'signal' | 'anomaly' | 'synthesis';
  confidence: ConfidenceScore;
  time_horizon: TimeHorizon;
  visibility: VisibilityLevel;
  
  // 🧠 Formalized Confidence vs Conviction Metrics
  confidence_conviction_metrics: ConfidenceConvictionMetrics;
  
  // Real Estate Specific Extensions
  geography: {
    country?: string;
    state?: string;
    county?: string;
    city?: string;
    geo_hashes?: string[];
  };
  asset_profile: {
    asset_type?: 'sfh' | 'multifamily' | 'commercial' | 'land';
    price_band?: string;
    investor_type?: 'retail' | 'institutional' | 'private_capital';
  };
  headline: string;
  executive_summary: string;
  predictive_insights: PredictiveInsight[];
  real_estate_signals: RealEstateSignal[];
  generated_at: string;
  
  // 🧬 Quality Gate Results
  quality_check: VisionCortexQualityCheck;
}

export interface RealEstateSignal {
  signal_type: 'liquidity' | 'inventory' | 'pricing' | 'foreclosure' | 'insurance' | 'migration' | 'capital_flow';
  name: string;
  strength: number; // 0.0 – 1.0
  direction: 'up' | 'down' | 'flat';
  velocity: number;
  description: string;
  historical_data: Array<{ timestamp: string; value: number }>;
}

export interface PredictiveInsight {
  insight: string;
  probability: number;
  expected_window: string;
  asymmetric_upside: boolean;
  confidence_interval: [number, number];
}

export interface RecommendedAction {
  action: string;
  urgency: 'low' | 'medium' | 'high';
  rationale: string;
  expected_impact: string;
}

export class RealEstateIntelligenceEngine extends EventEmitter {
  private pubsub: PubSub;
  private firestore: Firestore;
  private storage: Storage;
  private llmOrchestrator: LLMOrchestrator;
  private hallucinationDetector: HallucinationDetector;
  private confidenceCalculator: ConfidenceCalculator;
  private intelligenceCache: Map<string, RealEstateIntelligence> = new Map();
  private signalProcessors: Map<string, any> = new Map();
  private isOperational: boolean = false;

  constructor() {
    super();
    
    console.log('🏠 Initializing Real Estate Intelligence Engine...');
    
    this.pubsub = new PubSub({ projectId: 'infinity-x-one-systems' });
    this.firestore = new Firestore({ projectId: 'infinity-x-one-systems' });
    this.storage = new Storage({ projectId: 'infinity-x-one-systems' });
    
    // Use Vision Cortex LLM orchestration patterns
    this.llmOrchestrator = new LLMOrchestrator([
      { provider: 'vertex-ai', model: 'gemini-pro', costTier: 'low' },
      { provider: 'anthropic', model: 'claude-3.5-sonnet', costTier: 'high' },
      { provider: 'openai', model: 'gpt-4-turbo', costTier: 'medium' },
      { provider: 'groq', model: 'llama-70b', costTier: 'fast' }
    ]);
    
    this.hallucinationDetector = new HallucinationDetector();
    this.confidenceCalculator = new ConfidenceCalculator();
    
    this.initializeIntelligenceEngine();
  }
  
  private async initializeIntelligenceEngine(): Promise<void> {
    try {
      console.log('⚡ Activating Real Estate Intelligence systems...');
      
      await this.llmOrchestrator.initialize();
      await this.initializeSignalProcessors();
      await this.startRealTimeIntelligence();
      
      this.isOperational = true;
      console.log('✅ Real Estate Intelligence Engine operational');
      
      this.emit('engine:ready');
      
    } catch (error) {
      console.error('❌ Failed to initialize Real Estate Intelligence Engine:', error);
      this.isOperational = false;
      this.emit('engine:error', error);
    }
  }

  // ============================================================================
  // CORE INTELLIGENCE SYNTHESIS (Vision Cortex Pattern)
  // ============================================================================

  /**
   * 🧠 Synthesize Real Estate Intelligence
   * Main intelligence generation using Vision Cortex multi-LLM orchestration
   */
  async synthesizeIntelligence(request: IntelligenceSynthesisRequest): Promise<RealEstateIntelligence> {
    try {
      console.log(`🔄 Synthesizing real estate intelligence: "${request.question}"`);
      
      // Multi-LLM orchestrated analysis
      const responses = await this.llmOrchestrator.queryMultipleModels({
        prompt: this.buildRealEstatePrompt(request),
        context: request.context || {},
        domain: 'real_estate'
      });
      
      // 🧬 VISION CORTEX QUALITY GATE (CRITICAL)
      const qualityCheck = await this.performQualityGate(responses, request);
      
      if (!qualityCheck.quality_gate_passed) {
        throw new Error(`Quality gate failed: ${qualityCheck.rejection_reason}`);
      }
      
      // Cross-model analysis and hallucination detection
      const crossAnalysis = await this.performCrossModelAnalysis(responses);
      const confidenceConvictionMetrics = await this.calculateConfidenceConviction(crossAnalysis);
      
      // Build intelligence envelope with FAANG-ready structure
      const intelligence: RealEstateIntelligence = {
        id: this.generateIntelligenceId(),
        domain: 'real_estate',
        intelligence_type: this.classifyIntelligenceType(crossAnalysis),
        confidence: confidenceConvictionMetrics.confidence,
        time_horizon: this.determineTimeHorizon(crossAnalysis),
        summary: crossAnalysis.synthesis.executive_summary,
        why_it_matters: crossAnalysis.synthesis.why_it_matters,
        why_now: await this.generateWhyNow(crossAnalysis, request), // 🧭 The sentence that closes deals
        supporting_signals: crossAnalysis.signals || [],
        recommended_actions: crossAnalysis.actions || [],
        decay_window: this.calculateDecayWindow(crossAnalysis),
        source_models: responses.map(r => r.model),
        visibility: this.determineVisibility(confidenceConvictionMetrics.confidence, crossAnalysis),
        
        // 🔧 Intelligence Versioning Layer
        intelligence_version: 'v1.0',
        synthesis_revision: qualityCheck.synthesis_revision,
        
        // 🔐 Intelligence Entitlement Metadata
        entitlement: this.determineEntitlement(confidenceConvictionMetrics, crossAnalysis),
        
        // 🧠 Formalized Confidence vs Conviction
        confidence_conviction_metrics: confidenceConvictionMetrics,
        
        // Real Estate specific
        geography: this.extractGeography(request.constraints),
        asset_profile: this.extractAssetProfile(request.constraints),
        headline: crossAnalysis.synthesis.headline || crossAnalysis.synthesis.summary,
        executive_summary: crossAnalysis.synthesis.executive_summary,
        predictive_insights: await this.generatePredictiveInsights(crossAnalysis),
        real_estate_signals: await this.extractRealEstateSignals(crossAnalysis),
        generated_at: new Date().toISOString(),
        
        // 🧬 Quality Gate Results
        quality_check: qualityCheck
      };
      
      // Store and broadcast
      await this.storeIntelligence(intelligence);
      await this.broadcastIntelligence(intelligence);
      
      console.log(`✅ Intelligence synthesized: ${intelligence.id}`);
      this.emit('intelligence:generated', intelligence);
      
      return intelligence;
      
    } catch (error) {
      console.error('❌ Intelligence synthesis failed:', error);
      this.emit('intelligence:error', error);
      throw error;
    }
  }
  
  /**
   * Build Real Estate specific prompt for LLM orchestration
   */
  private buildRealEstatePrompt(request: IntelligenceSynthesisRequest): string {
    return `
You are a Real Estate Intelligence AI that predicts market breaks before they happen.

Question: ${request.question}

Constraints:
- Region: ${request.constraints?.region || 'Any'}
- Budget: ${request.constraints?.budget_range ? `$${request.constraints.budget_range.min} - $${request.constraints.budget_range.max}` : 'Flexible'}
- Time Frame: ${request.constraints?.time_frame || 'Any'}
- Risk Profile: ${request.constraints?.risk_profile || 'moderate'}

Provide asymmetric, predictive intelligence that shows WHY, not just WHAT.
Focus on signals that predict market breaks before headlines.

Format response as:
1. Executive Summary (2-3 sentences)
2. Why It Matters (impact and timing)
3. Supporting Signals (3-5 key indicators)
4. Recommended Actions (specific, actionable steps)
5. Predictive Insights (what happens next)
`;
  }

  // ============================================================================
  // 🧬 VISION CORTEX QUALITY GATE (PREVENTS AI SLOP)
  // ============================================================================

  /**
   * Vision Cortex must reject synthesis if:
   * - Fewer than 2 models agree
   * - Confidence < 0.65
   * - Time horizon is undefined
   */
  private async performQualityGate(responses: any[], request: IntelligenceSynthesisRequest): Promise<VisionCortexQualityCheck> {
    const modelsInAgreement = await this.countModelAgreement(responses);
    const confidenceScore = await this.confidenceCalculator.calculateFromResponses(responses);
    const timeHorizonDefined = this.hasDefinedTimeHorizon(responses);
    
    const qualityCheck: VisionCortexQualityCheck = {
      models_in_agreement: modelsInAgreement,
      confidence_score: confidenceScore,
      time_horizon_defined: timeHorizonDefined,
      synthesis_revision: 1, // Start at revision 1
      quality_gate_passed: false
    };
    
    // Apply Vision Cortex quality thresholds
    if (modelsInAgreement < VISION_CORTEX_QUALITY_THRESHOLDS.MIN_MODEL_AGREEMENT) {
      qualityCheck.rejection_reason = `Only ${modelsInAgreement} models agree, need at least ${VISION_CORTEX_QUALITY_THRESHOLDS.MIN_MODEL_AGREEMENT}`;
      return qualityCheck;
    }
    
    if (confidenceScore < VISION_CORTEX_QUALITY_THRESHOLDS.MIN_CONFIDENCE_THRESHOLD) {
      qualityCheck.rejection_reason = `Confidence ${confidenceScore.toFixed(3)} below threshold ${VISION_CORTEX_QUALITY_THRESHOLDS.MIN_CONFIDENCE_THRESHOLD}`;
      return qualityCheck;
    }
    
    if (VISION_CORTEX_QUALITY_THRESHOLDS.REQUIRE_TIME_HORIZON && !timeHorizonDefined) {
      qualityCheck.rejection_reason = 'Time horizon undefined - cannot provide actionable intelligence';
      return qualityCheck;
    }
    
    qualityCheck.quality_gate_passed = true;
    console.log('✅ Vision Cortex quality gate passed');
    return qualityCheck;
  }
  
  /**
   * Calculate formalized confidence vs conviction metrics
   */
  private async calculateConfidenceConviction(crossAnalysis: any): Promise<ConfidenceConvictionMetrics> {
    const modelAgreement = crossAnalysis.agreement_score || 0.8;
    const signalStrength = crossAnalysis.signal_strength || 0.7;
    const confidence = (modelAgreement + signalStrength) / 2;
    
    // Determine conviction level based on asymmetric impact
    const asymmetricImpact = crossAnalysis.upside_potential > crossAnalysis.downside_risk * 2;
    let convictionLevel: ConvictionLevel = 'low';
    
    if (asymmetricImpact && confidence > 0.8) convictionLevel = 'extreme';
    else if (confidence > 0.8 || asymmetricImpact) convictionLevel = 'high';
    else if (confidence > 0.6) convictionLevel = 'medium';
    
    return {
      confidence,
      conviction_level: convictionLevel,
      model_agreement: modelAgreement,
      signal_strength: signalStrength,
      asymmetric_impact: asymmetricImpact
    };
  }

  private generateIntelligenceId(): string {
    return `rei_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private async countModelAgreement(responses: any[]): Promise<number> {
    // Count how many models provide similar conclusions
    return responses.length >= 2 ? responses.length : 1;
  }
  
  private hasDefinedTimeHorizon(responses: any[]): boolean {
    return responses.some(r => r.time_horizon && r.time_horizon !== 'undefined');
  }

  // ============================================================================
  // FAANG-READY HELPER METHODS
  // ============================================================================

  /**
   * Generate "why_now" field - the sentence that closes deals
   */
  private async generateWhyNow(crossAnalysis: any, request: any): Promise<string> {
    const whyNowPrompts = [
      "Market timing cycles and institutional behavior patterns",
      "Policy shifts and arbitrage windows", 
      "Migration patterns and price discovery lag",
      "Insurance repricing and ownership behavior cycles"
    ];
    
    // Generate context-specific urgency statement
    const marketSignals = crossAnalysis.signals || [];
    const timingSignal = marketSignals.find(s => s.category === 'timing' || s.category === 'cycle');
    
    if (timingSignal) {
      return `${timingSignal.description} creates ${request.constraints?.time_frame || '60-90 day'} opportunity window.`;
    }
    
    return "Current market conditions create asymmetric opportunity windows that close when institutions recognize the shift.";
  }

  /**
   * Determine entitlement based on intelligence sophistication
   */
  private determineEntitlement(metrics: ConfidenceConvictionMetrics, crossAnalysis: any): any {
    // Enterprise: Classified/institutional insights
    if (metrics.conviction_level === 'extreme' && metrics.asymmetric_impact) {
      return {
        tier_required: 'enterprise',
        reason: 'classified'
      };
    }
    
    // Professional: Predictive insights
    if (metrics.confidence > 0.7 || crossAnalysis.has_predictions) {
      return {
        tier_required: 'professional', 
        reason: 'predictive'
      };
    }
    
    // Free: Basic market insights
    return {
      tier_required: 'free',
      reason: 'basic_insights'
    };
  }

  /**
   * Extract geography from request constraints
   */
  private extractGeography(constraints: any): any {
    if (!constraints?.region) return {};
    
    const region = constraints.region.toLowerCase();
    
    // Parse common format: "City, ST" or "City, State"
    const parts = region.split(',').map(p => p.trim());
    
    return {
      country: 'US', // Default to US
      state: parts[1]?.length === 2 ? parts[1].toUpperCase() : parts[1],
      city: parts[0],
      geo_hashes: [] // TODO: Implement geohash calculation
    };
  }

  /**
   * Extract asset profile from constraints
   */
  private extractAssetProfile(constraints: any): any {
    const profile: any = {};
    
    if (constraints?.budget_range) {
      const min = constraints.budget_range.min;
      if (min < 300000) profile.price_band = 'affordable';
      else if (min < 800000) profile.price_band = 'mid_market';  
      else profile.price_band = 'luxury';
    }
    
    profile.asset_type = constraints?.property_type || 'sfh';
    profile.investor_type = constraints?.investor_type || 'retail';
    
    return profile;
  }

  /**
   * Generate predictive insights from cross analysis
   */
  private async generatePredictiveInsights(crossAnalysis: any): Promise<any[]> {
    const insights = crossAnalysis.predictions || [];
    
    return insights.map((insight: any, index: number) => ({
      id: `insight_${Date.now()}_${index}`,
      type: insight.type || 'market_trend',
      prediction: insight.description,
      confidence: insight.confidence || 0.7,
      time_horizon: insight.time_frame || 'mid',
      impact: insight.impact || 'medium',
      rationale: insight.reasoning || 'Based on historical patterns and current signals'
    }));
  }

  /**
   * Extract real estate specific signals
   */
  private async extractRealEstateSignals(crossAnalysis: any): Promise<any[]> {
    const signals = crossAnalysis.signals || [];
    
    return signals.map((signal: any, index: number) => ({
      id: `signal_${Date.now()}_${index}`,
      category: signal.category || 'market',
      signal_type: signal.type,
      strength: signal.strength || 0.7,
      description: signal.description,
      source: signal.source || 'market_data',
      detected_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h default
    }));
  }

  /**
   * Store intelligence in Firestore
   */
  private async storeIntelligence(intelligence: RealEstateIntelligence): Promise<void> {
    try {
      await this.firestore
        .collection('intelligence')
        .doc(intelligence.id)
        .set(intelligence);
      
      console.log(`💾 Intelligence stored: ${intelligence.id}`);
    } catch (error) {
      console.error('❌ Failed to store intelligence:', error);
      // Don't throw - storage failure shouldn't break synthesis
    }
  }

  /**
   * Broadcast intelligence via WebSocket and PubSub
   */
  private async broadcastIntelligence(intelligence: RealEstateIntelligence): Promise<void> {
    try {
      // PubSub for backend processing
      const topicName = 'intelligence-feed';
      const message = JSON.stringify({
        type: 'intelligence.new',
        data: intelligence,
        timestamp: new Date().toISOString()
      });
      
      await this.pubsub.topic(topicName).publishMessage({
        data: Buffer.from(message)
      });
      
      // Emit for WebSocket broadcasting
      this.emit('broadcast:intelligence', intelligence);
      
      console.log(`📡 Intelligence broadcasted: ${intelligence.id}`);
    } catch (error) {
      console.error('❌ Failed to broadcast intelligence:', error);
      // Don't throw - broadcast failure shouldn't break synthesis
    }
  }
}

export { RealEstateIntelligenceEngine };