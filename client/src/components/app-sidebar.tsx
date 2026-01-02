import { Link, useLocation } from "wouter";
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
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Settings className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Brand Intelligence</span>
            <span className="text-xs text-muted-foreground">Configuration</span>
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
