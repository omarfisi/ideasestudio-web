import { useState } from "react";
import { useLoaderData, useSearchParams } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import CTASection from "@/components/shared/CTASection.jsx";
import PageHero from "@/components/shared/PageHero.jsx";
import ProductsGrid from "@/components/shared/ProductsGrid.jsx";
import SectionTitle from "@/components/shared/SectionTitle.jsx";
import { addProductToPublicCart } from "@/lib/api.js";

export default function StorePage() {
  const { products, categories, filters } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [addingProductSlug, setAddingProductSlug] = useState(null);
  const [cartState, setCartState] = useState({
    status: "idle",
    message: "",
  });

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);

    if (!value || value === "all") {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    setSearchParams(next);
  }

  async function handleAddToCart(product) {
    setAddingProductSlug(product.slug);
    setCartState({
      status: "loading",
      message: `Agregando ${product.name} al carrito...`,
    });

    try {
      const cart = await addProductToPublicCart({
        productId: product.id,
        productSlug: product.slug,
        quantity: 1,
      });

      setCartState({
        status: "success",
        message: `Servicio agregado. Tu resumen ahora tiene ${cart.summary.totalQuantity} servicios.`,
      });
    } catch (error) {
      setCartState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo agregar el servicio al resumen.",
      });
    } finally {
      setAddingProductSlug(null);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Servicios"
        title="Servicios listos para contratar"
        subtitle="Explora servicios con precio definido, revísalos en tu resumen de contratación y completa el pago desde una experiencia integrada."
        primaryAction={<Button to="/servicios/carrito">Ver resumen</Button>}
        secondaryAction={
          <Button to="/servicios" variant="secondary">
            Ver servicios consultivos
          </Button>
        }
      />

      <section className="section">
        <div className="container store-shell">
          <div className="store-shell__intro info-card">
            <SectionTitle
              eyebrow="Contratación directa"
              title="Contrata servicios con la misma identidad visual del sitio"
              subtitle="Selecciona servicios, revísalos en tu resumen y completa tu contratación desde una experiencia integrada dentro de Servicios."
            />

            <div className="store-shell__stats">
              <div className="store-shell__stat">
                <strong>{products.length}</strong>
                <span>Servicios disponibles</span>
              </div>
              <div className="store-shell__stat">
                <strong>{categories.length}</strong>
                <span>Categorías activas</span>
              </div>
              <div className="store-shell__stat">
                <strong>1</strong>
                <span>Resumen activo por visita</span>
              </div>
            </div>
          </div>

          <aside className="store-shell__sidebar info-card">
            <p className="services-catalog-page__system-kicker">Contratación directa</p>
            <ul className="bullet-list bullet-list--compact">
              <li>Servicios con precio fijo listos para contratación.</li>
              <li>Resumen y checkout integrados dentro de Servicios.</li>
              <li>Orden conectada a tu contacto para seguimiento.</li>
            </ul>

            <div className="store-shell__sidebar-actions">
              <Button to="/servicios/carrito" block>
                Abrir resumen
              </Button>
            </div>
          </aside>
        </div>
      </section>

      <section className="section section-sand">
        <div className="container">
          <div className="split-heading">
            <div className="section-title">
              <span className="eyebrow">Explorar servicios</span>
              <h2>Explora servicios contratables</h2>
              <p>
                Filtra por categoría y entra al detalle antes de añadir un
                servicio a tu resumen de contratación.
              </p>
            </div>
          </div>

          <div className="filters-card store-filters-card">
            <div className="filters-grid store-filters-grid">
              <label className="field">
                <span>Buscar</span>
                <input
                  type="text"
                  value={filters.search}
                  placeholder="Buscar servicio por nombre"
                  onChange={(event) => updateFilter("q", event.target.value)}
                />
              </label>

              <label className="field">
                <span>Categoría</span>
                <select
                  value={filters.category}
                  onChange={(event) => updateFilter("category", event.target.value)}
                >
                  <option value="all">Todas</option>
                  {categories.map((category) => (
                    <option key={category.id || category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

            </div>

            <div className="filters-card__footer">
              <p>
                {products.length
                  ? `${products.length} servicios visibles en esta vista.`
                  : "No hay servicios que coincidan con este filtro."}
              </p>
              <Button to="/servicios/carrito" variant="secondary">
                Ir al resumen
              </Button>
            </div>
          </div>

          {cartState.status !== "idle" ? (
            <p className={`form-status form-status--${cartState.status}`}>
              {cartState.message}
            </p>
          ) : null}

          {products.length ? (
            <ProductsGrid
              products={products}
              onAddToCart={handleAddToCart}
              addingProductSlug={addingProductSlug}
            />
          ) : (
            <div className="empty-state">
              <h2>Pronto verás servicios aquí</h2>
              <p>
                Esta sección quedará lista para mostrar servicios contratables
                tan pronto estén publicados.
              </p>
              <Button to="/servicios">Volver a servicios</Button>
            </div>
          )}
        </div>
      </section>

      <CTASection
        title="La contratación directa vive dentro de Servicios"
        text="Explora servicios, revisa tu resumen de contratación y completa tu pago sin salir del mismo ecosistema visual de Ideas Estudio."
        primaryLabel="Abrir resumen"
        primaryTo="/servicios/carrito"
        secondaryLabel="Ver servicios"
        secondaryTo="/servicios"
      />
    </>
  );
}
