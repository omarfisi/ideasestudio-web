/**
 * Vercel Edge Middleware — Global Social OG tag injection
 *
 * Intercepts all public page requests and injects Open Graph, Twitter/X Card,
 * LinkedIn, Pinterest and JSON-LD meta tags into the HTML before it's served.
 *
 * This runs at the edge so that social scrapers (WhatsApp, Facebook, Messenger,
 * LinkedIn, X/Twitter, Pinterest, Telegram, Discord, Slack) receive a fully-formed
 * HTML <head> — even though the app is a client-side React SPA that normally
 * builds those tags with react-helmet.
 *
 * ── Image priority (highest → lowest) ──────────────────────────────────────
 *   1. CMS SEO entry configured for this path (GET /public/seo?path=)
 *      → seo.og_image_url
 *   2. Item-level image fields (articles, portfolio items, services)
 *   3. STATIC_PAGE_META.image — hardcoded fallback per known route
 *   4. DEFAULT_SITE_IMAGE — brand photo, NEVER the favicon
 *
 * ── Route strategy ───────────────────────────────────────────────────────────
 *   The matcher catches ALL public paths (one catch-all regex, not a list).
 *   For every path the middleware:
 *     1. Fetches the SEO entry from /public/seo?path= (concurrently with index.html).
 *     2. If found → injects OG tags using that entry. Done.
 *     3. If not found → tries entity-specific enrichment (blog post, service, portfolio item).
 *     4. If no entity data → falls back to STATIC_PAGE_META.
 *     5. If nothing → passes through, letting the SPA handle it client-side.
 *   This means ~100 SEO entries all work automatically — no manual route list needed.
 *
 * ── Debug headers ────────────────────────────────────────────────────────────
 *   Add ?ogdebug=1 to any URL to get x-ie-og-* response headers showing
 *   which source won for each field (seo | entity | fallback).
 *
 * ── Key fix (PR #57) ─────────────────────────────────────────────────────────
 *   The CRM API returns { ok, found, seo: {...} }.
 *   Previous code read data?.entry (always null). Now correctly reads data?.seo.
 *
 * ── Key fix (PR #50) ─────────────────────────────────────────────────────────
 *   Replaced 14-route hardcoded matcher with a global catch-all.
 *   Every active SEO entry now gets OG injection automatically.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const SITE_URL       = 'https://www.ideasestudio.com';
const SITE_NAME      = 'Ideas Estudio';
const TWITTER_HANDLE = '@ideasestudio';

/**
 * Default brand images — real photos, never favicon/logo.
 * Used only when no configured SEO image AND no item image exist.
 */
const DEFAULT_SITE_IMAGE =
  'https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/public-web/presencia-visual.webp';

const SERVICES_IMAGE =
  'https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/public-web/marca-negocio.webp';

// ─── Static page fallback registry ───────────────────────────────────────────
// This is a FALLBACK ONLY. The CMS SEO entry (GET /public/seo?path=) always wins.
// Keys are normalized pathnames (no trailing slash).

const STATIC_PAGE_META = {
  '/': {
    title:       'Ideas Estudio | La idea que tu negocio necesita',
    description: 'Fotografía profesional, diseño, video y branding en Puerto Rico. La agencia creativa que impulsa tu marca, negocio o evento especial.',
    image:       DEFAULT_SITE_IMAGE,
  },
  '/blog': {
    title:       'Blog | Ideas Estudio',
    description: 'Artículos de fotografía, diseño, branding y estrategia visual para negocios y marcas en Puerto Rico.',
    image:       DEFAULT_SITE_IMAGE,
  },
  '/servicios': {
    title:       'Servicios Creativos | Ideas Estudio',
    description: 'Explora fotografía, video, diseño gráfico y branding profesional para tu marca, negocio o evento en Puerto Rico.',
    image:       SERVICES_IMAGE,
  },
  '/portafolio': {
    title:       'Portafolio | Ideas Estudio',
    description: 'Galería de proyectos de fotografía, video y diseño. Trabajos reales para marcas y eventos en Puerto Rico.',
    image:       DEFAULT_SITE_IMAGE,
  },
  '/contacto': {
    title:       'Contacto | Ideas Estudio',
    description: 'Ponte en contacto con Ideas Estudio. Cuéntanos sobre tu proyecto y te ayudamos a desarrollar una propuesta visual profesional.',
    image:       DEFAULT_SITE_IMAGE,
  },
  '/equipo': {
    title:       'Nuestro Equipo | Ideas Estudio',
    description: 'Conoce al equipo creativo de Ideas Estudio. Fotógrafos, diseñadores y estrategas de contenido en Puerto Rico.',
    image:       DEFAULT_SITE_IMAGE,
  },
  '/pequenos-negocios': {
    title:       'Para Pequeños Negocios | Ideas Estudio',
    description: 'Contenido visual, branding y presencia digital para tiendas, restaurantes y negocios locales en Puerto Rico.',
    image:       SERVICES_IMAGE,
  },
  '/emprendedores': {
    title:       'Para Emprendedores | Ideas Estudio',
    description: 'Branding, fotografía y presencia digital para emprendedores y marcas personales.',
    image:       DEFAULT_SITE_IMAGE,
  },
  '/empresas-emergentes': {
    title:       'Para Empresas Emergentes | Ideas Estudio',
    description: 'Identidad, contenido y presencia digital para startups y marcas nuevas.',
    image:       DEFAULT_SITE_IMAGE,
  },
  '/bodas-eventos-sesiones': {
    title:       'Bodas, Eventos y Sesiones | Ideas Estudio',
    description: 'Coberturas, sesiones y fotografía para bodas, celebraciones y retratos en Puerto Rico.',
    image:       DEFAULT_SITE_IMAGE,
  },
  '/servicios/marca-o-negocio': {
    title:       'Soluciones para Marcas y Negocios | Ideas Estudio',
    description: 'Branding, contenido, web y activos comerciales para negocios que necesitan verse mejor.',
    image:       SERVICES_IMAGE,
  },
  '/servicios/presencia-visual-profesional': {
    title:       'Presencia Visual Profesional | Ideas Estudio',
    description: 'Imagen corporativa, fotografía y video profesional para empresas y equipos.',
    image:       DEFAULT_SITE_IMAGE,
  },
  '/servicios/momento-especial': {
    title:       'Fotografía para Momentos Especiales | Ideas Estudio',
    description: 'Bodas, sesiones y coberturas con una experiencia clara desde la reserva hasta la entrega.',
    image:       DEFAULT_SITE_IMAGE,
  },
  '/servicios/solucion-creativa': {
    title:       'Soluciones Creativas Personalizadas | Ideas Estudio',
    description: 'Campañas, proyectos mixtos y propuestas donde branding, contenido, producción y web se mezclan.',
    image:       DEFAULT_SITE_IMAGE,
  },
};

// Slugs to explicitly skip (no OG injection at all)
const SERVICE_EXCLUDED_SLUGS = new Set(['checkout']);

// ─── Image priority field lists ───────────────────────────────────────────────

const BLOG_IMAGE_FIELDS = [
  'seo_image_url', 'og_image_url', 'social_image_url',
  'cover_url', 'featured_image_url', 'hero_image_url', 'image_url',
];

const PORTFOLIO_IMAGE_FIELDS = [
  'seo_image_url', 'og_image_url', 'social_image_url',
  'portfolio_cover_url', 'cover_url', 'home_cover_url',
];

const SERVICE_IMAGE_FIELDS = [
  'seo_image_url', 'og_image_url', 'social_image_url',
  'cover_url', 'cover_image_url', 'cover_image', 'hero_image', 'image_url',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function absoluteUrl(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (s.startsWith('https://') || s.startsWith('http://')) return s;
  return `${SITE_URL}${s.startsWith('/') ? '' : '/'}${s}`;
}

/**
 * Return the first valid absolute image URL from `obj`'s named fields.
 * Returns null — no built-in fallback — so callers can chain correctly.
 */
function pickImage(obj, fields, { includeMediaUrls = false } = {}) {
  if (!obj) return null;
  for (const field of fields) {
    const abs = absoluteUrl(obj[field]);
    if (abs) return abs;
  }
  if (includeMediaUrls && Array.isArray(obj.media_urls)) {
    const abs = absoluteUrl(obj.media_urls[0]);
    if (abs) return abs;
  }
  return null;
}

function getSocialImageVersion(obj) {
  if (!obj) return null;
  const raw = obj.updated_at || obj.published_at || obj.publish_at || obj.created_at || obj.id;
  if (!raw) return null;
  return String(raw).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
}

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
 * Proxy version — increment when proxy output changes to bust Vercel edge cache.
 * History:
 *   1 — initial (bug: HEAD->Supabase returned content-length: 0)
 *   2 — HEAD fix: always GET upstream
 *   3 — WebP transform: proxy returns WebP 1200×630 via sharp
 */
const OG_PROXY_VERSION = '3';

function buildProxyImageUrl(rawImageUrl, version) {
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

function resolveAndProxy(rawImageUrl, version) {
  const abs = absoluteUrl(rawImageUrl) || DEFAULT_SITE_IMAGE;
  const versioned = addImageCacheBust(abs, version);
  return buildProxyImageUrl(versioned, version);
}

// ─── SEO entry fetcher ────────────────────────────────────────────────────────

/**
 * Fetch the configured SEO entry for a path from the CRM's public API.
 *
 * API contract (GET /public/seo?path=<path>):
 *   Found:     { ok: true, found: true,  seo: { og_image_url, seo_title, meta_description, … } }
 *   Not found: { ok: true, found: false, path: <path> }
 *
 * IMPORTANT: the entry is under the "seo" key — NOT "entry".
 *
 * Returns null on: not-found, network error, timeout, bad JSON.
 */
async function fetchPageSeoEntry(crmBase, pathname, signal) {
  if (!crmBase || !pathname) return null;
  try {
    const res = await fetch(
      `${crmBase}/public/seo?path=${encodeURIComponent(pathname)}`,
      { signal, headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data?.found) return null;
    // API returns { ok, found, seo: {...} }
    return data?.seo || null;
  } catch {
    return null;
  }
}

// ─── Global OG source resolver ────────────────────────────────────────────────

/**
 * Resolve the canonical title, description, image, and version for any page.
 *
 * Priority (highest → lowest):
 *   title:       seoEntry.og_title (if set) → seoEntry.seo_title → entityTitle → staticMeta.title
 *   description: seoEntry.og_description (if set) → seoEntry.meta_description → entityDescription → staticMeta.description
 *   image:       seoEntry.og_image_url → entityImage → staticMeta.image → DEFAULT_SITE_IMAGE
 *   version:     from seoEntry timestamps → from entity timestamps
 *
 * @param {object}      opts
 * @param {object|null} opts.seoEntry         - CMS SEO entry ({ og_image_url, seo_title, … })
 * @param {string}      opts.entityTitle      - pre-resolved title from item (post.title, service.name, …)
 * @param {string}      opts.entityDescription - pre-resolved description from item
 * @param {string|null} opts.entityImage      - pre-resolved image URL from item (already absolute)
 * @param {string|null} opts.entityVersion    - cache-bust token from item (getSocialImageVersion result)
 * @param {object|null} opts.staticMeta       - from STATIC_PAGE_META (fallback only)
 * @returns {{ fullTitle, displayTitle, description, rawImage, imageSource, version }}
 */
function resolveOgSource({ seoEntry, entityTitle, entityDescription, entityImage, entityVersion, staticMeta }) {
  const e = seoEntry || {};

  // ── Title ───────────────────────────────────────────────────────────────────
  const seoTitle =
    (e.og_title       || '').trim() ||
    (e.seo_title      || '').trim();
  const staticTitle = (staticMeta?.title || '').replace(` | ${SITE_NAME}`, '').replace(`${SITE_NAME} | `, '');
  const resolvedRaw = seoTitle || entityTitle || staticTitle || SITE_NAME;
  const fullTitle   = resolvedRaw.includes(SITE_NAME)
    ? resolvedRaw
    : `${resolvedRaw} | ${SITE_NAME}`;
  const displayTitle = fullTitle
    .replace(` | ${SITE_NAME}`, '')
    .replace(`${SITE_NAME} | `, '');

  // ── Description ─────────────────────────────────────────────────────────────
  const description =
    (e.og_description  || '').trim() ||
    (e.meta_description|| '').trim() ||
    entityDescription  ||
    staticMeta?.description          ||
    `Agencia creativa en Puerto Rico — ${SITE_NAME}.`;

  // ── Image ───────────────────────────────────────────────────────────────────
  const seoImage     = absoluteUrl((e.og_image_url || '').trim());
  const fallbackImage = absoluteUrl(staticMeta?.image) || DEFAULT_SITE_IMAGE;

  let rawImage, imageSource;
  if (seoImage) {
    rawImage    = seoImage;
    imageSource = 'seo';
  } else if (entityImage) {
    rawImage    = entityImage;
    imageSource = 'entity';
  } else {
    rawImage    = fallbackImage;
    imageSource = 'fallback';
  }

  // ── Version (cache-bust token) ───────────────────────────────────────────────
  const version = getSocialImageVersion(e) || entityVersion || null;

  return { fullTitle, displayTitle, description, rawImage, imageSource, version };
}

// ─── Route classifier ─────────────────────────────────────────────────────────

/**
 * Classify a normalized pathname.
 *
 * Returns one of:
 *   { type: 'bypass'    }  — explicitly excluded, no OG injection
 *   { type: 'static',   staticMeta }  — known static page with fallback meta
 *   { type: 'blog',     slug }        — blog post detail (needs entity API)
 *   { type: 'portfolio',slug }        — portfolio item detail (needs entity API)
 *   { type: 'service',  slug }        — service detail (needs entity API)
 *   { type: 'seo-only' }              — any other public path; relies entirely on SEO entry
 *
 * NOTE: 'seo-only' is the new addition that enables coverage of all ~100 SEO entries
 * without a hardcoded list. The middleware will fetch the SEO entry and inject if found,
 * or pass through if not.
 */
function classifyRoute(pathname) {
  // Explicitly excluded slugs (e.g. /servicios/checkout)
  const serviceMatch = pathname.match(/^\/servicios\/([^/]+)$/);
  if (serviceMatch && SERVICE_EXCLUDED_SLUGS.has(serviceMatch[1])) {
    return { type: 'bypass' };
  }

  // Known static pages (checked before dynamic patterns so niche slugs like
  // /servicios/marca-o-negocio are handled as static, not as service detail)
  if (STATIC_PAGE_META[pathname]) {
    return { type: 'static', staticMeta: STATIC_PAGE_META[pathname] };
  }

  // Blog post detail
  const blogMatch = pathname.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) return { type: 'blog', slug: blogMatch[1] };

  // Portfolio item detail
  const portfolioMatch = pathname.match(/^\/portafolio\/([^/]+)$/);
  if (portfolioMatch) return { type: 'portfolio', slug: portfolioMatch[1] };

  // Service detail (non-excluded, non-static)
  if (serviceMatch) return { type: 'service', slug: serviceMatch[1] };

  // Any other public path — try the SEO entry; inject if found, pass through if not
  return { type: 'seo-only' };
}

// ─── OG block builder ─────────────────────────────────────────────────────────

function buildOgBlock({ fullTitle, displayTitle, description, image, canonical, ogType, articleTagsHtml, schemaJson, pathLabel }) {
  const articleSection = articleTagsHtml
    ? `\n    <!-- ── Article-specific OG ─────────────────────────────── -->\n    ${articleTagsHtml}\n`
    : '';

  return `
    <!-- social-meta: injected by Vercel edge middleware for ${esc(pathLabel)} -->

    <!-- ── Basic SEO ────────────────────────────────────────────── -->
    <title>${esc(fullTitle)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />

    <!-- ── Open Graph (WhatsApp · FB · Messenger · LinkedIn · Telegram · Discord · Slack) -->
    <meta property="og:locale"             content="es_PR" />
    <meta property="og:site_name"          content="${SITE_NAME}" />
    <meta property="og:type"               content="${ogType}" />
    <meta property="og:title"              content="${esc(fullTitle)}" />
    <meta property="og:description"        content="${esc(description)}" />
    <meta property="og:url"                content="${canonical}" />
    <meta property="og:image"              content="${image}" />
    <meta property="og:image:secure_url"   content="${image}" />
    <meta property="og:image:type"         content="image/webp" />
    <meta property="og:image:width"        content="1200" />
    <meta property="og:image:height"       content="630" />
    <meta property="og:image:alt"          content="${esc(displayTitle)}" />${articleSection}
    <!-- ── Twitter / X Card ─────────────────────────────────────── -->
    <meta name="twitter:card"        content="summary_large_image" />
    <meta name="twitter:site"        content="${TWITTER_HANDLE}" />
    <meta name="twitter:creator"     content="${TWITTER_HANDLE}" />
    <meta name="twitter:title"       content="${esc(fullTitle)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image"       content="${image}" />
    <meta name="twitter:image:alt"   content="${esc(displayTitle)}" />

    <!-- ── Pinterest ─────────────────────────────────────────────── -->
    <meta name="pinterest-rich-pin" content="true" />

    <!-- ── iMessage / generic link preview ──────────────────────── -->
    <link rel="image_src" href="${image}" />

    <!-- ── JSON-LD ───────────────────────────────────────────────── -->
    <script type="application/ld+json">${schemaJson}</script>`;
}

// ─── Per-route OG options builders ───────────────────────────────────────────

/**
 * Build OG opts for static pages and SEO-entry-only routes.
 * `staticMeta` may be null when the route is not in STATIC_PAGE_META —
 * resolveOgSource handles null gracefully, falling back to seoEntry and then
 * DEFAULT_SITE_IMAGE.
 */
function buildStaticOgOpts(staticMeta, pathname, seoEntry) {
  const source = resolveOgSource({
    seoEntry,
    entityTitle:       null,
    entityDescription: null,
    entityImage:       null,
    entityVersion:     null,
    staticMeta,
  });

  const image    = resolveAndProxy(source.rawImage, source.version);
  const canonical = (seoEntry?.canonical_url || '').trim() ||
                    `${SITE_URL}${pathname === '/' ? '' : pathname}`;

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type':    'WebPage',
    name:        source.fullTitle,
    description: source.description,
    url:         canonical,
    publisher: {
      '@type': 'Organization',
      name:     SITE_NAME,
      url:      SITE_URL,
      logo:   { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg` },
    },
  });

  return {
    fullTitle:       source.fullTitle,
    displayTitle:    source.displayTitle,
    description:     source.description,
    image,
    canonical,
    ogType:          'website',
    articleTagsHtml: '',
    schemaJson:      schema,
    pathLabel:       pathname,
    imageSource:     source.imageSource,
  };
}

function buildBlogOgOpts(post, slug, seoEntry) {
  const entityTitle       = post.meta_title || post.title || '';
  const entityDescription = post.meta_description || post.excerpt || '';
  const entityImage       = pickImage(post, BLOG_IMAGE_FIELDS);
  const entityVersion     = getSocialImageVersion(post);

  const source = resolveOgSource({
    seoEntry,
    entityTitle,
    entityDescription,
    entityImage,
    entityVersion,
    staticMeta: null,
  });

  const image    = resolveAndProxy(source.rawImage, source.version);
  const canonical = (seoEntry?.canonical_url || '').trim() || `${SITE_URL}/blog/${slug}`;

  const publishedAt = post.published_at || post.publish_at || post.created_at || '';
  const modifiedAt  = post.updated_at   || publishedAt;
  const authorName  = post.author?.name || post.author_name || SITE_NAME;
  const category    = post.category?.name || post.category_name || 'Blog';
  const tags = (Array.isArray(post.tags) ? post.tags : [])
    .map(t => (typeof t === 'string' ? t : t?.name))
    .filter(Boolean);

  const articleLines = [
    publishedAt && `<meta property="article:published_time" content="${esc(publishedAt)}" />`,
    modifiedAt  && `<meta property="article:modified_time"  content="${esc(modifiedAt)}" />`,
    `<meta property="article:author"  content="${esc(authorName)}" />`,
    `<meta property="article:section" content="${esc(category)}" />`,
    ...tags.map(tag => `<meta property="article:tag" content="${esc(tag)}" />`),
  ].filter(Boolean).join('\n    ');

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type':    'BlogPosting',
    headline:    source.fullTitle,
    description: source.description,
    image:       [image],
    author: {
      '@type': post.author ? 'Person' : 'Organization',
      name:     authorName,
    },
    publisher: {
      '@type': 'Organization',
      name:     SITE_NAME,
      url:      SITE_URL,
      logo:   { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    datePublished:    publishedAt,
    dateModified:     modifiedAt,
    url:              canonical,
  });

  return {
    fullTitle:       source.fullTitle,
    displayTitle:    source.displayTitle,
    description:     source.description,
    image,
    canonical,
    ogType:          'article',
    articleTagsHtml: articleLines,
    schemaJson:      schema,
    pathLabel:       `/blog/${slug}`,
    imageSource:     source.imageSource,
  };
}

function buildPortfolioOgOpts(item, slug, seoEntry) {
  const entityTitle       = item.title || '';
  const entityDescription = item.description || '';
  const entityImage       = pickImage(item, PORTFOLIO_IMAGE_FIELDS, { includeMediaUrls: true });
  const entityVersion     = getSocialImageVersion(item);

  const source = resolveOgSource({
    seoEntry,
    entityTitle,
    entityDescription,
    entityImage,
    entityVersion,
    staticMeta: STATIC_PAGE_META['/portafolio'],
  });

  const image    = resolveAndProxy(source.rawImage, source.version);
  const canonical = (seoEntry?.canonical_url || '').trim() || `${SITE_URL}/portafolio/${slug}`;

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type':    'CreativeWork',
    name:        source.fullTitle,
    description: source.description,
    image:       [image],
    url:         canonical,
    creator: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  });

  return {
    fullTitle:       source.fullTitle,
    displayTitle:    source.displayTitle,
    description:     source.description,
    image,
    canonical,
    ogType:          'website',
    articleTagsHtml: '',
    schemaJson:      schema,
    pathLabel:       `/portafolio/${slug}`,
    imageSource:     source.imageSource,
  };
}

function buildServiceOgOpts(service, slug, seoEntry) {
  const entityTitle       = service.name || '';
  const entityDescription = service.short_description || service.description || '';
  const entityImage       = pickImage(service, SERVICE_IMAGE_FIELDS);

  const source = resolveOgSource({
    seoEntry,
    entityTitle,
    entityDescription,
    entityImage,
    entityVersion: null,
    staticMeta:    STATIC_PAGE_META['/servicios'],
  });

  const image    = resolveAndProxy(source.rawImage, null);
  const canonical = (seoEntry?.canonical_url || '').trim() || `${SITE_URL}/servicios/${slug}`;

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type':    'Service',
    name:        source.fullTitle,
    description: source.description,
    image:       [image],
    url:         canonical,
    provider:    { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  });

  return {
    fullTitle:       source.fullTitle,
    displayTitle:    source.displayTitle,
    description:     source.description,
    image,
    canonical,
    ogType:          'website',
    articleTagsHtml: '',
    schemaJson:      schema,
    pathLabel:       `/servicios/${slug}`,
    imageSource:     source.imageSource,
  };
}

// ─── Middleware config ────────────────────────────────────────────────────────

/**
 * Global catch-all matcher.
 *
 * Intercepts every public path EXCEPT:
 *   - /api/og-image  (the proxy itself — must not loop)
 *   - /api/*         (other serverless functions)
 *   - /assets/*      (Vite build output)
 *   - favicon.ico, favicon.svg, robots.txt, sitemap.xml
 *   - Any path ending in a file extension (JS, CSS, images, fonts, …)
 *
 * This replaces the previous 14-route hardcoded list, enabling OG injection
 * for all ~100 active SEO entries without manual maintenance.
 */
export const config = {
  matcher: [
    '/((?!api/og-image|api/|assets/|favicon\\.ico|favicon\\.svg|robots\\.txt|sitemap\\.xml|.*\\.(?:js|css|map|png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf|otf|eot|pdf)$).*)',
  ],
};

// ─── Middleware ───────────────────────────────────────────────────────────────

export default async function middleware(request) {
  const url = new URL(request.url);

  // Normalize: strip trailing slash (keep bare '/')
  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);

  // Belt-and-suspenders: skip any path that looks like a file (has extension)
  if (/\.[a-zA-Z0-9]{1,8}$/.test(pathname)) return undefined;

  const route = classifyRoute(pathname);
  if (route.type === 'bypass') return undefined;

  const crmBase = (process.env.VITE_CRM_BASE_URL || '').replace(/\/+$/, '');
  const debug   = url.searchParams.has('ogdebug');

  const controller = new AbortController();
  const timerId    = setTimeout(() => controller.abort(), 5000);

  try {
    const indexUrl = new URL('/index.html', url.origin).toString();
    let html   = null;
    let ogOpts = null;

    // ── SEO-only paths ──────────────────────────────────────────────────────
    // These are paths not in STATIC_PAGE_META and not a known entity type.
    // Their only source of OG data is the CMS SEO entry.
    // If no SEO entry exists → pass through to the SPA (no injection).
    if (route.type === 'seo-only') {
      if (!crmBase) { clearTimeout(timerId); return undefined; }

      const [htmlRes, seoEntry] = await Promise.all([
        fetch(indexUrl, { signal: controller.signal }),
        fetchPageSeoEntry(crmBase, pathname, controller.signal),
      ]);
      clearTimeout(timerId);

      if (!htmlRes.ok) return undefined;
      if (!seoEntry) return undefined;  // no SEO entry for this path → SPA handles it

      html   = await htmlRes.text();
      ogOpts = buildStaticOgOpts(null, pathname, seoEntry);

    // ── Known static pages ───────────────────────────────────────────────────
    } else if (route.type === 'static') {
      const [htmlRes, seoEntry] = await Promise.all([
        fetch(indexUrl, { signal: controller.signal }),
        crmBase ? fetchPageSeoEntry(crmBase, pathname, controller.signal) : Promise.resolve(null),
      ]);
      clearTimeout(timerId);

      if (!htmlRes.ok) return undefined;
      html   = await htmlRes.text();
      ogOpts = buildStaticOgOpts(route.staticMeta, pathname, seoEntry);

    // ── Dynamic entity pages (blog / portfolio / service) ────────────────────
    } else {
      if (!crmBase) { clearTimeout(timerId); return undefined; }

      let apiUrl, seoPath;

      if (route.type === 'blog') {
        apiUrl  = `${crmBase}/api/blog/posts/${encodeURIComponent(route.slug)}`;
        seoPath = `/blog/${route.slug}`;
      } else if (route.type === 'portfolio') {
        apiUrl  = `${crmBase}/portfolio?is_published=true&slug=${encodeURIComponent(route.slug)}`;
        seoPath = `/portafolio/${route.slug}`;
      } else if (route.type === 'service') {
        apiUrl  = `${crmBase}/services/${encodeURIComponent(route.slug)}`;
        seoPath = `/servicios/${route.slug}`;
      }

      const [apiRes, htmlRes, seoEntry] = await Promise.all([
        fetch(apiUrl, { signal: controller.signal, headers: { Accept: 'application/json' } }),
        fetch(indexUrl, { signal: controller.signal }),
        fetchPageSeoEntry(crmBase, seoPath, controller.signal),
      ]);
      clearTimeout(timerId);

      if (!htmlRes.ok) return undefined;
      html = await htmlRes.text();

      const data = apiRes.ok ? await apiRes.json().catch(() => null) : null;

      if (route.type === 'blog') {
        const post = data?.item || null;
        // SEO entry alone is enough — don't need the post entity to inject OG
        if (!post && !seoEntry) return undefined;
        ogOpts = post
          ? buildBlogOgOpts(post, route.slug, seoEntry)
          : buildStaticOgOpts(null, pathname, seoEntry);

      } else if (route.type === 'portfolio') {
        const items = Array.isArray(data?.items) ? data.items
                    : Array.isArray(data)         ? data
                    : [];
        const item = items.find(i => i.slug === route.slug) || items[0] || null;
        if (!item && !seoEntry) return undefined;
        ogOpts = item
          ? buildPortfolioOgOpts(item, route.slug, seoEntry)
          : buildStaticOgOpts(null, pathname, seoEntry);

      } else if (route.type === 'service') {
        const service = data?.item || (data && !data.items ? data : null);
        if (!service && !seoEntry) return undefined;
        ogOpts = service
          ? buildServiceOgOpts(service, route.slug, seoEntry)
          : buildStaticOgOpts(null, pathname, seoEntry);
      }
    }

    if (!ogOpts || !html) return undefined;

    // ── Inject OG block ──────────────────────────────────────────────────────
    const ogBlock = buildOgBlock(ogOpts);
    html = html.replace(/<title>[^<]*<\/title>/i, '');
    html = html.replace('</head>', `${ogBlock}\n  </head>`);

    const responseHeaders = {
      'Content-Type':  'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      'X-Robots-Tag':  'index, follow',
    };

    // ── Debug headers (only when ?ogdebug=1) ────────────────────────────────
    if (debug) {
      responseHeaders['x-ie-og-route-type']    = route.type;
      responseHeaders['x-ie-og-path']          = pathname;
      responseHeaders['x-ie-og-image-source']  = ogOpts.imageSource || 'unknown';
      // 'found' = SEO entry existed for this path (image may come from entity if og_image_url blank)
      responseHeaders['x-ie-og-seo-entry']     = ogOpts.imageSource === 'seo' ? 'found' : 'not-found-or-no-image';
      responseHeaders['x-ie-og-proxy-version'] = OG_PROXY_VERSION;
    }

    return new Response(html, { status: 200, headers: responseHeaders });

  } catch {
    clearTimeout(timerId);
    return undefined;
  }
}
