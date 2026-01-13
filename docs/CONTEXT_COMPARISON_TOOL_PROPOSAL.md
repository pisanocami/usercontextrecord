# Context Comparison Tool - Technical Proposal

**Document Version:** 1.0  
**Date:** January 13, 2026  
**Author:** Product & Engineering Team  
**Status:** Draft Proposal

---

## Executive Summary

This document proposes a **Context Comparison Tool** that enables users to quickly compare multiple User Context Records (UCRs) side-by-side, identifying differences, similarities, and strategic gaps across brand intelligence contexts. This tool addresses a critical workflow gap: users currently cannot efficiently analyze how different contexts differ in their competitive positioning, strategic intent, or market definitions.

---

## 1. Problem Statement

### Current State
- Users manage multiple brand contexts in a list view
- Each context must be expanded individually to view details
- No mechanism exists to compare contexts side-by-side
- Strategic decisions requiring cross-context analysis are time-consuming
- Identifying patterns or inconsistencies across contexts requires manual effort

### User Pain Points
1. **Time-consuming analysis**: Comparing 2+ contexts requires opening multiple tabs or memorizing details
2. **No visual diff**: Changes between context versions or similar brands are not highlighted
3. **Pattern blindness**: Hard to spot strategic inconsistencies across a portfolio
4. **Decision paralysis**: Without comparison, prioritization decisions lack data support

### Target Users
- **Brand Strategists**: Need to ensure consistency across brand portfolio
- **CMOs**: Require quick executive-level comparison for approval workflows
- **SEO Managers**: Must identify keyword/competitor overlaps across contexts
- **Analysts**: Need to audit and validate context quality at scale

---

## 2. Proposed Solution

### 2.1 Context Comparison Tool Overview

A dedicated comparison view that allows users to:
1. **Select 2-4 contexts** for side-by-side comparison
2. **Choose comparison mode**: Full comparison, Section-focused, or Diff-only
3. **Visualize differences** with color-coded highlights
4. **Export comparison reports** for stakeholder review

### 2.2 Key Features

#### Feature 1: Multi-Select Context Picker
- Checkbox selection in the context list
- "Compare Selected" button appears when 2+ contexts selected
- Quick-select by brand, industry, or validation status

#### Feature 2: Side-by-Side Comparison View
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Context Comparison Tool                                    [Export] [×]│
├─────────────────────────────────────────────────────────────────────────┤
│  Section Filter: [All Sections ▼]    View Mode: [Side-by-Side ▼]        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │   Context A     │  │   Context B     │  │   Context C     │         │
│  │   Nike          │  │   Adidas        │  │   Puma          │         │
│  │   ✓ CMO Safe    │  │   ⚠ Needs Review│  │   ✓ CMO Safe    │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                         │
│  ┌─ Brand Context ──────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  Industry        Footwear         Footwear         Footwear      │  │
│  │                  ════════         ════════         ════════      │  │
│  │                                                                   │  │
│  │  Business Model  DTC              Hybrid           DTC           │  │
│  │                  ═══              ══════           ═══           │  │
│  │                  [DIFF]                            [SAME AS A]   │  │
│  │                                                                   │  │
│  │  Geography       [US, EU]         [US, EU, APAC]  [EU, LATAM]   │  │
│  │                                   ══════════════   ═══════════   │  │
│  │                                   [+APAC]          [DIFF]        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ Competitive Set ────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  Direct          Adidas, Puma     Nike, Puma       Nike, Adidas  │  │
│  │  Competitors     New Balance      New Balance      Reebok        │  │
│  │                  ═══════════      ═══════════      ══════════    │  │
│  │                                                                   │  │
│  │  [Overlap Matrix]                                                │  │
│  │  ┌──────────┬───────┬────────┬───────┐                          │  │
│  │  │          │ Nike  │ Adidas │ Puma  │                          │  │
│  │  ├──────────┼───────┼────────┼───────┤                          │  │
│  │  │ Adidas   │  ●    │   -    │  ●    │                          │  │
│  │  │ Puma     │  ●    │   ●    │   -   │                          │  │
│  │  │ NewBal   │  ●    │   ●    │   ○   │                          │  │
│  │  │ Reebok   │  ○    │   ○    │   ●   │                          │  │
│  │  └──────────┴───────┴────────┴───────┘                          │  │
│  │  ● = Listed as competitor  ○ = Not listed                       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Feature 3: Section-Focused Comparison
Users can drill into specific sections:
- **Brand Context**: Compare identity, geography, business model
- **Category Definition**: Compare included/excluded categories, semantic extensions
- **Competitive Set**: Overlap matrix, tier distribution, evidence comparison
- **Demand Definition**: Keyword overlap, seed term analysis
- **Strategic Intent**: Goal alignment, risk tolerance comparison
- **Channel Context**: Investment level comparison
- **Negative Scope**: Exclusion overlap, enforcement rules
- **Governance**: Validation status, quality scores, CMO-safe status

#### Feature 4: Diff Highlighting
- **Green highlight**: Values that match across all contexts
- **Yellow highlight**: Partial matches (some contexts match)
- **Red highlight**: Unique values (no overlap)
- **Blue highlight**: Values only in one context

#### Feature 5: Comparison Insights Panel
Automated insights generated from comparison:
```
┌─ Comparison Insights ───────────────────────────────────────────────┐
│                                                                      │
│  ⚠️  STRATEGIC MISALIGNMENT DETECTED                                │
│      Nike and Puma have different risk tolerances (high vs low)     │
│                                                                      │
│  ✓  COMPETITOR CONSISTENCY                                          │
│      All 3 contexts list "New Balance" as direct competitor         │
│                                                                      │
│  📊 COVERAGE GAP                                                    │
│      Only Adidas targets APAC region - potential expansion opp?     │
│                                                                      │
│  🔄 KEYWORD OVERLAP: 67%                                            │
│      23 shared category terms across all contexts                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### Feature 6: Export & Share
- **PDF Export**: Formatted comparison report
- **CSV Export**: Raw data for further analysis
- **Share Link**: Shareable comparison view (read-only)
- **Notion Export**: Formatted for Notion integration

---

## 3. Technical Architecture

### 3.1 Data Model

No new database tables required. Comparison is computed client-side from existing configuration data.

```typescript
// New types for comparison feature
interface ComparisonSession {
  id: string;
  contextIds: number[];
  createdAt: string;
  userId: string;
  settings: ComparisonSettings;
}

interface ComparisonSettings {
  mode: 'full' | 'section' | 'diff-only';
  sections: SectionKey[];
  highlightMode: 'all' | 'differences' | 'matches';
  showInsights: boolean;
}

type SectionKey = 
  | 'brand'
  | 'category_definition'
  | 'competitors'
  | 'demand_definition'
  | 'strategic_intent'
  | 'channel_context'
  | 'negative_scope'
  | 'governance';

interface ComparisonResult {
  sections: Record<SectionKey, SectionComparison>;
  insights: ComparisonInsight[];
  overlapMetrics: OverlapMetrics;
}

interface SectionComparison {
  fields: FieldComparison[];
  overallMatch: number; // 0-100 percentage
}

interface FieldComparison {
  fieldName: string;
  values: { contextId: number; value: any }[];
  matchType: 'full' | 'partial' | 'none' | 'unique';
  diffDetails?: string;
}

interface ComparisonInsight {
  type: 'warning' | 'success' | 'info' | 'opportunity';
  title: string;
  description: string;
  affectedContexts: number[];
  section: SectionKey;
  priority: 'high' | 'medium' | 'low';
}

interface OverlapMetrics {
  competitorOverlap: number;
  keywordOverlap: number;
  categoryOverlap: number;
  geographyOverlap: number;
  overallSimilarity: number;
}
```

### 3.2 Component Architecture

```
src/
├── pages/
│   └── context-comparison.tsx          # Main comparison page
├── components/
│   └── comparison/
│       ├── ComparisonView.tsx          # Main container
│       ├── ContextSelector.tsx         # Multi-select picker
│       ├── ComparisonHeader.tsx        # Context cards header
│       ├── SectionComparisonCard.tsx   # Individual section comparison
│       ├── FieldComparisonRow.tsx      # Single field comparison
│       ├── OverlapMatrix.tsx           # Competitor/keyword matrix
│       ├── InsightsPanel.tsx           # Automated insights
│       ├── ComparisonToolbar.tsx       # Filters and export
│       └── DiffHighlight.tsx           # Diff highlighting component
├── hooks/
│   └── use-comparison.ts               # Comparison logic hook
├── lib/
│   └── comparison/
│       ├── compare-contexts.ts         # Core comparison algorithm
│       ├── generate-insights.ts        # Insight generation
│       ├── calculate-overlap.ts        # Overlap metrics
│       └── export-comparison.ts        # Export utilities
```

### 3.3 API Endpoints

```typescript
// No new backend endpoints required for MVP
// All comparison logic runs client-side

// Future enhancement: Save comparison sessions
POST /api/comparisons
GET /api/comparisons/:id
DELETE /api/comparisons/:id

// Future enhancement: AI-powered insights
POST /api/ai/comparison-insights
{
  contextIds: number[];
  focusAreas?: string[];
}
```

### 3.4 Comparison Algorithm

```typescript
// Core comparison function
function compareContexts(contexts: Configuration[]): ComparisonResult {
  const sections: Record<SectionKey, SectionComparison> = {};
  
  for (const sectionKey of SECTION_KEYS) {
    sections[sectionKey] = compareSection(
      contexts.map(c => c[sectionKey]),
      SECTION_DEFINITIONS[sectionKey]
    );
  }
  
  const insights = generateInsights(contexts, sections);
  const overlapMetrics = calculateOverlapMetrics(contexts);
  
  return { sections, insights, overlapMetrics };
}

function compareSection(
  sectionData: any[],
  definition: SectionDefinition
): SectionComparison {
  const fields: FieldComparison[] = [];
  
  for (const field of definition.fields) {
    const values = sectionData.map((data, idx) => ({
      contextId: idx,
      value: getNestedValue(data, field.key)
    }));
    
    fields.push({
      fieldName: field.label,
      values,
      matchType: determineMatchType(values),
      diffDetails: generateDiffDetails(values, field)
    });
  }
  
  const matchingFields = fields.filter(f => f.matchType === 'full').length;
  const overallMatch = (matchingFields / fields.length) * 100;
  
  return { fields, overallMatch };
}

function determineMatchType(
  values: { contextId: number; value: any }[]
): 'full' | 'partial' | 'none' | 'unique' {
  const normalized = values.map(v => normalizeValue(v.value));
  const unique = new Set(normalized.map(JSON.stringify));
  
  if (unique.size === 1) return 'full';
  if (unique.size === values.length) return 'none';
  return 'partial';
}
```

---

## 4. User Experience Design

### 4.1 Entry Points

1. **Context List Page**: Checkbox selection + "Compare" button
2. **Sidebar Navigation**: New "Compare Contexts" menu item
3. **Context Card Actions**: "Add to Comparison" quick action
4. **Keyboard Shortcut**: `Cmd/Ctrl + K` to open comparison picker

### 4.2 Comparison Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                                 │
└─────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │   Context    │     │   Select     │     │   Compare    │
  │    List      │ ──▶ │   2-4        │ ──▶ │    View      │
  │              │     │   Contexts   │     │              │
  └──────────────┘     └──────────────┘     └──────────────┘
         │                    │                    │
         │                    │                    ▼
         │                    │            ┌──────────────┐
         │                    │            │   Filter by  │
         │                    │            │   Section    │
         │                    │            └──────────────┘
         │                    │                    │
         │                    │                    ▼
         │                    │            ┌──────────────┐
         │                    │            │   View       │
         │                    │            │   Insights   │
         │                    │            └──────────────┘
         │                    │                    │
         │                    │                    ▼
         │                    │            ┌──────────────┐
         │                    │            │   Export     │
         │                    │            │   Report     │
         │                    │            └──────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
  ┌─────────────────────────────────────────────────────────┐
  │                    TAKE ACTION                           │
  │  • Edit context to align with others                    │
  │  • Approve/reject based on comparison                   │
  │  • Share comparison with stakeholders                   │
  └─────────────────────────────────────────────────────────┘
```

### 4.3 Responsive Design

- **Desktop (>1024px)**: Full side-by-side view, up to 4 contexts
- **Tablet (768-1024px)**: 2 contexts side-by-side, swipe for more
- **Mobile (<768px)**: Stacked view with section tabs, 2 context max

---

## 5. Implementation Phases

### Phase 1: MVP (2 weeks)
- [ ] Context multi-select in list view
- [ ] Basic side-by-side comparison view (2 contexts)
- [ ] Section-by-section comparison
- [ ] Basic diff highlighting (match/no-match)
- [ ] Route: `/compare?ids=1,2`

### Phase 2: Enhanced Comparison (2 weeks)
- [ ] Support for 3-4 contexts
- [ ] Overlap matrix for competitors
- [ ] Keyword overlap visualization
- [ ] Section filter dropdown
- [ ] Comparison mode toggle (full/diff-only)

### Phase 3: Insights & Export (1 week)
- [ ] Automated insight generation
- [ ] PDF export
- [ ] CSV export
- [ ] Share link functionality

### Phase 4: Advanced Features (2 weeks)
- [ ] Save comparison sessions
- [ ] AI-powered strategic recommendations
- [ ] Historical comparison (compare versions)
- [ ] Bulk comparison (portfolio analysis)

---

## 6. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Adoption Rate | 40% of users use comparison within 30 days | Analytics |
| Time Saved | 50% reduction in cross-context analysis time | User survey |
| Comparison Sessions | 3+ comparisons per active user per week | Analytics |
| Export Usage | 20% of comparisons result in export | Analytics |
| User Satisfaction | NPS > 40 for comparison feature | Survey |

---

## 7. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Performance with large contexts | High | Medium | Virtualized rendering, lazy loading |
| Complex diff visualization | Medium | High | Start with simple match/no-match, iterate |
| Mobile UX challenges | Medium | Medium | Prioritize desktop, simplified mobile view |
| Data inconsistency | Low | Low | Use same data source as list view |

---

## 8. Dependencies

- **Existing**: React Query, Tailwind CSS, Radix UI components
- **New**: None required for MVP
- **Optional**: 
  - `react-diff-viewer` for advanced diff visualization
  - `html2pdf.js` for PDF export
  - `papaparse` for CSV export

---

## 9. Open Questions

1. Should comparison sessions be persisted to database?
2. Should we support comparing contexts across different users (team feature)?
3. What's the maximum number of contexts to compare simultaneously?
4. Should AI insights be included in MVP or Phase 3?

---

## 10. Appendix

### A. Wireframe Mockups

See attached Figma link: [TBD]

### B. Competitive Analysis

| Tool | Comparison Feature | Our Advantage |
|------|-------------------|---------------|
| SEMrush | Domain comparison | Context-aware, not just metrics |
| Ahrefs | Site comparison | Strategic intent included |
| Notion | Database comparison | Purpose-built for UCR |

### C. User Research Quotes

> "I spend 30 minutes just switching between tabs to compare two brand contexts" - Brand Strategist

> "We need to ensure our portfolio brands don't cannibalize each other's keywords" - SEO Director

> "Before approving a context, I want to see how it compares to similar validated contexts" - CMO

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Tech Lead | | | |
| Design Lead | | | |
| Engineering | | | |

---

*Document generated by Brand Intelligence Platform*
