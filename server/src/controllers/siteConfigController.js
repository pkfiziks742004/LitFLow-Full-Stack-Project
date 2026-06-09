import { getFallbackPublicSiteConfig, getPublicSiteConfig } from '../services/siteConfigService.js';

function applyNoCacheHeaders(res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
}

export async function getSiteConfig(_req, res) {
  try {
    const config = await getPublicSiteConfig();
    applyNoCacheHeaders(res);

    res.json({
      success: true,
      ...config
    });
  } catch (error) {
    console.error('Failed to load public site config, serving defaults instead.', error);
    applyNoCacheHeaders(res);
    const fallbackConfig = await getFallbackPublicSiteConfig();

    res.json({
      success: true,
      degraded: true,
      ...fallbackConfig
    });
  }
}
