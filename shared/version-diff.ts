import type { ConfigurationVersion } from "./schema";

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
  type: "added" | "removed" | "modified";
}

export interface SectionDiff {
  hasChanges: boolean;
  changes: FieldChange[];
}

export interface VersionDiff {
  sections: {
    [sectionName: string]: SectionDiff;
  };
  summary: {
    totalChanges: number;
    sectionsChanged: string[];
  };
}

function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isArray(value: any): value is any[] {
  return Array.isArray(value);
}

function arraysEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));
  const sortedB = [...b].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));
  return JSON.stringify(sortedA) === JSON.stringify(sortedB);
}

function compareValues(oldVal: any, newVal: any, path: string, changes: FieldChange[]): void {
  const oldIsNull = oldVal === null || oldVal === undefined;
  const newIsNull = newVal === null || newVal === undefined;

  if (oldIsNull && newIsNull) {
    return;
  }

  if (oldIsNull && !newIsNull) {
    changes.push({ field: path, oldValue: oldVal, newValue: newVal, type: "added" });
    return;
  }

  if (!oldIsNull && newIsNull) {
    changes.push({ field: path, oldValue: oldVal, newValue: newVal, type: "removed" });
    return;
  }

  if (isArray(oldVal) && isArray(newVal)) {
    if (!arraysEqual(oldVal, newVal)) {
      const added = newVal.filter((item) => {
        const itemStr = JSON.stringify(item);
        return !oldVal.some((oldItem) => JSON.stringify(oldItem) === itemStr);
      });
      const removed = oldVal.filter((item) => {
        const itemStr = JSON.stringify(item);
        return !newVal.some((newItem) => JSON.stringify(newItem) === itemStr);
      });

      if (added.length > 0 || removed.length > 0) {
        changes.push({ field: path, oldValue: oldVal, newValue: newVal, type: "modified" });
      }
    }
    return;
  }

  if (isObject(oldVal) && isObject(newVal)) {
    const allKeys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)]);
    for (const key of allKeys) {
      compareValues(oldVal[key], newVal[key], path ? `${path}.${key}` : key, changes);
    }
    return;
  }

  if (oldVal !== newVal) {
    changes.push({ field: path, oldValue: oldVal, newValue: newVal, type: "modified" });
  }
}

function compareSections(oldSection: any, newSection: any): SectionDiff {
  const changes: FieldChange[] = [];

  if (isObject(oldSection) && isObject(newSection)) {
    const allKeys = new Set([...Object.keys(oldSection), ...Object.keys(newSection)]);
    for (const key of allKeys) {
      compareValues(oldSection[key], newSection[key], key, changes);
    }
  } else {
    if (oldSection !== newSection) {
      changes.push({ field: "", oldValue: oldSection, newValue: newSection, type: "modified" });
    }
  }

  return {
    hasChanges: changes.length > 0,
    changes,
  };
}

export function computeVersionDiff(
  version1: ConfigurationVersion,
  version2: ConfigurationVersion
): VersionDiff {
  const sectionNames = [
    "name",
    "brand",
    "category_definition",
    "competitors",
    "demand_definition",
    "strategic_intent",
    "channel_context",
    "negative_scope",
    "governance",
  ] as const;

  const sections: { [key: string]: SectionDiff } = {};
  const sectionsChanged: string[] = [];
  let totalChanges = 0;

  for (const sectionName of sectionNames) {
    const oldSection = (version1 as any)[sectionName];
    const newSection = (version2 as any)[sectionName];
    const diff = compareSections(oldSection, newSection);
    sections[sectionName] = diff;

    if (diff.hasChanges) {
      sectionsChanged.push(sectionName);
      totalChanges += diff.changes.length;
    }
  }

  return {
    sections,
    summary: {
      totalChanges,
      sectionsChanged,
    },
  };
}

export function getSectionDisplayName(sectionKey: string): string {
  const names: Record<string, string> = {
    name: "Nombre",
    brand: "Marca",
    category_definition: "Categoria",
    competitors: "Competidores",
    demand_definition: "Demanda",
    strategic_intent: "Intento Estrategico",
    channel_context: "Contexto de Canal",
    negative_scope: "Alcance Negativo",
    governance: "Gobernanza",
  };
  return names[sectionKey] || sectionKey;
}

export function formatFieldPath(path: string): string {
  return path
    .split(".")
    .map((part) =>
      part
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())
    )
    .join(" > ");
}

export function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }
  if (typeof value === "string") {
    return value || "-";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.length <= 3 && value.every((v) => typeof v === "string")) {
      return value.join(", ");
    }
    return `[${value.length} items]`;
  }
  if (isObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) return "{}";
    if (keys.length <= 2) {
      return keys.map((k) => `${k}: ${formatValue(value[k])}`).join(", ");
    }
    return `{${keys.length} fields}`;
  }
  return String(value);
}
