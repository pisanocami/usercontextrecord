import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  List,
  Plus,
  Sparkles,
  Search,
  TrendingUp,
  BarChart3,
  FileText,
  History,
  Shield,
  BookOpen,
  Zap,
  BrainCircuit,
  Globe,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  Clock,
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
import { CONTRACT_REGISTRY, ModuleContract } from "@shared/module.contract";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  hasUnsavedChanges?: boolean;
  cmoSafe?: boolean;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "SEO Signal": Search,
  "Market Trends": TrendingUp,
  "Brand Signal": Megaphone,
  "Market Intelligence": Globe,
  "Action": Zap,
  "Synthesis": BrainCircuit,
};

const LAYER_ICONS: Record<string, LucideIcon> = {
  Signal: TrendingUp,
  Synthesis: BrainCircuit,
  Action: Zap,
};

function ModuleNavItems({
  contracts,
  activeSection,
}: {
  contracts: ModuleContract[];
  activeSection: string;
}) {
  return (
    <>
      {contracts.map((contract) => {
        const Icon = CATEGORY_ICONS[contract.category] || FileText;
        return (
          <SidebarMenuItem key={contract.moduleId}>
            <Link href={`/modules/${contract.moduleId}`}>
              <SidebarMenuButton
                isActive={activeSection === contract.moduleId}
                className={`group relative ${
                  activeSection === contract.moduleId
                    ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-r before:bg-primary"
                    : ""
                }`}
                data-testid={`nav-module-${contract.moduleId}`}
              >
                <Icon className="h-4 w-4 text-muted-foreground/70" />
                <div className="flex flex-1 flex-col items-start overflow-hidden">
                  <span className="text-sm font-medium truncate w-full">
                    {contract.name}
                  </span>
                </div>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </>
  );
}

export function AppSidebar({
  activeSection,
  onSectionChange,
  hasUnsavedChanges = false,
  cmoSafe = false,
}: SidebarProps) {
  const allContracts = Object.values(CONTRACT_REGISTRY);
  const signalModules = allContracts.filter((c) => c.layer === "Signal");
  const synthesisModules = allContracts.filter((c) => c.layer === "Synthesis");
  const actionModules = allContracts.filter((c) => c.layer === "Action");

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Brand Intelligence</span>
            <span className="text-xs text-muted-foreground">
              Context-First OS
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {/* CONTEXTOS - Hub Principal */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs uppercase tracking-wider text-muted-foreground">
            Contextos
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/">
                  <SidebarMenuButton
                    isActive={activeSection === "list"}
                    className={
                      activeSection === "list"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : ""
                    }
                    data-testid="nav-contexts-list"
                  >
                    <List className="h-4 w-4" />
                    <span>Mis Contextos</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/new">
                  <SidebarMenuButton
                    isActive={activeSection === "new" || activeSection === "brand"}
                    className={
                      activeSection === "new" || activeSection === "brand"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : ""
                    }
                    data-testid="nav-new-context"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Nuevo Contexto</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/bulk">
                  <SidebarMenuButton
                    isActive={activeSection === "bulk"}
                    className={
                      activeSection === "bulk"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : ""
                    }
                    data-testid="nav-bulk"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Bulk Generation</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/brands">
                  <SidebarMenuButton
                    isActive={activeSection === "brands"}
                    className={
                      activeSection === "brands"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : ""
                    }
                    data-testid="nav-brands"
                  >
                    <Building2 className="h-4 w-4" />
                    <span>Gestión de Brands</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ANÁLISIS - Páginas de análisis existentes */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs uppercase tracking-wider text-muted-foreground">
            Análisis
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/keyword-gap">
                  <SidebarMenuButton
                    isActive={activeSection === "keyword-gap"}
                    className={
                      activeSection === "keyword-gap"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : ""
                    }
                    data-testid="nav-keyword-gap"
                  >
                    <Search className="h-4 w-4" />
                    <span>Keyword Gap</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/market-demand">
                  <SidebarMenuButton
                    isActive={activeSection === "market-demand"}
                    className={
                      activeSection === "market-demand"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : ""
                    }
                    data-testid="nav-market-demand"
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>Market Demand</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/one-pager/latest">
                  <SidebarMenuButton
                    isActive={activeSection === "one-pager"}
                    className={
                      activeSection === "one-pager"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : ""
                    }
                    data-testid="nav-one-pager"
                  >
                    <FileText className="h-4 w-4" />
                    <span>One Pager</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/versions/latest">
                  <SidebarMenuButton
                    isActive={activeSection === "versions"}
                    className={
                      activeSection === "versions"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : ""
                    }
                    data-testid="nav-versions"
                  >
                    <History className="h-4 w-4" />
                    <span>Version History</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* MODULE CENTER - Grupo consolidado con submenu por layer */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <BookOpen className="h-3 w-3" />
            Module Center
            <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
              {allContracts.length}
            </Badge>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/modules">
                  <SidebarMenuButton
                    isActive={activeSection === "module-center"}
                    className={
                      activeSection === "module-center"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : ""
                    }
                    data-testid="nav-module-catalog"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>Ver Catálogo</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              
              {/* Signal Modules */}
              {signalModules.length > 0 && (
                <>
                  <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Signals ({signalModules.length})
                  </div>
                  <ModuleNavItems
                    contracts={signalModules}
                    activeSection={activeSection}
                  />
                </>
              )}
              
              {/* Synthesis Modules */}
              {synthesisModules.length > 0 && (
                <>
                  <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1">
                    <BrainCircuit className="h-3 w-3" />
                    Synthesis ({synthesisModules.length})
                  </div>
                  <ModuleNavItems
                    contracts={synthesisModules}
                    activeSection={activeSection}
                  />
                </>
              )}
              
              {/* Action Modules */}
              {actionModules.length > 0 && (
                <>
                  <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Actions ({actionModules.length})
                  </div>
                  <ModuleNavItems
                    contracts={actionModules}
                    activeSection={activeSection}
                  />
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* GOVERNANCE */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs uppercase tracking-wider text-muted-foreground">
            Governance
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/report/gap">
                  <SidebarMenuButton
                    isActive={activeSection === "gap-report"}
                    className={
                      activeSection === "gap-report"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : ""
                    }
                    data-testid="nav-gap-report"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Compliance Report</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="flex flex-col gap-2">
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-amber-500" />
              <span className="text-xs text-muted-foreground">
                Unsaved changes
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            {cmoSafe ? (
              <Badge
                variant="default"
                className="text-xs w-full justify-center gap-1"
              >
                <CheckCircle2 className="h-3 w-3" />
                CMO Safe
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="text-xs w-full justify-center gap-1"
              >
                <AlertCircle className="h-3 w-3" />
                Not Validated
              </Badge>
            )}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
