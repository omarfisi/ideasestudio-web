import { useState } from "react";
import { useLoaderData } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import PageHero from "@/components/shared/PageHero.jsx";
import ServiceCard from "@/components/shared/ServiceCard.jsx";
import { clientRoutes } from "@/data/routes.js";
import {
  getSaleTypeLabel,
  getServiceCategoryLabel,
} from "@/data/services.js";

function getUniqueOptions(items, getValue) {
  return Array.from(new Set(items.map(getValue)));
}

export default function ServicesPage() {
  const { services } = useLoaderData();
  const [clientType, setClientType] = useState("all");
  const [category, setCategory] = useState("all");
  const [saleType, setSaleType] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const categories = getUniqueOptions(services, (service) => service.category);
  const saleTypes = getUniqueOptions(services, (service) => service.saleType);

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

  return (
    <>
      <PageHero
        eyebrow="Catalogo"
        title="Servicios preparados para compra, cotizacion o reserva"
        subtitle="Esta vista ya consume el catalogo real del CRM y aplica filtros en la capa publica sin tocar la interfaz."
        primaryAction={<Button to="/contacto">Solicitar propuesta</Button>}
      />

      <section className="section">
        <div className="container">
          <div className="filters-card">
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
                    <option key={item} value={item}>
                      {getServiceCategoryLabel(item)}
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
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setClientType("all");
                  setCategory("all");
                  setSaleType("all");
                  setMinPrice("");
                  setMaxPrice("");
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>

          <div className="service-grid">
            {filteredServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
