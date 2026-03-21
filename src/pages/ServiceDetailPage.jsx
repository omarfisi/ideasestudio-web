import { useLoaderData } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import CTASection from "@/components/shared/CTASection.jsx";
import PageHero from "@/components/shared/PageHero.jsx";
import { clientRoutes } from "@/data/routes.js";
import {
  getSaleTypeCTA,
  getSaleTypeLabel,
  getServiceActionHref,
  getServiceCategoryLabel,
} from "@/data/services.js";
import { formatPrice } from "@/lib/formatPrice.js";

function getClientRouteLabel(routeKey) {
  const route = clientRoutes.find((item) => item.key === routeKey);
  return route ? route.label : routeKey;
}

export default function ServiceDetailPage() {
  const { service } = useLoaderData();

  if (!service) {
    return (
      <section className="section">
        <div className="container">
          <div className="empty-state">
            <h1>Servicio no encontrado</h1>
            <p>El detalle solicitado no existe o aun no esta publicado.</p>
            <Button to="/servicios">Volver al catalogo</Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <PageHero
        eyebrow={getServiceCategoryLabel(service.category)}
        title={service.name}
        subtitle={service.shortDescription}
        primaryAction={
          <Button to={getServiceActionHref(service)}>
            {getSaleTypeCTA(service.saleType)}
          </Button>
        }
        secondaryAction={
          <Button to="/servicios" variant="secondary">
            Volver al catalogo
          </Button>
        }
      />

      <section className="section">
        <div className="container detail-grid">
          <article className="detail-panel">
            <h2>Descripcion</h2>
            <p>{service.description}</p>

            <div className="detail-tags">
              {service.clientTypes.map((routeKey) => (
                <span key={routeKey} className="pill">
                  {getClientRouteLabel(routeKey)}
                </span>
              ))}
            </div>

            <h3>Incluye</h3>
            <ul className="bullet-list">
              {service.includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <aside className="detail-summary">
            <div className="summary-row">
              <span>Tipo de venta</span>
              <strong>{getSaleTypeLabel(service.saleType)}</strong>
            </div>
            <div className="summary-row">
              <span>Precio base</span>
              <strong>{formatPrice(service.price)}</strong>
            </div>
            <div className="summary-row">
              <span>Entrega estimada</span>
              <strong>{service.deliveryTime}</strong>
            </div>
            <div className="summary-row">
              <span>Estado</span>
              <strong>{service.status}</strong>
            </div>

            <div className="detail-summary__actions">
              <Button to={getServiceActionHref(service)} block>
                {getSaleTypeCTA(service.saleType)}
              </Button>
              <Button
                to={`/contacto?service=${encodeURIComponent(service.name)}&serviceSlug=${encodeURIComponent(service.slug)}&mode=proposal`}
                variant="secondary"
                block
              >
                Hacer consulta
              </Button>
            </div>
          </aside>
        </div>
      </section>

      <section className="section section-sand">
        <div className="container">
          <div className="split-heading">
            <div className="section-title">
              <span className="eyebrow">Galeria inferida</span>
              <h2>Campos listos para enriquecer con datos reales</h2>
              <p>
                Mientras el backend no exponga galeria real, esta vista usa
                campos inferidos a partir del servicio para no romper la interfaz.
              </p>
            </div>
          </div>

          <div className="mosaic-grid mosaic-grid--detail">
            {service.gallery.map((item) => (
              <article key={item} className="mosaic-card">
                {item}
              </article>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        title="Detalle listo para integrarse al backend real"
        text="La pagina ya tiene estructura para precio base, tipo de venta, audiencias, galeria y CTA contextual. Cuando definas el contrato del CRM, este detalle puede consumir la data real sin rehacer la interfaz."
        primaryLabel="Ir a contacto"
        primaryTo="/contacto"
        secondaryLabel="Ver mas servicios"
        secondaryTo="/servicios"
      />
    </>
  );
}
