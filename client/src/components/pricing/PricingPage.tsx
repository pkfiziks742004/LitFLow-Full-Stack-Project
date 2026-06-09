import {
  ArrowRight,
  BadgeCheck,
  Bell,
  BrainCircuit,
  CheckCircle2,
  Crown,
  Download,
  Filter,
  FolderHeart,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { WebsiteFooter } from '@/components/public/WebsiteFooter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';

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

export function PricingPage() {
  const {
    siteConfig,
    user,
    quota,
    planCapabilities,
    navigateHome,
    openAccountPanel,
    upgradeToPro,
    toggleLoginModal,
  } = useApp();
  const isPricingEnabled = siteConfig.pricing.enabled !== false;

  if (!isPricingEnabled) {
    return null;
  }

  const brandGradient = `linear-gradient(135deg, ${siteConfig.branding.primaryColor}, ${siteConfig.branding.secondaryColor})`;
  const isPro = user?.plan === 'PRO';
  const freePrice = siteConfig.pricing.free === 0
    ? 'Free'
    : formatPrice(siteConfig.pricing.currency, siteConfig.pricing.free, siteConfig.pricing.billingCycle);
  const proPrice = formatPrice(siteConfig.pricing.currency, siteConfig.pricing.pro, siteConfig.pricing.billingCycle);

  const freeFeatures = [
    'Daily research credits for discovery',
    'Research graph exploration',
    'Collections and saved papers',
    'OTP sign-in and synced account',
  ];

  const proFeatures = [
    'Unlimited research credits',
    'AI summaries for research papers',
    'Graph export and premium tooling',
    'Advanced filters and higher limits',
  ];

  const comparisonRows = [
    ['Daily credits', 'Starter credits', 'Unlimited'],
    ['Saved papers', 'Core workspace save flow', 'Unlimited workspace history'],
    ['Collections', 'Available', 'Available'],
    ['AI summaries', 'Upgrade required', 'Included'],
    ['Advanced filters', 'Upgrade required', 'Included'],
    ['Graph export', 'Upgrade required', 'Included'],
  ];

  return (
    <div id="top" className="relative min-h-full bg-[#f8fafc]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(248,250,252,1))]" />

      <div className="relative mx-auto max-w-[1440px] px-4 pb-0 pt-5 md:px-6 md:pb-0 md:pt-6">
        <section>
          <div className="border-b border-slate-200 px-1 py-5 md:px-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pricing</p>
                <h1 className="mt-2 font-display text-[2rem] font-bold tracking-tight text-slate-950 md:text-[2.25rem]">
                  Clean plans for every LitFlow workspace
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  Start with the core workspace, then upgrade only when your research flow needs AI summaries, unlimited search, advanced filters,
                  and export-ready graph tools.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">OTP login included</Badge>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">Research-ready search</Badge>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">Backend-synced billing</Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {user ? (
                  <Button variant="outline" className="rounded-full border-slate-200 bg-white" onClick={() => openAccountPanel('profile')}>
                    Manage profile
                  </Button>
                ) : (
                  <Button variant="outline" className="rounded-full border-slate-200 bg-white" onClick={toggleLoginModal}>
                    Start with OTP
                  </Button>
                )}
                <Button variant="outline" className="rounded-full border-slate-200 bg-white" onClick={navigateHome}>
                  Back to workspace
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-8 px-1 py-6 xl:grid-cols-[minmax(0,1.08fr)_360px] md:px-2">
            <div className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-2">
                <section className="border-b border-slate-200 pb-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Starter</p>
                      <h2 className="mt-2 font-display text-[1.8rem] font-bold text-slate-950">Free</h2>
                      <p className="mt-1 text-sm text-slate-500">{freePrice}</p>
                    </div>
                    {user?.plan === 'FREE' ? <Badge className="bg-slate-900 text-white">Current plan</Badge> : null}
                  </div>

                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    Best for exploring LitFlow, saving papers, creating collections, and trying the real research graph workflow.
                  </p>

                  <div className="mt-5 space-y-3">
                    {freeFeatures.map((feature) => (
                      <div key={feature} className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm text-slate-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button variant="outline" className="mt-5 w-full rounded-full border-slate-200 bg-white" onClick={user ? navigateHome : toggleLoginModal}>
                    {user ? 'Continue in workspace' : 'Create free workspace'}
                  </Button>
                </section>

                <section className="rounded-[24px] bg-slate-950 p-5 text-white shadow-[0_18px_48px_rgba(15,23,42,0.14)]">
                  <div className="pointer-events-none h-1 rounded-full" style={{ backgroundImage: brandGradient }} />
                  <div className="mt-5 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Professional</p>
                      <h2 className="mt-2 font-display text-[1.9rem] font-bold">Pro</h2>
                      <p className="mt-1 text-sm text-white/70">{proPrice}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className="bg-emerald-500 text-white">{isPro ? 'Current plan' : 'Most popular'}</Badge>
                      <div className="grid h-11 w-11 place-items-center rounded-[16px] text-white" style={{ backgroundImage: brandGradient }}>
                        <Crown className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-white/78">
                    Built for teams that need unlimited search, AI assistance, premium graph controls, and stronger workspace limits.
                  </p>

                  <div className="mt-5 space-y-3">
                    {proFeatures.map((feature) => (
                      <div key={feature} className="flex items-center gap-3">
                        <BadgeCheck className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm text-white/90">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {isPro ? (
                    <Button variant="outline" className="mt-5 w-full rounded-full border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={() => openAccountPanel('settings')}>
                      Manage Pro workspace
                    </Button>
                  ) : (
                    <Button className="mt-5 w-full rounded-full text-white" style={{ backgroundImage: brandGradient }} onClick={() => void upgradeToPro()}>
                      Upgrade to Pro
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </section>
              </div>

              <section className="border-t border-slate-200 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Feature comparison</p>
                    <h3 className="mt-1 font-display text-[1.3rem] font-bold text-slate-950">See what changes when you upgrade</h3>
                  </div>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                    Real backend plan logic
                  </Badge>
                </div>

                <div className="mt-5 overflow-hidden border-y border-slate-200">
                  <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(110px,0.8fr)_minmax(110px,0.8fr)] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <span>Capability</span>
                    <span>Free</span>
                    <span>Pro</span>
                  </div>
                  <div className="divide-y divide-slate-200 bg-white">
                    {comparisonRows.map(([label, freeValue, proValue]) => (
                      <div key={label} className="grid grid-cols-[minmax(0,1.4fr)_minmax(110px,0.8fr)_minmax(110px,0.8fr)] gap-3 px-4 py-3.5 text-sm">
                        <span className="font-medium text-slate-900">{label}</span>
                        <span className="text-slate-500">{freeValue}</span>
                        <span className="font-semibold text-slate-950">{proValue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-5">
              <section className="border-t border-slate-200 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current workspace</p>
                    <h3 className="mt-1 font-display text-[1.35rem] font-bold text-slate-950">
                      {user ? `${planCapabilities.name} workspace` : 'Guest workspace'}
                    </h3>
                  </div>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                    {quota?.label || 'Ready'}
                  </Badge>
                </div>

                <div className="mt-4 divide-y divide-slate-200/80 border-y border-slate-200/80">
                  <div className="flex items-center gap-3 py-4">
                    <div className="grid h-10 w-10 place-items-center rounded-[16px] bg-blue-50 text-blue-600">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Credit balance</p>
                      <p className="text-[12px] text-slate-500">{quota?.label || 'Sign in to see your current credit balance.'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-4">
                    <div className="grid h-10 w-10 place-items-center rounded-[16px] bg-emerald-50 text-emerald-600">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Account protection</p>
                      <p className="text-[12px] text-slate-500">OTP login, saved papers, and billing stay synced here.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="border-t border-slate-200 pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">What Pro unlocks</p>
                <div className="mt-4 space-y-4">
                  {[
                    ['AI paper summaries', 'Generate readable paper summaries directly from the workspace.', <BrainCircuit key="ai" className="h-4 w-4" />],
                    ['Advanced filtering', 'Narrow literature faster with premium filter support.', <Filter key="filter" className="h-4 w-4" />],
                    ['Graph export', 'Export polished maps for review and reporting.', <Download key="download" className="h-4 w-4" />],
                    ['Priority organization', 'Manage larger paper sets and collections more comfortably.', <FolderHeart key="collections" className="h-4 w-4" />],
                    ['Alerts and sync visibility', 'Stay on top of billing, saves, and workspace changes.', <Bell key="alerts" className="h-4 w-4" />],
                  ].map(([title, description, icon]) => (
                    <div key={String(title)} className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[16px] bg-white text-slate-700 shadow-sm ring-1 ring-slate-200/80">
                        {icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{title}</p>
                        <p className="mt-1 text-[12px] leading-5 text-slate-500">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>

      </div>

      <WebsiteFooter
        summary="Choose the plan that matches your research pace, then move back into the workspace without breaking sign-in, saved papers, or billing flow."
        links={[
          { label: 'Pricing overview', href: '#top' },
          { label: 'Back to workspace', onClick: navigateHome },
          user
            ? { label: 'Account settings', onClick: () => openAccountPanel('settings') }
            : { label: 'Start with OTP', onClick: toggleLoginModal },
        ]}
        actions={[
          { label: 'Back to workspace', onClick: navigateHome },
          user
            ? { label: 'Manage account', onClick: () => openAccountPanel('settings'), primary: true }
            : { label: 'Start with OTP', onClick: toggleLoginModal, primary: true },
        ]}
        badges={[
          `Starter ${freePrice}`,
          `Pro ${proPrice}`,
          'OTP access included',
          'Backend-synced billing',
        ]}
        metaLeft={user ? `${planCapabilities.name} workspace is currently active.` : 'Guest workspace can upgrade after OTP sign-in.'}
        metaRight={quota?.label || 'Pricing controls ready'}
      />
    </div>
  );
}
