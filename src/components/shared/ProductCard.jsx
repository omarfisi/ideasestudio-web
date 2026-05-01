import { CalendarDays, Clock3, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import { formatPrice } from "@/lib/formatPrice.js";

const productTypeLabels = {
  digital: "Digital",
  physical: "Físico",
  service_like: "Servicio fijo",
  service: "Servicio",
};

function getProductTypeLabel(productType) {
  return productTypeLabels[productType] || "Servicio";
}

function toReadableLabel(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getDurationLabel(product) {
  const metadata = product?.metadata || {};
  const raw =
    metadata.default_duration_days ??
    metadata.duration_days ??
    metadata.duration ??
    metadata.delivery_time_days;

  if (raw === null || raw === undefined || raw === "") {
    return "";
  }

  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric === 1 ? "1 día" : `${numeric} días`;
  }

  const text = String(raw).trim();
  return text ? toReadableLabel(text) : "";
}

function getSaleModeLabel(product) {
  const mode = String(product?.metadata?.sale_mode || "").trim().toLowerCase();
  if (!mode) return "";

  if (mode === "buy_now") return "Compra directa";
  if (mode === "deposit_booking") return "Reserva";
  if (mode === "quote_only") return "Propuesta";
  return toReadableLabel(mode);
}

function getSegmentLabel(product) {
  const segment = String(product?.metadata?.commercial_segment || "").trim();
  return segment ? toReadableLabel(segment) : "";
}

function getRatingLabel(product) {
  const ratingRaw =
    product?.metadata?.rating ??
    product?.metadata?.rating_average ??
    product?.metadata?.score;
  const numeric = Number(ratingRaw);

  if (Number.isFinite(numeric) && numeric > 0) {
    return `${numeric.toFixed(1)}/5`;
  }

  return "Top";
}

function getAvailableSinceLabel(product) {
  const source =
    product?.metadata?.available_since ||
    product?.metadata?.published_at ||
    product?.createdAt;
  const date = source ? new Date(source) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return "Disponible ahora";
  }

  return `Disponible ${date.toLocaleDateString("es-PR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

function getLocationLabel(product) {
  const location =
    product?.metadata?.location ||
    product?.metadata?.city ||
    product?.metadata?.region ||
    product?.category?.name;

  return location ? toReadableLabel(String(location)) : "Remoto / Puerto Rico";
}

function getScheduleLabel(product) {
  const schedule =
    product?.metadata?.schedule ||
    product?.metadata?.availability ||
    product?.metadata?.hours;

  return schedule ? String(schedule) : "Lun-Dom · Horario a coordinar";
}

export default function ProductCard({
  product,
  onAddToCart,
  addState = "idle",
}) {
  const hasDiscount =
    product.compareAtPrice !== null && product.compareAtPrice > product.price;

  const duration = getDurationLabel(product);
  const saleMode = getSaleModeLabel(product);
  const segment = getSegmentLabel(product);
  const subtitle = [product.category?.name, segment || saleMode].filter(Boolean).join(" · ");
  const ratingLabel = getRatingLabel(product);
  const facts = [
    { id: "available", icon: CalendarDays, label: getAvailableSinceLabel(product) },
    { id: "location", icon: MapPin, label: getLocationLabel(product) },
    { id: "schedule", icon: Clock3, label: getScheduleLabel(product) },
  ];

  return (
    <article className="product-card">
      <div className="product-card__media">
        {product.coverImage ? (
          <img
            src={product.coverImage}
            alt={product.name}
            loading="lazy"
            className="product-card__media-image"
          />
        ) : (
          <div className="product-card__media-placeholder">
            <p>Servicio Premium</p>
          </div>
        )}
        <div className="product-card__media-overlay" />
        <div className="product-card__badges">
          <span className="pill pill--light">
            {product.category?.name || "Catálogo"}
          </span>
          {duration ? <span className="pill pill--soft">{duration}</span> : null}
        </div>
      </div>

      <div className="product-card__content">
        <header className="product-card__header">
          <div className="product-card__headline">
            <h3>{product.name}</h3>
            <p className="product-card__subtitle">
              {subtitle || getProductTypeLabel(product.productType)}
            </p>
          </div>
          <div className="product-card__rating">
            <Star size={16} strokeWidth={2.2} />
            <span>{ratingLabel}</span>
          </div>
        </header>

        <ul className="product-card__facts">
          {facts.map((fact) => {
            const Icon = fact.icon;
            return (
              <li key={`${product.slug}-${fact.id}`}>
                <Icon size={16} />
                <span>{fact.label}</span>
              </li>
            );
          })}
        </ul>

        {product.shortDescription || product.longDescription ? (
          <p className="product-card__description">
            {product.shortDescription || product.longDescription}
          </p>
        ) : null}

        {segment || saleMode ? (
          <div className="product-card__chips">
            {segment ? <span className="product-card__chip">{segment}</span> : null}
            {saleMode ? <span className="product-card__chip">{saleMode}</span> : null}
          </div>
        ) : null}

        <div className="product-card__footer">
          <div className="product-card__price-block">
            <small>Desde</small>
            <strong>{formatPrice(product.price, product.currency)}</strong>
            {hasDiscount ? (
              <span>{formatPrice(product.compareAtPrice, product.currency)}</span>
            ) : null}
          </div>

          <div className="product-card__actions">
            <Link to={`/servicios/${product.slug}`} className="product-card__details-link">
              Ver detalles
            </Link>
            {onAddToCart ? (
              <Button
                onClick={() => onAddToCart(product)}
                disabled={addState === "loading"}
                className="product-card__booking-btn"
              >
                {addState === "loading" ? "Agregando..." : "Contratar ahora"}
              </Button>
            ) : (
              <Button to={`/servicios/${product.slug}`} className="product-card__booking-btn">
                Contratar ahora
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
