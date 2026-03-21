import Button from "@/components/shared/Button.jsx";
import { formatPrice } from "@/lib/formatPrice.js";
import {
  getSaleTypeCTA,
  getSaleTypeLabel,
  getServiceActionHref,
  getServiceCategoryLabel,
} from "@/data/services.js";

export default function ServiceCard({
  service,
  showPrimaryAction = true,
  showViewAction = true,
}) {
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
            <Button to={`/servicios/${service.slug}`} variant="secondary">
              Ver detalle
            </Button>
          ) : null}
          {showPrimaryAction ? (
            <Button to={getServiceActionHref(service)}>
              {getSaleTypeCTA(service.saleType)}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
