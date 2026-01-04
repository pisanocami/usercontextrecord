# Remediation Plan: Fixing Gaps in Brand Intelligence Configuration

This plan outlines the steps required to achieve 100% parity with the "Honeywell International" reference specification.

## Phase 1: Enhanced Exclusion UI (Negative Scope)
**Gap**: Exclusion match types (Exact vs Semantic) are supported in schema but missing in UI.

1.  **Modify `NegativeScopeSection`**:
    *   Replace simple `TagInput` with a table-based list for categories, keywords, and use cases.
    *   Add a toggle/dropdown for "Match Type" (Exact/Semantic).
    *   Add a "Reason" field for manual exclusions as seen in Honeywell.
2.  **Logic Update**:
    *   Ensure the `exclusionEntrySchema` is fully utilized when saving.
    *   Implement "Semantic Sensitivity" selection for semantic matches.

## Phase 2: Competitor Attribute Completion
**Gap**: Missing "Funding Stage" and "Public" status visibility.

1.  **Update `CompetitorRow`**:
    *   Add "Funding Stage" badge (Public, Series C+, etc.).
    *   Add a distinct visual marker for "Public" companies.
2.  **Evidence Deep-Dive**:
    *   Expand the competitor details to show specific "SERP Overlap %" and "Size Proximity %" as distinct badges or data points.
    *   Add "Geography Overlap" list to the competitor details view.

## Phase 3: Governance & Audit Visibility
**Gap**: Regeneration tracking and audit logs are not visible.

1.  **Enhance `GovernanceSection`**:
    *   Add a "Regeneration Tracker" (e.g., "0 / 1 used").
    *   Implement an "Audit Log" viewer within the Negative Scope or Governance section to show exclusion history.
2.  **Interactive Quality Score**:
    *   Make the "Quality Breakdown" clickable. For example, clicking "33% Evidence Coverage" should highlight competitors that need evidence.

## Phase 4: Workflow & Notion-like Polish
**Gap**: Sidebar density and summary card visibility.

1.  **Summary Cards**:
    *   Add high-level summary cards for "Channel Context" and "Strategic Intent" in a dashboard view.
2.  **Navigation**:
    *   Group sidebar items under "Core Identity", "Intelligence", and "Guardrails" to reduce density.

---
**Estimated Effort**: 2-3 days of focused frontend development.
**Target Compliance**: 100%
