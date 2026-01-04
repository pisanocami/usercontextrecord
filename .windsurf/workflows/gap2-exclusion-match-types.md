---
description: Fix Gap 2 - Exclusion Match Types (Exact vs Semantic UI)
---

# Gap 2: Exclusion Match Types - Exact vs Semantic UI

## Problem
Honeywell reference shows "Exact" vs "Semantic" match types for exclusions. The current implementation uses simple string arrays in the UI, even though the schema supports `exclusionEntrySchema` with `match_type`.

## Affected Files
- `client/src/components/blocks/fence-block.tsx` - Fence/Negative Scope UI
- `shared/schema.ts` - Schema already supports match_type

## Current State
- Schema has `exclusionEntrySchema` with `match_type: z.enum(["exact", "semantic"])`
- UI only shows simple tags with X button
- No way to toggle between Exact/Semantic match
- `semantic_sensitivity` field exists but not exposed

## Implementation Steps

### Step 1: Create Enhanced ExclusionChip Component
Replace the simple `ExclusionChip` with a more detailed version:

```tsx
function ExclusionChip({ 
  entry, 
  onRemove,
  onToggleMatchType 
}: { 
  entry: ExclusionEntry; 
  onRemove: () => void;
  onToggleMatchType: () => void;
}) {
  const isExact = entry.match_type === "exact";
  
  return (
    <div className="group relative inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm
      text-red-700 border-red-300 bg-red-50 dark:text-red-300 dark:border-red-700 dark:bg-red-950/50">
      <Ban className="h-3 w-3" />
      <span>{entry.value}</span>
      
      {/* Match Type Toggle */}
      <button
        type="button"
        onClick={onToggleMatchType}
        className={cn(
          "ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
          isExact 
            ? "bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200" 
            : "bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200"
        )}
        title={isExact ? "Exact match - click to change to Semantic" : "Semantic match - click to change to Exact"}
      >
        {isExact ? "EXACT" : "~SEM"}
      </button>
      
      <button 
        type="button"
        onClick={onRemove}
        className="ml-0.5 hover:text-red-900 dark:hover:text-red-100"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
```

### Step 2: Add Match Type Toggle to ExclusionSection
Update the `ExclusionSection` component to handle match type changes:

```tsx
const handleToggleMatchType = (index: number) => {
  const entry = fields[index] as ExclusionEntry;
  const newMatchType = entry.match_type === "exact" ? "semantic" : "exact";
  
  update(index, {
    ...entry,
    match_type: newMatchType,
    semantic_sensitivity: newMatchType === "semantic" ? "medium" : "medium"
  });
};
```

### Step 3: Add Match Type Selector for New Entries
Add a dropdown when adding new exclusions:

```tsx
const [newMatchType, setNewMatchType] = useState<"exact" | "semantic">("exact");

// In the add input area:
<div className="flex items-center gap-1">
  <Input
    value={newValue}
    onChange={(e) => setNewValue(e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder={placeholder}
    className="h-7 w-32 text-sm border-dashed border-red-300"
  />
  <Select value={newMatchType} onValueChange={(v: "exact" | "semantic") => setNewMatchType(v)}>
    <SelectTrigger className="h-7 w-20 text-xs">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="exact">Exact</SelectItem>
      <SelectItem value="semantic">Semantic</SelectItem>
    </SelectContent>
  </Select>
  <Button type="button" size="icon" variant="ghost" onClick={handleAdd}>
    <Plus className="h-4 w-4" />
  </Button>
</div>
```

### Step 4: Update handleAdd to Use Match Type

```tsx
const handleAdd = () => {
  if (!newValue.trim()) return;
  
  const newEntry: ExclusionEntry = {
    value: newValue.trim(),
    match_type: newMatchType,
    semantic_sensitivity: newMatchType === "semantic" ? "medium" : "medium",
    added_by: "human",
    added_at: new Date().toISOString(),
    reason: "",
  };
  
  append(newEntry);
  setNewValue("");
};
```

### Step 5: Add Semantic Sensitivity Tooltip (Optional Enhancement)
For semantic matches, show sensitivity level on hover:

```tsx
{!isExact && entry.semantic_sensitivity && (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="text-[10px] text-purple-600">
        ({entry.semantic_sensitivity})
      </span>
    </TooltipTrigger>
    <TooltipContent>
      Semantic sensitivity: {entry.semantic_sensitivity}
    </TooltipContent>
  </Tooltip>
)}
```

## Required Imports
Add to fence-block.tsx:
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
```

## Testing
1. Add an exclusion with "Exact" match type
2. Add an exclusion with "Semantic" match type
3. Toggle match type on existing exclusion
4. Verify visual distinction between Exact (red) and Semantic (purple)
5. Verify data persists correctly on save

## Acceptance Criteria
- [ ] Match type visible on each exclusion chip
- [ ] Can toggle match type by clicking the badge
- [ ] Can select match type when adding new exclusions
- [ ] Visual distinction between Exact and Semantic matches
- [ ] Data correctly saved to enhanced exclusion arrays
