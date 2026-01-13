import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Upload, 
  Play, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Clock,
  FileText,
  X,
  SkipForward,
  Loader2
} from "lucide-react";
import type { BulkImportJob, BulkImportItem } from "@shared/schema";

export default function BulkImport() {
  const { toast } = useToast();
  const [domainsInput, setDomainsInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: jobs, isLoading: jobsLoading } = useQuery<BulkImportJob[]>({
    queryKey: ["/api/bulk-import/jobs"],
    refetchInterval: 2000,
  });

  const parseDomainsInput = (input: string): string[] => {
    return input
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  const processFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.txt')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .txt file with one domain per line",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setDomainsInput(content.trim());
        setUploadedFileName(file.name);
        toast({
          title: "File loaded",
          description: `Loaded ${parseDomainsInput(content).length} domains from ${file.name}`,
        });
      }
    };
    reader.onerror = () => {
      toast({
        title: "Error reading file",
        description: "Could not read the uploaded file",
        variant: "destructive",
      });
    };
    reader.readAsText(file);
  }, [toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const clearFile = useCallback(() => {
    setDomainsInput("");
    setUploadedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleStartImport = async () => {
    const domains = parseDomainsInput(domainsInput);
    
    if (domains.length === 0) {
      toast({
        title: "No domains",
        description: "Please enter at least one domain",
        variant: "destructive",
      });
      return;
    }

    if (domains.length > 500) {
      toast({
        title: "Too many domains",
        description: "Maximum 500 domains per import",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      await apiRequest("POST", "/api/bulk-import/jobs", { domains });
      queryClient.invalidateQueries({ queryKey: ["/api/bulk-import/jobs"] });
      toast({
        title: "Import started",
        description: `Processing ${domains.length} domains in the background`,
      });
      setDomainsInput("");
      setUploadedFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start import",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
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
      case "skipped":
        return <Badge variant="secondary"><SkipForward className="mr-1 h-3 w-3" />Skipped</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getItemStatusIcon = (status: BulkImportItem["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "skipped":
        return <SkipForward className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex flex-col gap-3 border-b bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-12 sm:w-12">
            <Upload className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold sm:text-xl" data-testid="text-bulk-import-title">
              Bulk Import
            </h1>
            <p className="text-sm text-muted-foreground">
              Import domains and auto-generate brand contexts with AI
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Import Domains
              </CardTitle>
              <CardDescription>
                Upload a .txt file or paste domains (one per line). AI will automatically determine the category for each brand and create complete context records.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file-upload"
              />
              
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
              >
                {uploadedFileName ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-medium">{uploadedFileName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={clearFile}
                      data-testid="button-clear-file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                    <div>
                      <button
                        type="button"
                        className="text-primary underline hover:no-underline"
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="button-browse-file"
                      >
                        Click to upload
                      </button>
                      <span className="text-muted-foreground"> or drag and drop</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      .txt file with one domain per line
                    </p>
                  </div>
                )}
              </div>

              <Textarea
                value={domainsInput}
                onChange={(e) => {
                  setDomainsInput(e.target.value);
                  if (uploadedFileName) {
                    setUploadedFileName(null);
                  }
                }}
                placeholder={`aloyoga.com
alphaleteathletics.com
amgen.com
stripe.com
notion.so
...`}
                rows={8}
                className="font-mono text-sm"
                data-testid="textarea-domains"
              />
              <p className="text-sm text-muted-foreground">
                {parseDomainsInput(domainsInput).length} domains detected (max 500)
              </p>

              <Button
                onClick={handleStartImport}
                disabled={isCreating || parseDomainsInput(domainsInput).length === 0}
                data-testid="button-start-import"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Import
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Import Jobs
              </CardTitle>
              <CardDescription>
                Track progress of your bulk imports
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading jobs...
                </div>
              ) : jobs && jobs.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-lg border p-4"
                        data-testid={`import-job-${job.id}`}
                      >
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">Import #{job.id}</span>
                              {getStatusBadge(job.status)}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {job.totalDomains} domains
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
                              {job.completedDomains + job.failedDomains} / {job.totalDomains}
                            </span>
                          </div>
                          <Progress
                            value={((job.completedDomains + job.failedDomains) / job.totalDomains) * 100}
                          />
                          {job.failedDomains > 0 && (
                            <p className="mt-1 text-sm text-destructive">
                              {job.failedDomains} failed
                            </p>
                          )}
                        </div>

                        {job.items && job.items.length > 0 && (
                          <div className="mt-3">
                            <p className="mb-2 text-sm font-medium">Domains:</p>
                            <ScrollArea className="h-40 rounded border bg-muted/30 p-2">
                              <div className="space-y-1 text-sm">
                                {job.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    {getItemStatusIcon(item.status)}
                                    <span className="font-mono">{item.domain}</span>
                                    {item.inferredCategory && (
                                      <Badge variant="outline" className="text-xs">
                                        {item.inferredCategory}
                                      </Badge>
                                    )}
                                    {item.error && item.status !== "skipped" && (
                                      <span className="text-xs text-destructive">{item.error}</span>
                                    )}
                                    {item.status === "skipped" && (
                                      <span className="text-xs text-muted-foreground">(already exists)</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No imports yet. Upload domains to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
