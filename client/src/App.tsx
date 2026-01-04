import { useState, useCallback } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConfigurationPage } from "@/pages/configuration";
import { BrandContextPage } from "@/pages/brand-context";
import BulkGeneration from "@/pages/bulk-generation";
import ConfigurationsList from "@/pages/configurations-list";
import OnePager from "@/pages/one-pager";
import KeywordGap from "@/pages/keyword-gap";
import KeywordGapReport from "@/pages/keyword-gap-report";
import VersionHistory from "@/pages/version-history";
import GapComplianceReport from "./pages/gap-compliance-report.md?raw";
import ReactMarkdown from "react-markdown";

function GapReportPage() {
  const { logout, isLoggingOut } = useAuth();
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <header className="flex h-14 items-center justify-between gap-2 border-b bg-background px-3 sm:gap-4 sm:px-4">
        <div className="flex items-center gap-2">
           <Link href="/">
            <Button variant="ghost" size="sm">
              <List className="h-4 w-4 mr-2" />
              Configurations
            </Button>
           </Link>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => logout()} disabled={isLoggingOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-4xl prose dark:prose-invert">
          <ReactMarkdown>{GapComplianceReport}</ReactMarkdown>
        </div>
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={ConfigurationsListLayout} />
      <Route path="/report/gap" component={GapReportPage} />
      <Route path="/new" component={ConfigurationLayout} />
      <Route path="/context" component={BrandContextLayout} />
      <Route path="/bulk" component={BulkGenerationLayout} />
      <Route path="/one-pager/:id" component={OnePagerLayout} />
      <Route path="/keyword-gap/:id" component={KeywordGapLayout} />
      <Route path="/keyword-gap-report/:id" component={KeywordGapReportLayout} />
      <Route path="/versions/:id" component={VersionHistoryLayout} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="pb-[72px] sm:pb-0">
          <Router />
        </div>
        <MobileNav />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
