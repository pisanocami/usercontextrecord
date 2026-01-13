---
description: Phase 1C - Strategic metrics replacing generic similarity scores
---

# Phase 1C: Strategic Metrics Scorecard

## Objective
Replace "Overall Similarity: 16%" with meaningful strategic metrics that inform CMO decisions.

## Steps

### Step 1: Define new metrics in types.ts
Add `StrategicMetrics` interface:
```typescript
interface StrategicMetrics {
  competitiveIntensity: MetricScore;    // How much fighting for same customer
  strategicAlignment: MetricScore;       // How similar go-to-market approaches
  marketAdjacency: MetricScore;          // How close target markets are
  threatProbability: MetricScore;        // Likelihood of direct competition
}

interface MetricScore {
  score: number;           // 0-100
  label: string;           // "Low", "Medium", "High", "Critical"
  reasoning: string[];     // Bullet points explaining score
  keyFactors: string[];    // Main contributing factors
}
```

### Step 2: Create calculate-strategic-metrics.ts
New file with functions:
- `calculateCompetitiveIntensity()`: Based on shared competitors, keyword overlap, geographic overlap
- `calculateStrategicAlignment()`: Based on business model, risk tolerance, channel strategy
- `calculateMarketAdjacency()`: Based on category overlap, target market similarity, use case overlap
- `calculateThreatProbability()`: Composite score predicting future competition

### Step 3: Update compare-contexts.ts
- Import and call strategic metrics calculation
- Add `strategicMetrics` to `ComparisonResult`
- Remove or deprecate `overallSimilarity`

### Step 4: Create StrategicScorecard component
New component at `client/src/components/comparison/StrategicScorecard.tsx`:
- Visual progress bars for each metric
- Color coding (green/yellow/orange/red)
- Expandable reasoning for each score
- Key factors highlighted

### Step 5: Update ComparisonView
- Replace "Overlap Metrics" section with StrategicScorecard
- Position prominently in the UI
- Add tooltip explanations for each metric

### Step 6: Update ComparisonHeader
- Show threat level badge on each context card
- Add quick summary of relationship type

## Testing
1. Compare Hoka vs Oofos
2. Verify Competitive Intensity ~35% (shared retailers, low keyword overlap)
3. Verify Strategic Alignment ~55% (both DTC, similar risk)
4. Verify Market Adjacency ~75% (same geography, adjacent categories)
5. Verify Threat Probability ~15% (low category overlap)

## Success Criteria
- 4 strategic metrics displayed prominently
- Each metric has reasoning visible
- No "Overall Similarity" percentage shown
- Metrics make strategic sense
