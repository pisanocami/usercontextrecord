import { useState } from "react";
import { useBrand, type BrandEntity } from "@/contexts/brand-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, ChevronDown, Plus, Check, Globe, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function BrandSelector() {
  const { brands, isLoading, selectedBrand, selectBrand, createBrand } = useBrand();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateBrand = async () => {
    if (!newDomain.trim()) {
      toast({
        title: "Domain required",
        description: "Please enter a domain for the new brand",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const brand = await createBrand({ domain: newDomain.trim() });
      selectBrand(brand);
      setShowNewDialog(false);
      setNewDomain("");
      toast({
        title: "Brand created",
        description: `${brand.domain} has been added`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to create brand",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const displayName = selectedBrand?.name || selectedBrand?.domain || "Select Brand";

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between gap-2"
            data-testid="brand-selector-trigger"
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{displayName}</span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : brands.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No brands yet
            </div>
          ) : (
            brands.map((brand) => (
              <DropdownMenuItem
                key={brand.id}
                onClick={() => {
                  selectBrand(brand);
                  setIsOpen(false);
                }}
                className="flex items-center justify-between gap-2"
                data-testid={`brand-option-${brand.id}`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="truncate">
                    <div className="truncate font-medium">
                      {brand.name || brand.domain}
                    </div>
                    {brand.name && (
                      <div className="truncate text-xs text-muted-foreground">
                        {brand.domain}
                      </div>
                    )}
                  </div>
                </div>
                {selectedBrand?.id === brand.id && (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                )}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setShowNewDialog(true);
              setIsOpen(false);
            }}
            data-testid="brand-add-new"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add new brand
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Brand</DialogTitle>
            <DialogDescription>
              Enter the domain of the brand you want to add. Other details can be filled in later or AI-generated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateBrand();
                  }
                }}
                data-testid="input-new-brand-domain"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBrand}
              disabled={isCreating || !newDomain.trim()}
              data-testid="button-create-brand"
            >
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Brand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function BrandBadge() {
  const { selectedBrand } = useBrand();

  if (!selectedBrand) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        No brand selected
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <Globe className="h-3 w-3" />
      {selectedBrand.name || selectedBrand.domain}
    </Badge>
  );
}
