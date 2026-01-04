import { useTenant } from "@/hooks/use-tenant";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, ChevronDown, Check, Plus, Settings } from "lucide-react";

export function TenantSelector() {
  const { currentTenant, userTenants, switchTenant } = useTenant();
  const [, setLocation] = useLocation();

  const handleSwitchTenant = async (tenantId: number) => {
    await switchTenant(tenantId);
  };

  const handleManageTenants = () => {
    setLocation("/tenants");
  };

  if (!currentTenant) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-tenant-selector">
          <div
            className="flex h-5 w-5 items-center justify-center rounded"
            style={{ backgroundColor: currentTenant.primaryColor || "#3B82F6" }}
          >
            <Building2 className="h-3 w-3 text-white" />
          </div>
          <span className="max-w-32 truncate">{currentTenant.name}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {userTenants.map((ut) => (
          <DropdownMenuItem
            key={ut.id}
            onClick={() => handleSwitchTenant(ut.tenant.id)}
            className="gap-2"
            data-testid={`dropdown-tenant-${ut.tenant.id}`}
          >
            <div
              className="flex h-5 w-5 items-center justify-center rounded"
              style={{ backgroundColor: ut.tenant.primaryColor || "#3B82F6" }}
            >
              <Building2 className="h-3 w-3 text-white" />
            </div>
            <span className="flex-1 truncate">{ut.tenant.name}</span>
            {currentTenant.id === ut.tenant.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleManageTenants} className="gap-2" data-testid="dropdown-manage-tenants">
          <Settings className="h-4 w-4" />
          Manage Brands
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
