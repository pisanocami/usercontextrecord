---
description: Phase 2 - UI Components for comparison view
---

# Context Comparison Tool - Phase 2: UI Components

## Overview
Create all React components needed for the comparison view.

## Steps

### 1. Create ContextSelector component
Create `client/src/components/comparison/ContextSelector.tsx`:
- Multi-select dropdown for contexts
- Search/filter functionality
- Selected contexts display with remove option
- "Compare" button that enables when 2+ selected
- Max 4 contexts limit

### 2. Create ComparisonHeader component
Create `client/src/components/comparison/ComparisonHeader.tsx`:
- Context cards in a row
- Shows: name, domain, industry, CMO-safe badge
- Validation status indicator
- Remove from comparison button

### 3. Create SectionComparisonCard component
Create `client/src/components/comparison/SectionComparisonCard.tsx`:
- Collapsible section card
- Section icon and title
- Overall match percentage badge
- Contains FieldComparisonRow components

### 4. Create FieldComparisonRow component
Create `client/src/components/comparison/FieldComparisonRow.tsx`:
- Field label on left
- Values for each context in columns
- Diff highlighting based on matchType
- Support for arrays and nested values

### 5. Create DiffHighlight component
Create `client/src/components/comparison/DiffHighlight.tsx`:
- Color-coded highlighting
- Green = full match
- Yellow = partial match
- Red = no match
- Blue = unique value

### 6. Create OverlapMatrix component
Create `client/src/components/comparison/OverlapMatrix.tsx`:
- Matrix table for competitor overlap
- Rows = all competitors across contexts
- Columns = each context
- Dot indicators for presence

### 7. Create InsightsPanel component
Create `client/src/components/comparison/InsightsPanel.tsx`:
- List of generated insights
- Icon by type (warning, success, info, opportunity)
- Collapsible panel
- Priority sorting

### 8. Create ComparisonToolbar component
Create `client/src/components/comparison/ComparisonToolbar.tsx`:
- Section filter dropdown
- View mode toggle (full/diff-only)
- Export buttons (PDF, CSV)
- Share button (future)

### 9. Create main ComparisonView component
Create `client/src/components/comparison/ComparisonView.tsx`:
- Orchestrates all sub-components
- Uses comparison hook
- Responsive layout
- Loading and error states

### 10. Create index export
Create `client/src/components/comparison/index.ts`

## Validation
- All components render without errors
- Props are properly typed
- Responsive design works on desktop
