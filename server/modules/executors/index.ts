import { moduleRegistry } from '../registry';
import { marketDemandExecutor } from './market-demand';
import { keywordGapExecutor } from './keyword-gap';
import { strategicSummaryExecutor } from './strategic-summary';

moduleRegistry.register(marketDemandExecutor);
moduleRegistry.register(keywordGapExecutor);
moduleRegistry.register(strategicSummaryExecutor);

export { marketDemandExecutor } from './market-demand';
export { keywordGapExecutor } from './keyword-gap';
export { strategicSummaryExecutor } from './strategic-summary';
