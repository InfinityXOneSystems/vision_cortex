/**
 * 🧠 VISION CORTEX QUANTUM INTELLIGENCE TYPES
 * 
 * TypeScript interfaces for the Quantum Hyper-Intelligence Contract
 * 
 * @author Infinity X One Systems
 * @version 2.0.0
 */

import { z } from 'zod';

// ============================================================================
// CORE INTELLIGENCE ENVELOPE (All Endpoints Must Follow)
// ============================================================================

export type IntelligenceType = 'prediction' | 'signal' | 'anomaly' | 'synthesis';
export type TimeHorizon = 'immediate' | 'short' | 'mid' | 'long';
export type VisibilityLevel = 'public' | 'preview' | 'classified';
export type ConfidenceScore = number; // 0.0 - 1.0
export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';
export type CapitalType = 'cash' | 'financed' | 'partnership' | 'fund';

// WebSocket Event Types (Clean UX)
export type VisionCortexEventType = 
  | 'intelligence:synthesized'
  | 'signal:detected'
  | 'signal:strengthened'
  | 'anomaly:detected'
  | 'confidence:increased'
  | 'consensus:achieved'
  | 'intelligence:expired';

export interface VisionCortexEvent {
  type: VisionCortexEventType;
  timestamp: string;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * CONFIDENCE ≠ CONVICTION
 * 
 * Confidence: Statistical certainty (model agreement + signal strength)
 * Conviction: Strategic weight (should someone act?)
 * 
 * High confidence can exist with low conviction if upside is limited.
 * High conviction implies asymmetric impact.
 */
export interface ConfidenceConvictionMetrics {
  confidence: ConfidenceScore; // Statistical certainty
  conviction_level: ConvictionLevel; // Strategic weight
  model_agreement: number; // 0.0 - 1.0 (how many models agree)
  signal_strength: number; // 0.0 - 1.0 (signal quality)
  asymmetric_impact: boolean; // High upside potential
}

// 🌐 WebSocket Intelligence Taxonomy (FAANG Clean Events)
export type WebSocketEventType = 
  | 'intelligence:synthesized'
  | 'signal:detected'
  | 'signal:strengthened' 
  | 'anomaly:detected'
  | 'confidence:increased'
  | 'consensus:achieved'
  | 'intelligence:expired';

// 🧠 Formalized Confidence vs Conviction (FAANG DISTINCTION)
export type ConvictionLevel = 'low' | 'medium' | 'high' | 'extreme';

/**
 * CONFIDENCE ≠ CONVICTION
 * 
 * Confidence: Statistical certainty (model agreement + signal strength)
 * Conviction: Strategic weight (should someone act?)
 * 
 * High confidence can exist with low conviction if upside is limited.
 * High conviction implies asymmetric impact.
 */
export interface ConfidenceConvictionMetrics {
  confidence: ConfidenceScore; // Statistical certainty
  conviction_level: ConvictionLevel; // Strategic weight
  model_agreement: number; // 0.0 - 1.0 (how many models agree)
  signal_strength: number; // 0.0 - 1.0 (signal quality)
  asymmetric_impact: boolean; // High upside potential
}

export interface CoreIntelligenceEnvelope {
  intelligence_type: IntelligenceType;
  
  // 🎯 Confidence vs Conviction (FAANG DISTINCTION)
  confidence: ConfidenceScore; // Statistical certainty (0.0-1.0)
  conviction_level: ConvictionLevel; // Strategic weight / action bias
  
  time_horizon: TimeHorizon;
  summary: string;
  why_it_matters: string;
  why_now: string; // 🧭 The sentence that closes deals
  supporting_signals: string[];
  recommended_actions: string[];
  decay_window: string; // ISO timestamp
  
  // 🤖 Model Consensus (Not Just Source List)
  model_consensus: {
    participating_models: string[];
    agreement_score: number; // 0.0–1.0 consensus strength
  };
  
  visibility: VisibilityLevel;
  
  // 🔧 Intelligence Versioning Layer (CRITICAL)
  intelligence_version: string; // e.g., "v1.0"
  synthesis_revision: number; // Incremental revision number
  
  // 🔐 Intelligence Entitlement Metadata
  entitlement?: {
    tier_required: 'professional' | 'enterprise';
    reason: 'predictive' | 'real_time' | 'entity_resolution';
  } | undefined;
}

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export interface IntelligenceSynthesisRequest {
  domain: string;
  question: string;
  constraints?: {
    region?: string | undefined;
    capital_type?: CapitalType | undefined;
    risk_profile?: RiskProfile | undefined;
    time_frame?: string | undefined;
    budget_range?: {min: number; max: number} | undefined;
    [key: string]: any;
  } | undefined;
  context?: {
    user_history?: any[];
    market_conditions?: any;
    external_signals?: any[];
  } | undefined;
}

export interface SignalDetectionQuery {
  domain: string;
  region?: string;
  signal_types?: string[];
  min_strength?: number;
  time_window?: string;
}

export interface AnomalyQuery {
  domain: string;
  detection_window?: string;
  severity_threshold?: number;
}

// ============================================================================
// OUTPUT SCHEMAS  
// ============================================================================

export interface IntelligenceSignal {
  signal: string;
  strength: number; // 0.0 - 1.0
  description: string;
  first_detected: string;
  trend_direction: 'strengthening' | 'weakening' | 'stable';
  geographic_scope?: string;
  related_signals?: string[];
}

export interface DetectedAnomaly {
  anomaly: string;
  explanation: string;
  impact: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_domains: string[];
  detection_timestamp: string;
  estimated_duration?: string;
}

// 🌐 WebSocket Event Structure
export interface WebSocketIntelligenceEvent {
  event_type: WebSocketEventType;
  intelligence_id: string;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: string;
  expires_at?: string;
}

export interface ClassifiedPreview {
  summary: string;
  redacted: boolean;
  unlock_message: string;
  preview_signals?: string[];
  confidence_indicator?: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// MULTI-LLM ORCHESTRATION TYPES
// ============================================================================

export type ProviderType = 'openai' | 'anthropic' | 'google-gemini' | 'vertex-ai' | 'vertex-ai-flash' | 'custom';

export interface LLMProvider {
  name: string;
  endpoint: string;
  model: string;
  max_tokens: number;
  temperature: number;
  specialization: string[];
  reliability_score: number;
  cost_per_1k_tokens: number;
  latency_ms: number;
  provider_type?: ProviderType;
  gcp_project?: string;
  gcp_region?: string;
  supports_multimodal?: boolean;
  supports_streaming?: boolean;
  rate_limit?: {
    requests_per_minute: number;
    tokens_per_minute: number;
  };
}

export interface LLMResponse {
  provider: string;
  model: string;
  response: string;
  confidence: number;
  tokens_used: number;
  latency_ms: number;
  timestamp: string;
  hallucination_flags?: string[];
}

export interface CrossModelAnalysis {
  consensus_level: number; // 0.0 - 1.0
  divergence_points: string[];
  signal_overlap: string[];
  hallucination_detected: boolean;
  recommended_synthesis: string;
  confidence_adjusted: number;
}

// ============================================================================
// DOMAIN-SPECIFIC TYPES (Real Estate)
// ============================================================================

export interface RealEstateConstraints {
  property_types?: string[];
  price_range?: {min: number; max: number};
  neighborhoods?: string[];
  investment_strategy?: 'flip' | 'hold' | 'rental' | 'development';
  timeline?: string;
  financing_requirements?: any;
}

export interface MarketIntelligence {
  market_phase: 'expansion' | 'peak' | 'contraction' | 'trough';
  liquidity_index: number;
  velocity_trend: 'accelerating' | 'stable' | 'slowing';
  institutional_activity: 'increasing' | 'stable' | 'decreasing';
  regulatory_pressure: 'low' | 'medium' | 'high';
  opportunity_windows: OpportunityWindow[];
}

export interface OpportunityWindow {
  window_type: string;
  opens: string; // ISO timestamp
  closes: string; // ISO timestamp
  confidence: number;
  potential_return: {min: number; max: number};
  risk_factors: string[];
  action_required: string[];
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

export const IntelligenceEnvelopeSchema = z.object({
  intelligence_type: z.enum(['prediction', 'signal', 'anomaly', 'synthesis']),
  intelligence_version: z.string(),
  synthesis_revision: z.number().min(1),
  confidence: z.number().min(0).max(1),
  conviction_level: z.enum(['low', 'medium', 'high', 'extreme']),
  time_horizon: z.enum(['immediate', 'short', 'mid', 'long']),
  why_now: z.string().min(5),
  summary: z.string().min(10),
  why_it_matters: z.string().min(10),
  supporting_signals: z.array(z.string()),
  recommended_actions: z.array(z.string()),
  decay_window: z.string(),
  model_consensus: z.object({
    participating_models: z.array(z.string()),
    agreement_score: z.number().min(0).max(1)
  }),
  visibility: z.enum(['public', 'preview', 'classified']),
  entitlement: z.object({
    tier_required: z.enum(['professional', 'enterprise']),
    reason: z.enum(['predictive', 'real_time', 'entity_resolution'])
  }).optional()
});

export const SynthesisRequestSchema = z.object({
  domain: z.string(),
  question: z.string().min(5),
  constraints: z.object({
    region: z.string().optional(),
    capital_type: z.enum(['cash', 'financed', 'partnership', 'fund']).optional(),
    risk_profile: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
    time_frame: z.string().optional()
  }).optional(),
  context: z.object({
    user_history: z.array(z.any()).optional(),
    market_conditions: z.any().optional(),
    external_signals: z.array(z.any()).optional()
  }).optional()
});

export const SignalQuerySchema = z.object({
  domain: z.string(),
  region: z.string().optional(),
  signal_types: z.array(z.string()).optional(),
  min_strength: z.number().min(0).max(1).optional(),
  time_window: z.string().optional()
});

export const AnomalyQuerySchema = z.object({
  domain: z.string(),
  detection_window: z.string().optional(),
  severity_threshold: z.number().min(0).max(1).optional()
});

// ============================================================================
// QUANTUM INTELLIGENCE CONSTANTS
// ============================================================================

export const INTELLIGENCE_DOMAINS = [
  'real_estate',
  'financial_markets', 
  'crypto',
  'supply_chain',
  'geopolitical',
  'technology',
  'energy',
  'healthcare',
  'multimodal',
  'vision_analysis'
] as const;

export const VERTEX_AI_MODELS = [
  'gemini-2.0-pro',
  'gemini-2.0-flash', 
  'gemini-1.5-pro',
  'text-embedding-004',
  'code-gemma-7b'
] as const;

export const PROVIDER_CAPABILITIES = {
  'anthropic': ['reasoning', 'analysis', 'critical_thinking', 'code_review'],
  'vertex-ai': ['multimodal', 'gcp_native', 'low_latency', 'vision', 'embeddings'],
  'google-gemini': ['multimodal', 'vision', 'fast_generation', 'creative'],
  'openai': ['synthesis', 'reasoning', 'code_generation', 'structured_output']
} as const;

export const DEFAULT_LLM_PROVIDERS: LLMProvider[] = [
  {
    name: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096, 
    temperature: 0.2,
    specialization: ['critical_thinking', 'contrarian_analysis', 'risk_assessment', 'reasoning'],
    reliability_score: 0.95,
    cost_per_1k_tokens: 0.015,
    latency_ms: 1800
  },
  {
    name: 'vertex-ai',
    endpoint: 'vertex-ai-native',
    model: 'gemini-2.0-pro',
    max_tokens: 8192,
    temperature: 0.3,
    specialization: ['multimodal', 'gcp_native', 'low_latency', 'data_analysis'],
    reliability_score: 0.92,
    cost_per_1k_tokens: 0.0015,
    latency_ms: 1200
  },
  {
    name: 'google-gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    model: 'gemini-2.0-pro',
    max_tokens: 4096,
    temperature: 0.4,
    specialization: ['multimodal', 'vision', 'fast_generation', 'pattern_recognition'],
    reliability_score: 0.90,
    cost_per_1k_tokens: 0.0015,
    latency_ms: 1500
  },
  {
    name: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4-turbo-preview',
    max_tokens: 4096,
    temperature: 0.3,
    specialization: ['synthesis', 'reasoning', 'analysis', 'code_generation'],
    reliability_score: 0.93,
    cost_per_1k_tokens: 0.03,
    latency_ms: 2000
  },
  {
    name: 'vertex-ai-flash',
    endpoint: 'vertex-ai-native',
    model: 'gemini-2.0-flash',
    max_tokens: 8192,
    temperature: 0.5,
    specialization: ['fast_generation', 'creative', 'brainstorming'],
    reliability_score: 0.88,
    cost_per_1k_tokens: 0.0005,
    latency_ms: 800
  }
];

export const TIME_HORIZON_WINDOWS = {
  immediate: '0-24h',
  short: '24h-30d', 
  mid: '30d-6m',
  long: '6m+'
} as const;

export const CONFIDENCE_THRESHOLDS = {
  low: 0.0,
  medium: 0.6,
  high: 0.8,
  critical: 0.95
} as const;

export const HALLUCINATION_DETECTION_PATTERNS = [
  'made up statistics',
  'impossible dates',
  'contradictory statements',
  'fabricated entities',
  'inconsistent numbers',
  'logical impossibilities'
] as const;

// ============================================================================
// VISION CORTEX INTERNAL RULES (PREVENT AI SLOP)
// ============================================================================

// ============================================================================
// VISION CORTEX INTERNAL RULES (PREVENT AI SLOP)
// ============================================================================

/**
 * SYNTHESIS REJECTION RULES
 * Vision Cortex must reject synthesis if any rule is violated
 */
export const SYNTHESIS_REJECTION_RULES = {
  MIN_PARTICIPATING_MODELS: 2,
  MIN_AGREEMENT_SCORE: 0.65,
  REQUIRED_FIELDS: ['time_horizon', 'decay_window', 'why_now'],
  MAX_SYNTHESIS_TIME_MS: 30000,
  MIN_CONFIDENCE: 0.3
} as const;

/**
 * CONVICTION LEVEL THRESHOLDS
 * Maps confidence + agreement to conviction levels
 */
export const CONVICTION_THRESHOLDS = {
  low: { confidence: [0.3, 0.6], agreement: [0.65, 0.75] },
  medium: { confidence: [0.6, 0.8], agreement: [0.75, 0.85] },
  high: { confidence: [0.8, 0.95], agreement: [0.85, 0.95] },
  extreme: { confidence: [0.95, 1.0], agreement: [0.95, 1.0] }
} as const;

export const INTELLIGENCE_VERSIONS = {
  CURRENT: 'v1.0',
  SUPPORTED: ['v1.0'],
  DEPRECATED: []
} as const;

/**
 * ENTITLEMENT UPGRADE MESSAGES
 * Clean paywall language for each restriction reason
 */
export const ENTITLEMENT_MESSAGES = {
  predictive: 'Upgrade to unlock predictive intelligence',
  real_time: 'Upgrade for real-time intelligence streams', 
  entity_resolution: 'Upgrade to reveal specific entities and coordinates'
} as const;