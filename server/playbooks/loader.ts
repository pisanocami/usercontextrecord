import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { PlaybookConfig } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PlaybookLoader {
  private playbooks: Map<string, PlaybookConfig> = new Map();
  private configDir: string;

  constructor(configDir?: string) {
    this.configDir = configDir || path.join(__dirname, 'configs');
  }

  async loadAll(): Promise<void> {
    if (!fs.existsSync(this.configDir)) {
      console.log(`Playbook config directory not found: ${this.configDir}`);
      return;
    }

    const files = fs.readdirSync(this.configDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        await this.loadPlaybook(path.join(this.configDir, file));
      }
    }
  }

  async loadPlaybook(filePath: string): Promise<PlaybookConfig | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const config = JSON.parse(content) as PlaybookConfig;
      this.playbooks.set(config.moduleId, config);
      return config;
    } catch (error) {
      console.error(`Failed to load playbook from ${filePath}:`, error);
      return null;
    }
  }

  get(moduleId: string): PlaybookConfig | undefined {
    return this.playbooks.get(moduleId);
  }

  getAll(): PlaybookConfig[] {
    return Array.from(this.playbooks.values());
  }

  has(moduleId: string): boolean {
    return this.playbooks.has(moduleId);
  }

  registerPlaybook(config: PlaybookConfig): void {
    this.playbooks.set(config.moduleId, config);
  }
}

export const playbookLoader = new PlaybookLoader();

export const defaultPlaybooks: PlaybookConfig[] = [
  {
    moduleId: 'market-demand',
    name: 'Market Demand & Seasonality',
    version: '1.0',
    strategicRole: "Answers 'When should we move?'",
    primaryQuestion: 'When does demand actually happen?',
    ownerCouncil: 'strategic_intelligence',
    supportingCouncils: ['performance_media_messaging'],
    processingSteps: [
      { step: 'fetch_trends', api: 'google_trends' },
      { step: 'normalize_data' },
      { step: 'detect_seasonality' },
      { step: 'calculate_forecast' }
    ],
    councilReasoningPrompt: `Analyze market demand patterns for the brand. Consider:
- Seasonal trends and timing
- Year-over-year growth
- Category benchmarks
Provide strategic recommendations on timing.`,
    confidenceFactors: [
      { name: 'data_freshness', weight: 0.25, calculation: 'days_since_update' },
      { name: 'keyword_coverage', weight: 0.25, calculation: 'keywords_with_data / total_keywords' },
      { name: 'trend_stability', weight: 0.25, calculation: 'variance_coefficient' },
      { name: 'historical_depth', weight: 0.25, calculation: 'months_of_data / 12' }
    ],
    insightTemplates: [
      {
        id: 'peak_timing',
        condition: 'seasonality_index > 1.5',
        titleTemplate: 'Peak Demand Period Identified',
        contentTemplate: 'Peak demand occurs in {{peak_months}} with {{peak_increase}}% above average',
        severity: 'high',
        category: 'opportunity'
      },
      {
        id: 'declining_trend',
        condition: 'yoy_growth < -10',
        titleTemplate: 'Declining Market Interest',
        contentTemplate: 'Year-over-year interest has declined by {{yoy_decline}}%',
        severity: 'high',
        category: 'risk'
      }
    ],
    recommendationTemplates: [
      {
        id: 'timing_optimization',
        condition: 'has_seasonality',
        actionTemplate: 'Increase marketing spend {{weeks_before_peak}} weeks before peak season',
        priority: 'high',
        effort: 'medium',
        impactTemplate: 'Capture {{potential_uplift}}% more demand during peak'
      }
    ],
    deprioritizationRules: [
      {
        condition: 'confidence < 0.4',
        action: 'flag',
        reason: 'Insufficient data for reliable seasonality analysis'
      }
    ]
  },
  {
    moduleId: 'keyword-gap',
    name: 'Keyword Gap & SEO Visibility',
    version: '1.0',
    strategicRole: "Answers 'Where are we missing organic opportunities?'",
    primaryQuestion: 'Which keywords do competitors rank for that we do not?',
    ownerCouncil: 'seo_visibility_demand',
    supportingCouncils: ['strategic_intelligence'],
    processingSteps: [
      { step: 'fetch_brand_keywords', api: 'dataforseo' },
      { step: 'fetch_competitor_keywords', api: 'dataforseo' },
      { step: 'calculate_gap' },
      { step: 'rank_opportunities' }
    ],
    councilReasoningPrompt: `Analyze keyword gap opportunities. Consider:
- Search volume potential
- Keyword difficulty vs current authority
- Content feasibility
- Business relevance`,
    confidenceFactors: [
      { name: 'competitor_coverage', weight: 0.3, calculation: 'competitors_analyzed / total_competitors' },
      { name: 'data_freshness', weight: 0.3, calculation: 'days_since_update' },
      { name: 'volume_accuracy', weight: 0.4, calculation: 'source_reliability' }
    ],
    insightTemplates: [
      {
        id: 'volume_opportunity',
        condition: 'total_gap_volume > 10000',
        titleTemplate: 'Significant Keyword Gap Found',
        contentTemplate: '{{gap_count}} keywords with {{total_volume}} monthly searches where competitors rank but you do not',
        severity: 'high',
        category: 'opportunity'
      }
    ],
    recommendationTemplates: [
      {
        id: 'content_creation',
        condition: 'gap_count > 10',
        actionTemplate: 'Create content targeting top {{top_n}} gap keywords',
        priority: 'high',
        effort: 'high',
        impactTemplate: 'Potential to capture {{estimated_traffic}} monthly organic visits'
      }
    ],
    deprioritizationRules: [
      {
        condition: 'avg_difficulty > 80',
        action: 'downgrade',
        reason: 'Keywords too competitive for current domain authority'
      }
    ]
  }
];

for (const playbook of defaultPlaybooks) {
  playbookLoader.registerPlaybook(playbook);
}
