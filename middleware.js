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
 * Image priority (highest → lowest):
 *   1. SEO entry configured in the CMS for this exact path (/public/seo?path=…)
 *      → og_image_url, seo_image_url, social_image_url, cover_url, image_url
 *   2. Item-level image fields (for articles, portfolio, services):
 *      seo_image_url → og_image_url → social_image_url → cover_* → image_url → media_urls[0]
 *   3. STATIC_PAGE_META.image fallback (only if neither 1 nor 2 resolved)
 *   4. DEFAULT_SITE_IMAGE — a real brand photo, never the favicon
 *
 * On any error (timeout, CRM down, not found) the middleware returns
 * undefined so Vercel falls through to the normal SPA route (index.html).
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const SITE_URL       = 'https://www.ideasestudio.com';
const SITE_NAME      = 'Ideas Estudio';
const TWITTER_HANDLE = '@ideasestudio';

/**
 * Default brand image — a real Supabase photo used on the homepage.
 * Used only when NO configured OG image and NO item image are available.
 * Never use favicon here.
 */
const DEFAULT_SITE_IMAGE =
  'https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/public-web/presencia-visual.webp';

const SERVICES_IMAGE =
  'https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/public-web/marca-negocio.webp';

// ─── Static page fallback registry ───────────────────────────────────────────
// Used ONLY when the CRM's /public/seo?path= endpoint returns no entry.
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
    description: 'Contenido visual, branding y presencia digital para tiendas, restaurantes y negocios locales en Puerto Rico que necesitan verse más profesionales.',
    image:       SERVICES_IMAGE,
  },
  '/emprendedores': {
    title:       'Para Emprendedores | Ideas Estudio',
    description: 'Branding, fotografía y presencia digital para emprendedores y marcas personales que quieren presentar mejor su propuesta.',
    image:       DEFAULT_SITE_IMAGE,
  },
  '/empresas-emergentes': {
    title:       'Para Empresas Emergentes | Ideas Estudio',
    description: 'Identidad, contenido y presencia digital para startups y marcas nuevas que necesitan salir al mercado con una imagen sólida y escalable.',
    image:       DEFAULT_SITE_IMAGE,
  },
  '/bodas-eventos-sesiones': {
    title:       'Bodas, Eventos y Sesiones | Ideas Estudio',
    description: 'Coberturas, sesiones y fotografía para bodas, celebraciones y retratos con un proceso claro desde la reserva hasta la entrega.',
    image:       DEFAULT_SITE_IMAGE,
  },
  '/servicios/marca-o-negocio': {
    title:       'Soluciones para Marcas y Negocios | Ideas Estudio',
    description: 'Branding, contenido, web y activos comerciales para negocios que necesitan verse mejor, vender con más orden y comunicar con más intención.',
    image:       SERVICES_IMAGE,
  },
  '/servicios/presencia-visual-profesional': {
    title:       'Presencia Visual Profesional | Ideas Estudio',
    description: 'Imagen corporativa, fotografía y video profesional para empresas y equipos que necesitan verse serios, consistentes y listos para presentar.',
    image:       DEFAULT_SITE_IMAGE,
  },
  '/servicios/momento-especial': {
    title:       'Fotografía para Momentos Especiales | Ideas Estudio',
    description: 'Bodas, sesiones, celebraciones y coberturas con una estructura más clara para reservar, entender la experiencia y elegir mejor.',
    image:       DEFAULT_SITE_IMAGE,
  },
  '/servicios/solucion-creativa': {
    title:       'Soluciones Creativas Personalizadas | Ideas Estudio',
    description: 'Campañas, proyectos mixtos y propuestas personalizadas para necesidades donde branding, contenido, producción o web deben mezclarse con criterio.',
    image:       DEFAULT_SITE_IMAGE,
  },
};

// Slugs under /servicios/ that are static niche pages (handled via static registry)
const SERVICE_NICHE_SLUGS = new Set([
  'marca-o-negocio',
  'presencia-visual-profesional',
  'momento-especial',
  'solucion-creativa',
]);

// Slugs under /servicios/ to skip entirely (no OG injection needed)
const SERVICE_EXCLUDED_SLUGS = new Set(['checkout']);

// ─── Image priority field lists ───────────────────────────────────────────────
// Used by pickImage() to find the first valid image URL in an object.
// Order = priority (highest first).

const SEO_ENTRY_IMAGE_FIELDS = [
  'og_image_url', 'seo_image_url', 'social_image_url', 'cover_url', 'image_url',
];

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

/** Escape special HTML attribute characters. */
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Convert a relative URL to an absolute one. */
function absoluteUrl(value) {
  if (!value) return null;
  if (value.startsWith('https://') || value.startsWith('http://')) return value;
  return `${SITE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
}

/**
 * Return the first valid absolute image URL from `obj` using the given field names.
 * Also checks `obj.media_urls[0]` as a last resort if `includeMediaUrls` is true.
 * Returns null (no built-in fallback) so callers can chain their own fallbacks.
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

/**
 * Derives a stable version token from an object's update/publish timestamp or ID.
 * Used as ?v= so caching scrapers treat a changed image as a new resource.
 * Returns null when no suitable field is found.
 */
function getSocialImageVersion(obj) {
  const raw =
    obj?.updated_at  ||
    obj?.published_at ||
    obj?.publish_at  ||
    obj?.created_at  ||
    obj?.id;
  if (!raw) return null;
  return String(raw).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
}

/** Appends a stable ?v= querystring to an image URL. */
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
 * Proxy version — increment when proxy behaviour changes to bust Vercel edge cache.
 *
 * History:
 *   1 — initial (bug: HEAD forwarded to Supabase, content-length: 0)
 *   2 — HEAD fix: proxy always does GET upstream; HEAD returns headers only
 *   3 — WebP transform: proxy returns WebP 1200x630 via sharp, not raw PNG
 */
const OG_PROXY_VERSION = '3';

/**
 * Build the proxy URL that serves the image through our own domain.
 * Strips Supabase's x-robots-tag: none and converts to WebP 1200×630.
 */
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

/**
 * Resolve + proxy an image URL in one step.
 * @param {string|null} rawImageUrl - original (possibly relative) image URL
 * @param {string|null} version     - cache-bust token from getSocialImageVersion()
 * @returns {string} fully proxied URL, or buildProxyImageUrl(DEFAULT_SITE_IMAGE, null) as fallback
 */
function resolveAndProxy(rawImageUrl, version) {
  const abs = absoluteUrl(rawImageUrl) || DEFAULT_SITE_IMAGE;
  const versioned = addImageCacheBust(abs, version);
  return buildProxyImageUrl(versioned, version);
}

// ─── SEO entry fetcher ────────────────────────────────────────────────────────

/**
 * Fetch the configured SEO entry for a given pathname from the CRM's public API.
 * This is the source of truth for OG image, title, and description per page.
 * Returns null silently on any error so middleware can fall back to defaults.
 *
 * @param {string} crmBase - CRM API base URL (e.g. https://api.example.com)
 * @param {string} pathname - normalized page path (e.g. '/servicios/marca-o-negocio')
 * @param {AbortSignal} signal
 * @returns {Promise<object|null>}
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
    return data?.entry || null;
  } catch {
    // Timeout, network error, parse error → graceful degradation
    return null;
  }
}

// ─── Route classifier ─────────────────────────────────────────────────────────

/**
 * Classify an incoming pathname into a route type and extract parameters.
 * @param {string} pathname - normalized pathname (no trailing slash, e.g. '/blog/my-slug')
 * @returns {{ type: string, slug?: string, staticMeta?: object }}
 */
function classifyRoute(pathname) {
  // Static registry (exact match — catches niche pages under /servicios/ too)
  if (STATIC_PAGE_META[pathname]) {
    return { type: 'static', staticMeta: STATIC_PAGE_META[pathname] };
  }

  // /blog/:slug  (single segment only)
  const blogMatch = pathname.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) return { type: 'blog', slug: blogMatch[1] };

  // /portafolio/:slug
  const portfolioMatch = pathname.match(/^\/portafolio\/([^/]+)$/);
  if (portfolioMatch) return { type: 'portfolio', slug: portfolioMatch[1] };

  // /servicios/:slug — skip checkout and niche slugs (already in static registry)
  const serviceMatch = pathname.match(/^\/servicios\/([^/]+)$/);
  if (serviceMatch) {
    const slug = serviceMatch[1];
    if (SERVICE_EXCLUDED_SLUGS.has(slug)) return { type: 'unknown' };
    if (SERVICE_NICHE_SLUGS.has(slug))    return { type: 'unknown' }; // caught above
    return { type: 'service', slug };
  }

  return { type: 'unknown' };
}

// ─── OG block builder ─────────────────────────────────────────────────────────

/**
 * Build a complete <head> social meta block for any page type.
 *
 * @param {object} opts
 * @param {string} opts.fullTitle       - complete title (e.g. "Bodas | Ideas Estudio")
 * @param {string} opts.rawTitle        - short title for alt text (without site name)
 * @param {string} opts.description     - meta description
 * @param {string} opts.image           - proxied OG image URL (WebP 1200×630)
 * @param {string} opts.canonical       - canonical page URL
 * @param {string} opts.ogType          - 'website' or 'article'
 * @param {string} opts.articleTagsHtml - article:* meta tags string, or '' for non-articles
 * @param {string} opts.schemaJson      - serialized JSON-LD schema
 * @param {string} opts.pathLabel       - pathname for the debug comment
 */
function buildOgBlock({ fullTitle, rawTitle, description, image, canonical, ogType, articleTagsHtml, schemaJson, pathLabel }) {
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
    <meta property="og:image:alt"          content="${esc(rawTitle)}" />${articleSection}
    <!-- ── Twitter / X Card ─────────────────────────────────────── -->
    <meta name="twitter:card"        content="summary_large_image" />
    <meta name="twitter:site"        content="${TWITTER_HANDLE}" />
    <meta name="twitter:creator"     content="${TWITTER_HANDLE}" />
    <meta name="twitter:title"       content="${esc(fullTitle)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image"       content="${image}" />
    <meta name="twitter:image:alt"   content="${esc(rawTitle)}" />

    <!-- ── Pinterest ─────────────────────────────────────────────── -->
    <meta name="pinterest-rich-pin" content="true" />

    <!-- ── iMessage / generic link preview ──────────────────────── -->
    <link rel="image_src" href="${image}" />

    <!-- ── JSON-LD ───────────────────────────────────────────────── -->
    <script type="application/ld+json">${schemaJson}</script>`;
}

// ─── Per-route OG options preparers ──────────────────────────────────────────

/**
 * Prepare OG opts for a static page.
 * Priority (title / description / image):
 *   1. CMS seoEntry configured for this path  ← source of truth
 *   2. STATIC_PAGE_META hard-coded fallback
 *   3. DEFAULT_SITE_IMAGE
 *
 * @param {object}      meta      - from STATIC_PAGE_META
 * @param {string}      pathname  - normalized path
 * @param {object|null} seoEntry  - from /public/seo?path= (may be null)
 */
function prepStaticPage(meta, pathname, seoEntry) {
  const e = seoEntry || {};

  // ── Title ──────────────────────────────────────────────────────────────────
  const entryTitle = e.og_title || e.seo_title;
  let fullTitle;
  if (entryTitle) {
    fullTitle = entryTitle.includes(SITE_NAME) ? entryTitle : `${entryTitle} | ${SITE_NAME}`;
  } else {
    fullTitle = meta.title; // already has "| Ideas Estudio" in the registry
  }
  const rawTitle = fullTitle
    .replace(` | ${SITE_NAME}`, '')
    .replace(`${SITE_NAME} | `, '');

  // ── Description ────────────────────────────────────────────────────────────
  const description = e.og_description || e.meta_description || meta.description;

  // ── Canonical ──────────────────────────────────────────────────────────────
  const canonical = e.canonical_url || `${SITE_URL}${pathname === '/' ? '' : pathname}`;

  // ── Image — seoEntry wins over static default ──────────────────────────────
  const rawImage =
    pickImage(e, SEO_ENTRY_IMAGE_FIELDS) ||
    absoluteUrl(meta.image)              ||
    DEFAULT_SITE_IMAGE;
  const imageVer = getSocialImageVersion(e); // null for entries without timestamps
  const image    = resolveAndProxy(rawImage, imageVer);

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type':    'WebPage',
    name:        fullTitle,
    description,
    url:         canonical,
    publisher: {
      '@type': 'Organization',
      name:     SITE_NAME,
      url:      SITE_URL,
      logo:   { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg` },
    },
  });

  return {
    fullTitle,
    rawTitle,
    description,
    image,
    canonical,
    ogType:          'website',
    articleTagsHtml: '',
    schemaJson:      schema,
    pathLabel:       pathname,
  };
}

/**
 * Prepare OG opts for a blog article.
 * Priority for image:
 *   1. Post's own image fields (seo_image_url → og_image_url → … → image_url)
 *   2. SEO entry configured for /blog/:slug
 *   3. DEFAULT_SITE_IMAGE
 *
 * @param {object}      post      - raw CRM article (snake_case fields)
 * @param {string}      slug
 * @param {object|null} seoEntry  - from /public/seo?path=/blog/:slug (may be null)
 */
function prepBlogPost(post, slug, seoEntry) {
  const e = seoEntry || {};

  const rawTitle  = e.og_title || e.seo_title || post.meta_title || post.title || 'Blog | Ideas Estudio';
  const fullTitle = rawTitle.includes(SITE_NAME) ? rawTitle : `${rawTitle} | ${SITE_NAME}`;
  const description = e.og_description || e.meta_description || post.meta_description || post.excerpt ||
    `Lee "${rawTitle}" en el blog de ${SITE_NAME}.`;

  // Image: post fields first (more specific), then SEO entry fallback
  const rawImage =
    pickImage(post, BLOG_IMAGE_FIELDS) ||
    pickImage(e, SEO_ENTRY_IMAGE_FIELDS) ||
    DEFAULT_SITE_IMAGE;
  const imageVer     = getSocialImageVersion(post) || getSocialImageVersion(e);
  const image        = resolveAndProxy(rawImage, imageVer);
  const canonical    = e.canonical_url || `${SITE_URL}/blog/${slug}`;

  const publishedAt  = post.published_at || post.publish_at || post.created_at || '';
  const modifiedAt   = post.updated_at   || publishedAt;
  const authorName   = post.author?.name || post.author_name || SITE_NAME;
  const category     = post.category?.name || post.category_name || 'Blog';
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
    headline:    rawTitle,
    description,
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
    fullTitle,
    rawTitle,
    description,
    image,
    canonical,
    ogType:          'article',
    articleTagsHtml: articleLines,
    schemaJson:      schema,
    pathLabel:       `/blog/${slug}`,
  };
}

/**
 * Prepare OG opts for a portfolio project item.
 * Priority for image:
 *   1. Project's own image fields
 *   2. SEO entry configured for /portafolio/:slug
 *   3. DEFAULT_SITE_IMAGE
 *
 * @param {object}      item      - raw CRM portfolio item (snake_case fields)
 * @param {string}      slug
 * @param {object|null} seoEntry  - from /public/seo?path=/portafolio/:slug (may be null)
 */
function prepPortfolioItem(item, slug, seoEntry) {
  const e = seoEntry || {};

  const rawTitle    = e.og_title || e.seo_title || item.title || 'Proyecto | Portafolio';
  const fullTitle   = `${rawTitle} | ${SITE_NAME}`;
  const description = e.og_description || e.meta_description || item.description ||
    `Proyecto creativo realizado por ${SITE_NAME} en Puerto Rico.`;

  const rawImage =
    pickImage(item, PORTFOLIO_IMAGE_FIELDS, { includeMediaUrls: true }) ||
    pickImage(e, SEO_ENTRY_IMAGE_FIELDS)                                 ||
    DEFAULT_SITE_IMAGE;
  const imageVer  = getSocialImageVersion(item) || getSocialImageVersion(e);
  const image     = resolveAndProxy(rawImage, imageVer);
  const canonical = e.canonical_url || `${SITE_URL}/portafolio/${slug}`;

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type':    'CreativeWork',
    name:        rawTitle,
    description,
    image:       [image],
    url:         canonical,
    creator: {
      '@type': 'Organization',
      name:     SITE_NAME,
      url:      SITE_URL,
    },
  });

  return {
    fullTitle,
    rawTitle,
    description,
    image,
    canonical,
    ogType:          'website',
    articleTagsHtml: '',
    schemaJson:      schema,
    pathLabel:       `/portafolio/${slug}`,
  };
}

/**
 * Prepare OG opts for a service product detail page.
 * Priority for image:
 *   1. Service's own image fields
 *   2. SEO entry configured for /servicios/:slug
 *   3. SERVICES_IMAGE fallback
 *
 * @param {object}      service   - raw CRM service (snake_case fields)
 * @param {string}      slug
 * @param {object|null} seoEntry  - from /public/seo?path=/servicios/:slug (may be null)
 */
function prepServicePage(service, slug, seoEntry) {
  const e = seoEntry || {};

  const rawTitle    = e.og_title || e.seo_title || service.name || 'Servicio';
  const fullTitle   = `${rawTitle} | ${SITE_NAME}`;
  const description = e.og_description || e.meta_description ||
    service.short_description || service.description ||
    `Contrata ${rawTitle} con ${SITE_NAME} en Puerto Rico.`;

  const rawImage =
    pickImage(service, SERVICE_IMAGE_FIELDS)  ||
    pickImage(e, SEO_ENTRY_IMAGE_FIELDS)      ||
    SERVICES_IMAGE;
  const image     = resolveAndProxy(rawImage, null);
  const canonical = e.canonical_url || `${SITE_URL}/servicios/${slug}`;

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type':    'Service',
    name:        rawTitle,
    description,
    image:       [image],
    url:         canonical,
    provider: {
      '@type': 'Organization',
      name:     SITE_NAME,
      url:      SITE_URL,
    },
  });

  return {
    fullTitle,
    rawTitle,
    description,
    image,
    canonical,
    ogType:          'website',
    articleTagsHtml: '',
    schemaJson:      schema,
    pathLabel:       `/servicios/${slug}`,
  };
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    '/',
    '/blog',
    '/blog/:slug+',
    '/servicios',
    '/servicios/:slug+',
    '/portafolio',
    '/portafolio/:slug+',
    '/contacto',
    '/equipo',
    '/pequenos-negocios',
    '/emprendedores',
    '/empresas-emergentes',
    '/bodas-eventos-sesiones',
  ],
};

export default async function middleware(request) {
  const url = new URL(request.url);

  // Normalize pathname: strip trailing slash (keep bare '/')
  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  // Skip asset/file requests (e.g. /favicon.svg, /robots.txt)
  if (pathname.includes('.')) return undefined;

  const { type, slug, staticMeta } = classifyRoute(pathname);
  if (type === 'unknown') return undefined;

  const crmBase = (process.env.VITE_CRM_BASE_URL || '').replace(/\/+$/, '');

  const controller = new AbortController();
  const timerId    = setTimeout(() => controller.abort(), 5000);

  try {
    const indexUrl = new URL('/index.html', url.origin).toString();
    let html   = null;
    let ogOpts = null;

    // ── Static pages — fetch index.html + SEO entry concurrently ─────────────
    if (type === 'static') {
      const [htmlRes, seoEntry] = await Promise.all([
        fetch(indexUrl, { signal: controller.signal }),
        // SEO entry is best-effort: silently returns null if crmBase missing or call fails
        fetchPageSeoEntry(crmBase, pathname, controller.signal),
      ]);
      clearTimeout(timerId);

      if (!htmlRes.ok) return undefined;
      html   = await htmlRes.text();
      ogOpts = prepStaticPage(staticMeta, pathname, seoEntry);

    // ── Dynamic pages — fetch index.html + CRM API + SEO entry concurrently ──
    } else {
      if (!crmBase) {
        clearTimeout(timerId);
        return undefined;
      }

      let apiUrl;
      let seoPath; // path to look up the SEO entry for this dynamic page

      if (type === 'blog') {
        apiUrl  = `${crmBase}/api/blog/posts/${encodeURIComponent(slug)}`;
        seoPath = `/blog/${slug}`;
      } else if (type === 'portfolio') {
        apiUrl  = `${crmBase}/portfolio?is_published=true&slug=${encodeURIComponent(slug)}`;
        seoPath = `/portafolio/${slug}`;
      } else if (type === 'service') {
        apiUrl  = `${crmBase}/services/${encodeURIComponent(slug)}`;
        seoPath = `/servicios/${slug}`;
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

      if (type === 'blog') {
        const post = data?.item || null;
        if (!post) return undefined; // let SPA handle 404
        ogOpts = prepBlogPost(post, slug, seoEntry);

      } else if (type === 'portfolio') {
        const items = Array.isArray(data?.items) ? data.items
                    : Array.isArray(data)         ? data
                    : [];
        // Filter by slug in case API returned multiple / didn't support slug filter
        const item = items.find(i => i.slug === slug) || items[0] || null;
        if (!item) return undefined;
        ogOpts = prepPortfolioItem(item, slug, seoEntry);

      } else if (type === 'service') {
        const service = data?.item || (data && !data.items ? data : null);
        if (!service) return undefined;
        ogOpts = prepServicePage(service, slug, seoEntry);
      }
    }

    if (!ogOpts || !html) return undefined;

    // ── Inject OG block before </head> ────────────────────────────────────────
    const ogBlock = buildOgBlock(ogOpts);

    // Remove any existing <title> to avoid duplicates
    html = html.replace(/<title>[^<]*<\/title>/i, '');
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
    // On any error (timeout, network, parse) fall through to normal SPA serving
    return undefined;
  }
}
