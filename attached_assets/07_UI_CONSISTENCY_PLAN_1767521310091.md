# 🎨 Phase 7: UI Consistency Plan

**Duración:** 1 semana  
**Prioridad:** P2 - Medio  
**Gap:** 30% - Componentes inconsistentes

---

## 🎯 Objetivo

Estandarizar componentes UI según MODULE_ARCHITECTURE_STANDARD.

---

## 📊 Requisitos (del Memory)

### Estructura Frontend Obligatoria:
1. DataSourceBadge visible ✅
2. Chart/Data ANTES de interpretación ✅
3. ConfidenceBar visible ⚠️ (no en todos)
4. InsightBlock con source labels ⚠️ (parcial)
5. Recommendations con priority ⚠️ (parcial)
6. "With Access" CTA section ✅
7. FeedbackButtons ✅
8. AI Summary al final ✅

---

## 🔧 Componentes a Estandarizar

### 1. ConfidenceBar (Obligatorio en todos los módulos)

```tsx
// frontend/src/components/modules/shared/ConfidenceBar.tsx

interface ConfidenceBarProps {
  score: number;  // 0-1
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({
  score,
  label = 'Confidence',
  showPercentage = true,
  size = 'md'
}) => {
  const getColor = () => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-yellow-500';
    if (score >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  const getENSOLabel = () => {
    if (score >= 0.8) return 'High Confidence';
    if (score >= 0.6) return 'Moderate Confidence';
    if (score >= 0.4) return 'Low Confidence';
    return 'Insufficient Data';
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor()} transition-all duration-500`}
          style={{ width: `${score * 100}%` }}
        />
      </div>
      {showPercentage && (
        <span className="text-sm font-medium">{Math.round(score * 100)}%</span>
      )}
      <span className="text-xs text-gray-500">{getENSOLabel()}</span>
    </div>
  );
};
```

### 2. InsightBlock (Mejorado)

```tsx
// frontend/src/components/modules/shared/InsightBlock.tsx

interface InsightBlockProps {
  insight: {
    title: string;
    content: string;
    data_point: string;      // OBLIGATORIO
    source: string;          // OBLIGATORIO
    why_it_matters: string;  // OBLIGATORIO
    severity?: 'high' | 'medium' | 'low';
    category?: 'opportunity' | 'risk' | 'observation';
  };
}

export const InsightBlock: React.FC<InsightBlockProps> = ({ insight }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
      {/* Header with severity badge */}
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-900 dark:text-white">
          {insight.title}
        </h4>
        {insight.severity && (
          <SeverityBadge severity={insight.severity} />
        )}
      </div>
      
      {/* Content */}
      <p className="text-gray-700 dark:text-gray-300 mb-3">
        {insight.content}
      </p>
      
      {/* Data Point - DESTACADO */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 mb-3">
        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
          DATA POINT
        </span>
        <p className="text-sm font-mono text-blue-800 dark:text-blue-200">
          {insight.data_point}
        </p>
      </div>
      
      {/* Source Label */}
      <div className="flex items-center gap-2 mb-3">
        <DataSourceBadge source={insight.source} size="sm" />
      </div>
      
      {/* Why It Matters - OBLIGATORIO */}
      <div className="border-l-2 border-purple-500 pl-3">
        <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
          WHY IT MATTERS
        </span>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {insight.why_it_matters}
        </p>
      </div>
    </div>
  );
};
```

### 3. RecommendationCard (Estandarizado)

```tsx
// frontend/src/components/modules/shared/RecommendationCard.tsx

interface RecommendationCardProps {
  recommendation: {
    action: string;
    priority: 'high' | 'medium' | 'low';
    estimated_impact: string;
    effort: 'low' | 'medium' | 'high';
    timeline?: string;
    with_access_cta?: string;
  };
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ 
  recommendation 
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
      {/* Priority Badge */}
      <div className="flex items-center gap-2 mb-2">
        <PriorityBadge priority={recommendation.priority} />
        <EffortBadge effort={recommendation.effort} />
      </div>
      
      {/* Action */}
      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
        {recommendation.action}
      </h4>
      
      {/* Impact & Timeline */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <span className="text-xs text-gray-500">Expected Impact</span>
          <p className="text-sm font-medium">{recommendation.estimated_impact}</p>
        </div>
        {recommendation.timeline && (
          <div>
            <span className="text-xs text-gray-500">Timeline</span>
            <p className="text-sm font-medium">{recommendation.timeline}</p>
          </div>
        )}
      </div>
      
      {/* With Access CTA */}
      {recommendation.with_access_cta && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 
                        dark:from-purple-900/20 dark:to-blue-900/20 
                        rounded p-3 mt-3">
          <span className="text-xs text-purple-600 dark:text-purple-400">
            🔓 WITH FULL ACCESS
          </span>
          <p className="text-sm text-purple-800 dark:text-purple-200">
            {recommendation.with_access_cta}
          </p>
        </div>
      )}
    </div>
  );
};
```

---

## 📋 Módulos a Actualizar

| Módulo | ConfidenceBar | InsightBlock | RecommendationCard |
|--------|---------------|--------------|-------------------|
| market-demand | ⚠️ Agregar | ⚠️ Actualizar | ⚠️ Actualizar |
| keyword-gap | ⚠️ Agregar | ⚠️ Actualizar | ⚠️ Actualizar |
| share-of-voice | ⚠️ Agregar | ⚠️ Actualizar | ⚠️ Actualizar |
| category-visibility | ⚠️ Agregar | ⚠️ Actualizar | ⚠️ Actualizar |
| ... (12 más) | ... | ... | ... |

---

## 🎨 Design Tokens

```tsx
// frontend/src/styles/tokens.ts

export const CONFIDENCE_COLORS = {
  high: { bg: 'bg-green-500', text: 'text-green-700' },
  moderate: { bg: 'bg-yellow-500', text: 'text-yellow-700' },
  low: { bg: 'bg-orange-500', text: 'text-orange-700' },
  insufficient: { bg: 'bg-red-500', text: 'text-red-700' },
};

export const PRIORITY_COLORS = {
  high: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
};

export const EFFORT_COLORS = {
  low: { bg: 'bg-green-100', text: 'text-green-700' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  high: { bg: 'bg-red-100', text: 'text-red-700' },
};
```

---

## ✅ Entregables

- [ ] ConfidenceBar component actualizado
- [ ] InsightBlock con campos obligatorios
- [ ] RecommendationCard estandarizado
- [ ] Design tokens documentados
- [ ] 16 módulos actualizados
- [ ] Storybook stories
- [ ] Visual regression tests
