import Button from "@/components/shared/Button.jsx";
import SectionTitle from "@/components/shared/SectionTitle.jsx";
import ServiceNicheHero from "@/components/services/ServiceNicheHero.jsx";

const modeClassMap = {
  Consulta: "is-consulta",
  "Cotizacion": "is-cotizacion",
  "Cotización": "is-cotizacion",
  Reserva: "is-reserva",
  "Compra directa": "is-compra-directa",
};

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
  const orientation = niche.orientation || {};
  const catalogSection = niche.catalogSection || {};
  const catalogCards = niche.catalogCards || [];
  const highlight = niche.highlight || {};
  const supportSection = niche.supportSection || {};
  const supportCards = niche.supportCards || [];
  const cta = niche.cta || {};

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
        <div className="container">
          <SectionTitle
            eyebrow={catalogSection.eyebrow || "Rutas principales"}
            title={
              catalogSection.title ||
              "Servicios y combinaciones que suelen funcionar dentro de este segmento"
            }
            subtitle={
              catalogSection.subtitle ||
              "Cada bloque ya se presenta como una ruta real de servicio, no como una maqueta vacia."
            }
          />

          <div className="service-segment-template__catalog-grid">
            {catalogCards.map((card, index) => (
              <article key={card.title} className="service-segment-template__catalog-card">
                <div className="service-segment-template__catalog-head">
                  <span className="service-segment-template__catalog-eyebrow">
                    {card.eyebrow}
                  </span>
                  {card.saleMode ? (
                    <span
                      className={`service-segment-template__mode-pill ${modeClassMap[card.saleMode] || ""}`}
                    >
                      {card.saleMode}
                    </span>
                  ) : null}
                </div>

                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <SupportList items={card.points || []} />

                <Button
                  to={
                    card.to ||
                    `/contacto?mode=proposal&niche=${niche.slug}&route=${encodeURIComponent(
                      card.title
                    )}`
                  }
                  variant={index === 0 ? "primary" : "secondary"}
                >
                  {card.ctaLabel || "Consultar esta ruta"}
                </Button>
              </article>
            ))}
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
