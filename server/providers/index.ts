import type { KeywordDataProvider, ProviderType, ProviderStatus } from "../keyword-data-provider";
import { getProviderStatus } from "../keyword-data-provider";
import { dataForSEOProvider } from "./dataforseo-provider";
import { ahrefsProvider } from "./ahrefs-provider";

const providers: Record<ProviderType, KeywordDataProvider> = {
  dataforseo: dataForSEOProvider,
  ahrefs: ahrefsProvider,
};

export function getProvider(type: ProviderType): KeywordDataProvider {
  const provider = providers[type];
  if (!provider) {
    throw new Error(`Unknown provider type: ${type}`);
  }
  return provider;
}

export function getDefaultProvider(): KeywordDataProvider {
  if (dataForSEOProvider.isConfigured()) {
    return dataForSEOProvider;
  }
  if (ahrefsProvider.isConfigured()) {
    return ahrefsProvider;
  }
  return dataForSEOProvider;
}

export function getAllProviderStatuses(): ProviderStatus[] {
  return Object.values(providers).map(getProviderStatus);
}

export function getConfiguredProviders(): KeywordDataProvider[] {
  return Object.values(providers).filter(p => p.isConfigured());
}

export { dataForSEOProvider, ahrefsProvider };
export type { KeywordDataProvider, ProviderType, ProviderStatus };
