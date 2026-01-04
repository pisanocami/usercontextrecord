---
description: Fix Gap 1 - Competitor Size Attributes (Funding Stage visual prominence)
---

# Gap 1: Competitor Size Attributes - Funding Stage Visual Prominence

## Problem
The UI/Schema handles "Revenue Range" and "Employee Count" but missing "Funding Stage" validation logic or visual prominence for "Public" status as seen in Honeywell reference (GE Aerospace/RTX).

## Affected Files
- `client/src/components/blocks/competitor-set-block.tsx` - Main competitor UI
- `shared/schema.ts` - Schema already has `funding_stage` field

## Current State
- Schema has `funding_stage: z.enum(["bootstrap", "seed", "series_a", "series_b", "series_c_plus", "public", "unknown"])`
- UI shows `revenue_range` and `employee_count` but NOT `funding_stage`
- No visual distinction for "Public" companies

## Implementation Steps

### Step 1: Add Funding Stage Badge to CompetitorRow
In `competitor-set-block.tsx`, locate the expanded section (around line 156-172) and add funding stage display:

```tsx
// After employee_count display, add:
{competitor.funding_stage && competitor.funding_stage !== "unknown" && (
  <Badge 
    variant={competitor.funding_stage === "public" ? "default" : "secondary"}
    className={cn(
      "text-xs",
      competitor.funding_stage === "public" && "bg-blue-600 text-white"
    )}
  >
    {competitor.funding_stage === "public" ? "PUBLIC" : competitor.funding_stage.replace("_", " ").toUpperCase()}
  </Badge>
)}
```

### Step 2: Add Funding Stage to Add Competitor Dialog
In the dialog (around line 447-471), add a funding stage selector:

```tsx
<div>
  <label className="text-sm font-medium">Funding Stage</label>
  <Select
    value={newCompetitor.funding_stage || "unknown"}
    onValueChange={(v) => setNewCompetitor(prev => ({ ...prev, funding_stage: v as any }))}
  >
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="unknown">Unknown</SelectItem>
      <SelectItem value="bootstrap">Bootstrap</SelectItem>
      <SelectItem value="seed">Seed</SelectItem>
      <SelectItem value="series_a">Series A</SelectItem>
      <SelectItem value="series_b">Series B</SelectItem>
      <SelectItem value="series_c_plus">Series C+</SelectItem>
      <SelectItem value="public">Public</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### Step 3: Update newCompetitor State
Update the state initialization to include funding_stage:

```tsx
const [newCompetitor, setNewCompetitor] = useState({ 
  name: "", 
  tier: "tier1" as const,
  funding_stage: "unknown" as const 
});
```

### Step 4: Add Size Mismatch Warning for Public vs Non-Public
Add validation logic to flag when comparing a startup against a public company:

```tsx
const hasFundingStageMismatch = (
  competitor.funding_stage === "public" && 
  brandFundingStage !== "public"
) || (
  competitor.funding_stage !== "public" && 
  brandFundingStage === "public"
);
```

## Testing
1. Add a competitor with funding_stage = "public"
2. Verify PUBLIC badge appears with blue styling
3. Verify funding stage selector works in Add dialog
4. Verify size mismatch warning appears for public/non-public comparisons

## Acceptance Criteria
- [ ] Funding stage visible in expanded competitor row
- [ ] "PUBLIC" badge has distinct visual styling (blue)
- [ ] Funding stage selectable when adding competitors manually
- [ ] Size mismatch warning considers funding stage
