import { useId, useState } from "react";
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
import SectionTitle from "@/components/shared/SectionTitle.jsx";
import ServiceNicheHero from "@/components/services/ServiceNicheHero.jsx";
import serviceShowcaseImage from "../../../quland-template/client/assets/images/home-five/hero/service-img.webp";
import serviceShowcaseShape from "../../../quland-template/client/assets/images/home-five/tab-content-shape.png";

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

function SupportList({ items = [] }) {
  if (!items.length) return null;

  return (
    <ul className="service-segment-template__list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function RailList({ items = [] }) {
  if (!items.length) return null;

  return (
    <div className="service-segment-template__rail-list">
      {items.map((item, index) => (
        <article key={item} className="service-segment-template__rail-item">
          <span className="service-segment-template__rail-index">
            {String(index + 1).padStart(2, "0")}
          </span>
          <p>{item}</p>
        </article>
      ))}
    </div>
  );
}

export default function ServiceNicheTemplate({ niche }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const baseId = useId();

  const orientation = niche.orientation || {};
  const catalogSection = niche.catalogSection || {};
  const catalogCards = niche.catalogCards || [];
  const highlight = niche.highlight || {};
  const supportSection = niche.supportSection || {};
  const supportCards = niche.supportCards || [];
  const cta = niche.cta || {};
  const iconSet = getIconSet(niche.slug);
  const safeActiveIndex = Math.min(activeIndex, Math.max(catalogCards.length - 1, 0));

  return (
    <div
      className={`service-segment-template service-segment-template--${niche.tone || "default"}`}
    >
      <ServiceNicheHero niche={niche} />

      <section className="section">
        <div className="container">
          <div className="service-segment-template__orientation-grid">
            <article className="service-segment-template__lead">
              <span className="service-segment-template__section-kicker">
                {orientation.eyebrow || "Mapa del segmento"}
              </span>
              <h2>{orientation.title || niche.title}</h2>
              <p>{orientation.description || niche.intro}</p>
              <SupportList items={orientation.problemPoints || []} />
            </article>

            <div className="service-segment-template__orientation-stack">
              <article className="service-segment-template__info-card">
                <span className="service-segment-template__card-label">
                  {orientation.audienceTitle || "Quien suele entrar aqui"}
                </span>
                <SupportList items={orientation.audienceItems || niche.audience || []} />
              </article>

              <article className="service-segment-template__info-card service-segment-template__info-card--dark">
                <span className="service-segment-template__card-label">
                  {orientation.prioritiesTitle || "Lo que conviene resolver primero"}
                </span>
                <SupportList items={orientation.prioritiesItems || niche.priorities || []} />
              </article>
            </div>
          </div>
        </div>
      </section>

      <section id="rutas-principales" className="section">
        <div className="service-h5-showcase">
          <div className="container">
            <div className="service-h5-showcase__intro">
              <span className="service-h5-showcase__eyebrow">
                {catalogSection.eyebrow || "Rutas principales"}
              </span>
              <h2>
                {catalogSection.title ||
                  "Servicios y combinaciones que suelen funcionar dentro de este segmento"}
              </h2>
              <p>
                {catalogSection.subtitle ||
                  "Cada bloque ya se presenta como una ruta real de servicio, no como una maqueta vacia."}
              </p>
            </div>

            {catalogCards.length ? (
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
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="service-segment-template__highlight-frame">
            <aside className="service-segment-template__highlight-rail">
              <span className="service-segment-template__card-label">
                {highlight.railLabel || "Enfoque del segmento"}
              </span>
              <RailList items={highlight.railItems || []} />
            </aside>

            <article className="service-segment-template__highlight-main">
              <span className="service-segment-template__section-kicker">
                {highlight.eyebrow || "Combinacion recomendada"}
              </span>
              <h2>{highlight.title || niche.title}</h2>
              <p>{highlight.description || niche.intro}</p>
              <Button to={`/contacto?mode=proposal&niche=${niche.slug}`}>
                {highlight.ctaLabel || "Solicitar esta direccion"}
              </Button>
            </article>

            <aside className="service-segment-template__highlight-accent">
              <span className="service-segment-template__card-label">
                {highlight.accentLabel || "Tambien suele mezclarse con"}
              </span>
              <h3>{highlight.accentTitle || "Rutas complementarias"}</h3>

              <div className="service-segment-template__chip-group">
                {(highlight.accentItems || []).map((item) => (
                  <span key={item} className="service-segment-template__chip">
                    {item}
                  </span>
                ))}
              </div>

              {highlight.note ? <p>{highlight.note}</p> : null}
            </aside>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionTitle
            eyebrow={supportSection.eyebrow || "Apoyo adicional"}
            title={
              supportSection.title ||
              "Bloques complementarios para que esta ruta se sienta mas util y menos abstracta"
            }
            subtitle={
              supportSection.subtitle ||
              "Aqui se muestran combinaciones, apoyos y siguientes pasos que ayudan a convertir mejor la necesidad en una propuesta concreta."
            }
          />

          <div className="service-segment-template__support-grid">
            {supportCards.map((card) => (
              <article key={card.title} className="service-segment-template__support-card">
                <span className="service-segment-template__catalog-eyebrow">
                  {card.eyebrow}
                </span>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="service-segment-template__cta">
            <div className="service-segment-template__cta-copy">
              <span className="service-segment-template__section-kicker">
                {cta.eyebrow || "Siguiente paso"}
              </span>
              <h2>{cta.title || "Llevemos esta ruta a una propuesta real."}</h2>
              <p>
                {cta.description ||
                  "Podemos ayudarte a bajar este segmento a una combinacion concreta de servicios segun tu proyecto, tu momento y tu objetivo comercial."}
              </p>
            </div>

            <div className="service-segment-template__cta-actions">
              <Button to={`/contacto?mode=proposal&niche=${niche.slug}`}>
                {cta.primaryLabel || "Solicitar orientacion"}
              </Button>
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
