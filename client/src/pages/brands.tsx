import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Globe,
  ExternalLink,
  Search,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Brand {
  id: number;
  domain: string;
  name: string;
  industry: string;
  business_model: string;
  primary_geography: string[];
  revenue_band: string;
  target_market: string;
  created_at: string;
  updated_at: string;
}

interface BrandFormData {
  domain: string;
  name: string;
  industry: string;
  business_model: string;
  primary_geography: string[];
  revenue_band: string;
  target_market: string;
}

const defaultBrandForm: BrandFormData = {
  domain: "",
  name: "",
  industry: "",
  business_model: "DTC",
  primary_geography: ["US"],
  revenue_band: "unknown",
  target_market: "",
};

const BUSINESS_MODELS = ["B2B", "DTC", "Marketplace", "Hybrid"];
const REVENUE_BANDS = ["<1M", "1M-10M", "10M-50M", "50M-100M", "100M-500M", "500M+", "unknown"];

export default function BrandsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [deleteConfirmBrand, setDeleteConfirmBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState<BrandFormData>(defaultBrandForm);

  const { data: brands, isLoading } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: BrandFormData) => {
      const res = await apiRequest("POST", "/api/brands", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      setIsCreateOpen(false);
      setFormData(defaultBrandForm);
      toast({ title: "Brand created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error creating brand", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: BrandFormData }) => {
      const res = await apiRequest("PUT", `/api/brands/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      setEditingBrand(null);
      setFormData(defaultBrandForm);
      toast({ title: "Brand updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating brand", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/brands/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      setDeleteConfirmBrand(null);
      toast({ title: "Brand deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting brand", description: error.message, variant: "destructive" });
    },
  });

  const filteredBrands = brands?.filter(
    (brand) =>
      brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = () => {
    if (editingBrand) {
      updateMutation.mutate({ id: editingBrand.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (brand: Brand) => {
    setFormData({
      domain: brand.domain,
      name: brand.name,
      industry: brand.industry,
      business_model: brand.business_model,
      primary_geography: brand.primary_geography,
      revenue_band: brand.revenue_band,
      target_market: brand.target_market,
    });
    setEditingBrand(brand);
  };

  const BrandForm = () => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="domain">Domain</Label>
        <Input
          id="domain"
          placeholder="example.com"
          value={formData.domain}
          onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
          data-testid="input-brand-domain"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="name">Brand Name</Label>
        <Input
          id="name"
          placeholder="Brand Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          data-testid="input-brand-name"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="industry">Industry</Label>
        <Input
          id="industry"
          placeholder="e.g., Footwear, Technology"
          value={formData.industry}
          onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
          data-testid="input-brand-industry"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="business_model">Business Model</Label>
          <Select
            value={formData.business_model}
            onValueChange={(value) => setFormData({ ...formData, business_model: value })}
          >
            <SelectTrigger data-testid="select-business-model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_MODELS.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="revenue_band">Revenue Band</Label>
          <Select
            value={formData.revenue_band}
            onValueChange={(value) => setFormData({ ...formData, revenue_band: value })}
          >
            <SelectTrigger data-testid="select-revenue-band">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REVENUE_BANDS.map((band) => (
                <SelectItem key={band} value={band}>
                  {band}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="target_market">Target Market</Label>
        <Input
          id="target_market"
          placeholder="e.g., Health-conscious consumers"
          value={formData.target_market}
          onChange={(e) => setFormData({ ...formData, target_market: e.target.value })}
          data-testid="input-target-market"
        />
      </div>
    </div>
  );

  return (
    <ScrollArea className="h-full">
      <div className="container max-w-6xl py-6 px-4">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-brands-title">
                <Building2 className="h-6 w-6" />
                Gestión de Brands
              </h1>
              <p className="text-muted-foreground">
                Administra entidades de marca reutilizables para múltiples contextos
              </p>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-brand">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Brand
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nueva Brand</DialogTitle>
                  <DialogDescription>
                    Agrega una nueva entidad de marca para reutilizar en múltiples contextos.
                  </DialogDescription>
                </DialogHeader>
                <BrandForm />
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || !formData.domain}
                    data-testid="button-submit-create"
                  >
                    {createMutation.isPending ? "Creando..." : "Crear Brand"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-brands"
            />
          </div>

          {/* Brands Grid */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredBrands?.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">No hay brands</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "Intenta con otro término de búsqueda" : "Crea tu primera brand para comenzar"}
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBrands?.map((brand) => (
                <Card key={brand.id} data-testid={`card-brand-${brand.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{brand.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 truncate">
                          <Globe className="h-3 w-3 flex-shrink-0" />
                          {brand.domain}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-brand-menu-${brand.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(brand)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a
                              href={`https://${brand.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Visitar sitio
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteConfirmBrand(brand)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {brand.industry && (
                        <Badge variant="secondary">{brand.industry}</Badge>
                      )}
                      <Badge variant="outline">{brand.business_model}</Badge>
                      {brand.revenue_band !== "unknown" && (
                        <Badge variant="outline">{brand.revenue_band}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingBrand} onOpenChange={(open) => !open && setEditingBrand(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Brand</DialogTitle>
            <DialogDescription>
              Actualiza la información de la brand.
            </DialogDescription>
          </DialogHeader>
          <BrandForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBrand(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={updateMutation.isPending}
              data-testid="button-submit-edit"
            >
              {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmBrand} onOpenChange={(open) => !open && setDeleteConfirmBrand(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Brand</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La brand "{deleteConfirmBrand?.name}" será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmBrand && deleteMutation.mutate(deleteConfirmBrand.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollArea>
  );
}
