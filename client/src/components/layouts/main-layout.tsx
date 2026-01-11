import { ReactNode } from "react";
import { useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
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
import { LogOut, User } from "lucide-react";
import { AlertsPanel } from "@/components/alerts-panel";

interface MainLayoutProps {
  children: ReactNode;
  activeSection?: string;
  hasUnsavedChanges?: boolean;
  cmoSafe?: boolean;
  showAlerts?: boolean;
  onSectionChange?: (section: string) => void;
}

function getSectionFromPath(path: string): string {
  if (path.startsWith("/sections/")) {
    const key = path.replace("/sections/", "");
    const prefix = key.split("_")[0];
    return `section-${prefix}`;
  }
  if (path === "/") return "list";
  if (path.startsWith("/brands")) return "brands";
  if (path.startsWith("/bulk")) return "bulk";
  if (path.startsWith("/modules")) return "module-center";
  if (path.startsWith("/market-demand")) return "market-demand";
  if (path.startsWith("/keyword-gap")) return "keyword-gap";
  if (path.startsWith("/one-pager")) return "one-pager";
  if (path.startsWith("/versions")) return "versions";
  if (path.startsWith("/report")) return "gap-report";
  return "list";
}

export function MainLayout({
  children,
  activeSection,
  hasUnsavedChanges = false,
  cmoSafe = false,
  showAlerts = true,
  onSectionChange,
}: MainLayoutProps) {
  const { user, logout, isLoggingOut } = useAuth();
  const [location] = useLocation();
  
  const computedActiveSection = activeSection || getSectionFromPath(location);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const handleSectionChange = onSectionChange || (() => {});

  return (
    <SidebarProvider style={style as React.CSSProperties} defaultOpen={false}>
      <div className="flex min-h-screen w-full sm:h-screen">
        <AppSidebar
          activeSection={computedActiveSection}
          onSectionChange={handleSectionChange}
          hasUnsavedChanges={hasUnsavedChanges}
          cmoSafe={cmoSafe}
        />
        <div className="flex flex-1 flex-col sm:overflow-hidden">
          <header className="sticky top-0 z-40 flex h-12 sm:h-14 items-center justify-between gap-2 border-b bg-background px-3 sm:gap-4 sm:px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" aria-label="Toggle sidebar" />
            <div className="flex items-center gap-1 sm:gap-2">
              {showAlerts && <AlertsPanel />}
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu" aria-label="User menu">
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
          <main className="flex-1 overflow-auto sm:overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export function HeaderOnlyLayout({ children, showAlerts = true }: { children: ReactNode; showAlerts?: boolean }) {
  const { user, logout, isLoggingOut } = useAuth();

  return (
    <div className="flex min-h-screen w-full flex-col sm:h-screen">
      <header className="sticky top-0 z-40 flex h-12 sm:h-14 items-center justify-between gap-2 border-b bg-background px-3 sm:gap-4 sm:px-4">
        <div />
        <div className="flex items-center gap-1 sm:gap-2">
          {showAlerts && <AlertsPanel />}
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu" aria-label="User menu">
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
      <main className="flex-1 overflow-auto sm:overflow-hidden">
        {children}
      </main>
    </div>
  );
}
