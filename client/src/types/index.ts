export type Author = {
  authorId?: string;
  name: string;
};

export type Paper = {
  id: string;
  paperId?: string;
  title: string;
  authors: string[];
  authorObjects?: Author[];
  year: number;
  citations: number;
  abstract: string;
  keywords: string[];
  doi: string;
  category: string;
  journal?: string;
  venue?: string;
  url?: string;
  pdfUrl?: string;
  summary?: string;
  simplifiedAbstract?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
};

export type CitationEdge = {
  id?: string;
  source: string;
  target: string;
  type: 'cites' | 'related';
};

export type Collection = {
  id: string;
  name: string;
  description: string;
  paperIds: string[];
  color: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AIRecommendation = {
  paper: Paper;
  relevanceScore: number;
  reason: string;
};

export type Notification = {
  id: string;
  type: 'new_paper' | 'citation_alert' | 'collection_update';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: unknown;
};

export type PlanId = 'FREE' | 'PRO';

export type PlanCapabilities = {
  id: PlanId;
  name: string;
  dailySearchLimit: number | null;
  maxSavedPapers: number | null;
  adsEnabled: boolean;
  advancedFilters: boolean;
  aiSummary: boolean;
  graphExport: boolean;
};

export type QuotaSnapshot = {
  limit: number | null;
  used: number;
  remaining: number | null;
  label: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  plan: PlanId;
  billing?: Record<string, unknown> | null;
  avatar?: string;
  institution?: string;
  savedPapers: string[];
  collections: string[];
};

export type FilterState = {
  yearRange: [number, number];
  authors: string[];
  keywords: string[];
  categories: string[];
  minCitations: number;
};

export type ViewMode = 'graph' | 'list' | 'timeline';

export type BrandingConfig = {
  primaryText: string;
  accentText: string;
  iconPrimary: string;
  iconAccent: string;
  logoMode: 'generated' | 'image';
  logoImageUrl: string;
  logoDarkImageUrl: string;
  logoLightImageUrl: string;
  iconImageUrl: string;
  iconDarkImageUrl: string;
  iconLightImageUrl: string;
  primaryColor: string;
  secondaryColor: string;
  iconLightColor: string;
  iconAccentColor: string;
  orbitColor: string;
  tagline: string;
};

export type PricingConfig = {
  enabled: boolean;
  currency: string;
  free: number;
  pro: number;
  billingCycle?: string;
};

export type UpgradeDialogBadge = {
  label: string;
  icon?: string;
};

export type UpgradeDialogRow = {
  label: string;
  value: string;
  emphasized?: boolean;
};

export type UpgradeDialogConfig = {
  badgeText: string;
  title: string;
  description: string;
  planTitle: string;
  planDescription: string;
  dueTodayLabel: string;
  cancelButtonLabel: string;
  payButtonLabel: string;
  taxRate: number;
  highlightBadges: UpgradeDialogBadge[];
  summaryRows: UpgradeDialogRow[];
  infoRows: UpgradeDialogRow[];
};

export type RuntimeFeatures = {
  aiFeatures: boolean;
  adsEnabled: boolean;
  newFeatures: boolean;
};

export type SiteConfig = {
  siteName: string;
  branding: BrandingConfig;
  pricing: PricingConfig;
  upgradeDialog: UpgradeDialogConfig;
  features: RuntimeFeatures;
};

export type ApiPaper = {
  id?: string | number;
  paperId: string;
  title: string;
  authors?: Author[];
  year?: number | null;
  abstract?: string;
  venue?: string;
  url?: string;
  pdfUrl?: string;
  citationCount?: number;
  referenceCount?: number;
  influentialCitationCount?: number;
  fieldsOfStudy?: string[];
  externalIds?: Record<string, string>;
  summary?: string;
  simplifiedAbstract?: string;
};

export type ApiGraphNode = {
  id: string;
  kind?: string;
  title: string;
  year?: number | null;
  authors?: Author[];
  abstract?: string;
  url?: string;
  pdfUrl?: string;
  citationCount?: number;
};

export type ApiGraphEdge = {
  id?: string;
  source: string;
  target: string;
  relation?: 'references' | 'cites' | string;
};
