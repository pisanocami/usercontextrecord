import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Layers,
  Users,
  Search,
  Target,
  Radio,
  Ban,
  Shield,
  Settings,
  ChevronRight,
  Sparkles,
  List,
  Plus,
  BarChart3,
  LayoutDashboard,
  TrendingUp,
  Eye,
  Swords,
  LineChart,
  Activity,
  DollarSign,
  Share2,
  Brain,
  Loader2,
  FileText,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
  demand: "Demand Analysis",
  visibility: "SEO & Visibility",
  competitive: "Competitive Intel",
  strategy: "Strategic Planning",
  performance: "Performance Metrics",
  content: "Content Analysis",
  other: "Other Modules",
};

const categoryOrder = ['demand', 'visibility', 'competitive', 'strategy', 'performance', 'content', 'other'];

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  hasUnsavedChanges?: boolean;
  cmoSafe?: boolean;
}

const navigationItems = [
  {
    id: "brand",
    title: "Brand Context",
    icon: Building2,
    description: "Company identity and market position",
  },
  {
    id: "category",
    title: "Category Definition",
    icon: Layers,
    description: "Semantic fence for scope",
  },
  {
    id: "competitors",
    title: "Competitive Set",
    icon: Users,
    description: "Direct and indirect competitors",
  },
  {
    id: "demand",
    title: "Demand Definition",
    icon: Search,
    description: "Brand and non-brand keywords",
  },
  {
    id: "strategic",
    title: "Strategic Intent",
    icon: Target,
    description: "Goals and risk tolerance",
  },
  {
    id: "channel",
    title: "Channel Context",
    icon: Radio,
    description: "Marketing channel overview",
  },
  {
    id: "negative",
    title: "Negative Scope",
    icon: Ban,
    description: "Exclusions and boundaries",
  },
  {
    id: "governance",
    title: "Governance",
    icon: Shield,
    description: "Overrides and confidence",
  },
];

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
  const isModulesSection = location.startsWith("/modules");

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Settings className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Brand Intelligence</span>
            <span className="text-xs text-muted-foreground">FON Platform</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs uppercase tracking-wider text-muted-foreground">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/">
                  <SidebarMenuButton
                    isActive={activeSection === "list"}
                    className={`group relative ${
                      activeSection === "list"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-r before:bg-primary"
                        : ""
                    }`}
                    data-testid="nav-list"
                  >
                    <List className="h-4 w-4" />
                    <div className="flex flex-1 flex-col items-start">
                      <span className="text-sm font-medium">All Configurations</span>
                    </div>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/new">
                  <SidebarMenuButton
                    isActive={activeSection === "brand"}
                    className={`group relative ${
                      activeSection === "brand"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-r before:bg-primary"
                        : ""
                    }`}
                    data-testid="nav-new"
                  >
                    <Plus className="h-4 w-4" />
                    <div className="flex flex-1 flex-col items-start">
                      <span className="text-sm font-medium">New Configuration</span>
                    </div>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs uppercase tracking-wider text-muted-foreground">
            Intelligence
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/dashboard">
                  <SidebarMenuButton
                    isActive={activeSection === "dashboard"}
                    className={`group relative ${
                      activeSection === "dashboard"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-r before:bg-primary"
                        : ""
                    }`}
                    data-testid="nav-dashboard"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <div className="flex flex-1 flex-col items-start">
                      <span className="text-sm font-medium">Dashboard</span>
                    </div>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/modules">
                  <SidebarMenuButton
                    isActive={activeSection === "modules" && location === "/modules"}
                    className={`group relative ${
                      activeSection === "modules" && location === "/modules"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-r before:bg-primary"
                        : ""
                    }`}
                    data-testid="nav-modules"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <div className="flex flex-1 flex-col items-start">
                      <span className="text-sm font-medium">All Modules</span>
                    </div>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/master-report">
                  <SidebarMenuButton
                    isActive={activeSection === "master-report" || location === "/master-report"}
                    className={`group relative ${
                      activeSection === "master-report" || location === "/master-report"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-r before:bg-primary"
                        : ""
                    }`}
                    data-testid="nav-master-report"
                  >
                    <FileText className="h-4 w-4" />
                    <div className="flex flex-1 flex-col items-start">
                      <span className="text-sm font-medium">Master Report</span>
                    </div>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs uppercase tracking-wider text-muted-foreground">
            FON Modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {modulesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <SidebarMenu>
                {categoryOrder
                  .filter(cat => modulesByCategory[cat]?.length > 0)
                  .map((category) => {
                  const categoryModules = modulesByCategory[category] || [];
                  const CategoryIcon = categoryIcons[category] || BarChart3;
                  const categoryLabel = categoryLabels[category] || category;
                  const hasActiveModule = categoryModules.some(m => isModuleActive(m.id));
                  
                  return (
                    <Collapsible key={category} defaultOpen={hasActiveModule || isModulesSection}>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className="group"
                            data-testid={`nav-category-${category}`}
                          >
                            <CategoryIcon className="h-4 w-4" />
                            <span className="text-sm font-medium flex-1 text-left">{categoryLabel}</span>
                            <Badge variant="secondary" className="text-xs">
                              {categoryModules.length}
                            </Badge>
                            <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-4 border-l pl-2 mt-1 space-y-1">
                            {categoryModules.map((mod) => (
                              <Link key={mod.id} href={`/modules/${mod.id}`}>
                                <SidebarMenuButton
                                  isActive={isModuleActive(mod.id)}
                                  className={`group relative text-sm ${
                                    isModuleActive(mod.id)
                                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                      : ""
                                  }`}
                                  data-testid={`nav-module-${mod.id}`}
                                >
                                  <span className="truncate">{mod.name}</span>
                                </SidebarMenuButton>
                              </Link>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs uppercase tracking-wider text-muted-foreground">
            Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/bulk">
                  <SidebarMenuButton
                    isActive={activeSection === "bulk"}
                    className={`group relative ${
                      activeSection === "bulk"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-r before:bg-primary"
                        : ""
                    }`}
                    data-testid="nav-bulk"
                  >
                    <Sparkles className="h-4 w-4" />
                    <div className="flex flex-1 flex-col items-start">
                      <span className="text-sm font-medium">Bulk Generation</span>
                    </div>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs uppercase tracking-wider text-muted-foreground">
            Configuration Sections
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onSectionChange(item.id)}
                    isActive={activeSection === item.id}
                    className={`group relative ${
                      activeSection === item.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-r before:bg-primary"
                        : ""
                    }`}
                    data-testid={`nav-${item.id}`}
                  >
                    <item.icon className="h-4 w-4" />
                    <div className="flex flex-1 flex-col items-start">
                      <span className="text-sm font-medium">{item.title}</span>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 transition-transform ${
                        activeSection === item.id ? "rotate-90" : ""
                      }`}
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-2">
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-xs text-muted-foreground">Unsaved changes</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Badge
              variant={cmoSafe ? "default" : "secondary"}
              className="text-xs"
            >
              {cmoSafe ? "CMO Safe" : "Not Validated"}
            </Badge>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
