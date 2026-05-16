const SITE_URL = "https://ideasestudio.com";

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    name: "Ideas Estudio",
    url: SITE_URL,
    logo: "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/logos/favicon_ideasestudio.webp",
    description:
      "Agencia creativa en Puerto Rico especializada en fotografía, diseño gráfico, video y branding.",
    areaServed: "Puerto Rico",
    addressRegion: "Puerto Rico",
    addressCountry: "US",
    sameAs: [
      "https://www.instagram.com/ideasestudio.pr",
    ],
  };
}

export function buildServiceSchema(service) {
  if (!service) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.shortDescription || service.longDescription || "",
    url: `${SITE_URL}/servicios/${service.slug}`,
    provider: { "@type": "Organization", name: "Ideas Estudio", url: SITE_URL },
    areaServed: "Puerto Rico",
    ...(service.price
      ? {
          offers: {
            "@type": "Offer",
            price: String(service.price),
            priceCurrency: service.currency || "USD",
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  };
}

export function buildBreadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildArticleSchema(post) {
  if (!post) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title || post.meta_title || "",
    description: post.meta_description || post.excerpt || "",
    url: `${SITE_URL}/blog/${post.slug}`,
    image: post.og_image_url || post.featured_image_url || "",
    datePublished: post.publish_at || post.created_at || "",
    dateModified: post.updated_at || post.publish_at || "",
    author: post.author
      ? { "@type": "Person", name: post.author.name || post.author.display_name || "Ideas Estudio" }
      : { "@type": "Organization", name: "Ideas Estudio" },
    publisher: {
      "@type": "Organization",
      name: "Ideas Estudio",
      url: SITE_URL,
    },
  };
}
