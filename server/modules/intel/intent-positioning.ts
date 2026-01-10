import type { Configuration } from "@shared/schema";
import type { ModuleRunResult, EntityItemResult, ItemTrace } from "@shared/module.contract";
import type { IntelligenceModuleResult, DecisionObject, OpportunityScorecard } from "./types";
import { BaseIntelligencePipeline } from "./base-pipeline";
import { storage } from "../../storage";

type IntentType = "informational" | "navigational" | "commercial" | "transactional";
type EffortLevel = "low" | "medium" | "high";

interface ExtractedKeyword {
  keyword: string;
  searchVolume: number;
  competitorPosition?: number;
  competitorCount?: number;
  theme?: string;
}

interface TransformedKeyword extends ExtractedKeyword {
  intent: IntentType;
}

interface CorrelatedKeyword extends TransformedKeyword {
  alignmentScore: number;
  matchedCategories: string[];
}

interface ScoredKeyword extends CorrelatedKeyword {
  opportunityScore: number;
  effort: EffortLevel;
  priorityTier: 1 | 2 | 3;
}

const INTENT_WEIGHTS: Record<IntentType, number> = {
  transactional: 1.0,
  commercial: 0.8,
  informational: 0.6,
  navigational: 0.4
};

const INFORMATIONAL_PATTERNS = ["how", "what", "why", "guide", "tutorial", "tips", "learn", "ways to"];
const NAVIGATIONAL_PATTERNS = ["login", "sign up", "signin", "signup", "account", "portal"];
const COMMERCIAL_PATTERNS = ["best", "top", "review", "compare", "vs", "versus", "comparison", "alternative"];
const TRANSACTIONAL_PATTERNS = ["buy", "price", "order", "discount", "deal", "shop", "purchase", "cheap", "sale", "coupon"];

class IntentPositioningPipeline extends BaseIntelligencePipeline {
  private extractedKeywords: ExtractedKeyword[] = [];
  private transformedKeywords: TransformedKeyword[] = [];
  private correlatedKeywords: CorrelatedKeyword[] = [];
  private scoredKeywords: ScoredKeyword[] = [];
  private decisions: DecisionObject[] = [];

  constructor(config: Configuration) {
    super("intel.intent_positioning.v1", config);
  }

  protected async extract(inputs: Record<string, unknown>): Promise<void> {
    const userId = inputs.userId as string;
    const configId = this.context.config.id;

    if (!userId || configId === undefined || configId === null) {
      this.addWarning("MISSING_CONTEXT", "userId or configId not provided");
      return;
    }

    this.markSectionUsed("B");
    this.markSectionUsed("D");

    const runs = await storage.getModuleRunsByConfig(Number(configId), userId);
    const keywordGapRuns = runs.filter(
      run => run.moduleId.includes("keyword_gap") && run.status === "completed" && run.results
    );

    if (keywordGapRuns.length > 0) {
      const latestRun = keywordGapRuns[0];
      this.markDataSource("DataForSEO", { available: true, lastChecked: new Date() });

      const results = latestRun.results as Record<string, unknown> | null;
      if (results) {
        const items = (results.items || results.topOpportunities || []) as Array<Record<string, unknown>>;

        for (const item of items) {
          const competitorsSeen = item.competitorsSeen as string[] | undefined;
          this.extractedKeywords.push({
            keyword: String(item.keyword || item.title || ""),
            searchVolume: Number(item.searchVolume || item.mentions || 0),
            competitorPosition: Number(item.competitorPosition || item.position || 0),
            competitorCount: Number(item.competitorCount || competitorsSeen?.length || 0),
            theme: String(item.theme || "")
          });
        }
      }

      this.addTrace({
        ruleId: "extract_keyword_gap",
        ucrSection: "B",
        reason: `Extracted ${this.extractedKeywords.length} keywords from Keyword Gap run`,
        severity: "low"
      });
    } else {
      this.markDataSource("DataForSEO", { available: false, error: "No Keyword Gap data found", lastChecked: new Date() });

      const categoryDef = this.context.config.category_definition;
      const categoryTerms: string[] = [];

      if (categoryDef) {
        if (categoryDef.included && categoryDef.included.length > 0) {
          categoryTerms.push(...categoryDef.included);
        }
        if (categoryDef.semantic_extensions && categoryDef.semantic_extensions.length > 0) {
          categoryTerms.push(...categoryDef.semantic_extensions);
        }
        if (categoryDef.primary_category) {
          categoryTerms.push(categoryDef.primary_category);
        }
        if (categoryDef.approved_categories && categoryDef.approved_categories.length > 0) {
          categoryTerms.push(...categoryDef.approved_categories);
        }
      }

      for (const term of categoryTerms) {
        if (term) {
          this.extractedKeywords.push({
            keyword: term,
            searchVolume: 100,
            competitorPosition: 50,
            theme: "category_term"
          });
        }
      }

      this.addTrace({
        ruleId: "extract_category_fallback",
        ucrSection: "B",
        reason: `No Keyword Gap data found. Using ${this.extractedKeywords.length} category terms as fallback`,
        severity: "medium"
      });
    }
  }

  protected async transform(): Promise<void> {
    const brandNames = this.getBrandNames();

    for (const kw of this.extractedKeywords) {
      const intent = this.classifyIntent(kw.keyword.toLowerCase(), brandNames);
      this.transformedKeywords.push({
        ...kw,
        intent
      });
    }

    this.addTrace({
      ruleId: "transform_intent_classification",
      ucrSection: "D",
      reason: `Classified intent for ${this.transformedKeywords.length} keywords`,
      severity: "low"
    });
  }

  private getBrandNames(): string[] {
    const names: string[] = [];
    const brand = this.context.config.brand;
    if (brand?.name) names.push(brand.name.toLowerCase());
    if (brand?.domain) names.push(brand.domain.toLowerCase().replace(/\.(com|net|org|io)$/, ""));

    const competitorEntries = this.context.config.competitors?.competitors || [];
    for (const comp of competitorEntries) {
      if (comp.domain) {
        names.push(comp.domain.toLowerCase().replace(/\.(com|net|org|io)$/, ""));
      }
      if (comp.name) {
        names.push(comp.name.toLowerCase());
      }
    }

    const directCompetitors = this.context.config.competitors?.direct || [];
    for (const domain of directCompetitors) {
      if (domain) {
        names.push(domain.toLowerCase().replace(/\.(com|net|org|io)$/, ""));
      }
    }

    return names.filter(Boolean);
  }

  private classifyIntent(keyword: string, brandNames: string[]): IntentType {
    const words = keyword.split(/\s+/);

    if (TRANSACTIONAL_PATTERNS.some(p => words.includes(p) || keyword.includes(p))) {
      return "transactional";
    }

    if (COMMERCIAL_PATTERNS.some(p => words.includes(p) || keyword.includes(p))) {
      return "commercial";
    }

    if (NAVIGATIONAL_PATTERNS.some(p => words.includes(p) || keyword.includes(p))) {
      return "navigational";
    }

    if (brandNames.some(brand => keyword.includes(brand))) {
      return "navigational";
    }

    if (INFORMATIONAL_PATTERNS.some(p => words.includes(p) || keyword.includes(p))) {
      return "informational";
    }

    return "informational";
  }

  protected async correlate(): Promise<void> {
    const categoryDef = this.context.config.category_definition;
    const categoryTerms: string[] = [];

    if (categoryDef) {
      if (categoryDef.primary_category) categoryTerms.push(categoryDef.primary_category.toLowerCase());
      if (categoryDef.approved_categories && categoryDef.approved_categories.length > 0) {
        categoryTerms.push(...categoryDef.approved_categories.map((c: string) => c.toLowerCase()));
      }
      if (categoryDef.included && categoryDef.included.length > 0) {
        categoryTerms.push(...categoryDef.included.map((c: string) => c.toLowerCase()));
      }
      if (categoryDef.semantic_extensions && categoryDef.semantic_extensions.length > 0) {
        categoryTerms.push(...categoryDef.semantic_extensions.map((c: string) => c.toLowerCase()));
      }
    }

    for (const kw of this.transformedKeywords) {
      const keywordLower = kw.keyword.toLowerCase();
      const matchedCategories: string[] = [];
      let alignmentScore = 0;

      for (const cat of categoryTerms) {
        if (keywordLower.includes(cat) || cat.includes(keywordLower)) {
          matchedCategories.push(cat);
        }
      }

      if (matchedCategories.length > 0) {
        alignmentScore = Math.min(1, matchedCategories.length * 0.33);
      } else {
        const keywordWords = keywordLower.split(/\s+/);
        const categoryWords = categoryTerms.flatMap(c => c.split(/\s+/));
        const overlap = keywordWords.filter(w => categoryWords.includes(w)).length;
        alignmentScore = Math.min(0.5, overlap * 0.15);
      }

      this.correlatedKeywords.push({
        ...kw,
        alignmentScore,
        matchedCategories
      });
    }

    this.addTrace({
      ruleId: "correlate_category_alignment",
      ucrSection: "B",
      reason: `Calculated alignment scores for ${this.correlatedKeywords.length} keywords`,
      severity: "low"
    });
  }

  protected async score(): Promise<void> {
    for (const kw of this.correlatedKeywords) {
      const intentWeight = INTENT_WEIGHTS[kw.intent];
      const opportunityScore = kw.searchVolume * kw.alignmentScore * intentWeight;

      let effort: EffortLevel;
      const position = kw.competitorPosition || 50;
      if (position > 50) {
        effort = "high";
      } else if (position > 20) {
        effort = "medium";
      } else {
        effort = "low";
      }

      let priorityTier: 1 | 2 | 3;
      if (opportunityScore > 1000 && effort !== "high") {
        priorityTier = 1;
      } else if (opportunityScore > 500 || effort === "low") {
        priorityTier = 2;
      } else {
        priorityTier = 3;
      }

      this.scoredKeywords.push({
        ...kw,
        opportunityScore,
        effort,
        priorityTier
      });
    }

    this.scoredKeywords.sort((a, b) => b.opportunityScore - a.opportunityScore);

    this.addTrace({
      ruleId: "score_opportunities",
      ucrSection: "D",
      reason: `Scored ${this.scoredKeywords.length} opportunities`,
      severity: "low"
    });
  }

  protected async disposition(): Promise<IntelligenceModuleResult> {
    const items: EntityItemResult[] = [];
    const opportunities: OpportunityScorecard[] = [];

    const topKeywords = this.scoredKeywords.slice(0, 50);

    for (const kw of topKeywords) {
      const itemId = `pos_${Buffer.from(kw.keyword).toString("base64").slice(0, 12)}`;

      let sentiment: "positive" | "neutral" | "negative";
      if (kw.alignmentScore > 0.5) {
        sentiment = "positive";
      } else if (kw.alignmentScore > 0.2) {
        sentiment = "neutral";
      } else {
        sentiment = "negative";
      }

      let confidence: "high" | "medium" | "low";
      if (kw.searchVolume > 1000 && kw.alignmentScore > 0.5) {
        confidence = "high";
      } else if (kw.searchVolume > 100 || kw.alignmentScore > 0.3) {
        confidence = "medium";
      } else {
        confidence = "low";
      }

      const trace: ItemTrace[] = [
        {
          ruleId: "intent_classification",
          ucrSection: "D",
          reason: `Classified as ${kw.intent} intent`,
          severity: "low"
        },
        {
          ruleId: "category_alignment",
          ucrSection: "B",
          reason: `Alignment score: ${(kw.alignmentScore * 100).toFixed(0)}%`,
          severity: "low"
        }
      ];

      items.push({
        itemType: "entity",
        itemId,
        title: kw.keyword,
        entityName: kw.keyword,
        entityType: "positioning_opportunity",
        mentions: kw.searchVolume,
        sentiment,
        confidence,
        trace
      });

      opportunities.push({
        keyword: kw.keyword,
        searchVolume: kw.searchVolume,
        capabilityScore: kw.alignmentScore,
        opportunityScore: kw.opportunityScore,
        effort: kw.effort,
        priorityTier: kw.priorityTier,
        signals: []
      });
    }

    const tier1Count = topKeywords.filter(k => k.priorityTier === 1).length;
    const tier2Count = topKeywords.filter(k => k.priorityTier === 2).length;

    if (tier1Count > 0) {
      this.decisions.push({
        decisionId: `decision_high_priority_${Date.now()}`,
        signal: `${tier1Count} high-priority positioning opportunities identified`,
        confidence: "high",
        source: "intent_positioning",
        evidence: topKeywords.filter(k => k.priorityTier === 1).slice(0, 3).map(k => k.keyword),
        actionType: "act_now",
        ucrAlignment: ["B", "D"]
      });
    }

    if (tier2Count > 0) {
      this.decisions.push({
        decisionId: `decision_medium_priority_${Date.now()}`,
        signal: `${tier2Count} medium-priority opportunities worth investigating`,
        confidence: "medium",
        source: "intent_positioning",
        evidence: topKeywords.filter(k => k.priorityTier === 2).slice(0, 3).map(k => k.keyword),
        actionType: "investigate",
        ucrAlignment: ["B", "D"]
      });
    }

    const available = Object.entries(this.context.dataSources)
      .filter(([_, s]) => s.available)
      .map(([name]) => name);
    const missing = Object.entries(this.context.dataSources)
      .filter(([_, s]) => !s.available)
      .map(([name]) => name);

    const baseSummary = {
      totalSignals: this.decisions.length,
      actionableCount: this.decisions.filter(d => d.actionType === "act_now").length,
      dataSourcesUsed: available,
      dataSourcesMissing: missing,
      partialData: missing.length > 0
    };

    const extendedSummary = {
      ...baseSummary,
      totalKeywords: this.scoredKeywords.length,
      tier1Opportunities: tier1Count,
      tier2Opportunities: tier2Count,
      intentBreakdown: {
        transactional: this.scoredKeywords.filter(k => k.intent === "transactional").length,
        commercial: this.scoredKeywords.filter(k => k.intent === "commercial").length,
        informational: this.scoredKeywords.filter(k => k.intent === "informational").length,
        navigational: this.scoredKeywords.filter(k => k.intent === "navigational").length
      }
    };

    return {
      decisions: this.decisions,
      opportunities,
      items,
      summary: extendedSummary as IntelligenceModuleResult["summary"],
      meta: {
        executedAt: new Date().toISOString(),
        durationMs: Date.now() - this.startTime,
        cacheHits: []
      }
    };
  }
}

export async function analyzeIntentPositioning(
  config: Configuration,
  inputs: Record<string, unknown>
): Promise<ModuleRunResult> {
  const pipeline = new IntentPositioningPipeline(config);
  return pipeline.execute(inputs);
}
