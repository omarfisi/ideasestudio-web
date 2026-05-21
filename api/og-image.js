/**
 * Vercel Serverless Function — Social image proxy (WebP optimized)
 *
 * Proxies article cover images through the site's own domain and transforms them
 * to WebP 1200×630 for social previews.
 *
 * Problems solved:
 *   1. Supabase Storage returns `x-robots-tag: none` — WhatsApp rejects the image.
 *   2. Raw PNG from CMS can be 2+ MB and RGBA — too heavy for social preview.
 *   3. HEAD requests were returning content-length: 0 (pv=2 fixed this).
 *
 * Output:
 *   content-type:  image/webp
 *   dimensions:    1200 × 630 (cover-fit, centred)
 *   quality:       82
 *   background:    #ffffff (flattens alpha channel)
 *   cache-control: public, max-age=31536000, immutable
 *   x-robots-tag:  all
 *
 * Usage:
 *   /api/og-image?src=<encoded-url>&v=<article-version>&pv=3
 *
 * Parameters:
 *   src  (required) — HTTPS URL of the original image (URL-encoded).
 *   v    (optional) — article cache-bust token (updated_at / id).
 *   pv   (optional) — proxy version; increment in OG_PROXY_VERSION constants
 *                     when proxy output or behaviour changes.
 *
 * HEAD vs GET:
 *   Always fetches upstream with GET to read the real buffer size.
 *   HEAD → returns headers (correct Content-Length) + res.end().
 *   GET  → returns headers + WebP buffer.
 *
 * Security:
 *   Only proxies from ALLOWED_DOMAINS.
 *   Only processes upstream image/* content-types.
 *   Never forwards x-robots-tag, set-cookie, authorization, etc.
 */

import sharp from 'sharp';

// ─── Config ───────────────────────────────────────────────────────────────────

const ALLOWED_DOMAINS = new Set([
  'aijczfwbnmumcvygqxkv.supabase.co', // Supabase Storage (Ideas Estudio project)
  'www.ideasestudio.com',
  'ideasestudio.com',
  'images.unsplash.com',
]);

const OG_WIDTH   = 1200;
const OG_HEIGHT  = 630;
const WEBP_QUALITY = 82;
const FETCH_TIMEOUT_MS = 12000;

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
    return res.status(204).end();
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).end('Method Not Allowed');
  }

  // ── Validate src ────────────────────────────────────────────────────────────
  const rawSrc = req.query.src;
  if (!rawSrc) {
    return res.status(400).end('Missing src parameter');
  }

  let imageUrl;
  try {
    imageUrl = new URL(String(rawSrc));
  } catch {
    return res.status(400).end('Invalid src URL');
  }

  if (imageUrl.protocol !== 'https:') {
    return res.status(400).end('Only HTTPS sources allowed');
  }

  if (!ALLOWED_DOMAINS.has(imageUrl.hostname)) {
    return res.status(403).end('Domain not in allowlist');
  }

  // ── Fetch original image — always GET for correct Content-Length ────────────
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let originalBuffer;
  let originalContentType;

  try {
    const upstream = await fetch(imageUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'image/*,*/*;q=0.8',
        'User-Agent':
          'Mozilla/5.0 (compatible; IdeasEstudio-OGProxy/1.0; +https://www.ideasestudio.com)',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timerId);

    if (!upstream.ok) {
      return res.status(502).json({ error: `Upstream returned ${upstream.status}` });
    }

    originalContentType = upstream.headers.get('content-type') || '';
    if (!originalContentType.startsWith('image/')) {
      return res.status(502).end('Upstream response is not an image');
    }

    originalBuffer = Buffer.from(await upstream.arrayBuffer());
  } catch (err) {
    clearTimeout(timerId);
    if (err.name === 'AbortError') {
      return res.status(504).end('Image fetch timed out');
    }
    console.error('[og-image] fetch error:', err);
    return res.status(502).end('Failed to fetch image');
  }

  // ── Transform to WebP 1200×630 ──────────────────────────────────────────────
  let outputBuffer;
  let transformStatus = 'webp-1200x630';

  try {
    outputBuffer = await sharp(originalBuffer)
      .rotate()                                   // respect EXIF orientation
      .resize(OG_WIDTH, OG_HEIGHT, {
        fit: 'cover',
        position: 'center',
      })
      .flatten({ background: '#ffffff' })          // collapse alpha → white bg
      .webp({
        quality: WEBP_QUALITY,
        effort: 4,                                 // 0=fast 6=best; 4 is fast enough for serverless
      })
      .toBuffer();
  } catch (sharpErr) {
    // If sharp fails (corrupt input, unsupported format, etc.) fall back to
    // serving the original bytes so we never return an empty 500.
    console.error('[og-image] sharp transform error:', sharpErr);
    outputBuffer     = originalBuffer;
    transformStatus  = 'fallback-original';
    // Content-Type stays as original (image/png, etc.) in fallback
  }

  const isWebP         = transformStatus === 'webp-1200x630';
  const outputMime     = isWebP ? 'image/webp' : (originalContentType || 'image/png');

  // ── Send response ───────────────────────────────────────────────────────────
  res.setHeader('Content-Type', outputMime);
  res.setHeader('Content-Length', outputBuffer.length);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'all');
  // Non-sensitive debug headers
  res.setHeader('X-OG-Image-Transform', transformStatus);
  res.setHeader('X-OG-Image-Proxy-Version', '3');

  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  return res.status(200).send(outputBuffer);
}
