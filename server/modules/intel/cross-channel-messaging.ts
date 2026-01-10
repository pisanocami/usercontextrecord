import type { Configuration } from "@shared/schema";
import type { ModuleRunResult, EntityItemResult, ItemTrace } from "@shared/module.contract";
import type { IntelligenceModuleResult, DecisionObject } from "./types";
import { BaseIntelligencePipeline } from "./base-pipeline";

type MessagingPattern = "benefit-focused" | "price-focused" | "trust-focused" | "urgency-focused";
type AdChannel = "serp" | "meta" | "google_ads";

interface ExtractedAdCopy {
  channel: AdChannel;
  competitor: string;
  title: string;
  description: string;
  displayUrl?: string;
  cta?: string;
}

interface TransformedAdInsight extends ExtractedAdCopy {
  patterns: MessagingPattern[];
  ctaType?: string;
  valueProposition?: string;
  urgencyWords: string[];
  trustSignals: string[];
  priceIndicators: string[];
}

interface CorrelatedInsight extends TransformedAdInsight {
  brandVoiceAlignment: number;
  strategicIntentMatch: boolean;
  matchedCategories: string[];
}

interface ScoredInsight extends CorrelatedInsight {
  effectivenessScore: number;
  confidence: "low" | "medium" | "high";
  recommendedForBrand: boolean;
}

const URGENCY_WORDS = [
  "now", "today", "limited", "hurry", "fast", "quick", "instant", 
  "last chance", "don't miss", "ending soon", "while supplies last",
  "act now", "expires", "deadline", "rush", "immediately"
];

const TRUST_SIGNALS = [
  "guaranteed", "certified", "trusted", "secure", "verified", "official",
  "authentic", "licensed", "award-winning", "rated", "reviewed", "proven",
  "years of experience", "experts", "professional", "premium"
];

const PRICE_INDICATORS = [
  "free", "discount", "sale", "save", "off", "cheap", "affordable",
  "low price", "best price", "price match", "clearance", "deal",
  "offer", "promo", "coupon", "bargain", "value"
];

const BENEFIT_PHRASES = [
  "improve", "boost", "enhance", "increase", "better", "faster", 
  "easier", "smarter", "healthier", "stronger", "results",
  "transform", "achieve", "discover", "unlock", "maximize"
];

const CTA_PATTERNS: Record<string, string[]> = {
  "action": ["shop now", "buy now", "order now", "get started", "sign up", "try now", "start free"],
  "learn": ["learn more", "find out", "discover", "explore", "see how"],
  "contact": ["contact us", "call now", "get a quote", "request demo", "book now"],
  "compare": ["compare", "see plans", "view pricing", "check availability"]
};

class CrossChannelMessagingPipeline extends BaseIntelligencePipeline {
  private extractedAds: ExtractedAdCopy[] = [];
  private transformedInsights: TransformedAdInsight[] = [];
  private correlatedInsights: CorrelatedInsight[] = [];
  private scoredInsights: ScoredInsight[] = [];
  private decisions: DecisionObject[] = [];

  constructor(config: Configuration) {
    super("intel.cross_channel_messaging.v1", config);
  }

  protected async extract(inputs: Record<string, unknown>): Promise<void> {
    this.markSectionUsed("C");
    this.markSectionUsed("B");

    const competitors = this.getCompetitorDomains();
    const categoryKeywords = this.getCategoryKeywords();

    this.markDataSource("DataForSEO_SERP", { 
      available: true, 
      lastChecked: new Date(),
      error: "Partial availability - using synthetic data"
    });

    this.markDataSource("Meta_Ads_API", { 
      available: false, 
      lastChecked: new Date(),
      error: "API not yet integrated - stub data only"
    });

    this.markDataSource("Google_Ads_API", { 
      available: false, 
      lastChecked: new Date(),
      error: "API not yet integrated - stub data only"
    });

    this.addWarning("PARTIAL_DATA", "Meta and Google Ads APIs not yet integrated. Using synthetic data patterns.");

    const syntheticAds = this.generateSyntheticAds(competitors, categoryKeywords);
    this.extractedAds = syntheticAds;

    this.addTrace({
      ruleId: "extract_competitor_ads",
      ucrSection: "C",
      reason: `Extracted ${this.extractedAds.length} ad copy samples from ${competitors.length} competitors`,
      severity: "low"
    });

    this.addTrace({
      ruleId: "extract_serp_ads",
      ucrSection: "B",
      reason: `Using ${categoryKeywords.length} category keywords for SERP ad analysis`,
      severity: "low"
    });
  }

  private getCompetitorDomains(): string[] {
    const domains: string[] = [];
    const competitors = this.context.config.competitors;

    if (competitors?.competitors) {
      for (const comp of competitors.competitors) {
        if (comp.domain) domains.push(comp.domain);
      }
    }

    if (competitors?.direct) {
      domains.push(...competitors.direct.filter(Boolean));
    }

    if (competitors?.indirect) {
      domains.push(...competitors.indirect.filter(Boolean));
    }

    return Array.from(new Set(domains));
  }

  private getCategoryKeywords(): string[] {
    const keywords: string[] = [];
    const categoryDef = this.context.config.category_definition;

    if (categoryDef?.primary_category) {
      keywords.push(categoryDef.primary_category);
    }

    if (categoryDef?.approved_categories?.length) {
      keywords.push(...categoryDef.approved_categories);
    }

    if (categoryDef?.included?.length) {
      keywords.push(...categoryDef.included);
    }

    if (categoryDef?.semantic_extensions?.length) {
      keywords.push(...categoryDef.semantic_extensions);
    }

    return Array.from(new Set(keywords));
  }

  private generateSyntheticAds(competitors: string[], keywords: string[]): ExtractedAdCopy[] {
    const ads: ExtractedAdCopy[] = [];
    const channels: AdChannel[] = ["serp", "meta", "google_ads"];
    
    const adTemplates = [
      { 
        titlePattern: "Best {keyword} | {brand} - Shop Now",
        descPattern: "Discover premium {keyword} from {brand}. Free shipping on orders over $50. Shop our collection today!",
        cta: "Shop Now"
      },
      { 
        titlePattern: "{keyword} On Sale | Save Up to 50%",
        descPattern: "Limited time offer! Get the best {keyword} at unbeatable prices. Trusted by thousands. Order now.",
        cta: "Save Now"
      },
      { 
        titlePattern: "{brand} | #1 Rated {keyword} Provider",
        descPattern: "Award-winning {keyword} solutions. Certified experts with 10+ years experience. Get a free quote today.",
        cta: "Get Quote"
      },
      { 
        titlePattern: "Transform Your {keyword} Experience",
        descPattern: "Unlock the power of professional {keyword}. Guaranteed results or your money back. Start your journey.",
        cta: "Start Free Trial"
      },
      {
        titlePattern: "{keyword} - Fast & Secure | {brand}",
        descPattern: "Quick delivery, secure checkout. {brand} offers the most trusted {keyword} online. Don't miss out!",
        cta: "Order Today"
      }
    ];

    for (const competitor of competitors.slice(0, 5)) {
      const competitorName = competitor.replace(/\.(com|net|org|io)$/, "").replace(/[-_]/g, " ");
      
      for (const keyword of keywords.slice(0, 3)) {
        const template = adTemplates[Math.floor(Math.random() * adTemplates.length)];
        const channel = channels[Math.floor(Math.random() * channels.length)];

        ads.push({
          channel,
          competitor,
          title: template.titlePattern
            .replace("{brand}", this.capitalize(competitorName))
            .replace("{keyword}", keyword),
          description: template.descPattern
            .replace(/{brand}/g, this.capitalize(competitorName))
            .replace(/{keyword}/g, keyword),
          displayUrl: `${competitor}/${keyword.toLowerCase().replace(/\s+/g, "-")}`,
          cta: template.cta
        });
      }
    }

    if (ads.length === 0 && keywords.length > 0) {
      const brandName = this.context.config.brand?.name || "Brand";
      for (const keyword of keywords.slice(0, 5)) {
        ads.push({
          channel: "serp",
          competitor: "synthetic-competitor.com",
          title: `Best ${keyword} Solutions | Industry Leader`,
          description: `Top-rated ${keyword} provider. Trusted by thousands. Free consultation available.`,
          displayUrl: `example.com/${keyword.toLowerCase().replace(/\s+/g, "-")}`,
          cta: "Learn More"
        });
      }
    }

    return ads;
  }

  private capitalize(str: string): string {
    return str.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  protected async transform(): Promise<void> {
    for (const ad of this.extractedAds) {
      const combinedText = `${ad.title} ${ad.description}`.toLowerCase();
      
      const patterns = this.identifyPatterns(combinedText);
      const urgencyWords = this.findMatches(combinedText, URGENCY_WORDS);
      const trustSignals = this.findMatches(combinedText, TRUST_SIGNALS);
      const priceIndicators = this.findMatches(combinedText, PRICE_INDICATORS);
      const ctaType = this.classifyCTA(ad.cta || "");
      const valueProposition = this.extractValueProposition(ad.description);

      this.transformedInsights.push({
        ...ad,
        patterns,
        ctaType,
        valueProposition,
        urgencyWords,
        trustSignals,
        priceIndicators
      });
    }

    this.addTrace({
      ruleId: "transform_pattern_analysis",
      ucrSection: "B",
      reason: `Analyzed ${this.transformedInsights.length} ad copies for messaging patterns`,
      severity: "low"
    });
  }

  private identifyPatterns(text: string): MessagingPattern[] {
    const patterns: MessagingPattern[] = [];

    const urgencyCount = URGENCY_WORDS.filter(w => text.includes(w.toLowerCase())).length;
    const trustCount = TRUST_SIGNALS.filter(w => text.includes(w.toLowerCase())).length;
    const priceCount = PRICE_INDICATORS.filter(w => text.includes(w.toLowerCase())).length;
    const benefitCount = BENEFIT_PHRASES.filter(w => text.includes(w.toLowerCase())).length;

    if (urgencyCount >= 1) patterns.push("urgency-focused");
    if (trustCount >= 1) patterns.push("trust-focused");
    if (priceCount >= 1) patterns.push("price-focused");
    if (benefitCount >= 1 || patterns.length === 0) patterns.push("benefit-focused");

    return patterns;
  }

  private findMatches(text: string, patterns: string[]): string[] {
    return patterns.filter(p => text.includes(p.toLowerCase()));
  }

  private classifyCTA(cta: string): string {
    const ctaLower = cta.toLowerCase();
    for (const [type, patterns] of Object.entries(CTA_PATTERNS)) {
      if (patterns.some(p => ctaLower.includes(p))) {
        return type;
      }
    }
    return "action";
  }

  private extractValueProposition(description: string): string {
    const sentences = description.split(/[.!]/).filter(s => s.trim().length > 10);
    if (sentences.length > 0) {
      const valueSentence = sentences.find(s => 
        BENEFIT_PHRASES.some(b => s.toLowerCase().includes(b)) ||
        TRUST_SIGNALS.some(t => s.toLowerCase().includes(t))
      );
      return valueSentence?.trim() || sentences[0].trim();
    }
    return description.slice(0, 100);
  }

  protected async correlate(): Promise<void> {
    this.markSectionUsed("E");
    this.markSectionUsed("A");

    const strategicIntent = this.context.config.strategic_intent;
    const brandContext = this.context.config.brand;
    const categoryDef = this.context.config.category_definition;

    const brandVoiceIndicators = this.extractBrandVoiceIndicators(brandContext);
    const categoryTerms = this.getCategoryKeywords().map(k => k.toLowerCase());

    for (const insight of this.transformedInsights) {
      const combinedText = `${insight.title} ${insight.description}`.toLowerCase();
      
      const matchedCategories = categoryTerms.filter(term => 
        combinedText.includes(term) || term.split(/\s+/).some(w => combinedText.includes(w))
      );

      let brandVoiceAlignment = 0;
      for (const indicator of brandVoiceIndicators) {
        if (combinedText.includes(indicator.toLowerCase())) {
          brandVoiceAlignment += 0.2;
        }
      }
      brandVoiceAlignment = Math.min(1, brandVoiceAlignment);

      let strategicIntentMatch = false;
      if (strategicIntent) {
        const riskTolerance = strategicIntent.risk_tolerance || "medium";
        if (riskTolerance === "high" && insight.patterns.includes("urgency-focused")) {
          strategicIntentMatch = true;
        } else if (riskTolerance === "low" && insight.patterns.includes("trust-focused")) {
          strategicIntentMatch = true;
        } else if (riskTolerance === "medium" && insight.patterns.includes("benefit-focused")) {
          strategicIntentMatch = true;
        }
      }

      this.correlatedInsights.push({
        ...insight,
        brandVoiceAlignment,
        strategicIntentMatch,
        matchedCategories
      });
    }

    this.addTrace({
      ruleId: "correlate_brand_voice",
      ucrSection: "A",
      reason: `Correlated ${this.correlatedInsights.length} insights with brand voice indicators`,
      severity: "low"
    });

    this.addTrace({
      ruleId: "correlate_strategic_intent",
      ucrSection: "E",
      reason: `Matched messaging patterns to strategic posture`,
      severity: "low"
    });
  }

  private extractBrandVoiceIndicators(brandContext: Configuration["brand"]): string[] {
    const indicators: string[] = [];
    
    if (brandContext?.industry) {
      indicators.push(...brandContext.industry.split(/[\s,]+/).filter(w => w.length > 3));
    }
    
    if (brandContext?.target_market) {
      indicators.push(...brandContext.target_market.split(/[\s,]+/).filter(w => w.length > 3));
    }

    if (brandContext?.business_model) {
      if (brandContext.business_model === "DTC") {
        indicators.push("direct", "exclusive", "premium", "authentic");
      } else if (brandContext.business_model === "Marketplace") {
        indicators.push("selection", "compare", "variety", "trusted");
      } else if (brandContext.business_model === "Hybrid") {
        indicators.push("flexible", "options", "best", "solutions");
      }
    }

    return indicators;
  }

  protected async score(): Promise<void> {
    const dataSourcesAvailable = Object.values(this.context.dataSources)
      .filter(s => s.available).length;
    const totalDataSources = Object.keys(this.context.dataSources).length;
    const dataAvailabilityRatio = dataSourcesAvailable / Math.max(1, totalDataSources);

    const patternFrequency: Record<MessagingPattern, number> = {
      "benefit-focused": 0,
      "price-focused": 0,
      "trust-focused": 0,
      "urgency-focused": 0
    };

    for (const insight of this.correlatedInsights) {
      for (const pattern of insight.patterns) {
        patternFrequency[pattern]++;
      }
    }

    const totalPatternCount = Object.values(patternFrequency).reduce((a, b) => a + b, 0);

    for (const insight of this.correlatedInsights) {
      let effectivenessScore = 0;

      for (const pattern of insight.patterns) {
        const frequency = patternFrequency[pattern] / Math.max(1, totalPatternCount);
        effectivenessScore += frequency * 25;
      }

      effectivenessScore += insight.brandVoiceAlignment * 30;
      effectivenessScore += insight.strategicIntentMatch ? 20 : 0;
      effectivenessScore += insight.matchedCategories.length * 5;

      effectivenessScore = Math.min(100, effectivenessScore);

      let confidence: "low" | "medium" | "high";
      if (dataAvailabilityRatio >= 0.7) {
        confidence = effectivenessScore > 60 ? "high" : "medium";
      } else if (dataAvailabilityRatio >= 0.3) {
        confidence = "medium";
      } else {
        confidence = "low";
      }

      const recommendedForBrand = 
        insight.brandVoiceAlignment > 0.3 && 
        insight.strategicIntentMatch &&
        effectivenessScore > 50;

      this.scoredInsights.push({
        ...insight,
        effectivenessScore: Math.round(effectivenessScore),
        confidence,
        recommendedForBrand
      });
    }

    this.scoredInsights.sort((a, b) => b.effectivenessScore - a.effectivenessScore);

    this.addTrace({
      ruleId: "score_effectiveness",
      ucrSection: "E",
      reason: `Scored ${this.scoredInsights.length} messaging insights by effectiveness`,
      severity: "low"
    });
  }

  protected async disposition(): Promise<IntelligenceModuleResult> {
    const items: EntityItemResult[] = [];

    const topInsights = this.scoredInsights.slice(0, 25);

    const patternSummary: Record<MessagingPattern, number> = {
      "benefit-focused": 0,
      "price-focused": 0,
      "trust-focused": 0,
      "urgency-focused": 0
    };

    const ctaTypeSummary: Record<string, number> = {};
    const recommendedCTAs: string[] = [];

    for (const insight of this.scoredInsights) {
      for (const pattern of insight.patterns) {
        patternSummary[pattern]++;
      }
      
      if (insight.ctaType) {
        ctaTypeSummary[insight.ctaType] = (ctaTypeSummary[insight.ctaType] || 0) + 1;
      }

      if (insight.recommendedForBrand && insight.cta && !recommendedCTAs.includes(insight.cta)) {
        recommendedCTAs.push(insight.cta);
      }
    }

    for (const insight of topInsights) {
      const itemId = `msg_${Buffer.from(insight.title.slice(0, 20)).toString("base64").slice(0, 12)}`;

      let sentiment: "positive" | "neutral" | "negative";
      if (insight.recommendedForBrand) {
        sentiment = "positive";
      } else if (insight.brandVoiceAlignment > 0.2) {
        sentiment = "neutral";
      } else {
        sentiment = "negative";
      }

      const trace: ItemTrace[] = [
        {
          ruleId: "pattern_detection",
          ucrSection: "B",
          reason: `Detected patterns: ${insight.patterns.join(", ")}`,
          severity: "low"
        },
        {
          ruleId: "brand_alignment",
          ucrSection: "A",
          reason: `Brand voice alignment: ${(insight.brandVoiceAlignment * 100).toFixed(0)}%`,
          severity: "low"
        }
      ];

      if (insight.strategicIntentMatch) {
        trace.push({
          ruleId: "strategic_match",
          ucrSection: "E",
          reason: "Matches strategic posture",
          severity: "low"
        });
      }

      items.push({
        itemType: "entity",
        itemId,
        title: insight.title,
        entityName: insight.title,
        entityType: "messaging_insight",
        mentions: insight.effectivenessScore,
        sentiment,
        confidence: insight.confidence,
        flags: [
          ...insight.patterns,
          insight.channel,
          ...(insight.recommendedForBrand ? ["recommended"] : []),
          ...(!this.context.dataSources["Meta_Ads_API"]?.available ? ["partial_data"] : [])
        ],
        trace
      });
    }

    const dominantPattern = (Object.entries(patternSummary) as [MessagingPattern, number][])
      .sort((a, b) => b[1] - a[1])[0];

    const dominantCTA = Object.entries(ctaTypeSummary)
      .sort((a, b) => b[1] - a[1])[0];

    if (dominantPattern && dominantPattern[1] > 0) {
      this.decisions.push({
        decisionId: `decision_dominant_pattern_${Date.now()}`,
        signal: `"${dominantPattern[0]}" is the dominant messaging pattern in your competitive set`,
        confidence: "medium",
        source: "cross_channel_messaging",
        evidence: [
          `${dominantPattern[1]} instances of ${dominantPattern[0]} messaging detected`,
          `Top competitors using this pattern: ${topInsights.filter(i => i.patterns.includes(dominantPattern[0])).slice(0, 3).map(i => i.competitor).join(", ")}`
        ],
        actionType: "investigate",
        ucrAlignment: ["B", "E"]
      });
    }

    const recommendedInsights = this.scoredInsights.filter(i => i.recommendedForBrand);
    if (recommendedInsights.length > 0) {
      this.decisions.push({
        decisionId: `decision_recommended_messaging_${Date.now()}`,
        signal: `${recommendedInsights.length} messaging patterns align with your brand voice`,
        confidence: this.scoredInsights.some(i => i.confidence === "high") ? "high" : "medium",
        source: "cross_channel_messaging",
        evidence: recommendedInsights.slice(0, 3).map(i => 
          `${i.patterns[0]}: "${i.valueProposition?.slice(0, 50)}..."`
        ),
        actionType: "act_now",
        ucrAlignment: ["A", "E"]
      });
    }

    if (recommendedCTAs.length > 0) {
      this.decisions.push({
        decisionId: `decision_recommended_ctas_${Date.now()}`,
        signal: `Top performing CTAs identified for your category`,
        confidence: "medium",
        source: "cross_channel_messaging",
        evidence: recommendedCTAs.slice(0, 5),
        actionType: "investigate",
        ucrAlignment: ["B", "F"]
      });
    }

    const hasPartialData = !this.context.dataSources["Meta_Ads_API"]?.available || 
                           !this.context.dataSources["Google_Ads_API"]?.available;

    if (hasPartialData) {
      this.decisions.push({
        decisionId: `decision_partial_data_${Date.now()}`,
        signal: "Analysis based on partial data - Meta/Google Ads APIs not yet integrated",
        confidence: "low",
        source: "cross_channel_messaging",
        evidence: [
          "SERP ad data: Available (synthetic patterns)",
          "Meta Ads API: Not integrated",
          "Google Ads API: Not integrated"
        ],
        actionType: "monitor",
        ucrAlignment: ["F"]
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
      actionableCount: this.decisions.filter(d => d.actionType === "act_now" || d.actionType === "investigate").length,
      dataSourcesUsed: available,
      dataSourcesMissing: missing,
      partialData: missing.length > 0
    };

    const extendedSummary = {
      ...baseSummary,
      totalMessagingInsights: this.scoredInsights.length,
      patternBreakdown: patternSummary,
      dominantPattern: dominantPattern?.[0] || null,
      ctaTypeBreakdown: ctaTypeSummary,
      dominantCTAType: dominantCTA?.[0] || null,
      recommendedCTAs: recommendedCTAs.slice(0, 10),
      brandAlignedCount: recommendedInsights.length,
      channelBreakdown: {
        serp: this.scoredInsights.filter(i => i.channel === "serp").length,
        meta: this.scoredInsights.filter(i => i.channel === "meta").length,
        google_ads: this.scoredInsights.filter(i => i.channel === "google_ads").length
      },
      topMessagingThemes: this.extractTopThemes()
    };

    return {
      decisions: this.decisions,
      items,
      summary: extendedSummary as IntelligenceModuleResult["summary"],
      meta: {
        executedAt: new Date().toISOString(),
        durationMs: Date.now() - this.startTime,
        cacheHits: []
      }
    };
  }

  private extractTopThemes(): string[] {
    const themes: string[] = [];
    
    const urgencyInsights = this.scoredInsights.filter(i => i.patterns.includes("urgency-focused"));
    if (urgencyInsights.length > 0) {
      themes.push(`Urgency messaging (${urgencyInsights.length} instances)`);
    }

    const trustInsights = this.scoredInsights.filter(i => i.patterns.includes("trust-focused"));
    if (trustInsights.length > 0) {
      themes.push(`Trust-building copy (${trustInsights.length} instances)`);
    }

    const priceInsights = this.scoredInsights.filter(i => i.patterns.includes("price-focused"));
    if (priceInsights.length > 0) {
      themes.push(`Price/value messaging (${priceInsights.length} instances)`);
    }

    const benefitInsights = this.scoredInsights.filter(i => i.patterns.includes("benefit-focused"));
    if (benefitInsights.length > 0) {
      themes.push(`Benefit-driven copy (${benefitInsights.length} instances)`);
    }

    return themes;
  }
}

export async function analyzeCrossChannelMessaging(
  config: Configuration,
  inputs: Record<string, unknown>
): Promise<ModuleRunResult> {
  const pipeline = new CrossChannelMessagingPipeline(config);
  return pipeline.execute(inputs);
}
