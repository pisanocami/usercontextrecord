/**
 * ExecReportCard - Display card for individual execution reports
 */

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import type { ExecReport } from '@/hooks/use-reports';

// Module metadata for display
const MODULE_INFO: Record<string, { name: string; category: string; icon: string }> = {
  'keyword-gap': { name: 'Keyword Gap Analysis', category: 'demand', icon: '🔍' },
  'content-performance': { name: 'Content Performance', category: 'content', icon: '📊' },
  'competitive-analysis': { name: 'Competitive Analysis', category: 'competitive', icon: '⚔️' },
  'strategic-summary': { name: 'Strategic Summary', category: 'strategy', icon: '🎯' },
  'visibility-tracker': { name: 'Visibility Tracker', category: 'visibility', icon: '👁️' },
};

function getModuleInfo(moduleId: string) {
  return MODULE_INFO[moduleId] || { name: moduleId, category: 'other', icon: '📋' };
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    demand: 'bg-blue-100 text-blue-800',
    content: 'bg-green-100 text-green-800',
    competitive: 'bg-red-100 text-red-800',
    strategy: 'bg-purple-100 text-purple-800',
    visibility: 'bg-yellow-100 text-yellow-800',
    other: 'bg-gray-100 text-gray-800',
  };
  return colors[category] || colors.other;
}

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
  const moduleInfo = getModuleInfo(report.moduleId);
  const confidence = report.output?.confidence ?? 0;
  const hasData = report.output?.hasData ?? false;
  const insightsCount = report.output?.insights?.length ?? 0;
  const recommendationsCount = report.output?.recommendations?.length ?? 0;
  
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
      }`}
      onClick={() => onView(report)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{moduleInfo.icon}</span>
            <Badge className={getCategoryColor(moduleInfo.category)}>
              {moduleInfo.category}
            </Badge>
            <Badge variant={hasData ? 'default' : 'destructive'}>
              {hasData ? 'Data Available' : 'No Data'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatTimeAgo(report.executedAt)}
          </div>
        </div>
        <CardTitle className="text-lg mt-2">{moduleInfo.name}</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Confidence</span>
          <div className="flex items-center gap-2">
            <Progress value={confidence * 100} className="w-20 h-2" />
            <span className="text-sm font-mono">{Math.round(confidence * 100)}%</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Insights:</span>
            <Badge variant="outline">{insightsCount}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Actions:</span>
            <Badge variant="outline">{recommendationsCount}</Badge>
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

        {!hasData && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span>Limited data available</span>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={(e) => {
            e.stopPropagation();
            onView(report);
          }}
          className="w-full"
        >
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ExecReportCard;
