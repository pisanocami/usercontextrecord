import { Home, FileText, BarChart3, Building2, Layers } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  icon: typeof Home;
  href: string;
  matchPaths?: string[];
}

const navItems: NavItem[] = [
  { id: "home", label: "Contexts", icon: Home, href: "/", matchPaths: ["/", "/new"] },
  { id: "brands", label: "Brands", icon: Building2, href: "/brands" },
  { id: "modules", label: "Modules", icon: Layers, href: "/modules" },
  { id: "analysis", label: "Analysis", icon: BarChart3, href: "/keyword-gap", matchPaths: ["/keyword-gap", "/market-demand", "/one-pager"] },
  { id: "bulk", label: "Create", icon: FileText, href: "/bulk" },
];

export function MobileNav() {
  const [location] = useLocation();

  const isActive = (item: NavItem) => {
    if (item.matchPaths) {
      return item.matchPaths.some(path => {
        if (path === "/") return location === "/";
        return location.startsWith(path);
      });
    }
    if (item.href === "/" && location === "/") return true;
    if (item.href !== "/" && location.startsWith(item.href)) return true;
    return false;
  };

  return (
    <nav className="bottom-nav mobile-only" data-testid="mobile-nav" role="navigation" aria-label="Main navigation">
      <div className="flex items-stretch">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          
          return (
            <Link key={item.id} href={item.href} asChild>
              <a
                className={cn(
                  "bottom-nav-item touch-target",
                  active && "active"
                )}
                data-testid={`nav-${item.id}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5 mb-1" aria-hidden="true" />
                <span className="text-[11px] font-medium leading-tight">{item.label}</span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function MobileHeader({ 
  title, 
  subtitle,
  showBack = false,
  onBack,
  rightAction,
}: MobileHeaderProps) {
  return (
    <header 
      className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b bg-background px-4 py-3 safe-area-inset-top mobile-only"
      data-testid="mobile-header"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {showBack && onBack && (
          <button 
            onClick={onBack} 
            className="touch-target flex items-center justify-center -ml-2"
            data-testid="button-back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {rightAction && (
        <div className="shrink-0">{rightAction}</div>
      )}
    </header>
  );
}
