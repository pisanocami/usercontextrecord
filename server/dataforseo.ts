import { z } from "zod";

const DATAFORSEO_API_URL = "https://api.dataforseo.com/v3";

interface DataForSEOCredentials {
  login: string;
  password: string;
}

function getCredentials(): DataForSEOCredentials {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  
  if (!login || !password) {
    throw new Error("DataForSEO credentials not configured. Please set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.");
  }
  
  return { login, password };
}

function getAuthHeader(): string {
  const { login, password } = getCredentials();
  const credentials = Buffer.from(`${login}:${password}`).toString("base64");
  return `Basic ${credentials}`;
}

async function makeRequest<T>(endpoint: string, body: any): Promise<T> {
  const response = await fetch(`${DATAFORSEO_API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DataForSEO API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.status_code !== 20000) {
    throw new Error(`DataForSEO API error: ${data.status_message}`);
  }

  return data;
}

export const RankedKeywordSchema = z.object({
  keyword: z.string(),
  search_volume: z.number().optional(),
  position: z.number().optional(),
  position_type: z.string().optional(),
  monthly_searches: z.array(z.object({
    year: z.number(),
    month: z.number(),
    search_volume: z.number(),
  })).optional(),
  cpc: z.number().optional(),
  competition: z.number().optional(),
  is_paid: z.boolean().optional(),
  traffic_volume: z.number().optional(),
});

export type RankedKeyword = z.infer<typeof RankedKeywordSchema>;

export interface RankedKeywordsResult {
  target: string;
  total_count: number;
  items: RankedKeyword[];
}

export interface KeywordGapResult {
  brand_domain: string;
  competitor_domain: string;
  brand_keywords: RankedKeyword[];
  competitor_keywords: RankedKeyword[];
  gap_keywords: RankedKeyword[];
  overlap_keywords: Array<{
    keyword: string;
    brand_position: number;
    competitor_position: number;
    search_volume: number;
    gap: number;
  }>;
  total_gap_keywords: number;
  total_overlap_keywords: number;
}

export async function getRankedKeywords(
  domain: string,
  locationCode: number = 2840,
  languageName: string = "English",
  limit: number = 100
): Promise<RankedKeywordsResult> {
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];

  const body = [
    {
      target: cleanDomain,
      language_name: languageName,
      location_code: locationCode,
      limit: Math.min(limit, 1000),
    },
  ];

  const response = await makeRequest<{
    tasks: Array<{
      result: Array<{
        target: string;
        total_count: number;
        items_count: number;
        items: Array<{
          keyword_data: {
            keyword: string;
            keyword_info: {
              search_volume?: number;
              monthly_searches?: Array<{
                year: number;
                month: number;
                search_volume: number;
              }>;
              cpc?: number;
              competition?: number;
            };
          };
          ranked_serp_element: {
            serp_item: {
              rank_group?: number;
              rank_absolute?: number;
              position?: string;
              type?: string;
              is_paid?: boolean;
              estimated_paid_traffic_cost?: number;
            };
          };
        }>;
      }>;
    }>;
  }>("/dataforseo_labs/google/ranked_keywords/live", body);

  const result = response.tasks?.[0]?.result?.[0];
  
  if (!result) {
    return {
      target: cleanDomain,
      total_count: 0,
      items: [],
    };
  }

  const items: RankedKeyword[] = (result.items || []).map((item) => ({
    keyword: item.keyword_data.keyword,
    search_volume: item.keyword_data.keyword_info?.search_volume,
    position: item.ranked_serp_element?.serp_item?.rank_absolute || 
              item.ranked_serp_element?.serp_item?.rank_group,
    position_type: item.ranked_serp_element?.serp_item?.type,
    monthly_searches: item.keyword_data.keyword_info?.monthly_searches,
    cpc: item.keyword_data.keyword_info?.cpc,
    competition: item.keyword_data.keyword_info?.competition,
    is_paid: item.ranked_serp_element?.serp_item?.is_paid,
  }));

  return {
    target: result.target,
    total_count: result.total_count,
    items,
  };
}

export async function getKeywordGap(
  brandDomain: string,
  competitorDomain: string,
  locationCode: number = 2840,
  languageName: string = "English",
  limit: number = 100
): Promise<KeywordGapResult> {
  const [brandResult, competitorResult] = await Promise.all([
    getRankedKeywords(brandDomain, locationCode, languageName, limit),
    getRankedKeywords(competitorDomain, locationCode, languageName, limit),
  ]);

  const brandKeywordSet = new Set(brandResult.items.map((k) => k.keyword.toLowerCase()));
  const competitorKeywordMap = new Map(
    competitorResult.items.map((k) => [k.keyword.toLowerCase(), k])
  );
  const brandKeywordMap = new Map(
    brandResult.items.map((k) => [k.keyword.toLowerCase(), k])
  );

  const gapKeywords = competitorResult.items.filter(
    (k) => !brandKeywordSet.has(k.keyword.toLowerCase())
  );

  const overlapKeywords: KeywordGapResult["overlap_keywords"] = [];
  
  Array.from(brandKeywordMap.entries()).forEach(([keyword, brandKeyword]) => {
    const competitorKeyword = competitorKeywordMap.get(keyword);
    if (competitorKeyword) {
      const brandPos = brandKeyword.position ?? 100;
      const compPos = competitorKeyword.position ?? 100;
      overlapKeywords.push({
        keyword: brandKeyword.keyword,
        brand_position: brandPos,
        competitor_position: compPos,
        search_volume: brandKeyword.search_volume ?? 0,
        gap: compPos - brandPos,
      });
    }
  });

  overlapKeywords.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

  return {
    brand_domain: brandDomain,
    competitor_domain: competitorDomain,
    brand_keywords: brandResult.items,
    competitor_keywords: competitorResult.items,
    gap_keywords: gapKeywords,
    overlap_keywords: overlapKeywords,
    total_gap_keywords: gapKeywords.length,
    total_overlap_keywords: overlapKeywords.length,
  };
}

export function applyUCRGuardrails(
  result: KeywordGapResult,
  exclusions: {
    excluded_topics?: string[];
    excluded_keywords?: string[];
    excluded_categories?: string[];
  },
  semanticFence?: {
    boundary_terms?: string[];
    out_of_scope?: string[];
  }
): KeywordGapResult {
  const excludedPatterns: RegExp[] = [];

  if (exclusions.excluded_keywords) {
    for (const keyword of exclusions.excluded_keywords) {
      try {
        excludedPatterns.push(new RegExp(keyword.toLowerCase(), "i"));
      } catch {
        excludedPatterns.push(new RegExp(escapeRegex(keyword.toLowerCase()), "i"));
      }
    }
  }

  if (exclusions.excluded_topics) {
    for (const topic of exclusions.excluded_topics) {
      excludedPatterns.push(new RegExp(escapeRegex(topic.toLowerCase()), "i"));
    }
  }

  if (semanticFence?.out_of_scope) {
    for (const term of semanticFence.out_of_scope) {
      excludedPatterns.push(new RegExp(escapeRegex(term.toLowerCase()), "i"));
    }
  }

  const isExcluded = (keyword: string): boolean => {
    const lowerKeyword = keyword.toLowerCase();
    return excludedPatterns.some((pattern) => pattern.test(lowerKeyword));
  };

  const filteredGapKeywords = result.gap_keywords.filter(
    (k) => !isExcluded(k.keyword)
  );

  const filteredOverlapKeywords = result.overlap_keywords.filter(
    (k) => !isExcluded(k.keyword)
  );

  return {
    ...result,
    gap_keywords: filteredGapKeywords,
    overlap_keywords: filteredOverlapKeywords,
    total_gap_keywords: filteredGapKeywords.length,
    total_overlap_keywords: filteredOverlapKeywords.length,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function checkCredentialsConfigured(): boolean {
  return !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}
