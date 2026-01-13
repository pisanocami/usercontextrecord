---
description: Phase 3 - Comparison page, routing, and hook
---

# Context Comparison Tool - Phase 3: Page & Routing

## Overview
Create the comparison page, custom hook, and integrate with routing.

## Steps

### 1. Create useComparison hook
Create `client/src/hooks/use-comparison.ts`:
- Accepts array of context IDs
- Fetches configurations using React Query
- Runs comparison algorithm
- Returns: contexts, comparison result, loading, error
- Memoized for performance

### 2. Create ContextComparisonPage
Create `client/src/pages/context-comparison.tsx`:
- Full page layout with header
- Uses useComparison hook
- URL params for context IDs (?ids=1,2,3)
- Empty state when no contexts selected
- Loading skeleton
- Error handling

### 3. Create ComparisonLayout wrapper
Add ComparisonLayout to `client/src/App.tsx`:
- Similar to other layouts
- Header with navigation back
- Theme toggle
- User menu

### 4. Add route to App.tsx
Add route `/compare` to the Router in App.tsx

### 5. Add sidebar navigation
Add "Compare Contexts" item to AppSidebar

## Validation
- Route /compare loads correctly
- URL params are parsed correctly
- Comparison view renders with valid context IDs
- Navigation works from sidebar
