import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BrainCircuit,
  Crown,
  FileSearch,
  FolderHeart,
  Network,
  RadioTower,
  ShieldCheck,
  Telescope,
} from 'lucide-react';

import { apiRequest } from '@/api/http';
import jumbotronArtwork from '@/assets/jumbotron.svg';
import { BrandWordmark } from '@/components/branding/BrandWordmark';
import { WebsiteFooter } from '@/components/public/WebsiteFooter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';

type OverviewMetric = {
  value: number;
  label: string;
  displayValue: string;
  detail: string;
};

type SystemSignal = {
  title: string;
  state: 'live' | 'preview' | 'fallback' | 'standby';
  detail: string;
};

type FeaturedPaper = {
  paperId: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string;
  abstract: string;
  url: string;
  pdfUrl: string;
  topic: string;
};

type PublicOverviewPayload = {
  success: boolean;
  degraded?: boolean;
  generatedAt?: string;
  metrics?: {
    workspaces?: OverviewMetric;
    searches?: OverviewMetric;
    proAccounts?: OverviewMetric;
    featuredResearch?: OverviewMetric;
  };
  systemSignals?: SystemSignal[];
  popularTopics?: string[];
  featuredPapers?: FeaturedPaper[];
};

type ShowcaseArtworkKind = 'search' | 'organize' | 'review' | 'sync' | 'share' | 'trust';
type SignalBadge = {
  title: string;
  dot: string;
  badge: string;
  label: string;
};
type ShowcaseArtworkProps = {
  kind: ShowcaseArtworkKind;
  papers: FeaturedPaper[];
  popularTopics: string[];
  signals: SignalBadge[];
  siteName: string;
  freePrice: string;
  proPrice: string;
  isPricingEnabled: boolean;
};

function formatPrice(currency: string, amount: number, cycle = 'month') {
  try {
    return `${new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)} / ${cycle}`;
  } catch {
    return `${currency} ${amount} / ${cycle}`;
  }
}

function trimCopy(value: string, maxLength = 180) {
  const normalized = `${value}`.replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function buildFallbackOverview(siteName: string): PublicOverviewPayload {
  return {
    success: true,
    degraded: true,
    metrics: {
      workspaces: {
        value: 24,
        label: 'Research workspaces',
        displayValue: '24',
        detail: `${siteName} can already onboard research teams with OTP-based access.`,
      },
      searches: {
        value: 120,
        label: 'Tracked searches',
        displayValue: '120',
        detail: 'Search analytics stay visible even when the public API is in fallback mode.',
      },
      proAccounts: {
        value: 8,
        label: 'Pro workspaces',
        displayValue: '8',
        detail: 'Premium workflow controls are ready whenever pricing is enabled.',
      },
      featuredResearch: {
        value: 6,
        label: 'Featured research stories',
        displayValue: '6',
        detail: 'Editorial spotlight papers can be shown even before admin content is curated.',
      },
    },
    systemSignals: [
      {
        title: 'OTP Access',
        state: 'preview',
        detail: 'Preview OTP mode can keep local demos and QA moving while email delivery is being finalized.',
      },
      {
        title: 'Literature Search',
        state: 'fallback',
        detail: 'The local research catalog keeps graph exploration and search demos fully usable.',
      },
      {
        title: 'AI Summaries',
        state: 'fallback',
        detail: 'Fallback summaries keep the paper explanation flow available without blocking the workspace.',
      },
      {
        title: 'Billing Control',
        state: 'standby',
        detail: 'Pricing and plan upgrades can stay hidden until launch-day billing is ready.',
      },
    ],
    popularTopics: ['Transformers', 'Computer Vision', 'Reinforcement Learning', 'Climate Science', 'Genome Editing'],
    featuredPapers: [
      {
        paperId: 'fallback-1',
        title: 'Attention Is All You Need',
        authors: ['Ashish Vaswani', 'Noam Shazeer'],
        year: 2017,
        venue: 'NeurIPS',
        abstract: 'A landmark paper that made transformer-based sequence modeling practical and shaped modern language research.',
        url: 'https://arxiv.org/abs/1706.03762',
        pdfUrl: 'https://arxiv.org/pdf/1706.03762.pdf',
        topic: 'Transformers',
      },
      {
        paperId: 'fallback-2',
        title: 'Deep Residual Learning for Image Recognition',
        authors: ['Kaiming He', 'Xiangyu Zhang'],
        year: 2016,
        venue: 'CVPR',
        abstract: 'Residual blocks changed how deep visual models are trained and remain a central reference across computer vision.',
        url: 'https://arxiv.org/abs/1512.03385',
        pdfUrl: 'https://arxiv.org/pdf/1512.03385.pdf',
        topic: 'Computer Vision',
      },
      {
        paperId: 'fallback-3',
        title: 'Mastering the Game of Go with Deep Neural Networks and Tree Search',
        authors: ['David Silver', 'Aja Huang'],
        year: 2016,
        venue: 'Nature',
        abstract: 'A major reinforcement learning milestone that demonstrates how strong policy and value models combine with search.',
        url: 'https://www.nature.com/articles/nature16961',
        pdfUrl: '',
        topic: 'Reinforcement Learning',
      },
    ],
  };
}

function getSignalTheme(state: SystemSignal['state']) {
  if (state === 'live') {
    return {
      dot: 'bg-emerald-400',
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      label: 'Live',
    };
  }

  if (state === 'preview') {
    return {
      dot: 'bg-amber-400',
      badge: 'border-amber-200 bg-amber-50 text-amber-700',
      label: 'Preview',
    };
  }

  if (state === 'fallback') {
    return {
      dot: 'bg-sky-400',
      badge: 'border-sky-200 bg-sky-50 text-sky-700',
      label: 'Fallback',
    };
  }

  return {
    dot: 'bg-slate-400',
    badge: 'border-slate-200 bg-slate-50 text-slate-700',
    label: 'Standby',
  };
}

function GhostLine({ width, className = '' }: { width: string; className?: string }) {
  return <div className={`h-3 rounded-full bg-slate-200/95 ${width} ${className}`.trim()} />;
}

function ShowcaseArtwork({
  kind,
  papers,
  popularTopics,
  signals,
  siteName,
  freePrice,
  proPrice,
  isPricingEnabled,
}: ShowcaseArtworkProps) {
  if (kind === 'search') {
    const previewPapers = papers.slice(0, 3);

    return (
      <div className="relative mx-auto h-[320px] w-full max-w-[540px] overflow-hidden">
        <div className="absolute bottom-3 left-0 h-[190px] w-[250px] rounded-[30px] bg-slate-50/90" />
        <div className="absolute right-0 top-3 w-[390px] overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_24px_54px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100/95 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-slate-300" />
            <span className="h-3 w-3 rounded-full bg-slate-300" />
            <span className="h-3 w-3 rounded-full bg-slate-300" />
            <div className="ml-4 flex h-8 flex-1 items-center rounded-full bg-white px-4 text-xs font-medium text-slate-400">
              Search papers, topics, and authors
            </div>
          </div>
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap gap-2">
              {(popularTopics.length ? popularTopics : ['Transformers', 'Vision', 'RL']).slice(0, 3).map((topic) => (
                <span key={topic} className="rounded-full bg-sky-50 px-3 py-1.5 text-[11px] font-semibold text-sky-700">
                  {topic}
                </span>
              ))}
            </div>
            {previewPapers.map((paper, index) => (
              <div key={paper.paperId || index} className="grid grid-cols-[52px_minmax(0,1fr)] gap-4 rounded-[18px] bg-slate-50/80 p-3.5">
                <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-sky-50 text-sky-600">
                  <FileSearch className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-2">
                  <p className="truncate text-sm font-semibold text-slate-800">{paper.title}</p>
                  <p className="truncate text-xs text-slate-500">{paper.authors.slice(0, 2).join(', ') || 'Research team'}</p>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
                    <span>{paper.venue || 'Venue'}</span>
                    <span>/</span>
                    <span>{paper.year || 'Recent'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute left-10 top-24 grid h-16 w-16 place-items-center rounded-[20px] border border-sky-100 bg-white text-sky-600 shadow-[0_12px_28px_rgba(37,99,235,0.12)]">
          <FileSearch className="h-7 w-7" />
        </div>
      </div>
    );
  }

  if (kind === 'organize') {
    const collections = ['Reading now', 'Must cite', 'Methods', 'Saved for later'];

    return (
      <div className="relative mx-auto h-[360px] w-full max-w-[540px] overflow-hidden">
        <div className="absolute left-0 top-4 w-[400px] overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_24px_54px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100/95 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-slate-300" />
            <span className="h-3 w-3 rounded-full bg-slate-300" />
            <span className="h-3 w-3 rounded-full bg-slate-300" />
            <div className="mx-auto h-8 w-32 rounded-full bg-white" />
          </div>
          <div className="grid grid-cols-[132px_minmax(0,1fr)]">
            <div className="border-r border-slate-200 bg-slate-50/80 p-4">
              <div className="space-y-4">
                {collections.map((collection) => (
                  <div key={collection} className="flex items-center gap-3">
                    <FolderHeart className="h-4 w-4 text-blue-600" />
                    <p className="truncate text-xs font-medium text-slate-600">{collection}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 p-4">
              {papers.slice(0, 4).map((paper, index) => (
                <div key={paper.paperId || index} className="rounded-[16px] bg-slate-50/80 p-3">
                  <p className="truncate text-sm font-semibold text-slate-800">{trimCopy(paper.title, 48)}</p>
                  <p className="mt-2 truncate text-[11px] text-slate-500">{paper.topic || paper.venue || 'Research collection'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-1 left-0 w-[190px] rounded-[22px] bg-slate-50 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Tags</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(popularTopics.length ? popularTopics : ['Transformers', 'Vision', 'RL']).slice(0, 6).map((topic, index) => (
              <span
                key={topic}
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
                style={{ backgroundColor: ['#0f766e', '#2563eb', '#7c3aed', '#f97316', '#16a34a', '#ec4899'][index % 6] }}
              >
                {trimCopy(topic, 10)}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'review') {
    const leadPaper = papers[0];
    const supportPaper = papers[1];

    return (
      <div className="relative mx-auto h-[320px] w-full max-w-[540px] overflow-hidden">
        <div className="absolute right-6 top-3 h-[230px] w-[360px] rounded-[32px] bg-slate-100" />
        <div className="absolute right-[7.5rem] top-[5.5rem] h-[190px] w-[250px] rounded-[20px] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Paper detail</p>
          <p className="mt-3 line-clamp-2 text-sm font-semibold text-slate-800">{leadPaper ? trimCopy(leadPaper.title, 72) : 'Featured paper review'}</p>
          <p className="mt-3 line-clamp-3 text-[11px] leading-5 text-slate-500">
            {leadPaper ? trimCopy(leadPaper.abstract, 120) : 'Abstracts, authors, venue, and reading cues stay visible in one review-friendly panel.'}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <div className="rounded-full bg-blue-500/90 px-2.5 py-1 text-[10px] font-semibold text-white">
              {leadPaper?.topic || 'Research'}
            </div>
            <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
              {leadPaper?.year || 'Recent'}
            </div>
          </div>
          <GhostLine width="w-full" className="mt-5" />
          <GhostLine width="w-4/5" className="mt-2 opacity-75" />
        </div>
        <div className="absolute bottom-0 right-[10rem] h-12 w-24 rounded-t-[14px] bg-slate-200" />
        <div className="absolute right-0 top-14 w-[190px] rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-blue-50 text-blue-600">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <GhostLine width="w-full" />
              <GhostLine width="w-3/4" className="opacity-65" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <p className="line-clamp-2 text-xs font-medium text-slate-700">
              {supportPaper ? trimCopy(supportPaper.title, 54) : `${siteName} keeps AI or fallback summaries accessible.`}
            </p>
            <GhostLine width="w-full" />
            <GhostLine width="w-5/6" className="opacity-70" />
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'sync') {
    return (
      <div className="relative mx-auto h-[320px] w-full max-w-[540px] overflow-hidden">
        <div className="absolute left-8 top-14 h-28 w-28 rounded-full bg-slate-100" />
        <div className="absolute left-24 top-2 h-40 w-40 rounded-full bg-slate-100/90" />
        <div className="absolute left-40 top-12 h-28 w-28 rounded-full bg-slate-100" />
        <div className="absolute left-12 top-24 h-36 w-36 rounded-full bg-slate-50" />
        <div className="absolute left-36 top-24 h-44 w-44 rounded-full bg-slate-50" />
        <div className="absolute left-[17rem] top-24 h-28 w-28 rounded-full bg-slate-100/80" />
        <div className="absolute left-[5.5rem] top-[9.5rem] h-20 w-32 rounded-[16px] border border-slate-200 bg-white shadow-sm">
          <div className="grid h-full place-items-center text-blue-600">
            <RadioTower className="h-7 w-7" />
          </div>
        </div>
        <div className="absolute left-[10.5rem] top-[7rem] h-[7.5rem] w-[14rem] rounded-[18px] border border-slate-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
          <div className="grid h-full place-items-center text-blue-600">
            <RadioTower className="h-9 w-9" />
          </div>
        </div>
        <div className="absolute left-[24rem] top-[9rem] h-24 w-16 rounded-[16px] border border-slate-200 bg-white shadow-sm">
          <div className="grid h-full place-items-center text-blue-600">
            <RadioTower className="h-6 w-6" />
          </div>
        </div>
        <div className="absolute bottom-0 left-[7rem] w-[260px] rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_18px_38px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Live sync state</p>
          <div className="mt-3 space-y-2.5">
            {signals.slice(0, 3).map((signal) => (
              <div key={signal.title} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${signal.dot}`} />
                  <span className="text-xs font-medium text-slate-600">{signal.title}</span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{signal.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'share') {
    return (
      <div className="relative mx-auto h-[330px] w-full max-w-[540px] overflow-hidden">
        <div className="absolute bottom-16 left-4 right-4 h-4 rounded-full bg-slate-100" />
        <div className="absolute bottom-14 left-6 right-6 h-3 rounded-full bg-slate-200" />
        <div className="absolute bottom-14 left-10 h-32 w-3 bg-slate-200" />
        <div className="absolute bottom-14 right-10 h-32 w-3 bg-slate-200" />
        <div className="absolute bottom-[10.25rem] left-[8rem] h-[5.5rem] w-[8rem] rounded-[20px] bg-slate-50 shadow-sm" />
        <div className="absolute bottom-[10.25rem] right-[8rem] h-[5.5rem] w-[8rem] rounded-[20px] bg-slate-50 shadow-sm" />
        <div className="absolute bottom-[9.5rem] left-[9.5rem] h-8 w-8 rounded-full bg-slate-700/75" />
        <div className="absolute bottom-[4.75rem] left-[8.25rem] h-[6.5rem] w-[4.5rem] rounded-t-[2.25rem] bg-blue-600/95" />
        <div className="absolute bottom-[9.5rem] right-[9.5rem] h-8 w-8 rounded-full bg-slate-700/75" />
        <div className="absolute bottom-[4.75rem] right-[8.25rem] h-[6.5rem] w-[4.5rem] rounded-t-[2.25rem] bg-sky-500/95" />
        <div className="absolute bottom-[12.75rem] left-[9.2rem] h-3 w-[6.5rem] rounded-full bg-slate-200" />
        <div className="absolute bottom-[12.75rem] right-[9.2rem] h-3 w-[6.5rem] rounded-full bg-slate-200" />
        <div className="absolute left-1/2 top-[6.5rem] h-20 w-20 -translate-x-1/2 rounded-full border border-blue-100 bg-white shadow-[0_12px_24px_rgba(37,99,235,0.08)]" />
        <div className="absolute left-1/2 top-[7.6rem] -translate-x-1/2 text-blue-600">
          <Network className="h-10 w-10" />
        </div>
        <div className="absolute right-2 top-4 w-[180px] rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Briefing stack</p>
          <div className="mt-3 space-y-2.5">
            {papers.slice(0, 2).map((paper, index) => (
              <div key={paper.paperId || index} className="rounded-[14px] bg-slate-50 p-3">
                <p className="line-clamp-2 text-xs font-semibold text-slate-700">{trimCopy(paper.title, 44)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto grid h-[320px] w-full max-w-[520px] place-items-center overflow-hidden">
      <div className="absolute inset-x-8 top-8 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace access</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{siteName} plans</p>
          </div>
          <ShieldCheck className="h-5 w-5 text-blue-600" />
        </div>
        <div className="mt-4 space-y-3">
          <div className="rounded-[16px] bg-slate-50 p-3.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-700">Starter</span>
              <span className="text-slate-500">{freePrice}</span>
            </div>
          </div>
          {isPricingEnabled ? (
            <div className="rounded-[16px] border border-blue-100 bg-blue-50/70 p-3.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-800">Pro</span>
                <span className="text-slate-600">{proPrice}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="absolute bottom-6 left-1/2 w-[320px] -translate-x-1/2 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap gap-2">
          {signals.slice(0, 4).map((signal) => (
            <span key={signal.title} className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${signal.badge}`}>
              <span className={`h-2 w-2 rounded-full ${signal.dot}`} />
              {signal.title}
            </span>
          ))}
        </div>
      </div>
      <div className="relative mt-6 grid h-24 w-24 place-items-center rounded-full bg-blue-50 text-blue-600 shadow-[0_18px_36px_rgba(37,99,235,0.10)]">
        <ShieldCheck className="h-11 w-11" />
      </div>
    </div>
  );
}

export function PublicHomePage() {
  const { siteConfig, toggleLoginModal, navigateToPricing } = useApp();
  const isPricingEnabled = siteConfig.pricing.enabled !== false;
  const pageShellClass = 'mx-auto w-full max-w-[1320px] px-6 sm:px-8 lg:px-12 xl:px-16';
  const navLinks = [
    { label: 'Product', href: '#product' },
    { label: 'Signals', href: '#signals' },
    { label: 'Research', href: '#research' },
  ];
  const freePrice = siteConfig.pricing.free === 0
    ? 'Free'
    : formatPrice(siteConfig.pricing.currency, siteConfig.pricing.free, siteConfig.pricing.billingCycle);
  const proPrice = formatPrice(siteConfig.pricing.currency, siteConfig.pricing.pro, siteConfig.pricing.billingCycle);
  const [overview, setOverview] = useState<PublicOverviewPayload>(() => buildFallbackOverview(siteConfig.siteName));
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setOverview(buildFallbackOverview(siteConfig.siteName));
    setIsOverviewLoading(true);

    apiRequest<PublicOverviewPayload>('/public/overview', { cache: 'no-store' })
      .then((payload) => {
        if (active) {
          setOverview(payload);
        }
      })
      .catch(() => {
        if (active) {
          setOverview(buildFallbackOverview(siteConfig.siteName));
        }
      })
      .finally(() => {
        if (active) {
          setIsOverviewLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [siteConfig.siteName]);

  const heroMetrics = useMemo(() => {
    const metrics = overview.metrics || {};

    return [metrics.workspaces, metrics.searches, metrics.proAccounts, metrics.featuredResearch].filter(Boolean) as OverviewMetric[];
  }, [overview.metrics]);

  const featuredPapers = overview.featuredPapers?.slice(0, 6) || [];
  const systemSignals = overview.systemSignals?.slice(0, 4) || [];
  const popularTopics = overview.popularTopics?.slice(0, 5) || [];
  const spotlightPapers = featuredPapers.slice(0, 3);
  const signalBadges = systemSignals.map((signal) => ({
    ...getSignalTheme(signal.state),
    title: signal.title,
  }));
  const primaryWorkspaceMetric = heroMetrics[0]?.displayValue || '24';

  const showcaseSections: Array<{
    id?: string;
    eyebrow: string;
    title: string;
    description: string;
    details: string[];
    illustration: ShowcaseArtworkKind;
    reverse?: boolean;
  }> = [
    {
      eyebrow: 'Discovery',
      title: 'Search with confidence.',
      description:
        'Search papers, authors, and topics through a real backend pipeline, then move directly into source pages, PDFs, and graph context without the interface feeling heavy.',
      details: [
        `Popular topics now: ${popularTopics.slice(0, 3).join(' / ') || 'Transformers / Vision / RL'}`,
        'Remote search stays supported with graceful local fallback behavior',
        'Graph exploration keeps adjacent and cited work close at hand',
      ],
      illustration: 'search',
    },
    {
      eyebrow: 'Organization',
      title: 'Organize your way.',
      description:
        'Saved papers and collections keep your literature structured without adding clutter. Guests can work locally, and signed-in researchers restore their workspace state when they return.',
      details: [
        `${primaryWorkspaceMetric} visible workspaces already reflected in the public overview`,
        'Collections stay available for guest sessions and authenticated workspaces',
        'Account center, notifications, and pricing handoff remain connected',
      ],
      illustration: 'organize',
      reverse: true,
    },
    {
      id: 'research',
      eyebrow: 'Reading',
      title: 'Read with context.',
      description:
        'Paper detail views surface abstracts, authors, venues, and source links in one calm panel so you can decide quickly what deserves deeper attention.',
      details: [
        spotlightPapers[0] ? `Spotlight: ${trimCopy(spotlightPapers[0].title, 78)}` : 'Featured research stays ready for public presentation',
        spotlightPapers[1] ? `${spotlightPapers[1].venue || 'Research venue'} / ${spotlightPapers[1].year || 'Recent work'}` : 'Source pages and PDFs stay easy to open',
        'AI summaries and fallback explanations keep the review flow moving',
      ],
      illustration: 'review',
    },
    {
      eyebrow: 'Access',
      title: 'Stay in sync.',
      description:
        'OTP sign-in restores saved papers, plan access, and workspace context so moving between sessions feels dependable instead of fragile.',
      details: [
        'Server-backed OTP access keeps sign-in simple without passwords',
        'Plan, quota, and saved-paper state follow the authenticated workspace',
        'Account settings and upgrade flow stay linked to the same session',
      ],
      illustration: 'sync',
      reverse: true,
    },
    {
      eyebrow: 'Presentation',
      title: 'Share findings easily.',
      description:
        'Presentable paper cards, featured research blocks, and readable summaries make it easier to brief teammates, students, or clients without rebuilding the story from scratch.',
      details: [
        `Featured now: ${featuredPapers.length} papers ready for spotlight`,
        'Public-facing sections stay polished enough for demos and conference conversations',
        'Source pages and PDFs remain easy to hand off when a discussion goes deeper',
      ],
      illustration: 'share',
    },
    {
      id: 'signals',
      eyebrow: 'Reliability',
      title: 'Rest easy.',
      description:
        'Live readiness signals, fallback-safe summaries, and plan controls keep the product usable even while external services change behind the scenes.',
      details: [
        'Operational status is surfaced directly from live backend responses',
        overview.degraded ? 'The public overview currently has fallback-safe protection enabled' : 'The public overview is currently reflecting live backend state',
        'Billing can stay hidden until the launch team is ready to open it up',
      ],
      illustration: 'trust',
      reverse: true,
    },
  ];

  return (
    <div id="top" className="min-h-screen bg-[#f5f6f8] text-[#101828]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#fbfcfe_0%,#f4f7fb_100%)]" />
        <div className="absolute left-0 right-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(21,94,239,0.04),transparent_62%)]" />
      </div>

      <div className="relative border-b border-slate-200/80 bg-white/94 backdrop-blur-xl">
        <div className={`${pageShellClass} flex flex-wrap items-center justify-between gap-4 py-4`}>
          <BrandWordmark
            siteName={siteConfig.siteName}
            branding={siteConfig.branding}
            size="sm"
          />

          <div className="flex items-center gap-4 sm:gap-6">
            <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="inline-flex items-center text-[1.02rem] font-medium text-slate-700 transition hover:text-slate-950"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={toggleLoginModal}
                className="inline-flex h-11 items-center justify-center text-[1.02rem] font-medium text-[#1f6fe5] transition hover:text-[#1657b5]"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={toggleLoginModal}
                className="inline-flex h-11 items-center justify-center rounded-[0.6rem] px-5 text-[1.02rem] font-medium text-white shadow-sm transition hover:opacity-95"
                style={{ backgroundColor: siteConfig.branding.primaryColor }}
              >
                Open Workspace
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="relative">
        <section className="relative overflow-hidden bg-[#31353d] py-12 text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)] sm:py-16">
          <div className={pageShellClass}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_42%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.28] [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:36px_36px]" />
            <div className="pointer-events-none absolute inset-0">
              <img
                src={jumbotronArtwork}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover object-center opacity-[0.18] sm:opacity-[0.34] lg:opacity-[0.72]"
              />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(49,53,61,0.16),rgba(49,53,61,0.36)_58%,rgba(49,53,61,0.64))]" />

            <div className="relative mx-auto max-w-[58rem] text-center">
              <Badge className="border-0 bg-white/10 text-white hover:bg-white/10">
                Real product, real backend, cleaner academic theme
              </Badge>
              <h1 className="mt-6 font-display text-[2.8rem] font-bold leading-[1.03] tracking-[-0.04em] text-white sm:text-[4rem] lg:text-[4.6rem]">
                Your research workspace for discovery, reading, and review.
              </h1>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/76 sm:text-lg">
                LitFlow helps researchers search, organize, save, and explain literature in one place, while keeping the interface simple enough to
                use comfortably.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button onClick={toggleLoginModal} className="h-12 rounded-full bg-[#dd2d3c] px-6 text-white hover:bg-[#c72735]">
                  Enter the workspace
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <a
                  href="#research"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-6 text-sm font-semibold text-white transition hover:bg-white/[0.12]"
                >
                  Explore featured research
                </a>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm text-white/66">
                <span>{isOverviewLoading ? 'Loading live overview' : overview.degraded ? 'Fallback-safe public overview' : 'Live public overview'}</span>
                <span className="hidden sm:inline">/</span>
                <span>OTP sign-in, search, saves, and pricing connected</span>
              </div>
            </div>

            <div className="relative mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {heroMetrics.map((metric) => (
                <div key={metric.label} className="rounded-[24px] border border-white/10 bg-white/[0.06] p-4 text-left backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/46">{metric.label}</p>
                  <p className="mt-2 font-display text-[1.9rem] font-bold text-white">{metric.displayValue}</p>
                  <p className="mt-2 text-sm leading-6 text-white/68">{metric.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className={`${pageShellClass} pb-20 pt-12 lg:pb-24`}>
          <section id="product" className="pt-6 sm:pt-10">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-end xl:gap-14">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Meet {siteConfig.siteName}</p>
                <h2 className="mt-4 font-display text-[2.85rem] font-medium tracking-[-0.05em] text-slate-950 sm:text-[3.6rem]">
                  Research that stays clear from first search to final review.
                </h2>
                <p className="mt-5 max-w-2xl text-[1.02rem] leading-8 text-slate-600">
                  The public site now behaves like a product walkthrough instead of a decorative landing page. Each section below reflects working
                  search, saved-paper flows, live signals, and presentable research output.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Operational readout</p>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium text-slate-600">Public overview</span>
                      <span className="text-sm font-semibold text-slate-900">{overview.degraded ? 'Fallback-safe' : 'Live backend'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium text-slate-600">Readiness signals</span>
                      <span className="text-sm font-semibold text-slate-900">{systemSignals.length}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium text-slate-600">Featured papers</span>
                      <span className="text-sm font-semibold text-slate-900">{featuredPapers.length}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Research topics</p>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {(popularTopics.length ? popularTopics : ['Transformers', 'Vision', 'RL']).slice(0, 5).map((topic) => (
                      <span key={topic} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-14 border-t border-slate-200/80">
              {showcaseSections.map((section, index) => (
                <article
                  key={section.title}
                  id={section.id}
                  className="grid items-start gap-12 border-t border-slate-200/80 py-16 first:border-t-0 sm:py-20 lg:grid-cols-[minmax(0,0.92fr)_minmax(460px,1.08fr)] lg:gap-16 lg:py-20 xl:gap-20"
                >
                  <div className={section.reverse ? 'lg:order-2 lg:pl-4' : 'lg:pr-4'}>
                    <div className="inline-flex items-center gap-3">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        {index + 1 < 10 ? `0${index + 1}` : index + 1}
                      </span>
                      <span className="h-px w-10 bg-slate-200" />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{section.eyebrow}</p>
                    </div>
                    <h3 className="mt-4 font-display text-[2.35rem] font-medium tracking-[-0.04em] text-slate-950 sm:text-[3.05rem]">
                      {section.title}
                    </h3>
                    <p className="mt-5 max-w-[38rem] text-[1.05rem] leading-9 text-slate-700">
                      {section.description}
                    </p>

                    <div className="mt-8 space-y-3">
                      {section.details.map((detail) => (
                        <div key={detail} className="flex items-start gap-3">
                          <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-blue-600" />
                          <p className="text-[15px] leading-7 text-slate-600">{detail}</p>
                        </div>
                      ))}
                    </div>

                    {section.illustration === 'review' && spotlightPapers.length ? (
                      <div className="mt-8 flex flex-wrap gap-3">
                        {spotlightPapers.map((paper) => (
                          <a
                            key={paper.paperId}
                            href={paper.url || paper.pdfUrl || '#'}
                            target={paper.url || paper.pdfUrl ? '_blank' : undefined}
                            rel={paper.url || paper.pdfUrl ? 'noreferrer' : undefined}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
                          >
                            {trimCopy(paper.title, 44)}
                            <ArrowUpRight className="h-4 w-4" />
                          </a>
                        ))}
                      </div>
                    ) : null}

                    {section.illustration === 'trust' && signalBadges.length ? (
                      <div className="mt-8 flex flex-wrap gap-3">
                        {signalBadges.map((signal) => (
                          <span
                            key={signal.title}
                            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold ${signal.badge}`}
                          >
                            <span className={`h-2.5 w-2.5 rounded-full ${signal.dot}`} />
                            {signal.title}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className={section.reverse ? 'lg:order-1' : ''}>
                    <div className={`relative p-2 sm:p-4 lg:p-6 ${section.reverse ? 'lg:mr-auto' : 'lg:ml-auto'}`}>
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.04),transparent_60%)]" />
                      <div className="relative">
                        <ShowcaseArtwork
                          kind={section.illustration}
                          papers={featuredPapers}
                          popularTopics={popularTopics}
                          signals={signalBadges}
                          siteName={siteConfig.siteName}
                          freePrice={freePrice}
                          proPrice={proPrice}
                          isPricingEnabled={isPricingEnabled}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="pt-20 sm:pt-24">
            <div className="border-t border-slate-200/80 pt-10 lg:pt-12">
              <div className="flex flex-col items-center justify-between gap-10 text-center lg:flex-row lg:text-left">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Ready to Try {siteConfig.siteName}?</p>
                  <h3 className="mt-3 font-display text-[2.5rem] font-medium tracking-[-0.04em] text-slate-950 sm:text-[3.15rem]">
                    Enter the workspace and keep the research flow moving.
                  </h3>
                  <p className="mt-4 text-[1.02rem] leading-8 text-slate-600">
                    OTP access, real search, saved papers, live signals, and pricing controls are already connected to the product experience.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-end">
                  <Button onClick={toggleLoginModal} className="h-12 rounded-full bg-[#dd2d3c] px-6 text-white hover:bg-[#c72735]">
                    Open Workspace
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <a
                    href="#research"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Review featured research
                  </a>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                  <Telescope className="h-4 w-4 text-slate-500" />
                  Starter {freePrice}
                </span>
                {isPricingEnabled ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    <Crown className="h-4 w-4 text-amber-500" />
                    Pro {proPrice}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                  {overview.degraded ? 'Fallback-safe public overview active' : 'Live public overview active'}
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <WebsiteFooter
        summary="A calm research workspace for discovery, saved reading, paper review, and dependable access across sessions."
        links={[
          { label: 'Product walkthrough', href: '#product' },
          { label: 'Featured research', href: '#research' },
          { label: 'Readiness signals', href: '#signals' },
          { label: 'Back to top', href: '#top' },
        ]}
        actions={[
          { label: 'Open Workspace', onClick: toggleLoginModal, primary: true },
          isPricingEnabled
            ? { label: 'Pricing', onClick: navigateToPricing }
            : { label: 'View Research', href: '#research' },
        ]}
        badges={[
          overview.degraded ? 'Fallback-safe overview' : 'Live overview',
          `${featuredPapers.length} featured papers`,
          `${systemSignals.length} live signals`,
        ]}
        metaLeft={`(c) ${new Date().getFullYear()} ${siteConfig.siteName}. Research presentation, access, and review in one clean product surface.`}
        metaRight={overview.generatedAt ? `Overview synced ${new Date(overview.generatedAt).toLocaleString()}` : 'Overview sync pending'}
      />
    </div>
  );
}
