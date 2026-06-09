import { BrandWordmark } from '@/components/branding/BrandWordmark';
import { useApp } from '@/context/AppContext';

type FooterLink = {
  label: string;
  href?: string;
  onClick?: () => void;
};

type FooterAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
};

type WebsiteFooterProps = {
  summary: string;
  links: FooterLink[];
  actions: FooterAction[];
  badges?: string[];
  metaLeft?: string;
  metaRight?: string;
};

function FooterTextLink({ label, href, onClick }: FooterLink) {
  if (href) {
    return (
      <a href={href} className="block transition hover:text-white">
        {label}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className="block text-left transition hover:text-white">
      {label}
    </button>
  );
}

function FooterActionButton({ label, href, onClick, primary = false }: FooterAction) {
  const className = primary
    ? 'inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100'
    : 'inline-flex h-11 items-center justify-center rounded-full border border-white/14 bg-white/[0.06] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.12]';

  if (href) {
    return (
      <a href={href} className={className}>
        {label}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {label}
    </button>
  );
}

export function WebsiteFooter({
  summary,
  links,
  actions,
  badges = [],
  metaLeft,
  metaRight,
}: WebsiteFooterProps) {
  const { siteConfig } = useApp();
  const pageShellClass = 'mx-auto w-full max-w-[1320px] px-6 sm:px-8 lg:px-12 xl:px-16';

  return (
    <footer className="relative z-10 border-t border-slate-800 bg-[#202733] text-white">
      <div className={`${pageShellClass} py-10 sm:py-12`}>
        <div className="grid gap-10 px-1 lg:grid-cols-[minmax(0,1.2fr)_0.8fr_0.9fr] lg:gap-12">
          <div className="max-w-xl">
            <BrandWordmark
              siteName={siteConfig.siteName}
              branding={siteConfig.branding}
              size="sm"
              tone="light"
            />
            <p className="mt-4 text-sm leading-7 text-white/72">{summary}</p>
            {badges.length ? (
              <div className="mt-5 flex flex-wrap gap-2.5">
                {badges.map((badge) => (
                  <span key={badge} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/78">
                    {badge}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Explore</p>
            <div className="mt-4 space-y-3 text-sm text-white/66">
              {links.map((link) => (
                <FooterTextLink key={link.label} {...link} />
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Access</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {actions.map((action) => (
                <FooterActionButton key={action.label} {...action} />
              ))}
            </div>
          </div>
        </div>

        {metaLeft || metaRight ? (
          <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-5 text-sm text-white/54 sm:flex-row sm:items-center sm:justify-between">
            <p>{metaLeft}</p>
            <p>{metaRight}</p>
          </div>
        ) : null}
      </div>
    </footer>
  );
}
