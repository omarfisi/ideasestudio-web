const SITE_URL = "https://jjpega.com";

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    name: "JJ Pega",
    url: SITE_URL,
    logo: "https://jjpega.com/assets/jj-high-quality/trimmed/logo-header.webp",
    description:
      "Tienda de stickers, diseños personalizados y buenas vibras.",
    areaServed: "Puerto Rico",
    addressRegion: "Puerto Rico",
    addressCountry: "US",
    sameAs: [],
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
    provider: { "@type": "Organization", name: "JJ Pega", url: SITE_URL },
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

export function buildCreativeWorkSchema(project) {
  if (!project) return null;
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title || "",
    description: project.description || "",
    image: project.homeCoverUrl || project.portfolioCoverUrl || project.coverUrl || project.mediaUrls?.[0] || "",
    url: `${SITE_URL}/portafolio/${project.slug}`,
    creator: { "@type": "Organization", name: "JJ Pega", url: SITE_URL },
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
      ? { "@type": "Person", name: post.author.name || post.author.display_name || "JJ Pega" }
      : { "@type": "Organization", name: "JJ Pega" },
    publisher: {
      "@type": "Organization",
      name: "JJ Pega",
      url: SITE_URL,
    },
  };
}
