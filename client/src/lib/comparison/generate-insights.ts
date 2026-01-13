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
  InsightCategory,
  InsightImpact,
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
        title: "STRATEGIC DIVERGENCE: Risk Tolerance Conflict",
        description: `${highRisk.map((r) => r.name).join(", ")} operate with high risk tolerance while ${lowRisk.map((r) => r.name).join(", ")} are conservative. This creates potential for conflicting market approaches.`,
        affectedContextIds: [...highRisk, ...lowRisk].map((r) => r.id),
        affectedContextNames: [...highRisk, ...lowRisk].map((r) => r.name),
        section: "strategic_intent",
        priority: "high",
        actionable: true,
        suggestion: "Document strategic rationale for risk differences or align approaches.",
        category: "positioning",
        estimatedImpact: "medium",
        actionItems: [
          "Review if risk tolerance differences are intentional market segmentation",
          "Document strategic rationale for each brand's risk approach",
          "Ensure marketing teams understand different risk parameters",
        ],
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
      title: "GOVERNANCE: CMO Approval Gap",
      description: `${notSafe.length} context(s) require CMO review before activation: ${notSafe.map((c) => c.name).join(", ")}`,
      affectedContextIds: notSafe.map((c) => c.id),
      affectedContextNames: notSafe.map((c) => c.name),
      section: "governance",
      priority: "medium",
      actionable: true,
      suggestion: "Schedule CMO review for pending contexts.",
      category: "resource",
      estimatedImpact: "medium",
      actionItems: [
        "Schedule CMO review meeting for non-approved contexts",
        "Prepare executive summary for each context requiring approval",
        "Document any blockers preventing CMO-safe status",
      ],
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
      title: "BATTLEFIELD: Shared Competitors Identified",
      description: `${overlapMetrics.sharedCompetitors.length} shared competitor(s) represent key battlegrounds: ${overlapMetrics.sharedCompetitors.slice(0, 5).join(", ")}`,
      affectedContextIds: contexts.map((c) => Number(c.id)),
      affectedContextNames: contexts.map((c) => c.name || c.brand?.domain || "Unknown"),
      section: "competitors",
      priority: "low",
      actionable: true,
      category: "threat",
      estimatedImpact: "low",
      actionItems: [
        "Analyze shared competitors' positioning strategies",
        "Identify differentiation opportunities against shared competitors",
        "Monitor shared competitors for market moves",
      ],
      metric: {
        value: overlapMetrics.sharedCompetitors.length,
        label: "Shared Competitors",
      },
    };
  }

  if (overlapMetrics.competitorOverlap < 20) {
    return {
      id: generateInsightId(),
      type: "info",
      title: "POSITIONING: Distinct Market Segments",
      description: `Only ${overlapMetrics.competitorOverlap}% competitor overlap indicates these brands target different market segments. This is healthy differentiation.`,
      affectedContextIds: contexts.map((c) => Number(c.id)),
      affectedContextNames: contexts.map((c) => c.name || c.brand?.domain || "Unknown"),
      section: "competitors",
      priority: "low",
      actionable: true,
      category: "positioning",
      estimatedImpact: "low",
      actionItems: [
        "Document differentiation strategy for stakeholders",
        "Ensure marketing messaging reinforces distinct positioning",
      ],
      metric: {
        value: overlapMetrics.competitorOverlap,
        label: "Competitor Overlap %",
      },
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
      title: "EXPANSION: Geographic Whitespace Detected",
      description: `Unique geographic presence: ${uniqueGeos.map((u) => `${u.context} → ${u.geo.toUpperCase()}`).join(", ")}. Potential expansion opportunity for other brands.`,
      affectedContextIds: contexts.map((c) => Number(c.id)),
      affectedContextNames: contexts.map((c) => c.name || c.brand?.domain || "Unknown"),
      section: "brand",
      priority: "medium",
      actionable: true,
      suggestion: "Evaluate geographic expansion ROI.",
      category: "opportunity",
      estimatedImpact: "high",
      actionItems: [
        "Analyze market size and growth potential in unique geographies",
        "Evaluate successful strategies that could be replicated",
        "Estimate investment required for geographic expansion",
        "Assess competitive landscape in target geographies",
      ],
      metric: {
        value: uniqueGeos.length,
        label: "Unique Geographies",
      },
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
      title: "STRATEGY: Multiple Business Models",
      description: `Different go-to-market approaches: ${Array.from(uniqueModels).join(", ")}. Ensure channel strategies align with each model.`,
      affectedContextIds: models.map((m) => m.id),
      affectedContextNames: models.map((m) => m.name),
      section: "brand",
      priority: "low",
      actionable: true,
      category: "resource",
      estimatedImpact: "low",
      actionItems: [
        "Ensure marketing budgets align with business model requirements",
        "Tailor channel mix to each business model's strengths",
      ],
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
      title: "THREAT: Keyword Cannibalization Risk",
      description: `${overlapMetrics.keywordOverlap}% keyword overlap with ${overlapMetrics.sharedKeywords.length} shared terms. Internal competition may be inflating CPCs and reducing efficiency.`,
      affectedContextIds: contexts.map((c) => Number(c.id)),
      affectedContextNames: contexts.map((c) => c.name || c.brand?.domain || "Unknown"),
      section: "demand_definition",
      priority: "high",
      actionable: true,
      suggestion: "Implement keyword deduplication strategy.",
      category: "threat",
      estimatedImpact: "high",
      actionItems: [
        "Audit shared keywords for internal bidding conflicts",
        "Assign keyword ownership to specific brands/contexts",
        "Implement negative keyword lists to prevent overlap",
        "Calculate estimated CPC savings from deduplication",
      ],
      metric: {
        value: overlapMetrics.keywordOverlap,
        label: "Keyword Overlap %",
      },
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
        title: `DIVERGENCE: ${section.sectionTitle} Strategies Differ`,
        description: `Only ${section.overallMatch}% alignment in ${section.sectionTitle}. This may be intentional differentiation or require review.`,
        affectedContextIds: contexts.map((c) => Number(c.id)),
        affectedContextNames: contexts.map((c) => c.name || c.brand?.domain || "Unknown"),
        section: key as SectionKey,
        priority: "low",
        actionable: true,
        category: "positioning",
        estimatedImpact: "low",
        actionItems: [
          `Review ${section.sectionTitle} configurations for intentional differences`,
          "Document strategic rationale if divergence is intentional",
        ],
      });
    }

    // Find sections with perfect match
    if (section.overallMatch === 100 && section.totalFieldsCount > 2) {
      insights.push({
        id: generateInsightId(),
        type: "success",
        title: `ALIGNMENT: ${section.sectionTitle} Fully Synchronized`,
        description: `100% alignment in ${section.sectionTitle}. Contexts share identical strategic approach in this area.`,
        affectedContextIds: contexts.map((c) => Number(c.id)),
        affectedContextNames: contexts.map((c) => c.name || c.brand?.domain || "Unknown"),
        section: key as SectionKey,
        priority: "low",
        actionable: false,
        category: "positioning",
        estimatedImpact: "low",
        actionItems: [],
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
