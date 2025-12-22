/**
 * 📊 CONFIDENCE CALCULATION MODULE
 * 
 * Calculates confidence scores based on model agreement and signal strength
 */

export interface ConfidenceMetrics {
  model_agreement: number;
  signal_strength: number;
  consistency_score: number;
  final_confidence: number;
}

export class ConfidenceCalculator {
  constructor() {}

  /**
   * Calculate confidence metrics from LLM responses
   */
  public calculateFinalConfidence(responses: any[], crossAnalysis: any): number {
    const metrics = this.calculateConfidence(responses, crossAnalysis);
    return metrics.model_agreement * 0.4 + metrics.signal_strength * 0.3 + metrics.consistency_score * 0.3;
  }

  public calculateConfidence(responses: any[], crossAnalysis: any): ConfidenceMetrics {
    const model_agreement = this.calculateModelAgreement(responses);
    const signal_strength = this.calculateSignalStrength(responses);
    const consistency_score = crossAnalysis?.consensus_level || 0.5;
    
    // Weighted combination of factors
    const final_confidence = (
      model_agreement * 0.4 +
      signal_strength * 0.3 + 
      consistency_score * 0.3
    );
    
    return {
      model_agreement,
      signal_strength,
      consistency_score,
      final_confidence: Math.min(1.0, Math.max(0.0, final_confidence))
    };
  }

  private calculateModelAgreement(responses: any[]): number {
    if (responses.length < 2) return 0.5;
    
    // Simplified agreement calculation
    // In production, would use semantic similarity analysis
    const baseAgreement = 0.7;
    const modelBonus = Math.min(responses.length * 0.05, 0.25);
    
    return Math.min(1.0, baseAgreement + modelBonus);
  }

  private calculateSignalStrength(responses: any[]): number {
    // Analyze response quality indicators
    const avgLength = responses.reduce((sum, r) => sum + (r.content?.length || 0), 0) / responses.length;
    
    // Longer, more detailed responses generally indicate higher confidence
    const lengthScore = Math.min(1.0, avgLength / 1000);
    
    // Check for specificity indicators
    const specificityScore = this.calculateSpecificity(responses);
    
    return (lengthScore + specificityScore) / 2;
  }

  private calculateSpecificity(responses: any[]): number {
    // Count specific indicators across responses
    let specificitySum = 0;
    
    responses.forEach(response => {
      const content = response.content || '';
      let score = 0.5; // Base score
      
      // Boost for numerical data
      if (/\d+%/.test(content)) score += 0.1;
      if (/\$[\d,]+/.test(content)) score += 0.1;
      if (/\d{4}/.test(content)) score += 0.05; // Years
      
      // Reduce for vague language
      if (/maybe|perhaps|possibly/.test(content)) score -= 0.1;
      
      specificitySum += Math.max(0, Math.min(1, score));
    });
    
    return specificitySum / responses.length;
  }
}