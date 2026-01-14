---
description: Fix Gap 1 - UCR Selection not working in comparison page
---

# Gap 1: UCR Selection Fix

## Problem
The Select component in `context-comparison.tsx` doesn't allow users to select UCRs for comparison.

## Steps

1. Read the current implementation
// turbo
```bash
cat client/src/pages/context-comparison.tsx
```

2. Create a more robust context selector component
- Create `client/src/components/comparison/ContextSelector.tsx`
- Use DropdownMenu instead of Select for better event handling
- Add proper loading and error states

3. Update context-comparison.tsx to use the new selector
- Replace the inline Select with ContextSelector
- Add proper error handling for the query
- Add loading states

4. Test the fix
// turbo
```bash
npm run test -- --grep "ContextSelector"
```

## Files to Modify
- `client/src/pages/context-comparison.tsx`
- `client/src/components/comparison/ContextSelector.tsx` (create)

## Success Criteria
- Users can select UCRs from the dropdown
- Selected UCRs appear as badges
- Maximum 4 UCRs can be selected
- Clear visual feedback on selection
