import { moduleRegistry } from '../registry';
import { marketDemandExecutor } from './market-demand';
import { keywordGapExecutor } from './keyword-gap';
import { strategicSummaryExecutor } from './strategic-summary';
import { competitivePositioningExecutor } from './competitive-positioning';
import { contentPerformanceExecutor } from './content-performance';
import { pricingIntelligenceExecutor } from './pricing-intelligence';
import { channelAttributionExecutor } from './channel-attribution';

moduleRegistry.register(marketDemandExecutor);
moduleRegistry.register(keywordGapExecutor);
moduleRegistry.register(strategicSummaryExecutor);
moduleRegistry.register(competitivePositioningExecutor);
moduleRegistry.register(contentPerformanceExecutor);
moduleRegistry.register(pricingIntelligenceExecutor);
moduleRegistry.register(channelAttributionExecutor);

export { marketDemandExecutor } from './market-demand';
export { keywordGapExecutor } from './keyword-gap';
export { strategicSummaryExecutor } from './strategic-summary';
export { competitivePositioningExecutor } from './competitive-positioning';
export { contentPerformanceExecutor } from './content-performance';
export { pricingIntelligenceExecutor } from './pricing-intelligence';
export { channelAttributionExecutor } from './channel-attribution';
