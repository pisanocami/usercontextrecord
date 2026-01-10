/**
 * CompetitiveSignalDetector
 * 
 * Detects competitive intelligence signals from Keyword Gap and Market Demand data.
 * Uses UCR context to prioritize signals and generates actionable insights.
 */

import { db } from "./db";
import { keywordGapAnalyses, marketDemandAnalyses, configurations, competitiveSignals } from "@shared/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import type {
  InsertCompetitiveSignal,
  SignalType,
  SignalSeverity,
  KeywordGapAnalysis,
  MarketDemandAnalysis,
  Configuration,
  Brand,
  CategoryDefinition,
  Competitors,
  StrategicIntent,
  NegativeScope,
} from "@shared/schema";
import type { UCRSectionID, ItemTrace } from "@shared/module.contract";
import OpenAI from "openai";

export interface SignalDetectionContext {
  configurationId: number;
  userId: string;
  lookbackDays?: number;
  signalTypes?: SignalType[];
  minSeverity?: SignalSeverity;
}

export interface SignalDetectionResult {
  signals: InsertCompetitiveSignal[];
  runTrace: {
    sectionsUsed: UCRSectionID[];
    filtersApplied: string[];
    rulesTriggered: string[];
  };
  summary: {
    totalSignals: number;
    highPriorityCount: number;
    competitorsActive: string[];
    topSignalType: SignalType | null;
  };
}

interface UCRContext {
  brand: Brand;
  categoryDefinition: CategoryDefinition;
  competitors: Competitors;
  strategicIntent: StrategicIntent;
  negativeScope: NegativeScope;
  configurationId: number;
}

interface KeywordRankingData {
  keyword: string;
  position: number | null;
  searchVolume: number;
  competitor: string;
  theme?: string;
}

const SEVERITY_ORDER: SignalSeverity[] = ["low", "medium", "high", "critical"];

export class CompetitiveSignalDetector {
  constructor(
    private database: typeof db,
    private openai: OpenAI
  ) {}

  async detectSignals(context: SignalDetectionContext): Promise<SignalDetectionResult> {
    const sectionsUsed: UCRSectionID[] = [];
    const filtersApplied: string[] = [];
    const rulesTriggered: string[] = [];
    
    const ucr = await this.loadUCRContext(context.configurationId, context.userId);
    if (!ucr) {
      return {
        signals: [],
        runTrace: { sectionsUsed: [], filtersApplied: [], rulesTriggered: ["UCR_NOT_FOUND"] },
        summary: { totalSignals: 0, highPriorityCount: 0, competitorsActive: [], topSignalType: null },
      };
    }

    sectionsUsed.push("A", "B", "C", "E", "G");

    const signalTypes = context.signalTypes || ["ranking_shift", "new_keyword", "demand_inflection", "serp_entrant"];
    const allSignals: InsertCompetitiveSignal[] = [];

    if (signalTypes.includes("ranking_shift")) {
      const rankingSignals = await this.detectRankingShifts(context, ucr);
      allSignals.push(...rankingSignals);
      if (rankingSignals.length > 0) {
        rulesTriggered.push("RANKING_SHIFT_DETECTED");
      }
    }

    if (signalTypes.includes("new_keyword")) {
      const newKeywordSignals = await this.detectNewKeywords(context, ucr);
      allSignals.push(...newKeywordSignals);
      if (newKeywordSignals.length > 0) {
        rulesTriggered.push("NEW_KEYWORD_DETECTED");
      }
    }

    if (signalTypes.includes("demand_inflection")) {
      const demandSignals = await this.detectDemandInflections(context, ucr);
      allSignals.push(...demandSignals);
      if (demandSignals.length > 0) {
        rulesTriggered.push("DEMAND_INFLECTION_DETECTED");
      }
    }

    if (signalTypes.includes("serp_entrant")) {
      const serpSignals = await this.detectSerpEntrants(context, ucr);
      allSignals.push(...serpSignals);
      if (serpSignals.length > 0) {
        rulesTriggered.push("SERP_ENTRANT_DETECTED");
      }
    }

    const filteredSignals = this.filterByMinSeverity(allSignals, context.minSeverity);
    filtersApplied.push(`MIN_SEVERITY:${context.minSeverity || "none"}`);

    const competitorsActive = Array.from(new Set(filteredSignals.map(s => s.competitor).filter(Boolean) as string[]));
    const highPriorityCount = filteredSignals.filter(s => s.severity === "high" || s.severity === "critical").length;
    const signalTypeCounts = this.countSignalTypes(filteredSignals);
    const topSignalType = signalTypeCounts.length > 0 ? signalTypeCounts[0].type : null;

    return {
      signals: filteredSignals,
      runTrace: {
        sectionsUsed,
        filtersApplied,
        rulesTriggered,
      },
      summary: {
        totalSignals: filteredSignals.length,
        highPriorityCount,
        competitorsActive,
        topSignalType,
      },
    };
  }

  private async loadUCRContext(configurationId: number, userId: string): Promise<UCRContext | null> {
    const [config] = await this.database
      .select()
      .from(configurations)
      .where(and(eq(configurations.id, configurationId), eq(configurations.userId, userId)))
      .limit(1);

    if (!config) return null;

    return {
      brand: config.brand as Brand,
      categoryDefinition: config.category_definition as CategoryDefinition,
      competitors: config.competitors as Competitors,
      strategicIntent: config.strategic_intent as StrategicIntent,
      negativeScope: config.negative_scope as NegativeScope,
      configurationId,
    };
  }

  private async detectRankingShifts(
    context: SignalDetectionContext,
    ucr: UCRContext
  ): Promise<InsertCompetitiveSignal[]> {
    const signals: InsertCompetitiveSignal[] = [];
    
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - (context.lookbackDays || 30));

    const analyses = await this.database
      .select()
      .from(keywordGapAnalyses)
      .where(
        and(
          eq(keywordGapAnalyses.configurationId, context.configurationId),
          eq(keywordGapAnalyses.userId, context.userId),
          gte(keywordGapAnalyses.created_at, lookbackDate)
        )
      )
      .orderBy(desc(keywordGapAnalyses.created_at))
      .limit(2);

    if (analyses.length < 2) {
      return signals;
    }

    const [current, previous] = analyses;
    const currentKeywords = this.extractKeywordRankings(current);
    const previousKeywords = this.extractKeywordRankings(previous);

    const previousMap = new Map(previousKeywords.map(k => [`${k.keyword}|${k.competitor}`, k]));

    for (const curr of currentKeywords) {
      const key = `${curr.keyword}|${curr.competitor}`;
      const prev = previousMap.get(key);

      if (!prev || curr.position === null || prev.position === null) continue;

      const positionChange = prev.position - curr.position;
      
      if (Math.abs(positionChange) >= 3) {
        const isRise = positionChange > 0;
        const severity = this.calculateRankingShiftSeverity(Math.abs(positionChange), curr, ucr);
        
        const signal: InsertCompetitiveSignal = {
          userId: context.userId,
          configurationId: context.configurationId,
          signalType: "ranking_shift",
          severity,
          competitor: curr.competitor,
          keyword: curr.keyword,
          title: isRise
            ? `${curr.competitor} subió ${Math.abs(positionChange)} posiciones para "${curr.keyword}"`
            : `${curr.competitor} bajó ${Math.abs(positionChange)} posiciones para "${curr.keyword}"`,
          description: `La posición del competidor cambió de ${prev.position} a ${curr.position} para la keyword "${curr.keyword}" con volumen de búsqueda de ${curr.searchVolume}.`,
          impact: null,
          recommendation: null,
          changeData: {
            previousPosition: prev.position,
            currentPosition: curr.position,
            positionChange,
            searchVolume: curr.searchVolume,
            theme: curr.theme,
            direction: isRise ? "up" : "down",
          },
        };

        signals.push(signal);
      }
    }

    const enrichedSignals = await this.enrichSignalsWithInsights(signals.slice(0, 10), ucr);
    return enrichedSignals;
  }

  private async detectNewKeywords(
    context: SignalDetectionContext,
    ucr: UCRContext
  ): Promise<InsertCompetitiveSignal[]> {
    const signals: InsertCompetitiveSignal[] = [];

    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - (context.lookbackDays || 30));

    const analyses = await this.database
      .select()
      .from(keywordGapAnalyses)
      .where(
        and(
          eq(keywordGapAnalyses.configurationId, context.configurationId),
          eq(keywordGapAnalyses.userId, context.userId),
          gte(keywordGapAnalyses.created_at, lookbackDate)
        )
      )
      .orderBy(desc(keywordGapAnalyses.created_at))
      .limit(2);

    if (analyses.length < 2) {
      return signals;
    }

    const [current, previous] = analyses;
    const currentKeywords = this.extractKeywordRankings(current);
    const previousKeywords = this.extractKeywordRankings(previous);

    const previousKeywordSet = new Set(previousKeywords.map(k => `${k.keyword}|${k.competitor}`));

    for (const curr of currentKeywords) {
      const key = `${curr.keyword}|${curr.competitor}`;
      
      if (!previousKeywordSet.has(key) && curr.position !== null && curr.position <= 20) {
        const severity = this.calculateNewKeywordSeverity(curr, ucr);
        
        const signal: InsertCompetitiveSignal = {
          userId: context.userId,
          configurationId: context.configurationId,
          signalType: "new_keyword",
          severity,
          competitor: curr.competitor,
          keyword: curr.keyword,
          title: `Nueva keyword detectada: ${curr.competitor} rankea para "${curr.keyword}"`,
          description: `El competidor ${curr.competitor} ahora aparece en posición ${curr.position} para "${curr.keyword}" con volumen de búsqueda ${curr.searchVolume}.`,
          impact: null,
          recommendation: null,
          changeData: {
            position: curr.position,
            searchVolume: curr.searchVolume,
            theme: curr.theme,
            firstSeen: new Date().toISOString(),
          },
        };

        signals.push(signal);
      }
    }

    const enrichedSignals = await this.enrichSignalsWithInsights(signals.slice(0, 10), ucr);
    return enrichedSignals;
  }

  private async detectDemandInflections(
    context: SignalDetectionContext,
    ucr: UCRContext
  ): Promise<InsertCompetitiveSignal[]> {
    const signals: InsertCompetitiveSignal[] = [];

    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - (context.lookbackDays || 90));

    const demandAnalyses = await this.database
      .select()
      .from(marketDemandAnalyses)
      .where(
        and(
          eq(marketDemandAnalyses.configurationId, context.configurationId),
          eq(marketDemandAnalyses.userId, context.userId),
          gte(marketDemandAnalyses.created_at, lookbackDate)
        )
      )
      .orderBy(desc(marketDemandAnalyses.created_at))
      .limit(1);

    if (demandAnalyses.length === 0) {
      return signals;
    }

    const [latestDemand] = demandAnalyses;
    const results = latestDemand.results as any;

    if (results?.byCategory && Array.isArray(results.byCategory)) {
      for (const category of results.byCategory) {
        if (category.inflectionMonth || category.variance > 0.3) {
          const severity = this.calculateDemandInflectionSeverity(category, ucr);
          
          const signal: InsertCompetitiveSignal = {
            userId: context.userId,
            configurationId: context.configurationId,
            signalType: "demand_inflection",
            severity,
            competitor: null,
            keyword: category.categoryName,
            title: `Inflexión de demanda detectada en "${category.categoryName}"`,
            description: category.inflectionMonth
              ? `La categoría "${category.categoryName}" muestra un cambio significativo en ${category.inflectionMonth}. Pico en ${category.peakMonth || "N/A"}, bajo en ${category.lowMonth || "N/A"}.`
              : `La categoría "${category.categoryName}" muestra alta varianza (${(category.variance * 100).toFixed(1)}%) indicando volatilidad en la demanda.`,
            impact: null,
            recommendation: null,
            changeData: {
              categoryName: category.categoryName,
              peakMonth: category.peakMonth,
              lowMonth: category.lowMonth,
              inflectionMonth: category.inflectionMonth,
              variance: category.variance,
              stabilityScore: category.stabilityScore,
              recommendedLaunchByISO: category.recommendedLaunchByISO,
            },
          };

          signals.push(signal);
        }
      }
    }

    const enrichedSignals = await this.enrichSignalsWithInsights(signals.slice(0, 10), ucr);
    return enrichedSignals;
  }

  private async detectSerpEntrants(
    context: SignalDetectionContext,
    ucr: UCRContext
  ): Promise<InsertCompetitiveSignal[]> {
    const signals: InsertCompetitiveSignal[] = [];

    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - (context.lookbackDays || 30));

    const analyses = await this.database
      .select()
      .from(keywordGapAnalyses)
      .where(
        and(
          eq(keywordGapAnalyses.configurationId, context.configurationId),
          eq(keywordGapAnalyses.userId, context.userId),
          gte(keywordGapAnalyses.created_at, lookbackDate)
        )
      )
      .orderBy(desc(keywordGapAnalyses.created_at))
      .limit(2);

    if (analyses.length < 2) {
      return signals;
    }

    const [current, previous] = analyses;
    
    const currentCompetitors = this.extractUniqueCompetitors(current);
    const previousCompetitors = this.extractUniqueCompetitors(previous);

    const newEntrants = currentCompetitors.filter(c => !previousCompetitors.includes(c));

    for (const entrant of newEntrants) {
      const keywordsForEntrant = this.extractKeywordRankings(current).filter(k => k.competitor === entrant);
      const topKeywords = keywordsForEntrant.slice(0, 5);
      const totalVolume = keywordsForEntrant.reduce((sum, k) => sum + k.searchVolume, 0);
      
      const severity = this.calculateSerpEntrantSeverity(entrant, keywordsForEntrant.length, totalVolume, ucr);

      const signal: InsertCompetitiveSignal = {
        userId: context.userId,
        configurationId: context.configurationId,
        signalType: "serp_entrant",
        severity,
        competitor: entrant,
        keyword: topKeywords.map(k => k.keyword).join(", ").slice(0, 100),
        title: `Nuevo competidor detectado en SERPs: ${entrant}`,
        description: `${entrant} ha aparecido en las SERPs para ${keywordsForEntrant.length} keywords monitoreadas con un volumen total de ${totalVolume.toLocaleString()}.`,
        impact: null,
        recommendation: null,
        changeData: {
          domain: entrant,
          keywordCount: keywordsForEntrant.length,
          totalVolume,
          topKeywords: topKeywords.map(k => ({ keyword: k.keyword, position: k.position })),
          firstSeen: new Date().toISOString(),
        },
      };

      signals.push(signal);
    }

    const enrichedSignals = await this.enrichSignalsWithInsights(signals, ucr);
    return enrichedSignals;
  }

  private extractKeywordRankings(analysis: any): KeywordRankingData[] {
    const rankings: KeywordRankingData[] = [];
    const results = analysis.results as any;

    if (!results) return rankings;

    const allKeywords = [
      ...(results.topOpportunities || []),
      ...(results.needsReview || []),
      ...(results.outOfPlay || []),
    ];

    for (const kw of allKeywords) {
      if (!kw.keyword) continue;
      
      const competitorsSeen = kw.competitorsSeen || [];
      for (const competitor of competitorsSeen) {
        rankings.push({
          keyword: kw.keyword,
          position: kw.competitorPosition || null,
          searchVolume: kw.searchVolume || 0,
          competitor,
          theme: kw.theme,
        });
      }
    }

    return rankings;
  }

  private extractUniqueCompetitors(analysis: any): string[] {
    const results = analysis.results as any;
    if (!results?.competitors) return [];
    return results.competitors || [];
  }

  private calculateRankingShiftSeverity(
    positionChange: number,
    keyword: KeywordRankingData,
    ucr: UCRContext
  ): SignalSeverity {
    let baseSeverity: SignalSeverity = "low";
    
    if (positionChange >= 10) {
      baseSeverity = "critical";
    } else if (positionChange >= 5) {
      baseSeverity = "high";
    } else if (positionChange >= 3) {
      baseSeverity = "medium";
    }

    return this.adjustSeverityWithUCR(baseSeverity, keyword.keyword, keyword.competitor, ucr);
  }

  private calculateNewKeywordSeverity(
    keyword: KeywordRankingData,
    ucr: UCRContext
  ): SignalSeverity {
    let baseSeverity: SignalSeverity = "low";
    
    if (keyword.searchVolume >= 10000) {
      baseSeverity = "high";
    } else if (keyword.searchVolume >= 1000) {
      baseSeverity = "medium";
    }

    if (keyword.position !== null && keyword.position <= 3) {
      baseSeverity = this.bumpSeverity(baseSeverity);
    }

    return this.adjustSeverityWithUCR(baseSeverity, keyword.keyword, keyword.competitor, ucr);
  }

  private calculateDemandInflectionSeverity(
    category: any,
    ucr: UCRContext
  ): SignalSeverity {
    let baseSeverity: SignalSeverity = "medium";
    
    if (category.variance > 0.5) {
      baseSeverity = "high";
    } else if (category.variance > 0.3) {
      baseSeverity = "medium";
    } else {
      baseSeverity = "low";
    }

    const primaryCategory = ucr.categoryDefinition.primary_category?.toLowerCase() || "";
    const categoryName = (category.categoryName || "").toLowerCase();
    
    if (categoryName.includes(primaryCategory) || primaryCategory.includes(categoryName)) {
      baseSeverity = this.bumpSeverity(baseSeverity);
    }

    return baseSeverity;
  }

  private calculateSerpEntrantSeverity(
    competitor: string,
    keywordCount: number,
    totalVolume: number,
    ucr: UCRContext
  ): SignalSeverity {
    let baseSeverity: SignalSeverity = "low";
    
    if (keywordCount >= 20 || totalVolume >= 50000) {
      baseSeverity = "high";
    } else if (keywordCount >= 10 || totalVolume >= 10000) {
      baseSeverity = "medium";
    }

    const isKnownCompetitor = this.isTopCompetitor(competitor, ucr);
    if (isKnownCompetitor) {
      baseSeverity = this.bumpSeverity(baseSeverity);
    }

    return baseSeverity;
  }

  private adjustSeverityWithUCR(
    baseSeverity: SignalSeverity,
    keyword: string,
    competitor: string | null,
    ucr: UCRContext
  ): SignalSeverity {
    let severity = baseSeverity;
    const normalizedKeyword = keyword.toLowerCase();

    const strategicCategories = [
      ucr.strategicIntent.primary_goal?.toLowerCase(),
      ...(ucr.strategicIntent.secondary_goals || []).map(g => g.toLowerCase()),
    ].filter(Boolean);

    const matchesStrategic = strategicCategories.some(cat => 
      normalizedKeyword.includes(cat || "") || (cat || "").includes(normalizedKeyword)
    );
    if (matchesStrategic) {
      severity = this.bumpSeverity(severity);
    }

    if (competitor && this.isTopCompetitor(competitor, ucr)) {
      severity = this.bumpSeverity(severity);
    }

    const excludedKeywords = [
      ...(ucr.negativeScope.excluded_keywords || []),
      ...(ucr.negativeScope.excluded_categories || []),
    ].map(e => e.toLowerCase());

    const isExcluded = excludedKeywords.some(exc => normalizedKeyword.includes(exc));
    if (isExcluded) {
      severity = this.lowerSeverity(severity);
      severity = this.lowerSeverity(severity);
    }

    return severity;
  }

  private isTopCompetitor(competitor: string, ucr: UCRContext): boolean {
    const normalizedCompetitor = competitor.toLowerCase();
    
    const tier1Competitors = (ucr.competitors.competitors || [])
      .filter(c => c.tier === "tier1" || c.status === "approved")
      .map(c => c.domain?.toLowerCase() || c.name?.toLowerCase());

    const directCompetitors = (ucr.competitors.direct || []).map(d => d.toLowerCase());

    return [...tier1Competitors, ...directCompetitors].some(c => 
      normalizedCompetitor.includes(c || "") || (c || "").includes(normalizedCompetitor)
    );
  }

  private bumpSeverity(severity: SignalSeverity): SignalSeverity {
    const index = SEVERITY_ORDER.indexOf(severity);
    if (index < SEVERITY_ORDER.length - 1) {
      return SEVERITY_ORDER[index + 1];
    }
    return severity;
  }

  private lowerSeverity(severity: SignalSeverity): SignalSeverity {
    const index = SEVERITY_ORDER.indexOf(severity);
    if (index > 0) {
      return SEVERITY_ORDER[index - 1];
    }
    return severity;
  }

  private filterByMinSeverity(
    signals: InsertCompetitiveSignal[],
    minSeverity?: SignalSeverity
  ): InsertCompetitiveSignal[] {
    if (!minSeverity) return signals;
    
    const minIndex = SEVERITY_ORDER.indexOf(minSeverity);
    return signals.filter(s => SEVERITY_ORDER.indexOf(s.severity) >= minIndex);
  }

  private countSignalTypes(signals: InsertCompetitiveSignal[]): Array<{ type: SignalType; count: number }> {
    const counts = new Map<SignalType, number>();
    for (const signal of signals) {
      counts.set(signal.signalType, (counts.get(signal.signalType) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  private async enrichSignalsWithInsights(
    signals: InsertCompetitiveSignal[],
    ucr: UCRContext
  ): Promise<InsertCompetitiveSignal[]> {
    const enrichedSignals: InsertCompetitiveSignal[] = [];

    for (const signal of signals) {
      try {
        const { impact, recommendation } = await this.generateInsight(signal, ucr);
        enrichedSignals.push({
          ...signal,
          impact,
          recommendation,
        });
      } catch (error) {
        console.error("[CompetitiveSignalDetector] Error generating insight:", error);
        enrichedSignals.push(signal);
      }
    }

    return enrichedSignals;
  }

  private async generateInsight(
    signal: InsertCompetitiveSignal,
    ucr: UCRContext
  ): Promise<{ impact: string; recommendation: string }> {
    const brandName = ucr.brand.name || ucr.brand.domain;
    const primaryCategory = ucr.categoryDefinition.primary_category;
    
    const prompt = `Eres un analista de inteligencia competitiva para ${brandName} en la categoría ${primaryCategory}.

Señal detectada:
- Tipo: ${signal.signalType}
- Severidad: ${signal.severity}
- Título: ${signal.title}
- Descripción: ${signal.description}
- Competidor: ${signal.competitor || "N/A"}
- Keyword: ${signal.keyword || "N/A"}
- Datos: ${JSON.stringify(signal.changeData)}

Genera en español:
1. IMPACTO: Una frase breve (máximo 50 palabras) explicando el impacto potencial de esta señal en el negocio.
2. RECOMENDACIÓN: Una acción concreta y específica (máximo 50 palabras) que el equipo debería tomar.

Responde en formato JSON:
{"impact": "...", "recommendation": "..."}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || "";
      const parsed = JSON.parse(content);
      
      return {
        impact: parsed.impact || null,
        recommendation: parsed.recommendation || null,
      };
    } catch (error) {
      console.error("[CompetitiveSignalDetector] OpenAI error:", error);
      return {
        impact: this.generateFallbackImpact(signal),
        recommendation: this.generateFallbackRecommendation(signal),
      };
    }
  }

  private generateFallbackImpact(signal: InsertCompetitiveSignal): string {
    switch (signal.signalType) {
      case "ranking_shift":
        return `Cambio de posición detectado que puede afectar la visibilidad orgánica y el tráfico.`;
      case "new_keyword":
        return `Nueva oportunidad de keyword identificada donde los competidores están ganando terreno.`;
      case "demand_inflection":
        return `Cambio significativo en la demanda del mercado que requiere atención estratégica.`;
      case "serp_entrant":
        return `Nuevo competidor detectado que podría impactar la cuota de mercado orgánico.`;
      default:
        return `Señal competitiva detectada que requiere análisis.`;
    }
  }

  private generateFallbackRecommendation(signal: InsertCompetitiveSignal): string {
    switch (signal.signalType) {
      case "ranking_shift":
        return `Revisar y optimizar el contenido para la keyword afectada.`;
      case "new_keyword":
        return `Evaluar la relevancia de la keyword para incluir en la estrategia de contenido.`;
      case "demand_inflection":
        return `Ajustar el calendario de contenido según las tendencias de demanda.`;
      case "serp_entrant":
        return `Analizar la estrategia del nuevo competidor y sus páginas de mejor rendimiento.`;
      default:
        return `Investigar y tomar acción según el tipo de señal.`;
    }
  }

  async persistSignals(signals: InsertCompetitiveSignal[]): Promise<number[]> {
    if (signals.length === 0) return [];

    const inserted = await this.database
      .insert(competitiveSignals)
      .values(signals.map(s => ({
        userId: s.userId,
        configurationId: s.configurationId,
        signalType: s.signalType,
        severity: s.severity,
        competitor: s.competitor,
        keyword: s.keyword,
        title: s.title,
        description: s.description,
        impact: s.impact,
        recommendation: s.recommendation,
        changeData: s.changeData,
      })))
      .returning({ id: competitiveSignals.id });

    return inserted.map(r => r.id);
  }
}

export function createCompetitiveSignalDetector(
  database: typeof db,
  openai: OpenAI
): CompetitiveSignalDetector {
  return new CompetitiveSignalDetector(database, openai);
}
