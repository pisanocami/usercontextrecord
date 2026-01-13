---
description: Phase 1 - Core comparison logic, types, and utilities
---

# Context Comparison Tool - Phase 1: Core Logic

## Overview
Create the foundational types, comparison algorithms, and utility functions.

## Steps

### 1. Create comparison types file
Create `client/src/lib/comparison/types.ts` with:
- ComparisonSession interface
- ComparisonSettings interface
- SectionKey type
- ComparisonResult interface
- SectionComparison interface
- FieldComparison interface
- ComparisonInsight interface
- OverlapMetrics interface

### 2. Create comparison algorithm
Create `client/src/lib/comparison/compare-contexts.ts` with:
- compareContexts() main function
- compareSection() for section-level comparison
- determineMatchType() for field matching
- normalizeValue() for value normalization
- getNestedValue() utility (reuse from configurations-list)

### 3. Create insight generation
Create `client/src/lib/comparison/generate-insights.ts` with:
- generateInsights() function
- Insight types: warning, success, info, opportunity
- Strategic misalignment detection
- Competitor overlap analysis
- Geography coverage gaps
- Keyword overlap calculation

### 4. Create overlap metrics calculator
Create `client/src/lib/comparison/calculate-overlap.ts` with:
- calculateOverlapMetrics() function
- Competitor overlap percentage
- Keyword overlap percentage
- Category overlap percentage
- Geography overlap percentage
- Overall similarity score

### 5. Create index export file
Create `client/src/lib/comparison/index.ts` to export all modules

## Validation
- All TypeScript types compile without errors
- Functions are properly typed
- No circular dependencies
