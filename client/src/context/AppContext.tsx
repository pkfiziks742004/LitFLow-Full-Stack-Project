import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { ApiRequestError, apiRequest, getErrorMessage } from '@/api/http';
import type {
  AIRecommendation,
  ApiGraphEdge,
  ApiGraphNode,
  ApiPaper,
  CitationEdge,
  Collection,
  FilterState,
  Notification,
  Paper,
  PlanCapabilities,
  PricingConfig,
  QuotaSnapshot,
  RuntimeFeatures,
  SiteConfig,
  UpgradeDialogBadge,
  UpgradeDialogConfig,
  UpgradeDialogRow,
  User,
  ViewMode,
} from '@/types';

const AUTH_TOKEN_KEY = 'litflow:auth-token';
const COLLECTIONS_KEY = 'litflow:collections';
const DESKTOP_LAYOUT_QUERY = '(min-width: 1024px)';
const GUEST_COLLECTION_SCOPE = 'guest';
const DEFAULT_COLLECTION_COLOR = '#3B82F6';
const MAX_COLLECTION_NAME_LENGTH = 64;
const MAX_COLLECTION_DESCRIPTION_LENGTH = 220;
const MAX_COLLECTION_ITEMS = 250;

const defaultFilters: FilterState = {
  yearRange: [1990, new Date().getFullYear()],
  authors: [],
  keywords: [],
  categories: [],
  minCitations: 0,
};

const defaultCapabilities: PlanCapabilities = {
  id: 'FREE',
  name: 'Free',
  dailySearchLimit: 10,
  maxSavedPapers: 25,
  adsEnabled: true,
  advancedFilters: false,
  aiSummary: false,
  graphExport: false,
};

const defaultPricing: PricingConfig = {
  enabled: false,
  currency: 'INR',
  free: 0,
  pro: 999,
  billingCycle: 'month',
};

const defaultSiteConfig: SiteConfig = {
  siteName: 'LitFlow',
  branding: {
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
    tagline: 'Research graphs that move with you',
  },
  pricing: defaultPricing,
  upgradeDialog: {
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
      { label: 'Secure backend billing sync', icon: 'shield' },
    ],
    summaryRows: [
      { label: 'Subtotal', value: '{subtotal}' },
      { label: 'Tax {taxRate}%', value: '{tax}' },
      { label: 'Total due today', value: '{total}', emphasized: true },
    ],
    infoRows: [
      { label: 'Payment method', value: 'Secure Razorpay checkout' },
      { label: 'Billing account', value: '{userEmail}' },
    ],
  },
  features: {
    aiFeatures: true,
    adsEnabled: true,
    newFeatures: false,
  },
};

const noop = () => {};
const noopAsync = async () => {};

type AuthResponse = {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    plan: 'FREE' | 'PRO';
    billing?: Record<string, unknown> | null;
  };
  quota: QuotaSnapshot;
  planCapabilities: PlanCapabilities;
};

type UserDataResponse = {
  success: boolean;
  user: {
    id: string;
    email: string;
    plan: 'FREE' | 'PRO';
    billing?: Record<string, unknown> | null;
  };
  savedPapers: ApiPaper[];
  quota: QuotaSnapshot;
  planCapabilities: PlanCapabilities;
};

type SearchResponse = {
  success: boolean;
  total: number;
  papers: ApiPaper[];
  graph?: {
    nodes: ApiGraphNode[];
    edges: ApiGraphEdge[];
  };
  appliedFilters?: {
    yearStart: number | null;
    yearEnd: number | null;
    author: string;
    keywords: string;
  };
  quota: QuotaSnapshot;
  planCapabilities: PlanCapabilities;
  upsell?: string | null;
};

type SendOtpResponse = {
  success: boolean;
  message: string;
  expiresInSeconds: number;
  deliveryMode?: string;
  previewOtp?: string | null;
};

type SavePaperResponse = {
  success: boolean;
  savedPaper: ApiPaper;
};

type SummaryResponse = {
  success: boolean;
  summary: string;
  simplifiedAbstract: string;
  estimatedCostInr?: number;
};

type SubscriptionResponse = {
  success: boolean;
  keyId: string;
  subscription: {
    id: string;
    status?: string;
  };
};

type VerifySubscriptionResponse = {
  success: boolean;
  user: {
    id: string;
    email: string;
    plan: 'FREE' | 'PRO';
    billing?: Record<string, unknown> | null;
  };
  planCapabilities: PlanCapabilities;
};

type AccountSection = 'profile' | 'collections' | 'settings' | 'pricing';

const accountPathMap: Record<AccountSection, string> = {
  profile: '/profile',
  collections: '/collections',
  settings: '/settings',
  pricing: '/pricing',
};

function getAccountSectionFromPath(pathname: string): AccountSection | null {
  const normalized = pathname.toLowerCase();

  if (normalized === accountPathMap.profile) return 'profile';
  if (normalized === accountPathMap.collections) return 'collections';
  if (normalized === accountPathMap.settings) return 'settings';
  if (normalized === accountPathMap.pricing) return 'pricing';

  return null;
}

type RazorpayCheckoutResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill: {
    email: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpayCheckoutResponse) => void | Promise<void>;
  modal?: {
    ondismiss?: () => void;
  };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

interface AppState {
  papers: Paper[];
  edges: CitationEdge[];
  collections: Collection[];
  aiRecommendations: AIRecommendation[];
  notifications: Notification[];
  user: User | null;
  selectedPaper: Paper | null;
  sidebarOpen: boolean;
  viewMode: ViewMode;
  filters: FilterState;
  searchQuery: string;
  isAuthenticated: boolean;
  showLoginModal: boolean;
  otpPreviewCode: string;
  isInitialized: boolean;
  isSearching: boolean;
  isSendingOtp: boolean;
  isVerifyingOtp: boolean;
  isSavingPaper: boolean;
  isSummarizing: boolean;
  isUpgradeDialogOpen: boolean;
  isUpgradePending: boolean;
  quota: QuotaSnapshot | null;
  planCapabilities: PlanCapabilities;
  siteConfig: SiteConfig;
  statusMessage: string;
  errorMessage: string;
  upsellMessage: string;
  activeAccountSection: AccountSection | null;
  setSelectedPaper: (paper: Paper | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setFilters: (filters: FilterState) => void;
  setSearchQuery: (query: string) => void;
  toggleLoginModal: () => void;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  searchPapers: (queryOverride?: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
  addToCollection: (paperId: string, collectionId: string) => void;
  removeFromCollection: (paperId: string, collectionId: string) => void;
  createCollection: (name: string, description: string, color: string) => void;
  renameCollection: (collectionId: string, name: string, description: string, color: string) => void;
  deleteCollection: (collectionId: string) => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  savePaper: (paperId: string) => Promise<void>;
  unsavePaper: (paperId: string) => Promise<void>;
  generateSummary: (paperId: string) => Promise<void>;
  upgradeToPro: () => Promise<void>;
  confirmUpgradeToPro: () => Promise<void>;
  closeUpgradeDialog: () => void;
  openAccountPanel: (section: AccountSection) => void;
  closeAccountPanel: () => void;
  navigateHome: () => void;
  navigateToPricing: () => void;
  filteredPapers: Paper[];
  unreadNotificationsCount: number;
  savedPapersCount: number;
}

const AppContext = createContext<AppState | undefined>(undefined);

const fallbackAppState: AppState = {
  papers: [],
  edges: [],
  collections: [],
  aiRecommendations: [],
  notifications: [],
  user: null,
  selectedPaper: null,
  sidebarOpen: true,
  viewMode: 'graph',
  filters: defaultFilters,
  searchQuery: '',
  isAuthenticated: false,
  showLoginModal: false,
  otpPreviewCode: '',
  isInitialized: false,
  isSearching: false,
  isSendingOtp: false,
  isVerifyingOtp: false,
  isSavingPaper: false,
  isSummarizing: false,
  isUpgradeDialogOpen: false,
  isUpgradePending: false,
  quota: null,
  planCapabilities: defaultCapabilities,
  siteConfig: defaultSiteConfig,
  statusMessage: '',
  errorMessage: '',
  upsellMessage: '',
  activeAccountSection: null,
  setSelectedPaper: noop,
  setSidebarOpen: noop,
  setViewMode: noop,
  setFilters: noop,
  setSearchQuery: noop,
  toggleLoginModal: noop,
  sendOtp: noopAsync,
  verifyOtp: noopAsync,
  login: noopAsync,
  logout: noop,
  searchPapers: noopAsync,
  refreshUserData: noopAsync,
  addToCollection: noop,
  removeFromCollection: noop,
  createCollection: noop,
  renameCollection: noop,
  deleteCollection: noop,
  markNotificationAsRead: noop,
  markAllNotificationsAsRead: noop,
  savePaper: noopAsync,
  unsavePaper: noopAsync,
  generateSummary: noopAsync,
  upgradeToPro: noopAsync,
  confirmUpgradeToPro: noopAsync,
  closeUpgradeDialog: noop,
  openAccountPanel: noop,
  closeAccountPanel: noop,
  navigateHome: noop,
  navigateToPricing: noop,
  filteredPapers: [],
  unreadNotificationsCount: 0,
  savedPapersCount: 0,
};

function normalizeText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function deriveNameFromEmail(email: string) {
  const localPart = email.split('@')[0] || 'Researcher';

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function deriveCategory(fieldsOfStudy: string[] = []) {
  const haystack = fieldsOfStudy.join(' ').toLowerCase();

  if (haystack.includes('vision')) return 'computer-vision';
  if (haystack.includes('language') || haystack.includes('linguistic')) return 'nlp';
  if (haystack.includes('reinforcement')) return 'reinforcement-learning';
  if (haystack.includes('optim')) return 'optimization';
  if (haystack.includes('math')) return 'mathematics';
  if (haystack.includes('bio') || haystack.includes('medicine')) return 'biology';
  if (haystack.includes('environment')) return 'environmental-science';

  return 'machine-learning';
}

function toPaper(apiPaper: ApiPaper | ApiGraphNode): Paper {
  const paperId = 'paperId' in apiPaper ? apiPaper.paperId : apiPaper.id;
  const authors = (apiPaper.authors || []).map((author) => author.name).filter(Boolean);
  const fieldsOfStudy = 'fieldsOfStudy' in apiPaper ? apiPaper.fieldsOfStudy || [] : [];
  const externalIds = 'externalIds' in apiPaper ? apiPaper.externalIds || {} : {};

  return {
    id: paperId,
    paperId,
    title: normalizeText(apiPaper.title, 'Untitled paper'),
    authors: authors.length > 0 ? authors : ['Unknown author'],
    authorObjects: apiPaper.authors || [],
    year: Number(apiPaper.year || 0),
    citations: Number(('citationCount' in apiPaper ? apiPaper.citationCount : 0) || 0),
    abstract: normalizeText(apiPaper.abstract, 'Abstract not available.'),
    keywords: fieldsOfStudy,
    doi: externalIds.DOI || externalIds.ArXiv || paperId,
    category: deriveCategory(fieldsOfStudy),
    journal: 'venue' in apiPaper ? apiPaper.venue || 'Unknown venue' : 'Citation graph',
    venue: 'venue' in apiPaper ? apiPaper.venue || '' : '',
    url: normalizeText(apiPaper.url),
    pdfUrl: normalizeText(apiPaper.pdfUrl),
    summary: 'summary' in apiPaper ? apiPaper.summary || '' : '',
    simplifiedAbstract: 'simplifiedAbstract' in apiPaper ? apiPaper.simplifiedAbstract || '' : '',
  };
}

function toApiPaperPayload(paper: Paper) {
  return {
    paperId: paper.paperId || paper.id,
    title: paper.title,
    authors:
      paper.authorObjects && paper.authorObjects.length > 0
        ? paper.authorObjects
        : paper.authors.map((name) => ({ name })),
    year: paper.year || null,
    abstract: paper.abstract,
    venue: paper.venue || paper.journal || '',
    url: paper.url || '',
    pdfUrl: paper.pdfUrl || '',
    fieldsOfStudy: paper.keywords || [],
    summary: paper.summary || '',
    simplifiedAbstract: paper.simplifiedAbstract || '',
  };
}

function mergePapers(...paperGroups: Paper[][]) {
  const merged = new Map<string, Paper>();

  paperGroups.flat().forEach((paper) => {
    const existing = merged.get(paper.id);
    merged.set(paper.id, {
      ...(existing || {}),
      ...paper,
      summary: paper.summary || existing?.summary || '',
      simplifiedAbstract: paper.simplifiedAbstract || existing?.simplifiedAbstract || '',
    });
  });

  return Array.from(merged.values());
}

function toEdge(edge: ApiGraphEdge): CitationEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.relation === 'references' || edge.relation === 'cites' ? 'cites' : 'related',
  };
}

function normalizeUser(
  user: AuthResponse['user'] | UserDataResponse['user'] | VerifySubscriptionResponse['user'],
  savedPaperIds: string[] = [],
): User {
  return {
    id: user.id,
    name: deriveNameFromEmail(user.email),
    email: user.email,
    plan: user.plan || 'FREE',
    billing: user.billing || null,
    savedPapers: savedPaperIds,
    collections: [],
  };
}

function getCollectionStorageScope(userId: string | null) {
  return userId || GUEST_COLLECTION_SCOPE;
}

function getCollectionsStorageKey(scope: string) {
  return `${COLLECTIONS_KEY}:${scope}`;
}

function getLocalStorage() {
  if (typeof window === 'undefined') return null;

  return window.localStorage;
}

function getSessionStorage() {
  if (typeof window === 'undefined') return null;

  return window.sessionStorage;
}

function readStoredToken() {
  const sessionStorage = getSessionStorage();
  const localStorage = getLocalStorage();
  const sessionToken = sessionStorage?.getItem(AUTH_TOKEN_KEY);

  if (sessionToken) {
    return sessionToken;
  }

  const legacyToken = localStorage?.getItem(AUTH_TOKEN_KEY);

  if (legacyToken) {
    sessionStorage?.setItem(AUTH_TOKEN_KEY, legacyToken);
    localStorage?.removeItem(AUTH_TOKEN_KEY);
  }

  return legacyToken || null;
}

function persistToken(token: string) {
  getSessionStorage()?.setItem(AUTH_TOKEN_KEY, token);
  getLocalStorage()?.removeItem(AUTH_TOKEN_KEY);
}

function clearStoredToken() {
  getSessionStorage()?.removeItem(AUTH_TOKEN_KEY);
  getLocalStorage()?.removeItem(AUTH_TOKEN_KEY);
}

function normalizeCollectionColor(value: unknown) {
  if (typeof value === 'string' && /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value.trim())) {
    return value.trim();
  }

  return DEFAULT_COLLECTION_COLOR;
}

function normalizeCollectionName(value: unknown) {
  return normalizeText(value, '').slice(0, MAX_COLLECTION_NAME_LENGTH);
}

function normalizeCollectionDescription(value: unknown) {
  return normalizeText(value, '').slice(0, MAX_COLLECTION_DESCRIPTION_LENGTH);
}

function toValidCollectionDate(value: unknown, fallback: Date) {
  const date = new Date(String(value || fallback.toISOString()));

  return Number.isNaN(date.getTime()) ? fallback : date;
}

function normalizeCollectionPaperIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, MAX_COLLECTION_ITEMS);
}

function normalizeStoredCollection(value: unknown, index: number): Collection | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const name = normalizeCollectionName(record.name);

  if (!name) {
    return null;
  }

  const createdAt = toValidCollectionDate(record.createdAt, new Date());
  const updatedAt = toValidCollectionDate(record.updatedAt, createdAt);

  return {
    id: normalizeText(record.id, `collection-${Date.now()}-${index}`),
    name,
    description: normalizeCollectionDescription(record.description),
    paperIds: normalizeCollectionPaperIds(record.paperIds),
    color: normalizeCollectionColor(record.color),
    createdAt,
    updatedAt,
  };
}

function readStoredCollections(scope: string) {
  try {
    const storage = getLocalStorage();

    if (!storage) {
      return [];
    }

    const storageKey = getCollectionsStorageKey(scope);
    const scopedRaw = storage.getItem(storageKey);
    const legacyRaw = storage.getItem(COLLECTIONS_KEY);
    const raw = scopedRaw || legacyRaw;

    if (legacyRaw && !scopedRaw) {
      storage.setItem(storageKey, legacyRaw);
      storage.removeItem(COLLECTIONS_KEY);
    }

    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    const entries = Array.isArray(parsed) ? parsed : [];
    const seenIds = new Set<string>();
    const sanitizedCollections: Collection[] = [];

    entries.forEach((entry, index) => {
      const collection = normalizeStoredCollection(entry, index);

      if (!collection || seenIds.has(collection.id)) {
        return;
      }

      seenIds.add(collection.id);
      sanitizedCollections.push(collection);
    });

    return sanitizedCollections;
  } catch {
    return [];
  }
}

function createNotification(title: string, message: string, type: Notification['type'] = 'collection_update') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    title,
    message,
    read: false,
    createdAt: new Date(),
  };
}

function getInitialSidebarOpen() {
  if (typeof window === 'undefined') return true;

  return window.matchMedia(DESKTOP_LAYOUT_QUERY).matches;
}

function normalizeUpgradeDialogBadges(
  items: UpgradeDialogConfig['highlightBadges'] | undefined,
  fallbackItems: UpgradeDialogBadge[],
) {
  if (!Array.isArray(items)) {
    return fallbackItems;
  }

  const normalizedItems: UpgradeDialogBadge[] = [];

  items.forEach((item, index) => {
    const fallbackItem = fallbackItems[index] || fallbackItems[fallbackItems.length - 1];

    if (!item || typeof item !== 'object') {
      return;
    }

    normalizedItems.push({
      label: normalizeText(item.label, fallbackItem?.label || 'Highlight'),
      icon: normalizeText(item.icon, fallbackItem?.icon || ''),
    });
  });

  return normalizedItems;
}

function normalizeUpgradeDialogRows(
  items: UpgradeDialogConfig['summaryRows'] | UpgradeDialogConfig['infoRows'] | undefined,
  fallbackItems: UpgradeDialogRow[],
) {
  if (!Array.isArray(items)) {
    return fallbackItems;
  }

  const normalizedItems: UpgradeDialogRow[] = [];

  items.forEach((item, index) => {
    const fallbackItem = fallbackItems[index] || fallbackItems[fallbackItems.length - 1];

    if (!item || typeof item !== 'object') {
      return;
    }

    normalizedItems.push({
      label: normalizeText(item.label, fallbackItem?.label || 'Label'),
      value: normalizeText(item.value, fallbackItem?.value || ''),
      emphasized: item.emphasized === true,
    });
  });

  return normalizedItems;
}

function resolveUpgradeDialogConfig(dialogPayload?: Partial<UpgradeDialogConfig>): UpgradeDialogConfig {
  return {
    ...defaultSiteConfig.upgradeDialog,
    ...(dialogPayload || {}),
    badgeText: normalizeText(dialogPayload?.badgeText, defaultSiteConfig.upgradeDialog.badgeText),
    title: normalizeText(dialogPayload?.title, defaultSiteConfig.upgradeDialog.title),
    description: normalizeText(dialogPayload?.description, defaultSiteConfig.upgradeDialog.description),
    planTitle: normalizeText(dialogPayload?.planTitle, defaultSiteConfig.upgradeDialog.planTitle),
    planDescription: normalizeText(dialogPayload?.planDescription, defaultSiteConfig.upgradeDialog.planDescription),
    dueTodayLabel: normalizeText(dialogPayload?.dueTodayLabel, defaultSiteConfig.upgradeDialog.dueTodayLabel),
    cancelButtonLabel: normalizeText(
      dialogPayload?.cancelButtonLabel,
      defaultSiteConfig.upgradeDialog.cancelButtonLabel,
    ),
    payButtonLabel: normalizeText(dialogPayload?.payButtonLabel, defaultSiteConfig.upgradeDialog.payButtonLabel),
    taxRate: Number.isFinite(Number(dialogPayload?.taxRate))
      ? Number(dialogPayload?.taxRate)
      : defaultSiteConfig.upgradeDialog.taxRate,
    highlightBadges: normalizeUpgradeDialogBadges(
      dialogPayload?.highlightBadges,
      defaultSiteConfig.upgradeDialog.highlightBadges,
    ),
    summaryRows: normalizeUpgradeDialogRows(
      dialogPayload?.summaryRows,
      defaultSiteConfig.upgradeDialog.summaryRows,
    ),
    infoRows: normalizeUpgradeDialogRows(dialogPayload?.infoRows, defaultSiteConfig.upgradeDialog.infoRows),
  };
}

function resolveSiteConfig(sitePayload?: Partial<SiteConfig>): SiteConfig {
  const incomingFeatures = sitePayload?.features as Partial<RuntimeFeatures> | undefined;

  return {
    siteName: sitePayload?.siteName || defaultSiteConfig.siteName,
    branding: {
      ...defaultSiteConfig.branding,
      ...(sitePayload?.branding || {}),
    },
    pricing: {
      ...defaultPricing,
      ...(sitePayload?.pricing || {}),
      enabled: sitePayload?.pricing?.enabled === true,
    },
    upgradeDialog: resolveUpgradeDialogConfig(sitePayload?.upgradeDialog),
    features: {
      ...defaultSiteConfig.features,
      ...(incomingFeatures || {}),
      aiFeatures: incomingFeatures?.aiFeatures !== false,
      adsEnabled: incomingFeatures?.adsEnabled !== false,
      newFeatures: incomingFeatures?.newFeatures === true,
    },
  };
}

function getUpgradeErrorMessage(error: unknown) {
  const fallback = 'Pro upgrades are not available for this workspace right now.';

  if (error instanceof ApiRequestError) {
    if (error.status === 403) {
      return 'Pricing and upgrade access are currently hidden by the admin team.';
    }

    if (error.status >= 500 || error.status === 503) {
      return fallback;
    }
  }

  const message = getErrorMessage(error, fallback);

  if (/reading 'key'|razorpay|subscription|billing/i.test(message)) {
    return fallback;
  }

  return message;
}

function getSearchErrorMessage(error: unknown) {
  const fallback = 'Paper search failed. Please try again in a moment or adjust your filters.';

  if (error instanceof ApiRequestError && error.status >= 500) {
    return fallback;
  }

  const message = getErrorMessage(error, fallback);

  if (/reading 'key'|internal server error|typeerror/i.test(message)) {
    return fallback;
  }

  return message;
}

function loadRazorpayScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src*="checkout.razorpay.com"]');

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Unable to load Razorpay checkout.')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Razorpay checkout.'));
    document.body.appendChild(script);
  });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [edges, setEdges] = useState<CitationEdge[]>([]);
  const [collectionStorageScope, setCollectionStorageScope] = useState(() => getCollectionStorageScope(null));
  const [collections, setCollections] = useState<Collection[]>(() =>
    readStoredCollections(getCollectionStorageScope(null)),
  );
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(getInitialSidebarOpen);
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [otpPreviewCode, setOtpPreviewCode] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isSavingPaper, setIsSavingPaper] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [isUpgradePending, setIsUpgradePending] = useState(false);
  const [quota, setQuota] = useState<QuotaSnapshot | null>(null);
  const [planCapabilities, setPlanCapabilities] = useState<PlanCapabilities>(defaultCapabilities);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(defaultSiteConfig);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [upsellMessage, setUpsellMessage] = useState('');
  const [activeAccountSection, setActiveAccountSection] = useState<AccountSection | null>(() => {
    if (typeof window === 'undefined') return null;
    return getAccountSectionFromPath(window.location.pathname);
  });

  const addNotification = useCallback((title: string, message: string, type?: Notification['type']) => {
    setNotifications((current) => [createNotification(title, message, type), ...current].slice(0, 20));
  }, []);

  const applyUserData = useCallback((payload: UserDataResponse) => {
    const savedPapers = payload.savedPapers.map(toPaper);
    const savedPaperIds = savedPapers.map((paper) => paper.id);

    setUser(normalizeUser(payload.user, savedPaperIds));
    setQuota(payload.quota);
    setPlanCapabilities(payload.planCapabilities || defaultCapabilities);
    setPapers((current) => mergePapers(current, savedPapers));
  }, []);

  const refreshUserData = useCallback(async () => {
    if (!token) return;

    const payload = await apiRequest<UserDataResponse>('/get-user-data', { token });
    applyUserData(payload);
  }, [applyUserData, token]);

  const refreshSiteConfig = useCallback(async () => {
    const sitePayload = await apiRequest<{ success: boolean } & SiteConfig>(`/site-config?ts=${Date.now()}`, {
      cache: 'no-store',
    });
    setSiteConfig(resolveSiteConfig(sitePayload));
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        if (isMounted) {
          await refreshSiteConfig();
        }
      } catch (error) {
        console.warn('Unable to load public site config.', error);
      }

      const storedToken = readStoredToken();

      if (storedToken) {
        try {
          const payload = await apiRequest<UserDataResponse>('/get-user-data', { token: storedToken });

          if (isMounted) {
            setToken(storedToken);
            applyUserData(payload);
          }
        } catch (error) {
          clearStoredToken();
          if (isMounted) {
            setToken(null);
            setUser(null);
            setErrorMessage(getErrorMessage(error, 'Session expired. Please login again.'));
          }
        }
      }

      if (isMounted) {
        setIsInitialized(true);
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [applyUserData, refreshSiteConfig]);

  useEffect(() => {
    const nextScope = getCollectionStorageScope(user?.id || null);
    setCollectionStorageScope(nextScope);
    setCollections(readStoredCollections(nextScope));
  }, [user?.id]);

  useEffect(() => {
    const syncSiteConfig = async () => {
      try {
        await refreshSiteConfig();
      } catch {
        // Keep the last known public configuration when the sync request fails.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncSiteConfig();
      }
    };

    window.addEventListener('focus', syncSiteConfig);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const intervalId = window.setInterval(() => {
      void syncSiteConfig();
    }, 60_000);

    return () => {
      window.removeEventListener('focus', syncSiteConfig);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [refreshSiteConfig]);

  useEffect(() => {
    const storage = getLocalStorage();

    if (!storage) return;

    storage.setItem(getCollectionsStorageKey(collectionStorageScope), JSON.stringify(collections));
    storage.removeItem(COLLECTIONS_KEY);
  }, [collectionStorageScope, collections]);

  useEffect(() => {
    if (!showLoginModal) {
      setOtpPreviewCode('');
    }
  }, [showLoginModal]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(DESKTOP_LAYOUT_QUERY);
    const syncSidebarState = (matches: boolean) => {
      setSidebarOpen(matches);
    };

    syncSidebarState(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncSidebarState(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setActiveAccountSection(getAccountSectionFromPath(window.location.pathname));
    };

    handlePopState();
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const filteredPapers = useMemo(() => {
    return papers.filter((paper) => {
      if (paper.year && (paper.year < filters.yearRange[0] || paper.year > filters.yearRange[1])) {
        return false;
      }

      if (filters.authors.length > 0 && !paper.authors.some((author) => filters.authors.includes(author))) {
        return false;
      }

      if (filters.keywords.length > 0 && !paper.keywords.some((keyword) => filters.keywords.includes(keyword))) {
        return false;
      }

      if (filters.categories.length > 0 && !filters.categories.includes(paper.category)) {
        return false;
      }

      if (paper.citations < filters.minCitations) {
        return false;
      }

      return true;
    });
  }, [filters, papers]);

  const aiRecommendations = useMemo<AIRecommendation[]>(() => {
    return [...papers]
      .filter((paper) => !user?.savedPapers.includes(paper.id))
      .sort((left, right) => right.citations - left.citations)
      .slice(0, 4)
      .map((paper, index) => ({
        paper,
        relevanceScore: Math.max(70, 96 - index * 7),
        reason: `High-impact paper from your latest graph with ${paper.citations.toLocaleString()} citations.`,
      }));
  }, [papers, user]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((notification) => !notification.read).length;
  }, [notifications]);

  const savedPapersCount = useMemo(() => user?.savedPapers.length || 0, [user]);
  const effectivePlanCapabilities = useMemo(
    () => ({
      ...planCapabilities,
      adsEnabled: Boolean(planCapabilities.adsEnabled && siteConfig.features.adsEnabled),
      aiSummary: Boolean(planCapabilities.aiSummary && siteConfig.features.aiFeatures),
    }),
    [planCapabilities, siteConfig.features.adsEnabled, siteConfig.features.aiFeatures],
  );

  const toggleLoginModal = useCallback(() => {
    setShowLoginModal((current) => !current);
  }, []);

  const syncBrowserPath = useCallback((section: AccountSection | null) => {
    if (typeof window === 'undefined') return;

    const nextPath = section ? accountPathMap[section] : '/';

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  }, []);

  useEffect(() => {
    if (siteConfig.pricing.enabled === false && activeAccountSection === 'pricing') {
      setActiveAccountSection(null);
      syncBrowserPath(null);
    }
  }, [activeAccountSection, siteConfig.pricing.enabled, syncBrowserPath]);

  const openAccountPanel = useCallback((section: AccountSection) => {
    setActiveAccountSection(section);
    syncBrowserPath(section);
  }, [syncBrowserPath]);

  const closeAccountPanel = useCallback(() => {
    setActiveAccountSection(null);
    syncBrowserPath(null);
  }, [syncBrowserPath]);

  const navigateHome = useCallback(() => {
    setActiveAccountSection(null);
    syncBrowserPath(null);
  }, [syncBrowserPath]);

  const navigateToPricing = useCallback(() => {
    if (siteConfig.pricing.enabled === false) {
      setActiveAccountSection(null);
      syncBrowserPath(null);
      return;
    }

    setActiveAccountSection('pricing');
    syncBrowserPath('pricing');
  }, [siteConfig.pricing.enabled, syncBrowserPath]);

  const closeUpgradeDialog = useCallback(() => {
    setIsUpgradeDialogOpen(false);
  }, []);

  const sendOtp = useCallback(async (email: string) => {
    setIsSendingOtp(true);
    setErrorMessage('');
    setOtpPreviewCode('');

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const payload = await apiRequest<SendOtpResponse>('/send-otp', {
        method: 'POST',
        body: { email: normalizedEmail },
      });
      setOtpPreviewCode(payload.previewOtp || '');
      setStatusMessage(
        payload.previewOtp
          ? 'OTP generated in preview mode. Use the code shown in the login dialog.'
          : 'OTP sent. Please check your email inbox.',
      );
      addNotification('OTP sent', `A fresh login code was sent to ${normalizedEmail}.`);
      toast.success(payload.previewOtp ? 'Preview OTP generated.' : 'OTP sent to your email.');
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to send OTP.');
      setErrorMessage(message);
      toast.error(message);
      throw error;
    } finally {
      setIsSendingOtp(false);
    }
  }, [addNotification]);

  const verifyOtp = useCallback(async (email: string, otp: string) => {
    setIsVerifyingOtp(true);
    setErrorMessage('');

    try {
      const payload = await apiRequest<AuthResponse>('/verify-otp', {
        method: 'POST',
        body: {
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        },
      });

      persistToken(payload.token);
      setToken(payload.token);
      setUser(normalizeUser(payload.user));
      setQuota(payload.quota);
      setPlanCapabilities(payload.planCapabilities || defaultCapabilities);
      setOtpPreviewCode('');
      setShowLoginModal(false);
      setStatusMessage('Login successful.');
      toast.success('Login successful.');

      const userData = await apiRequest<UserDataResponse>('/get-user-data', { token: payload.token });
      applyUserData(userData);
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to verify OTP.');
      setErrorMessage(message);
      toast.error(message);
      throw error;
    } finally {
      setIsVerifyingOtp(false);
    }
  }, [applyUserData]);

  const login = useCallback(async (email: string) => {
    await sendOtp(email);
  }, [sendOtp]);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    setSelectedPaper(null);
    setQuota(null);
    setPlanCapabilities(defaultCapabilities);
    setActiveAccountSection(null);
    setShowLoginModal(false);
    setOtpPreviewCode('');
    syncBrowserPath(null);
    setStatusMessage('Logged out.');
    addNotification('Logged out', 'Your local session has been cleared.');
    toast.info('Logged out.');
  }, [addNotification, syncBrowserPath]);

  const searchPapers = useCallback(async (queryOverride?: string) => {
    const query = (queryOverride ?? searchQuery).trim();

    if (query.length < 2) {
      const message = 'Type at least 2 characters to search real papers.';
      setErrorMessage(message);
      toast.info(message);
      return;
    }

    setIsSearching(true);
    setErrorMessage('');
    setUpsellMessage('');
    setStatusMessage(`Searching papers for "${query}"...`);

    try {
      const payload = await apiRequest<SearchResponse>('/search-papers', {
        method: 'POST',
        token,
        body: {
          query,
          limit: 12,
          filters: {
            yearStart: filters.yearRange[0],
            yearEnd: filters.yearRange[1],
            author: filters.authors[0] || '',
            keywords: filters.keywords.join(','),
          },
        },
      });

      const primaryPapers = payload.papers.map(toPaper);
      const graphPapers = (payload.graph?.nodes || []).map(toPaper);
      const graphEdges = (payload.graph?.edges || []).map(toEdge);

      const nextPapers = mergePapers(primaryPapers, graphPapers);

      setPapers(nextPapers);
      setEdges(graphEdges);
      setSelectedPaper((current) => (current ? nextPapers.find((paper) => paper.id === current.id) || null : null));
      setQuota(payload.quota);
      setPlanCapabilities(payload.planCapabilities || defaultCapabilities);
      setUpsellMessage(payload.upsell || '');
      setStatusMessage(`Loaded ${primaryPapers.length} papers into your workspace.`);
      addNotification('Search complete', `Found ${primaryPapers.length} papers for "${query}".`, 'new_paper');
      toast.success(`Loaded ${primaryPapers.length} papers.`);
    } catch (error) {
      const message = getSearchErrorMessage(error);
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSearching(false);
    }
  }, [addNotification, filters, searchQuery, token]);

  const addToCollection = useCallback((paperId: string, collectionId: string) => {
    setCollections((current) =>
      current.map((collection) =>
        collection.id === collectionId && !collection.paperIds.includes(paperId)
          ? { ...collection, paperIds: [...collection.paperIds, paperId], updatedAt: new Date() }
          : collection,
      ),
    );
    addNotification('Collection updated', 'Paper added to your local collection.');
  }, [addNotification]);

  const removeFromCollection = useCallback((paperId: string, collectionId: string) => {
    setCollections((current) =>
      current.map((collection) =>
        collection.id === collectionId
          ? { ...collection, paperIds: collection.paperIds.filter((id) => id !== paperId), updatedAt: new Date() }
          : collection,
      ),
    );
  }, []);

  const createCollection = useCallback((name: string, description: string, color: string) => {
    const normalizedName = normalizeCollectionName(name);

    if (!normalizedName) {
      return;
    }

    const newCollection: Collection = {
      id: `collection-${Date.now()}`,
      name: normalizedName,
      description: normalizeCollectionDescription(description),
      paperIds: [],
      color: normalizeCollectionColor(color),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setCollections((current) => [...current, newCollection]);
    addNotification('Collection created', `${normalizedName} is ready for organizing papers.`);
  }, [addNotification]);

  const renameCollection = useCallback((collectionId: string, name: string, description: string, color: string) => {
    const normalizedName = normalizeCollectionName(name);

    if (!normalizedName) {
      return;
    }

    setCollections((current) =>
      current.map((collection) =>
        collection.id === collectionId
          ? {
              ...collection,
              name: normalizedName,
              description: normalizeCollectionDescription(description),
              color: normalizeCollectionColor(color),
              updatedAt: new Date(),
            }
          : collection,
      ),
    );
    addNotification('Collection updated', `${normalizedName} was updated.`);
  }, [addNotification]);

  const deleteCollection = useCallback((collectionId: string) => {
    setCollections((current) => current.filter((collection) => collection.id !== collectionId));
  }, []);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
      ),
    );
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  }, []);

  const savePaper = useCallback(async (paperId: string) => {
    if (!token || !user) {
      setShowLoginModal(true);
      toast.info('Login with OTP to save papers.');
      return;
    }

    const paper = papers.find((entry) => entry.id === paperId);

    if (!paper) return;

    setIsSavingPaper(true);

    try {
      const payload = await apiRequest<SavePaperResponse>('/save-paper', {
        method: 'POST',
        token,
        body: toApiPaperPayload(paper),
      });
      const savedPaper = toPaper(payload.savedPaper);

      setPapers((current) => mergePapers(current, [savedPaper]));
      setUser((current) =>
        current
          ? {
              ...current,
              savedPapers: Array.from(new Set([...current.savedPapers, savedPaper.id])),
            }
          : current,
      );
      addNotification('Paper saved', savedPaper.title, 'collection_update');
      toast.success('Paper saved to your account.');
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to save paper.');
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSavingPaper(false);
    }
  }, [addNotification, papers, token, user]);

  const unsavePaper = useCallback(async (paperId: string) => {
    if (!token || !user) {
      setShowLoginModal(true);
      return;
    }

    setIsSavingPaper(true);

    try {
      await apiRequest<{ success: boolean; message: string }>(`/save-paper/${encodeURIComponent(paperId)}`, {
        method: 'DELETE',
        token,
      });
      setUser((current) =>
        current ? { ...current, savedPapers: current.savedPapers.filter((id) => id !== paperId) } : current,
      );
      toast.success('Paper removed from saved list.');
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to remove paper.');
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSavingPaper(false);
    }
  }, [token, user]);

  const generateSummary = useCallback(async (paperId: string) => {
    if (!token || !user) {
      setShowLoginModal(true);
      toast.info('Login with OTP to use AI summaries.');
      return;
    }

    if (!effectivePlanCapabilities.aiSummary) {
      const message =
        siteConfig.features.aiFeatures === false
          ? 'AI summaries are currently disabled by the admin team.'
          : siteConfig.pricing.enabled !== false
          ? 'AI summaries are available on the Pro plan.'
          : 'AI summaries are not available for this workspace right now.';
      setUpsellMessage(message);
      toast.info(message);
      return;
    }

    const paper = papers.find((entry) => entry.id === paperId);

    if (!paper) return;

    setIsSummarizing(true);

    try {
      const payload = await apiRequest<SummaryResponse>('/ai/summarize-paper', {
        method: 'POST',
        token,
        body: {
          paperId: paper.id,
          title: paper.title,
          abstract: paper.abstract,
        },
      });

      const updatedPaper: Paper = {
        ...paper,
        summary: payload.summary,
        simplifiedAbstract: payload.simplifiedAbstract,
      };

      setPapers((current) => mergePapers(current, [updatedPaper]));
      setSelectedPaper((current) => (current?.id === paperId ? updatedPaper : current));
      addNotification('AI summary ready', paper.title, 'citation_alert');
      toast.success('AI summary generated.');
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to generate AI summary.');
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSummarizing(false);
    }
  }, [
    addNotification,
    effectivePlanCapabilities.aiSummary,
    papers,
    siteConfig.features.aiFeatures,
    siteConfig.pricing.enabled,
    token,
    user,
  ]);

  const upgradeToPro = useCallback(async () => {
    if (!token || !user) {
      setShowLoginModal(true);
      toast.info('Login first to upgrade.');
      return;
    }

    if (user.plan === 'PRO') {
      toast.info('Your workspace is already on the Pro plan.');
      return;
    }

    if (siteConfig.pricing.enabled === false) {
      const message = 'Pricing and upgrade access are currently hidden by the admin team.';
      setUpsellMessage('');
      setErrorMessage('');
      toast.info(message);
      return;
    }

    setErrorMessage('');
    setUpsellMessage('');
    setIsUpgradeDialogOpen(true);
  }, [siteConfig.pricing.enabled, token, user]);

  const confirmUpgradeToPro = useCallback(async () => {
    if (!token || !user) {
      setShowLoginModal(true);
      setIsUpgradeDialogOpen(false);
      toast.info('Login first to upgrade.');
      return;
    }

    if (user.plan === 'PRO') {
      setIsUpgradeDialogOpen(false);
      toast.info('Your workspace is already on the Pro plan.');
      return;
    }

    if (siteConfig.pricing.enabled === false) {
      const message = 'Pricing and upgrade access are currently hidden by the admin team.';
      setIsUpgradeDialogOpen(false);
      setUpsellMessage('');
      setErrorMessage('');
      toast.info(message);
      return;
    }

    try {
      setIsUpgradePending(true);
      setErrorMessage('');
      await loadRazorpayScript();
      const payload = await apiRequest<SubscriptionResponse>('/billing/create-subscription', {
        method: 'POST',
        token,
      });

      if (!payload.keyId || !payload.subscription?.id) {
        throw new Error('Pro upgrades are not available for this workspace right now.');
      }

      if (!window.Razorpay) {
        throw new Error('Razorpay checkout did not load.');
      }

      const checkout = new window.Razorpay({
        key: payload.keyId,
        subscription_id: payload.subscription.id,
        name: siteConfig.siteName,
        description: `${siteConfig.siteName} Pro subscription`,
        prefill: {
          email: user.email,
        },
        theme: {
          color: siteConfig.branding.primaryColor,
        },
        handler: async (response) => {
          try {
            const verified = await apiRequest<VerifySubscriptionResponse>('/billing/verify-subscription', {
              method: 'POST',
              token,
              body: response,
            });

            setUser((current) =>
              current
                ? {
                    ...current,
                    plan: verified.user.plan,
                    billing: verified.user.billing || null,
                  }
                : normalizeUser(verified.user),
            );
            setPlanCapabilities(verified.planCapabilities || {
              id: 'PRO',
              name: 'Pro',
              dailySearchLimit: null,
              maxSavedPapers: null,
              adsEnabled: false,
              advancedFilters: true,
              aiSummary: true,
              graphExport: true,
            });
            setQuota({ limit: null, used: 0, remaining: null, label: 'Unlimited' });
            setUpsellMessage('');
            setErrorMessage('');
            toast.success('Pro plan activated.');
          } catch (error) {
            const message = getUpgradeErrorMessage(error);
            setUpsellMessage(message);
            setErrorMessage('');
            toast.error(message);
          }
        },
        modal: {
          ondismiss: () => toast.info('Checkout closed.'),
        },
      });

      setIsUpgradeDialogOpen(false);
      setIsUpgradePending(false);
      checkout.open();
    } catch (error) {
      setIsUpgradePending(false);
      const message = getUpgradeErrorMessage(error);
      setUpsellMessage(message);
      setErrorMessage('');
      toast.error(message);
    }
  }, [siteConfig, token, user]);

  const value: AppState = {
    papers,
    edges,
    collections,
    aiRecommendations,
    notifications,
    user,
    selectedPaper,
    sidebarOpen,
    viewMode,
    filters,
    searchQuery,
    isAuthenticated: !!user && !!token,
    showLoginModal,
    otpPreviewCode,
    isInitialized,
    isSearching,
    isSendingOtp,
    isVerifyingOtp,
    isSavingPaper,
    isSummarizing,
    isUpgradeDialogOpen,
    isUpgradePending,
    quota,
    planCapabilities: effectivePlanCapabilities,
    siteConfig,
    statusMessage,
    errorMessage,
    upsellMessage,
    activeAccountSection,
    setSelectedPaper,
    setSidebarOpen,
    setViewMode,
    setFilters,
    setSearchQuery,
    toggleLoginModal,
    sendOtp,
    verifyOtp,
    login,
    logout,
    searchPapers,
    refreshUserData,
    addToCollection,
    removeFromCollection,
    createCollection,
    renameCollection,
    deleteCollection,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    savePaper,
    unsavePaper,
    generateSummary,
    upgradeToPro,
    confirmUpgradeToPro,
    closeUpgradeDialog,
    openAccountPanel,
    closeAccountPanel,
    navigateHome,
    navigateToPricing,
    filteredPapers,
    unreadNotificationsCount,
    savedPapersCount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  return context ?? fallbackAppState;
}
