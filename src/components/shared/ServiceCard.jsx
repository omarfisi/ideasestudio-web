import { Link } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import { formatPrice } from "@/lib/formatPrice.js";
import {
  getSaleTypeCTA,
  getSaleTypeLabel,
  getServiceActionHref,
  getServiceCategoryLabel,
} from "@/data/services.js";

function getServiceCover(service) {
  const candidates = [
    service?.raw?.cover_image,
    service?.raw?.details_schema?.cover_image,
    ...(Array.isArray(service?.gallery) ? service.gallery : []),
  ];

  return (
    candidates.find(
      (item) => typeof item === "string" && /^https?:\/\//i.test(item)
    ) || null
  );
}

export default function ServiceCard({
  service,
  showPrimaryAction = true,
  showViewAction = true,
  clientType = null,
  variant = "default",
}) {
  const detailHref = `/servicios/${service.slug}`;
  const actionHref = getServiceActionHref(service, {
    cta: "service_card_primary",
    clientType,
  });

  if (variant === "catalog") {
    const coverImage = getServiceCover(service);

    return (
      <article className="service-card service-card--catalog">
        <div className="service-card__catalog-media">
          <div
            className="service-card__catalog-frame"
            style={
              coverImage
                ? {
                    backgroundImage: `linear-gradient(180deg, rgba(12, 12, 12, 0.04) 0%, rgba(12, 12, 12, 0.2) 100%), url(${coverImage})`,
                  }
                : undefined
            }
          >
            {!coverImage ? (
              <p className="service-card__catalog-note">
                {service.detailsSchema?.summary || service.shortDescription}
              </p>
            ) : null}
            <span className="service-card__catalog-badge">
              {getSaleTypeLabel(service.saleType)}
            </span>
          </div>
        </div>

        <div className="service-card__catalog-rating">
          <div className="service-card__catalog-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span>{getServiceCategoryLabel(service.category)}</span>
        </div>

        <h3 className="service-card__catalog-title">
          <Link to={detailHref}>{service.name}</Link>
        </h3>

        <div className="service-card__catalog-footer">
          <p className="service-card__catalog-price">
            Precio
            <span>{formatPrice(service.price)}</span>
          </p>

          {showViewAction ? (
            <Link className="service-card__catalog-link" to={detailHref}>
              Ver detalle
              <svg
                width="7"
                height="11"
                viewBox="0 0 7 11"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M1.5 10L5.29289 6.20711C5.62623 5.87377 5.79289 5.70711 5.79289 5.5C5.79289 5.29289 5.62623 5.12623 5.29289 4.79289L1.5 1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          ) : null}
        </div>

        {showPrimaryAction ? (
          <Link className="service-card__catalog-cta" to={actionHref}>
            {getSaleTypeCTA(service.saleType)}
          </Link>
        ) : null}
      </article>
    );
  }

  return (
    <article className="service-card">
      <div className="service-card__media">
        <div className="service-card__badges">
          <span className="pill pill--light">
            {getServiceCategoryLabel(service.category)}
          </span>
          <span className="pill pill--soft">{getSaleTypeLabel(service.saleType)}</span>
        </div>
        <p className="service-card__media-note">{service.image}</p>
      </div>

      <div className="service-card__content">
        <h3>{service.name}</h3>
        <p>{service.shortDescription}</p>

        <div className="service-card__meta">
          <strong>{formatPrice(service.price)}</strong>
          <span>{service.deliveryTime}</span>
        </div>

        <div className="service-card__actions">
          {showViewAction ? (
            <Button to={detailHref} variant="secondary">
              Ver detalle
            </Button>
          ) : null}
          {showPrimaryAction ? (
            <Button to={actionHref}>
              {getSaleTypeCTA(service.saleType)}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
