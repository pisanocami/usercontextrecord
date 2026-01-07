import type { TrendsDataProvider, TrendsProviderStatus } from "../trends-data-provider";
import { getTrendsProviderStatus } from "../trends-data-provider";
import { dataForSEOTrendsProvider } from "./dataforseo-trends-provider";

const trendsProviders: Record<string, TrendsDataProvider> = {
  dataforseo: dataForSEOTrendsProvider,
};

export function getTrendsProvider(type: string = "dataforseo"): TrendsDataProvider {
  const provider = trendsProviders[type];
  if (!provider) {
    throw new Error(`Unknown trends provider type: ${type}`);
  }
  return provider;
}

export function getDefaultTrendsProvider(): TrendsDataProvider {
  if (dataForSEOTrendsProvider.isConfigured()) {
    return dataForSEOTrendsProvider;
  }
  return dataForSEOTrendsProvider;
}

export function getAllTrendsProviderStatuses(): TrendsProviderStatus[] {
  return Object.values(trendsProviders).map(getTrendsProviderStatus);
}

export function getConfiguredTrendsProviders(): TrendsDataProvider[] {
  return Object.values(trendsProviders).filter((p) => p.isConfigured());
}

export { dataForSEOTrendsProvider };
export type { TrendsDataProvider, TrendsProviderStatus };
