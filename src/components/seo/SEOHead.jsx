import { Helmet } from "react-helmet-async";
import { getArticleSocialImage, getSocialImageVersion, addImageCacheBust } from "@/lib/socialMeta.js";

const SITE_URL  = "https://www.ideasestudio.com";
const SITE_NAME = "Ideas Estudio";
const TWITTER_HANDLE = "@ideasestudio";

const DEFAULT_TITLE = "Ideas Estudio | La idea que tu negocio necesita";
const DEFAULT_DESCRIPTION =
  "Fotografía profesional, diseño, video y branding en Puerto Rico. La agencia creativa que impulsa tu marca, negocio o evento especial.";

/**
 * Default OG image for pages that don't supply an article cover.
 * This is the brand/site social card — NOT the favicon.
 * Replace with a proper 1200×630 image when available.
 */
const DEFAULT_OG_IMAGE =
  "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/logos/favicon_ideasestudio.webp";

export default function SEOHead({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  /** Explicit OG image URL (already resolved by the caller). */
  ogImage,
  /**
   * Article/post object. When provided, the social image is resolved via
   * the priority chain: seo_image_url → og_image_url → cover_url → featured_image_url → …
   */
  post,
  ogType = "website",
  twitterTitle,
  twitterDescription,
  twitterImage,
  noIndex = false,
  noFollow = false,
  jsonLd,
  seoEntry,
}) {
  const e = seoEntry || {};

  const rawTitle = e.seo_title || title;
  const fullTitle =
    !rawTitle || rawTitle.includes(SITE_NAME)
      ? rawTitle || DEFAULT_TITLE
      : `${rawTitle} | ${SITE_NAME}`;

  const metaDescription = e.meta_description || description || DEFAULT_DESCRIPTION;
  const resolvedCanonical = e.canonical_url || canonical;
  const resolvedOgTitle = e.og_title || ogTitle || fullTitle;
  const resolvedOgDescription = e.og_description || ogDescription || metaDescription;

  // For article pages the caller passes the full `post` object so we resolve
  // the image via the priority chain and apply a stable cache-busting token.
  // For non-article pages (no post) we skip cache-busting to keep URLs clean.
  const rawOgImage =
    e.og_image_url ||
    (post ? getArticleSocialImage(post, DEFAULT_OG_IMAGE) : null) ||
    ogImage ||
    DEFAULT_OG_IMAGE;

  const imageVersion = post ? getSocialImageVersion(post) : null;
  const resolvedOgImage = addImageCacheBust(rawOgImage, imageVersion);

  const resolvedTwitterTitle = e.twitter_title || twitterTitle || resolvedOgTitle;
  const resolvedTwitterDescription = e.twitter_description || twitterDescription || resolvedOgDescription;
  const resolvedTwitterImage =
    e.twitter_image_url ||
    twitterImage ||
    resolvedOgImage;

  const resolvedNoIndex = e.robots_index === false ? true : noIndex;
  const resolvedNoFollow = e.robots_follow === false ? true : noFollow;
  const robotsContent = [
    resolvedNoIndex  ? "noindex"  : "index",
    resolvedNoFollow ? "nofollow" : "follow",
    "max-image-preview:large",
  ].join(", ");

  let extraSchema = null;
  if (e.schema_json && typeof e.schema_json === "object" && Object.keys(e.schema_json).length > 0) {
    extraSchema = e.schema_json;
  }
  const localJsonLdArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  const jsonLdArray = extraSchema ? [extraSchema, ...localJsonLdArray] : localJsonLdArray;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="robots" content={robotsContent} />
      {resolvedCanonical && <link rel="canonical" href={resolvedCanonical} />}

      {/* Open Graph — WhatsApp, Facebook, Messenger, LinkedIn, Telegram, Discord, Slack */}
      <meta property="og:locale"           content="es_PR" />
      <meta property="og:site_name"        content={SITE_NAME} />
      <meta property="og:type"             content={ogType} />
      <meta property="og:title"            content={resolvedOgTitle} />
      <meta property="og:description"      content={resolvedOgDescription} />
      <meta property="og:image"            content={resolvedOgImage} />
      <meta property="og:image:secure_url" content={resolvedOgImage} />
      <meta property="og:image:width"      content="1200" />
      <meta property="og:image:height"     content="630" />
      <meta property="og:image:alt"        content={rawTitle || SITE_NAME} />
      {resolvedCanonical && <meta property="og:url" content={resolvedCanonical} />}

      {/* Twitter / X Card */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:site"        content={TWITTER_HANDLE} />
      <meta name="twitter:creator"     content={TWITTER_HANDLE} />
      <meta name="twitter:title"       content={resolvedTwitterTitle} />
      <meta name="twitter:description" content={resolvedTwitterDescription} />
      <meta name="twitter:image"       content={resolvedTwitterImage} />
      <meta name="twitter:image:alt"   content={rawTitle || SITE_NAME} />

      {/* Pinterest */}
      <meta name="pinterest-rich-pin" content="true" />

      {/* iMessage / generic link preview */}
      <link rel="image_src" href={resolvedOgImage} />

      {/* JSON-LD */}
      {jsonLdArray.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
