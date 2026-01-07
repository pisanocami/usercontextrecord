export type ProviderType = "dataforseo" | "ahrefs";

export interface GapKeyword {
  keyword: string;
  searchVolume: number;
  competitorPosition: number;
  cpc?: number;
  competition?: number;
  keywordDifficulty?: number;
}

export interface GapResult {
  brandDomain: string;
  competitorDomain: string;
  gapKeywords: GapKeyword[];
  totalCount: number;
  error?: string;
}

export interface RankedKeyword {
  keyword: string;
  searchVolume?: number;
  position?: number;
  cpc?: number;
  competition?: number;
}

export interface RankedKeywordsResult {
  target: string;
  totalCount: number;
  items: RankedKeyword[];
}

export interface KeywordDataProvider {
  readonly name: ProviderType;
  readonly displayName: string;
  
  isConfigured(): boolean;
  
  getGapKeywords(
    brandDomain: string,
    competitorDomain: string,
    options?: {
      locationCode?: number;
      languageName?: string;
      limit?: number;
    }
  ): Promise<GapResult>;
  
  getRankedKeywords(
    domain: string,
    options?: {
      locationCode?: number;
      languageName?: string;
      limit?: number;
    }
  ): Promise<RankedKeywordsResult>;
}

export interface ProviderStatus {
  provider: ProviderType;
  displayName: string;
  configured: boolean;
  message?: string;
}

export function getProviderStatus(provider: KeywordDataProvider): ProviderStatus {
  return {
    provider: provider.name,
    displayName: provider.displayName,
    configured: provider.isConfigured(),
    message: provider.isConfigured() 
      ? `${provider.displayName} is ready` 
      : `${provider.displayName} requires API credentials`,
  };
}
