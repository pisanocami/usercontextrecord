import type OpenAI from "openai";
import type { Configuration } from "@shared/schema";
import type { KeywordGapResult } from "./keyword-gap-lite";

// OpenAI client is passed from routes.ts to ensure single instance

export interface SWOTItem {
  title: string;
  description: string;
  evidence: string[];
  impact: "high" | "medium" | "low";
  relatedKeywords?: string[];
  relatedCompetitors?: string[];
}

export interface SWOTAnalysis {
  id: string;
  configurationId: number;
  configurationName: string;
  generatedAt: string;
  strengths: SWOTItem[];
  weaknesses: SWOTItem[];
  opportunities: SWOTItem[];
  threats: SWOTItem[];
  summary: string;
  recommendations: string[];
  dataSourcesUsed: string[];
}

interface MarketDemandData {
  categories?: Array<{
    themeName: string;
    timingClassification?: string;
    peakMonth?: string;
  }>;
}

function generateAnalysisId(): string {
  return `swot_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function analyzeFromKeywordGap(
  config: Configuration,
  keywordGapData: KeywordGapResult
): Partial<SWOTAnalysis> {
  const strengths: SWOTItem[] = [];
  const weaknesses: SWOTItem[] = [];
  const opportunities: SWOTItem[] = [];
  const threats: SWOTItem[] = [];

  const passKeywords = keywordGapData.keywords.filter(k => k.status === "PASS");
  const reviewKeywords = keywordGapData.keywords.filter(k => k.status === "REVIEW");
  const outOfPlayKeywords = keywordGapData.keywords.filter(k => k.status === "OUT_OF_PLAY");

  if (passKeywords.length > 0) {
    const highVolumePass = passKeywords.filter(k => (k.searchVolume || 0) > 1000);
    if (highVolumePass.length > 0) {
      strengths.push({
        title: "Alto Rendimiento en Keywords de Alto Volumen",
        description: `La marca tiene una posicion fuerte en ${highVolumePass.length} keywords de alto volumen de busqueda.`,
        evidence: [
          `${highVolumePass.length} keywords con volumen > 1000 clasificadas como PASS`,
          `Keywords principales: ${highVolumePass.slice(0, 3).map(k => k.keyword).join(", ")}`
        ],
        impact: highVolumePass.length > 10 ? "high" : "medium",
        relatedKeywords: highVolumePass.slice(0, 5).map(k => k.keyword)
      });
    }

    const lowDifficultyPass = passKeywords.filter(k => k.difficulty !== undefined && k.difficulty < 30);
    if (lowDifficultyPass.length > 0) {
      strengths.push({
        title: "Dominio en Keywords de Baja Competencia",
        description: `La marca captura efectivamente ${lowDifficultyPass.length} keywords con baja dificultad SEO.`,
        evidence: [
          `${lowDifficultyPass.length} keywords con dificultad < 30`,
          "Estas keywords representan victorias faciles ya aseguradas"
        ],
        impact: "medium",
        relatedKeywords: lowDifficultyPass.slice(0, 5).map(k => k.keyword)
      });
    }
  }

  const brandDomain = config.brand?.domain || "";
  const approvedCompetitors = config.competitors?.competitors?.filter(c => c.status === "approved") || [];
  const competitorDomains = approvedCompetitors.map(c => c.domain);

  if (reviewKeywords.length > 0) {
    const highVolumeReview = reviewKeywords.filter(k => (k.searchVolume || 0) > 500);
    if (highVolumeReview.length > 0) {
      weaknesses.push({
        title: "Brechas en Keywords de Alto Valor",
        description: `Existen ${highVolumeReview.length} keywords de alto volumen que requieren revision y mejora.`,
        evidence: [
          `${highVolumeReview.length} keywords con volumen > 500 en estado REVIEW`,
          "Estas keywords representan oportunidades de trafico perdido"
        ],
        impact: highVolumeReview.length > 15 ? "high" : "medium",
        relatedKeywords: highVolumeReview.slice(0, 5).map(k => k.keyword),
        relatedCompetitors: competitorDomains.slice(0, 3)
      });
    }

    const highDifficultyReview = reviewKeywords.filter(k => k.difficulty !== undefined && k.difficulty > 60);
    if (highDifficultyReview.length > 0) {
      threats.push({
        title: "Competencia Intensa en Keywords Clave",
        description: `${highDifficultyReview.length} keywords tienen alta dificultad y competencia fuerte.`,
        evidence: [
          `Keywords con dificultad > 60: ${highDifficultyReview.length}`,
          "Competidores establecidos dominan estas busquedas"
        ],
        impact: "high",
        relatedKeywords: highDifficultyReview.slice(0, 5).map(k => k.keyword),
        relatedCompetitors: competitorDomains
      });
    }
  }

  const lowCompetitionHighVolume = reviewKeywords.filter(
    k => (k.searchVolume || 0) > 500 && k.difficulty !== undefined && k.difficulty < 40
  );
  if (lowCompetitionHighVolume.length > 0) {
    opportunities.push({
      title: "Quick Wins Disponibles",
      description: `${lowCompetitionHighVolume.length} keywords de alto volumen tienen baja dificultad - oportunidades inmediatas.`,
      evidence: [
        `Volumen > 500, Dificultad < 40: ${lowCompetitionHighVolume.length} keywords`,
        "Estas keywords pueden ser capturadas con esfuerzo moderado"
      ],
      impact: "high",
      relatedKeywords: lowCompetitionHighVolume.slice(0, 5).map(k => k.keyword)
    });
  }

  const themeStats = new Map<string, { count: number; totalVolume: number; keywords: string[] }>();
  for (const kw of keywordGapData.keywords) {
    const theme = kw.theme || "Sin tema";
    const stats = themeStats.get(theme) || { count: 0, totalVolume: 0, keywords: [] };
    stats.count++;
    stats.totalVolume += kw.searchVolume || 0;
    if (stats.keywords.length < 3) stats.keywords.push(kw.keyword);
    themeStats.set(theme, stats);
  }

  const underservedThemes = Array.from(themeStats.entries())
    .filter(([_, stats]) => stats.totalVolume > 2000 && stats.count < 5)
    .slice(0, 3);

  if (underservedThemes.length > 0) {
    opportunities.push({
      title: "Temas de Mercado Subatendidos",
      description: `Hay ${underservedThemes.length} temas con alta demanda pero baja cobertura.`,
      evidence: underservedThemes.map(([theme, stats]) => 
        `${theme}: ${stats.totalVolume.toLocaleString()} volumen total`
      ),
      impact: "medium",
      relatedKeywords: underservedThemes.flatMap(([_, stats]) => stats.keywords)
    });
  }

  if (competitorDomains.length > 0 && reviewKeywords.length > passKeywords.length * 2) {
    threats.push({
      title: "Ventaja Competitiva de Rivales",
      description: "Los competidores tienen posiciones mas fuertes en la mayoria de keywords relevantes.",
      evidence: [
        `Keywords donde competidores dominan: ${reviewKeywords.length}`,
        `Keywords donde la marca lidera: ${passKeywords.length}`,
        `Ratio competidor/marca: ${(reviewKeywords.length / Math.max(passKeywords.length, 1)).toFixed(1)}x`
      ],
      impact: "high",
      relatedCompetitors: competitorDomains
    });
  }

  return { strengths, weaknesses, opportunities, threats };
}

async function analyzeWithAI(config: Configuration, openaiClient: OpenAI): Promise<Partial<SWOTAnalysis>> {
  const brand = config.brand;
  const categoryDef = config.category_definition;
  const competitors = config.competitors;
  const strategicIntent = config.strategic_intent;
  const negativeScope = config.negative_scope;

  const prompt = `Analyze the competitive position for this brand and generate a SWOT analysis in Spanish:

BRAND: ${brand?.name || "Unknown"} (${brand?.domain || "unknown.com"})
INDUSTRY: ${brand?.industry || "Not specified"}
CATEGORY: ${categoryDef?.primary_category || "Not specified"}

COMPETITORS:
Direct: ${competitors?.direct?.join(", ") || "None specified"}
Indirect: ${competitors?.indirect?.join(", ") || "None specified"}
Approved Competitors: ${competitors?.competitors?.filter(c => c.status === "approved").map(c => c.name).join(", ") || "None"}

STRATEGIC CONTEXT:
- Growth Priority: ${strategicIntent?.growth_priority || "Not specified"}
- Primary Goal: ${strategicIntent?.primary_goal || "Not specified"}
- Risk Tolerance: ${strategicIntent?.risk_tolerance || "Not specified"}
- Things to Avoid: ${strategicIntent?.avoid?.join(", ") || "None specified"}

KNOWN EXCLUSIONS:
${negativeScope?.excluded_keywords?.join(", ") || "None"}

Generate a SWOT analysis with 3-5 items per quadrant. Each item should have:
- A clear title (in Spanish)
- A description explaining the point (in Spanish)
- Evidence or reasoning supporting it (in Spanish)
- Impact level (high/medium/low)

Return ONLY valid JSON with this exact structure:
{
  "strengths": [{"title": "...", "description": "...", "evidence": ["..."], "impact": "high|medium|low"}],
  "weaknesses": [{"title": "...", "description": "...", "evidence": ["..."], "impact": "high|medium|low"}],
  "opportunities": [{"title": "...", "description": "...", "evidence": ["..."], "impact": "high|medium|low"}],
  "threats": [{"title": "...", "description": "...", "evidence": ["..."], "impact": "high|medium|low"}],
  "summary": "...",
  "recommendations": ["..."]
}`;

  const response = await openaiClient.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a strategic business analyst specializing in competitive analysis. Generate accurate, evidence-based SWOT analyses. Always respond in Spanish and return valid JSON only."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.7
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  const parsed = JSON.parse(content);
  return {
    strengths: parsed.strengths || [],
    weaknesses: parsed.weaknesses || [],
    opportunities: parsed.opportunities || [],
    threats: parsed.threats || [],
    summary: parsed.summary,
    recommendations: parsed.recommendations
  };
}

export async function analyzeSWOT(
  config: Configuration,
  openaiClient: OpenAI,
  keywordGapData?: KeywordGapResult | null,
  marketDemandData?: MarketDemandData | null
): Promise<SWOTAnalysis> {
  const configId = typeof config.id === "string" ? parseInt(config.id, 10) : config.id;
  const dataSourcesUsed: string[] = ["UCR Configuration"];
  
  let analysis: Partial<SWOTAnalysis>;

  if (keywordGapData && keywordGapData.keywords.length > 0) {
    console.log(`[SWOT] Analyzing with Keyword Gap data (${keywordGapData.keywords.length} keywords)`);
    analysis = analyzeFromKeywordGap(config, keywordGapData);
    dataSourcesUsed.push("Keyword Gap Analysis");
  } else {
    console.log("[SWOT] No Keyword Gap data, using AI analysis");
    analysis = await analyzeWithAI(config, openaiClient);
    dataSourcesUsed.push("AI Analysis (OpenAI)");
  }

  if (marketDemandData?.categories && marketDemandData.categories.length > 0) {
    dataSourcesUsed.push("Market Demand Seasonality");
    
    const peakCategories = marketDemandData.categories.filter(c => c.timingClassification === "peak_driven");
    if (peakCategories.length > 0) {
      analysis.opportunities = analysis.opportunities || [];
      analysis.opportunities.push({
        title: "Optimizacion de Estacionalidad",
        description: `${peakCategories.length} categorias tienen patrones de pico claros que pueden aprovecharse.`,
        evidence: peakCategories.slice(0, 3).map(c => 
          `${c.themeName}: pico en ${c.peakMonth || "mes no especificado"}`
        ),
        impact: "medium"
      });
    }
  }

  let summary = analysis.summary || "";
  if (!summary) {
    const totalStrengths = analysis.strengths?.length || 0;
    const totalWeaknesses = analysis.weaknesses?.length || 0;
    const totalOpportunities = analysis.opportunities?.length || 0;
    const totalThreats = analysis.threats?.length || 0;
    
    const highImpactStrengths = analysis.strengths?.filter(s => s.impact === "high").length || 0;
    const highImpactThreats = analysis.threats?.filter(t => t.impact === "high").length || 0;
    
    summary = `Analisis SWOT para ${config.name || config.brand?.name || "la marca"}. `;
    summary += `Se identificaron ${totalStrengths} fortalezas, ${totalWeaknesses} debilidades, `;
    summary += `${totalOpportunities} oportunidades y ${totalThreats} amenazas. `;
    
    if (highImpactStrengths > highImpactThreats) {
      summary += "La posicion competitiva general es favorable con fortalezas significativas.";
    } else if (highImpactThreats > highImpactStrengths) {
      summary += "Se requiere atencion a las amenazas de alto impacto identificadas.";
    } else {
      summary += "La posicion competitiva esta equilibrada con areas claras de mejora.";
    }
  }

  let recommendations = analysis.recommendations || [];
  if (recommendations.length === 0) {
    recommendations = generateRecommendations(analysis);
  }

  return {
    id: generateAnalysisId(),
    configurationId: configId,
    configurationName: config.name || "",
    generatedAt: new Date().toISOString(),
    strengths: analysis.strengths || [],
    weaknesses: analysis.weaknesses || [],
    opportunities: analysis.opportunities || [],
    threats: analysis.threats || [],
    summary,
    recommendations,
    dataSourcesUsed
  };
}

function generateRecommendations(analysis: Partial<SWOTAnalysis>): string[] {
  const recommendations: string[] = [];

  const highImpactOpportunities = analysis.opportunities?.filter(o => o.impact === "high") || [];
  if (highImpactOpportunities.length > 0) {
    recommendations.push(
      `Priorizar las ${highImpactOpportunities.length} oportunidades de alto impacto identificadas, especialmente: ${highImpactOpportunities[0]?.title}`
    );
  }

  const highImpactThreats = analysis.threats?.filter(t => t.impact === "high") || [];
  if (highImpactThreats.length > 0) {
    recommendations.push(
      `Desarrollar planes de mitigacion para las amenazas de alto impacto: ${highImpactThreats[0]?.title}`
    );
  }

  const strengths = analysis.strengths || [];
  if (strengths.length > 0) {
    recommendations.push(
      `Aprovechar las fortalezas existentes, particularmente: ${strengths[0]?.title}`
    );
  }

  const weaknesses = analysis.weaknesses || [];
  if (weaknesses.length > 0) {
    recommendations.push(
      `Abordar las debilidades clave, comenzando por: ${weaknesses[0]?.title}`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Realizar un analisis de Keyword Gap para obtener insights mas detallados",
      "Revisar y actualizar la definicion de competidores en el UCR",
      "Establecer KPIs para monitorear el progreso en las areas identificadas"
    );
  }

  return recommendations;
}

export function generateSWOTMarkdown(analysis: SWOTAnalysis): string {
  const lines: string[] = [];
  
  lines.push(`# Analisis SWOT: ${analysis.configurationName}`);
  lines.push(`Generado: ${new Date(analysis.generatedAt).toLocaleString("es-ES")}`);
  lines.push("");
  
  lines.push("## Resumen Ejecutivo");
  lines.push(analysis.summary);
  lines.push("");

  lines.push("## Fortalezas");
  for (const item of analysis.strengths) {
    lines.push(`### ${item.title} [${item.impact.toUpperCase()}]`);
    lines.push(item.description);
    if (item.evidence.length > 0) {
      lines.push("**Evidencia:**");
      for (const e of item.evidence) {
        lines.push(`- ${e}`);
      }
    }
    if (item.relatedKeywords?.length) {
      lines.push(`**Keywords relacionadas:** ${item.relatedKeywords.join(", ")}`);
    }
    lines.push("");
  }

  lines.push("## Debilidades");
  for (const item of analysis.weaknesses) {
    lines.push(`### ${item.title} [${item.impact.toUpperCase()}]`);
    lines.push(item.description);
    if (item.evidence.length > 0) {
      lines.push("**Evidencia:**");
      for (const e of item.evidence) {
        lines.push(`- ${e}`);
      }
    }
    lines.push("");
  }

  lines.push("## Oportunidades");
  for (const item of analysis.opportunities) {
    lines.push(`### ${item.title} [${item.impact.toUpperCase()}]`);
    lines.push(item.description);
    if (item.evidence.length > 0) {
      lines.push("**Evidencia:**");
      for (const e of item.evidence) {
        lines.push(`- ${e}`);
      }
    }
    lines.push("");
  }

  lines.push("## Amenazas");
  for (const item of analysis.threats) {
    lines.push(`### ${item.title} [${item.impact.toUpperCase()}]`);
    lines.push(item.description);
    if (item.evidence.length > 0) {
      lines.push("**Evidencia:**");
      for (const e of item.evidence) {
        lines.push(`- ${e}`);
      }
    }
    if (item.relatedCompetitors?.length) {
      lines.push(`**Competidores relacionados:** ${item.relatedCompetitors.join(", ")}`);
    }
    lines.push("");
  }

  lines.push("## Recomendaciones");
  for (let i = 0; i < analysis.recommendations.length; i++) {
    lines.push(`${i + 1}. ${analysis.recommendations[i]}`);
  }
  lines.push("");

  lines.push("---");
  lines.push(`**Fuentes de datos:** ${analysis.dataSourcesUsed.join(", ")}`);

  return lines.join("\n");
}
