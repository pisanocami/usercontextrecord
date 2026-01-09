import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Layers,
  Users,
  Search,
  Target,
  Megaphone,
  ShieldX,
  FileCheck,
  Globe,
  ExternalLink,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowUpDown,
} from "lucide-react";
import { useState, useMemo } from "react";
import { SECTION_DEFINITIONS, getNestedValue, type SectionDefinition } from "@shared/section-definitions";

const SECTION_ICONS: Record<string, typeof Building2> = {
  Building2,
  Layers,
  Users,
  Search,
  Target,
  Megaphone,
  ShieldX,
  FileCheck,
};

interface SectionItem {
  configId: number;
  configName: string;
  brandName: string;
  brandDomain: string;
  brandIndustry: string;
  validationStatus: string;
  cmoSafe: boolean;
  qualityScore: number;
  updatedAt: string;
  sectionData: Record<string, any>;
}

interface SectionResponse {
  sectionKey: string;
  count: number;
  items: SectionItem[];
}

function renderValue(value: any, isArray?: boolean): string {
  if (value === undefined || value === null) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (isArray && Array.isArray(value)) {
    if (value.length === 0) return "-";
    return value.slice(0, 3).join(", ") + (value.length > 3 ? ` (+${value.length - 3})` : "");
  }
  if (typeof value === "object") return JSON.stringify(value).slice(0, 50);
  return String(value);
}

function ValidationBadge({ status }: { status: string }) {
  switch (status) {
    case "complete":
      return (
        <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Validated
        </Badge>
      );
    case "needs_review":
      return (
        <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
          <Clock className="h-3 w-3 mr-1" />
          Review
        </Badge>
      );
    case "blocked":
      return (
        <Badge className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Blocked
        </Badge>
      );
    default:
      return (
        <Badge className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Incomplete
        </Badge>
      );
  }
}

export default function SectionListPage() {
  const params = useParams<{ sectionKey: string }>();
  const sectionKey = params.sectionKey || "brand";
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string>("brandName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sectionDef = SECTION_DEFINITIONS[sectionKey];

  const { data, isLoading } = useQuery<SectionResponse>({
    queryKey: ["/api", "sections", sectionKey],
  });

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];

    let items = data.items.filter((item) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        item.configName.toLowerCase().includes(query) ||
        item.brandName.toLowerCase().includes(query) ||
        item.brandDomain.toLowerCase().includes(query) ||
        item.brandIndustry.toLowerCase().includes(query)
      );
    });

    items.sort((a, b) => {
      let aVal: any = a[sortField as keyof SectionItem] || "";
      let bVal: any = b[sortField as keyof SectionItem] || "";

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (sortDirection === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });

    return items;
  }, [data, searchQuery, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  if (!sectionDef) {
    return (
      <div className="container max-w-6xl py-6 px-4">
        <Card className="p-8 text-center">
          <h3 className="font-semibold">Section not found</h3>
          <p className="text-sm text-muted-foreground">
            The section "{sectionKey}" does not exist
          </p>
        </Card>
      </div>
    );
  }

  const Icon = SECTION_ICONS[sectionDef.iconName] || FileCheck;
  const displayFields = sectionDef.fields.slice(0, 4);

  return (
    <ScrollArea className="h-full">
      <div className="container max-w-7xl py-6 px-4">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight" data-testid="text-section-title">
                  {sectionDef.title}
                </h1>
                <p className="text-muted-foreground">
                  Compare {sectionDef.title.toLowerCase()} across all brands
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              {data?.count || 0} contexts
            </Badge>
          </div>

          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, domain, or industry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-section"
            />
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-10 w-32" />
                      <Skeleton className="h-10 flex-1" />
                      <Skeleton className="h-10 w-24" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : filteredItems.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">No contexts found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "Try a different search term"
                      : "Create your first context to see data here"}
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("brandName")}
                            className="gap-1 -ml-3"
                            data-testid="sort-brand-name"
                          >
                            Brand
                            <ArrowUpDown className="h-3 w-3" />
                          </Button>
                        </TableHead>
                        <TableHead className="w-[120px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("brandDomain")}
                            className="gap-1 -ml-3"
                            data-testid="sort-domain"
                          >
                            Domain
                            <ArrowUpDown className="h-3 w-3" />
                          </Button>
                        </TableHead>
                        {displayFields.map((field) => (
                          <TableHead key={field.key} className="min-w-[120px]">
                            {field.label}
                          </TableHead>
                        ))}
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="w-[80px]">Score</TableHead>
                        <TableHead className="w-[80px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.configId} data-testid={`row-config-${item.configId}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate max-w-[140px]" title={item.brandName || item.configName}>
                                {item.brandName || item.configName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate max-w-[100px] text-sm" title={item.brandDomain}>
                                {item.brandDomain || "-"}
                              </span>
                            </div>
                          </TableCell>
                          {displayFields.map((field) => {
                            const value = field.isNested
                              ? getNestedValue(item.sectionData, field.key)
                              : item.sectionData?.[field.key];
                            return (
                              <TableCell key={field.key} className="text-sm">
                                <span
                                  className="truncate block max-w-[150px]"
                                  title={renderValue(value, field.isArray)}
                                >
                                  {renderValue(value, field.isArray)}
                                </span>
                              </TableCell>
                            );
                          })}
                          <TableCell>
                            <ValidationBadge status={item.validationStatus} />
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={item.qualityScore >= 75 ? "default" : item.qualityScore >= 50 ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {item.qualityScore}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/new?editId=${item.configId}`}>
                              <Button variant="ghost" size="icon" data-testid={`button-view-${item.configId}`}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
