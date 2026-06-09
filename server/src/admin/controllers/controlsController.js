import { z } from 'zod';

import { createAdminLog } from '../repositories/adminLogsRepository.js';
import {
  deleteSiteSetting,
  getSiteSetting,
  listFeatureControls,
  listSiteSettings,
  updateFeatureControl,
  upsertSiteSetting
} from '../repositories/systemRepository.js';
import { invalidateRuntimeConfigCache } from '../services/runtimeConfigService.js';
import {
  getDefaultPublicSiteConfig,
  mergeRuntimeFeatureOverride,
  normalizeBranding,
  normalizeUpgradeDialog
} from '../../services/siteConfigService.js';
import { readPublicSiteConfigSnapshot, writePublicSiteConfigSnapshot } from '../../services/siteConfigSnapshotService.js';
import { ApiError } from '../../utils/apiError.js';

const PROTECTED_SETTING_KEYS = ['site_name', 'branding', 'pricing', 'upgrade_dialog'];

function getIpAddress(req) {
  return req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip || 'unknown';
}

async function syncPublicSiteConfigSnapshot(key, value) {
  if (!PROTECTED_SETTING_KEYS.includes(key)) {
    return;
  }

  const snapshot = (await readPublicSiteConfigSnapshot()) || getDefaultPublicSiteConfig();

  if (key === 'site_name') {
    const nextSiteName = String(value?.text || snapshot.siteName || 'LitFlow').trim() || 'LitFlow';
    snapshot.siteName = nextSiteName;
    snapshot.branding = normalizeBranding(snapshot.branding, nextSiteName);
  }

  if (key === 'branding') {
    snapshot.branding = normalizeBranding(value, snapshot.siteName);
  }

  if (key === 'pricing') {
    snapshot.pricing = {
      ...snapshot.pricing,
      currency: value?.currency || snapshot.pricing?.currency || 'INR',
      free: Number(value?.free ?? snapshot.pricing?.free ?? 0),
      pro: Number(value?.pro ?? snapshot.pricing?.pro ?? 999),
      billingCycle: value?.billingCycle || snapshot.pricing?.billingCycle || 'month',
      enabled: value?.enabled === true
    };
  }

  if (key === 'upgrade_dialog') {
    snapshot.upgradeDialog = normalizeUpgradeDialog(value);
  }

  await writePublicSiteConfigSnapshot(snapshot);
}

export async function getAdminControls(req, res) {
  const [features, settings] = await Promise.all([listFeatureControls(), listSiteSettings()]);

  res.json({
    success: true,
    features,
    settings
  });
}

export const updateFeatureSchema = {
  params: z.object({
    key: z.string().min(1)
  }),
  body: z.object({
    enabled: z.boolean(),
    config: z.record(z.any()).optional().default({})
  })
};

export async function updateAdminFeatureControl(req, res) {
  const feature = await updateFeatureControl(req.params.key, req.body);
  invalidateRuntimeConfigCache();
  const snapshot = (await readPublicSiteConfigSnapshot()) || getDefaultPublicSiteConfig();

  await writePublicSiteConfigSnapshot({
    ...snapshot,
    features: mergeRuntimeFeatureOverride(snapshot.features, feature)
  });

  await createAdminLog({
    adminId: req.adminUser.id,
    action: 'feature_control_updated',
    targetType: 'feature_control',
    targetId: req.params.key,
    ipAddress: getIpAddress(req),
    metadata: req.body
  });

  res.json({
    success: true,
    feature
  });
}

export const updateSettingSchema = {
  params: z.object({
    key: z.string().min(1)
  }),
  body: z.object({
    value: z.record(z.any())
  })
};

export async function updateAdminSetting(req, res) {
  const setting = await upsertSiteSetting(req.params.key, req.body.value);
  invalidateRuntimeConfigCache();
  await syncPublicSiteConfigSnapshot(req.params.key, req.body.value);

  await createAdminLog({
    adminId: req.adminUser.id,
    action: 'site_setting_updated',
    targetType: 'site_setting',
    targetId: req.params.key,
    ipAddress: getIpAddress(req),
    metadata: req.body.value
  });

  res.json({
    success: true,
    setting
  });
}

export const deleteSettingSchema = {
  params: z.object({
    key: z.string().min(1)
  })
};

export async function removeAdminSetting(req, res) {
  const { key } = req.params;

  if (PROTECTED_SETTING_KEYS.includes(key)) {
    throw new ApiError(400, 'Core settings cannot be deleted from admin.');
  }

  const existingSetting = await getSiteSetting(key);

  if (!existingSetting) {
    throw new ApiError(404, 'Setting not found.');
  }

  await deleteSiteSetting(key);
  invalidateRuntimeConfigCache();

  await createAdminLog({
    adminId: req.adminUser.id,
    action: 'site_setting_deleted',
    targetType: 'site_setting',
    targetId: key,
    ipAddress: getIpAddress(req),
    metadata: {
      previousValue: existingSetting.value
    }
  });

  res.json({
    success: true,
    key
  });
}
