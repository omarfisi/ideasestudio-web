import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead.jsx";
import ProductsGrid from "@/components/shared/ProductsGrid.jsx";
import { addProductToPublicCart, getPublicProducts } from "@/lib/api.js";
import "./StickerCatalogPages.css";

export default function StickerIndividualsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingSlug, setAddingSlug] = useState(null);

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

  async function handleAddToCart(product) {
    setAddingSlug(product.slug);
    try {
      await addProductToPublicCart({ productId: product.id, productSlug: product.slug, quantity: 1 });
    } finally {
      setAddingSlug(null);
    }
  }

  return (
    <main className="jj-catalog-page">
      <SEOHead title="Stickers individuales | JJ Pega" description="Escoge tus stickers individuales favoritos de JJ Pega." />
      <header className="jj-catalog-hero jj-catalog-hero--pink">
        <div>
          <span className="jj-catalog-kicker">JJ Pega · compra directa</span>
          <h1>Stickers individuales</h1>
          <p>Elige tus diseños favoritos, combínalos como quieras y pégalos donde tu idea cobre vida.</p>
        </div>
        <img src="/assets/jj-high-quality/sticker-corazon-rosa.webp" alt="Sticker corazón rosa" />
      </header>
      <section className="jj-catalog-toolbar" aria-label="Buscar stickers">
        <div><strong>{loading ? "…" : visibleProducts.length}</strong><span> stickers disponibles</span></div>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o colección…" type="search" />
      </section>
      <section className="jj-catalog-products">
        {error ? <p className="jj-catalog-message">{error}</p> : null}
        {loading ? <p className="jj-catalog-message">Cargando stickers…</p> : null}
        {!loading && !error && visibleProducts.length ? <ProductsGrid products={visibleProducts} onAddToCart={handleAddToCart} addingProductSlug={addingSlug} /> : null}
        {!loading && !error && !visibleProducts.length ? <p className="jj-catalog-message">No encontramos stickers con esa búsqueda.</p> : null}
      </section>
      <footer className="jj-catalog-footer"><span>¿Buscas una colección completa?</span><Link to="/packs">Explorar packs por colección →</Link></footer>
    </main>
  );
}
