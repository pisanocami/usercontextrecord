/**
 * Context Comparison Tool - Strategic Metrics Calculator
 * 
 * Calculates CMO-grade strategic metrics for competitive intelligence.
 */

import type { Configuration } from "../../../../shared/schema";
import type { OverlapMetrics, SectionComparison, SectionKey, StrategicMetrics, MetricScore } from "./types";

function getLabel(score: number): "Low" | "Medium" | "High" | "Critical" {
  if (score < 25) return "Low";
  if (score < 50) return "Medium";
  if (score < 75) return "High";
  return "Critical";
}

/**
 * Calculate Competitive Intensity
 * How much are these brands fighting for the same customer?
 */
function calculateCompetitiveIntensity(
  contexts: Configuration[],
  overlapMetrics: OverlapMetrics
): MetricScore {
  const reasoning: string[] = [];
  const keyFactors: string[] = [];
  
  // Weight factors
  const competitorWeight = 0.35;
  const keywordWeight = 0.30;
  const geographyWeight = 0.20;
  const categoryWeight = 0.15;
  
  let score = 0;
  
  // Competitor overlap (high weight - direct competition indicator)
  score += overlapMetrics.competitorOverlap * competitorWeight;
  if (overlapMetrics.competitorOverlap > 30) {
    reasoning.push(`${overlapMetrics.sharedCompetitors.length} shared competitors indicate direct market overlap`);
    keyFactors.push(`Shared competitors: ${overlapMetrics.sharedCompetitors.slice(0, 3).join(", ")}`);
  } else {
    reasoning.push("Low competitor overlap suggests different competitive landscapes");
  }
  
  // Keyword overlap (high weight - search competition)
  score += overlapMetrics.keywordOverlap * keywordWeight;
  if (overlapMetrics.keywordOverlap > 20) {
    reasoning.push(`${overlapMetrics.keywordOverlap}% keyword overlap may cause search competition`);
    keyFactors.push("Potential keyword bidding conflicts");
  }
  
  // Geography overlap (medium weight - market presence)
  score += overlapMetrics.geographyOverlap * geographyWeight;
  if (overlapMetrics.geographyOverlap > 50) {
    reasoning.push(`${overlapMetrics.geographyOverlap}% geographic overlap means same market presence`);
    keyFactors.push(`Shared markets: ${overlapMetrics.sharedGeographies.slice(0, 3).join(", ")}`);
  }
  
  // Category overlap (lower weight - can coexist in same category)
  score += overlapMetrics.categoryOverlap * categoryWeight;
  if (overlapMetrics.categoryOverlap > 40) {
    reasoning.push("Similar category positioning increases competition");
  }
  
  return {
    score: Math.round(score),
    label: getLabel(score),
    reasoning,
    keyFactors,
  };
}

/**
 * Calculate Strategic Alignment
 * How similar are their go-to-market approaches?
 */
function calculateStrategicAlignment(
  contexts: Configuration[],
  sections: Record<SectionKey, SectionComparison>
): MetricScore {
  const reasoning: string[] = [];
  const keyFactors: string[] = [];
  
  let alignmentPoints = 0;
  let totalPoints = 0;
  
  // Check business model alignment
  const businessModels = contexts.map(c => c.brand?.business_model).filter(Boolean);
  const uniqueModels = new Set(businessModels);
  if (uniqueModels.size === 1 && businessModels.length === contexts.length) {
    alignmentPoints += 25;
    reasoning.push(`All brands use ${businessModels[0]} business model`);
    keyFactors.push(`Business Model: ${businessModels[0]}`);
  }
  totalPoints += 25;
  
  // Check risk tolerance alignment
  const riskLevels = contexts.map(c => c.strategic_intent?.risk_tolerance).filter(Boolean);
  const uniqueRisks = new Set(riskLevels);
  if (uniqueRisks.size === 1 && riskLevels.length === contexts.length) {
    alignmentPoints += 20;
    reasoning.push(`Aligned risk tolerance: ${riskLevels[0]}`);
    keyFactors.push(`Risk Tolerance: ${riskLevels[0]}`);
  }
  totalPoints += 20;
  
  // Check channel strategy alignment
  const channelMatch = sections.channel_context?.overallMatch || 0;
  alignmentPoints += (channelMatch / 100) * 25;
  if (channelMatch > 50) {
    reasoning.push(`${channelMatch}% channel strategy alignment`);
    keyFactors.push("Similar channel mix");
  }
  totalPoints += 25;
  
  // Check goal type alignment
  const goalTypes = contexts.map(c => c.strategic_intent?.goal_type).filter(Boolean);
  const uniqueGoals = new Set(goalTypes);
  if (uniqueGoals.size === 1 && goalTypes.length === contexts.length) {
    alignmentPoints += 15;
    reasoning.push(`Same primary goal type: ${goalTypes[0]}`);
  }
  totalPoints += 15;
  
  // Check time horizon alignment
  const timeHorizons = contexts.map(c => c.strategic_intent?.time_horizon).filter(Boolean);
  const uniqueHorizons = new Set(timeHorizons);
  if (uniqueHorizons.size === 1 && timeHorizons.length === contexts.length) {
    alignmentPoints += 15;
    reasoning.push(`Aligned time horizon: ${timeHorizons[0]}`);
  }
  totalPoints += 15;
  
  const score = totalPoints > 0 ? (alignmentPoints / totalPoints) * 100 : 0;
  
  return {
    score: Math.round(score),
    label: getLabel(score),
    reasoning,
    keyFactors,
  };
}

/**
 * Calculate Market Adjacency
 * How close are their target markets?
 */
function calculateMarketAdjacency(
  contexts: Configuration[],
  overlapMetrics: OverlapMetrics,
  sections: Record<SectionKey, SectionComparison>
): MetricScore {
  const reasoning: string[] = [];
  const keyFactors: string[] = [];
  
  let adjacencyScore = 0;
  
  // Geography overlap (high weight)
  adjacencyScore += overlapMetrics.geographyOverlap * 0.30;
  if (overlapMetrics.geographyOverlap > 60) {
    reasoning.push(`Strong geographic overlap (${overlapMetrics.geographyOverlap}%)`);
    keyFactors.push(`Markets: ${overlapMetrics.sharedGeographies.join(", ")}`);
  }
  
  // Category adjacency
  const categoryMatch = sections.category_definition?.overallMatch || 0;
  adjacencyScore += categoryMatch * 0.25;
  if (categoryMatch > 30) {
    reasoning.push(`${categoryMatch}% category alignment`);
  } else {
    reasoning.push("Different category focus - adjacent but not overlapping");
  }
  
  // Target market similarity (check industries)
  const industries = contexts.map(c => c.brand?.industry).filter(Boolean);
  const uniqueIndustries = new Set(industries);
  if (uniqueIndustries.size === 1) {
    adjacencyScore += 25;
    reasoning.push(`Same industry: ${industries[0]}`);
    keyFactors.push(`Industry: ${industries[0]}`);
  } else if (uniqueIndustries.size <= 2) {
    adjacencyScore += 15;
    reasoning.push(`Adjacent industries: ${Array.from(uniqueIndustries).join(", ")}`);
  }
  
  // Revenue band proximity
  const revenueBands = contexts.map(c => c.brand?.revenue_band).filter(Boolean);
  const uniqueBands = new Set(revenueBands);
  if (uniqueBands.size === 1) {
    adjacencyScore += 20;
    reasoning.push("Same revenue tier - similar market positioning");
    keyFactors.push(`Revenue: ${revenueBands[0]}`);
  } else if (uniqueBands.size <= 2) {
    adjacencyScore += 10;
    reasoning.push("Adjacent revenue tiers");
  }
  
  return {
    score: Math.round(adjacencyScore),
    label: getLabel(adjacencyScore),
    reasoning,
    keyFactors,
  };
}

/**
 * Calculate Threat Probability
 * Likelihood of direct competition in 12-24 months
 */
function calculateThreatProbability(
  contexts: Configuration[],
  overlapMetrics: OverlapMetrics,
  competitiveIntensity: MetricScore,
  marketAdjacency: MetricScore
): MetricScore {
  const reasoning: string[] = [];
  const keyFactors: string[] = [];
  
  // Base threat from competitive intensity and market adjacency
  let threatScore = (competitiveIntensity.score * 0.4) + (marketAdjacency.score * 0.3);
  
  // Adjust based on category overlap (expansion signal)
  if (overlapMetrics.categoryOverlap < 20) {
    threatScore *= 0.7; // Low category overlap reduces threat
    reasoning.push("Low category overlap reduces direct competition risk");
  } else if (overlapMetrics.categoryOverlap > 60) {
    threatScore *= 1.2; // High category overlap increases threat
    reasoning.push("High category overlap increases competition probability");
    keyFactors.push("Category convergence detected");
  }
  
  // Check for expansion signals in strategic intent
  const growthPriorities = contexts.map(c => c.strategic_intent?.growth_priority || "").filter(Boolean);
  const expansionKeywords = ["expand", "growth", "market share", "new market"];
  const hasExpansionSignals = growthPriorities.some(p => 
    expansionKeywords.some(k => p.toLowerCase().includes(k))
  );
  
  if (hasExpansionSignals) {
    threatScore += 15;
    reasoning.push("Growth/expansion signals detected in strategic intent");
    keyFactors.push("Active expansion strategy");
  }
  
  // Cap at 100
  threatScore = Math.min(100, threatScore);
  
  // Add summary reasoning
  if (threatScore < 25) {
    reasoning.push("Low threat - brands operate in distinct segments");
  } else if (threatScore < 50) {
    reasoning.push("Moderate threat - some market overlap but different focus");
  } else if (threatScore < 75) {
    reasoning.push("Elevated threat - significant competitive overlap");
  } else {
    reasoning.push("High threat - direct competition likely");
    keyFactors.push("Recommend defensive strategy review");
  }
  
  return {
    score: Math.round(threatScore),
    label: getLabel(threatScore),
    reasoning,
    keyFactors,
  };
}

/**
 * Calculate all strategic metrics
 */
export function calculateStrategicMetrics(
  contexts: Configuration[],
  overlapMetrics: OverlapMetrics,
  sections: Record<SectionKey, SectionComparison>
): StrategicMetrics {
  const competitiveIntensity = calculateCompetitiveIntensity(contexts, overlapMetrics);
  const strategicAlignment = calculateStrategicAlignment(contexts, sections);
  const marketAdjacency = calculateMarketAdjacency(contexts, overlapMetrics, sections);
  const threatProbability = calculateThreatProbability(
    contexts, 
    overlapMetrics, 
    competitiveIntensity, 
    marketAdjacency
  );
  
  return {
    competitiveIntensity,
    strategicAlignment,
    marketAdjacency,
    threatProbability,
  };
}
