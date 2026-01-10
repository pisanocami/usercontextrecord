import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  List,
  Plus,
  Sparkles,
  Search,
  TrendingUp,
  FileText,
  History,
  Shield,
  BookOpen,
  Zap,
  BrainCircuit,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Users,
  Target,
  ShieldX,
  FileCheck,
  LayoutGrid,
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

interface NavItemConfig {
  href: string;
  icon: LucideIcon;
  label: string;
  section: string | string[];
  testId: string;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "SEO Signal": Search,
  "Market Trends": TrendingUp,
  "Brand Signal": Megaphone,
};

const CONTEXT_NAV_ITEMS: NavItemConfig[] = [
  { href: "/", icon: List, label: "Mis Contextos", section: "list", testId: "nav-contexts-list" },
  { href: "/new", icon: Plus, label: "Nuevo Contexto", section: ["new", "brand"], testId: "nav-new-context" },
  { href: "/bulk", icon: Sparkles, label: "Bulk Generation", section: "bulk", testId: "nav-bulk" },
  { href: "/brands", icon: Building2, label: "Gestión de Brands", section: "brands", testId: "nav-brands" },
];

const SECTION_NAV_ITEMS: NavItemConfig[] = [
  { href: "/sections/brand", icon: Building2, label: "Brand Identity", section: "section-brand", testId: "nav-section-brand" },
  { href: "/sections/category_definition", icon: Layers, label: "Category Definition", section: "section-category", testId: "nav-section-category" },
  { href: "/sections/competitors", icon: Users, label: "Competitive Set", section: "section-competitors", testId: "nav-section-competitors" },
  { href: "/sections/demand_definition", icon: Search, label: "Demand Definition", section: "section-demand", testId: "nav-section-demand" },
  { href: "/sections/strategic_intent", icon: Target, label: "Strategic Intent", section: "section-strategic", testId: "nav-section-strategic" },
  { href: "/sections/channel_context", icon: Megaphone, label: "Channel Context", section: "section-channel", testId: "nav-section-channel" },
  { href: "/sections/negative_scope", icon: ShieldX, label: "Negative Scope", section: "section-negative", testId: "nav-section-negative" },
  { href: "/sections/governance", icon: FileCheck, label: "Governance", section: "section-governance", testId: "nav-section-governance" },
];

const ANALYSIS_NAV_ITEMS: NavItemConfig[] = [
  { href: "/keyword-gap", icon: Search, label: "Keyword Gap", section: "keyword-gap", testId: "nav-keyword-gap" },
  { href: "/market-demand", icon: TrendingUp, label: "Market Demand", section: "market-demand", testId: "nav-market-demand" },
  { href: "/one-pager/latest", icon: FileText, label: "One Pager", section: "one-pager", testId: "nav-one-pager" },
  { href: "/versions/latest", icon: History, label: "Version History", section: "versions", testId: "nav-versions" },
];

const GOVERNANCE_NAV_ITEMS: NavItemConfig[] = [
  { href: "/report/gap", icon: Shield, label: "Compliance Report", section: "gap-report", testId: "nav-gap-report" },
];

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  testId: string;
}

function NavItem({ href, icon: Icon, label, isActive, testId }: NavItemProps) {
  return (
    <SidebarMenuItem>
      <Link href={href}>
        <SidebarMenuButton
          isActive={isActive}
          className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
          data-testid={testId}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </SidebarMenuButton>
      </Link>
    </SidebarMenuItem>
  );
}

interface NavGroupProps {
  label: string;
  items: NavItemConfig[];
  activeSection: string;
  icon?: LucideIcon;
}

function NavGroup({ label, items, activeSection, icon: GroupIcon }: NavGroupProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="px-2 text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        {GroupIcon && <GroupIcon className="h-3 w-3" />}
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = Array.isArray(item.section)
              ? item.section.includes(activeSection)
              : activeSection === item.section;
            return (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={isActive}
                testId={item.testId}
              />
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function ModuleNavItems({ contracts, activeSection }: { contracts: ModuleContract[]; activeSection: string }) {
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

export function AppSidebar({ activeSection, hasUnsavedChanges = false, cmoSafe = false }: SidebarProps) {
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
            <span className="text-xs text-muted-foreground">Context-First OS</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        <NavGroup label="Contextos" items={CONTEXT_NAV_ITEMS} activeSection={activeSection} />
        <NavGroup label="Sections" items={SECTION_NAV_ITEMS} activeSection={activeSection} icon={LayoutGrid} />
        <NavGroup label="Análisis" items={ANALYSIS_NAV_ITEMS} activeSection={activeSection} />

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
              <NavItem
                href="/modules"
                icon={BookOpen}
                label="Ver Catálogo"
                isActive={activeSection === "module-center"}
                testId="nav-module-catalog"
              />
              {signalModules.length > 0 && (
                <>
                  <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Signals ({signalModules.length})
                  </div>
                  <ModuleNavItems contracts={signalModules} activeSection={activeSection} />
                </>
              )}
              {synthesisModules.length > 0 && (
                <>
                  <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1">
                    <BrainCircuit className="h-3 w-3" />
                    Synthesis ({synthesisModules.length})
                  </div>
                  <ModuleNavItems contracts={synthesisModules} activeSection={activeSection} />
                </>
              )}
              {actionModules.length > 0 && (
                <>
                  <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Actions ({actionModules.length})
                  </div>
                  <ModuleNavItems contracts={actionModules} activeSection={activeSection} />
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <NavGroup label="Governance" items={GOVERNANCE_NAV_ITEMS} activeSection={activeSection} />
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="flex flex-col gap-2">
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-amber-500" />
              <span className="text-xs text-muted-foreground">Unsaved changes</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            {cmoSafe ? (
              <Badge variant="default" className="text-xs w-full justify-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                CMO Safe
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs w-full justify-center gap-1">
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
