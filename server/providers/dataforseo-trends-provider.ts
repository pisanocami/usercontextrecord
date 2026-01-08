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

function convertToDataForSEOTimeRange(timeRange: string): string {
  const mapping: Record<string, string> = {
    "today 5-y": "past_5_years",
    "today 12-m": "past_12_months",
    "today 3-m": "past_90_days",
    "today 1-m": "past_30_days",
    "today 7-d": "past_7_days",
  };
  return mapping[timeRange] || "past_5_years";
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

interface TrendsGraphDataPoint {
  date_from: string;
  date_to: string;
  timestamp: number;
  missing_data: boolean;
  values: number;
}

interface ExploreResultItem {
  type: string;
  position: number;
  title: string;
  keywords: string[];
  data: TrendsGraphDataPoint[];
  averages: number[];
}

interface ExploreResponse {
  status_code: number;
  status_message: string;
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
    result: Array<{
      keywords: string[];
      type: string;
      location_code: number;
      language_code: string;
      items: ExploreResultItem[];
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
    const results = await this.fetchBatch([query.query], {
      timeRange: query.timeRange,
      country: query.country,
      interval: query.interval,
    });
    return results[0] || this.createEmptyResponse(query.query);
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
    const timeRangeParam = convertToDataForSEOTimeRange(options.timeRange);
    const locationCode = getLocationCode(options.country);

    const body = [
      {
        keywords: queries,
        location_code: locationCode,
        language_code: "en",
        time_range: timeRangeParam,
        type: "web",
        item_types: ["google_trends_graph"],
      },
    ];

    try {
      console.log(`[DataForSEO Trends] Fetching batch of ${queries.length} queries`);
      console.log(`[DataForSEO Trends] Time range: ${timeRangeParam}`);

      const response = await makeRequest<ExploreResponse>(
        "/keywords_data/google_trends/explore/live",
        body
      );

      const task = response.tasks?.[0];
      if (!task || task.status_code !== 20000) {
        console.log(`[DataForSEO Trends] Task failed:`, task?.status_message);
        return queries.map((query) => this.createEmptyResponse(query));
      }

      const result = task.result?.[0];
      if (!result || !result.items) {
        console.log(`[DataForSEO Trends] No result items returned`);
        return queries.map((query) => this.createEmptyResponse(query));
      }

      const timelineItem = result.items.find(
        (item) => item.type === "google_trends_graph" || item.type === "interest_over_time"
      );

      if (!timelineItem || !timelineItem.data || timelineItem.data.length === 0) {
        console.log(`[DataForSEO Trends] No timeline data found in items. Types:`, 
          result.items.map(i => i.type).join(", "));
        
        for (const item of result.items) {
          if (item.data && item.data.length > 0) {
            console.log(`[DataForSEO Trends] Found data in item type "${item.type}":`, 
              JSON.stringify(item.data.slice(0, 2)));
          }
        }
        
        const anyDataItem = result.items.find(item => item.data && item.data.length > 0);
        if (anyDataItem) {
          return this.extractDataFromItem(anyDataItem, queries);
        }
        
        return queries.map((query) => this.createEmptyResponse(query));
      }

      return this.extractDataFromItem(timelineItem, queries);
    } catch (error) {
      console.error(`[DataForSEO Trends] Batch fetch error:`, error);
      return queries.map((query) => this.createEmptyResponse(query));
    }
  }

  private extractDataFromItem(item: ExploreResultItem, queries: string[]): TrendsResponse[] {
    const fetchedAt = new Date().toISOString();
    
    console.log(`[DataForSEO Trends] Item type: ${item.type}`);
    console.log(`[DataForSEO Trends] Data points: ${item.data?.length || 0}`);
    console.log(`[DataForSEO Trends] Keywords in item: ${item.keywords?.join(", ")}`);
    
    if (!item.data || item.data.length === 0) {
      console.log(`[DataForSEO Trends] No data in item`);
      return queries.map((query) => this.createEmptyResponse(query));
    }

    const itemKeywords = item.keywords || [];
    
    return queries.map((query, queryIndex) => {
      const keywordIndex = itemKeywords.findIndex(
        k => k.toLowerCase() === query.toLowerCase()
      );
      const actualIndex = keywordIndex >= 0 ? keywordIndex : queryIndex;
      
      const timelineData: TrendsDataPoint[] = item.data
        .filter(d => !d.missing_data)
        .map((d: any) => {
          const valuesArray = Array.isArray(d.values) ? d.values : [d.values];
          const value = valuesArray[actualIndex] ?? 0;
          return {
            date: d.date_from,
            value: typeof value === 'number' ? value : 0,
          };
        });

      console.log(`[DataForSEO Trends] Extracted ${timelineData.length} data points for "${query}" (index ${actualIndex})`);
      
      return {
        query,
        data: timelineData,
        metadata: {
          fetchedAt,
          source: "DataForSEO" as const,
          cached: false,
        },
      };
    });
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
