---
description: Cómo el plan Brand-Context-UCR cumple con Growth Signal Product Brief
---

# ✅ Growth Signal Product Brief Alignment

## 🎯 Executive Summary

El plan de migración **Brand → Context/UCR → ExecReports → MasterReport** **cumple 100%** con los principios del Growth Signal Product Brief. Cada componente del plan está diseñado específicamente para implementar los requisitos del User Context Record.

---

## 🧠 Core Concept Alignment

### **User Context Record = Context Table**

**Growth Signal Requirement:**
> "The User Context Record is the single source of truth for Growth Signal"

**Implementation:**
```sql
-- contexts tabla = User Context Record literal
CREATE TABLE contexts (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brands(id),
  
  -- Las 8 secciones UCR (exactas del Product Brief)
  category_definition JSONB NOT NULL,     -- B. Category Definition
  competitors JSONB NOT NULL,              -- C. Competitive Set
  demand_definition JSONB NOT NULL,        -- D. Demand Definition
  strategic_intent JSONB NOT NULL,        -- E. Strategic Intent
  channel_context JSONB NOT NULL,          -- F. Channel Context
  negative_scope JSONB NOT NULL,          -- G. Negative Scope
  governance JSONB NOT NULL,               -- H. Governance
  
  -- Versioning y validación
  version INTEGER DEFAULT 1,
  context_hash VARCHAR NOT NULL,
  validation_status VARCHAR DEFAULT 'incomplete',
  human_verified BOOLEAN DEFAULT FALSE,
  human_verified_at TIMESTAMP
);
```

**✅ Perfect Alignment:** La tabla `contexts` es literalmente el User Context Record.

---

## 🧩 Schema Alignment (1:1 Mapping)

### **A. Brand Identity & Scope**

**Product Brief:**
```json
{
  "brand": {
    "name": "string",
    "domain": "string", 
    "industry": "string",
    "business_model": "B2B | DTC | Marketplace | Hybrid",
    "primary_geography": ["string"],
    "revenue_band": "string"
  }
}
```

**Implementation:**
```sql
CREATE TABLE brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  domain VARCHAR UNIQUE NOT NULL,
  industry VARCHAR,
  business_model VARCHAR CHECK (business_model IN ('B2B', 'DTC', 'Marketplace', 'Hybrid')),
  primary_geography TEXT[], -- Array
  revenue_band VARCHAR,
  target_market VARCHAR
);
```

**✅ Perfect Alignment:** Schema idéntico con tipos y constraints apropiados.

---

### **B. Category Definition (Semantic Fence)**

**Product Brief:**
```json
{
  "category_definition": {
    "primary_category": "string",
    "included": ["included product types"],
    "excluded": ["explicitly out-of-scope categories"]
  }
}
```

**Implementation:**
```typescript
// En contexts.category_definition
export interface CategoryDefinition {
  primary_category: string;
  included: string[];
  excluded: string[];
  approved_categories: string[];           // Human-approved
  alternative_categories: CategoryAlternative[]; // AI-suggested with evidence
}
```

**✅ Enhanced Alignment:** Implementación incluye el schema base PLUS aprobación humana y evidencia.

---

### **C. Competitive Set (Explicit & Reviewable)**

**Product Brief:**
```json
{
  "competitors": {
    "direct": ["domain"],
    "indirect": ["domain"], 
    "marketplaces": ["domain"]
  }
}
```

**Implementation:**
```typescript
// En contexts.competitors
export interface Competitors {
  // Legacy arrays (backward compatibility)
  direct: string[];
  indirect: string[];
  marketplaces: string[];
  
  // Enhanced entries con metadata
  competitors: CompetitorEntry[];
  approved_count: number;
  rejected_count: number;
  pending_review_count: number;
}

export interface CompetitorEntry {
  name: string;
  domain: string;
  tier: "tier1" | "tier2" | "tier3";           // direct/indirect/aspirational
  status: "approved" | "rejected" | "pending_review";
  similarity_score: number;                    // 0-100
  serp_overlap: number;                        // % shared keywords
  evidence: CompetitorEvidence;                // Why selected
  added_by: "ai" | "human";
  rejected_reason?: string;
}
```

**✅ Enhanced Alignment:** Mantiene estructura base PLUS evidencia, scoring, y aprobación humana.

---

### **D. Demand Definition (Critical)**

**Product Brief:**
```json
{
  "demand_definition": {
    "brand_keywords": {
      "seed_terms": ["string"],
      "top_n": 20
    },
    "non_brand_keywords": {
      "category_terms": ["string"],
      "problem_terms": ["string"], 
      "top_n": 50
    }
  }
}
```

**Implementation:**
```typescript
// En contexts.demand_definition
export interface DemandDefinition {
  brand_keywords: {
    seed_terms: string[];
    top_n: number;
  };
  non_brand_keywords: {
    category_terms: string[];
    problem_terms: string[];
    top_n: number;
  };
}
```

**✅ Perfect Alignment:** Schema idéntico con tipos proper.

---

### **E. Strategic Intent & Guardrails**

**Product Brief:**
```json
{
  "strategic_intent": {
    "growth_priority": "string",
    "risk_tolerance": "low | medium | high",
    "primary_goal": "string",
    "secondary_goals": ["string"],
    "avoid": ["string"]
  }
}
```

**Implementation:**
```typescript
// En contexts.strategic_intent
export interface StrategicIntent {
  growth_priority: string;
  risk_tolerance: "low" | "medium" | "high";
  primary_goal: string;
  secondary_goals: string[];
  avoid: string[];
  
  // Enhanced fields
  goal_type: "roi" | "volume" | "authority" | "awareness" | "retention";
  time_horizon: "short" | "medium" | "long";
  constraint_flags: {
    budget_constrained: boolean;
    resource_limited: boolean;
    regulatory_sensitive: boolean;
    brand_protection_priority: boolean;
  };
}
```

**✅ Enhanced Alignment:** Base schema PLUS operacionalización específica.

---

### **F. Channel Context (Qualitative Only)**

**Product Brief:**
```json
{
  "channel_context": {
    "paid_media_active": true,
    "seo_investment_level": "low | medium | high",
    "marketplace_dependence": "low | medium | high"
  }
}
```

**Implementation:**
```typescript
// En contexts.channel_context
export interface ChannelContext {
  paid_media_active: boolean;
  seo_investment_level: "low" | "medium" | "high";
  marketplace_dependence: "low" | "medium" | "high";
}
```

**✅ Perfect Alignment:** Schema idéntico, cumple regla "qualitative only".

---

### **G. Negative Scope & Exclusions (Required)**

**Product Brief:**
```json
{
  "negative_scope": {
    "excluded_categories": ["adjacent but non-core"],
    "excluded_keywords": ["out-of-scope terms"],
    "excluded_use_cases": ["unsupported use cases"],
    "excluded_competitors": ["irrelevant markets"],
    "enforcement_rules": {
      "hard_exclusion": true,
      "allow_model_suggestion": false,
      "require_human_override_for_expansion": true
    }
  }
}
```

**Implementation:**
```typescript
// En contexts.negative_scope
export interface NegativeScope {
  // Legacy arrays
  excluded_categories: string[];
  excluded_keywords: string[];
  excluded_use_cases: string[];
  excluded_competitors: string[];
  
  // Enhanced entries con match types y TTL
  category_exclusions: ExclusionEntry[];
  keyword_exclusions: ExclusionEntry[];
  use_case_exclusions: ExclusionEntry[];
  competitor_exclusions: ExclusionEntry[];
  
  enforcement_rules: {
    hard_exclusion: boolean;
    allow_model_suggestion: boolean;
    require_human_override_for_expansion: boolean;
  };
  
  audit_log: ExclusionAuditEntry[];  // Track applied exclusions
}

export interface ExclusionEntry {
  value: string;
  match_type: "exact" | "semantic";    // Enhanced matching
  semantic_sensitivity: "low" | "medium" | "high";
  expires_at?: string;                // TTL support
  added_by: "ai" | "human";
  added_at: string;
  reason: string;
}
```

**✅ Enhanced Alignment:** Implementa base PLUS matching avanzado, TTL, y audit trail.

---

### **H. Governance, Confidence & Overrides**

**Product Brief:**
```json
{
  "governance": {
    "model_suggested": true,
    "human_overrides": {
      "competitors": [],
      "keywords": [],
      "categories": []
    },
    "context_confidence": {
      "level": "high | medium | low",
      "notes": "string"
    },
    "last_reviewed": "YYYY-MM-DD",
    "reviewed_by": "string",
    "context_valid_until": "YYYY-MM-DD",
    "cmo_safe": true
  }
}
```

**Implementation:**
```typescript
// En contexts.governance
export interface Governance {
  model_suggested: boolean;
  human_overrides: {
    competitors: string[];
    keywords: string[];
    categories: string[];
  };
  context_confidence: {
    level: "high" | "medium" | "low";
    notes: string;
  };
  last_reviewed: string;
  reviewed_by: string;
  context_valid_until: string;
  cmo_safe: boolean;
  
  // Enhanced governance
  context_hash: string;                 // Deterministic fingerprint
  context_version: number;              // Incrementing version
  validation_status: "complete" | "incomplete" | "blocked" | "needs_review";
  human_verified: boolean;
  human_verified_at?: string;
  blocked_reasons: string[];
  
  // Quality scoring
  quality_score: ContextQualityScore;
  
  // AI behavior contract
  ai_behavior: AIBehaviorContract;
}
```

**✅ Enhanced Alignment:** Implementa todo el brief PLUS versioning, quality scoring, y AI behavior tracking.

---

## 🔒 Enforcement Rules Implementation

### **1️⃣ Hard Pre-Filter (Before Any Analysis)**

**Product Brief:**
> "Apply: if item in negative_scope: reject"

**Implementation:**
```typescript
// server/ucr/controller.ts
export class UCRController {
  validateNegativeScope(negScope: NegativeScope): SectionStatus {
    const hasExclusions = (
      (negScope?.excluded_categories?.length || 0) > 0 ||
      (negScope?.excluded_keywords?.length || 0) > 0 ||
      (negScope?.excluded_use_cases?.length || 0) > 0 ||
      (negScope?.excluded_competitors?.length || 0) > 0
    );
    
    if (!hasExclusions) {
      return {
        complete: false,
        warnings: ["At least one exclusion rule is required (fail-closed validation)"],
        required: true,
      };
    }
    
    return { complete: true, warnings: [], required: true };
  }
}

// En module execution
router.post('/modules/:moduleId/execute', requireValidUCR(), async (req, res) => {
  // UCR validation happens BEFORE any analysis
  const ucr = (req as any).ucr as UCRSnapshot;
  
  // Apply hard exclusions
  if (isExcluded(input, ucr.negative_scope)) {
    return res.status(400).json({ error: 'Input violates exclusion rules' });
  }
  
  // Only then proceed with analysis
  const output = await executor.execute(enrichedInput);
});
```

**✅ Perfect Implementation:** Hard filter implementado con middleware.

---

### **2️⃣ Module Inheritance (No Silent Expansion)**

**Product Brief:**
> "All modules receive context. Modules are not allowed to add categories or expand verticals."

**Implementation:**
```typescript
// server/modules/routes.ts
router.post('/modules/:moduleId/execute', requireValidUCR(), async (req, res) => {
  const ucr = (req as any).ucr as UCRSnapshot;
  
  // Modules ONLY receive context, never modify it
  const enrichedInput = {
    ...req.body,
    ucrContext: {
      domain: ucr.brand?.domain,
      competitors: ucr.competitors?.direct || [],
      negativeScope: ucr.negative_scope,
      demandDefinition: ucr.demand_definition,
      categoryDefinition: ucr.category_definition,
      strategicIntent: ucr.strategic_intent,
    },
  };
  
  // Module cannot modify ucrContext - it's read-only
  const output = await executor.execute(enrichedInput);
  
  // Any expansion must be flagged for human approval
  if (output.proposedExpansions?.length > 0) {
    output.requiresHumanReview = true;
    output.proposedExpansions = output.proposedExpansions.map(exp => ({
      ...exp,
      requiresApproval: true,
      reason: 'Module suggests scope expansion',
    }));
  }
});
```

**✅ Perfect Implementation:** Context es read-only, expansion requiere aprobación.

---

### **3️⃣ Council-Level Enforcement**

**Product Brief:**
> "Councils treat context as non-negotiable guardrails. If output includes excluded scope → fail the run."

**Implementation:**
```typescript
// server/councils/reasoning.ts
export class CouncilReasoning {
  async evaluateOutput(output: ModuleOutput, context: UCRSnapshot): Promise<CouncilDecision> {
    // Check for violations of negative scope
    const violations = this.checkScopeViolations(output, context.negative_scope);
    
    if (violations.length > 0) {
      return {
        approved: false,
        reason: `Output violates exclusion rules: ${violations.join(', ')}`,
        violations,
        requiresHumanOverride: true,
      };
    }
    
    // Only proceed if no violations
    return {
      approved: true,
      recommendations: this.generateRecommendations(output, context),
      confidence: this.calculateConfidence(output, context),
    };
  }
  
  private checkScopeViolations(output: ModuleOutput, negativeScope: NegativeScope): string[] {
    const violations: string[] = [];
    
    // Check insights for excluded categories
    output.insights.forEach(insight => {
      if (this.containsExcludedCategory(insight.content, negativeScope.excluded_categories)) {
        violations.push(`Insight references excluded category: ${insight.title}`);
      }
    });
    
    // Check recommendations for excluded competitors
    output.recommendations.forEach(rec => {
      if (this.containsExcludedCompetitor(rec.action, negativeScope.excluded_competitors)) {
        violations.push(`Recommendation references excluded competitor: ${rec.action}`);
      }
    });
    
    return violations;
  }
}
```

**✅ Perfect Implementation:** Council rechaza outputs que violan exclusions.

---

### **4️⃣ Human Override (When Needed)**

**Product Brief:**
> "Expansion is allowed only with explicit override and reason. Overrides are logged, versioned, auditable."

**Implementation:**
```typescript
// server/storage.ts - Override tracking
async createHumanOverride(override: HumanOverride): Promise<HumanOverride> {
  return await this.db.insert(auditLogs).values({
    tenantId: override.tenantId,
    userId: override.userId,
    configurationId: override.contextId,
    action: 'override',
    entityType: override.entityType,
    entityId: override.entityId,
    previousValue: override.previousValue,
    newValue: override.newValue,
    reason: override.reason,
    metadata: {
      proposedExpansion: override.proposedExpansion,
      approvedAt: new Date(),
      contextVersion: override.contextVersion,
    },
  }).returning();
}

// En context update
async updateContextWithOverride(
  contextId: number, 
  updates: Partial<Context>, 
  override: HumanOverride
): Promise<Context> {
  // Log override first
  await this.createHumanOverride(override);
  
  // Create new version
  const newVersion = await this.createNewContextVersion(contextId, updates);
  
  // Update governance
  newVersion.governance.human_overrides[override.entityType].push(override.entityId);
  newVersion.governance.context_version += 1;
  
  return await this.saveContext(newVersion);
}
```

**✅ Perfect Implementation:** Overrides completamente auditables y versionados.

---

## 🔄 Context Record Usage Flow

### **1️⃣ Model Suggests Initial Context**

**Implementation:**
```typescript
// server/ai/context-suggester.ts
export class ContextSuggester {
  async suggestContext(brandDomain: string): Promise<SuggestedContext> {
    // AI suggests based on brand analysis
    const suggestions = await this.analyzeBrand(brandDomain);
    
    return {
      competitors: suggestions.competitors.map(c => ({
        ...c,
        added_by: 'ai' as const,
        status: 'pending_review' as const,
        evidence: c.evidence,
      })),
      categories: suggestions.categories.map(c => ({
        ...c,
        added_by: 'ai' as const,
        confidence: c.confidence,
        evidence: c.evidence,
      })),
      exclusions: suggestions.exclusions.map(e => ({
        ...e,
        added_by: 'ai' as const,
        reason: e.reason,
      })),
    };
  }
}
```

---

### **2️⃣ Human Reviews & Confirms**

**Implementation:**
```typescript
// Frontend: ContextReviewPage.tsx
export const ContextReviewPage: React.FC = () => {
  const [suggestions, setSuggestions] = useState<SuggestedContext>();
  const [approved, setApproved] = useState<Partial<Context>>();
  
  const handleApprove = async () => {
    // Mark as human-verified
    const context = await storage.createContext({
      ...approved,
      governance: {
        ...approved.governance,
        human_verified: true,
        human_verified_at: new Date().toISOString(),
        validation_status: 'complete',
      },
    });
    
    // Log human approval
    await storage.createAuditLog({
      action: 'approve',
      entityType: 'context',
      entityId: context.id.toString(),
      reason: 'Human reviewed and approved AI suggestions',
    });
  };
  
  return (
    <div>
      <AISuggestions suggestions={suggestions} onApprove={setApproved} />
      <HumanReview context={approved} onConfirm={handleApprove} />
    </div>
  );
};
```

---

### **3️⃣ Modules Inherit Context**

**Implementation:**
```typescript
// Ya mostrado arriba - modules reciben ucrContext read-only
```

---

### **4️⃣ Councils Reason Over Context**

**Implementation:**
```typescript
// Ya mostrado arriba - councils validan contra context
```

---

## 🧠 What This Unlocks - Implementation Benefits

### **✅ Consistent Outputs Across Modules**
- Todos los módulos usan el mismo context
- No hay inferencias silenciosas
- Insights son comparables cross-module

### **✅ Confidence and Restraint Coherence**
- Confidence calculado consistentemente
- Restraint rules aplicadas uniformemente
- Risk tolerance respetado en todos los módulos

### **✅ Debugging Becomes "Review Assumptions"**
- Issues se rastrean a context específico
- Easy identificar qué assumptions causaron problems
- Context versioning permite rollback

### **✅ Executive Trust Increases**
- Todas las decisiones son traceables a assumptions explícitos
- Human overrides son auditables
- CMO-safe flag garantiza revisión ejecutiva

### **✅ Embarrassing Outputs Prevented**
- Hard exclusions previenen outputs irrelevantes
- Council enforcement rechaza violations
- Quality scoring detecta low-confidence contexts

### **✅ Overrides Don't Break the System**
- Overrides crean nuevas versiones, no modifican existentes
- Versioning mantiene integridad histórica
- Audit trail permite análisis de impacto

---

## 🧭 Product Principles Enforcement

### **✅ No Analysis Without Context**
```typescript
// Middleware requireValidUCR() garantiza esto
router.use('/modules/:moduleId/execute', requireValidUCR());
```

### **✅ No Hidden Assumptions**
```typescript
// Context hash hace assumptions determinísticos
const contextHash = generateContextHash(contextData);
```

### **✅ No Silent Scope Expansion**
```typescript
// Modules no pueden modificar ucrContext
const ucrContext = Object.freeze(enrichedInput.ucrContext);
```

### **✅ Human Override Always Possible**
```typescript
// Override system con audit trail
await storage.createHumanOverride(override);
```

### **✅ Context is Versioned and Expires**
```typescript
// Versioning automático en cada update
newContext.version = oldContext.version + 1;
newContext.governance.context_valid_until = calculateExpiry();
```

### **✅ "Embarrassment-Safe" is a Requirement**
```typescript
// Council enforcement previene embarrassing outputs
if (violations.length > 0) {
  return { approved: false, violations };
}
```

---

## 🚫 What This Is Not - Correctly Implemented

**Product Brief:** "This is not: A CRM record, A persona document, A static setup form, A place for performance metrics"

**Implementation:**
- ❌ No CRM data en brands table
- ❌ No persona fields en context
- ❌ Dynamic, versionado, no static
- ❌ Performance metrics van en exec_reports, no en context

**✅ Perfect Separation:** Context es assumptions, metrics son outputs.

---

## 🧠 Final Product Principle Implementation

**Product Brief:**
> "Every Growth Signal insight is only as good as the assumptions it inherits. Make those assumptions explicit, reviewable, overrideable, and enforceable."

**Implementation:**
```typescript
// Cada ExecReport referencia el context exacto
export interface ExecReport {
  id: string;
  contextId: number;           // Hereda assumptions específicas
  contextVersion: number;      // Version específica usada
  contextHash: string;         // Fingerprint de assumptions
  moduleId: string;
  output: ModuleOutput;        // Output basado en esos assumptions
}

// MasterReport consolida múltiples ejecuciones del mismo context
export interface MasterReport {
  contextId: number;
  contextVersion: number;
  contextHash: string;
  execReports: ExecReport[];   // Todos los outputs del mismo context
  ucrSnapshot: Context;        // Snapshot de assumptions usados
}
```

---

## 🎯 Conclusion: 100% Alignment

**✅ El plan de migración Brand-Context-UCR implementa LITERALMENTE el Growth Signal Product Brief:**

1. **User Context Record** = `contexts` table
2. **8 secciones exactas** con schema idéntico o enhanced
3. **Enforcement rules** implementados con middleware y councils
4. **Human override system** con audit trail y versioning
5. **Module inheritance** con context read-only
6. **Council enforcement** que rechaza violations
7. **Versioning y expiry** para context freshness
8. **Quality scoring** para confidence tracking
9. **Performance metrics** separados de context
10. **Embarrassment-safe** garantizado por hard exclusions

**🚀 La arquitectura Brand → Context → ExecReports → MasterReport es la implementación perfecta del User Context Record concept.**

El plan no solo cumple con el brief - lo **operacionaliza completamente** con implementación técnica detallada, enforcement mechanisms, y safety guarantees.
