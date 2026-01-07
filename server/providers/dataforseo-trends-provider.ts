import type { TrendsDataProvider } from "../trends-data-provider";
import type { TrendsQuery, TrendsResponse, TrendsDataPoint } from "@shared/schema";

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
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DataForSEO Trends API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.status_code !== 20000) {
    throw new Error(`DataForSEO Trends API error: ${data.status_message}`);
  }

  return data;
}

function convertTimeRange(timeRange: string): { date_from: string; date_to: string } {
  const now = new Date();
  let dateFrom: Date;

  if (timeRange === "today 5-y") {
    dateFrom = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
  } else if (timeRange === "today 12-m") {
    dateFrom = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  } else if (timeRange === "today 3-m") {
    dateFrom = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  } else {
    dateFrom = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
  }

  return {
    date_from: dateFrom.toISOString().split("T")[0],
    date_to: now.toISOString().split("T")[0],
  };
}

function getLocationCode(country: string): number {
  const locationCodes: Record<string, number> = {
    US: 2840,
    UK: 2826,
    GB: 2826,
    CA: 2124,
    AU: 2036,
    DE: 2276,
    FR: 2250,
    ES: 2724,
    IT: 2380,
    BR: 2076,
    MX: 2484,
    JP: 2392,
    IN: 2356,
    NL: 2528,
    BE: 2056,
    SE: 2752,
    NO: 2578,
    DK: 2208,
    FI: 2246,
    PL: 2616,
    AR: 2032,
    CL: 2152,
    CO: 2170,
    PE: 2604,
  };

  return locationCodes[country.toUpperCase()] || 2840;
}

interface DataForSEOTrendsItem {
  date_from: string;
  date_to: string;
  timestamp: number;
  values: number[];
}

interface DataForSEOTrendsResponse {
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
    result: Array<{
      keyword: string;
      type: string;
      location_code: number;
      language_code: string;
      items: DataForSEOTrendsItem[];
    }>;
  }>;
}

export class DataForSEOTrendsProvider implements TrendsDataProvider {
  readonly name = "dataforseo" as const;
  readonly displayName = "DataForSEO Trends";

  isConfigured(): boolean {
    return getCredentials() !== null;
  }

  async fetchTrends(query: TrendsQuery): Promise<TrendsResponse> {
    const { date_from, date_to } = convertTimeRange(query.timeRange);
    const locationCode = getLocationCode(query.country);

    const body = [
      {
        keywords: [query.query],
        location_code: locationCode,
        language_code: "en",
        date_from,
        date_to,
        time_range: query.interval === "daily" ? "past_day" : query.interval === "monthly" ? "past_12_months" : "past_4_hours",
        type: "web_search",
      },
    ];

    try {
      console.log(`[DataForSEO Trends] Fetching trends for "${query.query}" in ${query.country}`);

      const response = await makeRequest<DataForSEOTrendsResponse>(
        "/keywords_data/google_trends/explore/live",
        body
      );

      const result = response.tasks?.[0]?.result?.[0];

      if (!result || !result.items || result.items.length === 0) {
        console.log(`[DataForSEO Trends] No data returned for "${query.query}"`);
        return this.createEmptyResponse(query.query);
      }

      const data: TrendsDataPoint[] = result.items.map((item) => ({
        date: item.date_from.split(" ")[0],
        value: item.values?.[0] ?? 0,
      }));

      return {
        query: query.query,
        data,
        metadata: {
          fetchedAt: new Date().toISOString(),
          source: "DataForSEO",
          cached: false,
        },
      };
    } catch (error) {
      console.error(`[DataForSEO Trends] Error fetching trends for "${query.query}":`, error);
      throw error;
    }
  }

  async compareQueries(
    queries: string[],
    options: Omit<TrendsQuery, "query">
  ): Promise<TrendsResponse[]> {
    const BATCH_SIZE = 5;
    const results: TrendsResponse[] = [];

    for (let i = 0; i < queries.length; i += BATCH_SIZE) {
      const batch = queries.slice(i, i + BATCH_SIZE);
      const batchResults = await this.fetchBatch(batch, options);
      results.push(...batchResults);
    }

    return results;
  }

  private async fetchBatch(
    queries: string[],
    options: Omit<TrendsQuery, "query">
  ): Promise<TrendsResponse[]> {
    const { date_from, date_to } = convertTimeRange(options.timeRange);
    const locationCode = getLocationCode(options.country);

    const body = [
      {
        keywords: queries,
        location_code: locationCode,
        language_code: "en",
        date_from,
        date_to,
        type: "web_search",
      },
    ];

    try {
      console.log(`[DataForSEO Trends] Fetching batch of ${queries.length} queries`);

      const response = await makeRequest<DataForSEOTrendsResponse>(
        "/keywords_data/google_trends/explore/live",
        body
      );

      const taskResults = response.tasks?.[0]?.result || [];

      return queries.map((query, index) => {
        const result = taskResults[index];
        if (!result || !result.items || result.items.length === 0) {
          return this.createEmptyResponse(query);
        }

        const data: TrendsDataPoint[] = result.items.map((item) => ({
          date: item.date_from.split(" ")[0],
          value: item.values?.[0] ?? 0,
        }));

        return {
          query,
          data,
          metadata: {
            fetchedAt: new Date().toISOString(),
            source: "DataForSEO" as const,
            cached: false,
          },
        };
      });
    } catch (error) {
      console.error(`[DataForSEO Trends] Batch fetch error:`, error);
      return queries.map((query) => this.createEmptyResponse(query));
    }
  }

  private createEmptyResponse(query: string): TrendsResponse {
    return {
      query,
      data: [],
      metadata: {
        fetchedAt: new Date().toISOString(),
        source: "DataForSEO",
        cached: false,
      },
    };
  }
}

export const dataForSEOTrendsProvider = new DataForSEOTrendsProvider();
