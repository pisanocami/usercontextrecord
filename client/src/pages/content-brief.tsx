import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  FileText,
  Megaphone,
  Layout,
  Mail,
  Share2,
  Loader2,
  Download,
  AlertTriangle,
  Target,
  MessageSquare,
  ListOrdered,
  Hash,
  Sparkles,
} from "lucide-react";

type BriefType = "seo" | "ad_copy" | "landing_page" | "email" | "social";

interface HeadingStructure {
  h1: string;
  h2s: string[];
  h3s?: string[];
}

interface LandingPageSection {
  title: string;
  content: string;
  cta?: string;
}

interface SocialPost {
  platform: string;
  text: string;
  hashtags?: string[];
}

interface EmailBodyStructure {
  introduction: string;
  body: string;
  conclusion: string;
}

interface ContentBrief {
  type: BriefType;
  title: string;
  generatedAt: string;
  configurationName: string;
  targetKeywords?: string[];
  headingStructure?: HeadingStructure;
  wordCountRange?: { min: number; max: number };
  headlines?: string[];
  descriptions?: string[];
  callsToAction?: string[];
  sections?: LandingPageSection[];
  subjectLines?: string[];
  preheaderText?: string;
  bodyStructure?: EmailBodyStructure;
  posts?: SocialPost[];
  toneOfVoice: string;
  keyMessages: string[];
  avoidTopics: string[];
  guardrailWarnings: string[];
}

interface Configuration {
  id: number;
  name: string;
  brand: {
    name: string;
    domain: string;
  };
}

const BRIEF_TYPES: { value: BriefType; label: string; icon: typeof FileText; description: string }[] = [
  { value: "seo", label: "SEO", icon: FileText, description: "Articulo optimizado para buscadores" },
  { value: "ad_copy", label: "Ad Copy", icon: Megaphone, description: "Copy para campanas publicitarias" },
  { value: "landing_page", label: "Landing Page", icon: Layout, description: "Estructura de pagina de aterrizaje" },
  { value: "email", label: "Email", icon: Mail, description: "Campana de email marketing" },
  { value: "social", label: "Social Media", icon: Share2, description: "Posts para redes sociales" },
];

function briefToMarkdown(brief: ContentBrief): string {
  let md = `# ${brief.title}\n\n`;
  md += `**Tipo:** ${brief.type}\n`;
  md += `**Configuracion:** ${brief.configurationName}\n`;
  md += `**Generado:** ${new Date(brief.generatedAt).toLocaleString("es-ES")}\n\n`;

  md += `## Tono de Voz\n${brief.toneOfVoice}\n\n`;

  md += `## Mensajes Clave\n`;
  brief.keyMessages.forEach((msg, i) => {
    md += `${i + 1}. ${msg}\n`;
  });
  md += "\n";

  if (brief.targetKeywords?.length) {
    md += `## Keywords Objetivo\n`;
    brief.targetKeywords.forEach((kw) => {
      md += `- ${kw}\n`;
    });
    md += "\n";
  }

  if (brief.headingStructure) {
    md += `## Estructura de Encabezados\n`;
    md += `### H1\n${brief.headingStructure.h1}\n\n`;
    md += `### H2s\n`;
    brief.headingStructure.h2s.forEach((h2) => {
      md += `- ${h2}\n`;
    });
    if (brief.headingStructure.h3s?.length) {
      md += `\n### H3s\n`;
      brief.headingStructure.h3s.forEach((h3) => {
        md += `- ${h3}\n`;
      });
    }
    md += "\n";
  }

  if (brief.wordCountRange) {
    md += `## Rango de Palabras\n${brief.wordCountRange.min} - ${brief.wordCountRange.max} palabras\n\n`;
  }

  if (brief.headlines?.length) {
    md += `## Headlines\n`;
    brief.headlines.forEach((h) => {
      md += `- ${h}\n`;
    });
    md += "\n";
  }

  if (brief.descriptions?.length) {
    md += `## Descripciones\n`;
    brief.descriptions.forEach((d) => {
      md += `- ${d}\n`;
    });
    md += "\n";
  }

  if (brief.callsToAction?.length) {
    md += `## Llamados a la Accion\n`;
    brief.callsToAction.forEach((cta) => {
      md += `- ${cta}\n`;
    });
    md += "\n";
  }

  if (brief.sections?.length) {
    md += `## Secciones\n`;
    brief.sections.forEach((section, i) => {
      md += `### ${i + 1}. ${section.title}\n`;
      md += `${section.content}\n`;
      if (section.cta) {
        md += `**CTA:** ${section.cta}\n`;
      }
      md += "\n";
    });
  }

  if (brief.subjectLines?.length) {
    md += `## Lineas de Asunto\n`;
    brief.subjectLines.forEach((line) => {
      md += `- ${line}\n`;
    });
    md += "\n";
  }

  if (brief.preheaderText) {
    md += `## Preheader\n${brief.preheaderText}\n\n`;
  }

  if (brief.bodyStructure) {
    md += `## Estructura del Email\n`;
    md += `### Introduccion\n${brief.bodyStructure.introduction}\n\n`;
    md += `### Cuerpo\n${brief.bodyStructure.body}\n\n`;
    md += `### Conclusion\n${brief.bodyStructure.conclusion}\n\n`;
  }

  if (brief.posts?.length) {
    md += `## Posts por Plataforma\n`;
    brief.posts.forEach((post) => {
      md += `### ${post.platform}\n`;
      md += `${post.text}\n`;
      if (post.hashtags?.length) {
        md += `**Hashtags:** ${post.hashtags.join(" ")}\n`;
      }
      md += "\n";
    });
  }

  md += `## Temas a Evitar\n`;
  brief.avoidTopics.forEach((topic) => {
    md += `- ${topic}\n`;
  });
  md += "\n";

  if (brief.guardrailWarnings.length > 0) {
    md += `## Advertencias de Guardrails\n`;
    brief.guardrailWarnings.forEach((warning) => {
      md += `- ${warning}\n`;
    });
  }

  return md;
}

function SEOBriefView({ brief }: { brief: ContentBrief }) {
  return (
    <div className="space-y-4">
      {brief.targetKeywords && brief.targetKeywords.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Keywords Objetivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {brief.targetKeywords.map((kw, i) => (
                <Badge key={i} variant="secondary">{kw}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {brief.headingStructure && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ListOrdered className="h-4 w-4" />
              Estructura de Encabezados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">H1</Label>
              <p className="font-medium">{brief.headingStructure.h1}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">H2s</Label>
              <ul className="list-disc list-inside space-y-1">
                {brief.headingStructure.h2s.map((h2, i) => (
                  <li key={i}>{h2}</li>
                ))}
              </ul>
            </div>
            {brief.headingStructure.h3s && brief.headingStructure.h3s.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">H3s</Label>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  {brief.headingStructure.h3s.map((h3, i) => (
                    <li key={i}>{h3}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {brief.wordCountRange && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Rango de Palabras</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{brief.wordCountRange.min} - {brief.wordCountRange.max} palabras</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AdCopyBriefView({ brief }: { brief: ContentBrief }) {
  return (
    <div className="space-y-4">
      {brief.headlines && brief.headlines.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Headlines</CardTitle>
            <CardDescription>Titulares cortos para anuncios</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {brief.headlines.map((h, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {brief.descriptions && brief.descriptions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Descripciones</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {brief.descriptions.map((d, i) => (
                <li key={i} className="text-sm">{d}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {brief.callsToAction && brief.callsToAction.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Llamados a la Accion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {brief.callsToAction.map((cta, i) => (
                <Badge key={i} variant="default">{cta}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LandingPageBriefView({ brief }: { brief: ContentBrief }) {
  return (
    <div className="space-y-4">
      {brief.sections && brief.sections.length > 0 && (
        <Accordion type="multiple" className="w-full">
          {brief.sections.map((section, i) => (
            <AccordionItem key={i} value={`section-${i}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{i + 1}</Badge>
                  <span>{section.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <p className="text-sm text-muted-foreground">{section.content}</p>
                  {section.cta && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">CTA:</Label>
                      <Badge variant="default">{section.cta}</Badge>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

function EmailBriefView({ brief }: { brief: ContentBrief }) {
  return (
    <div className="space-y-4">
      {brief.subjectLines && brief.subjectLines.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lineas de Asunto</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {brief.subjectLines.map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                  <span className="text-sm">{line}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {brief.preheaderText && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Preheader</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{brief.preheaderText}</p>
          </CardContent>
        </Card>
      )}

      {brief.bodyStructure && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Estructura del Cuerpo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Introduccion</Label>
              <p className="text-sm">{brief.bodyStructure.introduction}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Cuerpo</Label>
              <p className="text-sm">{brief.bodyStructure.body}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Conclusion</Label>
              <p className="text-sm">{brief.bodyStructure.conclusion}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {brief.callsToAction && brief.callsToAction.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">CTAs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {brief.callsToAction.map((cta, i) => (
                <Badge key={i} variant="default">{cta}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SocialBriefView({ brief }: { brief: ContentBrief }) {
  return (
    <div className="space-y-4">
      {brief.posts && brief.posts.length > 0 && (
        <Accordion type="multiple" className="w-full" defaultValue={brief.posts.map((_, i) => `post-${i}`)}>
          {brief.posts.map((post, i) => (
            <AccordionItem key={i} value={`post-${i}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{post.platform}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <p className="text-sm whitespace-pre-wrap">{post.text}</p>
                  {post.hashtags && post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {post.hashtags.map((tag, j) => (
                        <Badge key={j} variant="outline" className="text-xs">
                          <Hash className="h-3 w-3 mr-1" />
                          {tag.replace(/^#/, "")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

function BriefTypeContent({ brief }: { brief: ContentBrief }) {
  switch (brief.type) {
    case "seo":
      return <SEOBriefView brief={brief} />;
    case "ad_copy":
      return <AdCopyBriefView brief={brief} />;
    case "landing_page":
      return <LandingPageBriefView brief={brief} />;
    case "email":
      return <EmailBriefView brief={brief} />;
    case "social":
      return <SocialBriefView brief={brief} />;
    default:
      return null;
  }
}

export default function ContentBriefPage() {
  const params = useParams<{ id: string }>();
  const configId = parseInt(params.id || "0", 10);
  const { toast } = useToast();

  const [selectedType, setSelectedType] = useState<BriefType>("seo");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [generatedBrief, setGeneratedBrief] = useState<ContentBrief | null>(null);

  const { data: config, isLoading: isLoadingConfig } = useQuery<Configuration>({
    queryKey: ["/api/configurations", configId],
    enabled: configId > 0,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const keywordsArray = keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const response = await apiRequest("POST", `/api/configurations/${configId}/generate-brief`, {
        type: selectedType,
        topic: topic.trim() || undefined,
        keywords: keywordsArray.length > 0 ? keywordsArray : undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.brief) {
        setGeneratedBrief(data.brief);
        if (data.brief.guardrailWarnings?.length > 0) {
          toast({
            title: "Brief generado con advertencias",
            description: `Se detectaron ${data.brief.guardrailWarnings.length} posibles violaciones de guardrails.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Brief generado",
            description: "El contenido brief se genero exitosamente.",
          });
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error al generar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExportMarkdown = () => {
    if (!generatedBrief) return;
    const md = briefToMarkdown(generatedBrief);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-brief-${generatedBrief.type}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoadingConfig) {
    return (
      <div className="h-full p-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="container max-w-5xl py-6 px-4">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Generador de Content Briefs</h1>
            <p className="text-muted-foreground">
              {config?.brand?.name || config?.name} - {config?.brand?.domain}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,1.5fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuracion del Brief</CardTitle>
                <CardDescription>
                  Selecciona el tipo de contenido y parametros opcionales
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de Brief</Label>
                  <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as BriefType)}>
                    <TabsList className="grid grid-cols-5 h-auto">
                      {BRIEF_TYPES.map((type) => (
                        <TabsTrigger
                          key={type.value}
                          value={type.value}
                          className="flex flex-col gap-1 py-2"
                          data-testid={`tab-${type.value}`}
                        >
                          <type.icon className="h-4 w-4" />
                          <span className="text-xs">{type.label}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  <p className="text-xs text-muted-foreground">
                    {BRIEF_TYPES.find((t) => t.value === selectedType)?.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topic">Tema (opcional)</Label>
                  <Input
                    id="topic"
                    placeholder="Ej: Guia de recuperacion post-ejercicio"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    data-testid="input-topic"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">Keywords objetivo (opcional)</Label>
                  <Input
                    id="keywords"
                    placeholder="keyword1, keyword2, keyword3"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    data-testid="input-keywords"
                  />
                  <p className="text-xs text-muted-foreground">Separar con comas</p>
                </div>

                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  className="w-full"
                  data-testid="button-generate-brief"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generar Brief
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {generateMutation.isPending && (
              <Card>
                <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Generando brief con IA...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {generatedBrief && !generateMutation.isPending && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                      <CardTitle>{generatedBrief.title}</CardTitle>
                      <CardDescription>
                        Generado el {new Date(generatedBrief.generatedAt).toLocaleString("es-ES")}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportMarkdown}
                      data-testid="button-export-markdown"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Exportar MD
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {generatedBrief.guardrailWarnings.length > 0 && (
                      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="font-medium text-destructive">Advertencias de Guardrails</span>
                        </div>
                        <ul className="text-sm text-destructive/80 space-y-1">
                          {generatedBrief.guardrailWarnings.map((warning, i) => (
                            <li key={i}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Tono de Voz</Label>
                        <p className="text-sm">{generatedBrief.toneOfVoice}</p>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Mensajes Clave</Label>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {generatedBrief.keyMessages.map((msg, i) => (
                            <li key={i}>{msg}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <BriefTypeContent brief={generatedBrief} />

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Temas a Evitar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {generatedBrief.avoidTopics.map((topic, i) => (
                        <Badge key={i} variant="destructive" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {!generatedBrief && !generateMutation.isPending && (
              <Card className="border-dashed">
                <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                    <FileText className="h-12 w-12 opacity-50" />
                    <p>Selecciona un tipo y genera tu brief</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
