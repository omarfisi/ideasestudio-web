import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import SEOHead from "@/components/seo/SEOHead.jsx";
import { getPublicProducts } from "@/lib/api.js";
import { formatPrice } from "@/lib/formatPrice.js";
import "@/components/store/ShopProductCard.css";
import "./StickerCatalogPages.css";

export default function StickerIndividualsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getPublicProducts({ productType: "physical", limit: 100, offset: 0 })
      .then((payload) => {
        if (!cancelled) setProducts(Array.isArray(payload?.items) ? payload.items : []);
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos cargar los stickers. Intenta nuevamente.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      [product.name, product.shortDescription, product.category?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [products, search]);

  return (
    <main className="jj-catalog-page jj-store-page">
      <SEOHead title="Stickers individuales | JJ Pega" description="Escoge tus stickers individuales favoritos de JJ Pega." />
      <header className="jj-catalog-banner">
        <img src="/assets/jj-high-quality/stickers-individuales-banner.webp" alt="Stickers individuales: elige tus diseños favoritos y combínalos como quieras" />
      </header>
      <section className="jj-catalog-toolbar" aria-label="Buscar stickers">
        <label className="jj-sticker-search">
          <Search size={27} strokeWidth={2.5} aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar stickers…" type="search" />
        </label>
      </section>
      <section className="jj-catalog-products">
        {error ? <p className="jj-catalog-message">{error}</p> : null}
        {loading ? <p className="jj-catalog-message">Cargando stickers…</p> : null}
        {!loading && !error && visibleProducts.length ? (
          <div className="jj-shop-grid">
            {visibleProducts.map((product, index) => (
              <article className={`jj-shop-product jj-shop-product--${index % 5}`} key={product.id || product.slug}>
                <div className="jj-shop-product__media">
                  <img src={product.coverImage} alt={product.name} loading="lazy" />
                  {index === 0 ? <span className="jj-shop-product__badge">Más popular</span> : null}
                  <button className="jj-shop-product__favorite" type="button" aria-label={`Añadir ${product.name} a favoritos`}>♡</button>
                </div>
                <div className="jj-shop-product__body">
                  <h3>{product.name}</h3>
                  <p><strong>{formatPrice(product.price, product.currency)}</strong></p>
                  <Link to={`/servicios/productos/${product.slug}`} className="jj-shop-product__add">Ver producto <span aria-hidden="true">→</span></Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}
        {!loading && !error && !visibleProducts.length ? <p className="jj-catalog-message">No encontramos stickers con esa búsqueda.</p> : null}
      </section>
      <footer className="jj-catalog-footer"><span>¿Buscas una colección completa?</span><Link to="/packs">Explorar packs por colección →</Link></footer>
    </main>
  );
}
