import { Link } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import PageHero from "@/components/shared/PageHero.jsx";
import { clientRoutes } from "@/data/routes.js";
import {
  getSaleTypeLabel,
  getServiceCategoryLabel,
} from "@/data/services.js";

function getUniqueOptions(items, getValue) {
  return Array.from(new Set(items.map(getValue)));
}

export default function ServicesPage() {
  const { services, categories: loadedCategories = [] } = useLoaderData();
  const fallbackCategories = getUniqueOptions(services, (service) => service.category).map(
    (code) => ({
      id: code,
      code,
      label: getServiceCategoryLabel(code),
    })
  );
  const categories = loadedCategories.length ? loadedCategories : fallbackCategories;
  const saleTypes = getUniqueOptions(services, (service) => service.saleType);

  const saleTypeSummary = saleTypes.map((item) => {
    const count = services.filter((service) => service.saleType === item).length;

    const descriptions = {
      buy_now:
        "Servicios con precio visible para activar compra directa y luego conectarlos al carrito publico.",
      deposit_booking:
        "Servicios que funcionan mejor con reserva, pago inicial y coordinacion de fecha.",
      quote_only:
        "Servicios consultivos o personalizados donde primero necesitas una propuesta.",
    };

    const ctas = {
      buy_now: "Ver compras directas",
      deposit_booking: "Ver reservas",
      quote_only: "Ver cotizaciones",
    };

    return {
      key: item,
      count,
      title: getSaleTypeLabel(item),
      description: descriptions[item] || "Flujo comercial disponible en el catalogo.",
      cta: ctas[item] || "Ver catalogo",
      href: item === "buy_now" ? "/servicios/productos" : "/contacto",
    };
  });

  const routeSummary = clientRoutes.map((route) => ({
    ...route,
    count: services.filter((service) => service.clientTypes.includes(route.key)).length,
  }));

  const stats = [
    { value: services.length, label: "servicios activos" },
    {
      value: services.filter((service) => service.saleType === "buy_now").length,
      label: "listas para compra",
    },
    {
      value: services.filter((service) => service.saleType === "deposit_booking").length,
      label: "con reserva",
    },
    { value: categories.length, label: "categorias publicas" },
  ];

  return (
    <>
      <PageHero
        eyebrow="Servicios"
        title="Servicios como hub comercial para cotizar, reservar o comprar"
        subtitle="Aqui conviven los servicios consultivos y los productos de compra directa dentro de una sola experiencia publica, sin mezclar la arquitectura real del backend."
        primaryAction={<Button to="/contacto">Solicitar orientación</Button>}
        secondaryAction={
          <Button to="/servicios/productos" variant="secondary">
            Ver productos
          </Button>
        }
      />

      <section className="section">
        <div className="container services-catalog-page">
          <div className="services-catalog-page__top">
            <div className="services-catalog-page__intro">
              <span className="eyebrow services-catalog-page__eyebrow">
                Sistema comercial
              </span>
              <h2>
                Un hub comercial para presentar servicios, captar interes y
                abrir la compra directa sin salir de Servicios.
              </h2>
              <p>
                Desde esta pagina puedes entrar al catalogo consultivo, pasar a
                productos, abrir carrito y completar checkout sin romper la
                separacion tecnica entre `services` y `products`.
              </p>

              <div className="services-catalog-page__stats">
                {stats.map((item) => (
                  <div key={item.label} className="services-catalog-page__stat">
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <aside className="services-catalog-page__system">
              <p className="services-catalog-page__system-kicker">
                Flujos de venta disponibles
              </p>

              <div className="services-catalog-page__mode-grid">
                {saleTypeSummary.map((item) => (
                  <Link
                    key={item.key}
                    to={item.href}
                    className="services-catalog-page__mode-card"
                  >
                    <span className="services-catalog-page__mode-count">
                      {item.count}
                    </span>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                    <span className="services-catalog-page__mode-cta">
                      {item.cta}
                    </span>
                  </Link>
                ))}
              </div>
            </aside>
          </div>

          <div className="services-catalog-page__segment">
            <div className="split-heading services-catalog-page__split">
              <div className="section-title services-catalog-page__title-block">
                <span className="eyebrow">Por tipo de cliente</span>
                <h2>Filtra rapido segun la clase de proyecto que quieres atender.</h2>
              </div>
              <p className="services-catalog-page__split-copy">
                Este hub queda mas claro si primero orienta por tipo de cliente
                y luego deja pasar a servicios consultivos o a compra directa.
              </p>
            </div>

            <div className="services-catalog-page__route-grid">
              {routeSummary.map((route) => (
                <Link
                  key={route.key}
                  to={route.path}
                  className="services-catalog-page__route-card"
                >
                  <div className="services-catalog-page__route-top">
                    <span>{route.label}</span>
                    <strong>{route.count}</strong>
                  </div>
                  <p>{route.shortText}</p>
                  <span className="services-catalog-page__route-link">
                    Ver camino
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
