/**
 * Module Center Test Script
 * Tests all registered modules against a valid configuration
 */

const CONFIG_ID = 72; // Oofos configuration (has complete UCR)

const ALL_MODULES = [
  { id: "seo.keyword_gap_visibility.v1", name: "Keyword Gap & Visibility", layer: "Signal" },
  { id: "market.category_demand_trend.v1", name: "Category Demand Trend", layer: "Signal" },
  { id: "brand.attention_share.v1", name: "Brand Attention & Share of Search", layer: "Signal" },
  { id: "market.demand_seasonality.v1", name: "Market Demand & Seasonality", layer: "Signal" },
  { id: "action.card_generator.v1", name: "Action Cards", layer: "Action" },
  { id: "action.priority_scoring.v1", name: "Priority Scoring", layer: "Action" },
  { id: "signal.branded_demand.v1", name: "Branded vs Non-Branded", layer: "Signal" },
  { id: "signal.breakout_terms.v1", name: "Breakout Terms", layer: "Signal" },
  { id: "signal.category_visibility.v1", name: "Category Visibility", layer: "Signal" },
  { id: "signal.competitor_strategy.v1", name: "Competitor Strategy", layer: "Signal" },
  { id: "action.deprioritization.v1", name: "Deprioritization Flags", layer: "Action" },
  { id: "signal.emerging_competitor.v1", name: "Emerging Competitor Watch", layer: "Signal" },
  { id: "signal.link_authority.v1", name: "Link Authority & Technical", layer: "Signal" },
  { id: "signal.market_momentum.v1", name: "Market Momentum", layer: "Signal" },
  { id: "synthesis.os_drop.v1", name: "OS Drop", layer: "Synthesis" },
  { id: "signal.paid_organic.v1", name: "Paid vs Organic", layer: "Signal" },
  { id: "signal.share_of_voice.v1", name: "Share of Voice", layer: "Signal" },
  { id: "synthesis.strategic_summary.v1", name: "Strategic Summary", layer: "Synthesis" },
  // Registry modules (may use different IDs)
  { id: "seo.priority_scoring.v1", name: "Priority Scoring (SEO)", layer: "SEO" },
  { id: "seo.category_visibility.v1", name: "Category Visibility (SEO)", layer: "SEO" },
  { id: "seo.link_authority.v1", name: "Link Authority (SEO)", layer: "SEO" },
  { id: "seo.os_drop.v1", name: "OS Drop (SEO)", layer: "SEO" },
  { id: "seo.deprioritization.v1", name: "Deprioritization (SEO)", layer: "SEO" },
  { id: "market.share_of_voice.v1", name: "Share of Voice (Market)", layer: "Market" },
  { id: "market.branded_demand.v1", name: "Branded Demand (Market)", layer: "Market" },
  { id: "market.breakout_terms.v1", name: "Breakout Terms (Market)", layer: "Market" },
  { id: "market.competitor_strategy.v1", name: "Competitor Strategy (Market)", layer: "Market" },
  { id: "market.emerging_competitor.v1", name: "Emerging Competitor (Market)", layer: "Market" },
  { id: "market.market_momentum.v1", name: "Market Momentum (Market)", layer: "Market" },
  { id: "sem.action_card.v1", name: "Action Cards (SEM)", layer: "Action" },
  { id: "sem.paid_organic_overlap.v1", name: "Paid/Organic Overlap (SEM)", layer: "Action" },
  { id: "synthesis.strategic_summary.v1", name: "Strategic Summary (Synthesis)", layer: "Synthesis" },
  { id: "brand.attention.v1", name: "Brand Attention", layer: "Brand" },
];

interface TestResult {
  moduleId: string;
  moduleName: string;
  layer: string;
  success: boolean;
  error: string | null;
  executionTime: number;
}

async function testModule(module: { id: string; name: string; layer: string }): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const response = await fetch(`http://localhost:5000/api/modules/${module.id}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configId: CONFIG_ID })
    });
    
    const data = await response.json();
    const executionTime = Date.now() - startTime;
    
    return {
      moduleId: module.id,
      moduleName: module.name,
      layer: module.layer,
      success: data.success === true,
      error: data.success ? null : (data.error || 'Unknown error'),
      executionTime
    };
  } catch (err: any) {
    return {
      moduleId: module.id,
      moduleName: module.name,
      layer: module.layer,
      success: false,
      error: err.message || 'Network error',
      executionTime: Date.now() - startTime
    };
  }
}

async function runAllTests() {
  console.log('Testing all modules...\n');
  
  // Remove duplicates based on moduleId
  const uniqueModules = ALL_MODULES.filter((m, i, arr) => 
    arr.findIndex(x => x.id === m.id) === i
  );
  
  const results: TestResult[] = [];
  
  for (const module of uniqueModules) {
    console.log(`Testing: ${module.id}...`);
    const result = await testModule(module);
    results.push(result);
    console.log(`  ${result.success ? 'OK' : 'FAIL'} (${result.executionTime}ms)${result.error ? ': ' + result.error.substring(0, 80) : ''}`);
  }
  
  console.log('\n--- RESULTS SUMMARY ---\n');
  
  const working = results.filter(r => r.success);
  const failing = results.filter(r => !r.success);
  
  console.log(`Working: ${working.length}/${results.length}`);
  console.log(`Failing: ${failing.length}/${results.length}\n`);
  
  console.log('Working modules:');
  working.forEach(r => console.log(`  - ${r.moduleId}`));
  
  console.log('\nFailing modules:');
  failing.forEach(r => console.log(`  - ${r.moduleId}: ${r.error?.substring(0, 100)}`));
  
  // Output JSON for parsing
  console.log('\n--- JSON OUTPUT ---');
  console.log(JSON.stringify(results, null, 2));
}

runAllTests();
