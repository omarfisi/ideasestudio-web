import { useState } from "react";
import { useLoaderData, useSearchParams } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import CTASection from "@/components/shared/CTASection.jsx";
import PageHero from "@/components/shared/PageHero.jsx";
import ProductsGrid from "@/components/shared/ProductsGrid.jsx";
import SectionTitle from "@/components/shared/SectionTitle.jsx";
import { addProductToPublicCart } from "@/lib/api.js";

const productTypeOptions = [
  { value: "all", label: "Todos" },
  { value: "digital", label: "Digitales" },
  { value: "physical", label: "Fisicos" },
  { value: "service_like", label: "Servicios fijos" },
];

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
        message: `Producto agregado. Tu carrito ahora tiene ${cart.summary.totalQuantity} items.`,
      });
    } catch (error) {
      setCartState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo agregar el producto al carrito.",
      });
    } finally {
      setAddingProductSlug(null);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Servicios"
        title="Productos de compra directa dentro del hub comercial"
        subtitle="Esta capa ya consume `products` reales del backend, los agrega a carrito por `session_token` y prepara checkout y ordenes sin mezclarlo con los servicios consultivos."
        primaryAction={<Button to="/servicios/carrito">Ver carrito</Button>}
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
              eyebrow="Compra directa"
              title="Productos listos para vender dentro de Servicios"
              subtitle="Esta vista ya usa el backend nuevo de `products` y queda preparada para carrito, checkout y ordenes conectadas al CRM."
            />

            <div className="store-shell__stats">
              <div className="store-shell__stat">
                <strong>{products.length}</strong>
                <span>Productos visibles</span>
              </div>
              <div className="store-shell__stat">
                <strong>{categories.length}</strong>
                <span>Categorias activas</span>
              </div>
              <div className="store-shell__stat">
                <strong>1</strong>
                <span>Sesion publica por carrito</span>
              </div>
            </div>
          </div>

          <aside className="store-shell__sidebar info-card">
            <p className="services-catalog-page__system-kicker">Capa ecommerce</p>
            <ul className="bullet-list bullet-list--compact">
              <li>`products` para venta directa.</li>
              <li>`cart` persistido por `session_token`.</li>
              <li>`checkout` crea orden y vincula contacto CRM.</li>
            </ul>

            <div className="store-shell__sidebar-actions">
              <Button to="/servicios/carrito" block>
                Abrir carrito
              </Button>
            </div>
          </aside>
        </div>
      </section>

      <section className="section section-sand">
        <div className="container">
          <div className="split-heading">
            <div className="section-title">
              <span className="eyebrow">Explorar tienda</span>
              <h2>Filtra y entra al detalle del producto</h2>
              <p>
                Esta pagina ya usa categorias, tipos de producto y busqueda para
                organizar la venta directa.
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
                  placeholder="Buscar por nombre"
                  onChange={(event) => updateFilter("q", event.target.value)}
                />
              </label>

              <label className="field">
                <span>Categoria</span>
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

              <label className="field">
                <span>Tipo</span>
                <select
                  value={filters.productType}
                  onChange={(event) =>
                    updateFilter("productType", event.target.value)
                  }
                >
                  {productTypeOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="filters-card__footer">
              <p>
                {products.length
                  ? `${products.length} productos visibles en esta vista.`
                  : "No hay productos que coincidan con este filtro."}
              </p>
              <Button to="/servicios/carrito" variant="secondary">
                Ir al carrito
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
              <h2>No hay productos publicados todavia</h2>
              <p>
                El backend ya esta listo. Falta poblar `products` y
                `product_categories` en la base real para que este bloque de
                productos se vea completo.
              </p>
              <Button to="/servicios">Volver a servicios</Button>
            </div>
          )}
        </div>
      </section>

      <CTASection
        title="La compra directa ya vive dentro de Servicios"
        text="Listado, detalle y carrito ya corren sobre el backend ecommerce nuevo, pero la experiencia publica ahora queda concentrada debajo de Servicios."
        primaryLabel="Abrir carrito"
        primaryTo="/servicios/carrito"
        secondaryLabel="Ver servicios"
        secondaryTo="/servicios"
      />
    </>
  );
}
