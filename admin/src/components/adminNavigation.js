import {
  BadgeIndianRupee,
  BarChart3,
  Blocks,
  CreditCard,
  FileStack,
  LayoutDashboard,
  Palette,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Users
} from 'lucide-react';

export const adminNavigationSections = [
  {
    to: '/',
    label: 'Dashboard',
    description: 'Health, revenue, and admin quick actions',
    icon: LayoutDashboard
  },
  {
    to: '/users',
    label: 'Users',
    description: 'Account access, plans, and support controls',
    icon: Users
  },
  {
    to: '/payments',
    label: 'Payments',
    description: 'Revenue status, billing health, and payment workspaces',
    icon: CreditCard,
    children: [
      {
        to: '/payments/history',
        label: 'Transaction history',
        description: 'Review payment states, sources, and subscription activity',
        icon: CreditCard
      },
      {
        to: '/payments/manual',
        label: 'Manual billing',
        description: 'Create offline, support, and custom payment entries',
        icon: BadgeIndianRupee
      }
    ]
  },
  {
    to: '/analytics',
    label: 'Analytics',
    description: 'Search demand, paper engagement, and AI usage',
    icon: BarChart3,
    children: [
      {
        to: '/analytics/search',
        label: 'Search insights',
        description: 'Keywords, discovery patterns, and paper demand',
        icon: ReceiptText
      },
      {
        to: '/analytics/ai',
        label: 'AI usage',
        description: 'AI requests, cost breakdown, and plan usage',
        icon: Sparkles
      }
    ]
  },
  {
    to: '/content',
    label: 'Content',
    description: 'Editorial workspace, curated papers, and saved research moderation',
    icon: FileStack,
    children: [
      {
        to: '/content/curated',
        label: 'Curated papers',
        description: 'Editorial updates and homepage content changes',
        icon: FileStack
      },
      {
        to: '/content/saved',
        label: 'Saved papers',
        description: 'Inspect, promote, and clean user-saved research',
        icon: FileStack
      }
    ]
  },
  {
    to: '/controls',
    label: 'Feature controls',
    description: 'Runtime switches, AI access, and operational rollouts',
    icon: Blocks
  },
  {
    to: '/settings',
    label: 'Settings',
    description: 'Branding, pricing, checkout, design, and site configuration',
    icon: Settings,
    children: [
      {
        to: '/settings/branding',
        label: 'Branding',
        description: 'Logos, colors, and visual identity controls',
        icon: Palette
      },
      {
        to: '/settings/pricing',
        label: 'Pricing',
        description: 'Plan visibility, currency, and pricing setup',
        icon: CreditCard
      },
      {
        to: '/settings/checkout',
        label: 'Checkout dialog',
        description: 'Upgrade modal copy and payment experience',
        icon: Sparkles
      },
      {
        to: '/settings/custom',
        label: 'Custom settings',
        description: 'Reusable advanced settings and product config',
        icon: SlidersHorizontal
      },
      {
        to: '/settings/system',
        label: 'System JSON',
        description: 'Raw stored runtime payloads and config objects',
        icon: Settings
      }
    ]
  },
  {
    to: '/logs',
    label: 'Logs',
    description: 'Security summaries, audit history, and OTP monitoring',
    icon: ScrollText,
    children: [
      {
        to: '/logs/audit',
        label: 'Audit logs',
        description: 'Admin actions, login activity, and settings change history',
        icon: ScrollText
      },
      {
        to: '/logs/otp',
        label: 'OTP logs',
        description: 'Successful and failed OTP verification monitoring',
        icon: ShieldAlert
      }
    ]
  }
];

export function matchesAdminPath(currentPathname, targetPath) {
  if (targetPath === '/') {
    return currentPathname === '/';
  }

  return currentPathname === targetPath || currentPathname.startsWith(`${targetPath}/`);
}

export const adminNavigationItems = adminNavigationSections.flatMap((item) => [
  {
    to: item.to,
    label: item.label,
    description: item.description,
    icon: item.icon,
    group: item.label
  },
  ...((item.children || []).map((child) => ({
    to: child.to,
    label: child.label,
    description: child.description,
    icon: child.icon || item.icon,
    group: item.label
  })))
]);
