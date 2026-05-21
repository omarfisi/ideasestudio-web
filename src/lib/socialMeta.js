/**
 * Social media meta tag helpers — shared across SEOHead and other components.
 *
 * Image priority for an article (highest to lowest):
 *  1. seo_image_url
 *  2. og_image_url
 *  3. social_image_url
 *  4. cover_url
 *  5. featured_image_url
 *  6. hero_image_url
 *  7. image_url
 *  8. siteDefaultOgImage (never favicon for articles)
 */

const SITE_URL = 'https://www.ideasestudio.com';

/**
 * Convert a possibly-relative URL to an absolute HTTPS URL.
 * Returns null for empty/falsy values.
 */
export function absoluteUrl(value) {
  if (!value) return null;
  if (value.startsWith('https://') || value.startsWith('http://')) return value;
  return `${SITE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
}

/**
 * Returns the best social/OG image URL for an article post object.
 * Tries fields in priority order and converts to absolute URL.
 * Falls back to `fallback` when no field is set.
 *
 * @param {object} post  - Article/post object from the CRM API
 * @param {string} [fallback] - URL to use when no field resolves
 * @returns {string|null}
 */
export function getArticleSocialImage(post, fallback = null) {
  const candidates = [
    post?.seo_image_url,
    post?.og_image_url,
    post?.social_image_url,
    post?.cover_url,
    post?.featured_image_url,
    post?.hero_image_url,
    post?.image_url,
  ];

  for (const c of candidates) {
    const abs = absoluteUrl(c);
    if (abs) return abs;
  }

  return fallback;
}

/**
 * Derives a stable version token from the article's update/publish timestamp or ID.
 *
 * This token is appended as `?v=<token>` to the OG/Twitter image URL so that
 * WhatsApp (and other aggressively-caching scrapers) see a "new" image URL when
 * the article is updated — without invalidating CDN caching of the image itself.
 *
 * Stability guarantee: same article + same updated_at → same token every time.
 * Returns null when no suitable field is found (cache-busting is then skipped).
 *
 * @param {object} post - Article/post object from the CRM API
 * @returns {string|null}
 */
export function getSocialImageVersion(post) {
  const raw =
    post?.updated_at  ||
    post?.published_at ||
    post?.publish_at  ||
    post?.created_at  ||
    post?.id;
  if (!raw) return null;
  return String(raw).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
}

/**
 * Appends a stable `?v=<version>` querystring parameter to an image URL.
 * Returns the original URL unchanged when version is null/empty.
 *
 * @param {string} url
 * @param {string|null} version - token from getSocialImageVersion()
 * @returns {string}
 */
export function addImageCacheBust(url, version) {
  if (!url || !version) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('v', version);
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Builds a proxy URL for the social image served through the site's own domain.
 *
 * Why: Supabase Storage responds with `x-robots-tag: none` on every object,
 * which causes WhatsApp's scraper (and possibly others) to reject the image.
 * Routing the image through /api/og-image strips that header and re-serves
 * the bytes under https://www.ideasestudio.com with bot-friendly headers.
 *
 * The `v` parameter changes when the article is updated (derived from updated_at)
 * so caching scrapers see a "new" URL and re-fetch the image automatically.
 *
 * @param {string|null} rawImageUrl - original image URL (Supabase or otherwise)
 * @param {string|null} version     - cache-bust token from getSocialImageVersion()
 * @returns {string} proxied URL or rawImageUrl unchanged if no URL provided
 */
/**
 * Proxy version — increment whenever the proxy behaviour changes in a way that
 * requires Vercel's edge cache to discard previously-cached responses.
 *
 * History:
 *   1 — initial proxy (bug: HEAD forwarded to Supabase → content-length: 0)
 *   2 — fixed HEAD: proxy always does GET upstream; HEAD returns headers only
 */
const OG_PROXY_VERSION = '2';

export function buildProxyImageUrl(rawImageUrl, version) {
  if (!rawImageUrl) return rawImageUrl;
  try {
    const params = new URLSearchParams();
    params.set('src', rawImageUrl);
    if (version) params.set('v', version);
    params.set('pv', OG_PROXY_VERSION);
    return `${SITE_URL}/api/og-image?${params.toString()}`;
  } catch {
    return rawImageUrl;
  }
}
