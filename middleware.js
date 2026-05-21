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
 * Route strategy:
 *   Static routes       — metadata from STATIC_PAGE_META (no API call)
 *   /blog/:slug         — fetch article from CRM API
 *   /portafolio/:slug   — fetch portfolio item from CRM API (?slug= filter)
 *   /servicios/:slug    — fetch service product from CRM API
 *
 * On any error (timeout, CRM down, not found) the middleware returns
 * undefined so Vercel falls through to the normal SPA route (index.html).
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const SITE_URL       = 'https://www.ideasestudio.com';
const SITE_NAME      = 'Ideas Estudio';
const TWITTER_HANDLE = '@ideasestudio';

/**
 * Default site-level OG image — a real brand photo from the public-web bucket.
 * Used for static pages that don't have a more specific image.
 * All images go through /api/og-image which strips x-robots-tag: none from Supabase
 * and transforms to WebP 1200×630.
 */
const DEFAULT_SITE_IMAGE =
  'https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/public-web/presencia-visual.webp';

const SERVICES_IMAGE =
  'https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/public-web/marca-negocio.webp';

// ─── Static page metadata registry ───────────────────────────────────────────
// Keys are normalized pathnames (no trailing slash).
// title: complete display title (already includes " | Ideas Estudio" where needed)
// image: Supabase or absolute URL — will be routed through /api/og-image proxy

const STATIC_PAGE_META = {
  // ── Core pages ──────────────────────────────────────────────────────────────
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

  // ── Client niche routes ──────────────────────────────────────────────────────
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

  // ── Service niche pages (/servicios/:nicheSlug) ─────────────────────────────
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

// Slugs under /servicios/ that are static niche pages (not CRM service products)
const SERVICE_NICHE_SLUGS = new Set([
  'marca-o-negocio',
  'presencia-visual-profesional',
  'momento-especial',
  'solucion-creativa',
]);

// Slugs under /servicios/ to skip (no OG injection needed)
const SERVICE_EXCLUDED_SLUGS = new Set(['checkout']);

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
 * Social image priority for an article (blog post).
 * Tries fields in order; never returns null (falls back to DEFAULT_SITE_IMAGE).
 */
function getArticleSocialImage(post) {
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
  return DEFAULT_SITE_IMAGE;
}

/**
 * Derives a stable version token from the article's update/publish timestamp or ID.
 * Used as ?v= so caching scrapers treat a changed image as a new resource.
 */
function getSocialImageVersion(post) {
  const raw =
    post?.updated_at  ||
    post?.published_at ||
    post?.publish_at  ||
    post?.created_at  ||
    post?.id;
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
 * Strips x-robots-tag: none (Supabase) and converts to WebP 1200x630.
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

// ─── Route classifier ─────────────────────────────────────────────────────────

/**
 * Classify an incoming pathname into a route type.
 * @param {string} pathname - normalized pathname (no trailing slash, e.g. '/blog/my-slug')
 * @returns {{ type: string, slug?: string, staticMeta?: object }}
 */
function classifyRoute(pathname) {
  // Static registry (exact match first — catches niche pages under /servicios/)
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
    if (SERVICE_NICHE_SLUGS.has(slug))    return { type: 'unknown' }; // should be in static registry
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

/** Prepare OG opts for a static page (no API data needed). */
function prepStaticPage(meta, pathname) {
  // title already includes " | Ideas Estudio" in the registry
  const fullTitle = meta.title;
  // rawTitle: strip " | Ideas Estudio" or "Ideas Estudio | " suffixes
  const rawTitle  = fullTitle
    .replace(` | ${SITE_NAME}`, '')
    .replace(`${SITE_NAME} | `, '');

  // Proxy the image (no version for static pages — they don't have a timestamp)
  const image    = buildProxyImageUrl(meta.image, null);
  const canonical = `${SITE_URL}${pathname === '/' ? '' : pathname}`;

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type':    'WebPage',
    name:        fullTitle,
    description: meta.description,
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
    description:    meta.description,
    image,
    canonical,
    ogType:         'website',
    articleTagsHtml: '',
    schemaJson:     schema,
    pathLabel:      pathname,
  };
}

/** Prepare OG opts for a blog article (fetched from CRM API). */
function prepBlogPost(post, slug) {
  const rawTitle  = post.meta_title || post.title || 'Blog | Ideas Estudio';
  const fullTitle = rawTitle.includes(SITE_NAME) ? rawTitle : `${rawTitle} | ${SITE_NAME}`;
  const description = post.meta_description || post.excerpt ||
    `Lee "${rawTitle}" en el blog de ${SITE_NAME}.`;

  const rawImage     = getArticleSocialImage(post);
  const imageVer     = getSocialImageVersion(post);
  const versionedRaw = addImageCacheBust(rawImage, imageVer);
  const image        = buildProxyImageUrl(versionedRaw, imageVer);
  const canonical    = `${SITE_URL}/blog/${slug}`;

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
 * Prepare OG opts for a portfolio project item (raw API response — snake_case fields).
 * Note: the API returns snake_case (cover_url, home_cover_url, etc.) since this
 * is the raw CRM response, not the normalized client-side version.
 */
function prepPortfolioItem(item, slug) {
  const rawTitle   = item.title || 'Proyecto | Portafolio';
  const fullTitle  = `${rawTitle} | ${SITE_NAME}`;
  const description = item.description ||
    `Proyecto creativo realizado por ${SITE_NAME} en Puerto Rico.`;

  const rawImage  = absoluteUrl(
    item.home_cover_url || item.portfolio_cover_url || item.cover_url ||
    (Array.isArray(item.media_urls) ? item.media_urls[0] : null)
  ) || DEFAULT_SITE_IMAGE;
  const imageVer     = getSocialImageVersion(item);
  const versionedRaw = addImageCacheBust(rawImage, imageVer);
  const image        = buildProxyImageUrl(versionedRaw, imageVer);
  const canonical    = `${SITE_URL}/portafolio/${slug}`;

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
 * Prepare OG opts for a service product page (raw API response — snake_case fields).
 */
function prepServicePage(service, slug) {
  const rawTitle   = service.name || 'Servicio';
  const fullTitle  = `${rawTitle} | ${SITE_NAME}`;
  const description = service.short_description || service.description ||
    `Contrata ${rawTitle} con ${SITE_NAME} en Puerto Rico.`;

  const rawImage = absoluteUrl(
    service.cover_image || service.cover_image_url ||
    service.hero_image  || service.image_url
  ) || DEFAULT_SITE_IMAGE;
  const image     = buildProxyImageUrl(rawImage, null);
  const canonical = `${SITE_URL}/servicios/${slug}`;

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
    // Core pages
    '/',
    '/blog',
    '/blog/:slug+',
    '/servicios',
    '/servicios/:slug+',
    '/portafolio',
    '/portafolio/:slug+',
    '/contacto',
    '/equipo',
    // Client niche landing pages
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

  // Dynamic routes require the CRM API base URL
  if (type !== 'static' && !crmBase) return undefined;

  const controller = new AbortController();
  const timerId    = setTimeout(() => controller.abort(), 5000);

  try {
    const indexUrl = new URL('/index.html', url.origin).toString();
    let html   = null;
    let ogOpts = null;

    // ── Static pages — only fetch index.html ──────────────────────────────────
    if (type === 'static') {
      const htmlRes = await fetch(indexUrl, { signal: controller.signal });
      clearTimeout(timerId);
      if (!htmlRes.ok) return undefined;
      html   = await htmlRes.text();
      ogOpts = prepStaticPage(staticMeta, pathname);

    // ── Dynamic pages — fetch API + index.html concurrently ───────────────────
    } else {
      let apiUrl;
      if (type === 'blog') {
        apiUrl = `${crmBase}/api/blog/posts/${encodeURIComponent(slug)}`;
      } else if (type === 'portfolio') {
        // Try filtering by slug server-side; if unsupported, use first result
        apiUrl = `${crmBase}/portfolio?is_published=true&slug=${encodeURIComponent(slug)}`;
      } else if (type === 'service') {
        apiUrl = `${crmBase}/services/${encodeURIComponent(slug)}`;
      }

      const [apiRes, htmlRes] = await Promise.all([
        fetch(apiUrl, { signal: controller.signal, headers: { Accept: 'application/json' } }),
        fetch(indexUrl, { signal: controller.signal }),
      ]);
      clearTimeout(timerId);

      if (!htmlRes.ok) return undefined;
      html = await htmlRes.text();

      const data = apiRes.ok ? await apiRes.json().catch(() => null) : null;

      if (type === 'blog') {
        const post = data?.item || null;
        if (!post) return undefined; // let SPA handle 404
        ogOpts = prepBlogPost(post, slug);

      } else if (type === 'portfolio') {
        // API may return { items: [...] } or a plain array
        const items = Array.isArray(data?.items) ? data.items
                    : Array.isArray(data)         ? data
                    : [];
        // Filter by slug in case API returned multiple / didn't support slug filter
        const item = items.find(i => i.slug === slug) || items[0] || null;
        if (!item) return undefined;
        ogOpts = prepPortfolioItem(item, slug);

      } else if (type === 'service') {
        const service = data?.item || (data && !data.items ? data : null);
        if (!service) return undefined;
        ogOpts = prepServicePage(service, slug);
      }
    }

    if (!ogOpts || !html) return undefined;

    // ── Inject OG block ────────────────────────────────────────────────────────
    const ogBlock = buildOgBlock(ogOpts);

    // Remove any existing <title> to avoid duplicates (we inject a new one)
    html = html.replace(/<title>[^<]*<\/title>/i, '');

    // Inject immediately before </head>
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
