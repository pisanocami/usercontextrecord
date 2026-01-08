/**
 * FON Execution Gateway
 * 
 * Validates UCR completeness before module execution.
 * Injects only required sections into module context.
 * Ensures auditability and reproducibility.
 */

import {
  UCR_SECTION_NAMES,
  getModuleDefinition,
  canModuleExecute,
  type UCRSectionID,
  type DispositionedItem,
  type ItemTrace,
  type Disposition
} from '@shared/module.contract';
import type { Configuration } from '@shared/schema';

export type UCRSection = UCRSectionID;

/**
 * Result of the UCR validation process for a specific module.
 * @property isValid - Whether the configuration meets the module's minimum requirements.
 * @property availableSections - Sections currently filled in the configuration.
 * @property missingSections - Required sections that are missing.
 * @property missingDetails - Human-readable roles and names of missing sections.
 * @property ucrVersion - Unique fingerprint of the configuration state.
 */
export interface UCRValidationResult {
  isValid: boolean;
  moduleId: string;
  moduleName: string;
  availableSections: UCRSection[];
  missingSections: UCRSection[];
  missingDetails: Array<{ section: UCRSection; name: string; role: string }>;
  warnings: string[];
  ucrVersion: string;
}

export interface ModuleExecutionContext {
  moduleId: string;
  ucrVersion: string;
  sectionsUsed: UCRSection[];
  rulesTriggered: string[];
  startedAt: Date;
}

export interface ModuleOutputWrapper<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  context: {
    ucr_version: string;
    sections_used: UCRSection[];
    rules_triggered: string[];
    executed_at: string;
    module_id: string;
  };
}

/**
 * Maps configuration fields to UCR sections
 */
function getAvailableSections(config: Configuration): UCRSection[] {
  const sections: UCRSection[] = [];

  // A - Brand Context (domain is required minimum)
  if (config.brand?.domain) {
    sections.push('A');
  }

  // B - Category Definition
  if (config.category_definition?.primary_category) {
    sections.push('B');
  }

  // C - Competitive Set
  const competitors = config.competitors?.competitors;
  if (competitors && Array.isArray(competitors) && competitors.length > 0) {
    sections.push('C');
  }

  // D - Demand Definition (has brand_keywords or non_brand_keywords defined)
  const demand = config.demand_definition;
  if (
    (demand?.brand_keywords?.seed_terms && demand.brand_keywords.seed_terms.length > 0) ||
    (demand?.non_brand_keywords?.category_terms && demand.non_brand_keywords.category_terms.length > 0)
  ) {
    sections.push('D');
  }

  // E - Strategic Intent (has growth_priority, risk_tolerance, or primary_goal)
  const strategic = config.strategic_intent;
  if (strategic?.growth_priority || strategic?.risk_tolerance || strategic?.primary_goal) {
    sections.push('E');
  }

  // F - Channel Context (has paid_media_active, seo_investment_level, or marketplace_dependence)
  const channels = config.channel_context;
  if (channels?.seo_investment_level || channels?.marketplace_dependence || channels?.paid_media_active !== undefined) {
    sections.push('F');
  }

  // G - Negative Scope
  const negative = config.negative_scope;
  if (
    (negative?.excluded_categories && negative.excluded_categories.length > 0) ||
    (negative?.excluded_keywords && negative.excluded_keywords.length > 0) ||
    (negative?.excluded_use_cases && negative.excluded_use_cases.length > 0)
  ) {
    sections.push('G');
  }

  // H - Governance (check governance fields + top-level scoring_config/capability_model)
  const governance = config.governance;
  const hasGovernanceConfig =
    governance?.context_confidence ||
    governance?.cmo_safe !== undefined ||
    config.scoring_config ||
    config.capability_model;
  if (hasGovernanceConfig) {
    sections.push('H');
  }

  return sections;
}

/**
 * Generates a UCR version string from configuration
 */
function generateUCRVersion(config: Configuration): string {
  const timestamp = config.updated_at
    ? new Date(config.updated_at).getTime()
    : Date.now();
  return `v${config.id}-${timestamp.toString(36)}`;
}

/**
 * Validates if a module can execute with the given configuration
 */
/**
 * Validates if a module can execute with the given configuration.
 * checks for required sections (A-H) and configuration completeness.
 * 
 * @param moduleId - The unique identifier of the module (e.g., 'seo.keyword_gap')
 * @param config - The Brand Intelligence Configuration object
 * @returns A validation result documenting what is missing and if it's safe to run.
 */
export function validateModuleExecution(
  moduleId: string,
  config: Configuration
): UCRValidationResult {
  const module = getModuleDefinition(moduleId);

  if (!module) {
    return {
      isValid: false,
      moduleId,
      moduleName: 'Unknown',
      availableSections: [],
      missingSections: [],
      missingDetails: [],
      warnings: [`Module "${moduleId}" not found in registry`],
      ucrVersion: ''
    };
  }

  const availableSections = getAvailableSections(config);
  const { canExecute, missingSections, warnings } = canModuleExecute(moduleId, availableSections);

  const missingDetails = missingSections.map(section => ({
    section,
    name: UCR_SECTION_NAMES[section],
    role: getSectionRole(section)
  }));

  return {
    isValid: canExecute,
    moduleId,
    moduleName: module.name,
    availableSections,
    missingSections,
    missingDetails,
    warnings,
    ucrVersion: generateUCRVersion(config)
  };
}

function getSectionRole(section: UCRSection): string {
  const roles: Record<UCRSection, string> = {
    'A': 'Define your brand domain and market (geo, language)',
    'B': 'Set your category fence to filter relevant keywords',
    'C': 'Add competitors for gap comparison',
    'D': 'Group keywords into demand themes',
    'E': 'Set strategic posture (aggressive vs conservative)',
    'F': 'Configure channel weights (SEO vs Paid)',
    'G': 'Define exclusions (categories, keywords, use cases)',
    'H': 'Configure scoring thresholds and capability model'
  };
  return roles[section];
}

/**
 * Creates an execution context for a module run
 */
export function createExecutionContext(
  moduleId: string,
  config: Configuration,
  sectionsUsed: UCRSection[]
): ModuleExecutionContext {
  return {
    moduleId,
    ucrVersion: generateUCRVersion(config),
    sectionsUsed,
    rulesTriggered: [],
    startedAt: new Date()
  };
}

/**
 * Wraps module output with UCR traceability
 */
export function wrapModuleOutput<T>(
  data: T | null,
  context: ModuleExecutionContext,
  error: string | null = null
): ModuleOutputWrapper<T> {
  return {
    success: error === null && data !== null,
    data,
    error,
    context: {
      ucr_version: context.ucrVersion,
      sections_used: context.sectionsUsed,
      rules_triggered: context.rulesTriggered,
      executed_at: new Date().toISOString(),
      module_id: context.moduleId
    }
  };
}

/**
 * Adds a triggered rule to the execution context
 */
export function addTriggeredRule(
  context: ModuleExecutionContext,
  rule: string
): void {
  if (!context.rulesTriggered.includes(rule)) {
    context.rulesTriggered.push(rule);
  }
}

/**
 * Common rule identifiers for tracking
 */
export const RULES = {
  NEGATIVE_SCOPE_MATCH: 'negative_scope.match',
  OUTSIDE_CATEGORY_FENCE: 'outside_category_fence',
  COMPETITOR_BRAND_DETECTED: 'competitor_brand.detected',
  SIZE_VARIANT_DETECTED: 'size_variant.detected',
  LOW_CAPABILITY_SCORE: 'low_capability.score',
  GOVERNANCE_THRESHOLD: 'governance.threshold_applied',
  STRATEGIC_AGGRESSIVE: 'strategic.aggressive_posture',
  STRATEGIC_CONSERVATIVE: 'strategic.conservative_posture',
  CHANNEL_SEO_WEIGHTED: 'channel.seo_weighted',
  IRRELEVANT_ENTITY: 'irrelevant_entity.detected'
} as const;

// --- Helper Functions Transferred from keyword-gap-lite for Centralization ---

function normalizeKeyword(keyword: string): string {
  return keyword.toLowerCase().trim().replace(/\s+/g, " ");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Checks if a keyword matches any of the specified exclusions.
 */
export function checkExclusions(
  keyword: string,
  exclusions: {
    excludedCategories?: string[];
    excludedKeywords?: string[];
    excludedUseCases?: string[];
    excludedCompetitors?: string[];
  }
): { hasMatch: boolean; reason: string } {
  const normalizedKw = normalizeKeyword(keyword);
  const allExclusions = [
    ...(exclusions.excludedCategories || []),
    ...(exclusions.excludedKeywords || []),
    ...(exclusions.excludedUseCases || []),
    ...(exclusions.excludedCompetitors || []),
  ].filter(Boolean);

  for (const exclusion of allExclusions) {
    const normalizedExclusion = normalizeKeyword(exclusion);
    if (!normalizedExclusion) continue;

    try {
      const regex = new RegExp(`\\b${escapeRegex(normalizedExclusion)}\\b`, 'i');
      if (regex.test(normalizedKw)) {
        return { hasMatch: true, reason: `Matches exclusion: "${exclusion}"` };
      }
    } catch {
      if (normalizedKw.includes(normalizedExclusion)) {
        return { hasMatch: true, reason: `Matches exclusion: "${exclusion}"` };
      }
    }
  }
  return { hasMatch: false, reason: "" };
}

/**
 * Validates if a keyword falls within the category fence.
 */
export function fenceCheck(
  keyword: string,
  inScopeConcepts: string[],
  demandThemes: string[],
  semanticExtensions: string[] = []
): { inFence: boolean; reason: string; matchType: "core" | "semantic" | "none" } {
  const normalizedKw = normalizeKeyword(keyword);
  const coreConcepts = [
    ...inScopeConcepts.map(c => normalizeKeyword(c)),
    ...demandThemes.map(t => normalizeKeyword(t)),
  ].filter(Boolean);

  const semanticTerms = semanticExtensions.map(s => normalizeKeyword(s)).filter(Boolean);

  if (coreConcepts.length === 0 && semanticTerms.length === 0) {
    return { inFence: true, reason: "No fence defined - auto-pass", matchType: "core" };
  }

  for (const concept of coreConcepts) {
    const conceptTokens = concept.split(" ").filter(t => t.length > 2);
    const keywordTokens = normalizedKw.split(" ");
    if (conceptTokens.some(token => keywordTokens.some(kwToken => kwToken.includes(token) || token.includes(kwToken)))) {
      return { inFence: true, reason: `Matches core: "${concept}"`, matchType: "core" };
    }
  }

  for (const extension of semanticTerms) {
    const extTokens = extension.split(" ").filter(t => t.length > 2);
    const keywordTokens = normalizedKw.split(" ");
    if (extTokens.some(token => keywordTokens.some(kwToken => kwToken.includes(token) || token.includes(kwToken)))) {
      return { inFence: true, reason: `Matches semantic extension: "${extension}"`, matchType: "semantic" };
    }
  }

  return { inFence: false, reason: "Outside category fence - needs review", matchType: "none" };
}

const SPORTS_TEAMS_REGEX = /\b(bulldogs?|crimson tide|wolverines?|buckeyes?|longhorns?|gators?|seminoles?|tigers?|wildcats?|hurricanes?|tar heels?|jayhawks?|spartans?|hoosiers?|hawkeyes?|badgers?|trojans?|bruins?|ducks?|beavers?|cougar|razorbacks?|sooners?|cowboys?|aggies?|bears?|cardinals?|patriots?|raiders?|chiefs?|eagles?|giants?|steelers?|packers?|saints?|falcons?|panthers?|seahawks?|49ers?|broncos?|chargers?|dolphins?|bills?|jets?|colts?|texans?|jaguars?|titans?|ravens?|browns?|bengals?|lions?|vikings?|lakers?|celtics?|warriors?|heat|cavaliers?|thunder|rockets?|spurs?|mavericks?|clippers?|nuggets?|suns?|blazers?|bucks?|hornets?|hawks?|pistons?|pacers?|nets?|knicks?|raptors?|magic?)\b/i;
const COLLEGE_NAMES_REGEX = /\b(alabama|auburn|clemson|ohio state|michigan|texas|florida|georgia|lsu|oklahoma|penn state|notre dame|wisconsin|oregon|usc|ucla|stanford|washington|tennessee|kentucky|kansas|duke|north carolina|unc|arkansas|missouri|mississippi|ole miss|iowa|nebraska|colorado|arizona|arizona state|baylor|tcu|texas a&m|texas tech|virginia|virginia tech|west virginia|maryland|rutgers|indiana|purdue|illinois|northwestern|minnesota|michigan state|iowa state|kansas state|oklahoma state|louisville|cincinnati|south carolina|nc state|wake forest|boston college|syracuse|pittsburgh|miami|florida state|georgia tech|vanderbilt|memphis|houston|byu|smu|tulane|ucf|usf)\b/i;
const IDIOM_PHRASES_REGEX = /\b(walking on water|walk on water|jesus shoes?|walk a mile|if the shoe fits|put yourself in|in someone'?s shoes?|fill (his|her|their|big) shoes?|dead man'?s shoes?|another man'?s shoes?|old woman who lived in a shoe|drop of a hat|when pigs fly|raining cats and dogs|break a leg|hit the hay|piece of cake|cost an arm and a leg|once in a blue moon|under the weather|bite the bullet|spill the beans|let the cat out|burn bridges|jump the shark|throw in the towel)\b/i;

export const VARIANT_TERMS_REGEX = /\b(size\s*\d|wide\s*width|narrow\s*width|4e|2e|w\s*width|mens\s*size|womens\s*size|kids\s*size|black\s+shoe|white\s+shoe|grey\s+shoe|navy\s+shoe)\b/i;
export const SIZE_NUMBERS_REGEX = /\bsize\s*(\d{1,2}\.?\d?)\b/i;

/**
 * Detects keywords that are likely irrelevant entities (sports, idioms, etc.)
 */
export function detectIrrelevantEntity(keyword: string): { isIrrelevant: boolean; reason: string } {
  const normalizedKw = normalizeKeyword(keyword);
  if (SPORTS_TEAMS_REGEX.test(normalizedKw) || COLLEGE_NAMES_REGEX.test(normalizedKw)) {
    if (/\b(shoes?|sneakers?|boots?|footwear|sandals?|slides?|slippers?)\b/i.test(normalizedKw)) {
      return { isIrrelevant: true, reason: "Sports team merchandise keyword" };
    }
  }
  if (IDIOM_PHRASES_REGEX.test(normalizedKw)) {
    return { isIrrelevant: true, reason: "Idiom or non-literal phrase" };
  }
  return { isIrrelevant: false, reason: "" };
}

/**
 * CMO-Safe Gate Processor
 * Processes an individual item (keyword, etc.) through the UCR gates.
 */
export function processItemThroughGates<T>(
  itemData: T,
  itemIdentifier: string,
  config: Configuration
): DispositionedItem<T> {
  const traces: ItemTrace[] = [];
  const reasons: string[] = [];
  let currentDisposition: Disposition = "PASS";

  // --- GATE G: Negative Scope (HARD GATE) ---
  const exclusions = {
    excludedCategories: config.negative_scope?.excluded_categories || [],
    excludedKeywords: config.negative_scope?.excluded_keywords || [],
    excludedUseCases: config.negative_scope?.excluded_use_cases || [],
    excludedCompetitors: config.negative_scope?.excluded_competitors || []
  };

  const exclusionResult = checkExclusions(itemIdentifier, exclusions);
  if (exclusionResult.hasMatch) {
    currentDisposition = "OUT_OF_PLAY";
    reasons.push(exclusionResult.reason);
    traces.push({
      ruleId: RULES.NEGATIVE_SCOPE_MATCH,
      ucrSection: "G",
      reason: exclusionResult.reason,
      severity: "critical"
    });
    return { data: itemData, disposition: currentDisposition, reasons, trace: traces };
  }

  const irrelevanceResult = detectIrrelevantEntity(itemIdentifier);
  if (irrelevanceResult.isIrrelevant) {
    currentDisposition = "OUT_OF_PLAY";
    reasons.push(irrelevanceResult.reason);
    traces.push({
      ruleId: RULES.IRRELEVANT_ENTITY,
      ucrSection: "G",
      reason: irrelevanceResult.reason,
      severity: "high"
    });
    return { data: itemData, disposition: currentDisposition, reasons, trace: traces };
  }

  // --- GATE B: Category Fence (SOFT GATE) ---
  const inScopeConcepts = [
    ...(config.category_definition?.included || []),
    config.category_definition?.primary_category || "",
    ...(config.category_definition?.approved_categories || []),
  ].filter(Boolean);

  const demandThemes = [
    ...(config.demand_definition?.brand_keywords?.seed_terms || []),
    ...(config.demand_definition?.non_brand_keywords?.category_terms || []),
    ...(config.demand_definition?.non_brand_keywords?.problem_terms || []),
  ];

  const fenceResult = fenceCheck(itemIdentifier, inScopeConcepts, demandThemes, config.category_definition?.semantic_extensions);
  if (!fenceResult.inFence) {
    currentDisposition = "REVIEW";
    reasons.push(fenceResult.reason);
    traces.push({
      ruleId: RULES.OUTSIDE_CATEGORY_FENCE,
      ucrSection: "B",
      reason: fenceResult.reason,
      severity: "medium"
    });
  }

  // --- GATE H: Governance & Quality ---
  const governance = config.governance;
  if (governance?.cmo_safe) {
    traces.push({
      ruleId: RULES.GOVERNANCE_THRESHOLD,
      ucrSection: "H",
      reason: "CMO-Safe mode enabled",
      severity: "low"
    });
  }

  // --- GATE E: Strategic Intent ---
  const strategicIntent = config.strategic_intent;
  if (strategicIntent?.risk_tolerance === "low" && currentDisposition === "REVIEW") {
    // Escalate REVIEW to OUT_OF_PLAY for conservative posture
    currentDisposition = "OUT_OF_PLAY";
    reasons.push("Conservative posture: rejecting out-of-fence items");
    traces.push({
      ruleId: RULES.STRATEGIC_CONSERVATIVE,
      ucrSection: "E",
      reason: "Rejected due to low risk tolerance (Conservative)",
      severity: "medium"
    });
  }

  if (strategicIntent?.constraint_flags?.brand_protection_priority) {
    traces.push({
      ruleId: RULES.STRATEGIC_CONSERVATIVE,
      ucrSection: "E",
      reason: "Brand protection priority enabled",
      severity: "low"
    });
  }

  // --- GATE F: Channel Context ---
  const channelContext = config.channel_context;
  if (channelContext?.seo_investment_level) {
    traces.push({
      ruleId: RULES.CHANNEL_SEO_WEIGHTED,
      ucrSection: "F",
      reason: `SEO investment: ${channelContext.seo_investment_level}`,
      severity: "low"
    });
  }

  return {
    data: itemData,
    disposition: currentDisposition,
    reasons,
    trace: traces
  };
}
