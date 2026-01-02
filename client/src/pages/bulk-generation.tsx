import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Layers, 
  Upload, 
  Download, 
  Play, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Clock,
  FileText,
  Sparkles
} from "lucide-react";
import type { BulkJob, InsertConfiguration } from "@shared/schema";

export default function BulkGeneration() {
  const { toast } = useToast();
  const [primaryCategory, setPrimaryCategory] = useState("");
  const [brandsInput, setBrandsInput] = useState("");

  const { data: jobs, isLoading: jobsLoading } = useQuery<BulkJob[]>({
    queryKey: ["/api/bulk/jobs"],
    refetchInterval: 3000,
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: { primaryCategory: string; brands: { domain: string; name?: string }[] }) => {
      const res = await apiRequest("POST", "/api/bulk/jobs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bulk/jobs"] });
      toast({
        title: "Job created",
        description: "Bulk generation job has been started.",
      });
      setBrandsInput("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const parseBrandsInput = (input: string): { domain: string; name?: string }[] => {
    const lines = input.split("\n").filter(line => line.trim());
    return lines.map(line => {
      const parts = line.split(",").map(p => p.trim());
      return {
        domain: parts[0],
        name: parts[1] || undefined,
      };
    });
  };

  const handleStartJob = () => {
    if (!primaryCategory.trim()) {
      toast({
        title: "Error",
        description: "Please enter a primary category",
        variant: "destructive",
      });
      return;
    }

    const brands = parseBrandsInput(brandsInput);
    if (brands.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one brand domain",
        variant: "destructive",
      });
      return;
    }

    if (brands.length > 5000) {
      toast({
        title: "Error",
        description: "Maximum 5000 brands per job",
        variant: "destructive",
      });
      return;
    }

    createJobMutation.mutate({ primaryCategory, brands });
  };

  const handleExportResults = (job: BulkJob) => {
    const data = JSON.stringify(job.results, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk-results-${job.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = (job: BulkJob) => {
    const headers = [
      "Name",
      "Domain",
      "Industry",
      "Business Model",
      "Primary Geography",
      "Revenue Band",
      "Primary Category",
      "Direct Competitors",
      "Indirect Competitors",
    ];
    
    const rows = job.results.map((config: InsertConfiguration) => [
      config.brand.name,
      config.brand.domain,
      config.brand.industry,
      config.brand.business_model,
      config.brand.primary_geography.join("; "),
      config.brand.revenue_band,
      config.category_definition.primary_category,
      config.competitors.direct.join("; "),
      config.competitors.indirect.join("; "),
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk-results-${job.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case "processing":
        return <Badge variant="default"><RefreshCw className="mr-1 h-3 w-3 animate-spin" />Processing</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-col gap-3 border-b bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-12 sm:w-12">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold sm:text-xl" data-testid="text-bulk-title">
              Bulk Generation
            </h1>
            <p className="text-sm text-muted-foreground">
              Generate configurations for 1-5000 brands
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                New Bulk Job
              </CardTitle>
              <CardDescription>
                Enter a primary category and list of brand domains to generate complete configurations using AI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Primary Category *
                </label>
                <Input
                  value={primaryCategory}
                  onChange={(e) => setPrimaryCategory(e.target.value)}
                  placeholder="e.g., SaaS, E-commerce, Fintech, Healthcare..."
                  data-testid="input-primary-category"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Brand Domains (one per line, optionally with name after comma)
                </label>
                <Textarea
                  value={brandsInput}
                  onChange={(e) => setBrandsInput(e.target.value)}
                  placeholder={`stripe.com, Stripe
shopify.com, Shopify
notion.so
figma.com, Figma
...`}
                  rows={8}
                  className="font-mono text-sm"
                  data-testid="textarea-brands"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  {parseBrandsInput(brandsInput).length} brands detected (max 5000)
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleStartJob}
                  disabled={createJobMutation.isPending}
                  data-testid="button-start-job"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {createJobMutation.isPending ? "Starting..." : "Start Generation"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Generation Jobs
              </CardTitle>
              <CardDescription>
                View and manage your bulk generation jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading jobs...
                </div>
              ) : jobs && jobs.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-lg border p-4"
                        data-testid={`job-card-${job.id}`}
                      >
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">Job #{job.id}</span>
                              {getStatusBadge(job.status)}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Category: {job.primaryCategory}
                            </p>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            {new Date(job.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="mb-1 flex justify-between text-sm">
                            <span>Progress</span>
                            <span>
                              {job.completedBrands + job.failedBrands} / {job.totalBrands}
                            </span>
                          </div>
                          <Progress
                            value={((job.completedBrands + job.failedBrands) / job.totalBrands) * 100}
                          />
                          {job.failedBrands > 0 && (
                            <p className="mt-1 text-sm text-destructive">
                              {job.failedBrands} failed
                            </p>
                          )}
                        </div>

                        {job.status === "completed" && job.results.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportResults(job)}
                              data-testid={`button-export-json-${job.id}`}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Export JSON
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportCSV(job)}
                              data-testid={`button-export-csv-${job.id}`}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Export CSV
                            </Button>
                          </div>
                        )}

                        {job.errors && job.errors.length > 0 && (
                          <div className="mt-3">
                            <p className="mb-1 text-sm font-medium text-destructive">Errors:</p>
                            <div className="max-h-24 overflow-auto rounded bg-destructive/10 p-2 text-xs">
                              {job.errors.slice(0, 5).map((err, i) => (
                                <div key={i}>
                                  {err.domain}: {err.error}
                                </div>
                              ))}
                              {job.errors.length > 5 && (
                                <div className="mt-1 text-muted-foreground">
                                  ...and {job.errors.length - 5} more
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No jobs yet. Create your first bulk generation job above.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
