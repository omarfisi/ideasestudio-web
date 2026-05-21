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
