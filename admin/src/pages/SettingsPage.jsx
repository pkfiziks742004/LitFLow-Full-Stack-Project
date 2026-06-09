import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { adminClient } from '../api/http';
import AdminShell from '../components/AdminShell';
import BrandLogo from '../components/BrandLogo';
import MetricCard from '../components/MetricCard';
import WorkspaceLinkCard from '../components/WorkspaceLinkCard';
import { useBranding } from '../context/BrandingContext';
import { stringifyJson } from '../utils/formatters';

const SETTING_COPY = {
  site_name: {
    title: 'Site name',
    description: 'Displayed branding text for the LitFlow product.'
  },
  branding: {
    title: 'Branding',
    description: 'Unified wordmark used across the public site and admin panel.'
  },
  pricing: {
    title: 'Pricing',
    description: 'Free and Pro plan pricing configuration used by the app.'
  },
  upgrade_dialog: {
    title: 'Upgrade dialog',
    description: 'Admin-controlled confirmation and payment copy shown before checkout.'
  },
  free_daily_search_limit: {
    title: 'Free daily search limit',
    description: 'Daily search quota applied to free-tier users.'
  },
  smtp: {
    title: 'SMTP configuration',
    description: 'Mail sender information surfaced inside system settings.'
  },
  api_keys: {
    title: 'API keys metadata',
    description: 'Operational notes for search, AI, and billing integrations.'
  }
};

function isObjectLike(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

const DEFAULT_BRANDING_FORM = {
  siteName: 'LitFlow',
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
  primaryColor: '#2563eb',
  secondaryColor: '#60a5fa',
  iconLightColor: '#ffffff',
  iconAccentColor: '#dbeafe',
  orbitColor: '#bfdbfe',
  tagline: 'Research graphs that move with you'
};

const LOCKED_BRANDING_SYSTEM = {
  logoMode: 'generated',
  primaryColor: '#2563eb',
  secondaryColor: '#60a5fa',
  iconLightColor: '#ffffff',
  iconAccentColor: '#dbeafe',
  orbitColor: '#bfdbfe'
};

const DEFAULT_PRICING_FORM = {
  enabled: true,
  currency: 'INR',
  free: '0',
  pro: '999',
  billingCycle: 'month'
};

const DEFAULT_UPGRADE_DIALOG_FORM = {
  badgeText: 'Confirm Upgrade',
  title: 'Confirm plan changes',
  description: 'Review your Pro workspace billing details before opening the secure payment checkout.',
  planTitle: '{siteName} Pro subscription',
  planDescription: '{billingCycleLabel}',
  dueTodayLabel: 'Due today',
  cancelButtonLabel: 'Cancel',
  payButtonLabel: 'Pay now',
  taxRate: '18',
  highlightBadges: [
    { label: 'Unlimited research credits', icon: 'sparkles' },
    { label: 'Secure backend billing sync', icon: 'shield' }
  ],
  summaryRows: [
    { label: 'Subtotal', value: '{subtotal}', emphasized: false },
    { label: 'Tax {taxRate}%', value: '{tax}', emphasized: false },
    { label: 'Total due today', value: '{total}', emphasized: true }
  ],
  infoRows: [
    { label: 'Payment method', value: 'Secure Razorpay checkout', emphasized: false },
    { label: 'Billing account', value: '{userEmail}', emphasized: false }
  ]
};

const ACCEPTED_BRANDING_TYPES = ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg'];
const BRANDING_INPUT_ACCEPT = ACCEPTED_BRANDING_TYPES.join(',');
const MAX_BRANDING_FILE_SIZE = 1200 * 1024;
const LOGO_ASSET_FIELDS = ['logoImageUrl', 'logoDarkImageUrl', 'logoLightImageUrl'];
const BRAND_ASSET_FIELDS = [
  {
    field: 'logoImageUrl',
    title: 'Shared logo image',
    helper: 'Fallback logo used across the product when no surface-specific override exists.',
    empty: 'No shared logo uploaded yet. Generated branding will stay active.'
  },
  {
    field: 'logoDarkImageUrl',
    title: 'Dark-surface logo',
    helper: 'Optional override for dark headers, nav bars, dashboards, and dark product surfaces.',
    empty: 'No dark-surface override yet. LitFlow will fall back to the shared logo.'
  },
  {
    field: 'logoLightImageUrl',
    title: 'Light-surface logo',
    helper: 'Optional override for bright cards, exported graphics, and future light layouts.',
    empty: 'No light-surface override yet. LitFlow will fall back to the shared logo.'
  },
  {
    field: 'iconImageUrl',
    title: 'Shared icon image',
    helper: 'Fallback compact icon for favicons and compact brand surfaces.',
    empty: 'No shared icon uploaded. The app will reuse the logo or generated icon.'
  },
  {
    field: 'iconDarkImageUrl',
    title: 'Dark-surface icon',
    helper: 'Optional compact override for dark tabs, bookmarks, and condensed dark UI.',
    empty: 'No dark icon override yet. LitFlow will fall back to the shared icon.'
  },
  {
    field: 'iconLightImageUrl',
    title: 'Light-surface icon',
    helper: 'Optional compact override for bright surfaces, export headers, and light tabs.',
    empty: 'No light icon override yet. LitFlow will fall back to the shared icon.'
  }
];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

function hasUploadedLogoAsset(branding) {
  return LOGO_ASSET_FIELDS.some((field) => Boolean(branding?.[field]));
}

function countUploadedBrandAssets(branding) {
  return BRAND_ASSET_FIELDS.reduce((count, asset) => count + (branding?.[asset.field] ? 1 : 0), 0);
}

function isValidSettingKey(value) {
  return /^[a-z0-9_]+$/.test(value);
}

function buildBrandingDraft(settingsMap) {
  const branding = settingsMap.branding || {};

  return {
    ...DEFAULT_BRANDING_FORM,
    ...branding,
    siteName: settingsMap.site_name?.text || DEFAULT_BRANDING_FORM.siteName
  };
}

function buildPricingDraft(settingsMap) {
  const pricing = settingsMap.pricing || {};

  return {
    ...DEFAULT_PRICING_FORM,
    enabled: pricing.enabled !== false,
    currency: pricing.currency || DEFAULT_PRICING_FORM.currency,
    free: String(pricing.free ?? DEFAULT_PRICING_FORM.free),
    pro: String(pricing.pro ?? DEFAULT_PRICING_FORM.pro),
    billingCycle: pricing.billingCycle || DEFAULT_PRICING_FORM.billingCycle
  };
}

function buildPricingPayload(draft, fallbackPricing = DEFAULT_PRICING_FORM, strict = true) {
  const freeCandidate = Number(draft.free);
  const proCandidate = Number(draft.pro);
  const hasValidFree = Number.isFinite(freeCandidate) && freeCandidate >= 0;
  const hasValidPro = Number.isFinite(proCandidate) && proCandidate >= 0;

  if (strict && (!hasValidFree || !hasValidPro)) {
    throw new Error('Free and Pro pricing must be valid positive amounts.');
  }

  return {
    enabled: Boolean(draft.enabled),
    currency: draft.currency.trim().toUpperCase() || DEFAULT_PRICING_FORM.currency,
    free: hasValidFree ? freeCandidate : Number(fallbackPricing.free ?? DEFAULT_PRICING_FORM.free),
    pro: hasValidPro ? proCandidate : Number(fallbackPricing.pro ?? DEFAULT_PRICING_FORM.pro),
    billingCycle: draft.billingCycle.trim() || DEFAULT_PRICING_FORM.billingCycle
  };
}

function normalizeUpgradeDialogText(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function normalizeUpgradeBadgeDraft(items) {
  if (!Array.isArray(items)) {
    return DEFAULT_UPGRADE_DIALOG_FORM.highlightBadges;
  }

  return items
    .map((item, index) => {
      const fallbackItem =
        DEFAULT_UPGRADE_DIALOG_FORM.highlightBadges[index] ||
        DEFAULT_UPGRADE_DIALOG_FORM.highlightBadges[DEFAULT_UPGRADE_DIALOG_FORM.highlightBadges.length - 1];

      return {
        label: normalizeUpgradeDialogText(item?.label, fallbackItem?.label || 'New badge'),
        icon: normalizeUpgradeDialogText(item?.icon, fallbackItem?.icon || 'sparkles')
      };
    })
    .filter((item) => item.label);
}

function normalizeUpgradeRowDraft(items, fallbackRows) {
  if (!Array.isArray(items)) {
    return fallbackRows;
  }

  return items
    .map((item, index) => {
      const fallbackItem = fallbackRows[index] || fallbackRows[fallbackRows.length - 1];

      return {
        label: normalizeUpgradeDialogText(item?.label, fallbackItem?.label || 'Label'),
        value: normalizeUpgradeDialogText(item?.value, fallbackItem?.value || ''),
        emphasized: item?.emphasized === true
      };
    })
    .filter((item) => item.label && item.value);
}

function buildUpgradeDialogDraft(settingsMap) {
  const upgradeDialog = settingsMap.upgrade_dialog || {};

  return {
    ...DEFAULT_UPGRADE_DIALOG_FORM,
    ...upgradeDialog,
    badgeText: upgradeDialog.badgeText || DEFAULT_UPGRADE_DIALOG_FORM.badgeText,
    title: upgradeDialog.title || DEFAULT_UPGRADE_DIALOG_FORM.title,
    description: upgradeDialog.description || DEFAULT_UPGRADE_DIALOG_FORM.description,
    planTitle: upgradeDialog.planTitle || DEFAULT_UPGRADE_DIALOG_FORM.planTitle,
    planDescription: upgradeDialog.planDescription || DEFAULT_UPGRADE_DIALOG_FORM.planDescription,
    dueTodayLabel: upgradeDialog.dueTodayLabel || DEFAULT_UPGRADE_DIALOG_FORM.dueTodayLabel,
    cancelButtonLabel: upgradeDialog.cancelButtonLabel || DEFAULT_UPGRADE_DIALOG_FORM.cancelButtonLabel,
    payButtonLabel: upgradeDialog.payButtonLabel || DEFAULT_UPGRADE_DIALOG_FORM.payButtonLabel,
    taxRate: String(upgradeDialog.taxRate ?? DEFAULT_UPGRADE_DIALOG_FORM.taxRate),
    highlightBadges: normalizeUpgradeBadgeDraft(upgradeDialog.highlightBadges),
    summaryRows: normalizeUpgradeRowDraft(upgradeDialog.summaryRows, DEFAULT_UPGRADE_DIALOG_FORM.summaryRows),
    infoRows: normalizeUpgradeRowDraft(upgradeDialog.infoRows, DEFAULT_UPGRADE_DIALOG_FORM.infoRows)
  };
}

function buildUpgradeDialogPayload(draft, strict = true) {
  const taxRateCandidate = Number(draft.taxRate);
  const hasValidTaxRate = Number.isFinite(taxRateCandidate) && taxRateCandidate >= 0;

  if (strict && !hasValidTaxRate) {
    throw new Error('Tax rate must be a valid non-negative number.');
  }

  return {
    badgeText: normalizeUpgradeDialogText(draft.badgeText, DEFAULT_UPGRADE_DIALOG_FORM.badgeText),
    title: normalizeUpgradeDialogText(draft.title, DEFAULT_UPGRADE_DIALOG_FORM.title),
    description: normalizeUpgradeDialogText(draft.description, DEFAULT_UPGRADE_DIALOG_FORM.description),
    planTitle: normalizeUpgradeDialogText(draft.planTitle, DEFAULT_UPGRADE_DIALOG_FORM.planTitle),
    planDescription: normalizeUpgradeDialogText(draft.planDescription, DEFAULT_UPGRADE_DIALOG_FORM.planDescription),
    dueTodayLabel: normalizeUpgradeDialogText(draft.dueTodayLabel, DEFAULT_UPGRADE_DIALOG_FORM.dueTodayLabel),
    cancelButtonLabel: normalizeUpgradeDialogText(
      draft.cancelButtonLabel,
      DEFAULT_UPGRADE_DIALOG_FORM.cancelButtonLabel
    ),
    payButtonLabel: normalizeUpgradeDialogText(draft.payButtonLabel, DEFAULT_UPGRADE_DIALOG_FORM.payButtonLabel),
    taxRate: hasValidTaxRate ? taxRateCandidate : Number(DEFAULT_UPGRADE_DIALOG_FORM.taxRate),
    highlightBadges: Array.isArray(draft.highlightBadges)
      ? draft.highlightBadges
          .map((item) => ({
            label: normalizeUpgradeDialogText(item?.label),
            icon: normalizeUpgradeDialogText(item?.icon)
          }))
          .filter((item) => item.label)
      : DEFAULT_UPGRADE_DIALOG_FORM.highlightBadges,
    summaryRows: Array.isArray(draft.summaryRows)
      ? draft.summaryRows
          .map((item) => ({
            label: normalizeUpgradeDialogText(item?.label),
            value: normalizeUpgradeDialogText(item?.value),
            emphasized: item?.emphasized === true
          }))
          .filter((item) => item.label && item.value)
      : DEFAULT_UPGRADE_DIALOG_FORM.summaryRows,
    infoRows: Array.isArray(draft.infoRows)
      ? draft.infoRows
          .map((item) => ({
            label: normalizeUpgradeDialogText(item?.label),
            value: normalizeUpgradeDialogText(item?.value),
            emphasized: item?.emphasized === true
          }))
          .filter((item) => item.label && item.value)
      : DEFAULT_UPGRADE_DIALOG_FORM.infoRows
  };
}

export default function SettingsPage({ pageView = 'home' }) {
  const { applyBranding } = useBranding();
  const [settings, setSettings] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [brandingDraft, setBrandingDraft] = useState(DEFAULT_BRANDING_FORM);
  const [pricingDraft, setPricingDraft] = useState(DEFAULT_PRICING_FORM);
  const [upgradeDialogDraft, setUpgradeDialogDraft] = useState(DEFAULT_UPGRADE_DIALOG_FORM);
  const [newSetting, setNewSetting] = useState({ key: '', valueText: '{\n  \n}' });
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [savingUpgradeDialog, setSavingUpgradeDialog] = useState(false);
  const [creatingSetting, setCreatingSetting] = useState(false);
  const [deletingSettingKey, setDeletingSettingKey] = useState('');

  async function loadSettings() {
    try {
      setLoading(true);
      const { data } = await adminClient.controls();
      const nextSettings = data.settings || [];
      const nextSettingsMap = Object.fromEntries(nextSettings.map((setting) => [setting.key, setting.value]));
      setSettings(nextSettings);
      setDrafts(
        Object.fromEntries(
          nextSettings.map((setting) => [
            setting.key,
            {
              valueText: stringifyJson(setting.value)
            }
          ])
        )
      );
      const nextBrandingDraft = buildBrandingDraft(nextSettingsMap);
      setBrandingDraft(nextBrandingDraft);
      setPricingDraft(buildPricingDraft(nextSettingsMap));
      setUpgradeDialogDraft(buildUpgradeDialogDraft(nextSettingsMap));
      applyBranding({
        siteName: nextBrandingDraft.siteName,
        branding: nextBrandingDraft
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load site settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const updateDraft = (key, valueText) => {
    setDrafts((current) => ({
      ...current,
      [key]: { valueText }
    }));
  };

  const updateBrandingDraft = (field, value) => {
    setBrandingDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updatePricingDraft = (field, value) => {
    setPricingDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updateUpgradeDialogDraft = (field, value) => {
    setUpgradeDialogDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updateUpgradeDialogArrayItem = (arrayKey, index, field, value) => {
    setUpgradeDialogDraft((current) => ({
      ...current,
      [arrayKey]: current[arrayKey].map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    }));
  };

  const addUpgradeDialogArrayItem = (arrayKey, nextItem) => {
    setUpgradeDialogDraft((current) => ({
      ...current,
      [arrayKey]: [...current[arrayKey], nextItem]
    }));
  };

  const removeUpgradeDialogArrayItem = (arrayKey, index) => {
    setUpgradeDialogDraft((current) => ({
      ...current,
      [arrayKey]: current[arrayKey].filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const handleBrandAssetChange = async (field, file, label) => {
    if (!file) {
      return;
    }

    if (!ACCEPTED_BRANDING_TYPES.includes(file.type)) {
      toast.error(`${label} must be a PNG, SVG, WEBP, or JPG file.`);
      return;
    }

    if (file.size > MAX_BRANDING_FILE_SIZE) {
      toast.error(`${label} must be 1.2 MB or smaller.`);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setBrandingDraft((current) => ({
        ...current,
        logoMode: LOGO_ASSET_FIELDS.includes(field) ? 'image' : current.logoMode,
        [field]: dataUrl
      }));
      toast.success(`${label} updated in preview.`);
    } catch (_error) {
      toast.error(`Failed to load ${label.toLowerCase()}.`);
    }
  };

  const clearBrandAsset = (field) => {
    setBrandingDraft((current) => {
      const nextBranding = {
        ...current,
        [field]: ''
      };

      if (LOGO_ASSET_FIELDS.includes(field) && current.logoMode === 'image' && !hasUploadedLogoAsset(nextBranding)) {
        nextBranding.logoMode = 'generated';
      }

      return nextBranding;
    });
  };

  const handleSave = async (key) => {
    const draft = drafts[key];

    if (!draft) {
      return;
    }

    let parsedValue = {};

    try {
      parsedValue = draft.valueText.trim() ? JSON.parse(draft.valueText) : {};
    } catch (_error) {
      toast.error('Setting value must be valid JSON.');
      return;
    }

    if (!isObjectLike(parsedValue)) {
      toast.error('Setting value must be a JSON object.');
      return;
    }

    try {
      setSavingKey(key);
      await adminClient.updateSetting(key, parsedValue);
      toast.success('Setting updated successfully.');
      await loadSettings();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update setting.');
    } finally {
      setSavingKey('');
    }
  };

  const settingsMap = useMemo(
    () => Object.fromEntries(settings.map((setting) => [setting.key, setting.value])),
    [settings]
  );

  const editableSettings = useMemo(
    () => settings.filter((setting) => !['site_name', 'branding', 'pricing', 'upgrade_dialog'].includes(setting.key)),
    [settings]
  );

  const upgradeDialogPreview = useMemo(
    () => stringifyJson(buildUpgradeDialogPayload(upgradeDialogDraft, false)),
    [upgradeDialogDraft]
  );

  const handleSaveBranding = async () => {
    const nextSiteName = brandingDraft.siteName.trim() || DEFAULT_BRANDING_FORM.siteName;
    const nextPrimaryText = brandingDraft.primaryText.trim() || DEFAULT_BRANDING_FORM.primaryText;
    const nextAccentText = brandingDraft.accentText.trim() || DEFAULT_BRANDING_FORM.accentText;
    const nextBrandingPayload = {
      primaryText: nextPrimaryText,
      accentText: nextAccentText,
      iconPrimary: DEFAULT_BRANDING_FORM.iconPrimary,
      iconAccent: DEFAULT_BRANDING_FORM.iconAccent,
      logoImageUrl: '',
      logoDarkImageUrl: '',
      logoLightImageUrl: '',
      iconImageUrl: '',
      iconDarkImageUrl: '',
      iconLightImageUrl: '',
      tagline: brandingDraft.tagline?.trim() || DEFAULT_BRANDING_FORM.tagline,
      ...LOCKED_BRANDING_SYSTEM
    };

    try {
      setSavingBranding(true);
      await Promise.all([
        adminClient.updateSetting('site_name', {
          text: nextSiteName
        }),
        adminClient.updateSetting('branding', nextBrandingPayload)
      ]);
      applyBranding({
        siteName: nextSiteName,
        branding: nextBrandingPayload
      });
      toast.success('Branding updated successfully.');
      await loadSettings();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update branding.');
    } finally {
      setSavingBranding(false);
    }
  };

  const handleSavePricing = async () => {
    let payload;

    try {
      payload = buildPricingPayload(pricingDraft, settingsMap.pricing || DEFAULT_PRICING_FORM, true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Free and Pro pricing must be valid positive amounts.');
      return;
    }

    try {
      setSavingPricing(true);
      await adminClient.updateSetting('pricing', payload);
      toast.success('Pricing and visibility updated successfully.');
      await loadSettings();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update pricing.');
    } finally {
      setSavingPricing(false);
    }
  };

  const handleTogglePricingVisibility = async (enabled) => {
    if (savingPricing || pricingDraft.enabled === enabled) {
      return;
    }

    const nextDraft = {
      ...pricingDraft,
      enabled
    };

    setPricingDraft(nextDraft);

    try {
      setSavingPricing(true);
      await adminClient.updateSetting(
        'pricing',
        buildPricingPayload(nextDraft, settingsMap.pricing || DEFAULT_PRICING_FORM, false)
      );
      toast.success(
        enabled
          ? 'Pricing page is now visible on the user site.'
          : 'Pricing page is now hidden from the user site.'
      );
      await loadSettings();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update pricing visibility.');
      await loadSettings();
    } finally {
      setSavingPricing(false);
    }
  };

  const handleSaveUpgradeDialog = async () => {
    let payload;

    try {
      payload = buildUpgradeDialogPayload(upgradeDialogDraft, true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upgrade dialog configuration is invalid.');
      return;
    }

    try {
      setSavingUpgradeDialog(true);
      await adminClient.updateSetting('upgrade_dialog', payload);
      toast.success('Upgrade confirmation dialog updated successfully.');
      await loadSettings();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update the upgrade dialog.');
    } finally {
      setSavingUpgradeDialog(false);
    }
  };

  const handleCreateSetting = async () => {
    const key = newSetting.key.trim();

    if (!key) {
      toast.error('Enter a setting key before creating it.');
      return;
    }

    if (!isValidSettingKey(key)) {
      toast.error('Setting key can use only lowercase letters, numbers, and underscores.');
      return;
    }

    let parsedValue = {};

    try {
      parsedValue = newSetting.valueText.trim() ? JSON.parse(newSetting.valueText) : {};
    } catch (_error) {
      toast.error('New setting JSON must be valid.');
      return;
    }

    if (!isObjectLike(parsedValue)) {
      toast.error('New setting value must be a JSON object.');
      return;
    }

    try {
      setCreatingSetting(true);
      await adminClient.updateSetting(key, parsedValue);
      toast.success('Custom setting created.');
      setNewSetting({ key: '', valueText: '{\n  \n}' });
      await loadSettings();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create custom setting.');
    } finally {
      setCreatingSetting(false);
    }
  };

  const handleDeleteSetting = async (key) => {
    const shouldDelete = window.confirm(
      `Delete the "${key}" setting from admin? Core branding and pricing settings will stay protected.`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingSettingKey(key);
      await adminClient.deleteSetting(key);
      toast.success('Setting deleted successfully.');
      await loadSettings();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete setting.');
    } finally {
      setDeletingSettingKey('');
    }
  };

  const pageConfigs = {
    home: {
      title: 'Settings hub',
      subtitle:
        'Manage branding, pricing, upgrade dialog copy, free-plan limits, mail metadata, and configuration payloads stored in Supabase.',
      sectionScrollId: ''
    },
    branding: {
      title: 'Branding studio',
      subtitle: 'Edit logos, icons, brand colors, and live identity previews from a dedicated admin workspace.',
      sectionScrollId: 'settings-branding'
    },
    pricing: {
      title: 'Pricing controls',
      subtitle: 'Control plan visibility, currency, and free-versus-Pro pricing without opening raw JSON.',
      sectionScrollId: 'settings-pricing'
    },
    checkout: {
      title: 'Checkout dialog settings',
      subtitle: 'Edit the upgrade confirmation experience, payment labels, tokens, and copy shown before checkout.',
      sectionScrollId: 'settings-checkout'
    },
    custom: {
      title: 'Custom settings builder',
      subtitle: 'Create reusable JSON settings for future product experiments and admin-driven configuration.',
      sectionScrollId: 'settings-custom'
    },
    system: {
      title: 'System JSON settings',
      subtitle: 'Review and update the raw JSON payloads that power runtime behavior across the product.',
      sectionScrollId: 'settings-system'
    }
  };
  const currentPage = pageConfigs[pageView] || pageConfigs.home;
  const isHomeView = pageView === 'home';
  const showBrandingSection = pageView === 'branding';
  const showOverviewSection = isHomeView;
  const showHomeCardsSection = isHomeView;
  const showPricingSection = pageView === 'pricing';
  const showCheckoutSection = pageView === 'checkout';
  const showCustomSection = pageView === 'custom';
  const showSystemSection = pageView === 'system';

  return (
    <AdminShell
      title={currentPage.title}
      subtitle={currentPage.subtitle}
      headerVariant="compact"
      showStatusStrip={false}
      sectionScrollId={currentPage.sectionScrollId}
      actions={
        <button type="button" className="ghost-button" onClick={() => loadSettings()}>
          Refresh settings
        </button>
      }
    >
      {showBrandingSection ? <section id="settings-branding" className="two-column-grid">
        <article className="setting-card branding-editor-card">
          <p className="eyebrow">Branding studio</p>
          <h3>Unified LitFlow wordmark</h3>
          <p>
            The public site, admin panel, and preview screens now use one fixed bold wordmark. The old subtitle line
            and alternate logo mode options have been removed.
          </p>

          <div className="form-grid" style={{ marginTop: '1rem' }}>
            <label>
              <span>Site name</span>
              <input
                type="text"
                value={brandingDraft.siteName}
                onChange={(event) => updateBrandingDraft('siteName', event.target.value)}
                placeholder="LitFlow"
              />
            </label>

            <label>
              <span>Primary word</span>
              <input
                type="text"
                value={brandingDraft.primaryText}
                onChange={(event) => updateBrandingDraft('primaryText', event.target.value)}
                placeholder="Lit"
              />
            </label>

            <label>
              <span>Accent word</span>
              <input
                type="text"
                value={brandingDraft.accentText}
                onChange={(event) => updateBrandingDraft('accentText', event.target.value)}
                placeholder="Flow"
              />
            </label>

            <div className="full-span upload-field-card">
              <strong>Locked logo style</strong>
              <p className="helper-text" style={{ marginTop: '0.5rem' }}>
                Bold text wordmark, no subtitle line, blue plus white treatment on dark surfaces, and blue-only treatment
                on light surfaces. Uploaded logo and icon overrides are disabled for consistency.
              </p>
            </div>
          </div>

          <div className="card-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="primary-button" disabled={savingBranding} onClick={handleSaveBranding}>
              {savingBranding ? 'Saving branding...' : 'Save branding'}
            </button>
          </div>
        </article>

        <article className="setting-card branding-preview-card">
          <p className="eyebrow">Preview</p>
          <h3>Unified surface preview</h3>
          <p>Review the same bold LitFlow wordmark across dark and light UI surfaces.</p>

          <div className="branding-preview-grid">
            <div className="branding-preview-surface dark">
              <span className="branding-preview-surface-label">Dark surfaces</span>
              <BrandLogo
                large
                animated
                surface="dark"
                config={{
                  siteName: brandingDraft.siteName,
                  primaryText: brandingDraft.primaryText,
                  accentText: brandingDraft.accentText,
                  tagline: brandingDraft.tagline
                }}
              />
            </div>

            <div className="branding-preview-surface light">
              <span className="branding-preview-surface-label">Light surfaces</span>
              <BrandLogo
                large
                surface="light"
                config={{
                  siteName: brandingDraft.siteName,
                  primaryText: brandingDraft.primaryText,
                  accentText: brandingDraft.accentText,
                  tagline: brandingDraft.tagline
                }}
              />
            </div>
          </div>

          <div className="branding-preview-meta">
            <div className="info-card">
              <span>Site name</span>
              <strong>{brandingDraft.siteName || DEFAULT_BRANDING_FORM.siteName}</strong>
            </div>
            <div className="info-card">
              <span>Logo style</span>
              <strong>Bold blue wordmark</strong>
            </div>
            <div className="info-card">
              <span>Subtitle line</span>
              <strong>Hidden everywhere</strong>
            </div>
          </div>
        </article>
      </section> : null}

      {showOverviewSection ? <section id="settings-overview" className="metrics-grid">
        <MetricCard
          label="Site name"
          value={settingsMap.site_name?.text || 'LitFlow'}
          helper="Branding shown in the product"
        />
        <MetricCard
          label="Logo system"
          value="Unified"
          helper="Same wordmark on public and admin"
        />
        <MetricCard
          label="Pro monthly price"
          value={`INR ${settingsMap.pricing?.pro || 0}`}
          helper="Pricing payload"
        />
        <MetricCard
          label="Pricing page"
          value={settingsMap.pricing?.enabled === false ? 'Hidden' : 'Visible'}
          helper="Public upgrade surface"
        />
        <MetricCard
          label="Upgrade badges"
          value={upgradeDialogDraft.highlightBadges.length}
          helper="Confirmation dialog chips"
        />
        <MetricCard
          label="Free search limit"
          value={settingsMap.free_daily_search_limit?.value || 0}
          helper="Daily searches for FREE plan"
        />
        <MetricCard
          label="SMTP from"
          value={settingsMap.smtp?.from || 'Not set'}
          helper="Displayed mail sender"
        />
        <MetricCard
          label="Logo subtitle"
          value="Hidden"
          helper="Uppercase support line removed"
        />
      </section> : null}

      {showHomeCardsSection ? <section className="content-grid" style={{ marginTop: '1rem' }}>
        <div className="page-panel">
          <div className="panel-header">
            <div>
              <h3>Open a settings page</h3>
              <p>Each configuration area now lives on its own focused admin screen.</p>
            </div>
          </div>

          <div className="dashboard-shortcuts-grid">
            <WorkspaceLinkCard
              to="/settings/branding"
              label="Branding"
              description="Unified wordmark, site name, and live identity preview."
            />
            <WorkspaceLinkCard
              to="/settings/pricing"
              label="Pricing"
              description="Plan visibility, currency, and free-versus-Pro pricing controls."
            />
            <WorkspaceLinkCard
              to="/settings/checkout"
              label="Checkout dialog"
              description="Upgrade confirmation copy, tax rows, and pay-button behavior."
            />
            <WorkspaceLinkCard
              to="/settings/custom"
              label="Custom settings"
              description="Create reusable JSON payloads for future product changes."
            />
            <WorkspaceLinkCard
              to="/settings/system"
              label="System JSON"
              description="Review and update the raw stored config objects."
            />
            <WorkspaceLinkCard
              to="/controls"
              label="Feature controls"
              description="Open runtime flags when a config change also needs a rollout switch."
            />
          </div>
        </div>

        <div className="page-panel">
          <div className="panel-header">
            <div>
              <h3>Settings workflow</h3>
              <p>Use the hub for overview, then switch to a dedicated screen for the exact config you need.</p>
            </div>
          </div>

          <div className="list-stack">
            <div className="activity-item">
              <strong>Branding</strong>
              <p>Best for logos, icon variants, color adjustments, and visual identity updates.</p>
            </div>
            <div className="activity-item">
              <strong>Pricing + checkout</strong>
              <p>Best for monetization changes, upgrade flow copy, and payment-facing labels.</p>
            </div>
            <div className="activity-item">
              <strong>Custom + system JSON</strong>
              <p>Best for advanced config payloads and developer-facing runtime settings.</p>
            </div>
          </div>
        </div>
      </section> : null}

      {showPricingSection ? <section id="settings-pricing" className="two-column-grid" style={{ marginTop: '0' }}>
        <article className="setting-card">
          <p className="eyebrow">Monetization</p>
          <h3>Pricing visibility and plan control</h3>
          <p>
            Turn the public pricing surface on or off, and manage the Starter and Pro amounts without editing raw JSON.
          </p>

          <div className="branding-mode-toggle" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className={`toggle-button ${pricingDraft.enabled ? 'active' : ''}`.trim()}
              disabled={savingPricing}
              onClick={() => handleTogglePricingVisibility(true)}
            >
              Pricing page on
            </button>
            <button
              type="button"
              className={`toggle-button ${pricingDraft.enabled ? '' : 'active'}`.trim()}
              disabled={savingPricing}
              onClick={() => handleTogglePricingVisibility(false)}
            >
              Pricing page off
            </button>
          </div>

          <div className="form-grid" style={{ marginTop: '1rem' }}>
            <label>
              <span>Currency</span>
              <input
                value={pricingDraft.currency}
                onChange={(event) => updatePricingDraft('currency', event.target.value.toUpperCase())}
                placeholder="INR"
              />
            </label>

            <label>
              <span>Billing cycle</span>
              <input
                value={pricingDraft.billingCycle}
                onChange={(event) => updatePricingDraft('billingCycle', event.target.value)}
                placeholder="month"
              />
            </label>

            <label>
              <span>Starter price</span>
              <input
                type="number"
                min="0"
                step="1"
                value={pricingDraft.free}
                onChange={(event) => updatePricingDraft('free', event.target.value)}
                placeholder="0"
              />
            </label>

            <label>
              <span>Pro price</span>
              <input
                type="number"
                min="0"
                step="1"
                value={pricingDraft.pro}
                onChange={(event) => updatePricingDraft('pro', event.target.value)}
                placeholder="999"
              />
            </label>
          </div>

          <div className="card-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="primary-button" disabled={savingPricing} onClick={handleSavePricing}>
              {savingPricing ? 'Saving pricing...' : 'Save pricing controls'}
            </button>
          </div>
        </article>

        <article className="setting-card">
          <p className="eyebrow">Live behavior</p>
          <h3>What users will see right now</h3>
          <p>These rules apply to the public home page, account area, header menus, and workspace footer.</p>

          <div className="list-stack" style={{ marginTop: '1rem' }}>
            <div className="activity-item">
              <strong>{pricingDraft.enabled ? 'Pricing is visible' : 'Pricing is hidden'}</strong>
              <p>
                {pricingDraft.enabled
                  ? 'Users can open the pricing page and see upgrade buttons in the workspace.'
                  : 'Users will not see the pricing page, pricing links, or public upgrade buttons.'}
              </p>
            </div>
            <div className="activity-item">
              <strong>Existing Pro workspaces keep access</strong>
              <p>Turning pricing off hides the sales surface only. Current Pro users can still use premium features normally.</p>
            </div>
            <div className="activity-item">
              <strong>Admin can turn it back on anytime</strong>
              <p>Switch pricing back on to show the upgrade flow again without redeploying the website.</p>
            </div>
          </div>
        </article>
      </section> : null}

      {showCheckoutSection ? <section id="settings-checkout" className="two-column-grid" style={{ marginTop: '0' }}>
        <article className="setting-card">
          <p className="eyebrow">Checkout dialog</p>
          <h3>Edit the upgrade confirmation flow</h3>
          <p>
            Change the confirmation screen that appears before payment. You can edit copy, tax labels, feature chips,
            pricing rows, account rows, and button text directly from the admin panel.
          </p>

          <div className="form-grid" style={{ marginTop: '1rem' }}>
            <label>
              <span>Badge text</span>
              <input
                value={upgradeDialogDraft.badgeText}
                onChange={(event) => updateUpgradeDialogDraft('badgeText', event.target.value)}
                placeholder="Confirm Upgrade"
              />
            </label>

            <label>
              <span>Tax rate</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={upgradeDialogDraft.taxRate}
                onChange={(event) => updateUpgradeDialogDraft('taxRate', event.target.value)}
                placeholder="18"
              />
            </label>

            <label className="full-span">
              <span>Title</span>
              <input
                value={upgradeDialogDraft.title}
                onChange={(event) => updateUpgradeDialogDraft('title', event.target.value)}
                placeholder="Confirm plan changes"
              />
            </label>

            <label className="full-span">
              <span>Description</span>
              <textarea
                value={upgradeDialogDraft.description}
                onChange={(event) => updateUpgradeDialogDraft('description', event.target.value)}
                placeholder="Review your Pro workspace billing details before opening the secure payment checkout."
              />
            </label>

            <label>
              <span>Plan title template</span>
              <input
                value={upgradeDialogDraft.planTitle}
                onChange={(event) => updateUpgradeDialogDraft('planTitle', event.target.value)}
                placeholder="{siteName} Pro subscription"
              />
            </label>

            <label>
              <span>Plan description template</span>
              <input
                value={upgradeDialogDraft.planDescription}
                onChange={(event) => updateUpgradeDialogDraft('planDescription', event.target.value)}
                placeholder="{billingCycleLabel}"
              />
            </label>

            <label>
              <span>Amount label</span>
              <input
                value={upgradeDialogDraft.dueTodayLabel}
                onChange={(event) => updateUpgradeDialogDraft('dueTodayLabel', event.target.value)}
                placeholder="Due today"
              />
            </label>

            <label>
              <span>Cancel button text</span>
              <input
                value={upgradeDialogDraft.cancelButtonLabel}
                onChange={(event) => updateUpgradeDialogDraft('cancelButtonLabel', event.target.value)}
                placeholder="Cancel"
              />
            </label>

            <label className="full-span">
              <span>Pay button text</span>
              <input
                value={upgradeDialogDraft.payButtonLabel}
                onChange={(event) => updateUpgradeDialogDraft('payButtonLabel', event.target.value)}
                placeholder="Pay now"
              />
            </label>

            <div className="full-span">
              <div className="split-inline">
                <div>
                  <span>Feature badges</span>
                  <p className="helper-text">Add or edit the chips shown under the plan details.</p>
                </div>
                <button
                  type="button"
                  className="ghost-button small-button"
                  onClick={() => addUpgradeDialogArrayItem('highlightBadges', { label: '', icon: 'sparkles' })}
                >
                  Add badge
                </button>
              </div>

              <div className="list-stack" style={{ marginTop: '0.75rem' }}>
                {upgradeDialogDraft.highlightBadges.map((item, index) => (
                  <div key={`badge-${index}`} className="activity-item">
                    <div className="form-grid">
                      <label>
                        <span>Badge label</span>
                        <input
                          value={item.label}
                          onChange={(event) =>
                            updateUpgradeDialogArrayItem('highlightBadges', index, 'label', event.target.value)
                          }
                          placeholder="Unlimited research credits"
                        />
                      </label>
                      <label>
                        <span>Icon key</span>
                        <input
                          value={item.icon}
                          onChange={(event) =>
                            updateUpgradeDialogArrayItem('highlightBadges', index, 'icon', event.target.value)
                          }
                          placeholder="sparkles or shield"
                        />
                      </label>
                    </div>
                    <div className="card-actions" style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        className="ghost-button small-button"
                        onClick={() => removeUpgradeDialogArrayItem('highlightBadges', index)}
                      >
                        Remove badge
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="full-span">
              <div className="split-inline">
                <div>
                  <span>Summary rows</span>
                  <p className="helper-text">These rows render subtotal, tax, total, or any custom payment line.</p>
                </div>
                <button
                  type="button"
                  className="ghost-button small-button"
                  onClick={() =>
                    addUpgradeDialogArrayItem('summaryRows', {
                      label: '',
                      value: '{total}',
                      emphasized: false
                    })
                  }
                >
                  Add summary row
                </button>
              </div>

              <div className="list-stack" style={{ marginTop: '0.75rem' }}>
                {upgradeDialogDraft.summaryRows.map((item, index) => (
                  <div key={`summary-row-${index}`} className="activity-item">
                    <div className="form-grid">
                      <label>
                        <span>Label</span>
                        <input
                          value={item.label}
                          onChange={(event) =>
                            updateUpgradeDialogArrayItem('summaryRows', index, 'label', event.target.value)
                          }
                          placeholder="Subtotal"
                        />
                      </label>
                      <label>
                        <span>Value template</span>
                        <input
                          value={item.value}
                          onChange={(event) =>
                            updateUpgradeDialogArrayItem('summaryRows', index, 'value', event.target.value)
                          }
                          placeholder="{subtotal}"
                        />
                      </label>
                      <label>
                        <span>Emphasized</span>
                        <select
                          value={item.emphasized ? 'yes' : 'no'}
                          onChange={(event) =>
                            updateUpgradeDialogArrayItem(
                              'summaryRows',
                              index,
                              'emphasized',
                              event.target.value === 'yes'
                            )
                          }
                        >
                          <option value="no">no</option>
                          <option value="yes">yes</option>
                        </select>
                      </label>
                    </div>
                    <div className="card-actions" style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        className="ghost-button small-button"
                        onClick={() => removeUpgradeDialogArrayItem('summaryRows', index)}
                      >
                        Remove row
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="full-span">
              <div className="split-inline">
                <div>
                  <span>Info rows</span>
                  <p className="helper-text">Add payment, account, support, or any other metadata rows.</p>
                </div>
                <button
                  type="button"
                  className="ghost-button small-button"
                  onClick={() =>
                    addUpgradeDialogArrayItem('infoRows', {
                      label: '',
                      value: '',
                      emphasized: false
                    })
                  }
                >
                  Add info row
                </button>
              </div>

              <div className="list-stack" style={{ marginTop: '0.75rem' }}>
                {upgradeDialogDraft.infoRows.map((item, index) => (
                  <div key={`info-row-${index}`} className="activity-item">
                    <div className="form-grid">
                      <label>
                        <span>Label</span>
                        <input
                          value={item.label}
                          onChange={(event) =>
                            updateUpgradeDialogArrayItem('infoRows', index, 'label', event.target.value)
                          }
                          placeholder="Payment method"
                        />
                      </label>
                      <label>
                        <span>Value template</span>
                        <input
                          value={item.value}
                          onChange={(event) =>
                            updateUpgradeDialogArrayItem('infoRows', index, 'value', event.target.value)
                          }
                          placeholder="Secure Razorpay checkout"
                        />
                      </label>
                    </div>
                    <div className="card-actions" style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        className="ghost-button small-button"
                        onClick={() => removeUpgradeDialogArrayItem('infoRows', index)}
                      >
                        Remove row
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card-actions" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="primary-button"
              disabled={savingUpgradeDialog}
              onClick={handleSaveUpgradeDialog}
            >
              {savingUpgradeDialog ? 'Saving checkout dialog...' : 'Save checkout dialog'}
            </button>
          </div>
        </article>

        <article className="setting-card">
          <p className="eyebrow">Dynamic tokens</p>
          <h3>Use live values inside checkout copy</h3>
          <p>
            Templates inside the upgrade dialog can reference runtime values. This lets admin change the copy without
            hardcoding amounts, user email, or site name.
          </p>

          <div className="list-stack" style={{ marginTop: '1rem' }}>
            {[
              ['{siteName}', 'Current site name from branding settings'],
              ['{billingCycle}', 'Raw billing cycle like month or year'],
              ['{billingCycleLabel}', 'Human text like Billed monthly, starting today'],
              ['{subtotal}', 'Subtotal amount after tax split'],
              ['{tax}', 'Tax amount based on the configured tax rate'],
              ['{taxRate}', 'Tax rate number from the admin form'],
              ['{total}', 'Final payable amount from pricing settings'],
              ['{proPrice}', 'Formatted Pro plan price'],
              ['{userEmail}', 'Currently signed-in user email'],
              ['{currency}', 'Configured pricing currency']
            ].map(([token, description]) => (
              <div key={token} className="activity-item">
                <strong>{token}</strong>
                <p>{description}</p>
              </div>
            ))}
          </div>

          <label style={{ marginTop: '1rem' }}>
            <span>Live JSON preview</span>
            <textarea className="json-textarea" value={upgradeDialogPreview} readOnly />
          </label>
        </article>
      </section> : null}

      {showCustomSection ? <section id="settings-custom" className="two-column-grid" style={{ marginTop: '0' }}>
        <article className="setting-card">
          <p className="eyebrow">Custom setting</p>
          <h3>Create new site setting</h3>
          <p>Add a brand-new JSON setting from the admin panel without touching the database manually.</p>

          <div className="form-grid" style={{ marginTop: '1rem' }}>
            <label className="full-span">
              <span>Setting key</span>
              <input
                value={newSetting.key}
                onChange={(event) => setNewSetting((current) => ({ ...current, key: event.target.value }))}
                placeholder="homepage_layout or design_tokens"
              />
            </label>

            <label className="full-span">
              <span>JSON value</span>
              <textarea
                className="json-textarea"
                value={newSetting.valueText}
                onChange={(event) => setNewSetting((current) => ({ ...current, valueText: event.target.value }))}
              />
            </label>
          </div>

          <div className="card-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="primary-button" disabled={creatingSetting} onClick={handleCreateSetting}>
              {creatingSetting ? 'Creating setting...' : 'Create setting'}
            </button>
          </div>
        </article>

        <article className="setting-card">
          <p className="eyebrow">Delete settings</p>
          <h3>Remove custom or operational JSON settings</h3>
          <p>
            Anything added as a non-core setting can be deleted from here. Core branding, pricing, site name, and
            checkout settings stay protected so the admin panel cannot break the live product accidentally.
          </p>

          <div className="list-stack" style={{ marginTop: '1rem' }}>
            {loading ? (
              <div className="empty-state">Loading removable settings...</div>
            ) : editableSettings.length ? (
              editableSettings.map((setting) => {
                const copy = SETTING_COPY[setting.key] || {
                  title: setting.key,
                  description: 'Custom JSON setting stored in Supabase.'
                };

                return (
                  <div key={`custom-delete-${setting.key}`} className="activity-item">
                    <div className="split-inline">
                      <div>
                        <strong>{copy.title}</strong>
                        <p>{copy.description}</p>
                      </div>
                      <button
                        type="button"
                        className="danger-button small-button"
                        disabled={Boolean(savingKey) || deletingSettingKey === setting.key}
                        onClick={() => handleDeleteSetting(setting.key)}
                      >
                        {deletingSettingKey === setting.key ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">No removable settings are stored yet.</div>
            )}
          </div>
        </article>
      </section> : null}

      {showSystemSection ? <section id="settings-system" className="cards-grid" style={{ marginTop: '0' }}>
        {loading ? (
          <div className="empty-state">Loading settings...</div>
        ) : !editableSettings.length ? (
          <div className="empty-state">No removable system settings are stored yet.</div>
        ) : (
          editableSettings.map((setting) => {
            const copy = SETTING_COPY[setting.key] || {
              title: setting.key,
              description: 'Custom JSON setting stored in Supabase.'
            };

            return (
              <article key={setting.key} className="setting-card">
                <p className="eyebrow">System setting</p>
                <h3>{copy.title}</h3>
                <p>{copy.description}</p>

                <label style={{ marginTop: '1rem' }}>
                  <span>JSON value</span>
                  <textarea
                    className="json-textarea"
                    value={drafts[setting.key]?.valueText || stringifyJson(setting.value)}
                    onChange={(event) => updateDraft(setting.key, event.target.value)}
                  />
                </label>

                <div className="card-actions" style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={Boolean(savingKey) || deletingSettingKey === setting.key}
                    onClick={() => handleSave(setting.key)}
                  >
                    {savingKey === setting.key ? 'Saving...' : 'Save setting'}
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    disabled={Boolean(savingKey) || deletingSettingKey === setting.key}
                    onClick={() => handleDeleteSetting(setting.key)}
                  >
                    {deletingSettingKey === setting.key ? 'Deleting...' : 'Delete setting'}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section> : null}
    </AdminShell>
  );
}
