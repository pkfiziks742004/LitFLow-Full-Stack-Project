import { Suspense, lazy, useEffect } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { Header } from '@/components/Header';
import { BrandWordmark } from '@/components/branding/BrandWordmark';
import { WebsiteFooter } from '@/components/public/WebsiteFooter';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { List, Network } from 'lucide-react';
import './App.css';

const Sidebar = lazy(async () => ({ default: (await import('@/components/sidebar/Sidebar')).Sidebar }));
const GraphVisualization = lazy(async () => ({ default: (await import('@/components/graph/GraphVisualization')).GraphVisualization }));
const PaperListView = lazy(async () => ({ default: (await import('@/components/PaperListView')).PaperListView }));
const PaperDetailPanel = lazy(async () => ({ default: (await import('@/components/PaperDetailPanel')).PaperDetailPanel }));
const LoginModal = lazy(async () => ({ default: (await import('@/components/modals/LoginModal')).LoginModal }));
const AccountCenter = lazy(async () => ({ default: (await import('@/components/account/AccountCenter')).AccountCenter }));
const PricingPage = lazy(async () => ({ default: (await import('@/components/pricing/PricingPage')).PricingPage }));
const UpgradePlanDialog = lazy(async () => ({ default: (await import('@/components/pricing/UpgradePlanDialog')).UpgradePlanDialog }));
const PublicHomePage = lazy(async () => ({ default: (await import('@/components/public/PublicHomePage')).PublicHomePage }));

function SurfaceFallback({ label }: { label: string }) {
  return (
    <div className="grid h-full min-h-[280px] place-items-center p-6">
      <div className="rounded-[24px] border border-slate-200 bg-white/92 px-5 py-4 text-center text-sm font-medium text-slate-500 shadow-sm">
        {label}
      </div>
    </div>
  );
}

function AppContent() {
  const { sidebarOpen, setSidebarOpen, selectedPaper, isInitialized, isAuthenticated, siteConfig, activeAccountSection, navigateHome, navigateToPricing, openAccountPanel, user, planCapabilities, viewMode, setViewMode, papers, filteredPapers, searchQuery } = useApp();
  const isPricingEnabled = siteConfig.pricing.enabled !== false;
  const activeViewLabel = viewMode === 'graph' ? 'Research map' : 'Paper feed';
  const workspaceHeading = searchQuery.trim() || 'Workspace results';
  const footerSurfaceLabel = activeAccountSection === 'pricing' ? 'Pricing view' : activeAccountSection ? 'Account center' : 'Workspace';
  const footerResultLabel = activeAccountSection || papers.length === 0 ? null : `${filteredPapers.length}/${papers.length} results visible`;
  const showWorkspaceFooter = Boolean(activeAccountSection) && activeAccountSection !== 'pricing';
  const sharedFooterSummary = activeAccountSection
    ? 'Account settings, collections, saved reading, and workspace access stay connected inside one calm research surface.'
    : 'Research workspace for papers, graphs, saved reading, and account-backed access.';
  const sharedFooterLinks = [
    { label: 'Workspace', onClick: navigateHome },
    ...(isPricingEnabled ? [{ label: 'Pricing', onClick: navigateToPricing }] : []),
    { label: 'Account settings', onClick: () => openAccountPanel('settings') },
  ];
  const sharedFooterActions = activeAccountSection
    ? [
        { label: 'Back to workspace', onClick: navigateHome },
        { label: 'Manage account', onClick: () => openAccountPanel('settings'), primary: true },
      ]
    : [
        { label: 'Open account', onClick: () => openAccountPanel('profile') },
        ...(isPricingEnabled ? [{ label: 'Pricing', onClick: navigateToPricing, primary: true }] : []),
      ];
  const sharedFooterBadges = [
    `${planCapabilities.name} plan`,
    'OTP access included',
    ...(footerResultLabel ? [footerResultLabel] : []),
  ];
  const viewOptions = [
    { value: 'graph' as const, label: 'Graph', icon: Network },
    { value: 'list' as const, label: 'List', icon: List },
  ];

  useEffect(() => {
    if (!isAuthenticated && (activeAccountSection || (typeof window !== 'undefined' && window.location.pathname !== '/'))) {
      navigateHome();
    }
  }, [activeAccountSection, isAuthenticated, navigateHome]);

  if (!isInitialized) {
    return (
      <div className="grid h-screen place-items-center bg-[#f5f6f8]">
        <div className="rounded-[30px] border border-slate-200 bg-white px-8 py-7 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
          <BrandWordmark
            siteName={siteConfig.siteName}
            branding={siteConfig.branding}
            size="md"
            className="mx-auto w-fit"
          />
          <h1 className="mt-4 text-xl font-semibold text-gray-950">Loading {siteConfig.siteName}</h1>
          <p className="mt-2 text-sm text-gray-500">Connecting to the real backend...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-[#f5f6f8] text-slate-950">
        <Suspense fallback={<SurfaceFallback label={`Loading ${siteConfig.siteName}...`} />}>
          <PublicHomePage />
        </Suspense>
        <Suspense fallback={null}>
          <LoginModal />
        </Suspense>
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <div className="litflow-workspace relative flex min-h-screen flex-col overflow-x-hidden bg-[#f5f6f8] text-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-24 top-0 h-80 w-80 rounded-full blur-3xl"
          style={{ background: `${siteConfig.branding.primaryColor}12` }}
        />
        <div
          className="absolute right-0 top-10 h-96 w-96 rounded-full blur-3xl"
          style={{ background: `${siteConfig.branding.secondaryColor}10` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(251,252,254,0.84),rgba(245,246,248,0.98)_30%,rgba(245,246,248,1))]" />
      </div>

      <div className="relative flex flex-1 flex-col">
        <Header />

        <div
          className={cn(
            'relative flex overflow-hidden',
            activeAccountSection ? 'flex-1' : 'h-[calc(100vh-92px)] min-h-[44rem]'
          )}
        >
          {activeAccountSection === 'pricing' && isPricingEnabled ? (
            <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <Suspense fallback={<SurfaceFallback label="Loading pricing..." />}>
                <PricingPage />
              </Suspense>
            </main>
          ) : activeAccountSection && activeAccountSection !== 'pricing' ? (
            <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <Suspense fallback={<SurfaceFallback label="Loading account center..." />}>
                <AccountCenter />
              </Suspense>
            </main>
          ) : (
            <>
              <button
                type="button"
                aria-label="Close filters and navigation"
                onClick={() => setSidebarOpen(false)}
                className={`absolute inset-0 z-30 bg-slate-950/28 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
                  sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
              />

              <aside
                className={`app-sidebar absolute inset-y-0 left-0 z-40 w-full max-w-full overflow-hidden border-r border-slate-200/80 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.14)] transition-transform duration-300 sm:w-[22rem] lg:static lg:z-auto lg:w-[21.5rem] lg:translate-x-0 lg:border-r lg:bg-transparent lg:shadow-none ${
                  sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
              >
                <Suspense fallback={<SurfaceFallback label="Loading filters..." />}>
                  <Sidebar />
                </Suspense>
              </aside>

              <main className="relative min-w-0 flex-1 overflow-hidden px-3 pb-3 pt-3 sm:px-5 sm:pb-5 lg:px-6 lg:pt-5">
                <div className="workspace-main-card relative flex h-full flex-col overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/88 shadow-[0_20px_64px_rgba(15,23,42,0.06)] backdrop-blur-sm">
                  {!selectedPaper ? (
                    <div className="border-b border-slate-200/80 bg-white/86 px-3 py-3 sm:hidden">
                      <div className="workspace-mobile-summary rounded-[22px] border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              {activeViewLabel}
                            </p>
                            <p className="mt-1 truncate text-[15px] font-semibold text-slate-950">{workspaceHeading}</p>
                          </div>
                          <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-1.5 text-right shadow-sm">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Results</p>
                            <p className="mt-0.5 text-[15px] font-semibold text-slate-950">
                              {papers.length > 0 ? `${filteredPapers.length}/${papers.length}` : '0/0'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex justify-end">
                          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                            {viewOptions.map((option) => {
                              const Icon = option.icon;
                              const isActive = viewMode === option.value;

                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => setViewMode(option.value)}
                                  aria-pressed={isActive}
                                  className={cn(
                                    'flex h-9 min-w-[104px] items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold transition-all duration-200',
                                     isActive
                                       ? 'bg-slate-900 text-white shadow-sm'
                                       : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                                  )}
                                >
                                  <Icon className="h-4 w-4" />
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="absolute right-4 top-4 z-20 hidden sm:block">
                    <div className="workspace-view-toggle flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/96 p-1 shadow-sm backdrop-blur-sm">
                      {viewOptions.map((option) => {
                        const Icon = option.icon;
                        const isActive = viewMode === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setViewMode(option.value)}
                            aria-pressed={isActive}
                            className={cn(
                              'flex h-10 min-w-[96px] items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold transition-all duration-200',
                               isActive
                                 ? 'bg-slate-900 text-white shadow-sm'
                                 : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className={cn('min-h-0 flex-1', selectedPaper ? 'lg:pr-[26.5rem]' : '')}>
                    <Suspense fallback={<SurfaceFallback label={viewMode === 'graph' ? 'Loading research map...' : 'Loading paper feed...'} />}>
                      {viewMode === 'graph' ? <GraphVisualization /> : <PaperListView />}
                    </Suspense>
                  </div>

                  {/* Paper Detail Panel */}
                  {selectedPaper ? (
                    <Suspense fallback={null}>
                      <PaperDetailPanel />
                    </Suspense>
                  ) : null}
                </div>
              </main>
            </>
          )}
        </div>

        {showWorkspaceFooter ? (
          <div className="mt-auto">
            <WebsiteFooter
              summary={sharedFooterSummary}
              links={sharedFooterLinks}
              actions={sharedFooterActions}
              badges={sharedFooterBadges}
              metaLeft={`${footerSurfaceLabel} connected to the live ${planCapabilities.name.toLowerCase()} workspace.`}
              metaRight={footerResultLabel || `${user ? `${planCapabilities.name} plan active` : 'Guest workspace ready'}`}
            />
          </div>
        ) : null}

        {/* Modals */}
        <Suspense fallback={null}>
          <LoginModal />
          <UpgradePlanDialog />
        </Suspense>

        {/* Toast notifications */}
        <Toaster position="top-right" />
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
