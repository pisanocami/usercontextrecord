import { useState } from "react";
import { useBrand } from "@/hooks/use-brand";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, Plus, Building2, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function BrandSelector() {
  const { activeBrand, brands, isLoading, setActiveBrand, createBrand, isCreating } = useBrand();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandDomain, setNewBrandDomain] = useState("");
  const { toast } = useToast();

  const handleCreateBrand = async () => {
    if (!newBrandName.trim() || !newBrandDomain.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Ingresa el nombre de la marca y el dominio",
        variant: "destructive",
      });
      return;
    }

    try {
      await createBrand(newBrandName.trim(), newBrandDomain.trim());
      toast({
        title: "Marca creada",
        description: "Se está generando el contexto automáticamente...",
      });
      setShowCreateDialog(false);
      setNewBrandName("");
      setNewBrandDomain("");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la marca",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando...
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 min-w-[200px] justify-between" data-testid="button-brand-selector">
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {activeBrand?.brand?.name || activeBrand?.name || "Seleccionar marca"}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[250px]">
          {brands.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              No hay marcas configuradas
            </div>
          ) : (
            brands.map((brand) => (
              <DropdownMenuItem
                key={brand.id}
                onClick={() => {
                  setActiveBrand(brand.id);
                  setIsOpen(false);
                }}
                className="flex items-center justify-between gap-2"
                data-testid={`brand-option-${brand.id}`}
              >
                <span className="truncate">{brand.brand?.name || brand.name || `Marca ${brand.id}`}</span>
                {brand.id === activeBrand?.id && (
                  <Badge variant="secondary" className="shrink-0">Activa</Badge>
                )}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setIsOpen(false);
              setShowCreateDialog(true);
            }}
            className="gap-2"
            data-testid="button-create-brand"
          >
            <Plus className="h-4 w-4" />
            Crear nueva marca
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Crear Nueva Marca
            </DialogTitle>
            <DialogDescription>
              Al crear la marca, el contexto completo se generará automáticamente con IA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="brand-name">Nombre de la marca</Label>
              <Input
                id="brand-name"
                placeholder="Ej: Apple, Nike, Tesla..."
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                disabled={isCreating}
                data-testid="input-brand-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-domain">Dominio web</Label>
              <Input
                id="brand-domain"
                placeholder="Ej: apple.com, nike.com..."
                value={newBrandDomain}
                onChange={(e) => setNewBrandDomain(e.target.value)}
                disabled={isCreating}
                data-testid="input-brand-domain"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={isCreating}>
              Cancelar
            </Button>
            <Button onClick={handleCreateBrand} disabled={isCreating} className="gap-2" data-testid="button-confirm-create-brand">
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando contexto...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Crear y generar contexto
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
