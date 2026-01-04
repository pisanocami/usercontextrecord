/**
 * ReportsPage - Main page for viewing ExecReports and MasterReports
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  FileText, 
  BarChart3, 
  AlertCircle,
  Loader2,
  Plus
} from 'lucide-react';
import { useReports, type ExecReport, type MasterReport } from '@/hooks/use-reports';
import { ExecReportCard } from './ExecReportCard';
import { MasterReportView } from './MasterReportView';

interface ReportsPageProps {
  configurationId: number;
  contextVersion?: number;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  configurationId,
  contextVersion = 1,
}) => {
  const {
    execReports,
    masterReports,
    currentMasterReport,
    loading,
    error,
    fetchExecReports,
    fetchMasterReports,
    generateMasterReport,
    clearError,
  } = useReports(configurationId);

  const [activeTab, setActiveTab] = useState('master');
  const [selectedExecReport, setSelectedExecReport] = useState<ExecReport | null>(null);
  const [generating, setGenerating] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchExecReports(contextVersion);
    fetchMasterReports();
  }, [configurationId, contextVersion, fetchExecReports, fetchMasterReports]);

  const handleGenerateMasterReport = async () => {
    setGenerating(true);
    try {
      await generateMasterReport(contextVersion);
    } catch (err) {
      console.error('Failed to generate master report:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleRefresh = () => {
    fetchExecReports(contextVersion);
    fetchMasterReports();
  };

  const handleViewExecReport = (report: ExecReport) => {
    setSelectedExecReport(report);
    setActiveTab('exec-detail');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            View execution reports and consolidated master reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleGenerateMasterReport} disabled={generating || execReports.length === 0}>
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Generate Master Report
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{execReports.length}</p>
                <p className="text-sm text-muted-foreground">Exec Reports</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{masterReports.length}</p>
                <p className="text-sm text-muted-foreground">Master Reports</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">v{contextVersion}</p>
                <p className="text-sm text-muted-foreground">Context Version</p>
              </div>
              <Badge variant="outline" className="text-lg">
                {currentMasterReport?.dataFreshness || 'N/A'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="master">
            <BarChart3 className="h-4 w-4 mr-2" />
            Master Report
          </TabsTrigger>
          <TabsTrigger value="exec">
            <FileText className="h-4 w-4 mr-2" />
            Exec Reports ({execReports.length})
          </TabsTrigger>
          {selectedExecReport && (
            <TabsTrigger value="exec-detail">
              Detail: {selectedExecReport.moduleId}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Master Report Tab */}
        <TabsContent value="master" className="mt-6">
          {loading ? (
            <Card>
              <CardContent className="pt-6 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : currentMasterReport ? (
            <MasterReportView 
              report={currentMasterReport} 
              onRefresh={handleGenerateMasterReport}
              loading={generating}
            />
          ) : (
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-medium">No Master Report Yet</h3>
                  <p className="text-muted-foreground">
                    {execReports.length > 0 
                      ? 'Generate a master report to consolidate all execution results.'
                      : 'Run some module executions first to generate reports.'}
                  </p>
                </div>
                {execReports.length > 0 && (
                  <Button onClick={handleGenerateMasterReport} disabled={generating}>
                    {generating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Generate Master Report
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Exec Reports Tab */}
        <TabsContent value="exec" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : execReports.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-medium">No Execution Reports</h3>
                  <p className="text-muted-foreground">
                    Run module executions to generate reports.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {execReports.map((report) => (
                <ExecReportCard
                  key={report.id}
                  report={report}
                  onView={handleViewExecReport}
                  isSelected={selectedExecReport?.id === report.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Exec Report Detail Tab */}
        <TabsContent value="exec-detail" className="mt-6">
          {selectedExecReport ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Execution Report: {selectedExecReport.moduleId}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setSelectedExecReport(null);
                    setActiveTab('exec');
                  }}>
                    Back to List
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Metadata</h4>
                    <div className="text-sm space-y-1">
                      <div><span className="text-muted-foreground">ID:</span> <code className="text-xs">{selectedExecReport.id}</code></div>
                      <div><span className="text-muted-foreground">Executed:</span> {new Date(selectedExecReport.executedAt).toLocaleString()}</div>
                      <div><span className="text-muted-foreground">Context Version:</span> {selectedExecReport.contextVersion}</div>
                      <div><span className="text-muted-foreground">Context Hash:</span> <code className="text-xs">{selectedExecReport.contextHash}</code></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Output Summary</h4>
                    <div className="text-sm space-y-1">
                      <div><span className="text-muted-foreground">Has Data:</span> {selectedExecReport.output?.hasData ? 'Yes' : 'No'}</div>
                      <div><span className="text-muted-foreground">Confidence:</span> {Math.round((selectedExecReport.output?.confidence || 0) * 100)}%</div>
                      <div><span className="text-muted-foreground">Insights:</span> {selectedExecReport.output?.insights?.length || 0}</div>
                      <div><span className="text-muted-foreground">Recommendations:</span> {selectedExecReport.output?.recommendations?.length || 0}</div>
                    </div>
                  </div>
                </div>

                {selectedExecReport.playbookResult && (
                  <div>
                    <h4 className="font-medium mb-2">Playbook Result</h4>
                    <div className="bg-muted p-4 rounded-lg text-sm">
                      <div><span className="text-muted-foreground">Processed Insights:</span> {selectedExecReport.playbookResult.insights.length}</div>
                      <div><span className="text-muted-foreground">Processed Recommendations:</span> {selectedExecReport.playbookResult.recommendations.length}</div>
                      <div><span className="text-muted-foreground">Deprioritized:</span> {selectedExecReport.playbookResult.deprioritized.length}</div>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2">Raw Output</h4>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96">
                    {JSON.stringify(selectedExecReport.output, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">Select an execution report to view details.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Master Reports History */}
      {masterReports.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Report History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {masterReports.slice(0, 5).map((report, index) => (
                <div 
                  key={report.id} 
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    report.id === currentMasterReport?.id ? 'bg-blue-50 border border-blue-200' : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={index === 0 ? 'default' : 'secondary'}>
                      {index === 0 ? 'Latest' : `v${masterReports.length - index}`}
                    </Badge>
                    <span className="text-sm">
                      {new Date(report.generatedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{report.modulesIncluded.length} modules</Badge>
                    <Badge variant="outline">{report.consolidatedInsights.length} insights</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportsPage;
