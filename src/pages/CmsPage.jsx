import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead.jsx";
import { getPublicPage } from "@/lib/seoApi.js";
import NotFoundPage from "@/pages/NotFoundPage.jsx";

export default function CmsPage() {
  const { pathname } = useLocation();
  const [page, setPage] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    let active = true;
    setPage(undefined);
    getPublicPage(pathname).then((p) => {
      if (active) setPage(p && p.status === "published" ? p : null);
    });
    return () => { active = false; };
  }, [pathname]);

  if (page === undefined) return <div className="page-loading" />;
  if (page === null) return <NotFoundPage />;

  const { hero_title, hero_subtitle, hero_image_url, content_json = [], seo_entry } = page;

  return (
    <>
      <SEOHead seoEntry={seo_entry} title={page.title} />

      {(hero_title || hero_image_url) && (
        <section className="page-hero" style={hero_image_url ? { backgroundImage: `url(${hero_image_url})` } : undefined}>
          <div className="container page-hero__inner">
            <h1 className="page-title">{hero_title || page.title}</h1>
            {hero_subtitle && <p className="page-subtitle">{hero_subtitle}</p>}
          </div>
        </section>
      )}

      {!hero_title && !hero_image_url && (
        <section className="page-hero">
          <div className="container page-hero__inner">
            <h1 className="page-title">{page.title}</h1>
            {page.excerpt && <p className="page-subtitle">{page.excerpt}</p>}
          </div>
        </section>
      )}

      {content_json.length > 0 && (
        <section className="section">
          <div className="container cms-content">
            {content_json.map((block, i) => (
              <CmsBlock key={i} block={block} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function CmsBlock({ block }) {
  if (block.type === "heading") {
    return <h2 className="cms-heading">{block.text}</h2>;
  }
  if (block.type === "paragraph") {
    return <p className="cms-paragraph">{block.text}</p>;
  }
  if (block.type === "image") {
    return (
      <figure className="cms-figure">
        <img src={block.url} alt={block.alt || ""} className="cms-image" loading="lazy" />
      </figure>
    );
  }
  if (block.type === "cta") {
    return (
      <div className="cms-cta">
        <Link to={block.href} className="btn btn--primary">
          {block.label}
        </Link>
      </div>
    );
  }
  return null;
}
