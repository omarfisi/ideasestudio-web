import { Helmet } from "react-helmet-async";

const SITE_NAME = "Ideas Estudio";
const DEFAULT_TITLE = "Ideas Estudio | La idea que tu negocio necesita";
const DEFAULT_DESCRIPTION =
  "Fotografía profesional, diseño, video y branding en Puerto Rico. La agencia creativa que impulsa tu marca, negocio o evento especial.";
const DEFAULT_OG_IMAGE =
  "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/logos/favicon_ideasestudio.webp";

export default function SEOHead({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  ogImage,
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
  const resolvedOgImage = e.og_image_url || ogImage || DEFAULT_OG_IMAGE;
  const resolvedTwitterTitle = e.twitter_title || twitterTitle || resolvedOgTitle;
  const resolvedTwitterDescription = e.twitter_description || twitterDescription || resolvedOgDescription;
  const resolvedTwitterImage = e.twitter_image_url || twitterImage || resolvedOgImage;
  const resolvedNoIndex = e.robots_index === false ? true : noIndex;
  const resolvedNoFollow = e.robots_follow === false ? true : noFollow;
  const robotsContent = [resolvedNoIndex ? "noindex" : "index", resolvedNoFollow ? "nofollow" : "follow"].join(", ");

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

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={resolvedOgTitle} />
      <meta property="og:description" content={resolvedOgDescription} />
      <meta property="og:image" content={resolvedOgImage} />
      {resolvedCanonical && <meta property="og:url" content={resolvedCanonical} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTwitterTitle} />
      <meta name="twitter:description" content={resolvedTwitterDescription} />
      <meta name="twitter:image" content={resolvedTwitterImage} />

      {/* JSON-LD */}
      {jsonLdArray.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
