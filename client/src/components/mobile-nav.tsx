import { Home, FileText, BarChart3, Settings, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  icon: typeof Home;
  href: string;
}

const navItems: NavItem[] = [
  { id: "home", label: "Home", icon: Home, href: "/" },
  { id: "context", label: "Context", icon: FileText, href: "/brand-context" },
  { id: "new", label: "New", icon: Plus, href: "/bulk" },
  { id: "analysis", label: "Analysis", icon: BarChart3, href: "/" },
  { id: "settings", label: "Settings", icon: Settings, href: "/" },
];

export function MobileNav() {
  const [location] = useLocation();

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <nav className="bottom-nav mobile-only" data-testid="mobile-nav">
      <div className="flex items-stretch">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link key={item.id} href={item.href} asChild>
              <a
                className={cn(
                  "bottom-nav-item",
                  active && "active"
                )}
                data-testid={`nav-${item.id}`}
              >
                <Icon className={cn(
                  "h-5 w-5 mb-0.5",
                  item.id === "new" && "h-6 w-6"
                )} />
                <span className="text-[10px] font-medium">{item.label}</span>
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
