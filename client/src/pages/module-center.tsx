import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  BookOpen,
  Search,
  TrendingUp,
  Zap,
  BrainCircuit,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  FileText,
  Globe,
  Megaphone,
  Info,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CONTRACT_REGISTRY,
  UCR_SECTION_NAMES,
  type ModuleContract,
  type UCRSectionID,
} from "@shared/module.contract";

const LAYER_CONFIG = {
  Signal: {
    icon: TrendingUp,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    description: "Datos externos y señales del mercado",
  },
  Synthesis: {
    icon: BrainCircuit,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    description: "Análisis y síntesis de información",
  },
  Action: {
    icon: Zap,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    description: "Recomendaciones accionables",
  },
};

const CATEGORY_ICONS: Record<string, typeof Search> = {
  "SEO Signal": Search,
  "Market Trends": TrendingUp,
  "Brand Signal": Megaphone,
  "Market Intelligence": Globe,
  Action: Zap,
  Synthesis: BrainCircuit,
};

function SectionBadge({ sectionId, isRequired }: { sectionId: UCRSectionID; isRequired: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={isRequired ? "default" : "outline"}
          className="text-xs"
        >
          {sectionId}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{UCR_SECTION_NAMES[sectionId]}</p>
        <p className="text-xs text-muted-foreground">
          {isRequired ? "Requerido" : "Opcional"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function ModuleCard({ contract }: { contract: ModuleContract }) {
  const Icon = CATEGORY_ICONS[contract.category] || FileText;
  const layerConfig = LAYER_CONFIG[contract.layer];
  const LayerIcon = layerConfig.icon;

  return (
    <Card className="group" data-testid={`card-module-${contract.moduleId}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${layerConfig.bgColor}`}>
              <Icon className={`h-5 w-5 ${layerConfig.color}`} />
            </div>
            <div>
              <CardTitle className="text-base">{contract.name}</CardTitle>
              <CardDescription className="flex items-center gap-1 text-xs">
                <LayerIcon className="h-3 w-3" />
                {contract.layer} / {contract.category}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {contract.version}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {contract.description}
        </p>

        {/* Strategic Question */}
        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Pregunta Estratégica
          </p>
          <p className="text-sm italic">"{contract.strategicQuestion}"</p>
        </div>

        {/* UCR Sections Required */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Secciones UCR
          </p>
          <div className="flex flex-wrap gap-1">
            {contract.contextInjection.requiredSections.map((s) => (
              <SectionBadge key={s} sectionId={s} isRequired={true} />
            ))}
            {contract.contextInjection.optionalSections?.map((s) => (
              <SectionBadge key={s} sectionId={s} isRequired={false} />
            ))}
          </div>
        </div>

        {/* Data Sources */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Globe className="h-3 w-3" />
          <span>
            {contract.dataSources.join(", ")}
          </span>
        </div>

        {/* Execution Gate */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Info className="h-3 w-3" />
                  Status: {contract.executionGate.allowedStatuses.join(", ")}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Estados UCR permitidos para ejecutar este módulo</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Link href={`/modules/${contract.moduleId}`}>
            <Button variant="ghost" size="sm" className="gap-1">
              <PlayCircle className="h-4 w-4" />
              Ejecutar
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function ModuleList({ modules }: { modules: ModuleContract[] }) {
  if (modules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay módulos en esta categoría
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map((contract) => (
        <ModuleCard key={contract.moduleId} contract={contract} />
      ))}
    </div>
  );
}

export default function ModuleCenterPage() {
  const allContracts = Object.values(CONTRACT_REGISTRY);
  const signalModules = allContracts.filter((c) => c.layer === "Signal");
  const synthesisModules = allContracts.filter((c) => c.layer === "Synthesis");
  const actionModules = allContracts.filter((c) => c.layer === "Action");

  return (
    <ScrollArea className="h-full">
      <div className="container max-w-6xl py-6 px-4">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-module-center-title">
              <BookOpen className="h-6 w-6" />
              Module Center
            </h1>
            <p className="text-muted-foreground">
              Catálogo de módulos de análisis disponibles y sus requisitos de contexto
            </p>
          </div>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            {Object.entries(LAYER_CONFIG).map(([layer, config]) => {
              const count =
                layer === "Signal"
                  ? signalModules.length
                  : layer === "Synthesis"
                  ? synthesisModules.length
                  : actionModules.length;
              const Icon = config.icon;

              return (
                <Card key={layer} className={config.bgColor}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-background`}>
                      <Icon className={`h-6 w-6 ${config.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-sm text-muted-foreground">{layer} Modules</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* UCR Section Reference */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="ucr-sections">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Referencia de Secciones UCR
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {(Object.entries(UCR_SECTION_NAMES) as [UCRSectionID, string][]).map(
                    ([id, name]) => (
                      <div
                        key={id}
                        className="flex items-center gap-2 rounded-md border p-2"
                      >
                        <Badge variant="outline" className="font-mono">
                          {id}
                        </Badge>
                        <span className="text-sm">{name}</span>
                      </div>
                    )
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Modules by Layer */}
          <Tabs defaultValue="signal" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signal" className="gap-2" data-testid="tab-signal">
                <TrendingUp className="h-4 w-4" />
                Signal ({signalModules.length})
              </TabsTrigger>
              <TabsTrigger value="synthesis" className="gap-2" data-testid="tab-synthesis">
                <BrainCircuit className="h-4 w-4" />
                Synthesis ({synthesisModules.length})
              </TabsTrigger>
              <TabsTrigger value="action" className="gap-2" data-testid="tab-action">
                <Zap className="h-4 w-4" />
                Action ({actionModules.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="signal" className="mt-4">
              <ModuleList modules={signalModules} />
            </TabsContent>
            <TabsContent value="synthesis" className="mt-4">
              <ModuleList modules={synthesisModules} />
            </TabsContent>
            <TabsContent value="action" className="mt-4">
              <ModuleList modules={actionModules} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ScrollArea>
  );
}
