---
description: Fix Gap 3 - Confusing multi-selection UX with clear visual feedback
---

# Gap 3: Selection UX Improvement

## Problem
Users don't know how many contexts they can select or have selected.

## Steps

1. Create SelectionCounter component
- Create `client/src/components/ui/selection-counter.tsx`
- Show current/max selection count
- Visual progress indicator

2. Update configurations-list.tsx
- Add SelectionCounter to the comparison toolbar
- Improve visual feedback on selected cards
- Add tooltips explaining the limit

3. Update context-comparison.tsx
- Add SelectionCounter in header
- Show empty state with instructions

## Files to Modify
- `client/src/components/ui/selection-counter.tsx` (create)
- `client/src/pages/configurations-list.tsx`
- `client/src/pages/context-comparison.tsx`

## Success Criteria
- Users see X/4 counter at all times
- Selected cards have clear visual distinction
- Tooltip explains the 4-context limit
