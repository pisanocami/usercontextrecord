---
description: Implementación segura de ExecReports y MasterReports en frontend
---

# Frontend ExecReports Implementation Workflow

## Overview
Implementar UI para ExecReports y MasterReports con migración gradual y experiencia de usuario optimizada.

## Pre-requisitos
- Backend API endpoints disponibles
- Design system actualizado
- Tests existentes pasando

## Paso 1: Tipos y Hooks

### 1.1 Agregar tipos en `shared/types.ts`

```typescript
// ExecReport types
export interface ExecReport {
  id: string;
  moduleId: string;
  configurationId: number;
  contextVersion: number;
  contextHash: string;
  executedAt: string;
  output: ModuleOutput;
  playbookResult?: {
    insights: Insight[];
    recommendations: Recommendation[];
    deprioritized: string[];
    councilPrompt: string;
  };
}

// MasterReport types
export interface MasterReport {
  id: string;
  configurationId: number;
  contextVersion: number;
  contextHash: string;
  generatedAt: string;
  ucrSnapshot: {
    brand: Brand;
    strategicIntent: StrategicIntent;
    negativeScope: NegativeScope;
  };
  execReports: ExecReport[];
  consolidatedInsights: Insight[];
  consolidatedRecommendations: Recommendation[];
  councilSynthesis: {
    keyThemes: string[];
    crossModulePatterns: string[];
    prioritizedActions: string[];
  };
  modulesIncluded: string[];
  overallConfidence: number;
  dataFreshness: 'fresh' | 'moderate' | 'stale';
}

// UI States
export interface ReportsState {
  execReports: ExecReport[];
  masterReports: MasterReport[];
  currentMasterReport: MasterReport | null;
  loading: boolean;
  error: string | null;
}
```

### 1.2 Crear hooks en `client/src/hooks/useReports.ts`

```typescript
export const useReports = (configurationId: number) => {
  const [state, setState] = useState<ReportsState>({
    execReports: [],
    masterReports: [],
    currentMasterReport: null,
    loading: false,
    error: null,
  });

  const fetchExecReports = useCallback(async (contextVersion?: number) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await api.get(`/api/reports/exec/${configurationId}`, {
        params: { contextVersion }
      });
      
      setState(prev => ({
        ...prev,
        execReports: response.data.execReports,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  }, [configurationId]);

  const fetchMasterReports = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await api.get(`/api/reports/master/${configurationId}`);
      
      setState(prev => ({
        ...prev,
        masterReports: response.data.masterReports,
        currentMasterReport: response.data.latest,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  }, [configurationId]);

  const generateMasterReport = useCallback(async (contextVersion: number) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await api.post(`/api/reports/master/${configurationId}/generate`, {
        contextVersion
      });
      
      setState(prev => ({
        ...prev,
        currentMasterReport: response.data.masterReport,
        masterReports: [...prev.masterReports, response.data.masterReport],
        loading: false,
      }));
      
      return response.data.masterReport;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      throw error;
    }
  }, [configurationId]);

  return {
    ...state,
    fetchExecReports,
    fetchMasterReports,
    generateMasterReport,
  };
};
```

## Paso 2: Componentes UI

### 2.1 Crear `client/src/components/reports/ExecReportCard.tsx`

```typescript
interface ExecReportCardProps {
  report: ExecReport;
  onView: (report: ExecReport) => void;
  isSelected?: boolean;
}

export const ExecReportCard: React.FC<ExecReportCardProps> = ({
  report,
  onView,
  isSelected = false,
}) => {
  const module = getModuleById(report.moduleId);
  
  return (
    <Card className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{module?.category}</Badge>
            <Badge variant={report.output.hasData ? 'default' : 'destructive'}>
              {report.output.hasData ? 'Data Available' : 'No Data'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatDistanceToNow(new Date(report.executedAt))}
          </div>
        </div>
        <CardTitle className="text-lg">{module?.name}</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Confidence</span>
          <div className="flex items-center gap-2">
            <Progress value={report.output.confidence * 100} className="w-20" />
            <span className="text-sm">{Math.round(report.output.confidence * 100)}%</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Insights:</span>
            <span className="ml-2">{report.output.insights.length}</span>
          </div>
          <div>
            <span className="font-medium">Recommendations:</span>
            <span className="ml-2">{report.output.recommendations.length}</span>
          </div>
        </div>
        
        {report.playbookResult && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Playbook processed</span>
              {report.playbookResult.deprioritized.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {report.playbookResult.deprioritized.length} deprioritized
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onView(report)}
          className="w-full"
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
};
```

### 2.2 Crear `client/src/components/reports/MasterReportView.tsx`

```typescript
interface MasterReportViewProps {
  report: MasterReport;
  onRefresh?: () => void;
}

export const MasterReportView: React.FC<MasterReportViewProps> = ({
  report,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Master Report</h2>
          <p className="text-muted-foreground">
            Generated {formatDistanceToNow(new Date(report.generatedAt))} ago
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={report.dataFreshness === 'fresh' ? 'default' : 'secondary'}>
            {report.dataFreshness}
          </Badge>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{report.execReports.length}</div>
            <p className="text-sm text-muted-foreground">Modules Executed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{report.consolidatedInsights.length}</div>
            <p className="text-sm text-muted-foreground">Total Insights</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{report.consolidatedRecommendations.length}</div>
            <p className="text-sm text-muted-foreground">Recommendations</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{Math.round(report.overallConfidence * 100)}%</div>
            <p className="text-sm text-muted-foreground">Overall Confidence</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="recommendations">Actions</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <CouncilSynthesis synthesis={report.councilSynthesis} />
          <DataFreshnessIndicator freshness={report.dataFreshness} />
        </TabsContent>
        
        <TabsContent value="insights" className="space-y-4">
          <InsightsList insights={report.consolidatedInsights} />
        </TabsContent>
        
        <TabsContent value="recommendations" className="space-y-4">
          <RecommendationsList recommendations={report.consolidatedRecommendations} />
        </TabsContent>
        
        <TabsContent value="modules" className="space-y-4">
          <ExecReportsList reports={report.execReports} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

### 2.3 Crear `client/src/components/reports/CouncilSynthesis.tsx`

```typescript
interface CouncilSynthesisProps {
  synthesis: MasterReport['councilSynthesis'];
}

export const CouncilSynthesis: React.FC<CouncilSynthesisProps> = ({ synthesis }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Council Synthesis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Themes */}
        <div>
          <h4 className="font-semibold mb-3">Key Themes</h4>
          <div className="space-y-2">
            {synthesis.keyThemes.map((theme, index) => (
              <div key={index} className="flex items-center gap-2">
                <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                  {index + 1}
                </Badge>
                <span className="text-sm">{theme}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Cross-Module Patterns */}
        <div>
          <h4 className="font-semibold mb-3">Cross-Module Patterns</h4>
          <div className="space-y-2">
            {synthesis.crossModulePatterns.map((pattern, index) => (
              <div key={index} className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm">{pattern}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Prioritized Actions */}
        <div>
          <h4 className="font-semibold mb-3">Prioritized Actions</h4>
          <div className="space-y-3">
            {synthesis.prioritizedActions.map((action, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <Badge variant="default" className="mt-0.5">
                  {index + 1}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm">{action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

## Paso 3: Pages Principales

### 3.1 Crear `client/src/pages/reports.tsx`

```typescript
export const ReportsPage: React.FC = () => {
  const { configurationId } = useParams<{ configurationId: string }>();
  const {
    execReports,
    masterReports,
    currentMasterReport,
    loading,
    error,
    fetchExecReports,
    fetchMasterReports,
    generateMasterReport,
  } = useReports(parseInt(configurationId!));

  const [selectedReport, setSelectedReport] = useState<ExecReport | null>(null);
  const [showExecDetails, setShowExecDetails] = useState(false);

  useEffect(() => {
    if (configurationId) {
      fetchExecReports();
      fetchMasterReports();
    }
  }, [configurationId, fetchExecReports, fetchMasterReports]);

  const handleGenerateMasterReport = async () => {
    try {
      await generateMasterReport(currentMasterReport?.contextVersion || 1);
    } catch (error) {
      console.error('Failed to generate master report:', error);
    }
  };

  if (loading && !execReports.length) {
    return <div className="flex items-center justify-center h-64">Loading reports...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analysis Reports</h1>
        <Button onClick={handleGenerateMasterReport} disabled={loading}>
          {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Generate Master Report
        </Button>
      </div>

      {/* Master Report Section */}
      {currentMasterReport && (
        <MasterReportView 
          report={currentMasterReport} 
          onRefresh={handleGenerateMasterReport}
        />
      )}

      {/* Executive Reports Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Module Executions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {execReports.map((report) => (
            <ExecReportCard
              key={report.id}
              report={report}
              onView={(report) => {
                setSelectedReport(report);
                setShowExecDetails(true);
              }}
              isSelected={selectedReport?.id === report.id}
            />
          ))}
        </div>
      </div>

      {/* Exec Report Details Modal */}
      <Dialog open={showExecDetails} onOpenChange={setShowExecDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedReport && (
            <ExecReportDetails report={selectedReport} onClose={() => setShowExecDetails(false)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

### 3.2 Crear `client/src/components/reports/ExecReportDetails.tsx`

```typescript
interface ExecReportDetailsProps {
  report: ExecReport;
  onClose: () => void;
}

export const ExecReportDetails: React.FC<ExecReportDetailsProps> = ({
  report,
  onClose,
}) => {
  const module = getModuleById(report.moduleId);
  
  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between">
          <span>{module?.name} Execution Report</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogTitle>
      </DialogHeader>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Execution Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium">Module ID:</span>
            <p className="text-sm">{report.moduleId}</p>
          </div>
          <div>
            <span className="text-sm font-medium">Context Version:</span>
            <p className="text-sm">{report.contextVersion}</p>
          </div>
          <div>
            <span className="text-sm font-medium">Executed At:</span>
            <p className="text-sm">{new Date(report.executedAt).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-sm font-medium">Data Sources:</span>
            <p className="text-sm">{report.output.dataSources.join(', ')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Insights ({report.output.insights.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.output.insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recommendations ({report.output.recommendations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.output.recommendations.map((rec) => (
              <RecommendationCard key={rec.id} recommendation={rec} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Playbook Results */}
      {report.playbookResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Playbook Processing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {report.playbookResult.insights.length}
                </div>
                <p className="text-sm text-muted-foreground">Final Insights</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {report.playbookResult.recommendations.length}
                </div>
                <p className="text-sm text-muted-foreground">Final Recommendations</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {report.playbookResult.deprioritized.length}
                </div>
                <p className="text-sm text-muted-foreground">Deprioritized</p>
              </div>
            </div>
            
            {report.playbookResult.deprioritized.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Deprioritized Actions:</h4>
                <div className="space-y-1">
                  {report.playbookResult.deprioritized.map((id) => (
                    <Badge key={id} variant="outline" className="mr-2">
                      {id}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
```

## Paso 4: Integración con Router

### 4.1 Actualizar `client/src/App.tsx`

```typescript
import { ReportsPage } from './pages/reports';

// Agregar ruta
<Route path="/configurations/:configurationId/reports" element={<ReportsPage />} />
```

### 4.2 Actualizar navegación existente

```typescript
// En ConfigurationPage o similar
<Link to={`/configurations/${configuration.id}/reports`}>
  <Button variant="outline">
    <BarChart3 className="h-4 w-4 mr-2" />
    View Reports
  </Button>
</Link>
```

## Paso 5: Componentes Auxiliares

### 5.1 Crear `client/src/components/reports/InsightCard.tsx`

```typescript
interface InsightCardProps {
  insight: Insight;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const severityColors = {
    high: 'destructive',
    medium: 'default',
    low: 'secondary',
  };

  const categoryIcons = {
    opportunity: <TrendingUp className="h-4 w-4" />,
    risk: <AlertTriangle className="h-4 w-4" />,
    observation: <Eye className="h-4 w-4" />,
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {categoryIcons[insight.category]}
          <Badge variant={severityColors[insight.severity]}>
            {insight.severity}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">{insight.source}</span>
      </div>
      
      <h4 className="font-semibold mb-2">{insight.title}</h4>
      <p className="text-sm text-muted-foreground mb-3">{insight.content}</p>
      
      <div className="space-y-2">
        <div className="text-sm">
          <span className="font-medium">Data Point:</span> {insight.dataPoint}
        </div>
        <div className="text-sm">
          <span className="font-medium">Why it matters:</span> {insight.whyItMatters}
        </div>
      </div>
    </Card>
  );
};
```

### 5.2 Crear `client/src/components/reports/RecommendationCard.tsx`

```typescript
interface RecommendationCardProps {
  recommendation: Recommendation;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation }) => {
  const priorityColors = {
    high: 'destructive',
    medium: 'default',
    low: 'secondary',
  };

  const effortColors = {
    low: 'green',
    medium: 'yellow',
    high: 'red',
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-2">
        <Badge variant={priorityColors[recommendation.priority]}>
          {recommendation.priority} priority
        </Badge>
        <Badge variant="outline" className={`text-${effortColors[recommendation.effort]}-600`}>
          {recommendation.effort} effort
        </Badge>
      </div>
      
      <h4 className="font-semibold mb-2">{recommendation.action}</h4>
      
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">Estimated Impact:</span> {recommendation.estimatedImpact}
        </div>
        {recommendation.timeline && (
          <div>
            <span className="font-medium">Timeline:</span> {recommendation.timeline}
          </div>
        )}
        {recommendation.withAccessCta && (
          <div>
            <span className="font-medium">Access Required:</span> {recommendation.withAccessCta}
          </div>
        )}
      </div>
      
      {recommendation.withAccessCta && (
        <Button size="sm" className="mt-3">
          Get Access
        </Button>
      )}
    </Card>
  );
};
```

## Paso 6: Testing Frontend

### 6.1 Component Tests

```typescript
// client/src/components/reports/__tests__/ExecReportCard.test.tsx
describe('ExecReportCard', () => {
  test('renders report information correctly', () => {
    const mockReport = createMockExecReport();
    render(<ExecReportCard report={mockReport} onView={jest.fn()} />);
    
    expect(screen.getByText(mockReport.moduleId)).toBeInTheDocument();
    expect(screen.getByText('Data Available')).toBeInTheDocument();
  });
  
  test('calls onView when clicked', () => {
    const onView = jest.fn();
    const mockReport = createMockExecReport();
    
    render(<ExecReportCard report={mockReport} onView={onView} />);
    fireEvent.click(screen.getByText('View Details'));
    
    expect(onView).toHaveBeenCalledWith(mockReport);
  });
});
```

### 6.2 Hook Tests

```typescript
// client/src/hooks/__tests__/useReports.test.ts
describe('useReports', () => {
  test('fetches exec reports successfully', async () => {
    const { result } = renderHook(() => useReports(123));
    
    await act(async () => {
      await result.current.fetchExecReports();
    });
    
    expect(result.current.execReports).toHaveLength(3);
    expect(result.current.loading).toBe(false);
  });
  
  test('handles errors gracefully', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'));
    
    const { result } = renderHook(() => useReports(123));
    
    await act(async () => {
      await result.current.fetchExecReports();
    });
    
    expect(result.current.error).toBe('Network error');
  });
});
```

## Paso 7: Performance Optimizations

### 7.1 Virtual Scrolling para listas largas

```typescript
// Usar react-window para listas de insights/recommendations
import { FixedSizeList as List } from 'react-window';

const VirtualizedInsightsList: React.FC<{ insights: Insight[] }> = ({ insights }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <InsightCard insight={insights[index]} />
    </div>
  );

  return (
    <List
      height={400}
      itemCount={insights.length}
      itemSize={200}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

### 7.2 Memoization para componentes pesados

```typescript
export const MasterReportView = React.memo<MasterReportViewProps>(({ report, onRefresh }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  return prevProps.report.id === nextProps.report.id;
});
```

## Paso 8: Accessibility

### 8.1 ARIA labels y keyboard navigation

```typescript
// En ExecReportCard
<Card 
  role="button"
  tabIndex={0}
  aria-label={`View ${module?.name} execution report`}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onView(report);
    }
  }}
>
```

### 8.2 Screen reader announcements

```typescript
// En MasterReportView
const [announcement, setAnnouncement] = useState('');

useEffect(() => {
  if (report.consolidatedInsights.length > 0) {
    setAnnouncement(`Master report generated with ${report.consolidatedInsights.length} insights`);
  }
}, [report]);

<div aria-live="polite" className="sr-only">
  {announcement}
</div>
```

## Validación Checklist

- [ ] Tipos definidos correctamente
- [ ] Hooks implementados con error handling
- [ ] Componentes renderizan datos correctamente
- [ ] Navegación integrada en router
- [ ] Tests unitarios pasan (>80% coverage)
- [ ] Accessibility guidelines cumplidas
- [ ] Performance optimizada (virtual scrolling, memoization)
- [ ] Error states manejados
- [ ] Loading states implementados
- [ ] Responsive design funcionando

## Post-Implementation

1. **User Testing**: Sessions con usuarios para validar UX
2. **Analytics**: Track engagement con nuevas features
3. **Performance Monitoring**: Observar load times y memory usage
4. **Documentation**: Actualizar user guides y component docs
