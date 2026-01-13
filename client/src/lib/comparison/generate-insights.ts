/**
 * Context Comparison Tool - Insight Generation
 * 
 * Functions for generating strategic insights from comparison results.
 */

import type { Configuration } from "../../../../shared/schema";
import type {
  ComparisonInsight,
  SectionComparison,
  SectionKey,
  OverlapMetrics,
  InsightPriority,
} from "./types";

let insightIdCounter = 0;

function generateInsightId(): string {
  return `insight-${++insightIdCounter}-${Date.now()}`;
}

/**
 * Check for strategic misalignment in risk tolerance
 */
function checkRiskToleranceMisalignment(
  contexts: Configuration[]
): ComparisonInsight | null {
  const riskLevels = contexts.map((ctx) => ({
    id: Number(ctx.id),
    name: ctx.name || ctx.brand?.domain || "Unknown",
    risk: ctx.strategic_intent?.risk_tolerance,
  }));

  const uniqueRisks = new Set(riskLevels.map((r) => r.risk).filter(Boolean));

  if (uniqueRisks.size > 1) {
    const highRisk = riskLevels.filter((r) => r.risk === "high");
    const lowRisk = riskLevels.filter((r) => r.risk === "low");

    if (highRisk.length > 0 && lowRisk.length > 0) {
      return {
        id: generateInsightId(),
        type: "warning",
        title: "Strategic Risk Misalignment",
        description: `${highRisk.map((r) => r.name).join(", ")} have high risk tolerance while ${lowRisk.map((r) => r.name).join(", ")} have low risk tolerance. This may cause conflicting strategies.`,
        affectedContextIds: [...highRisk, ...lowRisk].map((r) => r.id),
        affectedContextNames: [...highRisk, ...lowRisk].map((r) => r.name),
        section: "strategic_intent",
        priority: "high",
        actionable: true,
        suggestion: "Consider aligning risk tolerance across related brands or documenting the strategic rationale for differences.",
      };
    }
  }

  return null;
}

/**
 * Check for CMO-safe status inconsistency
 */
function checkCmoSafeInconsistency(
  contexts: Configuration[]
): ComparisonInsight | null {
  const cmoStatus = contexts.map((ctx) => ({
    id: Number(ctx.id),
    name: ctx.name || ctx.brand?.domain || "Unknown",
    cmoSafe: ctx.governance?.cmo_safe,
  }));

  const safe = cmoStatus.filter((c) => c.cmoSafe);
  const notSafe = cmoStatus.filter((c) => !c.cmoSafe);

  if (safe.length > 0 && notSafe.length > 0) {
    return {
      id: generateInsightId(),
      type: "info",
      title: "Mixed CMO-Safe Status",
      description: `${safe.length} context(s) are CMO-safe while ${notSafe.length} are not. Consider reviewing: ${notSafe.map((c) => c.name).join(", ")}`,
      affectedContextIds: notSafe.map((c) => c.id),
      affectedContextNames: notSafe.map((c) => c.name),
      section: "governance",
      priority: "medium",
      actionable: true,
      suggestion: "Review and validate the non-CMO-safe contexts to ensure they meet approval criteria.",
    };
  }

  return null;
}

/**
 * Check for competitor overlap opportunities
 */
function checkCompetitorOverlap(
  contexts: Configuration[],
  overlapMetrics: OverlapMetrics
): ComparisonInsight | null {
  if (overlapMetrics.sharedCompetitors.length > 0) {
    return {
      id: generateInsightId(),
      type: "success",
      title: "Shared Competitive Landscape",
      description: `All contexts share ${overlapMetrics.sharedCompetitors.length} competitor(s): ${overlapMetrics.sharedCompetitors.slice(0, 5).join(", ")}${overlapMetrics.sharedCompetitors.length > 5 ? "..." : ""}`,
      affectedContextIds: contexts.map((c) => Number(c.id)),
      affectedContextNames: contexts.map((c) => c.name || c.brand?.domain || "Unknown"),
      section: "competitors",
      priority: "low",
      actionable: false,
    };
  }

  if (overlapMetrics.competitorOverlap < 20) {
    return {
      id: generateInsightId(),
      type: "info",
      title: "Low Competitor Overlap",
      description: `Only ${overlapMetrics.competitorOverlap}% competitor overlap between contexts. These brands may be targeting different market segments.`,
      affectedContextIds: contexts.map((c) => Number(c.id)),
      affectedContextNames: contexts.map((c) => c.name || c.brand?.domain || "Unknown"),
      section: "competitors",
      priority: "low",
      actionable: false,
    };
  }

  return null;
}

/**
 * Check for geography expansion opportunities
 */
function checkGeographyGaps(
  contexts: Configuration[]
): ComparisonInsight | null {
  const geoMap = new Map<string, string[]>();

  contexts.forEach((ctx) => {
    const name = ctx.name || ctx.brand?.domain || "Unknown";
    ctx.brand?.primary_geography?.forEach((geo) => {
      const key = geo.toLowerCase().trim();
      if (!geoMap.has(key)) {
        geoMap.set(key, []);
      }
      geoMap.get(key)!.push(name);
    });
  });

  // Find geographies that only one context has
  const uniqueGeos: { geo: string; context: string }[] = [];
  geoMap.forEach((contextNames, geo) => {
    if (contextNames.length === 1) {
      uniqueGeos.push({ geo, context: contextNames[0] });
    }
  });

  if (uniqueGeos.length > 0) {
    return {
      id: generateInsightId(),
      type: "opportunity",
      title: "Geography Expansion Opportunity",
      description: `Some contexts target unique geographies: ${uniqueGeos.map((u) => `${u.context} → ${u.geo.toUpperCase()}`).join(", ")}. Consider expansion opportunities.`,
      affectedContextIds: contexts.map((c) => Number(c.id)),
      affectedContextNames: contexts.map((c) => c.name || c.brand?.domain || "Unknown"),
      section: "brand",
      priority: "medium",
      actionable: true,
      suggestion: "Evaluate whether successful strategies in unique geographies can be replicated across other brands.",
    };
  }

  return null;
}

/**
 * Check for business model differences
 */
function checkBusinessModelDifferences(
  contexts: Configuration[]
): ComparisonInsight | null {
  const models = contexts.map((ctx) => ({
    id: Number(ctx.id),
    name: ctx.name || ctx.brand?.domain || "Unknown",
    model: ctx.brand?.business_model,
  }));

  const uniqueModels = new Set(models.map((m) => m.model).filter(Boolean));

  if (uniqueModels.size > 1) {
    return {
      id: generateInsightId(),
      type: "info",
      title: "Different Business Models",
      description: `Contexts have different business models: ${Array.from(uniqueModels).join(", ")}. Strategies may need to be tailored accordingly.`,
      affectedContextIds: models.map((m) => m.id),
      affectedContextNames: models.map((m) => m.name),
      section: "brand",
      priority: "low",
      actionable: false,
    };
  }

  return null;
}

/**
 * Check for keyword cannibalization risk
 */
function checkKeywordCannibalization(
  contexts: Configuration[],
  overlapMetrics: OverlapMetrics
): ComparisonInsight | null {
  if (overlapMetrics.keywordOverlap > 50 && overlapMetrics.sharedKeywords.length > 5) {
    return {
      id: generateInsightId(),
      type: "warning",
      title: "Potential Keyword Cannibalization",
      description: `High keyword overlap (${overlapMetrics.keywordOverlap}%) detected. ${overlapMetrics.sharedKeywords.length} shared keywords may cause internal competition.`,
      affectedContextIds: contexts.map((c) => Number(c.id)),
      affectedContextNames: contexts.map((c) => c.name || c.brand?.domain || "Unknown"),
      section: "demand_definition",
      priority: "high",
      actionable: true,
      suggestion: "Review shared keywords and consider differentiating targeting strategies to avoid cannibalization.",
    };
  }

  return null;
}

/**
 * Check section-level match quality
 */
function checkSectionMatchQuality(
  contexts: Configuration[],
  sections: Record<SectionKey, SectionComparison>
): ComparisonInsight[] {
  const insights: ComparisonInsight[] = [];

  // Find sections with very low match
  Object.entries(sections).forEach(([key, section]) => {
    if (section.overallMatch < 20 && section.totalFieldsCount > 2) {
      insights.push({
        id: generateInsightId(),
        type: "info",
        title: `Low Alignment: ${section.sectionTitle}`,
        description: `Only ${section.overallMatch}% field alignment in ${section.sectionTitle}. Contexts have significantly different configurations.`,
        affectedContextIds: contexts.map((c) => Number(c.id)),
        affectedContextNames: contexts.map((c) => c.name || c.brand?.domain || "Unknown"),
        section: key as SectionKey,
        priority: "low",
        actionable: false,
      });
    }

    // Find sections with perfect match
    if (section.overallMatch === 100 && section.totalFieldsCount > 2) {
      insights.push({
        id: generateInsightId(),
        type: "success",
        title: `Perfect Alignment: ${section.sectionTitle}`,
        description: `100% field alignment in ${section.sectionTitle}. All contexts are fully aligned in this section.`,
        affectedContextIds: contexts.map((c) => Number(c.id)),
        affectedContextNames: contexts.map((c) => c.name || c.brand?.domain || "Unknown"),
        section: key as SectionKey,
        priority: "low",
        actionable: false,
      });
    }
  });

  return insights;
}

/**
 * Sort insights by priority
 */
function sortByPriority(insights: ComparisonInsight[]): ComparisonInsight[] {
  const priorityOrder: Record<InsightPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

/**
 * Generate all insights from comparison
 */
export function generateInsights(
  contexts: Configuration[],
  sections: Record<SectionKey, SectionComparison>,
  overlapMetrics: OverlapMetrics
): ComparisonInsight[] {
  const insights: ComparisonInsight[] = [];

  // Reset counter for consistent IDs
  insightIdCounter = 0;

  // Run all insight generators
  const riskInsight = checkRiskToleranceMisalignment(contexts);
  if (riskInsight) insights.push(riskInsight);

  const cmoInsight = checkCmoSafeInconsistency(contexts);
  if (cmoInsight) insights.push(cmoInsight);

  const competitorInsight = checkCompetitorOverlap(contexts, overlapMetrics);
  if (competitorInsight) insights.push(competitorInsight);

  const geoInsight = checkGeographyGaps(contexts);
  if (geoInsight) insights.push(geoInsight);

  const modelInsight = checkBusinessModelDifferences(contexts);
  if (modelInsight) insights.push(modelInsight);

  const cannibalizationInsight = checkKeywordCannibalization(contexts, overlapMetrics);
  if (cannibalizationInsight) insights.push(cannibalizationInsight);

  const sectionInsights = checkSectionMatchQuality(contexts, sections);
  insights.push(...sectionInsights);

  return sortByPriority(insights);
}
