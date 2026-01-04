/**
 * MasterReportView - Comprehensive view for Master Reports
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Target,
  Lightbulb,
  ListChecks,
  BarChart3,
  Layers
} from 'lucide-react';
import type { MasterReport } from '@/hooks/use-reports';

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function getFreshnessColor(freshness: string): string {
  switch (freshness) {
    case 'fresh': return 'bg-green-100 text-green-800';
    case 'moderate': return 'bg-yellow-100 text-yellow-800';
    case 'stale': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 70) return 'text-green-600';
  if (confidence >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

interface MasterReportViewProps {
  report: MasterReport;
  onRefresh?: () => void;
  loading?: boolean;
}

export const MasterReportView: React.FC<MasterReportViewProps> = ({
  report,
  onRefresh,
  loading = false,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Master Report
          </h2>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Clock className="h-4 w-4" />
            Generated {formatTimeAgo(report.generatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={getFreshnessColor(report.dataFreshness)}>
            {report.dataFreshness === 'fresh' ? '🟢' : report.dataFreshness === 'moderate' ? '🟡' : '🔴'} {report.dataFreshness}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Confidence:</span>
            <span className={`font-bold ${getConfidenceColor(report.overallConfidence)}`}>
              {report.overallConfidence}%
            </span>
          </div>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{report.modulesIncluded.length}</p>
                <p className="text-sm text-muted-foreground">Modules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{report.consolidatedInsights.length}</p>
                <p className="text-sm text-muted-foreground">Insights</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{report.consolidatedRecommendations.length}</p>
                <p className="text-sm text-muted-foreground">Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{report.councilSynthesis.prioritizedActions.length}</p>
                <p className="text-sm text-muted-foreground">Priorities</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="synthesis">Council Synthesis</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Key Themes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {report.councilSynthesis.keyThemes.map((theme, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {theme}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Cross-Module Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {report.councilSynthesis.crossModulePatterns.map((pattern, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                    <span>{pattern}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Prioritized Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {report.councilSynthesis.prioritizedActions.map((action, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <span>{action}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          {report.consolidatedInsights.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No insights available yet. Run module executions to generate insights.
              </CardContent>
            </Card>
          ) : (
            report.consolidatedInsights.map((insight: any, index: number) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {insight.type === 'opportunity' && <TrendingUp className="h-4 w-4 text-green-500" />}
                      {insight.type === 'risk' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      {insight.type === 'trend' && <BarChart3 className="h-4 w-4 text-blue-500" />}
                      {insight.title || 'Insight'}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={insight.priority === 'high' ? 'destructive' : insight.priority === 'medium' ? 'default' : 'secondary'}>
                        {insight.priority || 'medium'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {insight.confidence || 50}% confidence
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{insight.description || insight.details || 'No description'}</p>
                  {insight.relatedKeywords && insight.relatedKeywords.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {insight.relatedKeywords.map((kw: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          {report.consolidatedRecommendations.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No recommendations available yet. Run module executions to generate recommendations.
              </CardContent>
            </Card>
          ) : (
            report.consolidatedRecommendations.map((rec: any, index: number) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{rec.action || rec.title || 'Recommendation'}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={rec.expectedImpact === 'high' ? 'default' : 'secondary'}>
                        Impact: {rec.expectedImpact || 'medium'}
                      </Badge>
                      <Badge variant="outline">
                        Effort: {rec.effort || 'medium'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{rec.rationale || rec.reason || 'No rationale provided'}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Council Synthesis Tab */}
        <TabsContent value="synthesis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>UCR Context Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.ucrSnapshot?.brand && (
                <div>
                  <h4 className="font-medium mb-2">Brand</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> {report.ucrSnapshot.brand.name}</div>
                    <div><span className="text-muted-foreground">Domain:</span> {report.ucrSnapshot.brand.domain}</div>
                    <div><span className="text-muted-foreground">Industry:</span> {report.ucrSnapshot.brand.industry}</div>
                    <div><span className="text-muted-foreground">Model:</span> {report.ucrSnapshot.brand.business_model}</div>
                  </div>
                </div>
              )}
              
              {report.ucrSnapshot?.strategicIntent && (
                <div>
                  <h4 className="font-medium mb-2">Strategic Intent</h4>
                  <div className="text-sm space-y-1">
                    <div><span className="text-muted-foreground">Goal:</span> {report.ucrSnapshot.strategicIntent.primary_goal}</div>
                    <div><span className="text-muted-foreground">Risk Tolerance:</span> {report.ucrSnapshot.strategicIntent.risk_tolerance}</div>
                    <div><span className="text-muted-foreground">Time Horizon:</span> {report.ucrSnapshot.strategicIntent.time_horizon}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Modules Included</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {report.modulesIncluded.map((moduleId, index) => (
                  <Badge key={index} variant="outline">{moduleId}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report Metadata</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Report ID:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">{report.id}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Context Version:</span>
                <span>{report.contextVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Context Hash:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">{report.contextHash}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Exec Reports:</span>
                <span>{report.execReportIds.length}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MasterReportView;
