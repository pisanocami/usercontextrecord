/**
 * System-wide constants for the module system
 * Replaces magic numbers throughout the codebase
 */

// DataForSEO Location Codes
export const LOCATION_CODES = {
    US: 2840,
    UK: 2826,
    CA: 2124,
    AU: 2036,
    DE: 2276,
    FR: 2250,
    ES: 2724,
    IT: 2380,
    JP: 2392,
    BR: 2076
} as const;

export const DEFAULT_LOCATION_CODE = LOCATION_CODES.US;

// Keyword limits
export const KEYWORD_LIMITS = {
    MIN: 1,
    DEFAULT: 100,
    MAX: 1000,
    CATEGORY_ANALYSIS: 500
} as const;

// Competitor limits
export const COMPETITOR_LIMITS = {
    MIN: 1,
    DEFAULT: 3,
    MAX: 10
} as const;

// Search volume thresholds
export const SEARCH_VOLUME = {
    HIGH: 10000,
    MEDIUM: 1000,
    LOW: 100
} as const;

// Position thresholds
export const POSITION_THRESHOLDS = {
    PAGE_1_MAX: 10,
    PAGE_2_MAX: 20,
    STRIKING_DISTANCE_MIN: 11,
    STRIKING_DISTANCE_MAX: 20
} as const;

// Scoring weights
export const SCORING_WEIGHTS = {
    VOLUME_HIGH: 30,
    VOLUME_MEDIUM: 20,
    VOLUME_LOW: 5,
    POSITION_STRIKING: 30,
    POSITION_PAGE_3_5: 15,
    CAPABILITY_MATCH: 20,
    STRATEGIC_MATCH: 20
} as const;

// Time ranges for trends
export const TIME_RANGES = {
    ONE_MONTH: "today 1-m",
    THREE_MONTHS: "today 3-m",
    TWELVE_MONTHS: "today 12-m",
    FIVE_YEARS: "today 5-y"
} as const;

// Default capability score
export const DEFAULT_CAPABILITY_SCORE = 50;

// API timeouts (ms)
export const API_TIMEOUTS = {
    DEFAULT: 30000,
    LONG_RUNNING: 60000,
    SHORT: 10000
} as const;

// Cache durations (ms)
export const CACHE_DURATIONS = {
    SHORT: 5 * 60 * 1000,      // 5 minutes
    MEDIUM: 30 * 60 * 1000,    // 30 minutes
    LONG: 24 * 60 * 60 * 1000  // 24 hours
} as const;
