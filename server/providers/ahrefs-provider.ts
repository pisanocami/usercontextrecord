import type {
  KeywordDataProvider,
  GapResult,
  GapKeyword,
  RankedKeywordsResult,
  RankedKeyword,
} from "../keyword-data-provider";

interface AhrefsOrganicKeyword {
  keyword: string;
  best_position: number;
  volume: number;
  keyword_difficulty: number;
  cpc: number;
}

interface AhrefsOrganicResponse {
  keywords: AhrefsOrganicKeyword[];
}

interface CacheEntry {
  data: RankedKeywordsResult;
  timestamp: number;
  expiresAt: number;
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const organicKeywordsCache = new Map<string, CacheEntry>();

function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

function getCacheKey(domain: string, country: string, limit: number): string {
  return `ahrefs:organic:${normalizeDomain(domain)}:${country}:${limit}`;
}

function getPositionWeight(position: number): number {
  if (position <= 5) return 1.0;
  if (position <= 10) return 0.7;
  if (position <= 20) return 0.5;
  return 0.3;
}

function calculateOpportunityScore(
  volume: number,
  kd: number,
  position: number
): number {
  if (volume <= 0) return 0;
  const kdNorm = Math.min(kd, 100) / 100;
  const positionWeight = getPositionWeight(position);
  return Math.log10(volume + 1) * (1 - kdNorm) * positionWeight;
}

export class AhrefsProvider implements KeywordDataProvider {
  readonly name = "ahrefs" as const;
  readonly displayName = "Ahrefs";

  private apiKey: string | null = null;

  private getApiKey(): string {
    if (this.apiKey) return this.apiKey;
    const key = process.env.AHREFS_API_KEY || process.env.AHREFS_API_TOKEN;
    if (!key) {
      throw new Error("Ahrefs API key not configured. Please set AHREFS_API_KEY environment variable.");
    }
    this.apiKey = key;
    return key;
  }

  isConfigured(): boolean {
    return !!(process.env.AHREFS_API_KEY || process.env.AHREFS_API_TOKEN);
  }

  private async fetchOrganicKeywords(
    domain: string,
    options: {
      country?: string;
      limit?: number;
      positionLimit?: number;
    } = {}
  ): Promise<AhrefsOrganicKeyword[]> {
    const { country = "us", limit = 2000, positionLimit = 20 } = options;
    const normalizedDomain = normalizeDomain(domain);
    
    const cacheKey = getCacheKey(normalizedDomain, country, limit);
    const cached = organicKeywordsCache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[Ahrefs] Cache hit for ${normalizedDomain} (expires ${new Date(cached.expiresAt).toISOString()})`);
      return cached.data.items.map(item => ({
        keyword: item.keyword,
        best_position: item.position || 0,
        volume: item.searchVolume || 0,
        keyword_difficulty: (item.competition || 0) * 100,
        cpc: item.cpc || 0,
      }));
    }

    console.log(`[Ahrefs] Fetching organic keywords for ${normalizedDomain} (limit=${limit}, pos<=${positionLimit})`);

    const apiKey = this.getApiKey();
    
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    const params = new URLSearchParams({
      target: normalizedDomain,
      mode: "domain",
      country: country,
      limit: String(Math.min(limit * 2, 10000)),
      order_by: "volume:desc",
      select: "keyword,best_position,volume,keyword_difficulty,cpc",
      date: dateStr,
      output: "json",
    });

    const response = await fetch(
      `https://api.ahrefs.com/v3/site-explorer/organic-keywords?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Ahrefs] API error: ${response.status} - ${errorText}`);
      throw new Error(`Ahrefs API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as AhrefsOrganicResponse;
    const allKeywords = data.keywords || [];
    
    const keywords = allKeywords.filter(kw => kw.best_position <= positionLimit).slice(0, limit);

    console.log(`[Ahrefs] Fetched ${keywords.length} keywords for ${normalizedDomain}`);

    const cacheData: RankedKeywordsResult = {
      target: normalizedDomain,
      totalCount: keywords.length,
      items: keywords.map(kw => ({
        keyword: kw.keyword,
        searchVolume: kw.volume,
        position: kw.best_position,
        cpc: kw.cpc,
        competition: kw.keyword_difficulty / 100,
      })),
    };

    organicKeywordsCache.set(cacheKey, {
      data: cacheData,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return keywords;
  }

  private buildGapKeywords(
    clientKeywords: AhrefsOrganicKeyword[],
    competitorKeywords: AhrefsOrganicKeyword[],
    options: {
      minVolume?: number;
      maxKd?: number;
    } = {}
  ): GapKeyword[] {
    const { minVolume = 100, maxKd = 60 } = options;

    const clientKwSet = new Set(
      clientKeywords
        .filter(kw => kw.best_position <= 100)
        .map(kw => kw.keyword.toLowerCase())
    );

    const gapKeywords: GapKeyword[] = [];

    for (const compKw of competitorKeywords) {
      const kwLower = compKw.keyword.toLowerCase();
      
      if (clientKwSet.has(kwLower)) continue;

      if (compKw.volume < minVolume) continue;
      if (compKw.keyword_difficulty > maxKd) continue;

      gapKeywords.push({
        keyword: compKw.keyword,
        searchVolume: compKw.volume,
        competitorPosition: compKw.best_position,
        cpc: compKw.cpc,
        competition: compKw.keyword_difficulty / 100,
      });
    }

    gapKeywords.sort((a, b) => {
      const scoreA = calculateOpportunityScore(
        a.searchVolume,
        (a.competition || 0) * 100,
        a.competitorPosition
      );
      const scoreB = calculateOpportunityScore(
        b.searchVolume,
        (b.competition || 0) * 100,
        b.competitorPosition
      );
      return scoreB - scoreA;
    });

    return gapKeywords;
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
    if (!this.isConfigured()) {
      throw new Error("Ahrefs API key not configured. Please set AHREFS_API_KEY environment variable.");
    }

    const { limit = 200 } = options;
    const country = this.locationCodeToCountry(options.locationCode);

    console.log(`[Ahrefs] Computing keyword gap: ${brandDomain} vs ${competitorDomain}`);

    const [clientKeywords, competitorKeywords] = await Promise.all([
      this.fetchOrganicKeywords(brandDomain, { country, limit: 2000, positionLimit: 100 }),
      this.fetchOrganicKeywords(competitorDomain, { country, limit: 2000, positionLimit: 20 }),
    ]);

    console.log(`[Ahrefs] Client has ${clientKeywords.length} keywords, competitor has ${competitorKeywords.length}`);

    const gapKeywords = this.buildGapKeywords(clientKeywords, competitorKeywords);

    console.log(`[Ahrefs] Found ${gapKeywords.length} gap keywords`);

    return {
      brandDomain: normalizeDomain(brandDomain),
      competitorDomain: normalizeDomain(competitorDomain),
      gapKeywords: gapKeywords.slice(0, limit),
      totalCount: gapKeywords.length,
    };
  }

  async getRankedKeywords(
    domain: string,
    options: {
      locationCode?: number;
      languageName?: string;
      limit?: number;
    } = {}
  ): Promise<RankedKeywordsResult> {
    if (!this.isConfigured()) {
      throw new Error("Ahrefs API key not configured. Please set AHREFS_API_KEY environment variable.");
    }

    const { limit = 500 } = options;
    const country = this.locationCodeToCountry(options.locationCode);

    const keywords = await this.fetchOrganicKeywords(domain, {
      country,
      limit,
      positionLimit: 100,
    });

    return {
      target: normalizeDomain(domain),
      totalCount: keywords.length,
      items: keywords.map(kw => ({
        keyword: kw.keyword,
        searchVolume: kw.volume,
        position: kw.best_position,
        cpc: kw.cpc,
        competition: kw.keyword_difficulty / 100,
      })),
    };
  }

  private locationCodeToCountry(locationCode?: number): string {
    const countryMap: Record<number, string> = {
      2840: "us",
      2826: "gb",
      2124: "ca",
      2036: "au",
      2276: "de",
      2250: "fr",
      2724: "es",
      2380: "it",
      2484: "mx",
      2076: "br",
    };
    return locationCode ? (countryMap[locationCode] || "us") : "us";
  }

  getCacheStats(): { entries: number; oldestEntry: Date | null } {
    let oldestTimestamp: number | null = null;
    
    const entries = Array.from(organicKeywordsCache.values());
    for (const entry of entries) {
      if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    }

    return {
      entries: organicKeywordsCache.size,
      oldestEntry: oldestTimestamp ? new Date(oldestTimestamp) : null,
    };
  }

  clearCache(): void {
    organicKeywordsCache.clear();
    console.log("[Ahrefs] Cache cleared");
  }
}

export const ahrefsProvider = new AhrefsProvider();
