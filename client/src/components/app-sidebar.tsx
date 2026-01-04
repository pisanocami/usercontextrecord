import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  BarChart3,
  Settings,
  ChevronDown,
  Loader2,
  TrendingUp,
  Eye,
  Swords,
  Brain,
  Activity,
  LineChart,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { ContextStatusBadge, ContextCompletionIndicator } from "@/components/context-guard";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface FONModule {
  id: string;
  name: string;
  description: string;
  category: string;
  ownerCouncil: string;
  dataSources: string[];
}

const categoryIcons: Record<string, typeof TrendingUp> = {
  demand: TrendingUp,
  visibility: Eye,
  competitive: Swords,
  strategy: Brain,
  performance: Activity,
  content: LineChart,
  other: BarChart3,
};

const categoryLabels: Record<string, string> = {
  demand: "Demand",
  visibility: "Visibility",
  competitive: "Competitive",
  strategy: "Strategy",
  performance: "Performance",
  content: "Content",
  other: "Other",
};

const categoryOrder = ['demand', 'visibility', 'competitive', 'strategy', 'performance', 'content', 'other'];

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  hasUnsavedChanges?: boolean;
  cmoSafe?: boolean;
}

export function AppSidebar({
  activeSection,
  onSectionChange,
  hasUnsavedChanges = false,
  cmoSafe = false,
}: SidebarProps) {
  const [location] = useLocation();
  
  const { data: modulesData, isLoading: modulesLoading } = useQuery<{ modules: FONModule[] }>({
    queryKey: ["/api/fon/modules"],
  });

  const modules = modulesData?.modules || [];
  
  const modulesByCategory = modules.reduce((acc, mod) => {
    const cat = mod.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(mod);
    return acc;
  }, {} as Record<string, FONModule[]>);

  const isModuleActive = (moduleId: string) => location === `/modules/${moduleId}`;
  const isIntelligenceSection = location === "/dashboard" || location === "/master-report" || location.startsWith("/modules");
  const isBrandContextSection = location === "/" || location === "/new" || location.startsWith("/one-pager") || location.startsWith("/keyword-gap") || location.startsWith("/version-history");
  const isAnalysisSection = location === "/bulk";

  return (
    <Sidebar>
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-tight">Brand Intel</span>
            <span className="text-xs text-muted-foreground font-medium">Executive Platform</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <Collapsible defaultOpen={isIntelligenceSection}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={`group h-11 px-3 ${isIntelligenceSection ? "bg-sidebar-accent" : ""}`}
                      data-testid="nav-intelligence-hub"
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      <span className="text-sm font-semibold flex-1 text-left">Intelligence Hub</span>
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-1 ml-3 border-l-2 border-sidebar-border pl-3 space-y-1">
                      <Link href="/dashboard">
                        <SidebarMenuButton
                          isActive={location === "/dashboard"}
                          className={`h-10 ${location === "/dashboard" ? "bg-primary/10 text-primary font-medium" : ""}`}
                          data-testid="nav-dashboard"
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          <span>Executive Dashboard</span>
                        </SidebarMenuButton>
                      </Link>
                      <Link href="/master-report">
                        <SidebarMenuButton
                          isActive={location === "/master-report"}
                          className={`h-10 ${location === "/master-report" ? "bg-primary/10 text-primary font-medium" : ""}`}
                          data-testid="nav-master-report"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Master Report</span>
                        </SidebarMenuButton>
                      </Link>
                      
                      {modulesLoading ? (
                        <div className="flex items-center justify-center py-3">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        categoryOrder
                          .filter(cat => modulesByCategory[cat]?.length > 0)
                          .map((category) => {
                            const categoryModules = modulesByCategory[category] || [];
                            const CategoryIcon = categoryIcons[category] || BarChart3;
                            const hasActiveModule = categoryModules.some(m => isModuleActive(m.id));
                            
                            return (
                              <Collapsible key={category} defaultOpen={hasActiveModule}>
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuButton
                                    className="group h-9"
                                    data-testid={`nav-category-${category}`}
                                  >
                                    <CategoryIcon className="h-4 w-4" />
                                    <span className="text-sm flex-1 text-left">{categoryLabels[category]}</span>
                                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                                      {categoryModules.length}
                                    </Badge>
                                    <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
                                  </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="ml-4 space-y-0.5">
                                    {categoryModules.map((mod) => (
                                      <Link key={mod.id} href={`/modules/${mod.id}`}>
                                        <SidebarMenuButton
                                          isActive={isModuleActive(mod.id)}
                                          className={`h-8 text-sm ${isModuleActive(mod.id) ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                                          data-testid={`nav-module-${mod.id}`}
                                        >
                                          <span className="truncate">{mod.name}</span>
                                        </SidebarMenuButton>
                                      </Link>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            );
                          })
                      )}
                    </div>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <Collapsible defaultOpen={isBrandContextSection}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={`group h-11 px-3 ${isBrandContextSection ? "bg-sidebar-accent" : ""}`}
                      data-testid="nav-brand-context"
                    >
                      <Briefcase className="h-5 w-5" />
                      <span className="text-sm font-semibold flex-1 text-left">Brand Context</span>
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-1 ml-3 border-l-2 border-sidebar-border pl-3 space-y-1">
                      <Link href="/">
                        <SidebarMenuButton
                          isActive={location === "/"}
                          className={`h-10 ${location === "/" ? "bg-primary/10 text-primary font-medium" : ""}`}
                          data-testid="nav-configurations"
                        >
                          <span>All Configurations</span>
                        </SidebarMenuButton>
                      </Link>
                      <Link href="/new">
                        <SidebarMenuButton
                          isActive={location === "/new" || activeSection === "brand"}
                          className={`h-10 ${location === "/new" || activeSection === "brand" ? "bg-primary/10 text-primary font-medium" : ""}`}
                          data-testid="nav-new"
                        >
                          <span>New Configuration</span>
                        </SidebarMenuButton>
                      </Link>
                    </div>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <Collapsible defaultOpen={isAnalysisSection}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={`group h-11 px-3 ${isAnalysisSection ? "bg-sidebar-accent" : ""}`}
                      data-testid="nav-analysis-tools"
                    >
                      <BarChart3 className="h-5 w-5" />
                      <span className="text-sm font-semibold flex-1 text-left">Analysis Tools</span>
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-1 ml-3 border-l-2 border-sidebar-border pl-3 space-y-1">
                      <Link href="/bulk">
                        <SidebarMenuButton
                          isActive={location === "/bulk"}
                          className={`h-10 ${location === "/bulk" ? "bg-primary/10 text-primary font-medium" : ""}`}
                          data-testid="nav-bulk"
                        >
                          <span>Bulk Generation</span>
                        </SidebarMenuButton>
                      </Link>
                    </div>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-11 px-3"
                  data-testid="nav-settings"
                >
                  <Settings className="h-5 w-5" />
                  <span className="text-sm font-semibold">Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-3">
        <ContextCompletionIndicator />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">Unsaved</span>
              </div>
            )}
          </div>
          <ContextStatusBadge />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
