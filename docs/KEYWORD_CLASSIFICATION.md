# Keyword Classification System

## Overview

This document explains how the FON (Force of Nature) platform classifies keywords into three dispositions: **Top Opportunities (PASS)**, **Needs Review (REVIEW)**, and **Out of Play (OUT_OF_PLAY)**.

The classification follows a strict **CMO-Safe Gate Order** to ensure auditability and explainability for Fortune 500 marketing executives.

---

## The Three Dispositions

| Disposition | Icon | Meaning | Action Required |
|-------------|------|---------|-----------------|
| **PASS** (Top Opportunities) | ✓ | High-value keywords aligned with brand capability and category | Prioritize for SEO/content investment |
| **REVIEW** (Needs Review) | ? | Medium potential but requires human validation | Analyst review before action |
| **OUT_OF_PLAY** | ✗ | Not suitable due to exclusions, low fit, or off-category | Exclude from campaigns |

---

## CMO-Safe Gate Order

Keywords are evaluated through a series of "gates" in a specific order. **Early gates take precedence** - if a keyword fails a hard gate, it's immediately classified as OUT_OF_PLAY without checking subsequent gates.

```
┌─────────────────────────────────────────────────────────────────┐
│                    KEYWORD EVALUATION FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────┐                       │
│  │ GATE G: Negative Scope (HARD GATE)   │ ◄── Runs FIRST        │
│  │ - Excluded keywords/categories        │                       │
│  │ - Competitor brand terms              │                       │
│  │ - Irrelevant entities                 │                       │
│  └──────────────┬───────────────────────┘                       │
│                 │                                                │
│         Match? ─┼─► YES ──► OUT_OF_PLAY (exit immediately)      │
│                 │                                                │
│                 ▼ NO                                             │
│  ┌──────────────────────────────────────┐                       │
│  │ GATE B: Category Fence (SOFT GATE)   │                       │
│  │ - Check if keyword is in-scope       │                       │
│  │ - Mark flag if outside fence         │                       │
│  └──────────────┬───────────────────────┘                       │
│                 │                                                │
│                 ▼                                                │
│  ┌──────────────────────────────────────┐                       │
│  │ GATE H: Scoring (THRESHOLDS)         │                       │
│  │ - Calculate capability score         │                       │
│  │ - Apply boosters/penalties           │                       │
│  │ - Compare against thresholds         │                       │
│  └──────────────┬───────────────────────┘                       │
│                 │                                                │
│                 ▼                                                │
│  ┌──────────────────────────────────────┐                       │
│  │ GATE E/F: Strategic/Channel          │                       │
│  │ - Risk tolerance adjustments         │                       │
│  │ - SEO investment level context       │                       │
│  └──────────────┬───────────────────────┘                       │
│                 │                                                │
│                 ▼                                                │
│           FINAL DISPOSITION                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Gate Details

### Gate G: Negative Scope (Hard Gate)

**Purpose:** Immediately exclude keywords that violate brand safety or are definitively out of scope.

**UCR Section Used:** G (Negative Scope)

**Rules Applied:**

| Rule ID | Description | Result |
|---------|-------------|--------|
| `negative_scope.hard_gate` | Matches excluded keywords, categories, or use cases | OUT_OF_PLAY |
| `negative_scope.competitor_brand` | Contains competitor brand name | OUT_OF_PLAY |
| `negative_scope.irrelevant_entity` | Contains sports teams, celebrities, colleges | OUT_OF_PLAY |

**Example Exclusions:**
- Keywords matching items in `excluded_keywords[]`
- Keywords matching items in `excluded_categories[]`
- Keywords containing competitor domains (e.g., "nike shoes" for Adidas)
- Keywords mentioning sports teams ("bulldogs running shoes")

---

### Gate B: Category Fence (Soft Gate)

**Purpose:** Flag keywords that may be outside the brand's category definition for review.

**UCR Section Used:** B (Category Definition)

**Behavior:**
- If keyword matches category terms → In-fence (continues evaluation)
- If keyword doesn't match → Flagged as `outside_fence` (may still PASS with high capability)

**In-Scope Concepts Checked:**
- `category_definition.primary_category`
- `category_definition.approved_categories[]`
- `category_definition.included[]`
- `demand_definition.brand_keywords.seed_terms[]`
- `demand_definition.non_brand_keywords.category_terms[]`
- `demand_definition.non_brand_keywords.problem_terms[]`

---

### Gate H: Scoring (Thresholds)

**Purpose:** Calculate a capability score and apply threshold-based classification.

**UCR Section Used:** H (Governance/Scoring)

#### Capability Score Calculation

The capability score (0.0 - 1.0) is calculated as:

```
base_score (default: 0.5)
  + Σ(booster.weight) for matching booster patterns
  + Σ(penalty.weight) for matching penalty patterns
  - 0.6 if contains competitor brand
```

#### Thresholds by Vertical

| Vertical Preset | Pass Threshold | Review Threshold |
|-----------------|----------------|------------------|
| **Default** | 0.60 | 0.30 |
| DTC Footwear | 0.55 | 0.30 |
| Retail Big Box | 0.65 | 0.35 |
| B2B SaaS | 0.50 | 0.25 |

#### Classification Logic

```
IF capabilityScore < review_threshold → OUT_OF_PLAY
IF capabilityScore >= pass_threshold → PASS
IF capabilityScore between thresholds → REVIEW
```

#### Special Scoring Rules

| Rule ID | Condition | Result |
|---------|-----------|--------|
| `scoring.variant_filter` | Intent type is "variant_or_size" (e.g., "size 10 shoes") | OUT_OF_PLAY |
| `scoring.capability_threshold` | Score below review threshold | OUT_OF_PLAY |

---

### Gate E/F: Strategic/Channel (Prioritization)

**Purpose:** Adjust disposition based on strategic posture and channel context.

**UCR Sections Used:** E (Strategic Intent), F (Channel Context)

#### Strategic Adjustments

| Condition | Effect |
|-----------|--------|
| `risk_tolerance = "low"` + `outside_fence` | Force to REVIEW |
| `risk_tolerance = "high"` | More lenient toward borderline keywords |

#### Channel Context Logging

The system logs SEO investment level for audit purposes but doesn't alter disposition.

---

## Opportunity Score Calculation

Beyond disposition, each keyword receives an **Opportunity Score** for ranking:

```
opportunityScore = searchVolume 
                   × cpc 
                   × intentWeight 
                   × capabilityScore 
                   × difficultyFactor 
                   × positionFactor
```

### Intent Type Weights

| Intent Type | Weight | Description |
|-------------|--------|-------------|
| `category_capture` | 1.0 | Core category terms |
| `problem_solution` | 1.0 | Problem-oriented searches |
| `product_generic` | 0.7 | Generic product searches |
| `brand_capture` | 0.2 | Brand-related terms |
| `variant_or_size` | 0.0 | Size/variant queries |
| `other` | 0.1 | Unclassified |

### Difficulty Factor

Based on keyword difficulty (0-100):
```
difficultyFactor = 1 - (difficulty_weight × (1 - (1 - KD/100)))
```

### Position Factor

Based on best competitor position:
```
Position 1-3:   rawFactor = 0.6 (harder to displace)
Position 4-10:  rawFactor = 1.0 (optimal opportunity)
Position 11-20: rawFactor = 0.8 (moderate opportunity)
Position 20+:   rawFactor = 0.5 (low priority)
```

---

## Item-Level Traces (Explainability)

Every keyword carries an array of **ItemTrace** objects documenting each rule applied:

```typescript
interface ItemTrace {
  ruleId: string;      // e.g., "negative_scope.hard_gate"
  ucrSection: UCRSectionID;  // "A" through "H"
  reason: string;      // Human-readable explanation
  severity: Severity;  // "low" | "medium" | "high" | "critical"
  evidence?: string;   // The matching pattern or score
}
```

### Severity Levels

| Severity | Meaning |
|----------|---------|
| `critical` | Hard exclusion applied (no override possible) |
| `high` | Strong rule match (override requires justification) |
| `medium` | Moderate concern flagged |
| `low` | Informational trace |

---

## Configuration Examples

### High-Confidence PASS

```json
{
  "keyword": "running shoes for flat feet",
  "disposition": "PASS",
  "capabilityScore": 0.85,
  "trace": [
    {
      "ruleId": "category_fence.in_scope",
      "ucrSection": "B",
      "reason": "Matches: running shoes",
      "severity": "low"
    },
    {
      "ruleId": "scoring.capability_evaluated",
      "ucrSection": "H",
      "reason": "Capability score: 0.85",
      "severity": "low"
    },
    {
      "ruleId": "disposition.pass",
      "ucrSection": "H",
      "reason": "High capability match",
      "severity": "low"
    }
  ]
}
```

### Needs Review (Outside Fence)

```json
{
  "keyword": "yoga mat cleaning spray",
  "disposition": "REVIEW",
  "capabilityScore": 0.45,
  "trace": [
    {
      "ruleId": "category_fence.soft_gate",
      "ucrSection": "B",
      "reason": "Outside category fence - needs review",
      "severity": "medium"
    },
    {
      "ruleId": "disposition.review",
      "ucrSection": "H",
      "reason": "Medium capability - outside fence",
      "severity": "medium"
    }
  ]
}
```

### Out of Play (Hard Exclusion)

```json
{
  "keyword": "nike air max",
  "disposition": "OUT_OF_PLAY",
  "capabilityScore": 0.0,
  "trace": [
    {
      "ruleId": "negative_scope.competitor_brand",
      "ucrSection": "G",
      "reason": "Competitor brand term",
      "severity": "critical",
      "evidence": "nike air max"
    }
  ]
}
```

---

## Summary

| Gate | Section | Type | Effect |
|------|---------|------|--------|
| G (Negative Scope) | G | Hard | Immediate OUT_OF_PLAY on match |
| B (Category Fence) | B | Soft | Flag for review if outside |
| H (Scoring) | H | Threshold | Score-based classification |
| E/F (Strategic/Channel) | E, F | Adjustment | Posture-based refinement |

The system ensures:
1. **Brand Safety** - Hard exclusions run first
2. **Relevance** - Category fence checks alignment
3. **Capability Fit** - Scoring reflects true opportunity
4. **CMO Auditability** - Every decision is traced and explainable
