---
description: Phase 2 - CMO Dashboard with Competitive Battlefield Map
---

# Phase 2: CMO Strategic Dashboard

## Objective
Create a visual strategic dashboard that shows competitive battlefield, keyword battleground, and strategic recommendations at a glance.

## Steps

### Step 1: Create CompetitiveBattlefieldMap component
New component at `client/src/components/comparison/CompetitiveBattlefieldMap.tsx`:
- Three-column layout: Brand A Territory | Contested | Brand B Territory
- Show unique strengths for each brand
- Highlight shared battlegrounds (retailers, markets, keywords)
- Visual indicators for territory ownership

### Step 2: Create KeywordBattleground component
New component at `client/src/components/comparison/KeywordBattleground.tsx`:
- Show keywords each brand "owns"
- Show contested keywords
- Show opportunity keywords (neither owns)
- Color-coded by ownership

### Step 3: Create StrategicRecommendations component
New component at `client/src/components/comparison/StrategicRecommendations.tsx`:
- Two-column layout: recommendations for each brand
- Numbered action items
- Priority indicators
- "Generate Strategy Brief" button

### Step 4: Create CMODashboardView component
New component at `client/src/components/comparison/CMODashboardView.tsx`:
- Header with brand comparison summary
- Strategic Scorecard (from Phase 1C)
- Competitive Battlefield Map
- Keyword Battleground
- Strategic Recommendations
- Insights Panel (from Phase 1B)

### Step 5: Add view toggle to ComparisonView
- Toggle between "Detailed View" (current) and "CMO Dashboard"
- Default to CMO Dashboard
- Persist preference in localStorage

### Step 6: Create RelationshipBadge component
New component showing relationship type:
- "Direct Competitors"
- "Indirect Competitors"
- "Adjacent Markets"
- "Unrelated"
Based on strategic metrics

### Step 7: Add export functionality
- "Export Strategy Brief" button
- Generates markdown summary
- Includes all insights and recommendations
- Downloadable as .md file

## Testing
1. Compare Hoka vs Oofos
2. Verify CMO Dashboard loads by default
3. Verify Battlefield Map shows correct territories
4. Verify Keyword Battleground is populated
5. Verify Strategic Recommendations are relevant
6. Test export functionality
7. Toggle between views

## Success Criteria
- CMO Dashboard is default view
- All components render without errors
- Export generates valid markdown
- View toggle works correctly
- Dashboard provides immediate strategic value
