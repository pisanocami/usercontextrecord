---
description: Master workflow for Brand Intelligence Gap Remediation (all 6 gaps)
---

# Brand Intelligence Gap Remediation - Master Workflow

This document provides an overview of all identified gaps from the Compliance & Gap Analysis Report and links to their individual remediation workflows.

## Current Status: ~85% Compliance with Honeywell Reference

---

## High Priority Gaps

### Gap 1: Competitor Size Attributes
**File:** `/gap1-competitor-size-attributes.md`
**Problem:** Missing "Funding Stage" visual prominence for "Public" status
**Effort:** Small (2-3 hours)
**Files to modify:**
- `client/src/components/blocks/competitor-set-block.tsx`

### Gap 2: Exclusion Match Types
**File:** `/gap2-exclusion-match-types.md`
**Problem:** UI uses simple tags instead of Exact/Semantic match type selector
**Effort:** Medium (4-6 hours)
**Files to modify:**
- `client/src/components/blocks/fence-block.tsx`

### Gap 3: Evidence Pack Details
**File:** `/gap3-evidence-pack-details.md`
**Problem:** Limited evidence display, missing granular SERP%/Size% data points
**Effort:** Medium (4-6 hours)
**Files to modify:**
- `client/src/components/blocks/competitor-set-block.tsx`

---

## Low Priority Gaps

### Gap 4: Regeneration History UI
**File:** `/gap4-regeneration-history-ui.md`
**Problem:** Regeneration tracking not prominently displayed
**Effort:** Small (2-3 hours)
**Files to modify:**
- `client/src/components/blocks/governance-footer.tsx`
- `client/src/components/notion/governance-rail.tsx`
- New: `client/src/components/blocks/regeneration-tracker.tsx`

### Gap 5: Channel Context Summary Cards
**File:** `/gap5-channel-context-summary-cards.md`
**Problem:** Missing Notion-like summary cards for channel context
**Effort:** Small (2-3 hours)
**Files to modify:**
- `client/src/components/blocks/channel-context-block.tsx`
- New: `client/src/components/blocks/channel-summary-cards.tsx`

### Gap 6: Audit Log Visibility
**File:** `/gap6-audit-log-visibility.md`
**Problem:** Audit log exists in schema but not rendered in UI
**Effort:** Medium (4-6 hours)
**Files to modify:**
- `client/src/components/blocks/fence-block.tsx`
- New: `client/src/components/blocks/audit-log-panel.tsx`
- New: `client/src/lib/audit-utils.ts`

---

## Recommended Implementation Order

1. **Gap 1** - Quick win, improves competitor data visibility
2. **Gap 2** - Core functionality for exclusion precision
3. **Gap 3** - Enhances competitor evidence quality
4. **Gap 6** - Adds audit trail for compliance
5. **Gap 4** - Improves AI governance visibility
6. **Gap 5** - Polish/UX improvement

---

## Schema Status

All gaps have **existing schema support**. No database migrations required.

| Gap | Schema Field | Status |
|-----|--------------|--------|
| 1 | `competitorEntrySchema.funding_stage` | ✅ Exists |
| 2 | `exclusionEntrySchema.match_type` | ✅ Exists |
| 3 | `competitorEvidenceSchema` | ✅ Exists |
| 4 | `aiBehaviorContractSchema.regeneration_*` | ✅ Exists |
| 5 | `channelContextSchema` | ✅ Exists |
| 6 | `negativeScopeSchema.audit_log` | ✅ Exists |

---

## Testing Checklist

After implementing all gaps:

- [ ] Competitor with "Public" funding stage shows distinct badge
- [ ] Exclusions can be set to Exact or Semantic match
- [ ] Competitor evidence shows SERP%, Size%, Similarity% cards
- [ ] Regeneration count visible with progress bar
- [ ] Channel context shows summary cards
- [ ] Audit log visible and filterable in Fence block
- [ ] All data persists correctly on save
- [ ] No console errors
- [ ] Mobile responsive

---

## Estimated Total Effort

| Priority | Gaps | Hours |
|----------|------|-------|
| High | 1, 2, 3 | 10-15 |
| Low | 4, 5, 6 | 8-12 |
| **Total** | **6** | **18-27** |

---

## Post-Implementation

After completing all gaps:

1. Update Compliance Report to reflect new status
2. Run full E2E test suite
3. Update SYSTEM_DOCUMENTATION.md with new features
4. Consider creating user-facing changelog

**Target Compliance:** 95%+
