import {
  BadgeCheck,
  CreditCard,
  Crown,
  Loader2,
  Lock,
  Receipt,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useApp } from '@/context/AppContext';

const GST_RATE = 0.18;

function formatAmount(currency: string, amount: number) {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function getBillingLabel(cycle: string) {
  if (cycle === 'month') {
    return 'Billed monthly, starting today';
  }

  if (cycle === 'year') {
    return 'Billed yearly, starting today';
  }

  return `Billed every ${cycle}, starting today`;
}

function replaceTemplateTokens(
  value: string,
  tokens: Record<string, string>,
) {
  return value.replace(/\{(\w+)\}/g, (_, tokenKey: string) => tokens[tokenKey] ?? '');
}

function getHighlightIcon(iconKey?: string) {
  const normalizedKey = String(iconKey || '').trim().toLowerCase();

  switch (normalizedKey) {
    case 'shield':
      return ShieldCheck;
    case 'crown':
      return Crown;
    case 'credit-card':
    case 'creditcard':
      return CreditCard;
    case 'receipt':
      return Receipt;
    case 'lock':
      return Lock;
    case 'check':
    case 'badge-check':
      return BadgeCheck;
    case 'sparkles':
    default:
      return Sparkles;
  }
}

export function UpgradePlanDialog() {
  const {
    user,
    siteConfig,
    isUpgradeDialogOpen,
    isUpgradePending,
    closeUpgradeDialog,
    confirmUpgradeToPro,
  } = useApp();

  const dialogConfig = siteConfig.upgradeDialog;
  const taxRate = Number.isFinite(dialogConfig.taxRate) ? dialogConfig.taxRate : GST_RATE * 100;
  const totalAmount = Number(siteConfig.pricing.pro || 0);
  const subtotalAmount = Number((totalAmount / (1 + taxRate / 100)).toFixed(2));
  const taxAmount = Number((totalAmount - subtotalAmount).toFixed(2));
  const currency = siteConfig.pricing.currency || 'INR';
  const billingCycle = siteConfig.pricing.billingCycle || 'month';
  const billingCycleLabel = getBillingLabel(billingCycle);
  const brandGradient = `linear-gradient(135deg, ${siteConfig.branding.primaryColor}, ${siteConfig.branding.secondaryColor})`;
  const templateTokens = {
    siteName: siteConfig.siteName,
    billingCycle,
    billingCycleLabel,
    dueTodayLabel: dialogConfig.dueTodayLabel,
    taxRate: `${taxRate}`,
    subtotal: formatAmount(currency, subtotalAmount),
    tax: formatAmount(currency, taxAmount),
    total: formatAmount(currency, totalAmount),
    proPrice: formatAmount(currency, totalAmount),
    userEmail: user?.email || 'Signed-in account',
    paymentMethod: 'Secure Razorpay checkout',
    currency,
  };

  return (
    <Dialog
      open={isUpgradeDialogOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isUpgradePending) {
          closeUpgradeDialog();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden border-white/10 bg-[#1a1a1a] p-0 text-white shadow-[0_32px_120px_rgba(0,0,0,0.45)] sm:max-w-[640px]"
      >
        <div className="h-1 w-full" style={{ backgroundImage: brandGradient }} />

        <div className="relative px-6 py-5 sm:px-7 sm:py-6">
          <DialogClose
            className="absolute right-5 top-5 rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-50"
            disabled={isUpgradePending}
          >
            <span className="sr-only">Close</span>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </DialogClose>

          <DialogHeader className="space-y-3 pr-12 text-left">
            <Badge className="w-fit border-0 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/75">
              {dialogConfig.badgeText}
            </Badge>
            <div>
              <DialogTitle className="text-[2rem] font-semibold tracking-tight text-white">
                {dialogConfig.title}
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-xl text-sm leading-6 text-white/60">
                {dialogConfig.description}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-[0_16px_30px_rgba(0,0,0,0.25)]"
                  style={{ backgroundImage: brandGradient }}
                >
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-white">
                    {replaceTemplateTokens(dialogConfig.planTitle, templateTokens)}
                  </p>
                  <p className="mt-1 text-sm text-white/60">
                    {replaceTemplateTokens(dialogConfig.planDescription, templateTokens)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dialogConfig.highlightBadges.map((item, index) => {
                      const Icon = getHighlightIcon(item.icon);

                      return (
                        <Badge key={`${item.label}-${index}`} className="border-0 bg-white/8 text-white/80">
                          <Icon className="h-3.5 w-3.5" />
                          {replaceTemplateTokens(item.label, templateTokens)}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-2xl font-semibold text-white">{formatAmount(currency, totalAmount)}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/45">
                  {replaceTemplateTokens(dialogConfig.dueTodayLabel, templateTokens)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="space-y-3 rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
              {dialogConfig.summaryRows.map((row, index) => {
                const rowClassName = row.emphasized
                  ? 'flex items-center justify-between gap-4 text-base font-semibold text-white'
                  : 'flex items-center justify-between gap-4 text-sm text-white/78';

                return (
                  <div key={`${row.label}-${index}`}>
                    {row.emphasized && index > 0 ? <div className="mb-3 h-px bg-white/10" /> : null}
                    <div className={rowClassName}>
                      <span>{replaceTemplateTokens(row.label, templateTokens)}</span>
                      <span>{replaceTemplateTokens(row.value, templateTokens)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-3 rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-sm sm:grid-cols-2">
              {dialogConfig.infoRows.map((row, index) => (
                <div key={`${row.label}-${index}`} className={index % 2 === 1 ? 'text-left sm:text-right' : ''}>
                  <p className="text-white/60">{replaceTemplateTokens(row.label, templateTokens)}</p>
                  <p className="mt-1 font-medium text-white">{replaceTemplateTokens(row.value, templateTokens)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={isUpgradePending}
              onClick={closeUpgradeDialog}
              className="h-11 rounded-full border border-white/10 bg-white/5 px-5 text-white hover:bg-white/10"
            >
              {dialogConfig.cancelButtonLabel}
            </Button>
            <Button
              type="button"
              disabled={isUpgradePending}
              onClick={() => void confirmUpgradeToPro()}
              className="h-11 rounded-full px-6 text-slate-950 shadow-lg"
              style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f2f6ff 100%)' }}
            >
              {isUpgradePending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isUpgradePending ? 'Preparing checkout...' : dialogConfig.payButtonLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
