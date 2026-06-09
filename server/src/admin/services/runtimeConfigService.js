import { PLAN_CONFIG, PLAN_IDS } from '../../constants/plans.js';
import { getSiteSetting, listFeatureControls } from '../repositories/systemRepository.js';

const cache = {
  fetchedAt: 0,
  ttlMs: 30_000,
  features: null,
  settings: {}
};

async function refreshCacheIfNeeded() {
  if (Date.now() - cache.fetchedAt < cache.ttlMs && cache.features) {
    return;
  }

  const [features, freeLimitSetting] = await Promise.all([
    listFeatureControls(),
    getSiteSetting('free_daily_search_limit')
  ]);

  cache.features = Object.fromEntries(features.map((feature) => [feature.key, feature]));
  cache.settings.freeDailySearchLimit =
    Number(freeLimitSetting?.value?.value || PLAN_CONFIG[PLAN_IDS.FREE].dailySearchLimit) ||
    PLAN_CONFIG[PLAN_IDS.FREE].dailySearchLimit;
  cache.fetchedAt = Date.now();
}

export async function getFeatureState(key, fallback = false) {
  await refreshCacheIfNeeded();
  return cache.features?.[key]?.enabled ?? fallback;
}

export async function getFeatureSnapshot() {
  await refreshCacheIfNeeded();
  return cache.features || {};
}

export async function getFreeDailySearchLimit() {
  await refreshCacheIfNeeded();
  return cache.settings.freeDailySearchLimit;
}

export function invalidateRuntimeConfigCache() {
  cache.fetchedAt = 0;
}
