export interface TimeDecayConfig {
  freshDays: number;
  moderateDays: number;
  staleDays: number;
  decayRate: number;
}

export const DEFAULT_DECAY_CONFIG: TimeDecayConfig = {
  freshDays: 7,
  moderateDays: 30,
  staleDays: 90,
  decayRate: 0.05
};

export type FreshnessStatus = 'fresh' | 'moderate' | 'stale' | 'expired';

export function calculateFreshnessStatus(
  dataTimestamp: Date,
  config: TimeDecayConfig = DEFAULT_DECAY_CONFIG
): { status: FreshnessStatus; ageDays: number; warning?: string } {
  const now = new Date();
  const ageDays = Math.floor((now.getTime() - dataTimestamp.getTime()) / (1000 * 60 * 60 * 24));

  if (ageDays <= config.freshDays) {
    return { status: 'fresh', ageDays };
  }
  
  if (ageDays <= config.moderateDays) {
    return { 
      status: 'moderate', 
      ageDays,
      warning: `Data is ${ageDays} days old. Consider refreshing for latest insights.`
    };
  }
  
  if (ageDays <= config.staleDays) {
    return { 
      status: 'stale', 
      ageDays,
      warning: `Data is ${ageDays} days old. Analysis may not reflect current market conditions.`
    };
  }
  
  return { 
    status: 'expired', 
    ageDays,
    warning: `Data is ${ageDays} days old. Please refresh data before making decisions.`
  };
}

export function applyTimeDecay(
  baseConfidence: number,
  dataTimestamp: Date,
  config: TimeDecayConfig = DEFAULT_DECAY_CONFIG
): number {
  const { ageDays } = calculateFreshnessStatus(dataTimestamp, config);
  
  if (ageDays <= config.freshDays) {
    return baseConfidence;
  }
  
  const daysOverFresh = ageDays - config.freshDays;
  const decayFactor = Math.exp(-config.decayRate * daysOverFresh);
  const decayedConfidence = baseConfidence * decayFactor;
  
  return Math.max(0.1, Math.min(1, decayedConfidence));
}

export function getDecayedConfidenceBreakdown(
  baseConfidence: number,
  dataTimestamp: Date,
  config: TimeDecayConfig = DEFAULT_DECAY_CONFIG
): {
  originalConfidence: number;
  decayedConfidence: number;
  decayAmount: number;
  decayPercentage: number;
  freshnessStatus: FreshnessStatus;
  ageDays: number;
} {
  const { status, ageDays } = calculateFreshnessStatus(dataTimestamp, config);
  const decayedConfidence = applyTimeDecay(baseConfidence, dataTimestamp, config);
  const decayAmount = baseConfidence - decayedConfidence;
  const decayPercentage = baseConfidence > 0 ? Math.round((decayAmount / baseConfidence) * 100) : 0;

  return {
    originalConfidence: baseConfidence,
    decayedConfidence,
    decayAmount,
    decayPercentage,
    freshnessStatus: status,
    ageDays
  };
}

export function shouldRefreshData(
  dataTimestamp: Date,
  config: TimeDecayConfig = DEFAULT_DECAY_CONFIG
): { shouldRefresh: boolean; urgency: 'none' | 'low' | 'medium' | 'high' | 'critical'; reason?: string } {
  const { status, ageDays } = calculateFreshnessStatus(dataTimestamp, config);

  switch (status) {
    case 'fresh':
      return { shouldRefresh: false, urgency: 'none' };
    case 'moderate':
      return { 
        shouldRefresh: false, 
        urgency: 'low',
        reason: `Data is ${ageDays} days old. Consider scheduling a refresh.`
      };
    case 'stale':
      return { 
        shouldRefresh: true, 
        urgency: 'medium',
        reason: `Data is ${ageDays} days old. Refresh recommended before analysis.`
      };
    case 'expired':
      return { 
        shouldRefresh: true, 
        urgency: 'critical',
        reason: `Data is ${ageDays} days old. Immediate refresh required.`
      };
  }
}

export const MODULE_DECAY_CONFIGS: Record<string, TimeDecayConfig> = {
  'market-demand': {
    freshDays: 7,
    moderateDays: 14,
    staleDays: 30,
    decayRate: 0.08
  },
  'keyword-gap': {
    freshDays: 14,
    moderateDays: 30,
    staleDays: 60,
    decayRate: 0.04
  },
  'competitive-positioning': {
    freshDays: 30,
    moderateDays: 60,
    staleDays: 90,
    decayRate: 0.03
  },
  'content-performance': {
    freshDays: 7,
    moderateDays: 14,
    staleDays: 30,
    decayRate: 0.06
  },
  'pricing-intelligence': {
    freshDays: 1,
    moderateDays: 7,
    staleDays: 14,
    decayRate: 0.15
  },
  'channel-attribution': {
    freshDays: 7,
    moderateDays: 14,
    staleDays: 30,
    decayRate: 0.05
  },
  'strategic-summary': {
    freshDays: 7,
    moderateDays: 21,
    staleDays: 45,
    decayRate: 0.04
  }
};

export function getModuleDecayConfig(moduleId: string): TimeDecayConfig {
  return MODULE_DECAY_CONFIGS[moduleId] || DEFAULT_DECAY_CONFIG;
}
