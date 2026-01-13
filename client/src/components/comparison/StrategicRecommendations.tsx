/**
 * StrategicRecommendations Component
 * 
 * Generates and displays actionable strategic recommendations for each brand.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Target,
  Shield,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Download,
} from "lucide-react";
import type { Configuration } from "../../../../shared/schema";
import type { StrategicMetrics, ComparisonInsight } from "@/lib/comparison/types";

interface StrategicRecommendationsProps {
  contexts: Configuration[];
  strategicMetrics: StrategicMetrics;
  insights: ComparisonInsight[];
}

interface Recommendation {
  priority: "critical" | "high" | "medium" | "low";
  category: "threat" | "opportunity" | "positioning" | "resource";
  title: string;
  description: string;
  actionItems: string[];
  estimatedImpact: string;
  timeframe: string;
}

function RecommendationCard({ 
  recommendation, 
  brandName 
}: { 
  recommendation: Recommendation; 
  brandName: string;
}) {
  const getPriorityColor = () => {
    switch (recommendation.priority) {
      case "critical": return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20";
      case "high": return "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20";
      case "medium": return "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20";
      case "low": return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20";
    }
  };

  const getCategoryIcon = () => {
    switch (recommendation.category) {
      case "threat": return <Shield className="h-4 w-4" />;
      case "opportunity": return <TrendingUp className="h-4 w-4" />;
      case "positioning": return <Target className="h-4 w-4" />;
      case "resource": return <DollarSign className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn("p-4 rounded-lg border", getPriorityColor())}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {getCategoryIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-sm">{recommendation.title}</h4>
            <Badge variant="outline" className="text-xs">
              {recommendation.priority.charAt(0).toUpperCase() + recommendation.priority.slice(1)}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {recommendation.category}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">
            {recommendation.description}
          </p>
          
          <div className="space-y-2">
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Action Items
              </h5>
              <ul className="space-y-1">
                {recommendation.actionItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">Impact:</span>
                <span className="font-medium">{recommendation.estimatedImpact}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">Timeline:</span>
                <span className="font-medium">{recommendation.timeframe}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateRecommendations(
  contexts: Configuration[],
  strategicMetrics: StrategicMetrics,
  insights: ComparisonInsight[]
): Map<string, Recommendation[]> {
  const recommendations = new Map<string, Recommendation[]>();

  contexts.forEach((context) => {
    const brandName = context.name || context.brand?.domain || "Unknown";
    const brandRecommendations: Recommendation[] = [];

    // Threat-based recommendations
    if (strategicMetrics.threatProbability.score > 60) {
      brandRecommendations.push({
        priority: strategicMetrics.threatProbability.score > 80 ? "critical" : "high",
        category: "threat",
        title: "DEFENSIVE STRATEGY: Competitive Threat Detected",
        description: `High threat probability (${strategicMetrics.threatProbability.score}%) indicates direct competition likely. Immediate defensive actions required.`,
        actionItems: [
          "Review and strengthen unique value propositions",
          "Implement keyword protection strategies",
          "Monitor competitor movements closely",
          "Prepare contingency plans for market share defense",
        ],
        estimatedImpact: "High",
        timeframe: "1-3 months",
      });
    }

    // Opportunity-based recommendations
    if (strategicMetrics.marketAdjacency.score > 70 && strategicMetrics.competitiveIntensity.score < 40) {
      brandRecommendations.push({
        priority: "high",
        category: "opportunity",
        title: "EXPANSION OPPORTUNITY: Market Adjacency Detected",
        description: `High market adjacency (${strategicMetrics.marketAdjacency.score}%) with low competition suggests expansion opportunity.`,
        actionItems: [
          "Evaluate market entry costs and ROI",
          "Assess resource requirements for expansion",
          "Develop market-specific messaging",
          "Test expansion in pilot markets",
        ],
        estimatedImpact: "High",
        timeframe: "3-6 months",
      });
    }

    // Positioning recommendations
    if (strategicMetrics.strategicAlignment.score < 30) {
      brandRecommendations.push({
        priority: "medium",
        category: "positioning",
        title: "POSITIONING: Strategic Divergence Identified",
        description: `Low strategic alignment (${strategicMetrics.strategicAlignment.score}%) with other brands may indicate market differentiation or misalignment.`,
        actionItems: [
          "Document strategic rationale for differences",
          "Ensure internal teams understand positioning strategy",
          "Review if differentiation is intentional",
          "Align messaging with strategic goals",
        ],
        estimatedImpact: "Medium",
        timeframe: "1-2 months",
      });
    }

    // Resource allocation recommendations
    const keywordThreats = insights.filter(i => 
      i.category === "threat" && 
      i.section === "demand_definition" &&
      i.affectedContextNames.includes(brandName)
    );
    
    if (keywordThreats.length > 0) {
      brandRecommendations.push({
        priority: "high",
        category: "resource",
        title: "RESOURCE: Keyword Cannibalization Risk",
        description: `${keywordThreats.length} keyword-related threats detected impacting efficiency and costs.`,
        actionItems: [
          "Implement keyword deduplication strategy",
          "Assign keyword ownership to prevent conflicts",
          "Calculate potential CPC savings",
          "Review bidding strategies",
        ],
        estimatedImpact: "High",
        timeframe: "2-4 weeks",
      });
    }

    // Growth recommendations
    if (context.strategic_intent?.growth_priority === "high") {
      brandRecommendations.push({
        priority: "medium",
        category: "opportunity",
        title: "GROWTH: High Priority Strategy Alignment",
        description: "Growth is a strategic priority - ensure resources and tactics align with expansion goals.",
        actionItems: [
          "Allocate budget for growth initiatives",
          "Develop expansion roadmap",
          "Set measurable growth KPIs",
          "Review competitive landscape for opportunities",
        ],
        estimatedImpact: "Medium",
        timeframe: "2-4 months",
      });
    }

    recommendations.set(brandName, brandRecommendations);
  });

  return recommendations;
}

export function StrategicRecommendations({
  contexts,
  strategicMetrics,
  insights,
}: StrategicRecommendationsProps) {
  const recommendations = generateRecommendations(contexts, strategicMetrics, insights);

  const exportStrategyBrief = () => {
    // Generate markdown strategy brief
    let brief = "# Strategic Comparison Brief\n\n";
    brief += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    contexts.forEach((context) => {
      const brandName = context.name || context.brand?.domain || "Unknown";
      brief += `## ${brandName}\n\n`;
      
      const brandRecs = recommendations.get(brandName) || [];
      if (brandRecs.length === 0) {
        brief += "No specific recommendations at this time.\n\n";
      } else {
        brandRecs.forEach((rec, idx) => {
          brief += `### ${idx + 1}. ${rec.title}\n\n`;
          brief += `**Priority:** ${rec.priority} | **Category:** ${rec.category}\n`;
          brief += `**Impact:** ${rec.estimatedImpact} | **Timeline:** ${rec.timeframe}\n\n`;
          brief += `${rec.description}\n\n`;
          brief += "**Action Items:**\n";
          rec.actionItems.forEach((item) => {
            brief += `- ${item.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}\n`;
          });
          brief += "\n---\n\n";
        });
      }
      brief += "\n";
    });

    // Download the file
    const blob = new Blob([brief], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `strategy-brief-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Strategic Recommendations
          </span>
          <Button variant="outline" size="sm" onClick={exportStrategyBrief}>
            <Download className="h-4 w-4 mr-1" />
            Export Brief
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Array.from(recommendations.entries()).map(([brandName, brandRecs]) => (
            <div key={brandName}>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>{brandName}</span>
                <Badge variant="outline">
                  {brandRecs.length} recommendation{brandRecs.length !== 1 ? "s" : ""}
                </Badge>
              </h3>
              
              {brandRecs.length === 0 ? (
                <div className="p-4 bg-muted/30 rounded-lg text-center text-sm text-muted-foreground">
                  No specific recommendations for this brand at this time.
                </div>
              ) : (
                <div className="space-y-3">
                  {brandRecs.map((rec, idx) => (
                    <RecommendationCard
                      key={idx}
                      recommendation={rec}
                      brandName={brandName}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
