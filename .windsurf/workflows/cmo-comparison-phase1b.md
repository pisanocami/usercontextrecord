---
description: Phase 1B - Rewrite insights to be CMO-actionable
---

# Phase 1B: Actionable CMO Insights Engine

## Objective
Transform generic insights into strategic, actionable recommendations that a CMO can immediately act upon.

## Steps

### Step 1: Update insight types in types.ts
Add new insight properties:
- `actionItems`: string[] (specific actions to take)
- `estimatedImpact`: "low" | "medium" | "high" | "critical"
- `category`: "threat" | "opportunity" | "positioning" | "resource"
- `forBrand`: string (which brand this insight applies to)
- `metric`: { value: number, label: string } (quantifiable metric if available)

### Step 2: Rewrite generate-insights.ts
Replace generic insights with CMO-grade insights:
- `generateThreatInsights()`: Competitive threats and defensive actions
- `generateOpportunityInsights()`: Market gaps and expansion opportunities
- `generatePositioningInsights()`: Differentiation and narrative recommendations
- `generateResourceInsights()`: Investment and allocation recommendations

### Step 3: Create insight templates
Define templates for each insight type:
- Title format: "[CATEGORY]: [SPECIFIC FINDING]"
- Description: Strategic context
- Action items: 3-4 specific next steps
- Impact estimation with reasoning

### Step 4: Update InsightsPanel component
- Group insights by category (Threats, Opportunities, Positioning, Resources)
- Show action items as checklist
- Add "Export to Strategy Brief" button
- Add impact badges with color coding
- Show which brand each insight applies to

### Step 5: Add insight prioritization
- Sort by estimated impact
- Highlight critical insights
- Add "Dismiss" functionality
- Track dismissed insights in session

## Testing
1. Compare Hoka vs Oofos contexts
2. Verify insights are actionable (have specific action items)
3. Verify insights are categorized correctly
4. Verify impact estimation makes sense
5. Test dismiss functionality

## Success Criteria
- Every insight has 2+ action items
- Insights grouped by strategic category
- Impact estimation visible
- No generic "Low Alignment" messages
