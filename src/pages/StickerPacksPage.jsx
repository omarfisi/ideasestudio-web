import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead.jsx";
import { getPublicProductCategories } from "@/lib/api.js";
import "./StickerCatalogPages.css";

export default function StickerPacksPage() {
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getPublicProductCategories()
      .then((items) => { if (!cancelled) setCollections(Array.isArray(items) ? items : []); })
      .catch(() => { if (!cancelled) setCollections([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="jj-catalog-page jj-packs-page">
      <SEOHead title="Packs por colección | JJ Pega" description="Descubre los packs de stickers JJ Pega organizados por colección." />
      <header className="jj-catalog-banner jj-packs-banner">
        <img src="/assets/jj-high-quality/packs-colecciones-banner.png" alt="Packs por colección de JJ Pega" />
      </header>
      <section className="jj-collection-intro"><h2>Escoge tu colección</h2><p>Los packs se construirán alrededor de estas colecciones para que encuentres varios diseños que combinan entre sí.</p></section>
      <section className="jj-collection-grid">
        {collections.map((collection, index) => (
          <article className={`jj-collection-card jj-collection-card--${index % 4}`} key={collection.id || collection.slug}>
            <img src={collection.imageUrl || collection.image_url || "/assets/jj-high-quality/category-1.webp"} alt="" loading="lazy" />
            <div><span>Colección {String(index + 1).padStart(2, "0")}</span><h2>{collection.name}</h2><p>{collection.description || "Diseños para combinar y compartir."}</p><Link to={`/servicios?category=${encodeURIComponent(collection.slug)}`}>Ver diseños de la colección →</Link></div>
          </article>
        ))}
      </section>
      {!collections.length ? <p className="jj-catalog-message">Las colecciones se están preparando. Muy pronto podrás ver los packs disponibles.</p> : null}
      <div className="jj-catalog-footer"><span>Mientras tanto, arma tu propia combinación.</span><Link to="/stickers-individuales">Ver stickers individuales →</Link></div>
    </main>
  );
}
