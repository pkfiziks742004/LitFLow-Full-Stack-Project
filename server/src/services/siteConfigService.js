import { getSiteSetting, listFeatureControls } from '../admin/repositories/systemRepository.js';
import { env } from '../config/env.js';
import { readPublicSiteConfigSnapshot, writePublicSiteConfigSnapshot } from './siteConfigSnapshotService.js';

const DEFAULT_PRICING = {
  enabled: false,
  currency: 'INR',
  free: 0,
  pro: 999,
  billingCycle: 'month'
};

export const DEFAULT_UPGRADE_DIALOG = {
  badgeText: 'Confirm Upgrade',
  title: 'Confirm plan changes',
  description: 'Review your Pro workspace billing details before opening the secure payment checkout.',
  planTitle: '{siteName} Pro subscription',
  planDescription: '{billingCycleLabel}',
  dueTodayLabel: 'Due today',
  cancelButtonLabel: 'Cancel',
  payButtonLabel: 'Pay now',
  taxRate: 18,
  highlightBadges: [
    { label: 'Unlimited research credits', icon: 'sparkles' },
    { label: 'Secure backend billing sync', icon: 'shield' }
  ],
  summaryRows: [
    { label: 'Subtotal', value: '{subtotal}' },
    { label: 'Tax {taxRate}%', value: '{tax}' },
    { label: 'Total due today', value: '{total}', emphasized: true }
  ],
  infoRows: [
    { label: 'Payment method', value: 'Secure Razorpay checkout' },
    { label: 'Billing account', value: '{userEmail}' }
  ]
};

export const DEFAULT_RUNTIME_FEATURES = {
  aiFeatures: true,
  adsEnabled: true,
  newFeatures: false
};

const FEATURE_KEY_MAP = {
  ai_features: 'aiFeatures',
  ads_enabled: 'adsEnabled',
  new_features: 'newFeatures'
};

export const DEFAULT_BRANDING = {
  primaryText: 'Lit',
  accentText: 'Flow',
  iconPrimary: 'L',
  iconAccent: 'F',
  logoMode: 'generated',
  logoImageUrl: '',
  logoDarkImageUrl: '',
  logoLightImageUrl: '',
  iconImageUrl: '',
  iconDarkImageUrl: '',
  iconLightImageUrl: '',
  primaryColor: '#60a5fa',
  secondaryColor: '#2dd4bf',
  iconLightColor: '#eff6ff',
  iconAccentColor: '#083344',
  orbitColor: '#ffffff',
  tagline: 'Research graphs that move with you'
};

function normalizePricing(pricingValue = {}, fallbackEnabled = DEFAULT_PRICING.enabled) {
  const hasExplicitEnabled = typeof pricingValue?.enabled === 'boolean';

  return {
    enabled: hasExplicitEnabled ? pricingValue.enabled : fallbackEnabled,
    currency: pricingValue?.currency || DEFAULT_PRICING.currency,
    free: Number(pricingValue?.free ?? DEFAULT_PRICING.free),
    pro: Number(pricingValue?.pro ?? DEFAULT_PRICING.pro),
    billingCycle: pricingValue?.billingCycle || DEFAULT_PRICING.billingCycle
  };
}

function normalizeDialogText(value, fallback) {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function normalizeUpgradeDialogBadges(items) {
  if (!Array.isArray(items)) {
    return DEFAULT_UPGRADE_DIALOG.highlightBadges;
  }

  const normalizedItems = items
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const fallbackItem =
        DEFAULT_UPGRADE_DIALOG.highlightBadges[index] ||
        DEFAULT_UPGRADE_DIALOG.highlightBadges[DEFAULT_UPGRADE_DIALOG.highlightBadges.length - 1];
      const label = normalizeDialogText(item.label, fallbackItem?.label || 'Highlight');
      const icon = String(item.icon || fallbackItem?.icon || '').trim().toLowerCase();

      return {
        label,
        icon
      };
    })
    .filter(Boolean);

  return normalizedItems;
}

function normalizeUpgradeDialogRows(items, fallbackRows) {
  if (!Array.isArray(items)) {
    return fallbackRows;
  }

  const normalizedItems = items
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const fallbackRow = fallbackRows[index] || fallbackRows[fallbackRows.length - 1];

      return {
        label: normalizeDialogText(item.label, fallbackRow?.label || 'Label'),
        value: normalizeDialogText(item.value, fallbackRow?.value || ''),
        emphasized: item.emphasized === true
      };
    })
    .filter(Boolean);

  return normalizedItems;
}

export function normalizeUpgradeDialog(dialogValue = {}) {
  return {
    badgeText: normalizeDialogText(dialogValue?.badgeText, DEFAULT_UPGRADE_DIALOG.badgeText),
    title: normalizeDialogText(dialogValue?.title, DEFAULT_UPGRADE_DIALOG.title),
    description: normalizeDialogText(dialogValue?.description, DEFAULT_UPGRADE_DIALOG.description),
    planTitle: normalizeDialogText(dialogValue?.planTitle, DEFAULT_UPGRADE_DIALOG.planTitle),
    planDescription: normalizeDialogText(dialogValue?.planDescription, DEFAULT_UPGRADE_DIALOG.planDescription),
    dueTodayLabel: normalizeDialogText(dialogValue?.dueTodayLabel, DEFAULT_UPGRADE_DIALOG.dueTodayLabel),
    cancelButtonLabel: normalizeDialogText(
      dialogValue?.cancelButtonLabel,
      DEFAULT_UPGRADE_DIALOG.cancelButtonLabel
    ),
    payButtonLabel: normalizeDialogText(dialogValue?.payButtonLabel, DEFAULT_UPGRADE_DIALOG.payButtonLabel),
    taxRate: Number.isFinite(Number(dialogValue?.taxRate)) ? Number(dialogValue.taxRate) : DEFAULT_UPGRADE_DIALOG.taxRate,
    highlightBadges: normalizeUpgradeDialogBadges(dialogValue?.highlightBadges),
    summaryRows: normalizeUpgradeDialogRows(dialogValue?.summaryRows, DEFAULT_UPGRADE_DIALOG.summaryRows),
    infoRows: normalizeUpgradeDialogRows(dialogValue?.infoRows, DEFAULT_UPGRADE_DIALOG.infoRows)
  };
}

function splitWordmark(siteName) {
  const trimmed = String(siteName || '').trim();

  if (!trimmed) {
    return {
      primaryText: DEFAULT_BRANDING.primaryText,
      accentText: DEFAULT_BRANDING.accentText
    };
  }

  const spacedParts = trimmed.split(/\s+/).filter(Boolean);

  if (spacedParts.length > 1) {
    return {
      primaryText: spacedParts[0],
      accentText: spacedParts.slice(1).join(' ')
    };
  }

  const camelParts = trimmed.match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])/g) || [];

  if (camelParts.length > 1) {
    return {
      primaryText: camelParts[0],
      accentText: camelParts.slice(1).join('')
    };
  }

  const midpoint = Math.max(1, Math.ceil(trimmed.length / 2));

  return {
    primaryText: trimmed.slice(0, midpoint),
    accentText: trimmed.slice(midpoint) || trimmed.slice(0, 1)
  };
}

export function normalizeRuntimeFeatures(featureSource = {}) {
  if (Array.isArray(featureSource)) {
    return featureSource.reduce((accumulator, feature) => {
      const mappedKey = FEATURE_KEY_MAP[feature?.key];

      if (!mappedKey) {
        return accumulator;
      }

      return {
        ...accumulator,
        [mappedKey]: feature.enabled === true
      };
    }, DEFAULT_RUNTIME_FEATURES);
  }

  return {
    aiFeatures: featureSource?.aiFeatures !== false,
    adsEnabled: featureSource?.adsEnabled !== false,
    newFeatures: featureSource?.newFeatures === true
  };
}

export function mergeRuntimeFeatureOverride(currentFeatures, feature) {
  const mappedKey = FEATURE_KEY_MAP[feature?.key];

  if (!mappedKey) {
    return normalizeRuntimeFeatures(currentFeatures);
  }

  return {
    ...normalizeRuntimeFeatures(currentFeatures),
    [mappedKey]: feature.enabled === true
  };
}

export function normalizeBranding(brandingValue = {}, siteName = env.appName) {
  const baseWordmark = splitWordmark(siteName);

  return {
    ...DEFAULT_BRANDING,
    ...baseWordmark,
    ...(brandingValue || {}),
    primaryText: String(brandingValue?.primaryText || baseWordmark.primaryText || DEFAULT_BRANDING.primaryText),
    accentText: String(brandingValue?.accentText || baseWordmark.accentText || DEFAULT_BRANDING.accentText),
    iconPrimary: String(brandingValue?.iconPrimary || baseWordmark.primaryText?.slice(0, 1) || 'L').slice(0, 2),
    iconAccent: String(brandingValue?.iconAccent || baseWordmark.accentText?.slice(0, 1) || 'F').slice(0, 2),
    logoMode: brandingValue?.logoMode === 'image' ? 'image' : 'generated',
    logoImageUrl: String(brandingValue?.logoImageUrl || ''),
    logoDarkImageUrl: String(brandingValue?.logoDarkImageUrl || ''),
    logoLightImageUrl: String(brandingValue?.logoLightImageUrl || ''),
    iconImageUrl: String(brandingValue?.iconImageUrl || ''),
    iconDarkImageUrl: String(brandingValue?.iconDarkImageUrl || ''),
    iconLightImageUrl: String(brandingValue?.iconLightImageUrl || ''),
    tagline: String(brandingValue?.tagline || DEFAULT_BRANDING.tagline)
  };
}

export function getDefaultPublicSiteConfig() {
  const siteName = env.appName;

  return {
    siteName,
    branding: normalizeBranding({}, siteName),
    pricing: normalizePricing({}, DEFAULT_PRICING.enabled),
    upgradeDialog: normalizeUpgradeDialog({}),
    features: DEFAULT_RUNTIME_FEATURES
  };
}

export async function getFallbackPublicSiteConfig() {
  const snapshot = await readPublicSiteConfigSnapshot();

  if (snapshot) {
    const fallbackSiteName = snapshot.siteName || env.appName;

    return {
      siteName: fallbackSiteName,
      branding: normalizeBranding(snapshot.branding, fallbackSiteName),
      pricing: normalizePricing(snapshot.pricing, DEFAULT_PRICING.enabled),
      upgradeDialog: normalizeUpgradeDialog(snapshot.upgradeDialog),
      features: normalizeRuntimeFeatures(snapshot.features)
    };
  }

  return getDefaultPublicSiteConfig();
}

export async function getPublicSiteConfig() {
  const [siteNameSetting, brandingSetting, pricingSetting, upgradeDialogSetting, featureControls] = await Promise.all([
    getSiteSetting('site_name'),
    getSiteSetting('branding'),
    getSiteSetting('pricing'),
    getSiteSetting('upgrade_dialog'),
    listFeatureControls()
  ]);

  const siteName = siteNameSetting?.value?.text || env.appName;
  const branding = normalizeBranding(brandingSetting?.value, siteName);
  const pricing = pricingSetting?.value || {};
  const features = normalizeRuntimeFeatures(featureControls);

  const config = {
    siteName,
    branding,
    pricing: normalizePricing(pricing, true),
    upgradeDialog: normalizeUpgradeDialog(upgradeDialogSetting?.value),
    features
  };

  try {
    await writePublicSiteConfigSnapshot(config);
  } catch (error) {
    console.warn('Failed to persist public site config snapshot.', error);
  }

  return config;
}
