import { cn } from '@/lib/utils';
import type { BrandingConfig } from '@/types';

type BrandWordmarkProps = {
  siteName: string;
  branding: BrandingConfig;
  tone?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClasses = {
  sm: {
    word: 'text-[1.8rem] sm:text-[1.95rem]',
  },
  md: {
    word: 'text-[2.3rem] sm:text-[2.55rem]',
  },
  lg: {
    word: 'text-[2.95rem] sm:text-[3.35rem]',
  },
} as const;

function getWordmarkParts(siteName: string, branding: BrandingConfig) {
  const primaryText = branding.primaryText.trim();
  const accentText = branding.accentText.trim();

  if (primaryText || accentText) {
    return {
      primaryText: primaryText || siteName.slice(0, Math.max(1, Math.floor(siteName.length / 2))),
      accentText: accentText || siteName.slice(primaryText.length) || siteName,
    };
  }

  return {
    primaryText: siteName.slice(0, Math.max(1, Math.floor(siteName.length / 2))),
    accentText: siteName.slice(Math.max(1, Math.floor(siteName.length / 2))),
  };
}

export function BrandWordmark({
  siteName,
  branding,
  tone = 'dark',
  size = 'md',
  className,
}: BrandWordmarkProps) {
  const { primaryText, accentText } = getWordmarkParts(siteName, branding);
  const accentColor = tone === 'light' ? '#f8fafc' : '#1e3a8a';
  const primaryColor = tone === 'light' ? '#60a5fa' : '#2563eb';

  return (
    <div className={cn('min-w-0', className)}>
      <div className={cn('font-display whitespace-nowrap leading-none tracking-[-0.07em] font-extrabold', sizeClasses[size].word)}>
        <span style={{ color: primaryColor }}>{primaryText}</span>
        <span style={{ color: accentColor }}>{accentText}</span>
      </div>
    </div>
  );
}
