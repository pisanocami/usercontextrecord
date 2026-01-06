import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, FileText, Calendar, TrendingUp } from "lucide-react";

export default function KeywordGapList() {
  const [reports] = useState([
    {
      id: 1,
      configName: "Acme Corp - B2B SaaS",
      createdAt: "2024-01-15",
      status: "completed",
      totalKeywords: 1247,
      gapOpportunities: 89,
    },
    {
      id: 2,
      configName: "TechStart - DTC Platform",
      createdAt: "2024-01-14",
      status: "completed",
      totalKeywords: 892,
      gapOpportunities: 56,
    },
    {
      id: 3,
      configName: "GlobalRetail - Marketplace",
      createdAt: "2024-01-12",
      status: "completed",
      totalKeywords: 2134,
      gapOpportunities: 142,
    },
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Keyword Gap Analysis</h1>
              <p className="text-sm text-muted-foreground">
                View and analyze keyword gap reports for your configurations
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                  Create a configuration and run a keyword gap analysis to see reports here.
                </p>
                <Link href="/new">
                  <Button>
                    Create Configuration
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reports.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{report.configName}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {new Date(report.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </CardDescription>
                      </div>
                      <Badge variant={report.status === "completed" ? "default" : "secondary"}>
                        {report.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Keywords</span>
                        <span className="font-semibold">{report.totalKeywords.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Gap Opportunities
                        </span>
                        <span className="font-semibold text-primary">{report.gapOpportunities}</span>
                      </div>
                      <div className="pt-2 flex gap-2">
                        <Link href={`/keyword-gap/${report.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            View Analysis
                          </Button>
                        </Link>
                        <Link href={`/keyword-gap-report/${report.id}`} className="flex-1">
                          <Button size="sm" className="w-full">
                            View Report
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
