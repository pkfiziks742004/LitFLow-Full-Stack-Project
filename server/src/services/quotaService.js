import { GUEST_DAILY_SEARCH_LIMIT, PLAN_CONFIG, PLAN_IDS } from '../constants/plans.js';
import { getFeatureState, getFreeDailySearchLimit } from '../admin/services/runtimeConfigService.js';
import { updateUserById } from '../repositories/usersRepository.js';
import { getPublicSiteConfig } from './siteConfigService.js';
import { ApiError } from '../utils/apiError.js';

const guestSearchUsage = new Map();

function getDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeUserUsage(user) {
  const dateKey = getDateKey();

  if (!user.searchUsage || user.searchUsage.dateKey !== dateKey) {
    user.searchUsage = {
      dateKey,
      count: 0
    };
  }

  return user.searchUsage;
}

function normalizeGuestUsage(guestId) {
  const dateKey = getDateKey();
  const current = guestSearchUsage.get(guestId);

  if (!current || current.dateKey !== dateKey) {
    const fresh = { dateKey, count: 0 };
    guestSearchUsage.set(guestId, fresh);
    return fresh;
  }

  return current;
}

export async function assertCanSearch({ user, guestId }) {
  if (user?.plan === PLAN_IDS.PRO) {
    return;
  }

  if (user) {
    const usage = normalizeUserUsage(user);
    const limit = await getFreeDailySearchLimit();
    globalThis.__litflowFreeDailySearchLimit = limit;

    if (usage.count >= limit) {
      const publicSiteConfig = await getPublicSiteConfig();

      throw new ApiError(
        403,
        publicSiteConfig.pricing.enabled !== false
          ? 'Daily credit limit reached for the Free plan. Upgrade to Pro for unlimited credits.'
          : 'Daily credit limit reached for this workspace.'
      );
    }

    return;
  }

  const usage = normalizeGuestUsage(guestId);

  if (usage.count >= GUEST_DAILY_SEARCH_LIMIT) {
    throw new ApiError(403, 'Guest preview credits are finished. Sign in to keep exploring LitFlow.');
  }
}

export async function recordSearch({ user, guestId }) {
  if (user?.plan === PLAN_IDS.PRO) {
    return user;
  }

  if (user) {
    const usage = normalizeUserUsage(user);
    usage.count += 1;
    usage.lastSearchAt = new Date();
    return updateUserById(user.id, { searchUsage: usage });
  }

  const usage = normalizeGuestUsage(guestId);
  usage.count += 1;
  guestSearchUsage.set(guestId, usage);
  return null;
}

export function getQuotaSnapshot({ user, guestId }) {
  if (user?.plan === PLAN_IDS.PRO) {
    return {
      limit: null,
      used: 0,
      remaining: null,
      label: 'Unlimited credits'
    };
  }

  if (user) {
    const usage = normalizeUserUsage(user);
    const configuredLimit =
      typeof globalThis.__litflowFreeDailySearchLimit === 'number'
        ? globalThis.__litflowFreeDailySearchLimit
        : PLAN_CONFIG[PLAN_IDS.FREE].dailySearchLimit;

    return {
      limit: configuredLimit,
      used: usage.count,
      remaining: Math.max(configuredLimit - usage.count, 0),
      label: `${Math.max(configuredLimit - usage.count, 0)} credits left today`
    };
  }

  const usage = normalizeGuestUsage(guestId);

  return {
    limit: GUEST_DAILY_SEARCH_LIMIT,
    used: usage.count,
    remaining: Math.max(GUEST_DAILY_SEARCH_LIMIT - usage.count, 0),
    label: `${Math.max(GUEST_DAILY_SEARCH_LIMIT - usage.count, 0)} preview credits left`
  };
}

export function getPlanCapabilities(planId) {
  return PLAN_CONFIG[planId] || PLAN_CONFIG[PLAN_IDS.FREE];
}

export async function getEffectivePlanCapabilities(planId) {
  const baseCapabilities = getPlanCapabilities(planId);
  const [aiEnabled, adsEnabled] = await Promise.all([
    getFeatureState('ai_features', true),
    getFeatureState('ads_enabled', true)
  ]);

  return {
    ...baseCapabilities,
    aiSummary: Boolean(baseCapabilities.aiSummary && aiEnabled),
    adsEnabled: Boolean(baseCapabilities.adsEnabled && adsEnabled)
  };
}

export async function hydrateQuotaRuntimeConfig() {
  const limit = await getFreeDailySearchLimit();
  globalThis.__litflowFreeDailySearchLimit = limit;
  return limit;
}
