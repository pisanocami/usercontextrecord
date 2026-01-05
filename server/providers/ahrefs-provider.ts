import type {
  KeywordDataProvider,
  GapResult,
  RankedKeywordsResult,
} from "../keyword-data-provider";

export class AhrefsProvider implements KeywordDataProvider {
  readonly name = "ahrefs" as const;
  readonly displayName = "Ahrefs";

  isConfigured(): boolean {
    return !!(process.env.AHREFS_API_KEY);
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

    throw new Error("Ahrefs integration not yet implemented. Coming soon!");
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

    throw new Error("Ahrefs integration not yet implemented. Coming soon!");
  }
}

export const ahrefsProvider = new AhrefsProvider();
