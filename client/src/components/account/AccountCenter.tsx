import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Bell,
  Bookmark,
  CheckCircle2,
  Copy,
  Crown,
  Database,
  Download,
  FileJson,
  FolderHeart,
  KeyRound,
  LogOut,
  Mail,
  Palette,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/context/AppContext';
import { copyTextToClipboard } from '@/lib/utils';

const colorOptions = ['#2563EB', '#0EA5E9', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#84CC16'];
const PREFERENCES_KEY = 'litflow:account-preferences';

type PreferenceState = {
  emailUpdates: boolean;
  graphHints: boolean;
  compactCards: boolean;
  weeklyDigest: boolean;
};

const defaultPreferences: PreferenceState = {
  emailUpdates: true,
  graphHints: true,
  compactCards: false,
  weeklyDigest: true,
};

function readPreferences() {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<PreferenceState>) : {};

    return {
      ...defaultPreferences,
      emailUpdates: parsed.emailUpdates !== false,
      graphHints: parsed.graphHints !== false,
      compactCards: parsed.compactCards === true,
      weeklyDigest: parsed.weeklyDigest !== false,
    } as PreferenceState;
  } catch {
    return defaultPreferences;
  }
}

function hexToRgba(color: string, alpha: number) {
  const normalized = color.replace('#', '').trim();
  const fullHex =
    normalized.length === 3 ? normalized.split('').map((segment) => segment + segment).join('') : normalized.slice(0, 6);

  if (!/^[0-9a-fA-F]{6}$/.test(fullHex)) {
    return `rgba(37, 99, 235, ${alpha})`;
  }

  const red = Number.parseInt(fullHex.slice(0, 2), 16);
  const green = Number.parseInt(fullHex.slice(2, 4), 16);
  const blue = Number.parseInt(fullHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

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

function formatDate(value: unknown) {
  if (!value) return 'Not available';
  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return 'Not available';

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatAccountId(value: string) {
  const normalized = value.trim();

  if (normalized.length <= 16) return normalized;

  return `acct_${normalized.slice(0, 8)}...${normalized.slice(-4)}`;
}

async function copyToClipboard(value: string, label: string) {
  const didCopy = await copyTextToClipboard(value);

  if (didCopy) {
    toast.success(`${label} copied.`);
    return;
  }

  toast.error(`Unable to copy ${label.toLowerCase()}.`);
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function SectionCard({
  title,
  description,
  icon,
  children,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="account-section-card border-t border-slate-200/80 pt-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon && <div className="grid h-8 w-8 place-items-center text-slate-500">{icon}</div>}
          <div>
            <h2 className="font-display text-[15px] font-semibold text-slate-950">{title}</h2>
            {description && <p className="mt-1 text-[12px] text-slate-500">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function PreferenceSwitch({
  title,
  description,
  checked,
  onChange,
  icon,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="account-preference-row flex w-full items-center justify-between gap-4 border-b border-slate-200/80 py-3.5 text-left transition hover:bg-slate-50/70"
    >
      <span className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center text-slate-500">{icon}</span>
        <span>
          <span className="block text-sm font-semibold text-slate-950">{title}</span>
          <span className="text-[12px] text-slate-500">{description}</span>
        </span>
      </span>
      <span className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-slate-900' : 'bg-slate-300'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  );
}

function AccountNavButton({
  active,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`account-nav-button flex w-full items-start gap-3 border-l-2 px-3 py-3 text-left transition ${
        active
          ? 'account-nav-button-active border-l-slate-950 bg-slate-50 text-slate-950'
          : 'border-l-transparent text-slate-600 hover:border-l-slate-300 hover:bg-slate-50/80 hover:text-slate-950'
      }`}
    >
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center ${
          active ? 'text-slate-950' : 'text-slate-500'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-current">{title}</p>
        <p className={`mt-1 text-[12px] leading-[1.35rem] ${active ? 'text-slate-600' : 'text-slate-500'}`}>{description}</p>
      </div>
    </button>
  );
}

export function AccountCenter() {
  const {
    activeAccountSection,
    closeAccountPanel,
    openAccountPanel,
    user,
    papers,
    collections,
    createCollection,
    deleteCollection,
    removeFromCollection,
    setSelectedPaper,
    quota,
    planCapabilities,
    siteConfig,
    savedPapersCount,
    unreadNotificationsCount,
    notifications,
    markAllNotificationsAsRead,
    refreshUserData,
    navigateToPricing,
    logout,
    toggleLoginModal,
  } = useApp();

  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);
  const [collectionSearch, setCollectionSearch] = useState('');
  const [savedPaperSearch, setSavedPaperSearch] = useState('');
  const [preferences, setPreferences] = useState<PreferenceState>(() => readPreferences());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const savedPapers = useMemo(() => {
    const savedIds = new Set(user?.savedPapers || []);
    const query = savedPaperSearch.trim().toLowerCase();

    return papers
      .filter((paper) => savedIds.has(paper.id))
      .filter((paper) => {
        if (!query) return true;
        return `${paper.title} ${paper.authors.join(' ')} ${paper.year}`.toLowerCase().includes(query);
      });
  }, [papers, savedPaperSearch, user]);

  const paperById = useMemo(() => new Map(papers.map((paper) => [paper.id, paper])), [papers]);

  const filteredCollections = useMemo(() => {
    const query = collectionSearch.trim().toLowerCase();
    if (!query) return collections;
    return collections.filter((collection) =>
      `${collection.name} ${collection.description}`.toLowerCase().includes(query),
    );
  }, [collectionSearch, collections]);

  if (!activeAccountSection) return null;

  const primaryColor = siteConfig.branding.primaryColor || '#2563EB';
  const secondaryColor = siteConfig.branding.secondaryColor || '#0EA5E9';
  const isPricingEnabled = siteConfig.pricing.enabled !== false;
  const brandGradient = `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`;
  const surfaceGradient = `linear-gradient(145deg, ${hexToRgba(primaryColor, 0.12)}, ${hexToRgba(secondaryColor, 0.06)})`;
  const billing = user?.billing || {};
  const billingStatus = String(billing.status || (user?.plan === 'PRO' ? 'active' : 'free'));
  const billingRenewal = formatDate(billing.currentPeriodEnd);
  const displayAccountId = user ? formatAccountId(user.id) : 'Not available';
  const enabledPreferenceCount = Object.values(preferences).filter(Boolean).length;
  const collectionItemCount = collections.reduce((total, collection) => total + collection.paperIds.length, 0);
  const usageProgress = quota?.limit ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : null;
  const sectionSubtitle =
    activeAccountSection === 'profile'
      ? 'Identity, billing, workspace activity and saved research.'
      : activeAccountSection === 'collections'
        ? 'Organize reading lists, topic buckets and review folders.'
        : 'Preferences, security and live backend integrations.';
  const handleCreateCollection = (event: FormEvent) => {
    event.preventDefault();
    if (!newCollectionName.trim()) return;
    createCollection(newCollectionName.trim(), newCollectionDescription.trim(), selectedColor);
    setNewCollectionName('');
    setNewCollectionDescription('');
    toast.success('Collection created.');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUserData();
      toast.success('Account synced from backend.');
    } catch {
      toast.error('Unable to sync account right now.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = () => {
    logout();
    closeAccountPanel();
  };

  const exportAccountData = () => {
    downloadJson(`litflow-account-${Date.now()}.json`, {
      user,
      quota,
      planCapabilities,
      savedPapers,
      collections,
      preferences,
      exportedAt: new Date().toISOString(),
    });
    toast.success('Account data exported.');
  };

  return (
    <div className="account-center-surface relative min-h-full bg-[#f4f8fc]">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full blur-3xl" style={{ background: hexToRgba(primaryColor, 0.22) }} />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full blur-3xl" style={{ background: hexToRgba(secondaryColor, 0.18) }} />

      <section className="relative flex min-h-full">
        <aside className="hidden h-[calc(100vh-5rem)] w-[290px] shrink-0 self-start overflow-y-auto overscroll-contain border-r border-slate-200 bg-white p-5 pr-4 scrollbar-thin lg:sticky lg:top-0 lg:flex lg:flex-col xl:w-[300px]">
          <div className="space-y-5 pb-5">
            {!user && (
              <div className="border-b border-slate-200 pb-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Secure Access</p>
                <p className="mt-2 font-display text-lg font-bold text-slate-950">OTP sign-in ready</p>
                <p className="mt-2 text-[12px] leading-5 text-slate-600">
                  Login once to unlock saved papers, billing details, collections and synced workspace settings.
                </p>
              </div>
            )}

            {user && (
              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Quick Access</p>
                <AccountNavButton
                  active={activeAccountSection === 'profile'}
                  title="Profile"
                  description="Identity, quota, billing and activity."
                  icon={<User className="h-4 w-4" />}
                  onClick={() => openAccountPanel('profile')}
                />
                <AccountNavButton
                  active={activeAccountSection === 'collections'}
                  title="Collections"
                  description="Reading lists, folders and paper groups."
                  icon={<FolderHeart className="h-4 w-4" />}
                  onClick={() => openAccountPanel('collections')}
                />
                <AccountNavButton
                  active={activeAccountSection === 'settings'}
                  title="Settings"
                  description="Preferences, security and integrations."
                  icon={<Settings className="h-4 w-4" />}
                  onClick={() => openAccountPanel('settings')}
                />
              </div>
            )}

            <div className="rounded-[18px] border-t border-slate-200/80 pt-4 text-[12px] leading-5 text-slate-500">
              OTP login, saved papers, billing, and workspace preferences stay connected through the live backend session.
            </div>
          </div>
        </aside>

        <div className="relative flex min-w-0 flex-1 flex-col bg-transparent">
          <header className="border-b border-slate-200/70 bg-white/76 px-4 py-3 backdrop-blur-xl md:px-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Account Center</p>
                <h1 className="mt-1 font-display text-[1.65rem] font-bold tracking-tight text-slate-950">
                  {activeAccountSection === 'profile' && 'Profile'}
                  {activeAccountSection === 'collections' && 'Collections'}
                  {activeAccountSection === 'settings' && 'Settings'}
                </h1>
                <p className="mt-1 text-[12px] text-slate-500">{sectionSubtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                {user && (
                  <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="hidden rounded-full border-slate-200 bg-white/95 shadow-sm sm:inline-flex">
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Sync account
                  </Button>
                )}
                <Button variant="outline" onClick={closeAccountPanel} className="hidden rounded-full border-slate-200 bg-white/95 shadow-sm md:inline-flex">
                  Back to workspace
                </Button>
                <Button variant="ghost" size="icon" onClick={closeAccountPanel} className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm md:hidden">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

          </header>

          {!user ? (
            <div className="grid flex-1 place-items-center p-6 md:p-10">
              <div className="w-full max-w-2xl overflow-hidden rounded-[36px] border border-white/75 bg-white/94 shadow-[0_28px_100px_rgba(15,23,42,0.12)]">
                <div className="p-7 text-white" style={{ backgroundImage: brandGradient }}>
                  <div className="grid h-16 w-16 place-items-center rounded-[24px] bg-white/16">
                    <ShieldCheck className="h-8 w-8" />
                  </div>
                  <h2 className="mt-5 font-display text-[1.9rem] font-bold">Your workspace is ready</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
                    Sign in once with email OTP to manage saved papers, collections, notifications, billing and real backend-connected account settings.
                  </p>
                </div>
                <div className="grid gap-4 p-7 md:grid-cols-3">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-950">Saved research</p>
                    <p className="mt-2 text-sm text-slate-500">Sync reading history and paper saves across sessions.</p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-950">OTP security</p>
                    <p className="mt-2 text-sm text-slate-500">Passwordless authentication with backend email verification.</p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-950">Billing control</p>
                    <p className="mt-2 text-sm text-slate-500">See plan status, upgrade options and connected integrations.</p>
                  </div>
                </div>
                <div className="border-t border-slate-200 px-7 py-5">
                  <Button
                    className="rounded-full px-5 text-white shadow-lg"
                    style={{ backgroundImage: brandGradient }}
                    onClick={() => {
                      closeAccountPanel();
                      toggleLoginModal();
                    }}
                  >
                    Login with OTP
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Tabs
              value={activeAccountSection}
              onValueChange={(value) => openAccountPanel(value as 'profile' | 'collections' | 'settings')}
              className="flex-1"
            >
              <div className="border-b border-slate-200/80 bg-white/62 px-4 py-2.5 backdrop-blur lg:px-5">
                <TabsList className="grid h-11 w-full grid-cols-3 rounded-[20px] bg-slate-100 p-1 lg:w-[560px] lg:hidden">
                  <TabsTrigger value="profile" className="rounded-[16px] text-sm">
                    <User className="h-4 w-4" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger value="collections" className="rounded-[16px] text-sm">
                    <FolderHeart className="h-4 w-4" />
                    Collections
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="rounded-[16px] text-sm">
                    <Settings className="h-4 w-4" />
                    Settings
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-4 pb-8 md:p-5 md:pb-10">
                <TabsContent value="profile" className="space-y-0">
                  <section className="border-b border-slate-200 pb-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3.5">
                        <div
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-base font-bold text-white"
                          style={{ backgroundImage: brandGradient }}
                        >
                          {user.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase text-slate-500">Profile</p>
                          <h2 className="mt-1 font-display text-[1.32rem] font-bold text-slate-950">{user.name}</h2>
                          <p className="mt-1.5 flex min-w-0 items-center gap-2 text-sm text-slate-600">
                            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="truncate">{user.email}</span>
                          </p>
                          <p className="mt-1.5 max-w-3xl text-[12px] leading-5 text-slate-600">
                            {user.institution || siteConfig.branding.tagline || 'Independent researcher workspace'}
                          </p>
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            <Badge className="bg-slate-950 text-white">{planCapabilities.name}</Badge>
                            <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                              {quota?.label || 'Credits synced'}
                            </Badge>
                            <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                              {billingStatus}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" className="border-slate-200 bg-white" onClick={() => copyToClipboard(user.email, 'Email')}>
                          <Copy className="h-4 w-4" />
                          Copy email
                        </Button>
                        <Button variant="outline" className="border-slate-200 bg-white" onClick={exportAccountData}>
                          <Download className="h-4 w-4" />
                          Export data
                        </Button>
                      </div>
                    </div>

                    <div className="mt-6 grid border-t border-slate-200 xl:grid-cols-[minmax(0,1fr)_280px]">
                      <div className="grid sm:grid-cols-2">
                        <div className="border-b border-slate-200 py-4 pr-4 sm:border-r">
                          <p className="text-[11px] font-semibold uppercase text-slate-500">Workspace</p>
                          <p className="mt-1.5 text-sm font-semibold text-slate-950">{user.institution || 'Independent researcher workspace'}</p>
                          <p className="mt-1 text-[12px] text-slate-500">Primary identity connected to search, saves, and billing.</p>
                        </div>
                        <div className="border-b border-slate-200 py-4 sm:pl-4">
                          <p className="text-[11px] font-semibold uppercase text-slate-500">Account ID</p>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(user.id, 'Account ID')}
                            title={user.id}
                            className="mt-1.5 inline-flex max-w-full items-center gap-1.5 text-left text-[12px] font-semibold text-slate-700 hover:text-blue-700"
                          >
                            <span className="max-w-[180px] truncate font-mono">{displayAccountId}</span>
                            <Copy className="h-3.5 w-3.5 shrink-0" />
                          </button>
                          <p className="mt-1 text-[12px] text-slate-500">Click to copy the full workspace identifier.</p>
                        </div>
                        <div className="border-b border-slate-200 py-4 pr-4 sm:border-r sm:border-b-0">
                          <p className="text-[11px] font-semibold uppercase text-slate-500">Billing period end</p>
                          <p className="mt-1.5 text-sm font-semibold text-slate-950">{billingRenewal}</p>
                          <p className="mt-1 text-[12px] text-slate-500">Renewal timing synced from backend billing.</p>
                        </div>
                        <div className="py-4 sm:pl-4">
                          <p className="text-[11px] font-semibold uppercase text-slate-500">Workspace status</p>
                          <p className="mt-1.5 text-sm font-semibold text-slate-950">
                            {savedPapersCount} saved papers, {unreadNotificationsCount} unread alerts
                          </p>
                          <p className="mt-1 text-[12px] text-slate-500">Reading history and alerts remain available across sessions.</p>
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-4 xl:border-l xl:border-t-0 xl:pl-5">
                        <p className="text-[11px] font-semibold uppercase text-slate-500">Membership</p>
                        <div className="mt-1.5 flex items-end justify-between gap-3">
                          <p className="text-lg font-bold text-slate-950">{planCapabilities.name}</p>
                          <span className="text-sm font-semibold text-slate-700">
                            {usageProgress === null ? 'Unlimited' : `${usageProgress}%`}
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] leading-5 text-slate-500">
                          {isPricingEnabled
                            ? `Pro plan: ${formatPrice(siteConfig.pricing.currency, siteConfig.pricing.pro, siteConfig.pricing.billingCycle)}`
                            : 'Plan access is currently managed by the admin team.'}
                        </p>

                        {usageProgress !== null ? (
                          <>
                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                              <div className="h-full rounded-full" style={{ width: `${usageProgress}%`, backgroundImage: brandGradient }} />
                            </div>
                            <p className="mt-2 text-[12px] text-slate-500">
                              Used {quota?.used ?? 0} of {quota?.limit ?? 'unlimited'} credits this cycle.
                            </p>
                          </>
                        ) : (
                          <p className="mt-3 text-[12px] text-slate-500">Unlimited credits are active on this workspace.</p>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button variant="outline" className="border-slate-200 bg-white" onClick={handleRefresh} disabled={isRefreshing}>
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Sync
                          </Button>
                          {isPricingEnabled && user.plan !== 'PRO' ? (
                            <Button className="text-white" style={{ backgroundImage: brandGradient }} onClick={navigateToPricing}>
                              <Crown className="h-4 w-4" />
                              Upgrade
                            </Button>
                          ) : (
                            <Badge variant="outline" className="border-slate-200 bg-white px-3 py-2 text-slate-700">
                              {user.plan === 'PRO' ? 'Pro active' : 'Pricing hidden'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="grid gap-8 pt-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                    <section>
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Bell className="mt-0.5 h-5 w-5 text-slate-500" />
                          <div>
                            <h2 className="font-display text-[15px] font-semibold text-slate-950">Recent Activity</h2>
                            <p className="mt-1 text-[12px] text-slate-500">Latest profile, workspace and account events from this session.</p>
                          </div>
                        </div>
                        {notifications.length > 0 ? (
                          <Button variant="outline" size="sm" className="border-slate-200 bg-white" onClick={markAllNotificationsAsRead}>
                            Mark all read
                          </Button>
                        ) : (
                          <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">All caught up</Badge>
                        )}
                      </div>

                      {notifications.length === 0 ? (
                        <div className="border-y border-dashed border-slate-300 py-4">
                          <p className="text-sm font-semibold text-slate-950">No recent activity</p>
                          <p className="mt-1 text-[12px] leading-5 text-slate-500">
                            New account, search, save, and billing events will appear here automatically.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-200 border-t border-slate-200">
                          {notifications.slice(0, 6).map((notification) => (
                            <div key={notification.id} className="flex gap-3 py-4">
                              <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${notification.read ? 'bg-slate-300' : 'bg-blue-500'}`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-slate-950">{notification.title}</p>
                                  <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                                    {notification.read ? 'Read' : 'New'}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-[12px] leading-5 text-slate-500">{notification.message}</p>
                                <p className="mt-3 text-[11px] font-semibold uppercase text-slate-400">
                                  {formatDate(notification.createdAt)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section>
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Bookmark className="mt-0.5 h-5 w-5 text-slate-500" />
                          <div>
                            <h2 className="font-display text-[15px] font-semibold text-slate-950">Saved Papers</h2>
                            <p className="mt-1 text-[12px] text-slate-500">Open any saved paper directly on the graph.</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">{savedPapers.length}</Badge>
                      </div>

                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={savedPaperSearch}
                          onChange={(event) => setSavedPaperSearch(event.target.value)}
                          placeholder="Search saved papers..."
                          className="h-10 border-slate-200 bg-white pl-10"
                        />
                      </div>
                      <div className="max-h-[420px] overflow-y-auto pr-1">
                        {savedPapers.length === 0 ? (
                          <div className="border-y border-dashed border-slate-300 py-4 text-[12px] leading-5 text-slate-500">
                            No saved papers yet. Open a paper from the graph and save it to build your research library.
                          </div>
                        ) : (
                          savedPapers.map((paper) => (
                            <button
                              key={paper.id}
                              className="w-full border-b border-slate-200 py-4 text-left transition hover:bg-slate-50"
                              onClick={() => {
                                setSelectedPaper(paper);
                                closeAccountPanel();
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="line-clamp-2 text-sm font-semibold text-slate-950">{paper.title}</p>
                                  <p className="mt-1 text-[12px] text-slate-500">
                                    {paper.authors.slice(0, 2).join(', ')}
                                    {paper.authors.length > 2 ? ' +' : ''}
                                  </p>
                                </div>
                                <span className="shrink-0 text-[12px] font-semibold text-slate-500">
                                  {paper.year || 'Year n/a'}
                                </span>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
                                <span>{paper.category}</span>
                                <span>{paper.citations} citations</span>
                                {(paper.venue || paper.journal) && <span>{paper.venue || paper.journal}</span>}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </section>
                  </div>
                </TabsContent>

                <TabsContent value="collections" className="space-y-5">
                  <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/88 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                    <div className="p-5" style={{ backgroundImage: surfaceGradient }}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Collection Workspace</p>
                          <h2 className="mt-1 font-display text-[1.68rem] font-bold text-slate-950">Organize your literature</h2>
                          <p className="mt-2 max-w-2xl text-[12px] leading-5 text-slate-600">
                            Build focused reading lists, prepare review bundles and keep project-specific papers grouped in one place.
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-[20px] border border-white/80 bg-white/80 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Collections</p>
                            <p className="mt-1 font-display text-xl font-bold text-slate-950">{collections.length}</p>
                          </div>
                          <div className="rounded-[20px] border border-white/80 bg-white/80 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Papers in lists</p>
                            <p className="mt-1 font-display text-xl font-bold text-slate-950">{collectionItemCount}</p>
                          </div>
                          <div className="rounded-[20px] border border-white/80 bg-white/80 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Latest sync</p>
                            <p className="mt-1 font-display text-xl font-bold text-slate-950">{formatDate(new Date())}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
                    <SectionCard
                      title="Create Collection"
                      description="Build reading lists for topics, projects or reviews."
                      icon={<FolderHeart className="h-5 w-5" />}
                    >
                      <form onSubmit={handleCreateCollection} className="space-y-3.5">
                        <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-3.5">
                          <label className="text-sm font-semibold text-slate-700">Name</label>
                          <Input
                            value={newCollectionName}
                            onChange={(event) => setNewCollectionName(event.target.value)}
                            placeholder="e.g. Literature Review"
                            className="mt-2 h-10 rounded-[16px] border-slate-200 bg-white"
                          />
                        </div>
                        <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-3.5">
                          <label className="text-sm font-semibold text-slate-700">Description</label>
                          <Input
                            value={newCollectionDescription}
                            onChange={(event) => setNewCollectionDescription(event.target.value)}
                            placeholder="Short note"
                            className="mt-2 h-10 rounded-[16px] border-slate-200 bg-white"
                          />
                        </div>
                        <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-3.5">
                          <label className="text-sm font-semibold text-slate-700">Color</label>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {colorOptions.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={`h-9 w-9 rounded-full border-2 transition ${
                                  selectedColor === color ? 'scale-110 border-slate-950' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => setSelectedColor(color)}
                                aria-label={`Select ${color}`}
                              />
                            ))}
                          </div>
                        </div>
                        <Button type="submit" className="w-full rounded-full text-white" style={{ backgroundImage: brandGradient }} disabled={!newCollectionName.trim()}>
                          Create Collection
                        </Button>
                      </form>
                    </SectionCard>

                    <SectionCard
                      title="Collection Library"
                      description="Manage reading lists and open papers quickly."
                      icon={<Database className="h-5 w-5" />}
                      action={<Badge variant="outline" className="border-slate-200 bg-white text-slate-600">{filteredCollections.length} lists</Badge>}
                    >
                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={collectionSearch}
                          onChange={(event) => setCollectionSearch(event.target.value)}
                          placeholder="Search collections..."
                          className="h-10 rounded-[16px] border-slate-200 bg-white pl-10"
                        />
                      </div>
                      <div className="space-y-3.5">
                        {filteredCollections.length === 0 ? (
                          <div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-6 text-center">
                            <FolderHeart className="mx-auto h-10 w-10 text-slate-400" />
                            <h3 className="mt-3 font-display text-lg font-bold text-slate-950">No collections found</h3>
                            <p className="mt-1 text-[12px] text-slate-500">Create a new collection or change your search.</p>
                          </div>
                        ) : (
                          filteredCollections.map((collection) => {
                            const collectionPapers = collection.paperIds
                              .map((paperId) => paperById.get(paperId))
                              .filter(Boolean);

                            return (
                              <div key={collection.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                  <div className="flex min-w-0 items-start gap-4">
                                    <div className="mt-1 h-12 w-2 rounded-full" style={{ backgroundColor: collection.color }} />
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-display text-lg font-bold text-slate-950">{collection.name}</h3>
                                        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                                          {collection.paperIds.length} papers
                                        </Badge>
                                      </div>
                                      <p className="mt-2 text-[12px] text-slate-500">
                                        {collection.description || 'No description added.'}
                                      </p>
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">Updated {formatDate(collection.updatedAt)}</Badge>
                                        <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                                          {collectionPapers.length === 0 ? 'Awaiting papers' : 'Ready for review'}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="icon" className="rounded-2xl border border-slate-200 bg-slate-50" onClick={() => deleteCollection(collection.id)}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>

                                {collectionPapers.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {collectionPapers.slice(0, 3).map(
                                      (paper) =>
                                        paper && (
                                          <span key={paper.id} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
                                            {paper.title}
                                          </span>
                                        ),
                                    )}
                                  </div>
                                )}

                                <div className="mt-3.5 grid gap-3 md:grid-cols-2">
                                  {collectionPapers.length === 0 ? (
                                    <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 p-4 text-[12px] text-slate-500">
                                      Add papers from the paper detail panel or AI recommendation card.
                                    </div>
                                  ) : (
                                    collectionPapers.map((paper) => paper && (
                                      <div key={paper.id} className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-3.5">
                                        <p className="line-clamp-2 text-sm font-semibold text-slate-950">{paper.title}</p>
                                        <p className="mt-1 text-[12px] text-slate-500">
                                          {paper.authors[0]} - {paper.year || 'Unknown year'}
                                        </p>
                                        <div className="mt-2.5 flex flex-wrap gap-2">
                                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">{paper.category}</span>
                                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">{paper.citations} cites</span>
                                        </div>
                                        <div className="mt-3.5 flex gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-full border-slate-200 bg-white"
                                            onClick={() => {
                                              setSelectedPaper(paper);
                                              closeAccountPanel();
                                            }}
                                          >
                                            Open
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="rounded-full"
                                            onClick={() => removeFromCollection(paper.id, collection.id)}
                                          >
                                            Remove
                                          </Button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </SectionCard>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-5">
                  <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/88 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                    <div className="p-5" style={{ backgroundImage: surfaceGradient }}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace Settings</p>
                          <h2 className="mt-1 font-display text-[1.68rem] font-bold text-slate-950">Secure, synced and customizable</h2>
                          <p className="mt-2 max-w-2xl text-[12px] leading-5 text-slate-600">
                            Control how LitFlow behaves in this browser while keeping backend-connected integrations visible and easy to audit.
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-[20px] border border-white/80 bg-white/80 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Enabled</p>
                            <p className="mt-1 font-display text-xl font-bold text-slate-950">{enabledPreferenceCount}/4</p>
                          </div>
                          <div className="rounded-[20px] border border-white/80 bg-white/80 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Plan</p>
                            <p className="mt-1 font-display text-xl font-bold text-slate-950">{planCapabilities.name}</p>
                          </div>
                          <div className="rounded-[20px] border border-white/80 bg-white/80 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Notifications</p>
                            <p className="mt-1 font-display text-xl font-bold text-slate-950">{notifications.length}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
                    <SectionCard
                      title="Workspace Preferences"
                      description="Personal settings are saved in this browser and applied instantly."
                      icon={<SlidersHorizontal className="h-5 w-5" />}
                    >
                      <div className="grid gap-3">
                        <PreferenceSwitch
                          title="Email updates"
                          description="Receive product, OTP and billing updates."
                          checked={preferences.emailUpdates}
                          onChange={(checked) => setPreferences((current) => ({ ...current, emailUpdates: checked }))}
                          icon={<Mail className="h-4 w-4" />}
                        />
                        <PreferenceSwitch
                          title="Graph hints"
                          description="Show helpful research-map guidance."
                          checked={preferences.graphHints}
                          onChange={(checked) => setPreferences((current) => ({ ...current, graphHints: checked }))}
                          icon={<Sparkles className="h-4 w-4" />}
                        />
                        <PreferenceSwitch
                          title="Compact cards"
                          description="Use denser cards for large literature reviews."
                          checked={preferences.compactCards}
                          onChange={(checked) => setPreferences((current) => ({ ...current, compactCards: checked }))}
                          icon={<Palette className="h-4 w-4" />}
                        />
                        <PreferenceSwitch
                          title="Weekly digest"
                          description="Prepare a weekly reading digest when supported."
                          checked={preferences.weeklyDigest}
                          onChange={(checked) => setPreferences((current) => ({ ...current, weeklyDigest: checked }))}
                          icon={<Bell className="h-4 w-4" />}
                        />
                      </div>
                    </SectionCard>

                    <SectionCard
                      title="Security"
                      description="Passwordless OTP account protection."
                      icon={<KeyRound className="h-5 w-5" />}
                    >
                      <div className="space-y-3.5">
                        <div className="rounded-[20px] border border-green-100 bg-green-50 p-3.5">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="text-sm font-semibold text-green-950">OTP login enabled</p>
                              <p className="text-[12px] text-green-800">Your account uses backend email OTP verification.</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Button variant="outline" className="rounded-full border-slate-200 bg-white" onClick={() => copyToClipboard(user.email, 'Email')}>
                            <Copy className="h-4 w-4" />
                            Copy email
                          </Button>
                          <Button variant="outline" className="rounded-full border-slate-200 bg-white" onClick={() => copyToClipboard(user.id, 'Account ID')}>
                            <Copy className="h-4 w-4" />
                            Copy ID
                          </Button>
                        </div>
                        <Button variant="destructive" className="w-full rounded-full" onClick={handleLogout}>
                          <LogOut className="h-4 w-4" />
                          Log out securely
                        </Button>
                      </div>
                    </SectionCard>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <SectionCard
                      title="Live Integrations"
                      description="These features are wired to server-side env integrations."
                      icon={<Database className="h-5 w-5" />}
                    >
                      <div className="grid gap-3">
                        {[
                          ['OTP Email', 'SMTP-backed passwordless login', <Mail key="mail" className="h-4 w-4" />],
                          ['Research Search', 'Connected discovery and graph engine', <Search key="search" className="h-4 w-4" />],
                          ['Saved Papers', 'Supabase account storage', <Database key="db" className="h-4 w-4" />],
                          [
                            'AI Summary',
                            planCapabilities.aiSummary ? 'OpenAI summary enabled' : 'Pro or admin gated',
                            <Sparkles key="ai" className="h-4 w-4" />,
                          ],
                        ].map(([title, description, icon]) => (
                          <div key={String(title)} className="flex items-center justify-between rounded-[18px] border border-slate-200/70 bg-slate-50/90 p-3.5">
                            <div className="flex items-center gap-3">
                              <div className="grid h-9 w-9 place-items-center rounded-[14px] bg-white text-slate-700 shadow-sm">
                                {icon}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-950">{title}</p>
                                <p className="text-[12px] text-slate-500">{description}</p>
                              </div>
                            </div>
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          </div>
                        ))}
                      </div>
                    </SectionCard>

                    <SectionCard
                      title="Data and Billing"
                      description="Export workspace data and manage your plan."
                      icon={<FileJson className="h-5 w-5" />}
                    >
                      <div className="space-y-3.5">
                        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3.5">
                          <p className="text-sm font-medium text-slate-950">Current plan: {planCapabilities.name}</p>
                          <p className="mt-1 text-[12px] text-slate-500">{quota?.label || 'Credit balance synced from backend.'}</p>
                          <p className="mt-1 text-[12px] text-slate-500">
                            {isPricingEnabled
                              ? `Pro price: ${formatPrice(siteConfig.pricing.currency, siteConfig.pricing.pro, siteConfig.pricing.billingCycle)}`
                              : 'Pricing page is hidden. Existing plan access keeps working normally.'}
                          </p>
                          {usageProgress !== null && (
                            <>
                              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                                <div className="h-full rounded-full" style={{ width: `${usageProgress}%`, backgroundImage: brandGradient }} />
                              </div>
                              <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                                {quota?.used ?? 0} of {quota?.limit ?? 'unlimited'} used
                              </p>
                            </>
                          )}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button variant="outline" className="rounded-full border-slate-200 bg-white" onClick={handleRefresh} disabled={isRefreshing}>
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Sync account
                          </Button>
                          <Button variant="outline" className="rounded-full border-slate-200 bg-white" onClick={markAllNotificationsAsRead}>
                            <Bell className="h-4 w-4" />
                            Clear alerts
                          </Button>
                          <Button variant="outline" className="rounded-full border-slate-200 bg-white" onClick={exportAccountData}>
                            <Download className="h-4 w-4" />
                            Export JSON
                          </Button>
                          {isPricingEnabled && user.plan !== 'PRO' ? (
                            <Button className="rounded-full text-white" style={{ backgroundImage: brandGradient }} onClick={navigateToPricing}>
                              <Crown className="h-4 w-4" />
                              Upgrade
                            </Button>
                          ) : (
                            <Button variant="outline" disabled className="rounded-full border-slate-200 bg-white">
                              <CheckCircle2 className="h-4 w-4" />
                              {user.plan === 'PRO' ? 'Pro active' : 'Pricing hidden'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </SectionCard>
                  </div>

                  {notifications.length > 0 && (
                    <SectionCard
                      title="Recent Notifications"
                      description="Latest activity from this session."
                      icon={<Bell className="h-5 w-5" />}
                    >
                      <div className="grid gap-3 md:grid-cols-2">
                        {notifications.slice(0, 6).map((notification) => (
                          <div key={notification.id} className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-3.5">
                            <p className="text-sm font-semibold text-slate-950">{notification.title}</p>
                            <p className="mt-2 text-[12px] text-slate-500">{notification.message}</p>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </section>
    </div>
  );
}
