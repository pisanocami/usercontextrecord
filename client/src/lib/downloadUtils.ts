import * as XLSX from "xlsx";

export function downloadCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        const stringValue = value === null || value === undefined ? "" : String(value);
        const escaped = stringValue.replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(",")
    )
  ];
  
  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}.csv`);
}

export function downloadXLSX(data: Record<string, unknown>[], filename: string, sheetName = "Data"): void {
  if (data.length === 0) return;
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  const xlsxBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([xlsxBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  triggerDownload(blob, `${filename}.xlsx`);
}

export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
  triggerDownload(blob, `${filename}.md`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatKeywordReportForExport(results: {
  keyword: string;
  searchVolume?: number;
  keywordDifficulty?: number;
  cpc?: number;
  disposition?: string;
  intentType?: string;
  capabilityScore?: number;
  opportunityScore?: number;
  reason?: string;
  reasons?: string[];
}[]): Record<string, unknown>[] {
  return results.map(r => ({
    Keyword: r.keyword,
    "Search Volume": r.searchVolume ?? 0,
    "Keyword Difficulty": r.keywordDifficulty ?? 0,
    CPC: r.cpc ?? 0,
    Disposition: r.disposition ?? "",
    Intent: r.intentType ?? "",
    "Capability Score": r.capabilityScore?.toFixed(2) ?? "",
    "Opportunity Score": r.opportunityScore?.toFixed(2) ?? "",
    Reason: r.reasons?.join("; ") || r.reason || ""
  }));
}

export function formatOnePagerToMarkdown(config: {
  name?: string;
  brand?: {
    name?: string;
    domain?: string;
    industry?: string;
    business_model?: string;
    primary_geography?: string[];
    revenue_band?: string;
    target_market?: string;
  };
  category_definition?: {
    primary_category?: string;
    included?: string[];
    excluded?: string[];
  };
  competitors?: {
    direct?: string[];
    indirect?: string[];
    competitors?: { name?: string; tier?: string; domain?: string }[];
  };
  demand_definition?: {
    brand_keywords?: { seed_terms?: string[] };
    non_brand_keywords?: { category_terms?: string[]; problem_terms?: string[] };
  };
  strategic_intent?: {
    primary_goal?: string;
    growth_priority?: string;
    risk_tolerance?: string;
  };
  channel_context?: {
    seo_investment_level?: string;
    paid_media_active?: boolean;
    marketplace_dependence?: string;
  };
  negative_scope?: {
    excluded_keywords?: string[];
    excluded_categories?: string[];
    excluded_competitors?: string[];
  };
  governance?: {
    context_status?: string;
    quality_score?: { overall?: number; grade?: string };
    last_reviewed?: string;
  };
}): string {
  const lines: string[] = [];
  
  lines.push(`# ${config.name || "Brand Configuration"} - Executive Summary`);
  lines.push("");
  lines.push(`**Generated:** ${new Date().toLocaleDateString()}`);
  lines.push("");
  
  if (config.brand) {
    lines.push("## A. Brand Identity");
    lines.push("");
    lines.push(`- **Name:** ${config.brand.name || "N/A"}`);
    lines.push(`- **Domain:** ${config.brand.domain || "N/A"}`);
    lines.push(`- **Industry:** ${config.brand.industry || "N/A"}`);
    lines.push(`- **Business Model:** ${config.brand.business_model || "N/A"}`);
    lines.push(`- **Geography:** ${config.brand.primary_geography?.join(", ") || "N/A"}`);
    lines.push(`- **Revenue Band:** ${config.brand.revenue_band || "N/A"}`);
    lines.push(`- **Target Market:** ${config.brand.target_market || "N/A"}`);
    lines.push("");
  }
  
  if (config.category_definition) {
    lines.push("## B. Category Definition");
    lines.push("");
    lines.push(`- **Primary Category:** ${config.category_definition.primary_category || "N/A"}`);
    if (config.category_definition.included?.length) {
      lines.push(`- **Included:** ${config.category_definition.included.join(", ")}`);
    }
    if (config.category_definition.excluded?.length) {
      lines.push(`- **Excluded:** ${config.category_definition.excluded.join(", ")}`);
    }
    lines.push("");
  }
  
  if (config.competitors) {
    lines.push("## C. Competitive Set");
    lines.push("");
    if (config.competitors.competitors?.length) {
      lines.push("| Competitor | Tier | Domain |");
      lines.push("|------------|------|--------|");
      config.competitors.competitors.forEach(c => {
        lines.push(`| ${c.name || ""} | ${c.tier || ""} | ${c.domain || ""} |`);
      });
    } else {
      if (config.competitors.direct?.length) {
        lines.push(`- **Direct:** ${config.competitors.direct.join(", ")}`);
      }
      if (config.competitors.indirect?.length) {
        lines.push(`- **Indirect:** ${config.competitors.indirect.join(", ")}`);
      }
    }
    lines.push("");
  }
  
  if (config.demand_definition) {
    lines.push("## D. Demand Definition");
    lines.push("");
    if (config.demand_definition.brand_keywords?.seed_terms?.length) {
      lines.push(`- **Brand Keywords:** ${config.demand_definition.brand_keywords.seed_terms.join(", ")}`);
    }
    if (config.demand_definition.non_brand_keywords?.category_terms?.length) {
      lines.push(`- **Category Terms:** ${config.demand_definition.non_brand_keywords.category_terms.join(", ")}`);
    }
    if (config.demand_definition.non_brand_keywords?.problem_terms?.length) {
      lines.push(`- **Problem Terms:** ${config.demand_definition.non_brand_keywords.problem_terms.join(", ")}`);
    }
    lines.push("");
  }
  
  if (config.strategic_intent) {
    lines.push("## E. Strategic Intent");
    lines.push("");
    lines.push(`- **Primary Goal:** ${config.strategic_intent.primary_goal || "N/A"}`);
    lines.push(`- **Growth Priority:** ${config.strategic_intent.growth_priority || "N/A"}`);
    lines.push(`- **Risk Tolerance:** ${config.strategic_intent.risk_tolerance || "N/A"}`);
    lines.push("");
  }
  
  if (config.channel_context) {
    lines.push("## F. Channel Context");
    lines.push("");
    lines.push(`- **SEO Investment:** ${config.channel_context.seo_investment_level || "N/A"}`);
    lines.push(`- **Paid Media Active:** ${config.channel_context.paid_media_active ? "Yes" : "No"}`);
    lines.push(`- **Marketplace Dependence:** ${config.channel_context.marketplace_dependence || "N/A"}`);
    lines.push("");
  }
  
  if (config.negative_scope) {
    lines.push("## G. Negative Scope");
    lines.push("");
    if (config.negative_scope.excluded_keywords?.length) {
      lines.push(`- **Excluded Keywords:** ${config.negative_scope.excluded_keywords.join(", ")}`);
    }
    if (config.negative_scope.excluded_categories?.length) {
      lines.push(`- **Excluded Categories:** ${config.negative_scope.excluded_categories.join(", ")}`);
    }
    if (config.negative_scope.excluded_competitors?.length) {
      lines.push(`- **Excluded Competitors:** ${config.negative_scope.excluded_competitors.join(", ")}`);
    }
    lines.push("");
  }
  
  if (config.governance) {
    lines.push("## H. Governance");
    lines.push("");
    lines.push(`- **Status:** ${config.governance.context_status || "N/A"}`);
    if (config.governance.quality_score) {
      lines.push(`- **Quality Score:** ${config.governance.quality_score.overall || 0}/100 (${config.governance.quality_score.grade || "N/A"})`);
    }
    lines.push(`- **Last Reviewed:** ${config.governance.last_reviewed || "N/A"}`);
    lines.push("");
  }
  
  lines.push("---");
  lines.push("*Generated by FON Brand Intelligence Platform*");
  
  return lines.join("\n");
}

export function formatVersionHistoryForExport(versions: {
  id?: number;
  configurationId?: number;
  version?: number;
  createdAt?: string;
  changedBy?: string;
  changeType?: string;
  summary?: string;
}[]): Record<string, unknown>[] {
  return versions.map(v => ({
    "Version ID": v.id ?? "",
    "Configuration ID": v.configurationId ?? "",
    Version: v.version ?? "",
    "Created At": v.createdAt ?? "",
    "Changed By": v.changedBy ?? "",
    "Change Type": v.changeType ?? "",
    Summary: v.summary ?? ""
  }));
}
