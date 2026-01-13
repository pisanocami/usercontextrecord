---
description: Phase 1A - Hide unique fields and add comparison purpose selector
---

# Phase 1A: Smart Field Filtering & Comparison Purpose

## Objective
Transform the comparison tool from a data dump to a strategic intelligence tool by:
1. Hiding fields that are always unique (Brand Name, Domain, etc.)
2. Adding a comparison purpose selector to contextualize the analysis
3. Categorizing fields by strategic relevance

## Steps

### Step 1: Update types.ts with field categories
Add field categorization to types.ts:
- `FieldCategory`: "always_unique" | "competitive" | "strategic" | "metadata"
- Update `FieldDefinition` to include category
- Update `SECTION_DEFINITIONS` with proper categories

### Step 2: Update ComparisonSettings in types.ts
Add new settings:
- `comparisonPurpose`: "threat_analysis" | "expansion_research" | "benchmarking" | "portfolio_analysis"
- `showUniqueFields`: boolean (default false)
- `fieldCategories`: array of categories to show

### Step 3: Create ComparisonPurposeSelector component
New component at `client/src/components/comparison/ComparisonPurposeSelector.tsx`:
- Radio/card selection for comparison purpose
- Description for each purpose
- Updates settings when selected

### Step 4: Update ComparisonToolbar
- Add toggle for "Show unique fields"
- Add field category filter
- Integrate purpose selector

### Step 5: Update SectionComparisonCard
- Filter fields based on category settings
- Show/hide based on purpose relevance
- Add visual indicator for field category

### Step 6: Update compare-contexts.ts
- Add field category to comparison results
- Filter fields in compareSection based on settings

## Testing
1. Navigate to /compare with 2+ contexts
2. Verify purpose selector appears
3. Verify unique fields are hidden by default
4. Toggle "Show unique fields" and verify they appear
5. Change purpose and verify relevant fields are highlighted

## Success Criteria
- Brand Name, Domain, Context Version hidden by default
- Purpose selector visible and functional
- Field filtering works correctly
- No TypeScript errors
