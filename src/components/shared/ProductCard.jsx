import { CalendarDays, Clock3, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import ServiceMembershipPlansTrigger from "@/components/memberships/ServiceMembershipPlansTrigger.jsx";
import { formatPrice } from "@/lib/formatPrice.js";
import {
  SERVICE_FLOW_TYPES,
  getServiceFlowConfig,
  getServiceFlowType,
  resolveProductServiceId,
} from "@/lib/serviceFlowType.js";
import { useServiceMembershipPlans } from "@/lib/useServiceMembershipPlans.js";

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

  return null;
}

function getAvailableSinceLabel(product) {
  const source =
    product?.metadata?.availability_label ||
    product?.metadata?.available_since ||
    product?.metadata?.published_at;
  if (!source) return "";

  const date = new Date(source);
  if (Number.isNaN(date.getTime())) {
    return String(source).trim();
  }

  return `Disponible ${date.toLocaleDateString("es-PR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

function getLocationLabel(product) {
  const location =
    product?.metadata?.location_label ||
    product?.metadata?.location ||
    product?.metadata?.city ||
    product?.metadata?.region;

  return location ? toReadableLabel(String(location)) : "";
}

function getScheduleLabel(product) {
  const schedule =
    product?.metadata?.schedule_label ||
    product?.metadata?.schedule ||
    product?.metadata?.availability ||
    product?.metadata?.hours;

  return schedule ? String(schedule) : "";
}

export default function ProductCard({
  product,
  onAddToCart,
  addState = "idle",
}) {
  const hasDiscount =
    product.compareAtPrice !== null && product.compareAtPrice > product.price;

  const flowConfig = getServiceFlowConfig(product);
  // Monthly-flow products (e.g. "Gestión de Redes Sociales") are billed as
  // a membership subscription, never as a one-time cart purchase — this
  // CTA area never adds the base service to the cart, in any state
  // (loading/error/empty included). See resolveProductServiceId's
  // docstring for why the service link can't be read via product.serviceId
  // directly.
  const isMonthlyFlow = getServiceFlowType(product) === SERVICE_FLOW_TYPES.E_MONTHLY;
  const resolvedServiceId = resolveProductServiceId(product);
  const {
    plans: membershipPlans,
    loading: membershipPlansLoading,
    error: membershipPlansError,
    hasPlans: hasMembershipPlans,
    retry: retryMembershipPlans,
  } = useServiceMembershipPlans(resolvedServiceId, {
    enabled: isMonthlyFlow && Boolean(resolvedServiceId),
  });
  // Every state below is mutually exclusive and covers the full
  // isMonthlyFlow lifecycle explicitly — no fallback branch may ever
  // render a button labeled "Conocer planes" (flowConfig.cta for
  // E_MONTHLY) wired to onAddToCart, which is what silently added the
  // base service to the cart while plans were still loading, errored,
  // or genuinely didn't exist.
  const monthlyPlansState = !isMonthlyFlow
    ? null
    : membershipPlansLoading
    ? "loading"
    : membershipPlansError
    ? "error"
    : hasMembershipPlans
    ? "ready"
    : "empty";
  const duration = getDurationLabel(product);
  const segment = getSegmentLabel(product);
  // Category is already shown as an overlay badge — avoid repeating it in the subtitle
  const subtitle = segment || null;
  const ratingLabel = getRatingLabel(product);
  // Only include quick-fact rows that have real data
  const facts = [
    { id: "available", icon: CalendarDays, label: getAvailableSinceLabel(product) },
    { id: "location", icon: MapPin, label: getLocationLabel(product) },
    { id: "schedule", icon: Clock3, label: getScheduleLabel(product) },
  ].filter((fact) => Boolean(fact.label));

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
          <span className="pill pill--flow">{flowConfig.label}</span>
          {duration ? <span className="pill pill--soft">{duration}</span> : null}
        </div>
      </div>

      <div className="product-card__content">
        <header className="product-card__header">
          <div className="product-card__headline">
            <h3>{product.name}</h3>
            {subtitle ? (
              <p className="product-card__subtitle">{subtitle}</p>
            ) : null}
          </div>
          {ratingLabel ? (
            <div className="product-card__rating">
              <Star size={16} strokeWidth={2.2} />
              <span>{ratingLabel}</span>
            </div>
          ) : null}
        </header>

        {facts.length > 0 ? (
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
        ) : null}

        {product.shortDescription || product.longDescription ? (
          <p className="product-card__description">
            {product.shortDescription || product.longDescription}
          </p>
        ) : null}

        {segment ? (
          <div className="product-card__chips">
            <span className="product-card__chip">{segment}</span>
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
            {monthlyPlansState === "loading" ? (
              <Button type="button" disabled className="product-card__booking-btn">
                Cargando planes…
              </Button>
            ) : monthlyPlansState === "error" ? (
              <div className="product-card__plans-fallback">
                <Button type="button" disabled className="product-card__booking-btn">
                  No se pudieron cargar los planes
                </Button>
                <button
                  type="button"
                  className="product-card__plans-retry"
                  onClick={retryMembershipPlans}
                >
                  Reintentar
                </button>
              </div>
            ) : monthlyPlansState === "ready" ? (
              <ServiceMembershipPlansTrigger
                serviceId={resolvedServiceId}
                serviceName={product.name}
                plans={membershipPlans}
                loading={membershipPlansLoading}
                error={membershipPlansError}
                hasPlans={hasMembershipPlans}
                className="btn btn-primary product-card__booking-btn"
              >
                Conocer planes
              </ServiceMembershipPlansTrigger>
            ) : monthlyPlansState === "empty" ? (
              <div className="product-card__plans-fallback">
                <Button type="button" disabled className="product-card__booking-btn">
                  Planes no disponibles temporalmente
                </Button>
                <button
                  type="button"
                  className="product-card__plans-retry"
                  onClick={retryMembershipPlans}
                >
                  Reintentar
                </button>
              </div>
            ) : onAddToCart ? (
              <Button
                onClick={() => onAddToCart(product)}
                disabled={addState === "loading"}
                className="product-card__booking-btn"
              >
                {addState === "loading" ? "Agregando..." : flowConfig.cta}
              </Button>
            ) : (
              <Button to={`/servicios/${product.slug}`} className="product-card__booking-btn">
                {flowConfig.cta}
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
