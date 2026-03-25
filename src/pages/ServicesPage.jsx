import { useState } from "react";
import { useLoaderData } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import PageHero from "@/components/shared/PageHero.jsx";
import ServicesGrid from "@/components/shared/ServicesGrid.jsx";
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
  const [clientType, setClientType] = useState("all");
  const [category, setCategory] = useState("all");
  const [saleType, setSaleType] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const fallbackCategories = getUniqueOptions(services, (service) => service.category).map(
    (code) => ({
      id: code,
      code,
      label: getServiceCategoryLabel(code),
    })
  );
  const categories = loadedCategories.length ? loadedCategories : fallbackCategories;
  const saleTypes = getUniqueOptions(services, (service) => service.saleType);
  const featuredServices = services.filter((service) => service.featured).slice(0, 3);

  const filteredServices = services.filter((service) => {
    const matchesClient =
      clientType === "all" || service.clientTypes.includes(clientType);
    const matchesCategory =
      category === "all" || service.category === category;
    const matchesSaleType = saleType === "all" || service.saleType === saleType;
    const matchesMin = minPrice === "" || service.price >= Number(minPrice);
    const matchesMax = maxPrice === "" || service.price <= Number(maxPrice);

    return (
      matchesClient &&
      matchesCategory &&
      matchesSaleType &&
      matchesMin &&
      matchesMax
    );
  });

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

  function scrollToCatalog() {
    const node = document.getElementById("catalogo-servicios");

    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function resetFilters() {
    setClientType("all");
    setCategory("all");
    setSaleType("all");
    setMinPrice("");
    setMaxPrice("");
  }

  function applyPreset({
    nextClientType = "all",
    nextCategory = "all",
    nextSaleType = "all",
  }) {
    setClientType(nextClientType);
    setCategory(nextCategory);
    setSaleType(nextSaleType);
    setMinPrice("");
    setMaxPrice("");
    scrollToCatalog();
  }

  return (
    <>
      <PageHero
        eyebrow="Servicios"
        title="Servicios como hub comercial para cotizar, reservar o comprar"
        subtitle="Aqui conviven los servicios consultivos y los productos de compra directa dentro de una sola experiencia publica, sin mezclar la arquitectura real del backend."
        primaryAction={<Button href="#catalogo-servicios">Explorar servicios</Button>}
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
                  <button
                    key={item.key}
                    type="button"
                    className="services-catalog-page__mode-card"
                    onClick={() => applyPreset({ nextSaleType: item.key })}
                  >
                    <span className="services-catalog-page__mode-count">
                      {item.count}
                    </span>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                    <span className="services-catalog-page__mode-cta">
                      {item.cta}
                    </span>
                  </button>
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
                <button
                  key={route.key}
                  type="button"
                  className="services-catalog-page__route-card"
                  onClick={() => applyPreset({ nextClientType: route.key })}
                >
                  <div className="services-catalog-page__route-top">
                    <span>{route.label}</span>
                    <strong>{route.count}</strong>
                  </div>
                  <p>{route.shortText}</p>
                  <span className="services-catalog-page__route-link">
                    Filtrar catalogo
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="services-catalog-page__segment">
            <div className="split-heading services-catalog-page__split">
              <div className="section-title services-catalog-page__title-block">
                <span className="eyebrow">Destacados</span>
                <h2>Servicios listos para empujar la venta principal.</h2>
              </div>
              <p className="services-catalog-page__split-copy">
                Esta franja resalta los servicios consultivos con mas salida
                antes de pasar al listado completo o al bloque de productos.
              </p>
            </div>

            <ServicesGrid
              className="services-catalog-page__featured-grid"
              services={featuredServices}
              clientType={clientType !== "all" ? clientType : null}
            />
          </div>

          <div id="catalogo-servicios" className="services-catalog-page__segment">
            <div className="split-heading services-catalog-page__split">
              <div className="section-title services-catalog-page__title-block">
                <span className="eyebrow">Catalogo activo</span>
                <h2>Todos los servicios publicados en la capa publica.</h2>
              </div>
              <p className="services-catalog-page__split-copy">
                Usa filtros para separar compras directas, reservas o servicios
                de propuesta dentro del mismo hub comercial.
              </p>
            </div>

            <div className="filters-card services-catalog-page__filters">
              <div className="filters-grid">
                <label className="field">
                  <span>Tipo de cliente</span>
                  <select
                    value={clientType}
                    onChange={(event) => setClientType(event.target.value)}
                  >
                    <option value="all">Todos</option>
                    {clientRoutes.map((route) => (
                      <option key={route.key} value={route.key}>
                        {route.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Categoria</span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="all">Todas</option>
                    {categories.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.label || getServiceCategoryLabel(item.code)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Tipo de venta</span>
                  <select
                    value={saleType}
                    onChange={(event) => setSaleType(event.target.value)}
                  >
                    <option value="all">Todos</option>
                    {saleTypes.map((item) => (
                      <option key={item} value={item}>
                        {getSaleTypeLabel(item)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Precio minimo</span>
                  <input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(event) => setMinPrice(event.target.value)}
                    placeholder="0"
                  />
                </label>

                <label className="field">
                  <span>Precio maximo</span>
                  <input
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(event.target.value)}
                    placeholder="2000"
                  />
                </label>
              </div>

              <div className="filters-card__footer">
                <p>
                  Mostrando <strong>{filteredServices.length}</strong> servicios
                </p>
                <Button type="button" variant="ghost" onClick={resetFilters}>
                  Limpiar filtros
                </Button>
              </div>
            </div>

            <ServicesGrid
              services={filteredServices}
              clientType={clientType !== "all" ? clientType : null}
            />
          </div>
        </div>
      </section>
    </>
  );
}
