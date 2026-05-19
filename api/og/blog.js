const SITE_URL = "https://www.ideasestudio.com";
const SITE_NAME = "Ideas Estudio";
const DEFAULT_OG_IMAGE =
  "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/logos/favicon_ideasestudio.webp";

function esc(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function apiBase() {
  const base = process.env.VITE_CRM_BASE_URL || process.env.API_BASE_URL || "";
  return base.replace(/\/+$/, "");
}

function ogImage(post) {
  // Prefer SEO-specific og_image, then featured image, then site default
  return post?.og_image_url || post?.featured_image_url || DEFAULT_OG_IMAGE;
}

function imageType(url = "") {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export default async function handler(req, res) {
  const slug = String(req.query.slug || "").replace(/^\/+|\/+$/g, "");

  if (!slug) {
    res.status(400).send("Missing slug");
    return;
  }

  const canonicalUrl = `${SITE_URL}/blog/${encodeURIComponent(slug)}`;
  const base = apiBase();

  let post = null;
  if (base) {
    try {
      const r = await fetch(`${base}/api/blog/posts/${encodeURIComponent(slug)}`);
      if (r.ok) {
        const data = await r.json();
        post = data?.item ?? data?.post ?? data;
      }
    } catch {
      // serve fallback OG on network error
    }
  }

  const title =
    post?.meta_title ||
    post?.og_title ||
    post?.title ||
    `${SITE_NAME} | La idea que tu negocio necesita`;

  const description =
    post?.meta_description ||
    post?.og_description ||
    post?.excerpt ||
    post?.subtitle ||
    "Fotografía profesional, diseño, video y branding en Puerto Rico.";

  const image = ogImage(post);
  const imgType = imageType(image);

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <link rel="canonical" href="${esc(canonicalUrl)}" />
  <meta name="description" content="${esc(description)}" />

  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="${esc(SITE_NAME)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(canonicalUrl)}" />
  <meta property="og:image" content="${esc(image)}" />
  <meta property="og:image:secure_url" content="${esc(image)}" />
  <meta property="og:image:type" content="${esc(imgType)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${esc(title)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(image)}" />

  <meta http-equiv="refresh" content="0;url=${esc(canonicalUrl)}" />
</head>
<body>
  <a href="${esc(canonicalUrl)}">${esc(title)}</a>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=86400");
  res.status(200).send(html);
}
