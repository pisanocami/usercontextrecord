# Keyword Gap MVP - Roadmap de Mejoras

## Resumen Ejecutivo

Este documento captura el feedback del mentor y define el plan de acción para convertir el Keyword Gap en un módulo **CMO-safe** listo para demo.

---

## Diagnóstico: Por qué el output actual falla

### Problema A: No existe Semantic Fence real antes del fetch
- Los competidores grandes (Amazon, USPS, XPO) traen keywords de TODO su negocio
- El filtro por substring no corta lo semántico ni lo indirecto
- **Resultado:** El reporte es un dump, no oportunidades estratégicas

### Problema B: Competitors wrong/mismatched
- Competidores de diferentes tipos o tamaños (UPS vs OOFOs)
- La brecha existe pero no es estratégica

### Problema C: "High Priority" por heurística simplona
- Regla actual: "Competitor ranks top 10, brand missing = High Priority"
- **Inaceptable para CMO** sin: intención, categoría, in-scope, fit del negocio

### Problema D: Output ordenado alfabéticamente
- Síntoma grave: el engine de scoring no está dirigiendo la experiencia
- Orden alfabético comunica "esto no fue pensado"

---

## Plan de Fixes (Priorizado)

### Fix 1: In-Scope Classifier (CRÍTICO)
**Cada keyword debe tener:**
```json
{
  "keyword": "recovery sandals",
  "scope_status": "in_scope | borderline | out_of_scope",
  "scope_reason": "Matches recovery footwear concept",
  "matched_fence_concept": "Recovery Footwear"
}
```

**Implementación:**
- [ ] Crear función `classifyKeywordScope(keyword, fenceConcepts, excludedConcepts)`
- [ ] Retornar `scope_status`, `scope_reason`, `matched_fence_concept`
- [ ] Aplicar antes de guardar cualquier keyword como oportunidad

### Fix 2: Hard Block de Navigational/Support/Careers (CRÍTICO)
**Default NegativeScope global obligatorio:**
```javascript
const DEFAULT_BLOCKED_PATTERNS = [
  'login', 'sign in', 'signin',
  'careers', 'jobs', 'hiring', 'employment',
  'tracking number', 'track package', 'track order',
  'customer service', 'support', 'help center',
  'phone number', 'contact us', 'call us',
  'address', 'locations', 'store finder',
  'return policy', 'returns', 'refund',
  'shipping status', 'delivery status'
];
```

**Implementación:**
- [ ] Agregar `DEFAULT_BLOCKED_PATTERNS` en `server/keyword-gap-lite.ts`
- [ ] Aplicar SIEMPRE, incluso si UCR no tiene exclusions definidas
- [ ] Marcar como `blocked: "default_exclusion"`

### Fix 3: Competitor Gating (Susan-safe)
**Regla:** Si AI sugiere competidores, no pasan directo.

```javascript
if (competitor.confidence < 0.80) {
  competitor.status = 'pending_review';
} else {
  competitor.status = 'approved';
}
// Solo usar approved en análisis
```

**Implementación:**
- [ ] Agregar `confidence` y `status` a competitors en schema
- [ ] UI: mostrar badge "Needs Review" para pending
- [ ] API: filtrar solo `status === 'approved'` para ejecutar módulos

### Fix 4: Scoring Real (CRÍTICO)
**Ordenar por oportunidad, no por string.**

```javascript
const score = calculateOpportunityScore({
  intentWeight: getIntentWeight(keyword), // transactional > commercial > info
  gapSeverity: getGapSeverity(competitorRank, brandRank), // top3 + NR = fuerte
  brandFit: getBrandFit(keyword, fenceConcepts) // match con fence
});

// Score = Intent Weight × Gap Severity × Brand Fit
```

**Implementación:**
- [ ] Crear `calculateOpportunityScore()` en keyword-gap-lite.ts
- [ ] Ordenar resultados por score DESC
- [ ] Mostrar score en UI (badge o barra)

---

## Fix 5: Context Mismatch Bug (URGENTE)
**Problema:** Reportes mezclan dominios/brand names incorrectamente.

**Solución:** En cada run guardar:
```javascript
{
  ucr_id: string,
  ucr_hash: string, // deterministic fingerprint
  brand_domain_snapshot: string,
  competitors_snapshot: string[],
  generated_at: Date
}
```

**Implementación:**
- [ ] Agregar snapshot de contexto en cada ejecución de módulo
- [ ] Mostrar en frontend: "This report was generated with Context: {brand} (ucr_id=X)"
- [ ] Validar que brand_domain === domain antes de ejecutar

---

## MVP Keyword Gap Lite (CMO-Safe)

### Inputs
- Brand domain
- Competitors (3-5, solo approved)
- Context (UCR locked o draft + guardrails)

### Process
1. Fetch keywords top N por domain (competidores + brand)
2. Gap set diff
3. Filtros:
   - NegativeScope hard (default + custom)
   - Semantic Fence classifier
   - Remove nav/support/careers
4. Score básico (Intent × Gap × Fit)

### Output Format
```
| Status | Keyword | Score | Theme | Reason |
|--------|---------|-------|-------|--------|
| ✅ in_scope | recovery sandals | 87 | Product | Matches recovery footwear |
| ⚠️ borderline | foam runners | 64 | Adjacent | Similar category, review |
| ⛔ blocked | customer service | - | - | Default exclusion |
```

---

## Context Generator Checklist (Perfect Version)

### A. Core Identity (required)
- [ ] Domain
- [ ] Primary Category (canonical)
- [ ] Business Model
- [ ] Geography
- [ ] Revenue band / employee count

### B. Semantic Fence (required)
- [ ] In-scope concepts (10-30)
- [ ] Out-of-scope concepts (10-30)
- [ ] Exclusion defaults (jobs, support, tracking)

### C. Competitive Set (required)
- [ ] Direct competitors (3-8)
- [ ] Adjacent (3-8)
- [ ] Marketplaces (optional)
- [ ] Size similarity score (visible)

### D. Demand Definition (required)
- [ ] Brand seeds
- [ ] Category seeds
- [ ] Problem seeds

### E. Governance (required)
- [ ] AI confidence score per section
- [ ] Human confirmed status
- [ ] Locked snapshot
- [ ] context_hash (deterministic fingerprint)

---

## Context Council (Pre-Module Validation)

**Concepto:** Un módulo que valida el contexto antes de ejecutar otros módulos.

```javascript
// Context Council = Module (pre-module)
const contextCouncil = {
  inputs: draftUCR,
  outputs: {
    approved: boolean,
    lockedUCR: UCR | null,
    missingFields: string[],
    uncertainties: string[]
  }
};
```

**Beneficio:** Pre-flight checklist automático. No bloquea generación pero sí bloquea outputs no aprobados.

---

## UI: Layout Notion-like

### Top Bar
- Brand name + domain
- Confidence badge
- Status badge (Draft / Needs Review / Locked)
- Primary CTA: "Approve & Lock"

### Left Nav
- 8 sections
- Completion dots
- Quick jump

### Main (cada sección)
- **Header:** Title + status badge + AI confidence + buttons (Generate / Edit / Approve)
- **Body:** 5-10 fields max, "see more" para resto

### Bottom Fixed
- Save
- Last saved
- "Run Module" enabled only if locked

---

## Orden de Implementación

| Prioridad | Task | Impacto | Esfuerzo |
|-----------|------|---------|----------|
| 1 | Fix context mismatch bug (ucr_id, hash, snapshot) | Alto | Bajo |
| 2 | Add default NegativeScope global | Alto | Bajo |
| 3 | Add scope classifier (in/border/out) | Alto | Medio |
| 4 | Add scoring + ordering (no alphabetical) | Alto | Medio |
| 5 | Demo con 1 vertical real (OOFOs / recovery footwear) | Alto | Bajo |

---

## Métricas de Éxito

- **CMO-Safe:** 0 keywords embarazosos en top 20
- **Ordenamiento:** Top 5 keywords son oportunidades reales
- **Scope accuracy:** >90% de keywords "in_scope" son correctos
- **Competitor match:** Solo competidores approved en reportes

---

## Notas del Mentor

> "El MVP no falla porque el código esté mal, falla porque la definición del problema y el fence todavía no están correctamente aplicados en la salida."

> "Susan quiere ver: 'Puedo confiar en el sistema para que no me avergüence.'"

> "Con scope classifier + scoring ordering + eliminar navigational/support, subís de C → B+ en 48 horas."
