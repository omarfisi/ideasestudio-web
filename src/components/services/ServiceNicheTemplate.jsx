import { useId, useState } from "react";
import TestimonialsSlider from "@/components/shared/TestimonialsSlider.jsx";
import {
  getTestimonialsForPage,
  TESTIMONIAL_SECTION_COPY,
} from "@/data/testimonials.js";
import {
  BriefcaseBusiness,
  Camera,
  Heart,
  Image,
  Layers3,
  Megaphone,
  MonitorPlay,
  PartyPopper,
  Presentation,
  Rocket,
  Sparkles,
  UserRound,
} from "lucide-react";
import Button from "@/components/shared/Button.jsx";
import HighlightTitle from "@/components/shared/HighlightTitle.jsx";
import ServiceNicheHero from "@/components/services/ServiceNicheHero.jsx";
import serviceShowcaseImage from "/images/services/service-img.webp";
import serviceShowcaseShape from "/images/services/tab-content-shape.png";

const DEFAULT_ICON_SET = [Megaphone, MonitorPlay, BriefcaseBusiness];

const ICON_SET_BY_NICHE = {
  "marca-o-negocio": [Megaphone, MonitorPlay, BriefcaseBusiness],
  "presencia-visual-profesional": [UserRound, Camera, Presentation],
  "momento-especial": [Image, PartyPopper, Heart],
  "solucion-creativa": [Sparkles, Layers3, Rocket],
};

function getIconSet(slug) {
  return ICON_SET_BY_NICHE[slug] || DEFAULT_ICON_SET;
}

export default function ServiceNicheTemplate({ niche, segment, apiServices }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const baseId = useId();

  // Merge API segment data into niche when available
  const mergedNiche = segment
    ? {
        ...niche,
        heroTitle: segment.hero_title || niche.heroTitle,
        heroSubtitle: segment.hero_subtitle || niche.heroSubtitle,
        heroImageUrl: segment.hero_image_url || niche.heroImageUrl,
      }
    : niche;

  // Use API services if available and non-empty, else fall back to local data
  const liveServices =
    apiServices?.length > 0
      ? apiServices.map((s) => ({
          title: s.name,
          description: s.description,
          image: s.image_url,
          slug: s.slug,
          href: s.slug ? `/servicios/contratar/${s.slug}` : null,
          ctaLabel: s.cta_label || "Ver servicio",
        }))
      : null;

  const segmentSelector = niche.segmentSelector || {};
  const catalogSection = niche.catalogSection || {};
  const catalogCards = niche.catalogCards || [];
  const cta = niche.cta || {};
  const iconSet = getIconSet(niche.slug);
  const safeActiveIndex = Math.min(activeIndex, Math.max(catalogCards.length - 1, 0));

  return (
    <div
      className={`service-segment-template service-segment-template--${niche.tone || "default"}`}
    >
      <ServiceNicheHero niche={mergedNiche} />

      <section id="rutas-principales" className="section section-split">
        <div className="container">
          <div className="niche-services-grid__intro">
            <h2>
              {catalogSection.titleBoxGlow
                ? (() => {
                    const t = catalogSection.title || "";
                    const w = catalogSection.titleBoxGlow;
                    const idx = t.indexOf(w);
                    if (idx === -1) return t;
                    return (
                      <>
                        {t.slice(0, idx)}
                        <span className="highlight-box-glow">{w}</span>
                        {t.slice(idx + w.length)}
                      </>
                    );
                  })()
                : (
                  <HighlightTitle
                    text={catalogSection.title || "Servicios y combinaciones que suelen funcionar dentro de este segmento"}
                    words={catalogSection.titleHighlight}
                  />
                )
              }
            </h2>
            {catalogSection.subtitle ? (
              <p>{catalogSection.subtitle}</p>
            ) : null}
          </div>

          {(liveServices || niche.segmentServices)?.length ? (
            <div className="niche-services-grid">
              {(liveServices || niche.segmentServices).map((service, index) => {
                const routeNumber = String(index + 1).padStart(2, "0");
                const isReadyRoute = Boolean(service.slug);

                return (
                  <article
                    key={service.title}
                    className={`niche-service-card ${isReadyRoute ? "is-ready" : "is-consultive"}`}
                  >
                    <div className="niche-service-card__media" aria-hidden="true">
                      <img
                        src={service.image || serviceShowcaseImage}
                        alt=""
                        className="niche-service-card__image"
                      />
                      <div className="niche-service-card__media-badges">
                        <span className="niche-service-card__route">Servicio {routeNumber}</span>
                        <span
                          className={`niche-service-card__state ${
                            isReadyRoute ? "is-ready" : "is-consultive"
                          }`}
                        >
                          {isReadyRoute ? "Ruta lista" : "Ruta consultiva"}
                        </span>
                      </div>
                    </div>

                    <div className="niche-service-card__body">
                      <h3 className="niche-service-card__title">{service.title}</h3>

                      {service.description ? (
                        <p className="niche-service-card__description">{service.description}</p>
                      ) : null}

                      <div className="niche-service-card__footer">
                        <Button to={service.href} variant={isReadyRoute ? "primary" : "secondary"}>
                          {service.ctaLabel}
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : catalogCards.length ? (
            <div className="service-h5-showcase__shell">
              <div
                className="service-h5-showcase__tabs"
                role="tablist"
                aria-label={`Rutas principales para ${niche.title}`}
              >
                {catalogCards.map((card, index) => {
                  const Icon = iconSet[index % iconSet.length];
                  const isActive = index === safeActiveIndex;
                  const tabId = `${baseId}-route-tab-${index}`;

                  return (
                    <button
                      key={card.title}
                      id={tabId}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`${baseId}-route-panel-${index}`}
                      className={`service-h5-showcase__tab ${isActive ? "is-active" : ""}`}
                      onClick={() => setActiveIndex(index)}
                    >
                      <span className="service-h5-showcase__tab-icon" aria-hidden="true">
                        <Icon size={26} strokeWidth={1.9} />
                      </span>
                      <span className="service-h5-showcase__tab-copy">
                        {card.eyebrow ? <small>{card.eyebrow}</small> : null}
                        <strong>{card.title}</strong>
                        <span className="service-h5-showcase__tab-detail">
                          {card.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="service-h5-showcase__stage">
                {catalogCards.map((card, index) => {
                  const Icon = iconSet[index % iconSet.length] || Sparkles;
                  const isActive = index === safeActiveIndex;

                  return (
                    <article
                      key={card.title}
                      id={`${baseId}-route-panel-${index}`}
                      role="tabpanel"
                      aria-labelledby={`${baseId}-route-tab-${index}`}
                      aria-hidden={!isActive}
                      hidden={!isActive}
                      className="service-h5-showcase__panel"
                    >
                      <div className="service-h5-showcase__panel-copy">
                        <div className="service-h5-showcase__panel-head">
                          <span className="service-h5-showcase__panel-icon" aria-hidden="true">
                            <Icon size={28} strokeWidth={1.9} />
                          </span>
                          <div className="service-h5-showcase__badge-row">
                            {card.eyebrow ? (
                              <span className="service-h5-showcase__badge">{card.eyebrow}</span>
                            ) : null}
                            {card.saleMode ? (
                              <span className="service-h5-showcase__badge service-h5-showcase__badge--muted">
                                {card.saleMode}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <h3>{card.title}</h3>
                        <p className="service-h5-showcase__description">{card.description}</p>

                        {card.points?.length ? (
                          <ul className="service-h5-showcase__point-list">
                            {card.points.map((point) => (
                              <li key={point}>{point}</li>
                            ))}
                          </ul>
                        ) : null}

                        <div className="service-h5-showcase__actions">
                          <Button to={`/contacto?mode=proposal&niche=${niche.slug}&route=${index + 1}`}>
                            {card.ctaLabel || "Cotizar esta ruta"}
                          </Button>
                          <Button
                            to={`/contacto?mode=proposal&niche=${niche.slug}&cta=segment-conversation`}
                            variant="secondary"
                          >
                            Hablar sobre este segmento
                          </Button>
                        </div>

                        <div className="service-h5-showcase__media">
                          <img
                            src={serviceShowcaseImage}
                            alt=""
                            aria-hidden="true"
                            className="service-h5-showcase__image"
                          />
                        </div>
                        <img
                          src={serviceShowcaseShape}
                          alt=""
                          aria-hidden="true"
                          className="service-h5-showcase__shape"
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="section section-split">
        <div className="container">
          <div className="service-segment-selector">
            <div className="service-segment-selector__intro">
              <h2>
                {segmentSelector.titleBoxGlow
                  ? (() => {
                      const t = segmentSelector.title || "";
                      const w = segmentSelector.titleBoxGlow;
                      const idx = t.indexOf(w);
                      if (idx === -1) return t;
                      return (
                        <>
                          {t.slice(0, idx)}
                          <span className="highlight-box-glow">{w}</span>
                          {t.slice(idx + w.length)}
                        </>
                      );
                    })()
                  : (
                    <HighlightTitle
                      text={segmentSelector.title || "Elige el camino que mejor representa lo que quieres construir"}
                      words={segmentSelector.titleHighlight}
                    />
                  )
                }
              </h2>

              {segmentSelector.description ? (
                <p>{segmentSelector.description}</p>
              ) : null}
            </div>

            <div className="service-segment-selector__grid">
              {(segmentSelector.items || []).map((item) => (
                <article key={item.title} className="service-segment-selector__card">
                  <div className="service-segment-selector__card-inner">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>

                  <a
                    href={item.href}
                    className="service-segment-selector__link"
                    aria-label={`Ver opciones de ${item.title}`}
                  >
                    Ver opciones
                    <span aria-hidden="true">→</span>
                  </a>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <TestimonialsSlider
        eyebrow={TESTIMONIAL_SECTION_COPY.niches.eyebrow}
        titleNode={<>Clientes que ya confiaron en <span className="highlight-box-glow">nosotros</span> para construir su marca y cubrir sus eventos.</>}
        description={TESTIMONIAL_SECTION_COPY.niches.description}
        items={getTestimonialsForPage(niche.slug)}
      />

      <section className="section section-split">
        <div className="container">
          <div className="service-route-cta">
            <div className="service-route-cta__copy">
              {cta.eyebrow ? (
                <span className="service-route-cta__eyebrow">{cta.eyebrow}</span>
              ) : null}

              <h2>
                {cta.titleBoxGlow
                  ? (() => {
                      const t = cta.title || "";
                      const w = cta.titleBoxGlow;
                      const idx = t.indexOf(w);
                      if (idx === -1) return t;
                      return (
                        <>
                          {t.slice(0, idx)}
                          <span className="highlight-box-glow">{w}</span>
                          {t.slice(idx + w.length)}
                        </>
                      );
                    })()
                  : <HighlightTitle text={cta.title} words={cta.titleHighlight} />
                }
              </h2>

              {cta.description ? (
                <p>{cta.description}</p>
              ) : null}
            </div>

            <div className="service-route-cta__actions">
              <Button to={`/contacto?mode=proposal&niche=${niche.slug}`}>
                {cta.primaryLabel || "Quiero una propuesta clara"}
              </Button>

              <button
                type="button"
                className="service-route-cta__ghost"
                aria-label={cta.contestLabel || "Registrarme para concursos"}
              >
                {cta.contestLabel || "Registrarme para concursos"}
              </button>

              <Button to="/servicios" variant="secondary">
                {cta.secondaryLabel || "Ver todos los servicios"}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
