/**
 * Context Comparison Tool - Overlap Metrics Calculator
 * 
 * Functions for calculating overlap between contexts.
 */

import type { Configuration } from "@shared/schema";
import type { OverlapMetrics } from "./types";

/**
 * Calculate the Jaccard similarity between two sets
 */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 100;
  
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  
  if (union.size === 0) return 100;
  return Math.round((intersection.size / union.size) * 100);
}

/**
 * Calculate multi-set overlap (intersection / union across all sets)
 */
function multiSetOverlap(sets: Set<string>[]): { overlap: number; shared: string[] } {
  if (sets.length === 0) return { overlap: 100, shared: [] };
  if (sets.length === 1) return { overlap: 100, shared: [...sets[0]] };

  // Find intersection (items in ALL sets)
  let intersection = new Set(sets[0]);
  for (let i = 1; i < sets.length; i++) {
    intersection = new Set([...intersection].filter((x) => sets[i].has(x)));
  }

  // Find union (items in ANY set)
  const union = new Set(sets.flatMap((s) => [...s]));

  if (union.size === 0) return { overlap: 100, shared: [] };

  const overlap = Math.round((intersection.size / union.size) * 100);
  return { overlap, shared: [...intersection] };
}

/**
 * Extract all competitors from a context
 */
function extractCompetitors(ctx: Configuration): Set<string> {
  const competitors = new Set<string>();
  
  ctx.competitors?.direct?.forEach((c) => competitors.add(c.toLowerCase().trim()));
  ctx.competitors?.indirect?.forEach((c) => competitors.add(c.toLowerCase().trim()));
  ctx.competitors?.marketplaces?.forEach((c) => competitors.add(c.toLowerCase().trim()));
  
  return competitors;
}

/**
 * Extract all keywords from a context
 */
function extractKeywords(ctx: Configuration): Set<string> {
  const keywords = new Set<string>();
  
  ctx.demand_definition?.brand_keywords?.seed_terms?.forEach((k) =>
    keywords.add(k.toLowerCase().trim())
  );
  ctx.demand_definition?.non_brand_keywords?.category_terms?.forEach((k) =>
    keywords.add(k.toLowerCase().trim())
  );
  ctx.demand_definition?.non_brand_keywords?.problem_terms?.forEach((k) =>
    keywords.add(k.toLowerCase().trim())
  );
  
  return keywords;
}

/**
 * Extract all categories from a context
 */
function extractCategories(ctx: Configuration): Set<string> {
  const categories = new Set<string>();
  
  if (ctx.category_definition?.primary_category) {
    categories.add(ctx.category_definition.primary_category.toLowerCase().trim());
  }
  ctx.category_definition?.approved_categories?.forEach((c) =>
    categories.add(c.toLowerCase().trim())
  );
  ctx.category_definition?.included?.forEach((c) =>
    categories.add(c.toLowerCase().trim())
  );
  
  return categories;
}

/**
 * Extract all geographies from a context
 */
function extractGeographies(ctx: Configuration): Set<string> {
  const geographies = new Set<string>();
  
  ctx.brand?.primary_geography?.forEach((g) =>
    geographies.add(g.toLowerCase().trim())
  );
  
  return geographies;
}

/**
 * Calculate overlap metrics between multiple contexts
 */
export function calculateOverlapMetrics(contexts: Configuration[]): OverlapMetrics {
  if (contexts.length < 2) {
    return {
      competitorOverlap: 0,
      keywordOverlap: 0,
      categoryOverlap: 0,
      geographyOverlap: 0,
      overallSimilarity: 0,
      sharedCompetitors: [],
      sharedKeywords: [],
      sharedCategories: [],
      sharedGeographies: [],
    };
  }

  // Extract sets from each context
  const competitorSets = contexts.map(extractCompetitors);
  const keywordSets = contexts.map(extractKeywords);
  const categorySets = contexts.map(extractCategories);
  const geographySets = contexts.map(extractGeographies);

  // Calculate overlaps
  const competitorResult = multiSetOverlap(competitorSets);
  const keywordResult = multiSetOverlap(keywordSets);
  const categoryResult = multiSetOverlap(categorySets);
  const geographyResult = multiSetOverlap(geographySets);

  // Calculate overall similarity (weighted average)
  const weights = {
    competitor: 0.3,
    keyword: 0.3,
    category: 0.25,
    geography: 0.15,
  };

  const overallSimilarity = Math.round(
    competitorResult.overlap * weights.competitor +
    keywordResult.overlap * weights.keyword +
    categoryResult.overlap * weights.category +
    geographyResult.overlap * weights.geography
  );

  return {
    competitorOverlap: competitorResult.overlap,
    keywordOverlap: keywordResult.overlap,
    categoryOverlap: categoryResult.overlap,
    geographyOverlap: geographyResult.overlap,
    overallSimilarity,
    sharedCompetitors: competitorResult.shared,
    sharedKeywords: keywordResult.shared,
    sharedCategories: categoryResult.shared,
    sharedGeographies: geographyResult.shared,
  };
}
