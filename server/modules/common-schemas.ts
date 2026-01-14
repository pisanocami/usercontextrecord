/**
 * Common Input Schemas
 * Reusable Zod schemas for module input validation
 */

import { z } from "zod";

// Location codes (DataForSEO)
export const LocationCodeSchema = z.number()
    .min(1)
    .max(99999)
    .default(2840)
    .describe("DataForSEO location code (2840 = US)");

// Language codes
export const LanguageCodeSchema = z.string()
    .min(2)
    .max(10)
    .default("en")
    .describe("Language code (en, es, fr, etc.)");

// Limit schemas
export const LimitSchema = z.number()
    .min(1)
    .max(1000)
    .default(100)
    .describe("Maximum number of results");

// Time range schema for trends
export const TimeRangeSchema = z.enum([
    "today 1-m",
    "today 3-m",
    "today 12-m",
    "today 5-y"
]).default("today 12-m");

// Base input schema that all modules can extend
export const BaseModuleInputSchema = z.object({
    locationCode: LocationCodeSchema.optional(),
    languageCode: LanguageCodeSchema.optional()
});

// SEO Module Schemas
export const PriorityScoringInputSchema = z.object({
    limitPerDomain: LimitSchema.default(200),
    locationCode: LocationCodeSchema.optional(),
    minSearchVolume: z.number().min(0).default(0)
});

export const CategoryVisibilityInputSchema = z.object({
    locationCode: LocationCodeSchema.optional()
});

export const LinkAuthorityInputSchema = z.object({
    targetUrl: z.string().optional()
});

export const OSDropInputSchema = z.object({
    locationCode: LocationCodeSchema.optional(),
    dropThreshold: z.number().min(1).max(100).default(10)
});

export const DeprioritizationInputSchema = z.object({
    locationCode: LocationCodeSchema.optional()
});

// Market Module Schemas
export const ShareOfVoiceInputSchema = z.object({
    locationCode: LocationCodeSchema.optional(),
    timeRange: TimeRangeSchema.optional()
});

export const BrandedDemandInputSchema = z.object({
    locationCode: LocationCodeSchema.optional()
});

export const BreakoutTermsInputSchema = z.object({
    locationCode: LocationCodeSchema.optional(),
    threshold: z.number().min(0).default(100)
});

export const CompetitorStrategyInputSchema = z.object({
    locationCode: LocationCodeSchema.optional()
});

export const EmergingCompetitorInputSchema = z.object({
    locationCode: LocationCodeSchema.optional()
});

export const MarketMomentumInputSchema = z.object({
    locationCode: LocationCodeSchema.optional(),
    timeRange: TimeRangeSchema.optional()
});

// Action Module Schemas
export const ActionCardInputSchema = z.object({
    locationCode: LocationCodeSchema.optional(),
    maxActions: z.number().min(1).max(50).default(10)
});

export const PaidOrganicOverlapInputSchema = z.object({
    locationCode: LocationCodeSchema.optional()
});

export const StrategicSummaryInputSchema = z.object({
    includeSections: z.array(z.string()).optional()
});

// Core Module Schemas
export const KeywordGapInputSchema = z.object({
    limitPerDomain: LimitSchema.default(100),
    maxCompetitors: z.number().min(1).max(10).default(3),
    locationCode: LocationCodeSchema.optional(),
    languageCode: LanguageCodeSchema.optional()
});

export const MarketDemandInputSchema = z.object({
    timeRange: z.string().default("today 5-y"),
    countryCode: z.string().optional(),
    excludedCategories: z.array(z.string()).default([])
});

export const BrandAttentionInputSchema = z.object({
    limitPerDomain: LimitSchema.optional(),
    locationCode: LocationCodeSchema.optional()
});
