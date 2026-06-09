import { z } from 'zod';

import { logAnalyticsEvent } from '../admin/services/analyticsService.js';
import { getFeatureState } from '../admin/services/runtimeConfigService.js';
import { PLAN_IDS } from '../constants/plans.js';
import {
  countSavedPapersByUserId,
  deleteSavedPaperByUserAndPaperId,
  findSavedPaperByUserAndPaperId,
  updateSavedPaperSummary,
  upsertSavedPaperForUser
} from '../repositories/savedPapersRepository.js';
import { summarizePaper } from '../services/openaiService.js';
import {
  assertCanSearch,
  getEffectivePlanCapabilities,
  getPlanCapabilities,
  getQuotaSnapshot,
  recordSearch
} from '../services/quotaService.js';
import { searchAcademicPapers } from '../services/semanticScholarService.js';
import { getPublicSiteConfig } from '../services/siteConfigService.js';
import { ApiError } from '../utils/apiError.js';

export const searchPapersSchema = {
  body: z.object({
    query: z.string().min(2),
    limit: z.number().int().min(1).max(12).optional().default(12),
    filters: z
      .object({
        yearStart: z.number().int().min(1900).max(2100).nullable().optional(),
        yearEnd: z.number().int().min(1900).max(2100).nullable().optional(),
        author: z.string().max(120).optional().default(''),
        keywords: z.string().max(250).optional().default('')
      })
      .optional()
      .default({})
  })
};

export async function searchPapers(req, res) {
  const guestId = req.ip;
  const { query, limit, filters } = req.body;
  const canUseAdvancedFilters = req.user?.plan === PLAN_IDS.PRO;
  const publicSiteConfig = await getPublicSiteConfig();
  const isPricingEnabled = publicSiteConfig.pricing.enabled !== false;

  await assertCanSearch({ user: req.user, guestId });

  const searchResult = await searchAcademicPapers({
    query,
    limit,
    yearStart: filters.yearStart || undefined,
    yearEnd: filters.yearEnd || undefined,
    author: canUseAdvancedFilters ? filters.author : '',
    keywords: canUseAdvancedFilters ? filters.keywords : ''
  });

  const updatedUser = await recordSearch({ user: req.user, guestId });
  const effectiveUser = updatedUser || req.user;
  const planCapabilities = await getEffectivePlanCapabilities(effectiveUser?.plan || PLAN_IDS.FREE);

  await logAnalyticsEvent({
    userId: effectiveUser?.id || null,
    eventType: 'search',
    keyword: query,
    plan: effectiveUser?.plan || 'GUEST',
    payload: {
      filters,
      results: searchResult.papers.length
    }
  });

  res.json({
    success: true,
    ...searchResult,
    appliedFilters: {
      yearStart: filters.yearStart || null,
      yearEnd: filters.yearEnd || null,
      author: canUseAdvancedFilters ? filters.author : '',
      keywords: canUseAdvancedFilters ? filters.keywords : ''
    },
    quota: getQuotaSnapshot({ user: effectiveUser, guestId }),
    planCapabilities,
    upsell: canUseAdvancedFilters
      ? null
      : isPricingEnabled
        ? 'Upgrade to Pro to unlock author and keyword filters, AI summaries, unlimited saves, and an ad-free workspace.'
        : 'Advanced filters and premium tools are currently managed by the admin team.'
  });
}

export const savePaperSchema = {
  body: z.object({
    paperId: z.string().min(1),
    title: z.string().min(1),
    authors: z
      .array(
        z.object({
          authorId: z.string().optional().default(''),
          name: z.string()
        })
      )
      .default([]),
    year: z.number().int().nullable().optional(),
    abstract: z.string().optional().default(''),
    venue: z.string().optional().default(''),
    url: z.string().url().optional().or(z.literal('')).default(''),
    pdfUrl: z.string().url().optional().or(z.literal('')).default(''),
    fieldsOfStudy: z.array(z.string()).optional().default([]),
    summary: z.string().optional().default(''),
    simplifiedAbstract: z.string().optional().default('')
  })
};

export async function savePaper(req, res) {
  const capabilities = getPlanCapabilities(req.user.plan);
  const existingPaper = await findSavedPaperByUserAndPaperId(req.user.id, req.body.paperId);
  const savedCount = await countSavedPapersByUserId(req.user.id);

  if (!existingPaper && savedCount >= capabilities.maxSavedPapers) {
    const publicSiteConfig = await getPublicSiteConfig();

    throw new ApiError(
      403,
      publicSiteConfig.pricing.enabled !== false
        ? 'Free plan save limit reached. Upgrade to Pro for unlimited paper bookmarks.'
        : 'Free plan save limit reached for this workspace.'
    );
  }

  const savedPaper = await upsertSavedPaperForUser(req.user.id, req.body);

  await logAnalyticsEvent({
    userId: req.user.id,
    eventType: 'paper_saved',
    paperId: savedPaper.paperId,
    plan: req.user.plan,
    payload: {
      title: savedPaper.title
    }
  });

  res.json({
    success: true,
    savedPaper
  });
}

export const deleteSavedPaperSchema = {
  params: z.object({
    paperId: z.string().min(1)
  })
};

export async function deleteSavedPaper(req, res) {
  await deleteSavedPaperByUserAndPaperId(req.user.id, req.params.paperId);

  res.json({
    success: true,
    message: 'Paper removed from your dashboard.'
  });
}

export const summarizePaperSchema = {
  body: z.object({
    paperId: z.string().min(1),
    title: z.string().min(1),
    abstract: z.string().min(20)
  })
};

export async function generatePaperSummary(req, res) {
  const aiEnabled = await getFeatureState('ai_features', true);

  if (!aiEnabled) {
    throw new ApiError(403, 'AI features are currently disabled by the admin.');
  }

  if (req.user.plan !== PLAN_IDS.PRO) {
    const publicSiteConfig = await getPublicSiteConfig();

    throw new ApiError(
      403,
      publicSiteConfig.pricing.enabled !== false
        ? 'AI summaries are available on the Pro plan only.'
        : 'AI summaries are not available for this workspace.'
    );
  }

  const summaryPayload = await summarizePaper(req.body);

  await updateSavedPaperSummary(req.user.id, req.body.paperId, summaryPayload);
  await logAnalyticsEvent({
    userId: req.user.id,
    eventType: 'ai_summary',
    paperId: req.body.paperId,
    plan: req.user.plan,
    metricValue: 1,
    payload: {
      title: req.body.title,
      usage: summaryPayload.usage || {},
      estimatedCostInr: summaryPayload.estimatedCostInr || 0
    }
  });

  res.json({
    success: true,
    ...summaryPayload
  });
}
