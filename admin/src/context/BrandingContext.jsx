import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { adminClient } from '../api/http';
import defaultBrandIcon from '../assets/brand/litflow-app-icon.png';
import { useAdminAuth } from './AdminAuthContext';

const BrandingContext = createContext(null);
const ADMIN_BRANDING_CACHE_KEY = 'litflow-admin-branding-cache';

const DEFAULT_BRANDING = {
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
    tagline: 'Research graphs that move with you'
  }
};

function readBrandingCache() {
  const raw = localStorage.getItem(ADMIN_BRANDING_CACHE_KEY);

  if (!raw) {
    return DEFAULT_BRANDING;
  }

  try {
    const parsed = JSON.parse(raw);

    return {
      siteName: parsed.siteName || DEFAULT_BRANDING.siteName,
      branding: {
        ...DEFAULT_BRANDING.branding,
        ...(parsed.branding || {})
      }
    };
  } catch (_error) {
    localStorage.removeItem(ADMIN_BRANDING_CACHE_KEY);
    return DEFAULT_BRANDING;
  }
}

function persistBrandingCache(value) {
  localStorage.setItem(ADMIN_BRANDING_CACHE_KEY, JSON.stringify(value));
}

function buildFaviconSvg(branding) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="18" fill="#081120" />
  <rect x="9" y="9" width="46" height="46" rx="16" fill="#0f172a" />
  <path d="M9 23.5C9 15.492 15.492 9 23.5 9H55V40.5C55 48.508 48.508 55 40.5 55H9V23.5Z" fill="${branding.primaryColor}" />
  <path d="M55 40.5C55 48.508 48.508 55 40.5 55H9V23.5C9 15.492 15.492 9 23.5 9H55V40.5Z" fill="${branding.secondaryColor}" />
  <text x="21" y="44" font-family="Poppins, Arial, sans-serif" font-size="24" font-weight="700" fill="${branding.iconLightColor}">${branding.iconPrimary}</text>
  <text x="36" y="44" font-family="Poppins, Arial, sans-serif" font-size="24" font-weight="700" fill="${branding.iconAccentColor}">${branding.iconAccent}</text>
  <circle cx="46.5" cy="17.5" r="3.2" fill="${branding.orbitColor}" fill-opacity="0.92" />
</svg>`;
}

function resolveIconAsset(branding, surface = 'dark') {
  if (surface === 'light') {
    return (
      branding.iconLightImageUrl ||
      branding.iconImageUrl ||
      branding.logoLightImageUrl ||
      branding.logoImageUrl ||
      branding.iconDarkImageUrl ||
      branding.logoDarkImageUrl ||
      ''
    );
  }

  return (
    branding.iconDarkImageUrl ||
    branding.iconImageUrl ||
    branding.logoDarkImageUrl ||
    branding.logoImageUrl ||
    branding.iconLightImageUrl ||
    branding.logoLightImageUrl ||
    ''
  );
}

function getFaviconHref(branding) {
  const iconAsset = resolveIconAsset(branding, 'dark') || defaultBrandIcon;

  if (iconAsset) {
    return iconAsset;
  }

  const svg = buildFaviconSvg(branding);
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function buildBrandingFromSettings(settings = []) {
  const settingsMap = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));

  return {
    siteName: settingsMap.site_name?.text || DEFAULT_BRANDING.siteName,
    branding: {
      ...DEFAULT_BRANDING.branding,
      ...(settingsMap.branding || {})
    }
  };
}

export function BrandingProvider({ children }) {
  const { adminUser } = useAdminAuth();
  const cachedBranding = readBrandingCache();
  const [siteName, setSiteName] = useState(cachedBranding.siteName);
  const [branding, setBranding] = useState(cachedBranding.branding);

  const applyBranding = (nextValue) => {
    const resolved = {
      siteName: nextValue?.siteName || DEFAULT_BRANDING.siteName,
      branding: {
        ...DEFAULT_BRANDING.branding,
        ...(nextValue?.branding || {})
      }
    };

    setSiteName(resolved.siteName);
    setBranding(resolved.branding);
    persistBrandingCache(resolved);
  };

  useEffect(() => {
    let active = true;

    if (!adminUser) {
      return () => {
        active = false;
      };
    }

    adminClient
      .controls()
      .then(({ data }) => {
        if (!active) {
          return;
        }

        applyBranding(buildBrandingFromSettings(data.settings || []));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [adminUser]);

  useEffect(() => {
    document.title = `${siteName} Admin`;

    const favicon = document.querySelector('link[rel="icon"]');

    if (favicon) {
      favicon.setAttribute('href', getFaviconHref(branding));
    }
  }, [siteName, branding]);

  const value = useMemo(
    () => ({
      siteName,
      branding,
      applyBranding
    }),
    [siteName, branding]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const context = useContext(BrandingContext);

  if (!context) {
    throw new Error('useBranding must be used within BrandingProvider.');
  }

  return context;
}
