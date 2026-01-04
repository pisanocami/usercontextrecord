# Brand Intelligence Platform Documentation

## 1. User Documentation (Nivel Usuario)

### Overview
Plataforma B2B SaaS diseñada para la gestión de inteligencia de marca a nivel ejecutivo. El sistema permite definir y mantener el **User Record Context (UCR)**, que actúa como la fuente única de verdad para todas las estrategias de marketing y análisis competitivos.

### Funcionalidades Clave
- **Gestión de Contextos**: Creación y edición de perfiles de marca detallados.
- **AI-First Workflow**: Generación automática de secciones mediante IA para un inicio rápido.
- **One Pager**: Visualización ejecutiva tipo "resumen de una página" lista para ser compartida.
- **Análisis de Competencia**: Seguimiento de competidores directos e indirectos con métricas de solapamiento en buscadores (SERP).
- **Keyword Gap Analysis**: Integración real con DataForSEO para identificar oportunidades frente a la competencia.
- **Governance**: Control total sobre qué datos son aprobados para el análisis (CMO-Safe).

---

## 2. Analyst Documentation (Nivel Analista)

### El User Record Context (UCR)
El sistema se divide en 8 secciones canónicas que deben ser validadas para garantizar la precisión del análisis:
1.  **Brand Context**: Identidad, mercado objetivo y modelo de negocio.
2.  **Category Definition**: "Semantic Fence" que define qué pertenece y qué no a la categoría.
3.  **Competitive Set**: Tiering de competidores (Directo, Adyacente, Aspiracional).
4.  **Demand Definition**: Definición de términos de marca vs. términos de problema/categoría.
5.  **Strategic Intent**: Objetivos de crecimiento y guardarraíles (evitar ciertos temas).
6.  **Channel Context**: Inversión en SEO y dependencia de Marketplaces.
7.  **Negative Scope**: Exclusiones explícitas de palabras clave, categorías y casos de uso.
8.  **Governance**: Puntuación de calidad, auditoría y aprobación por secciones.

### Flujo de Trabajo
- **Borrador IA (Amber Badge)**: Datos provisionales generados por IA que requieren revisión.
- **Confirmado por Humano (Green Badge)**: Datos validados que bloquean el análisis para evitar errores.
- **CMO-Safe**: Flag de seguridad que garantiza que los outputs del sistema no causarán vergüenza corporativa.

---

## 3. Technical Architecture & Code Logic

### Arquitectura del Sistema
El sistema sigue una arquitectura Full-Stack JavaScript moderna:
- **Frontend**: React 18, Tailwind CSS, shadcn/ui.
- **Backend**: Express.js con Node.js.
- **Base de Datos**: PostgreSQL gestionado mediante Drizzle ORM.
- **IA**: Integración nativa con OpenAI para sugerencias inteligentes.

### Modelado de Datos (Shared Schema)
La estructura principal reside en `shared/schema.ts`. Utilizamos `jsonb` para almacenar las secciones del UCR de forma flexible pero tipada.

```typescript
// Ejemplo de la tabla de configuraciones en Drizzle
export const configurations = pgTable("configurations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  brand: jsonb("brand").notNull(), // Tipado mediante esquemas Zod
  governance: jsonb("governance").notNull(),
  // ... otras secciones
});
```

### Lógica de Validación (Context Validator)
El "Council of Validation" (`server/context-validator.ts`) evalúa la calidad del UCR mediante pesos ponderados.

```typescript
const SECTION_WEIGHTS: Record<string, number> = {
  brand: 0.20,
  category_definition: 0.15,
  competitors: 0.15,
  // ...
};

// Lógica de cálculo de score
export function calculateQualityScore(config: Configuration) {
  let score = 0;
  // Valida campos obligatorios y cobertura de evidencia
  // ...
  return { overall: Math.round(score), grade: score > 80 ? "high" : "medium" };
}
```

### Integración DataForSEO
La lógica de Keyword Gap se encuentra en `server/dataforseo.ts` y `server/keyword-gap-lite.ts`. Implementa un sistema de "guardarraíles" que filtra keywords basadas en el `Negative Scope` definido en el UCR.

```typescript
// Lógica de filtrado por guardarraíles
export function applyExclusions(keyword: string, negativeScope: NegativeScope) {
  const isExcluded = negativeScope.excluded_keywords.some(ex => 
    keyword.toLowerCase().includes(ex.toLowerCase())
  );
  if (isExcluded) return { status: "block", reason: "Excluded by Negative Scope" };
  return { status: "pass" };
}
```

### Componentes UI (Notion-like)
Los componentes en `client/src/components/notion/` utilizan el patrón de diseño de bloques colapsables con estados visuales claros.

```tsx
// Ejemplo de ContextBlock
export function ContextBlock({ title, status, children }) {
  const statusInfo = getStatusConfig(status);
  return (
    <Collapsible>
      <div className="flex items-center gap-2">
        <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
        <h3>{title}</h3>
      </div>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
```

### Resumen de APIs
- `GET /api/configuration`: Recupera el contexto actual del usuario.
- `POST /api/ai/generate`: Invoca a la IA para sugerir contenido de secciones.
- `POST /api/keyword-gap-lite/run`: Ejecuta el análisis de visibilidad filtrado por UCR.
