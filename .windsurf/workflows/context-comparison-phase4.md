---
description: Phase 4 - Integration with context list (multi-select)
---

# Context Comparison Tool - Phase 4: List Integration

## Overview
Add multi-select functionality to the configurations list page.

## Steps

### 1. Add selection state to ConfigurationsList
Modify `client/src/pages/configurations-list.tsx`:
- Add selectedIds state (Set<number>)
- Add isSelectionMode state
- Add toggle selection mode button

### 2. Add checkboxes to ConfigurationCard
Modify ConfigurationCard component:
- Add checkbox when in selection mode
- Highlight selected cards
- Disable expand when selecting

### 3. Add floating comparison bar
Add floating action bar at bottom:
- Shows when 2+ contexts selected
- Displays count of selected
- "Compare Selected" button
- "Clear Selection" button
- Navigates to /compare?ids=x,y,z

### 4. Add quick compare action
Add "Add to Compare" button to card actions:
- Adds context to comparison selection
- Shows toast confirmation
- Badge showing comparison count

### 5. Mobile support
Ensure selection works on mobile:
- Long-press to enter selection mode
- Tap to toggle selection
- Bottom sheet for actions

## Validation
- Can select multiple contexts
- Compare button navigates correctly
- Selection persists during scroll
- Mobile gestures work
