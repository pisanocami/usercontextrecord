import type {
  KeywordDataProvider,
  GapResult,
  GapKeyword,
  RankedKeywordsResult,
  RankedKeyword,
} from "../keyword-data-provider";

const DATAFORSEO_API_URL = "https://api.dataforseo.com/v3";

function getCredentials(): { login: string; password: string } | null {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  
  if (!login || !password) {
    return null;
  }
  
  return { login, password };
}

function getAuthHeader(): string {
  const creds = getCredentials();
  if (!creds) {
    throw new Error("DataForSEO credentials not configured");
  }
  const credentials = Buffer.from(`${creds.login}:${creds.password}`).toString("base64");
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

function cleanDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .toLowerCase()
    .trim();
}

export class DataForSEOProvider implements KeywordDataProvider {
  readonly name = "dataforseo" as const;
  readonly displayName = "DataForSEO";

  isConfigured(): boolean {
    return getCredentials() !== null;
  }

  async getGapKeywords(
    brandDomain: string,
    competitorDomain: string,
    options: {
      locationCode?: number;
      languageName?: string;
      limit?: number;
    } = {}
  ): Promise<GapResult> {
    const { locationCode = 2840, languageName = "English", limit = 200 } = options;
    
    const cleanBrand = cleanDomain(brandDomain);
    const cleanCompetitor = cleanDomain(competitorDomain);

    const body = [
      {
        target1: cleanBrand,
        target2: cleanCompetitor,
        language_name: languageName,
        location_code: locationCode,
        intersections: false,
        limit: Math.min(limit, 1000),
        order_by: ["keyword_data.keyword_info.search_volume,desc"],
      },
    ];

    try {
      const response = await makeRequest<{
        tasks: Array<{
          result: Array<{
            total_count: number;
            items_count: number;
            items: Array<{
              keyword_data: {
                keyword: string;
                keyword_info: {
                  search_volume?: number;
                  cpc?: number;
                  competition?: number;
                };
              };
              first_domain_serp_element?: {
                serp_item?: {
                  rank_absolute?: number;
                  rank_group?: number;
                };
              };
              second_domain_serp_element?: {
                serp_item?: {
                  rank_absolute?: number;
                  rank_group?: number;
                };
              };
            }>;
          }>;
        }>;
      }>("/dataforseo_labs/google/domain_intersection/live", body);

      const result = response.tasks?.[0]?.result?.[0];
      
      if (!result || !result.items) {
        console.log(`[DataForSEO] No intersection results for ${cleanBrand} vs ${cleanCompetitor}`);
        return {
          brandDomain: cleanBrand,
          competitorDomain: cleanCompetitor,
          gapKeywords: [],
          totalCount: 0,
        };
      }

      const gapKeywords: GapKeyword[] = result.items
        .filter(item => {
          const brandPos = item.first_domain_serp_element?.serp_item?.rank_absolute ?? 
                          item.first_domain_serp_element?.serp_item?.rank_group;
          const compPos = item.second_domain_serp_element?.serp_item?.rank_absolute ?? 
                         item.second_domain_serp_element?.serp_item?.rank_group;
          return !brandPos && compPos;
        })
        .map(item => ({
          keyword: item.keyword_data.keyword,
          searchVolume: item.keyword_data.keyword_info?.search_volume || 0,
          competitorPosition: item.second_domain_serp_element?.serp_item?.rank_absolute ?? 
                             item.second_domain_serp_element?.serp_item?.rank_group ?? 100,
          cpc: item.keyword_data.keyword_info?.cpc,
          competition: item.keyword_data.keyword_info?.competition,
        }));

      if (gapKeywords.length === 0) {
        console.log(`[DataForSEO] Domain intersection returned 0 gap keywords, trying fallback for ${cleanCompetitor}`);
        return this.getGapKeywordsFallback(cleanBrand, cleanCompetitor, options);
      }

      return {
        brandDomain: cleanBrand,
        competitorDomain: cleanCompetitor,
        gapKeywords,
        totalCount: result.total_count,
      };
    } catch (error) {
      console.error(`[DataForSEO] Error in getGapKeywords for ${cleanBrand} vs ${cleanCompetitor}:`, error);
      console.log(`[DataForSEO] Trying fallback for ${cleanCompetitor}`);
      return this.getGapKeywordsFallback(cleanBrand, cleanCompetitor, options);
    }
  }

  private async getGapKeywordsFallback(
    brandDomain: string,
    competitorDomain: string,
    options: { locationCode?: number; languageName?: string; limit?: number }
  ): Promise<GapResult> {
    try {
      const [brandResult, competitorResult] = await Promise.all([
        this.getRankedKeywords(brandDomain, options),
        this.getRankedKeywords(competitorDomain, options),
      ]);

      const brandKeywordSet = new Set(brandResult.items.map(k => k.keyword.toLowerCase()));
      
      const gapKeywords: GapKeyword[] = competitorResult.items
        .filter(k => !brandKeywordSet.has(k.keyword.toLowerCase()))
        .map(k => ({
          keyword: k.keyword,
          searchVolume: k.searchVolume || 0,
          competitorPosition: k.position || 100,
          cpc: k.cpc,
          competition: k.competition,
        }));

      console.log(`[DataForSEO] Fallback found ${gapKeywords.length} gap keywords for ${competitorDomain}`);

      return {
        brandDomain: cleanDomain(brandDomain),
        competitorDomain: cleanDomain(competitorDomain),
        gapKeywords,
        totalCount: gapKeywords.length,
      };
    } catch (error) {
      console.error(`[DataForSEO] Fallback also failed for ${competitorDomain}:`, error);
      return {
        brandDomain: cleanDomain(brandDomain),
        competitorDomain: cleanDomain(competitorDomain),
        gapKeywords: [],
        totalCount: 0,
      };
    }
  }

  async getRankedKeywords(
    domain: string,
    options: {
      locationCode?: number;
      languageName?: string;
      limit?: number;
    } = {}
  ): Promise<RankedKeywordsResult> {
    const { locationCode = 2840, languageName = "English", limit = 100 } = options;
    const cleanedDomain = cleanDomain(domain);

    const body = [
      {
        target: cleanedDomain,
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
              };
            };
          }>;
        }>;
      }>;
    }>("/dataforseo_labs/google/ranked_keywords/live", body);

    const result = response.tasks?.[0]?.result?.[0];
    
    if (!result) {
      return {
        target: cleanedDomain,
        totalCount: 0,
        items: [],
      };
    }

    const items: RankedKeyword[] = (result.items || []).map((item) => ({
      keyword: item.keyword_data.keyword,
      searchVolume: item.keyword_data.keyword_info?.search_volume,
      position: item.ranked_serp_element?.serp_item?.rank_absolute || 
                item.ranked_serp_element?.serp_item?.rank_group,
      cpc: item.keyword_data.keyword_info?.cpc,
      competition: item.keyword_data.keyword_info?.competition,
    }));

    return {
      target: result.target,
      totalCount: result.total_count,
      items,
    };
  }
}

export const dataForSEOProvider = new DataForSEOProvider();
