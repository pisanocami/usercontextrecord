import type { CapabilityModel, ScoringConfig } from "@shared/schema";

export const DTC_FOOTWEAR_CAPABILITY: CapabilityModel = {
  base_score: 0.5,
  boosters: [
    { pattern: "recovery|recover|post.?workout|after.?run|post.?run", weight: 0.55, label: "Recovery focus" },
    { pattern: "sandals?|slides?|flip.?flops?|clogs?|slippers?", weight: 0.25, label: "Category match" },
    { pattern: "plantar fasciitis|arch support|foot pain|heel pain|bunions?|flat feet", weight: 0.40, label: "Pain/condition" },
    { pattern: "comfort|comfortable|cushion|soft", weight: 0.20, label: "Comfort focus" },
    { pattern: "nurses?|nursing|doctors?|healthcare|hospital|standing all day", weight: 0.25, label: "Professional" },
    { pattern: "orthopedic|ortho|supportive|therapeutic", weight: 0.30, label: "Medical" },
    { pattern: "shower shoes?|pool shoes?|water.?proof|beach|spa", weight: 0.20, label: "Water/spa" },
    { pattern: "eva foam|eva material|foam shoes?", weight: 0.15, label: "Material" },
  ],
  penalties: [
    { pattern: "running shoes?|hiking boots?|marathon training|trail running", weight: -0.60, label: "Performance athletics" },
    { pattern: "basketball|soccer|football|tennis|golf|climbing", weight: -0.55, label: "Sport-specific" },
    { pattern: "steel toe|work boots?|safety shoes?", weight: -0.45, label: "Industrial" },
    { pattern: "dress shoes?|heels|formal|loafers?|oxfords?", weight: -0.45, label: "Formal wear" },
    { pattern: "kids?|children|baby|infant|toddler", weight: -0.20, label: "Children" },
  ],
  common_brands: [
    "hoka", "birkenstock", "crocs", "brooks", "asics", "new balance",
    "nike", "adidas", "saucony", "vionic", "orthofeet", "propet", "drew",
    "alegria", "dansko", "merrell", "keen", "teva", "chaco", "altra",
    "skechers", "clarks", "ecco", "sperry", "ugg", "reef", "kane"
  ],
};

export const DTC_FOOTWEAR_SCORING: ScoringConfig = {
  pass_threshold: 0.55,
  review_threshold: 0.30,
  difficulty_weight: 0.5,
  position_weight: 0.5,
  vertical_preset: "dtc_footwear",
  priority_themes: ["recovery", "plantar fasciitis", "arch support", "foot pain"],
};

export const RETAIL_BIG_BOX_CAPABILITY: CapabilityModel = {
  base_score: 0.5,
  boosters: [
    { pattern: "home improvement|hardware|tools|plumbing|electrical", weight: 0.50, label: "Category match" },
    { pattern: "diy|how to|install|repair|fix", weight: 0.35, label: "DIY intent" },
    { pattern: "contractor|professional|commercial", weight: 0.30, label: "Pro customer" },
    { pattern: "kitchen|bathroom|flooring|paint|lumber", weight: 0.25, label: "Department" },
    { pattern: "outdoor|garden|patio|lawn", weight: 0.20, label: "Outdoor/garden" },
  ],
  penalties: [
    { pattern: "food|grocery|clothing|fashion|electronics", weight: -0.55, label: "Off-category" },
    { pattern: "furniture|decor|home decor", weight: -0.30, label: "Decor focus" },
  ],
  common_brands: [
    "lowes", "menards", "ace hardware", "true value", "walmart", "amazon",
    "costco", "target", "harbor freight", "northern tool"
  ],
};

export const RETAIL_BIG_BOX_SCORING: ScoringConfig = {
  pass_threshold: 0.55,
  review_threshold: 0.30,
  difficulty_weight: 0.4,
  position_weight: 0.6,
  vertical_preset: "retail_big_box",
  priority_themes: ["diy", "home improvement", "contractor"],
};

export const B2B_SAAS_CAPABILITY: CapabilityModel = {
  base_score: 0.5,
  boosters: [
    { pattern: "software|platform|tool|solution|system", weight: 0.30, label: "Software focus" },
    { pattern: "enterprise|business|company|organization", weight: 0.25, label: "B2B intent" },
    { pattern: "integration|api|workflow|automation", weight: 0.35, label: "Technical" },
    { pattern: "roi|cost|pricing|budget|save", weight: 0.20, label: "Value focus" },
    { pattern: "demo|trial|free|sign up|pricing", weight: 0.40, label: "Conversion intent" },
  ],
  penalties: [
    { pattern: "free|personal|individual|home", weight: -0.25, label: "Consumer focus" },
    { pattern: "tutorial|learn|course|training", weight: -0.15, label: "Educational" },
  ],
  common_brands: [],
};

export const B2B_SAAS_SCORING: ScoringConfig = {
  pass_threshold: 0.50,
  review_threshold: 0.25,
  difficulty_weight: 0.6,
  position_weight: 0.4,
  vertical_preset: "b2b_saas",
  priority_themes: ["enterprise", "integration", "automation"],
};

export const DEFAULT_CAPABILITY: CapabilityModel = {
  base_score: 0.5,
  boosters: [],
  penalties: [],
  common_brands: [],
};

export const DEFAULT_SCORING: ScoringConfig = {
  pass_threshold: 0.50,
  review_threshold: 0.25,
  difficulty_weight: 0.5,
  position_weight: 0.5,
  vertical_preset: "custom",
  priority_themes: [],
};

export type PresetName = "dtc_footwear" | "retail_big_box" | "b2b_saas" | "custom";

export function getCapabilityPreset(name?: string): CapabilityModel {
  switch (name) {
    case "dtc_footwear":
      return DTC_FOOTWEAR_CAPABILITY;
    case "retail_big_box":
      return RETAIL_BIG_BOX_CAPABILITY;
    case "b2b_saas":
      return B2B_SAAS_CAPABILITY;
    default:
      return DEFAULT_CAPABILITY;
  }
}

export function getScoringPreset(name?: string): ScoringConfig {
  switch (name) {
    case "dtc_footwear":
      return DTC_FOOTWEAR_SCORING;
    case "retail_big_box":
      return RETAIL_BIG_BOX_SCORING;
    case "b2b_saas":
      return B2B_SAAS_SCORING;
    default:
      return DEFAULT_SCORING;
  }
}

export const VERTICAL_PRESETS = [
  { id: "dtc_footwear", name: "DTC Footwear", description: "Recovery footwear, comfort shoes (OOFOS, Vionic)" },
  { id: "retail_big_box", name: "Retail Big Box", description: "Home improvement, hardware (Home Depot, Lowes)" },
  { id: "b2b_saas", name: "B2B SaaS", description: "Enterprise software, business tools" },
  { id: "custom", name: "Custom", description: "Custom configuration" },
];
