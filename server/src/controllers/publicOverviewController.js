import { env } from '../config/env.js';
import { localPaperCatalog } from '../data/localResearchCatalog.js';
import { listAnalyticsEvents, listContentPapers } from '../admin/repositories/systemRepository.js';
import { getAllUsersLite } from '../admin/repositories/panelRepository.js';
import { getPublicSiteConfig } from '../services/siteConfigService.js';

const PUBLIC_OVERVIEW_CACHE_TTL_MS = 30 * 1000;
let publicOverviewCache = null;

function mapFallbackPaper(paper) {
  return {
    paperId: paper.paperId,
    title: paper.title,
    authors: (paper.authors || []).map((author) => author.name).filter(Boolean),
    year: paper.year || null,
    venue: paper.venue || '',
    abstract: paper.abstract || '',
    url: paper.url || '',
    pdfUrl: paper.pdfUrl || '',
    topic: (paper.fieldsOfStudy || [])[0] || 'Research'
  };
}

function mapContentPaper(paper) {
  return {
    paperId: paper.paperId || `${paper.id}`,
    title: paper.title,
    authors: Array.isArray(paper.authors)
      ? paper.authors.map((author) => author?.name || author).filter(Boolean)
      : [],
    year: paper.year || null,
    venue: paper.venue || '',
    abstract: paper.abstract || '',
    url: paper.url || '',
    pdfUrl: paper.pdfUrl || '',
    topic: paper.notes || 'Featured research'
  };
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 1 : 0
  }).format(Math.max(0, Number(value) || 0));
}

function buildPopularTopics(searchEvents) {
  const topicScores = new Map();

  searchEvents.forEach((event) => {
    const keyword = `${event.keyword || ''}`.trim();

    if (!keyword) {
      return;
    }

    topicScores.set(keyword, (topicScores.get(keyword) || 0) + 1);
  });

  const rankedTopics = Array.from(topicScores.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  if (rankedTopics.length > 0) {
    return rankedTopics;
  }

  return ['Transformers', 'Computer Vision', 'Reinforcement Learning', 'Climate Science', 'Bioinformatics'];
}

function buildSystemSignals({ siteConfig }) {
  const isPricingEnabled = siteConfig.pricing.enabled !== false;

  return [
    {
      title: 'OTP Access',
      state: env.smtpHost && env.smtpUser && env.smtpPass ? 'live' : 'preview',
      detail:
        env.smtpHost && env.smtpUser && env.smtpPass
          ? 'Email OTP delivery is configured for real sign-in sessions.'
          : 'Preview OTP mode keeps the local workspace accessible while SMTP is being finalized.'
    },
    {
      title: 'Literature Search',
      state: env.semanticScholarApiKey ? 'live' : 'fallback',
      detail: env.semanticScholarApiKey
        ? 'Semantic Scholar search and citation graph expansion are ready.'
        : 'Local research catalog fallback keeps demos and testing fully usable.'
    },
    {
      title: 'AI Summaries',
      state: env.openAiApiKey ? 'live' : 'fallback',
      detail: env.openAiApiKey
        ? `OpenAI summaries are enabled with ${env.openAiModel}.`
        : 'Fallback summaries keep the AI workflow usable even before OpenAI keys are attached.'
    },
    {
      title: 'Billing Control',
      state: isPricingEnabled && env.razorpayKeyId && env.razorpayKeySecret ? 'live' : 'standby',
      detail:
        isPricingEnabled && env.razorpayKeyId && env.razorpayKeySecret
          ? 'Razorpay subscriptions can promote free workspaces to Pro.'
          : 'Pricing can stay hidden until the billing stack is ready for launch.'
    }
  ];
}

export async function getPublicOverview(_req, res) {
  if (publicOverviewCache && publicOverviewCache.expiresAt > Date.now()) {
    res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=30');
    res.json(publicOverviewCache.payload);
    return;
  }

  const [siteConfigResult, usersResult, searchEventsResult, contentResult] = await Promise.allSettled([
    getPublicSiteConfig(),
    getAllUsersLite(),
    listAnalyticsEvents({ eventType: 'search', limit: 400 }),
    listContentPapers({ page: 1, pageSize: 6 })
  ]);

  const siteConfig = siteConfigResult.status === 'fulfilled'
    ? siteConfigResult.value
    : {
        siteName: env.appName,
        branding: {
          primaryColor: '#60a5fa',
          secondaryColor: '#2dd4bf',
          tagline: 'Research graphs that move with you'
        },
        pricing: {
          enabled: false
        }
      };
  const users = usersResult.status === 'fulfilled' ? usersResult.value : [];
  const searchEvents = searchEventsResult.status === 'fulfilled' ? searchEventsResult.value : [];
  const contentRows = contentResult.status === 'fulfilled' ? contentResult.value.rows : [];
  const featuredPapers = contentRows.length > 0
    ? contentRows.map(mapContentPaper)
    : [...localPaperCatalog]
        .sort((left, right) => (right.citationCount || 0) - (left.citationCount || 0))
        .slice(0, 6)
        .map(mapFallbackPaper);
  const proUsers = users.filter((user) => user.plan === 'PRO').length;
  const degraded =
    siteConfigResult.status === 'rejected' ||
    usersResult.status === 'rejected' ||
    searchEventsResult.status === 'rejected' ||
    contentResult.status === 'rejected';

  const payload = {
    success: true,
    degraded,
    generatedAt: new Date().toISOString(),
    metrics: {
      workspaces: {
        value: users.length,
        label: 'Research workspaces',
        displayValue: formatCompactNumber(users.length),
        detail: 'Accounts created in the platform'
      },
      searches: {
        value: searchEvents.length,
        label: 'Tracked searches',
        displayValue: formatCompactNumber(searchEvents.length),
        detail: 'Measured from live analytics events'
      },
      proAccounts: {
        value: proUsers,
        label: 'Pro workspaces',
        displayValue: formatCompactNumber(proUsers),
        detail: 'Premium research teams unlocked'
      },
      featuredResearch: {
        value: featuredPapers.length,
        label: 'Featured research stories',
        displayValue: formatCompactNumber(featuredPapers.length),
        detail: 'Homepage spotlight papers ready for public presentation'
      }
    },
    systemSignals: buildSystemSignals({ siteConfig }),
    popularTopics: buildPopularTopics(searchEvents),
    featuredPapers
  };

  publicOverviewCache = {
    expiresAt: Date.now() + PUBLIC_OVERVIEW_CACHE_TTL_MS,
    payload
  };

  res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=30');
  res.json(payload);
}
