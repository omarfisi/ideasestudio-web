import { useState } from "react";
import { useLoaderData } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import CTASection from "@/components/shared/CTASection.jsx";
import { addProductToPublicCart } from "@/lib/api.js";
import { formatPrice } from "@/lib/formatPrice.js";

const productTypeLabels = {
  digital: "Servicio digital",
  physical: "Servicio presencial",
  service_like: "Servicio con precio fijo",
  service: "Servicio",
};

function getProductTypeLabel(productType) {
  return productTypeLabels[productType] || "Servicio";
}

export default function ProductDetailPage() {
  const { product } = useLoaderData();
  const [quantity, setQuantity] = useState(1);
  const [cartState, setCartState] = useState({
    status: "idle",
    message: "",
  });

  if (!product) {
    return (
      <section className="section">
        <div className="container">
          <div className="empty-state">
            <h1>Servicio no encontrado</h1>
            <p>El servicio solicitado no existe o aún no está publicado.</p>
            <Button to="/servicios">Volver a servicios contratables</Button>
          </div>
        </div>
      </section>
    );
  }

  async function handleAddToCart() {
    setCartState({
      status: "loading",
      message: "Agregando servicio al resumen...",
    });

    try {
      const cart = await addProductToPublicCart({
        productId: product.id,
        productSlug: product.slug,
        quantity,
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
    }
  }

  const gallery = product.gallery.length
    ? product.gallery
    : [product.coverImage].filter(Boolean);

  return (
    <>
      <section className="page-hero store-detail-hero">
        <div className="container store-detail-hero__inner">
          <span className="eyebrow">Servicios</span>
          <h1 className="page-title">{product.name}</h1>
          <p className="page-subtitle">
            {product.longDescription || product.shortDescription}
          </p>

          <div className="service-detail-hero__meta">
            <span className="pill">{product.category?.name || "Catálogo"}</span>
            <span className="pill pill--soft">
              {getProductTypeLabel(product.productType)}
            </span>
            {product.trackInventory && product.inventoryQty !== null ? (
              <span className="pill pill--soft">
                Inventario: {product.inventoryQty}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container detail-grid">
          <article className="detail-panel product-detail-panel">
            <div
              className="product-detail-panel__media"
              style={
                product.coverImage
                  ? {
                      backgroundImage: `linear-gradient(180deg, rgba(12, 12, 12, 0.08) 0%, rgba(12, 12, 12, 0.28) 100%), url(${product.coverImage})`,
                    }
                  : undefined
              }
            >
              {!product.coverImage ? (
                <p className="product-detail-panel__placeholder">
                  {product.shortDescription || product.name}
                </p>
              ) : null}
            </div>

            <div className="service-includes">
              <h3>Lo que recibes</h3>
              <ul className="service-includes__list">
                {(product.metadata?.includes || []).length ? (
                  product.metadata.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))
                ) : (
                  <>
                    <li>Acceso claro al servicio desde el hub de Servicios.</li>
                    <li>Resumen organizado dentro de tu pedido.</li>
                    <li>Seguimiento simple para continuar la contratación.</li>
                  </>
                )}
              </ul>
            </div>
          </article>

          <aside className="detail-summary">
            <div className="summary-row">
              <span>Precio</span>
              <strong>{formatPrice(product.price, product.currency)}</strong>
            </div>
            {product.compareAtPrice && product.compareAtPrice > product.price ? (
              <div className="summary-row">
                <span>Precio anterior</span>
                <strong>{formatPrice(product.compareAtPrice, product.currency)}</strong>
              </div>
            ) : null}
            <div className="summary-row">
              <span>SKU</span>
              <strong>{product.sku || "Sin SKU"}</strong>
            </div>
            <div className="summary-row">
              <span>Estado</span>
              <strong>{product.isActive ? "Activo" : "Inactivo"}</strong>
            </div>

            <label className="field product-detail-panel__quantity">
              <span>Cantidad</span>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) =>
                  setQuantity(Math.max(1, Number(event.target.value) || 1))
                }
              />
            </label>

            {cartState.status !== "idle" ? (
              <p className={`form-status form-status--${cartState.status}`}>
                {cartState.message}
              </p>
            ) : null}

            <div className="detail-summary__actions">
              <Button
                onClick={handleAddToCart}
                block
                disabled={cartState.status === "loading"}
              >
                {cartState.status === "loading"
                  ? "Agregando..."
                  : "Añadir servicio"}
              </Button>
              <Button to="/servicios/carrito" variant="secondary" block>
                Ver resumen
              </Button>
            </div>
          </aside>
        </div>
      </section>

      {gallery.length ? (
        <section className="section section-sand">
          <div className="container">
            <div className="split-heading">
              <div className="section-title">
                <span className="eyebrow">Galería</span>
                <h2>Vista previa del servicio</h2>
                <p>
                  Explora referencias visuales, variaciones o piezas asociadas a
                  este servicio.
                </p>
              </div>
            </div>

            <div className="mosaic-grid mosaic-grid--detail">
              {gallery.map((item, index) => (
                <article
                  key={`${product.slug}-${index}`}
                  className="mosaic-card mosaic-card--product"
                  style={
                    item && typeof item === "string" && item.startsWith("http")
                      ? {
                          backgroundImage: `linear-gradient(180deg, rgba(12, 12, 12, 0.08) 0%, rgba(12, 12, 12, 0.28) 100%), url(${item})`,
                        }
                      : undefined
                  }
                >
                  {!String(item || "").startsWith("http") ? item : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <CTASection
        title="Listo para contratar este servicio"
        text="Revisa el detalle, ajusta la cantidad y lleva tu contratación al resumen cuando estés listo."
        primaryLabel="Seguir en servicios"
        primaryTo="/servicios"
        secondaryLabel="Ir al resumen"
        secondaryTo="/servicios/carrito"
      />
    </>
  );
}
