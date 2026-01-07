import type { TrendsQuery, TrendsResponse, TrendsDataPoint } from "@shared/schema";

export type TrendsProviderType = "dataforseo";

export interface TrendsDataProvider {
  readonly name: TrendsProviderType;
  readonly displayName: string;

  isConfigured(): boolean;

  fetchTrends(query: TrendsQuery): Promise<TrendsResponse>;

  compareQueries(
    queries: string[],
    options: Omit<TrendsQuery, "query">
  ): Promise<TrendsResponse[]>;
}

export interface TrendsProviderStatus {
  provider: TrendsProviderType;
  displayName: string;
  configured: boolean;
  message?: string;
}

export function getTrendsProviderStatus(provider: TrendsDataProvider): TrendsProviderStatus {
  return {
    provider: provider.name,
    displayName: provider.displayName,
    configured: provider.isConfigured(),
    message: provider.isConfigured()
      ? `${provider.displayName} Trends API is ready`
      : `${provider.displayName} requires API credentials for trends data`,
  };
}
