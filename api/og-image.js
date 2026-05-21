/**
 * Vercel Serverless Function — Social image proxy
 *
 * Proxies article cover images from Supabase Storage (and other allowed origins)
 * through the site's own domain so that social scrapers receive the image with
 * clean, bot-friendly headers.
 *
 * The key problem this solves: Supabase Storage returns
 *   x-robots-tag: none
 * on all objects, which causes WhatsApp's scraper to reject the image.
 * This proxy re-serves the same bytes under https://www.ideasestudio.com/api/og-image
 * with no x-robots-tag and an explicit public Cache-Control.
 *
 * Usage:
 *   /api/og-image?src=<encoded-image-url>&v=<version>&pv=<proxy-version>
 *
 * Parameters:
 *   src  (required) — HTTPS URL of the original image (URL-encoded).
 *   v    (optional) — stable article cache-bust token (updated_at / id).
 *   pv   (optional) — proxy version; increment to bust the Vercel edge cache
 *                     when proxy behaviour changes (e.g. this fix for HEAD).
 *
 * HEAD vs GET:
 *   The function ALWAYS fetches the upstream image with GET so it has the real
 *   Content-Length. For HEAD requests it sends back only the headers (no body).
 *   This fixes the Vercel edge caching of content-length: 0 caused by the
 *   previous behaviour of forwarding HEAD to Supabase and reading an empty body.
 *
 * Security:
 *   Only proxies images from the ALLOWED_DOMAINS allowlist.
 *   Only forwards content-type: image/* responses.
 *   Never forwards x-robots-tag, set-cookie, or authorization headers.
 */

// ─── Allowed upstream domains ─────────────────────────────────────────────────

const ALLOWED_DOMAINS = new Set([
  'aijczfwbnmumcvygqxkv.supabase.co', // Supabase Storage (Ideas Estudio project)
  'www.ideasestudio.com',
  'ideasestudio.com',
  'images.unsplash.com',              // article fallback images
]);

// ─── Response size limit (bytes) — reject upstream images above this size ────
// Vercel serverless response limit is 5 MB; WhatsApp recommends < 8 MB for OG.
// We hard-stop at 4 MB to leave headroom.
const MAX_BYTES = 4 * 1024 * 1024;

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // ── CORS preflight ──────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
    return res.status(204).end();
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).end('Method Not Allowed');
  }

  // ── Validate src param ──────────────────────────────────────────────────────
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
    return res.status(400).end('Only HTTPS sources are allowed');
  }

  if (!ALLOWED_DOMAINS.has(imageUrl.hostname)) {
    return res.status(403).end('Domain not in allowlist');
  }

  // ── Fetch from upstream — always GET so we get the real body + Content-Length ─
  // Bug fix: the previous version forwarded HEAD to Supabase which returned 0
  // bytes (correct HTTP semantics), causing Content-Length: 0 to be cached by
  // Vercel's edge as immutable — making validators and some scrapers think the
  // image was empty. Always using GET here ensures we have the real buffer, from
  // which we derive the correct Content-Length for both GET and HEAD responses.
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), 12000);

  try {
    const upstream = await fetch(imageUrl.toString(), {
      method: 'GET',        // always GET — see note above
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

    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return res.status(502).end('Upstream response is not an image');
    }

    // ── Read full buffer — needed for Content-Length even on HEAD ─────────────
    const buffer = Buffer.from(await upstream.arrayBuffer());

    if (buffer.length > MAX_BYTES) {
      // Return the image anyway — we don't transform yet, just warn via header.
      // A future improvement would be to resize/compress with sharp here.
      res.setHeader('X-OG-Proxy-Warning', 'image-exceeds-recommended-size');
    }

    // ── Set clean response headers ─────────────────────────────────────────────
    // Purposely omit x-robots-tag: none and other harmful upstream headers.
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);   // correct value for GET and HEAD
    // Immutable: ?v=<token> + ?pv=<proxy-version> ensure the URL changes whenever
    // the article or the proxy logic changes, so caching forever is safe.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Explicitly allow bot indexing and sharing (overrides Supabase 'none').
    res.setHeader('X-Robots-Tag', 'all');

    // ── HEAD: return headers only, no body ─────────────────────────────────────
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    // ── GET: return full image body ────────────────────────────────────────────
    return res.status(200).send(buffer);
  } catch (err) {
    clearTimeout(timerId);
    if (err.name === 'AbortError') {
      return res.status(504).end('Image fetch timed out');
    }
    console.error('[og-image proxy]', err);
    return res.status(502).end('Failed to fetch image');
  }
}
