import Button from "@/components/shared/Button.jsx";
import {
  getSaleTypeCTA,
  getSaleTypeLabel,
  getServiceActionHref,
  getServiceCategoryLabel,
  getServiceInquiryHref,
} from "@/data/services.js";
import { formatPrice } from "@/lib/formatPrice.js";

export default function ServiceDetailHero({ service }) {
  return (
    <section className="page-hero service-detail-hero">
      <div className="container page-hero__inner service-detail-hero__inner">
        <span className="eyebrow">{getServiceCategoryLabel(service.category)}</span>
        <h1 className="page-title">{service.detailsSchema?.title || service.name}</h1>
        <p className="page-subtitle">
          {service.detailsSchema?.summary || service.shortDescription}
        </p>

        <div className="service-detail-hero__meta">
          <span className="pill">{getSaleTypeLabel(service.saleType)}</span>
          <span className="pill">{formatPrice(service.price)}</span>
          <span className="pill">{service.deliveryTime}</span>
        </div>

        <div className="page-hero__actions service-detail-hero__actions">
          <Button to={getServiceActionHref(service, { cta: "service_detail_primary" })}>
            {getSaleTypeCTA(service.saleType)}
          </Button>
          <Button
            to={getServiceInquiryHref(service, {
              mode: "proposal",
              cta: "service_detail_inquiry",
            })}
            variant="secondary"
          >
            Hacer consulta
          </Button>
        </div>
      </div>
    </section>
  );
}
