import OpenAI from "openai";
import type { InsertConfiguration, NegativeScope } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export type BriefType = 'seo' | 'ad_copy' | 'landing_page' | 'email' | 'social';

export interface ContentBriefOptions {
  topic?: string;
  keywords?: string[];
}

export interface HeadingStructure {
  h1: string;
  h2s: string[];
  h3s?: string[];
}

export interface LandingPageSection {
  title: string;
  content: string;
  cta?: string;
}

export interface SocialPost {
  platform: string;
  text: string;
  hashtags?: string[];
}

export interface EmailBodyStructure {
  introduction: string;
  body: string;
  conclusion: string;
}

export interface ContentBrief {
  type: BriefType;
  title: string;
  generatedAt: string;
  configurationName: string;
  targetKeywords?: string[];
  headingStructure?: HeadingStructure;
  wordCountRange?: { min: number; max: number };
  headlines?: string[];
  descriptions?: string[];
  callsToAction?: string[];
  sections?: LandingPageSection[];
  subjectLines?: string[];
  preheaderText?: string;
  bodyStructure?: EmailBodyStructure;
  posts?: SocialPost[];
  toneOfVoice: string;
  keyMessages: string[];
  avoidTopics: string[];
  guardrailWarnings: string[];
}

interface GuardrailViolation {
  field: string;
  value: string;
  violationType: 'excluded_keyword' | 'excluded_category' | 'excluded_use_case' | 'competitor_mention';
  matchedRule: string;
}

function buildPromptForType(
  config: InsertConfiguration,
  type: BriefType,
  options: ContentBriefOptions
): string {
  const brand = config.brand || {};
  const category = config.category_definition || {};
  const strategic = config.strategic_intent || {};
  const channel = config.channel_context || {};
  const negative = config.negative_scope || {};
  const competitors = config.competitors || {};

  const baseContext = `
CONTEXTO DE MARCA:
- Nombre: ${brand.name || 'No especificado'}
- Dominio: ${brand.domain || 'No especificado'}
- Industria: ${brand.industry || 'No especificada'}
- Modelo de Negocio: ${brand.business_model || 'No especificado'}
- Mercado Objetivo: ${brand.target_market || 'No especificado'}

CATEGORIA:
- Categoria Principal: ${category.primary_category || 'No especificada'}
- Temas Incluidos: ${(category.included || []).join(', ') || 'Ninguno'}
- Temas Excluidos: ${(category.excluded || []).join(', ') || 'Ninguno'}
- Extensiones Semanticas: ${(category.semantic_extensions || []).join(', ') || 'Ninguno'}

INTENTO ESTRATEGICO:
- Prioridad de Crecimiento: ${strategic.growth_priority || 'No especificada'}
- Meta Principal: ${strategic.primary_goal || 'No especificada'}
- Metas Secundarias: ${(strategic.secondary_goals || []).join(', ') || 'Ninguna'}
- Tolerancia al Riesgo: ${strategic.risk_tolerance || 'medium'}
- Evitar: ${(strategic.avoid || []).join(', ') || 'Nada especificado'}

CONTEXTO DE CANALES:
- Nivel de Inversion SEO: ${channel.seo_investment_level || 'medium'}
- Medios Pagados Activos: ${channel.paid_media_active ? 'Si' : 'No'}

COMPETIDORES (no mencionar directamente):
${(competitors.direct || []).join(', ') || 'No especificados'}

RESTRICCIONES ABSOLUTAS (nunca incluir):
- Keywords Excluidas: ${(negative.excluded_keywords || []).join(', ') || 'Ninguna'}
- Categorias Excluidas: ${(negative.excluded_categories || []).join(', ') || 'Ninguna'}
- Casos de Uso Excluidos: ${(negative.excluded_use_cases || []).join(', ') || 'Ninguno'}
`;

  const topicContext = options.topic ? `\nTEMA SOLICITADO: ${options.topic}` : '';
  const keywordsContext = options.keywords?.length ? `\nKEYWORDS OBJETIVO: ${options.keywords.join(', ')}` : '';

  let typeSpecificInstructions = '';

  switch (type) {
    case 'seo':
      typeSpecificInstructions = `
Genera un brief de contenido SEO completo con:
1. "title": Titulo del articulo optimizado para SEO
2. "targetKeywords": Array de 5-8 keywords objetivo relevantes
3. "headingStructure": Estructura de encabezados con:
   - "h1": Titulo H1 principal
   - "h2s": Array de 4-6 subtitulos H2
   - "h3s": Array opcional de subtitulos H3
4. "wordCountRange": Rango de palabras recomendado {"min": numero, "max": numero}
5. "toneOfVoice": Tono de voz recomendado
6. "keyMessages": Array de 3-5 mensajes clave a comunicar
`;
      break;

    case 'ad_copy':
      typeSpecificInstructions = `
Genera un brief de copy publicitario con:
1. "title": Nombre de la campana
2. "headlines": Array de 5-8 titulares cortos (max 30 caracteres)
3. "descriptions": Array de 3-5 descripciones (max 90 caracteres)
4. "callsToAction": Array de 3-5 llamados a la accion
5. "toneOfVoice": Tono de voz de la campana
6. "keyMessages": Array de 3-5 mensajes clave
`;
      break;

    case 'landing_page':
      typeSpecificInstructions = `
Genera un brief de landing page con:
1. "title": Titulo principal de la pagina
2. "sections": Array de 4-6 secciones, cada una con:
   - "title": Titulo de la seccion
   - "content": Descripcion del contenido (2-3 oraciones)
   - "cta": Llamado a la accion opcional
3. "toneOfVoice": Tono de voz general
4. "keyMessages": Array de 3-5 mensajes clave
`;
      break;

    case 'email':
      typeSpecificInstructions = `
Genera un brief de email marketing con:
1. "title": Nombre de la campana de email
2. "subjectLines": Array de 5-7 lineas de asunto alternativas
3. "preheaderText": Texto de preview (max 100 caracteres)
4. "bodyStructure": Estructura del cuerpo con:
   - "introduction": Parrafo de apertura
   - "body": Contenido principal
   - "conclusion": Cierre con CTA
5. "callsToAction": Array de 2-3 CTAs
6. "toneOfVoice": Tono del email
7. "keyMessages": Array de 3-5 mensajes clave
`;
      break;

    case 'social':
      typeSpecificInstructions = `
Genera un brief de redes sociales con:
1. "title": Nombre de la campana social
2. "posts": Array de posts para diferentes plataformas:
   - Para cada post incluir:
     - "platform": "LinkedIn", "Twitter", "Instagram" o "Facebook"
     - "text": Texto del post (respetando limites de cada red)
     - "hashtags": Array de 3-5 hashtags relevantes
   - Incluir al menos 1 post por cada plataforma principal
3. "toneOfVoice": Tono de voz en redes
4. "keyMessages": Array de 3-5 mensajes clave
`;
      break;
  }

  return `Eres un estratega de contenido experto. Genera un brief de tipo "${type}" para la siguiente marca.

${baseContext}
${topicContext}
${keywordsContext}

${typeSpecificInstructions}

IMPORTANTE:
- Todos los textos deben estar en espanol
- NO mencionar competidores directamente
- NO usar palabras o temas de las restricciones absolutas
- El contenido debe alinearse con la estrategia de marca
- Respeta todos los guardrails definidos

Responde UNICAMENTE con JSON valido, sin texto adicional. El JSON debe incluir todos los campos especificados arriba, mas "avoidTopics" con los temas a evitar basados en las restricciones.`;
}

function checkTextForViolations(
  text: string,
  negativeScope: NegativeScope,
  competitors: string[]
): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];
  const lowerText = text.toLowerCase();

  const excludedKeywords = negativeScope.excluded_keywords || [];
  for (const keyword of excludedKeywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      violations.push({
        field: 'content',
        value: keyword,
        violationType: 'excluded_keyword',
        matchedRule: `Keyword excluida: ${keyword}`,
      });
    }
  }

  const excludedCategories = negativeScope.excluded_categories || [];
  for (const category of excludedCategories) {
    if (lowerText.includes(category.toLowerCase())) {
      violations.push({
        field: 'content',
        value: category,
        violationType: 'excluded_category',
        matchedRule: `Categoria excluida: ${category}`,
      });
    }
  }

  const excludedUseCases = negativeScope.excluded_use_cases || [];
  for (const useCase of excludedUseCases) {
    if (lowerText.includes(useCase.toLowerCase())) {
      violations.push({
        field: 'content',
        value: useCase,
        violationType: 'excluded_use_case',
        matchedRule: `Caso de uso excluido: ${useCase}`,
      });
    }
  }

  for (const competitor of competitors) {
    if (lowerText.includes(competitor.toLowerCase())) {
      violations.push({
        field: 'content',
        value: competitor,
        violationType: 'competitor_mention',
        matchedRule: `Competidor mencionado: ${competitor}`,
      });
    }
  }

  return violations;
}

export function validateBriefAgainstGuardrails(
  brief: ContentBrief,
  negativeScope: NegativeScope,
  competitors: string[]
): string[] {
  const warnings: string[] = [];

  const allText: string[] = [
    brief.title || '',
    brief.toneOfVoice || '',
    ...(brief.keyMessages || []),
    ...(brief.targetKeywords || []),
    brief.headingStructure?.h1 || '',
    ...(brief.headingStructure?.h2s || []),
    ...(brief.headingStructure?.h3s || []),
    ...(brief.headlines || []),
    ...(brief.descriptions || []),
    ...(brief.callsToAction || []),
    ...(brief.sections?.map(s => `${s.title} ${s.content} ${s.cta || ''}`).flat() || []),
    ...(brief.subjectLines || []),
    brief.preheaderText || '',
    brief.bodyStructure?.introduction || '',
    brief.bodyStructure?.body || '',
    brief.bodyStructure?.conclusion || '',
    ...(brief.posts?.map(p => `${p.text} ${(p.hashtags || []).join(' ')}`).flat() || []),
  ];

  const combinedText = allText.join(' ');
  const violations = checkTextForViolations(combinedText, negativeScope, competitors);

  for (const violation of violations) {
    warnings.push(violation.matchedRule);
  }

  return [...new Set(warnings)];
}

export async function generateContentBrief(
  config: InsertConfiguration,
  type: BriefType,
  options: ContentBriefOptions = {}
): Promise<ContentBrief> {
  const prompt = buildPromptForType(config, type, options);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "Eres un estratega de contenido experto que genera briefs estructurados en formato JSON. Siempre responde con JSON valido sin markdown ni texto adicional.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No se recibio respuesta de OpenAI");
  }

  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  let parsedBrief: Partial<ContentBrief>;
  try {
    parsedBrief = JSON.parse(jsonStr);
  } catch (e) {
    console.error("[ContentBrief] Failed to parse JSON:", jsonStr);
    throw new Error("Error al parsear la respuesta de OpenAI");
  }

  const negativeScope = config.negative_scope || {};
  const competitors = config.competitors?.direct || [];

  const avoidTopics = [
    ...(negativeScope.excluded_keywords || []),
    ...(negativeScope.excluded_categories || []),
    ...(negativeScope.excluded_use_cases || []),
  ];

  const brief: ContentBrief = {
    type,
    title: parsedBrief.title || `Brief de ${type}`,
    generatedAt: new Date().toISOString(),
    configurationName: config.name || 'Configuracion',
    toneOfVoice: parsedBrief.toneOfVoice || 'Profesional y accesible',
    keyMessages: parsedBrief.keyMessages || [],
    avoidTopics: [...new Set([...(parsedBrief.avoidTopics || []), ...avoidTopics])],
    guardrailWarnings: [],
    ...(type === 'seo' && {
      targetKeywords: parsedBrief.targetKeywords,
      headingStructure: parsedBrief.headingStructure,
      wordCountRange: parsedBrief.wordCountRange,
    }),
    ...(type === 'ad_copy' && {
      headlines: parsedBrief.headlines,
      descriptions: parsedBrief.descriptions,
      callsToAction: parsedBrief.callsToAction,
    }),
    ...(type === 'landing_page' && {
      sections: parsedBrief.sections,
    }),
    ...(type === 'email' && {
      subjectLines: parsedBrief.subjectLines,
      preheaderText: parsedBrief.preheaderText,
      bodyStructure: parsedBrief.bodyStructure,
      callsToAction: parsedBrief.callsToAction,
    }),
    ...(type === 'social' && {
      posts: parsedBrief.posts,
    }),
  };

  const warnings = validateBriefAgainstGuardrails(brief, negativeScope, competitors);
  brief.guardrailWarnings = warnings;

  return brief;
}
