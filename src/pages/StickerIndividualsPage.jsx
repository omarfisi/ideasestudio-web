import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import SEOHead from "@/components/seo/SEOHead.jsx";
import { getPublicProducts } from "@/lib/api.js";
import StickerProductCard from "@/components/store/StickerProductCard.jsx";
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
        <img src="/assets/jj-high-quality/stickers-individuales-banner.png" alt="Stickers individuales: elige tus diseños favoritos y combínalos como quieras" />
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
              <StickerProductCard
                key={product.id || product.slug}
                product={product}
                index={index}
                badge={index === 0 ? "Más popular" : ""}
              />
            ))}
          </div>
        ) : null}
        {!loading && !error && !visibleProducts.length ? <p className="jj-catalog-message">No encontramos stickers con esa búsqueda.</p> : null}
      </section>
    </main>
  );
}
