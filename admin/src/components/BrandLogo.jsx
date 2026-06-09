import { useBranding } from '../context/BrandingContext';

const FALLBACK_BRANDING = {
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
  tagline: 'Research graphs that move with you'
};

function getWordmarkParts(siteName, branding) {
  const primaryText = String(branding?.primaryText || '').trim();
  const accentText = String(branding?.accentText || '').trim();

  if (primaryText || accentText) {
    const fallbackPrimary = siteName.slice(0, Math.max(1, Math.floor(siteName.length / 2)));

    return {
      primaryText: primaryText || fallbackPrimary,
      accentText: accentText || siteName.slice((primaryText || fallbackPrimary).length) || siteName
    };
  }

  return {
    primaryText: siteName.slice(0, Math.max(1, Math.floor(siteName.length / 2))),
    accentText: siteName.slice(Math.max(1, Math.floor(siteName.length / 2)))
  };
}

export default function BrandLogo({
  large = false,
  animated = false,
  suffix = '',
  config,
  surface = 'dark'
}) {
  const context = useBranding();
  const siteName = config?.siteName || context?.siteName || 'LitFlow';
  const branding = {
    ...FALLBACK_BRANDING,
    ...(context?.branding || {}),
    ...(config || {})
  };
  const { primaryText, accentText } = getWordmarkParts(siteName, branding);

  const style = {
    '--brand-word-primary': surface === 'light' ? '#2563eb' : '#60a5fa',
    '--brand-word-secondary': surface === 'light' ? '#1e3a8a' : '#f8fafc',
    '--brand-suffix': surface === 'light' ? '#475569' : '#cbd5e1'
  };

  return (
    <div
      className={`brand-logo ${large ? 'large' : ''} ${animated ? 'is-animated' : ''} ${surface === 'light' ? 'on-light' : ''}`.trim()}
      style={style}
    >
      <div className="brand-copy">
        <p className="brand-title">
          <span className="brand-title-primary">{primaryText}</span>
          <span className="brand-title-accent">{accentText}</span>
          {suffix ? <span className="brand-title-suffix">{suffix}</span> : null}
        </p>
      </div>
    </div>
  );
}
