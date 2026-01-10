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
import KeywordGapList from "@/pages/keyword-gap-list";
import KeywordGapReport from "@/pages/keyword-gap-report";
import VersionHistory from "@/pages/version-history";
import MarketDemand from "@/pages/market-demand";
import { ModuleShell } from "@/pages/module-shell";
import BrandsPage from "@/pages/brands";
import ModuleCenterPage from "@/pages/module-center";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, List } from "lucide-react";
import NotFound from "@/pages/not-found";
import { Link } from "wouter";
import { MobileNav } from "@/components/mobile-nav";
import { BrandProvider } from "@/contexts/brand-context";
import GapComplianceReport from "./pages/gap-compliance-report.md?raw";
import ReactMarkdown from "react-markdown";
import { MainLayout, HeaderOnlyLayout } from "@/components/layouts/main-layout";
import SectionListPage from "@/pages/section-list";
import { AlertsPanel } from "@/components/alerts-panel";
import AlertPreferencesPage from "@/pages/alert-preferences";
import ContentBriefPage from "@/pages/content-brief";
import SWOTAnalysisPage from "@/pages/swot-analysis";

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

function ConfigurationLayout() {
  const [activeSection, setActiveSection] = useState("brand");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [cmoSafe, setCmoSafe] = useState(false);
  const { user, logout, isLoggingOut } = useAuth();

  const handleDirtyChange = useCallback((isDirty: boolean) => {
    setHasUnsavedChanges(isDirty);
  }, []);

  const handleCmoSafeChange = useCallback((isSafe: boolean) => {
    setCmoSafe(isSafe);
  }, []);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties} defaultOpen={false}>
      <div className="flex h-screen w-full">
        <AppSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          hasUnsavedChanges={hasUnsavedChanges}
          cmoSafe={cmoSafe}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center justify-between gap-2 border-b bg-background px-3 sm:gap-4 sm:px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <AlertsPanel />
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5 text-sm">
                    <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                    <p className="text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} disabled={isLoggingOut} data-testid="button-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-hidden">
            <ConfigurationPage
              activeSection={activeSection}
              onDirtyChange={handleDirtyChange}
              onCmoSafeChange={handleCmoSafeChange}
            />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function BrandContextLayout() {
  const { user, logout, isLoggingOut } = useAuth();
  const [, setLocation] = useLocation();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties} defaultOpen={false}>
      <div className="flex h-screen w-full">
        <AppSidebar
          activeSection="context"
          onSectionChange={(section) => {
            if (section === "context") return;
            if (section === "list") setLocation("/");
            else setLocation("/new");
          }}
          hasUnsavedChanges={false}
          cmoSafe={false}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center justify-between gap-2 border-b bg-background px-3 sm:gap-4 sm:px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5 text-sm">
                    <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                    <p className="text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} disabled={isLoggingOut} data-testid="button-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-hidden">
            <BrandContextPage />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        {() => (
          <MainLayout activeSection="list">
            <ConfigurationsList />
          </MainLayout>
        )}
      </Route>
      <Route path="/alert-preferences" component={AlertPreferencesPage} />
      <Route path="/report/gap" component={GapReportPage} />
      <Route path="/new" component={ConfigurationLayout} />
      <Route path="/context" component={BrandContextLayout} />
      <Route path="/bulk">
        {() => (
          <MainLayout activeSection="bulk">
            <BulkGeneration />
          </MainLayout>
        )}
      </Route>
      <Route path="/one-pager/:id">
        {() => (
          <MainLayout activeSection="one-pager">
            <OnePager />
          </MainLayout>
        )}
      </Route>
      <Route path="/keyword-gap">
        {() => (
          <MainLayout activeSection="keyword-gap">
            <KeywordGapList />
          </MainLayout>
        )}
      </Route>
      <Route path="/keyword-gap/:id">
        {() => (
          <MainLayout activeSection="keyword-gap">
            <KeywordGap />
          </MainLayout>
        )}
      </Route>
      <Route path="/keyword-gap-report/:id">
        {() => (
          <MainLayout activeSection="keyword-gap">
            <KeywordGapReport />
          </MainLayout>
        )}
      </Route>
      <Route path="/versions/:id">
        {() => (
          <MainLayout activeSection="versions">
            <VersionHistory />
          </MainLayout>
        )}
      </Route>
      <Route path="/market-demand">
        {() => (
          <MainLayout activeSection="market-demand">
            <MarketDemand />
          </MainLayout>
        )}
      </Route>
      <Route path="/market-demand/:configId">
        {() => (
          <MainLayout activeSection="market-demand">
            <MarketDemand />
          </MainLayout>
        )}
      </Route>
      <Route path="/brands">
        {() => (
          <MainLayout activeSection="brands">
            <BrandsPage />
          </MainLayout>
        )}
      </Route>
      <Route path="/modules">
        {() => (
          <MainLayout activeSection="module-center">
            <ModuleCenterPage />
          </MainLayout>
        )}
      </Route>
      <Route path="/content-brief/:id">
        {() => (
          <HeaderOnlyLayout showAlerts={false}>
            <ContentBriefPage />
          </HeaderOnlyLayout>
        )}
      </Route>
      <Route path="/configurations/:id/swot">
        {() => (
          <HeaderOnlyLayout>
            <SWOTAnalysisPage />
          </HeaderOnlyLayout>
        )}
      </Route>
      <Route path="/sections/:sectionKey">
        {() => (
          <MainLayout>
            <SectionListPage />
          </MainLayout>
        )}
      </Route>
      <Route path="/modules/:moduleId">
        {(params) => (
          <MainLayout activeSection={params.moduleId}>
            <ModuleShell />
          </MainLayout>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrandProvider>
        <TooltipProvider>
          <Toaster />
          <div className="pb-[72px] sm:pb-0">
            <Router />
          </div>
          <MobileNav />
        </TooltipProvider>
      </BrandProvider>
    </QueryClientProvider>
  );
}

export default App;
