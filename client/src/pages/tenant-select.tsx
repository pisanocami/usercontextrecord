import { useState } from "react";
import { useTenant } from "@/hooks/use-tenant";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Building2, Check, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

const createTenantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
});

type CreateTenantForm = z.infer<typeof createTenantSchema>;

export default function TenantSelect() {
  const { userTenants, currentTenant, switchTenant, createTenant, isLoading } = useTenant();
  const [, setLocation] = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateTenantForm>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
    },
  });

  const handleSelectTenant = async (tenantId: number) => {
    await switchTenant(tenantId);
    setLocation("/");
  };

  const handleCreateTenant = async (data: CreateTenantForm) => {
    setIsCreating(true);
    try {
      await createTenant(data);
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Tenant created",
        description: `${data.name} has been created successfully.`,
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create tenant",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleNameChange = (name: string) => {
    form.setValue("name", name);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    form.setValue("slug", slug);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Select a Brand</h1>
          <p className="mt-2 text-muted-foreground">
            Choose a brand to work with or create a new one
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {userTenants.map((ut) => (
            <Card
              key={ut.id}
              className={`cursor-pointer transition-colors hover-elevate ${
                currentTenant?.id === ut.tenant.id ? "border-primary" : ""
              }`}
              onClick={() => handleSelectTenant(ut.tenant.id)}
              data-testid={`card-tenant-${ut.tenant.id}`}
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-md"
                  style={{ backgroundColor: ut.tenant.primaryColor || "#3B82F6" }}
                >
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {ut.tenant.name}
                    {currentTenant?.id === ut.tenant.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </CardTitle>
                  <CardDescription>{ut.tenant.slug}</CardDescription>
                </div>
              </CardHeader>
              {ut.tenant.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{ut.tenant.description}</p>
                </CardContent>
              )}
            </Card>
          ))}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Card className="flex cursor-pointer flex-col items-center justify-center border-dashed hover-elevate" data-testid="card-create-tenant">
                <CardContent className="flex flex-col items-center gap-2 py-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium">Create New Brand</p>
                  <p className="text-sm text-muted-foreground">Add a new brand to manage</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Brand</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateTenant)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="My Brand"
                            data-testid="input-tenant-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="my-brand" data-testid="input-tenant-slug" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Brief description of the brand" data-testid="input-tenant-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating} data-testid="button-create-tenant">
                      {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Brand
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {userTenants.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            You don't have any brands yet. Create your first brand to get started.
          </p>
        )}
      </div>
    </div>
  );
}
