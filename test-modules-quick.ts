/**
 * Quick Module Test - Tests module registration without full execution
 */

const CONFIG_ID = 72;

const CORE_MODULES = [
  "seo.keyword_gap_visibility.v1",
  "market.category_demand_trend.v1", 
  "market.demand_seasonality.v1",
  "synthesis.strategic_summary.v1",
  "brand.attention_share.v1",
  "sem.action_card.v1",
  "seo.priority_scoring.v1",
  "market.branded_demand.v1",
  "market.breakout_terms.v1",
  "seo.category_visibility.v1",
  "market.competitor_strategy.v1",
  "seo.deprioritization.v1",
  "market.emerging_competitor.v1",
  "seo.link_authority.v1",
  "market.market_momentum.v1",
  "seo.os_drop.v1",
  "sem.paid_organic_overlap.v1",
  "market.share_of_voice.v1",
];

async function testModule(moduleId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const response = await fetch(`http://localhost:5000/api/modules/${moduleId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configId: CONFIG_ID })
    });
    
    const data = await response.json();
    
    // Check if module is registered (not "not found in registry" error)
    if (data.error && data.error.includes("not found in registry")) {
      return { success: false, error: "NOT_REGISTERED" };
    }
    
    // Check if module is connected to runner
    if (data.error && data.error.includes("not yet connected to the runner")) {
      return { success: false, error: "NOT_CONNECTED" };
    }
    
    // Any other error or success
    return { success: data.success || !data.error?.includes("not found"), error: data.error || null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function runQuickTests() {
  console.log('Quick Module Registration Test\n');
  
  let registered = 0;
  let connected = 0;
  let working = 0;
  
  for (const moduleId of CORE_MODULES) {
    const result = await testModule(moduleId);
    
    if (result.error === "NOT_REGISTERED") {
      console.log(`FAIL [NOT_REGISTERED]: ${moduleId}`);
    } else if (result.error === "NOT_CONNECTED") {
      registered++;
      console.log(`FAIL [NOT_CONNECTED]: ${moduleId}`);
    } else if (result.success) {
      registered++;
      connected++;
      working++;
      console.log(`OK: ${moduleId}`);
    } else {
      registered++;
      connected++;
      console.log(`PARTIAL [${result.error?.substring(0, 50)}]: ${moduleId}`);
    }
  }
  
  console.log(`\n--- SUMMARY ---`);
  console.log(`Registered: ${registered}/${CORE_MODULES.length}`);
  console.log(`Connected:  ${connected}/${CORE_MODULES.length}`);
  console.log(`Working:    ${working}/${CORE_MODULES.length}`);
}

runQuickTests();
