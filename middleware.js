/**
 * Vercel Edge Middleware — Social OG tag injection for blog articles
 *
 * Intercepts /blog/:slug requests, fetches the article from the CRM API,
 * and injects Open Graph, Twitter/X Card, LinkedIn, Pinterest and JSON-LD
 * meta tags into the HTML before it's served.
 *
 * This runs at the edge on every /blog/:slug request so that social scrapers
 * (WhatsApp, Facebook, Messenger, LinkedIn, X/Twitter, Pinterest, Telegram,
 * Discord, Slack) receive a fully-formed HTML <head> — even though the app
 * is a client-side React SPA that normally builds those tags with react-helmet.
 *
 * On any error (timeout, CRM down, article not found) the middleware returns
 * undefined so Vercel falls through to the normal SPA route (index.html).
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const SITE_URL   = 'https://www.ideasestudio.com';
const SITE_NAME  = 'Ideas Estudio';
const TWITTER_HANDLE = '@ideasestudio';

/**
 * Fallback OG image for articles with no cover.
 * Replace this with a proper 1200×630 social card once one is created.
 */
const DEFAULT_SOCIAL_IMAGE =
  'https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/logos/favicon_ideasestudio.webp';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Escape special HTML attribute characters. */
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Convert a relative URL to an absolute one using SITE_URL. */
function absoluteUrl(value) {
  if (!value) return null;
  if (value.startsWith('https://') || value.startsWith('http://')) return value;
  return `${SITE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
}

/**
 * Social image priority for an article.
 * Tries each field in order; converts relative URLs to absolute.
 * Never returns favicon/logo for articles — only genuine cover images.
 */
function getSocialImage(post) {
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
  return DEFAULT_SOCIAL_IMAGE;
}

/** Detect MIME type from image URL extension (ignores querystring). */
function getImageMime(url) {
  if (!url) return 'image/jpeg';
  const u = url.toLowerCase().split('?')[0];
  if (u.endsWith('.webp')) return 'image/webp';
  if (u.endsWith('.png'))  return 'image/png';
  if (u.endsWith('.gif'))  return 'image/gif';
  return 'image/jpeg';
}

/**
 * Derives a stable version token from the article's update/publish timestamp or ID.
 * Used as a ?v= querystring on the social image URL so that WhatsApp (and other
 * aggressive-caching scrapers) treat a changed image as a new resource.
 *
 * Stability guarantee: the same article at the same updated_at always produces
 * the same token — so CDN caching of the image itself is unaffected, and the
 * scraper only re-fetches when the article actually changes.
 *
 * Returns null when no suitable field is found (fallback: skip cache-busting).
 */
function getSocialImageVersion(post) {
  const raw =
    post?.updated_at  ||
    post?.published_at ||
    post?.publish_at  ||
    post?.created_at  ||
    post?.id;
  if (!raw) return null;
  // Strip all non-alphanumeric characters; trim to 20 chars max
  return String(raw).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
}

/**
 * Appends a stable `?v=<version>` to an image URL.
 * Returns the original URL unchanged when version is null/empty (e.g. fallback images).
 */
function addImageCacheBust(url, version) {
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
 * Builds the proxied URL that serves the image through the site's own domain.
 *
 * Why: Supabase Storage returns `x-robots-tag: none` on every object, which
 * causes WhatsApp's scraper to reject the image even when og:image is present.
 * Routing through /api/og-image strips that header and re-serves the bytes with
 * bot-friendly headers (Cache-Control: public, immutable; no x-robots-tag).
 *
 * The `v` param changes when the article is updated so WhatsApp sees a new URL.
 */
function buildProxyImageUrl(rawImageUrl, version) {
  if (!rawImageUrl) return rawImageUrl;
  try {
    const params = new URLSearchParams();
    params.set('src', rawImageUrl);
    if (version) params.set('v', version);
    return `${SITE_URL}/api/og-image?${params.toString()}`;
  } catch {
    return rawImageUrl;
  }
}

// ─── Meta tag builder ─────────────────────────────────────────────────────────

/**
 * Build a complete block of social meta tags for one article.
 * Covers: OG (WhatsApp/Facebook/Messenger/LinkedIn/Telegram/Discord/Slack),
 * Twitter/X Cards, Pinterest, iMessage/link-preview, and JSON-LD BlogPosting.
 */
function buildOgBlock(post, slug) {
  const rawTitle    = post.meta_title    || post.title    || 'Blog | Ideas Estudio';
  const fullTitle   = rawTitle.includes(SITE_NAME) ? rawTitle : `${rawTitle} | ${SITE_NAME}`;
  const description = post.meta_description || post.excerpt
    || `Lee "${rawTitle}" en el blog de ${SITE_NAME}.`;

  // Route the social image through our own proxy so:
  //   1. x-robots-tag: none from Supabase is stripped.
  //   2. We serve bot-friendly headers (Cache-Control: public, immutable).
  //   3. The URL is under ideasestudio.com — not a third-party storage domain.
  // The ?v= token on the raw image is included inside the proxied src= param,
  // ensuring CDN cache-busting propagates through the proxy as well.
  const rawImage    = getSocialImage(post);
  const imageVer    = getSocialImageVersion(post);
  const versionedRaw = addImageCacheBust(rawImage, imageVer);
  const image       = buildProxyImageUrl(versionedRaw, imageVer);
  const imageMime   = getImageMime(rawImage); // MIME from base URL (before proxy/querystring)
  const canonical   = `${SITE_URL}/blog/${slug}`;
  const publishedAt = post.published_at || post.publish_at || post.created_at || '';
  const modifiedAt  = post.updated_at   || publishedAt;
  const authorName  = post.author?.name || post.author_name || SITE_NAME;
  const category    = post.category?.name || post.category_name || 'Blog';

  const tags = (Array.isArray(post.tags) ? post.tags : [])
    .map((t) => (typeof t === 'string' ? t : t?.name))
    .filter(Boolean);

  const articleTagsMeta = [
    publishedAt && `<meta property="article:published_time" content="${esc(publishedAt)}" />`,
    modifiedAt  && `<meta property="article:modified_time"  content="${esc(modifiedAt)}" />`,
    `<meta property="article:author"  content="${esc(authorName)}" />`,
    `<meta property="article:section" content="${esc(category)}" />`,
    ...tags.map((tag) => `<meta property="article:tag" content="${esc(tag)}" />`),
  ].filter(Boolean).join('\n    ');

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: rawTitle,
    description: description,
    image: [image],
    author: {
      '@type': post.author ? 'Person' : 'Organization',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    datePublished: publishedAt,
    dateModified: modifiedAt,
    url: canonical,
  });

  return `
    <!-- social-meta: injected by Vercel edge middleware for /blog/${esc(slug)} -->

    <!-- ── Basic SEO ───────────────────────────────────────────── -->
    <title>${esc(fullTitle)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />

    <!-- ── Open Graph (WhatsApp · FB · Messenger · LinkedIn · Telegram · Discord · Slack) -->
    <meta property="og:locale"             content="es_PR" />
    <meta property="og:site_name"          content="${SITE_NAME}" />
    <meta property="og:type"               content="article" />
    <meta property="og:title"              content="${esc(fullTitle)}" />
    <meta property="og:description"        content="${esc(description)}" />
    <meta property="og:url"                content="${canonical}" />
    <meta property="og:image"              content="${image}" />
    <meta property="og:image:secure_url"   content="${image}" />
    <meta property="og:image:type"         content="${imageMime}" />
    <meta property="og:image:width"        content="1200" />
    <meta property="og:image:height"       content="630" />
    <meta property="og:image:alt"          content="${esc(rawTitle)}" />

    <!-- ── Article-specific OG ─────────────────────────────────── -->
    ${articleTagsMeta}

    <!-- ── Twitter / X Card ────────────────────────────────────── -->
    <meta name="twitter:card"        content="summary_large_image" />
    <meta name="twitter:site"        content="${TWITTER_HANDLE}" />
    <meta name="twitter:creator"     content="${TWITTER_HANDLE}" />
    <meta name="twitter:title"       content="${esc(fullTitle)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image"       content="${image}" />
    <meta name="twitter:image:alt"   content="${esc(rawTitle)}" />

    <!-- ── Pinterest ───────────────────────────────────────────── -->
    <meta name="pinterest-rich-pin" content="true" />

    <!-- ── iMessage / generic link preview ─────────────────────── -->
    <link rel="image_src" href="${image}" />

    <!-- ── JSON-LD: BlogPosting ─────────────────────────────────── -->
    <script type="application/ld+json">${schema}</script>`;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export const config = {
  matcher: ['/blog/:slug+'],
};

export default async function middleware(request) {
  const url = new URL(request.url);

  // Extract slug — path is /blog/<slug>
  const slug = url.pathname
    .replace(/^\/blog\//, '')
    .replace(/\/$/, '');        // strip trailing slash

  // Skip asset/file requests (e.g. /blog/feed.xml)
  if (!slug || slug.includes('.')) return undefined;

  const crmBase = (process.env.VITE_CRM_BASE_URL || '').replace(/\/+$/, '');
  if (!crmBase) return undefined; // Can't inject without API base URL

  // ── Fetch article + HTML concurrently, with a 5s timeout ──────────────────
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), 5000);

  try {
    const [articleRes, htmlRes] = await Promise.all([
      fetch(`${crmBase}/api/blog/posts/${encodeURIComponent(slug)}`, {
        signal:  controller.signal,
        headers: { Accept: 'application/json' },
      }),
      fetch(new URL('/index.html', url.origin).toString(), {
        signal: controller.signal,
      }),
    ]);

    clearTimeout(timerId);

    // If we can't get the shell HTML, fall through to normal Vercel routing
    if (!htmlRes.ok) return undefined;
    let html = await htmlRes.text();

    // Try to parse the article; on failure, still serve the shell (SPA handles 404)
    let post = null;
    if (articleRes.ok) {
      const data = await articleRes.json().catch(() => null);
      post = data?.item || null;
    }

    // No article found → let the React SPA render the 404 page
    if (!post) return undefined;

    // Build and inject OG block
    const ogBlock = buildOgBlock(post, slug);

    // Remove generic <title> to avoid duplicates (we inject a new one)
    html = html.replace(/<title>[^<]*<\/title>/i, '');

    // Inject before </head>
    html = html.replace('</head>', `${ogBlock}\n  </head>`);

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type':  'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        'X-Robots-Tag':  'index, follow',
      },
    });
  } catch {
    clearTimeout(timerId);
    // On any error (timeout, network, parse) fall through to normal serving
    return undefined;
  }
}
