import { useEffect, useState, useMemo } from "react";
import { useLoaderData } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  getServiceCategoryLabel,
} from "@/data/services.js";
import { SERVICE_SEGMENTS_MAP } from "@/data/serviceSegmentsMap.js";
import TestimonialsSlider from "@/components/shared/TestimonialsSlider.jsx";
import Button from "@/components/shared/Button.jsx";
import {
  getTestimonialsForPage,
  TESTIMONIAL_SECTION_COPY,
} from "@/data/testimonials.js";
import { getPublicCatalog } from "@/lib/api.js";
import { resolveCatalogPurchaseFlow } from "@/lib/catalogPurchaseFlow.js";

const CATEGORY_ALL = "all";
const FLOW_ALL = "all";
const SEGMENT_ALL = "all";

// Map purchase_flow value to filter label
const FLOW_FILTER_LABELS = {
  booking: "Reserva con fecha",
  direct_purchase: "Compra directa",
  proposal_request: "Solicitar propuesta",
  monthly_plan: "Plan mensual",
};

// Build a lookup: slug → Set of segment keys
const slugToSegments = {};
SERVICE_SEGMENTS_MAP.forEach((seg) => {
  seg.services.forEach(({ serviceSlug }) => {
    if (!serviceSlug) return;
    if (!slugToSegments[serviceSlug]) slugToSegments[serviceSlug] = new Set();
    slugToSegments[serviceSlug].add(seg.key);
  });
});

export default function ServicesPage() {
  const { services: loadedServices } = useLoaderData() || {};
  const [services, setServices] = useState(
    loadedServices?.length ? loadedServices : []
  );
  const [isLoading, setIsLoading] = useState(!loadedServices?.length);
  const [catalogError, setCatalogError] = useState("");

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(CATEGORY_ALL);
  const [activeFlow, setActiveFlow] = useState(FLOW_ALL);
  const [activeSegment, setActiveSegment] = useState(SEGMENT_ALL);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      setIsLoading(true);
      setCatalogError("");
      try {
        const payload = await getPublicCatalog();
        if (cancelled) return;
        const items = payload?.items ?? [];
        if (import.meta.env.DEV) {
          console.debug("[ServicesPage] catalog loaded:", items.length, "services");
        }
        if (items.length > 0) {
          setServices(items);
          setCatalogError("");
        }
      } catch (err) {
        if (cancelled) return;
        setCatalogError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el catálogo de servicios."
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(services.map((s) => s.category))).sort(),
    [services]
  );

  const availableFlows = useMemo(
    () =>
      Array.from(
        new Set(services.map((s) => s.purchaseFlow).filter(Boolean))
      ).sort(),
    [services]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      if (activeCategory !== CATEGORY_ALL && s.category !== activeCategory) return false;
      if (activeFlow !== FLOW_ALL && s.purchaseFlow !== activeFlow) return false;
      if (activeSegment !== SEGMENT_ALL && !slugToSegments[s.slug]?.has(activeSegment)) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.shortDescription?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [services, search, activeCategory, activeFlow, activeSegment]);

  const activeFilters = [];
  if (activeSegment !== SEGMENT_ALL) {
    const seg = SERVICE_SEGMENTS_MAP.find((s) => s.key === activeSegment);
    activeFilters.push({ key: "segment", label: `Segmento: ${seg?.label}`, clear: () => setActiveSegment(SEGMENT_ALL) });
  }
  if (activeCategory !== CATEGORY_ALL)
    activeFilters.push({ key: "category", label: getServiceCategoryLabel(activeCategory), clear: () => setActiveCategory(CATEGORY_ALL) });
  if (activeFlow !== FLOW_ALL)
    activeFilters.push({ key: "flow", label: FLOW_FILTER_LABELS[activeFlow] ?? activeFlow, clear: () => setActiveFlow(FLOW_ALL) });
  if (search.trim())
    activeFilters.push({ key: "search", label: `"${search.trim()}"`, clear: () => setSearch("") });

  return (
    <main className="services-catalog">

      {/* ── HERO ── */}
      <section className="services-catalog__hero">
        <div className="container">
          <h1 className="services-catalog__title">
            Encuentra en nuestro{" "}
            <span className="highlight-box-glow">catálogo</span>{" "}
            de servicios la opción ideal para ti.
          </h1>
          <p className="services-catalog__subtitle">
            Fotografía, video, branding, web y contenido. Encuentra el servicio
            que mejor encaja con tu etapa, tu marca o tu evento.
          </p>
          <div className="services-catalog__divider" />
        </div>
      </section>

      {/* ── FILTERS ── */}
      <div className="services-catalog__filters-wrap">
        <div className="container">
          <div className="services-catalog__filters">

            {/* Top row: search + vista actual */}
            <div className="services-catalog__filters-top">
              <div className="services-catalog__search-group">
                <p className="services-catalog__filter-label">Explorar y filtrar</p>
                <div className="services-catalog__search-wrap">
                  <svg className="services-catalog__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    type="search"
                    className="services-catalog__search"
                    placeholder="Buscar por nombre o descripción..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="services-catalog__vista">
                <p className="services-catalog__vista-label">Vista actual</p>
                <p className="services-catalog__vista-count">
                  {isLoading ? "..." : filtered.length} de {services.length} servicios visibles
                </p>
                <p className="services-catalog__vista-note">
                  Orden por nombre y categoría.
                </p>
              </div>
            </div>

            {/* Bottom row: dropdowns */}
            <div className="services-catalog__selects">
              <div className="services-catalog__select-group">
                <label className="services-catalog__filter-label">Segmento</label>
                <select
                  className="services-catalog__select"
                  value={activeSegment}
                  onChange={(e) => setActiveSegment(e.target.value)}
                >
                  <option value={SEGMENT_ALL}>Todos los segmentos</option>
                  {SERVICE_SEGMENTS_MAP.map((seg) => (
                    <option key={seg.key} value={seg.key}>{seg.label}</option>
                  ))}
                </select>
              </div>

              <div className="services-catalog__select-group">
                <label className="services-catalog__filter-label">Categoría</label>
                <select
                  className="services-catalog__select"
                  value={activeCategory}
                  onChange={(e) => setActiveCategory(e.target.value)}
                >
                  <option value={CATEGORY_ALL}>Todas las categorías</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{getServiceCategoryLabel(cat)}</option>
                  ))}
                </select>
              </div>

              <div className="services-catalog__select-group">
                <label className="services-catalog__filter-label">Flujo de contratación</label>
                <select
                  className="services-catalog__select"
                  value={activeFlow}
                  onChange={(e) => setActiveFlow(e.target.value)}
                >
                  <option value={FLOW_ALL}>Todos los flujos</option>
                  {availableFlows.map((f) => (
                    <option key={f} value={f}>{FLOW_FILTER_LABELS[f] ?? f}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active filter tags */}
            {activeFilters.length > 0 && (
              <div className="services-catalog__active-filters">
                {activeFilters.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className="services-catalog__active-filter"
                    onClick={f.clear}
                    title="Quitar filtro"
                  >
                    {f.label}
                    <span className="services-catalog__active-filter-x" aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── GRID ── */}
      <section className="services-catalog__grid-section">
        <div className="container">
          {catalogError ? (
            <p className="form-status form-status--error">{catalogError}</p>
          ) : null}
          {isLoading && (
            <div className="py-16 text-center">
              <p className="text-base text-neutral-500">Cargando catálogo de servicios...</p>
            </div>
          )}
          {!isLoading && !catalogError && services.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-base text-neutral-500">
                No hay servicios disponibles en este momento. Vuelve pronto.
              </p>
            </div>
          )}
          <div className={`services-catalog__grid ${isLoading || services.length === 0 ? "hidden" : ""}`}>
            {filtered.map((service, index) => {
              const flow = resolveCatalogPurchaseFlow(service);
              return (
                <article key={service.id} className="service-catalog-card">
                  <div className="service-catalog-card__media">
                    {service.image ? (
                      <img
                        src={service.image}
                        alt=""
                        aria-hidden="true"
                        className="service-catalog-card__media-img"
                      />
                    ) : null}
                    <div className="service-catalog-card__media-badges">
                      <span className="service-catalog-card__index">
                        Servicio {String(index + 1).padStart(2, "0")}
                      </span>
                      {flow.shouldShowBadge && (
                        <span
                          className={`service-catalog-card__flow-badge service-catalog-card__flow-badge--${flow.tone}`}
                        >
                          {flow.label}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="service-catalog-card__body">
                    <span className="service-catalog-card__category">
                      {getServiceCategoryLabel(service.category)}
                    </span>

                    <h2 className="service-catalog-card__name">{service.name}</h2>
                    <p className="service-catalog-card__desc">{service.shortDescription}</p>
                  </div>

                  <div className="service-catalog-card__footer">
                    {service.price ? (
                      <span className="service-catalog-card__price">
                        Desde ${service.price.toLocaleString("es-DO")}
                      </span>
                    ) : null}

                    <Link
                      to={`/servicios/${service.slug}`}
                      className="service-catalog-card__cta"
                    >
                      {flow.ctaLabel}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <TestimonialsSlider
        eyebrow={TESTIMONIAL_SECTION_COPY.niches.eyebrow}
        titleNode={<>Clientes que ya confiaron en <span className="highlight-box-glow">nosotros</span> para construir su marca y cubrir sus eventos.</>}
        description={TESTIMONIAL_SECTION_COPY.niches.description}
        items={getTestimonialsForPage("home")}
      />

      {/* ── CTA ── */}
      <section className="section section-split">
        <div className="container">
          <div className="service-route-cta">
            <div className="service-route-cta__copy">
              <h2>
                <span className="highlight-box-glow">Transformemos</span>{" "}
                esta necesidad en una propuesta clara para tu marca o negocio.
              </h2>
            </div>
            <div className="service-route-cta__actions">
              <Button to="/contacto?mode=proposal&cta=services_catalog">
                Quiero una propuesta clara
              </Button>
              <Button to="/conoce-tu-negocio" variant="secondary">
                Completa el formulario para conocer tu negocio
              </Button>
              <Button to="/contacto" variant="secondary">
                Hablar sobre mi proyecto
              </Button>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
