import Button from "@/components/shared/Button.jsx";
import { formatPrice } from "@/lib/formatPrice.js";

const productTypeLabels = {
  digital: "Digital",
  physical: "Físico",
  service_like: "Servicio fijo",
};

function getProductTypeLabel(productType) {
  return productTypeLabels[productType] || "Producto";
}

export default function ProductCard({
  product,
  onAddToCart,
  addState = "idle",
}) {
  const hasDiscount =
    product.compareAtPrice !== null && product.compareAtPrice > product.price;

  return (
    <article className="product-card">
      <div
        className="product-card__media"
        style={
          product.coverImage
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(12, 12, 12, 0.08) 0%, rgba(12, 12, 12, 0.34) 100%), url(${product.coverImage})`,
              }
            : undefined
        }
      >
        <div className="product-card__badges">
          <span className="pill pill--light">
            {product.category?.name || "Catálogo"}
          </span>
          <span className="pill pill--soft">
            {getProductTypeLabel(product.productType)}
          </span>
        </div>
        {!product.coverImage ? (
          <p className="product-card__media-note">
            {product.shortDescription || product.name}
          </p>
        ) : null}
      </div>

      <div className="product-card__content">
        <div className="product-card__top">
          <h3>{product.name}</h3>
          <p>{product.shortDescription || product.longDescription}</p>
        </div>

        <div className="product-card__meta">
          <div className="product-card__price-block">
            <strong>{formatPrice(product.price, product.currency)}</strong>
            {hasDiscount ? (
              <span>{formatPrice(product.compareAtPrice, product.currency)}</span>
            ) : null}
          </div>
          {product.trackInventory && product.inventoryQty !== null ? (
            <small>Inventario: {product.inventoryQty}</small>
          ) : (
            <small>Compra directa</small>
          )}
        </div>

        <div className="product-card__actions">
          <Button to={`/servicios/productos/${product.slug}`} variant="secondary">
            Ver detalle
          </Button>
          <Button
            onClick={() => onAddToCart(product)}
            disabled={addState === "loading"}
          >
            {addState === "loading" ? "Agregando..." : "Añadir al carrito"}
          </Button>
        </div>
      </div>
    </article>
  );
}
