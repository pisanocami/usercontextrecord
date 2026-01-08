import { Link, useLocation } from "wouter";
import type { LucideIcon } from "lucide-react";
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
  Sparkles,
  List,
  Plus,
  FileText,
  BarChart3,
  Zap,
  History,
  TrendingUp,
  BrainCircuit,
  Lightbulb,
  AlertTriangle,
  Anchor,
  Megaphone,
  Flag,
  Globe
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
import { Button } from "@/components/ui/button";
import { CONTRACT_REGISTRY, ModuleContract } from "@shared/module.contract";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  hasUnsavedChanges?: boolean;
  cmoSafe?: boolean;
}

// Map Module Categories to Icons
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "SEO Signal": Search,
  "Market Trends": TrendingUp,
  "Brand Signal": Megaphone,
  "Market Intelligence": Globe,
  "Action": Zap,
  "Synthesis": BrainCircuit
};

// Map Module Layers to Sidebar Groups (Tab-like structure in future, linear for now)
const LAYER_ORDER = ["Signal", "Synthesis", "Action"];

function ModuleNavItems({
  contracts,
  activeSection,
  onSectionChange
}: {
  contracts: ModuleContract[];
  activeSection: string;
  onSectionChange: (id: string) => void;
}) {
  return (
    <>
      {contracts.map(contract => {
        const Icon = CATEGORY_ICONS[contract.category] || FileText;
        return (
          <SidebarMenuItem key={contract.moduleId}>
            <Link href={`/modules/${contract.moduleId}`}>
              <SidebarMenuButton
                onClick={() => onSectionChange(contract.moduleId)}
                isActive={activeSection === contract.moduleId}
                className={`group relative ${activeSection === contract.moduleId
                  ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-r before:bg-primary"
                  : ""
                  }`}
                data-testid={`nav-${contract.moduleId}`}
              >
                <Icon className="h-4 w-4 text-muted-foreground/70" />
                <div className="flex flex-1 flex-col items-start overflow-hidden">
                  <span className="text-sm font-medium truncate w-full">{contract.name}</span>
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

  // Group contracts by Layer
  const allContracts = Object.values(CONTRACT_REGISTRY);
  const signalModules = allContracts.filter(c => c.layer === "Signal");
  const synthesisModules = allContracts.filter(c => c.layer === "Synthesis");
  const actionModules = allContracts.filter(c => c.layer === "Action");

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Settings className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Brand Intelligence</span>
            <span className="text-xs text-muted-foreground">User Record Context</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">

        {/* Core Configuration */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs uppercase tracking-wider text-muted-foreground">
            Configuration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/">
                  <SidebarMenuButton isActive={activeSection === "list"}>
                    <List className="h-4 w-4" />
                    <span>All Contexts</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/new">
                  <SidebarMenuButton isActive={activeSection === "brand"}>
                    <Plus className="h-4 w-4" />
                    <span>New Context</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Core Sections (Always Visible) */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs uppercase tracking-wider text-muted-foreground">
            Core Definitions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onSectionChange("brand")} isActive={activeSection === "brand"}>
                  <Building2 className="h-4 w-4" />
                  <span>Identity & Brand</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onSectionChange("market-demand")} isActive={activeSection === "market-demand"}>
                  <Users className="h-4 w-4" />
                  <span>Addressable Market</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onSectionChange("strategic")} isActive={activeSection === "strategic"}>
                  <Target className="h-4 w-4" />
                  <span>Strategic Intent</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onSectionChange("negative")} isActive={activeSection === "negative"}>
                  <Ban className="h-4 w-4" />
                  <span>Negative Scope</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dynamic Modules: Signals */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-3 w-3" />
            Growth Signals
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <ModuleNavItems
                contracts={signalModules}
                activeSection={activeSection}
                onSectionChange={onSectionChange}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dynamic Modules: Synthesis */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <BrainCircuit className="h-3 w-3" />
            Synthesis
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <ModuleNavItems
                contracts={synthesisModules}
                activeSection={activeSection}
                onSectionChange={onSectionChange}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dynamic Modules: Actions */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Zap className="h-3 w-3" />
            Actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <ModuleNavItems
                contracts={actionModules}
                activeSection={activeSection}
                onSectionChange={onSectionChange}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="flex flex-col gap-2">
          <Link href="/report/gap">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Shield className="h-4 w-4 mr-2" />
              Compliance Report
            </Button>
          </Link>
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-xs text-muted-foreground">Unsaved changes</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Badge
              variant={cmoSafe ? "default" : "secondary"}
              className="text-xs w-full justify-center"
            >
              {cmoSafe ? "CMO Safe" : "Not Validated"}
            </Badge>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
