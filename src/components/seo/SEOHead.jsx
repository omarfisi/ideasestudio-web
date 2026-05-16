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
}) {
  const fullTitle =
    !title || title.includes(SITE_NAME)
      ? title || DEFAULT_TITLE
      : `${title} | ${SITE_NAME}`;

  const metaDescription = description || DEFAULT_DESCRIPTION;
  const resolvedOgImage = ogImage || DEFAULT_OG_IMAGE;
  const robotsContent = [noIndex ? "noindex" : "index", noFollow ? "nofollow" : "follow"].join(", ");
  const jsonLdArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="robots" content={robotsContent} />
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={ogTitle || fullTitle} />
      <meta property="og:description" content={ogDescription || metaDescription} />
      <meta property="og:image" content={resolvedOgImage} />
      {canonical && <meta property="og:url" content={canonical} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={twitterTitle || ogTitle || fullTitle} />
      <meta name="twitter:description" content={twitterDescription || ogDescription || metaDescription} />
      <meta name="twitter:image" content={twitterImage || resolvedOgImage} />

      {/* JSON-LD */}
      {jsonLdArray.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
