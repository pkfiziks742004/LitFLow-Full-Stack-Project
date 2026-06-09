export const PLAN_IDS = {
  FREE: 'FREE',
  PRO: 'PRO'
};

export const PLAN_CONFIG = {
  [PLAN_IDS.FREE]: {
    id: PLAN_IDS.FREE,
    name: 'Free',
    dailySearchLimit: 10,
    maxSavedPapers: 25,
    adsEnabled: true,
    advancedFilters: false,
    aiSummary: false,
    graphExport: false
  },
  [PLAN_IDS.PRO]: {
    id: PLAN_IDS.PRO,
    name: 'Pro',
    dailySearchLimit: Infinity,
    maxSavedPapers: Infinity,
    adsEnabled: false,
    advancedFilters: true,
    aiSummary: true,
    graphExport: true
  }
};

export const DEFAULT_PLAN = PLAN_IDS.FREE;
export const GUEST_DAILY_SEARCH_LIMIT = 3;

