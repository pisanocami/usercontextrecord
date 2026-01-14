# Implementation Guide: Keyword Opportunity Alerts

> **Quick Win #3**  
> **Complejidad**: Baja  
> **Timeline**: 3-5 días  
> **Dependencias**: UCR Demand Themes, DataForSEO

---

## Concepto

Notificaciones automáticas cuando se detectan nuevas oportunidades de keywords alineadas con el UCR.

---

## Types

```typescript
// shared/types/keyword-alerts.ts

export type OpportunityType = 
  | "trending_keyword"     // Keyword con volumen creciente
  | "competitor_dropped"   // Competidor perdió ranking
  | "low_difficulty_gap"   // Gap con KD bajo
  | "seasonal_upcoming"    // Oportunidad estacional próxima
  | "new_in_category";     // Nueva keyword en categoría

export type OpportunityUrgency = "act_now" | "this_week" | "this_month";

export interface KeywordOpportunity {
  id: string;
  keyword: string;
  opportunityType: OpportunityType;
  volume: number;
  difficulty: number;
  cpc: number;
  urgency: OpportunityUrgency;
  potentialValue: number;
  matchedTheme?: string;
  rationale: string;
  detectedAt: Date;
  isActioned: boolean;
}

export interface OpportunityAlertsSummary {
  totalOpportunities: number;
  actNowCount: number;
  thisWeekCount: number;
  thisMonthCount: number;
  totalPotentialValue: number;
  opportunities: KeywordOpportunity[];
  lastScan: Date;
}
```

---

## Core Implementation

```typescript
// server/modules/keyword-opportunity-alerts.ts

import type { Configuration } from "@shared/schema";
import type { 
  KeywordOpportunity, 
  OpportunityType,
  OpportunityUrgency,
  OpportunityAlertsSummary 
} from "@shared/types/keyword-alerts";
import { getProvider } from "../providers";

// Thresholds
const THRESHOLDS = {
  lowDifficulty: 30,      // KD <= 30 is "low"
  highVolume: 1000,       // Volume >= 1000 is notable
  trendingGrowth: 20,     // 20%+ growth is trending
  valuableOpportunity: 500 // $500+ estimated value
};

/**
 * Scan for keyword opportunities
 */
export async function scanKeywordOpportunities(
  config: Configuration
): Promise<OpportunityAlertsSummary> {
  const opportunities: KeywordOpportunity[] = [];

  // Get demand themes from UCR
  const themes = config.demand_definition?.demand_themes || [];
  const clientDomain = config.brand?.domain;
  const competitors = config.competitors?.competitors || [];

  if (!clientDomain) {
    throw new Error("Client domain not found in UCR");
  }

  // 1. Check for low-difficulty gaps
  const gapOpportunities = await findLowDifficultyGaps(
    clientDomain,
    competitors.map(c => c.domain),
    themes
  );
  opportunities.push(...gapOpportunities);

  // 2. Check for trending keywords in category
  const trendingOpportunities = await findTrendingKeywords(
    config.category_definition?.primary_category || "",
    themes
  );
  opportunities.push(...trendingOpportunities);

  // 3. Check for seasonal opportunities
  const seasonalOpportunities = findSeasonalOpportunities(themes);
  opportunities.push(...seasonalOpportunities);

  // Sort by urgency and value
  const sorted = opportunities.sort((a, b) => {
    const urgencyOrder = { act_now: 0, this_week: 1, this_month: 2 };
    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    }
    return b.potentialValue - a.potentialValue;
  });

  return {
    totalOpportunities: sorted.length,
    actNowCount: sorted.filter(o => o.urgency === "act_now").length,
    thisWeekCount: sorted.filter(o => o.urgency === "this_week").length,
    thisMonthCount: sorted.filter(o => o.urgency === "this_month").length,
    totalPotentialValue: sorted.reduce((sum, o) => sum + o.potentialValue, 0),
    opportunities: sorted.slice(0, 20), // Top 20
    lastScan: new Date()
  };
}

async function findLowDifficultyGaps(
  clientDomain: string,
  competitorDomains: string[],
  themes: any[]
): Promise<KeywordOpportunity[]> {
  const opportunities: KeywordOpportunity[] = [];
  const provider = getProvider("dataforseo");

  for (const competitorDomain of competitorDomains.slice(0, 3)) {
    try {
      const gapData = await provider.getKeywordGap(clientDomain, competitorDomain, {
        limit: 100,
        locationCode: 2840,
        languageCode: "en"
      });

      // Filter for low difficulty gaps where competitor ranks but we don't
      const lowDiffGaps = gapData.filter(kw => 
        kw.competitorPosition > 0 && 
        kw.competitorPosition <= 20 &&
        kw.clientPosition === 0 &&
        (kw.keywordDifficulty || 100) <= THRESHOLDS.lowDifficulty &&
        (kw.searchVolume || 0) >= 100
      );

      for (const gap of lowDiffGaps.slice(0, 5)) {
        const matchedTheme = findMatchingTheme(gap.keyword, themes);
        
        opportunities.push({
          id: `opp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          keyword: gap.keyword,
          opportunityType: "low_difficulty_gap",
          volume: gap.searchVolume || 0,
          difficulty: gap.keywordDifficulty || 0,
          cpc: gap.cpc || 0,
          urgency: calculateUrgency(gap),
          potentialValue: calculatePotentialValue(gap),
          matchedTheme: matchedTheme?.name,
          rationale: `Competitor ranks #${gap.competitorPosition} with only ${gap.keywordDifficulty} KD`,
          detectedAt: new Date(),
          isActioned: false
        });
      }
    } catch (error) {
      console.error(`Error checking gap for ${competitorDomain}:`, error);
    }
  }

  return opportunities;
}

async function findTrendingKeywords(
  category: string,
  themes: any[]
): Promise<KeywordOpportunity[]> {
  const opportunities: KeywordOpportunity[] = [];
  
  if (!category) return opportunities;

  const provider = getProvider("dataforseo");

  try {
    // Get keywords for category
    const categoryKeywords = await provider.getKeywordsForCategory(category, {
      limit: 50,
      locationCode: 2840
    });

    // Filter for trending (would need historical data in production)
    // Simplified: use high volume + low difficulty as proxy
    const trending = categoryKeywords.filter(kw =>
      (kw.searchVolume || 0) >= THRESHOLDS.highVolume &&
      (kw.keywordDifficulty || 100) <= 50
    );

    for (const kw of trending.slice(0, 5)) {
      const matchedTheme = findMatchingTheme(kw.keyword, themes);
      
      if (matchedTheme) {
        opportunities.push({
          id: `opp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          keyword: kw.keyword,
          opportunityType: "trending_keyword",
          volume: kw.searchVolume || 0,
          difficulty: kw.keywordDifficulty || 0,
          cpc: kw.cpc || 0,
          urgency: "this_week",
          potentialValue: calculatePotentialValue(kw),
          matchedTheme: matchedTheme.name,
          rationale: `High volume (${kw.searchVolume}) aligned with "${matchedTheme.name}" theme`,
          detectedAt: new Date(),
          isActioned: false
        });
      }
    }
  } catch (error) {
    console.error("Error finding trending keywords:", error);
  }

  return opportunities;
}

function findSeasonalOpportunities(themes: any[]): KeywordOpportunity[] {
  const opportunities: KeywordOpportunity[] = [];
  const currentMonth = new Date().getMonth();
  
  // Simple seasonal mapping
  const seasonalKeywords: Record<number, string[]> = {
    0: ["new year", "resolution", "winter"],
    1: ["valentine", "love", "february"],
    2: ["spring", "march", "easter"],
    3: ["spring", "april", "easter"],
    4: ["mother", "may", "memorial"],
    5: ["summer", "father", "june"],
    6: ["summer", "july", "independence"],
    7: ["back to school", "august", "summer"],
    8: ["fall", "september", "labor day"],
    9: ["halloween", "october", "fall"],
    10: ["thanksgiving", "november", "black friday"],
    11: ["christmas", "holiday", "winter", "gift"]
  };

  const upcomingMonth = (currentMonth + 1) % 12;
  const upcomingSeasonalTerms = seasonalKeywords[upcomingMonth] || [];

  for (const theme of themes) {
    const themeKeywords = theme.keywords || [];
    for (const keyword of themeKeywords) {
      const isSeasonalMatch = upcomingSeasonalTerms.some(term => 
        keyword.toLowerCase().includes(term)
      );
      
      if (isSeasonalMatch) {
        opportunities.push({
          id: `opp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          keyword,
          opportunityType: "seasonal_upcoming",
          volume: 0, // Would need to fetch
          difficulty: 0,
          cpc: 0,
          urgency: "this_month",
          potentialValue: 500, // Estimated
          matchedTheme: theme.name,
          rationale: `Seasonal opportunity - peak demand coming next month`,
          detectedAt: new Date(),
          isActioned: false
        });
      }
    }
  }

  return opportunities;
}

function findMatchingTheme(keyword: string, themes: any[]): any | null {
  const keywordLower = keyword.toLowerCase();
  
  for (const theme of themes) {
    // Check theme name
    if (keywordLower.includes(theme.name?.toLowerCase() || "")) {
      return theme;
    }
    
    // Check theme keywords
    const themeKeywords = theme.keywords || [];
    for (const tk of themeKeywords) {
      if (keywordLower.includes(tk.toLowerCase()) || tk.toLowerCase().includes(keywordLower)) {
        return theme;
      }
    }
  }
  
  return null;
}

function calculateUrgency(kw: any): OpportunityUrgency {
  const difficulty = kw.keywordDifficulty || 50;
  const volume = kw.searchVolume || 0;
  
  // Low difficulty + high volume = act now
  if (difficulty <= 20 && volume >= 500) return "act_now";
  if (difficulty <= 30 && volume >= 300) return "this_week";
  return "this_month";
}

function calculatePotentialValue(kw: any): number {
  const volume = kw.searchVolume || 0;
  const cpc = kw.cpc || 0.5;
  const ctr = 0.03; // Estimated CTR for position 5
  
  return Math.round(volume * ctr * cpc * 12); // Annual value
}
```

---

## API Routes

```typescript
// server/routes.ts - Agregar

import { scanKeywordOpportunities } from "./modules/keyword-opportunity-alerts";

// GET /api/keyword-opportunities/:configurationId
app.get("/api/keyword-opportunities/:configurationId", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const configurationId = Number(req.params.configurationId);
    const config = await storage.getConfigurationById(configurationId, userId);
    
    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    const opportunities = await scanKeywordOpportunities(config);
    res.json(opportunities);
  } catch (error) {
    console.error("Error scanning opportunities:", error);
    res.status(500).json({ error: "Failed to scan opportunities" });
  }
});

// POST /api/keyword-opportunities/:id/action
app.post("/api/keyword-opportunities/:id/action", requireAuth, async (req, res) => {
  try {
    // Mark opportunity as actioned
    const { id } = req.params;
    // Would save to database
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark as actioned" });
  }
});
```

---

## UI Component

```tsx
// client/src/components/keyword-alerts/OpportunityAlerts.tsx

import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, TrendingUp, Target, Calendar, DollarSign } from "lucide-react";

interface Props {
  configurationId: number;
}

export function OpportunityAlerts({ configurationId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["keyword-opportunities", configurationId],
    queryFn: async () => {
      const res = await fetch(`/api/keyword-opportunities/${configurationId}`);
      return res.json();
    }
  });

  if (isLoading) return <div>Scanning for opportunities...</div>;

  const urgencyColors = {
    act_now: "bg-red-100 text-red-800 border-red-200",
    this_week: "bg-yellow-100 text-yellow-800 border-yellow-200",
    this_month: "bg-blue-100 text-blue-800 border-blue-200"
  };

  const typeIcons = {
    trending_keyword: <TrendingUp className="h-4 w-4" />,
    low_difficulty_gap: <Target className="h-4 w-4" />,
    seasonal_upcoming: <Calendar className="h-4 w-4" />,
    competitor_dropped: <Zap className="h-4 w-4" />,
    new_in_category: <Zap className="h-4 w-4" />
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Keyword Opportunities
          </span>
          <div className="flex items-center gap-2 text-sm font-normal">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span className="text-green-600">
              ${data?.totalPotentialValue?.toLocaleString() || 0} potential
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className={`p-3 rounded-lg border ${urgencyColors.act_now}`}>
            <div className="text-2xl font-bold">{data?.actNowCount || 0}</div>
            <div className="text-xs">Act Now</div>
          </div>
          <div className={`p-3 rounded-lg border ${urgencyColors.this_week}`}>
            <div className="text-2xl font-bold">{data?.thisWeekCount || 0}</div>
            <div className="text-xs">This Week</div>
          </div>
          <div className={`p-3 rounded-lg border ${urgencyColors.this_month}`}>
            <div className="text-2xl font-bold">{data?.thisMonthCount || 0}</div>
            <div className="text-xs">This Month</div>
          </div>
        </div>

        {/* Opportunities List */}
        <div className="space-y-3">
          {data?.opportunities?.map((opp: any) => (
            <div 
              key={opp.id}
              className="p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {typeIcons[opp.opportunityType]}
                  </div>
                  <div>
                    <div className="font-medium">{opp.keyword}</div>
                    <div className="text-sm text-gray-600">{opp.rationale}</div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Vol: {opp.volume.toLocaleString()}</span>
                      <span>KD: {opp.difficulty}</span>
                      <span>Value: ${opp.potentialValue}</span>
                      {opp.matchedTheme && (
                        <Badge variant="outline" className="text-xs">
                          {opp.matchedTheme}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={urgencyColors[opp.urgency]}>
                    {opp.urgency.replace("_", " ")}
                  </Badge>
                  <Button size="sm" variant="outline">
                    Take Action
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Testing Checklist

- [ ] Unit tests para findLowDifficultyGaps
- [ ] Unit tests para calculateUrgency
- [ ] Unit tests para findMatchingTheme
- [ ] Integration tests para API endpoint
