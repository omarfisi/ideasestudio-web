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
  { value: "physical", label: "Físicos" },
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
        title="Productos listos para comprar dentro de Servicios"
        subtitle="Explora recursos, plantillas y paquetes creados para apoyar tu marca, tu negocio o tu próximo proyecto desde una experiencia clara y consistente."
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
              title="Compra directa con la misma identidad visual del sitio"
              subtitle="Selecciona productos, revísalos en tu carrito y completa tu pedido desde una experiencia integrada dentro de Servicios."
            />

            <div className="store-shell__stats">
              <div className="store-shell__stat">
                <strong>{products.length}</strong>
                <span>Productos disponibles</span>
              </div>
              <div className="store-shell__stat">
                <strong>{categories.length}</strong>
                <span>Categorías activas</span>
              </div>
              <div className="store-shell__stat">
                <strong>1</strong>
                <span>Carrito activo por visita</span>
              </div>
            </div>
          </div>

          <aside className="store-shell__sidebar info-card">
            <p className="services-catalog-page__system-kicker">Compra directa</p>
            <ul className="bullet-list bullet-list--compact">
              <li>Productos digitales, físicos o paquetes con precio fijo.</li>
              <li>Carrito y checkout integrados dentro de Servicios.</li>
              <li>Pedido conectado a tu contacto para seguimiento.</li>
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
              <h2>Explora el catálogo disponible</h2>
              <p>
                Filtra por categoría o tipo de producto y entra al detalle antes
                de añadirlo a tu carrito.
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
              <h2>Pronto verás productos aquí</h2>
              <p>
                Esta sección quedará lista para mostrar productos, paquetes y
                recursos de compra directa tan pronto estén publicados.
              </p>
              <Button to="/servicios">Volver a servicios</Button>
            </div>
          )}
        </div>
      </section>

      <CTASection
        title="La compra directa vive dentro de Servicios"
        text="Explora productos, revisa tu carrito y completa tu pedido sin salir del mismo ecosistema visual de Ideas Estudio."
        primaryLabel="Abrir carrito"
        primaryTo="/servicios/carrito"
        secondaryLabel="Ver servicios"
        secondaryTo="/servicios"
      />
    </>
  );
}
