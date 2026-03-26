import { useLoaderData } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import SectionTitle from "@/components/shared/SectionTitle.jsx";

function buildMosaicTiles(niche) {
  return [
    {
      key: "principal",
      size: "large",
      eyebrow: "Ruta principal",
      title: niche.title,
      text: niche.heroSubtitle,
    },
    {
      key: "audience-1",
      size: "small",
      eyebrow: "Pensado para",
      title: niche.audience[0] || "Clientes con una necesidad clara",
      text: niche.priorities[0] || "Organizar la solución con más criterio.",
    },
    {
      key: "audience-2",
      size: "small",
      eyebrow: "Prioridad",
      title: niche.audience[1] || "Proyectos con enfoque visual",
      text: niche.priorities[1] || "Aterrizar una dirección visual más sólida.",
    },
    {
      key: "catalog-1",
      size: "wide",
      eyebrow: "Bloque futuro",
      title: niche.catalogPreview[0]?.title || "Servicios por definir",
      text:
        niche.catalogPreview[0]?.description ||
        "Aquí después podrás conectar servicios reales sin rehacer la estructura.",
    },
    {
      key: "catalog-2",
      size: "wide",
      eyebrow: "Bloque futuro",
      title: niche.catalogPreview[1]?.title || "Ruta lista para crecer",
      text:
        niche.catalogPreview[1]?.description ||
        "Espacio preparado para ordenar paquetes, variantes o categorías internas.",
    },
  ];
}

function buildPreviewCards(niche) {
  const labels = ["Base inicial", "Ruta sugerida", "Bloque flexible", "Siguiente capa"];

  return niche.catalogPreview.map((item, index) => ({
    ...item,
    label: labels[index] || "Bloque editorial",
    cta: "Ver estructura",
  }));
}

function buildMiniList(niche) {
  return niche.priorities.slice(0, 2).map((item, index) => ({
    id: index + 1,
    title: item,
    caption: niche.audience[index] || "Aplicación posible",
  }));
}

function buildStoryCards(niche) {
  return niche.audience.slice(0, 3).map((item, index) => ({
    id: index + 1,
    title: item,
    meta: niche.priorities[index] || "Ruta preparada para crecer con catálogo propio.",
  }));
}

export default function ServiceNichePage() {
  const { niche } = useLoaderData();

  if (!niche) {
    return (
      <section className="section">
        <div className="container">
          <div className="empty-state">
            <h1>Nicho no encontrado</h1>
            <p>No encontramos la página especializada que intentas abrir.</p>
            <div className="empty-state__actions">
              <Button to="/servicios">Volver a servicios</Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const mosaicTiles = buildMosaicTiles(niche);
  const previewCards = buildPreviewCards(niche);
  const miniList = buildMiniList(niche);
  const storyCards = buildStoryCards(niche);

  return (
    <div className={`service-niche-page service-niche-page--${niche.tone || "default"}`}>
      <section className="service-niche-hero">
        <div className="container">
          <div className="service-niche-hero__frame">
            <div className="service-niche-hero__visual service-niche-hero__visual--left">
              <span>{niche.audience[0]}</span>
            </div>

            <div className="service-niche-hero__content">
              <span className="service-niche-hero__badge">{niche.eyebrow}</span>
              <h1>{niche.heroTitle}</h1>
              <p>{niche.heroSubtitle}</p>

              <div className="service-niche-hero__tags">
                {niche.audience.slice(0, 3).map((item) => (
                  <span key={item} className="service-niche-hero__tag">
                    {item}
                  </span>
                ))}
              </div>

              <div className="service-niche-hero__actions">
                <Button href="#catalogo-visual">Ver estructura</Button>
                <Button to="/servicios" variant="secondary">
                  Volver a servicios
                </Button>
              </div>
            </div>

            <div className="service-niche-hero__visual service-niche-hero__visual--right">
              <span>{niche.catalogPreview[0]?.title || niche.title}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section service-niche-mosaic-section">
        <div className="container">
          <div className="service-niche-mosaic">
            {mosaicTiles.map((tile) => (
              <article
                key={tile.key}
                className={`service-niche-mosaic__tile service-niche-mosaic__tile--${tile.size}`}
              >
                <span className="service-niche-mosaic__eyebrow">{tile.eyebrow}</span>
                <h2>{tile.title}</h2>
                <p>{tile.text}</p>
                <span className="service-niche-mosaic__cta">Base lista para crecer</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="catalogo-visual" className="section">
        <div className="container">
          <SectionTitle
            eyebrow="Catalogo visual"
            title="Una estructura editorial para ordenar después tus servicios"
            subtitle="Todavía no estamos conectando el catálogo real. Aquí solo se define cómo se podría ver cada bloque dentro de esta ruta especializada."
          />

          <div className="service-niche-preview-grid">
            {previewCards.map((item, index) => (
              <article key={item.title} className="service-niche-preview-card">
                <div className="service-niche-preview-card__media">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className="service-niche-preview-card__body">
                  <small>{item.label}</small>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <span className="service-niche-preview-card__cta">{item.cta}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section service-niche-banner-section">
        <div className="container">
          <div className="service-niche-banner">
            <div className="service-niche-banner__mini">
              <div className="service-niche-banner__mini-head">
                <span>Enfoques clave</span>
                <div className="service-niche-banner__mini-arrows" aria-hidden="true">
                  <span>‹</span>
                  <span>›</span>
                </div>
              </div>

              <div className="service-niche-banner__mini-list">
                {miniList.map((item) => (
                  <div key={item.id} className="service-niche-banner__mini-item">
                    <div className="service-niche-banner__mini-index">
                      {String(item.id).padStart(2, "0")}
                    </div>
                    <div>
                      <span>{item.caption}</span>
                      <p>{item.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <article className="service-niche-banner__feature">
              <span className="service-niche-banner__feature-badge">Ruta preparada</span>
              <div className="service-niche-banner__feature-content">
                <span className="service-niche-banner__feature-eyebrow">Ideas Estudio</span>
                <h2>{niche.title}</h2>
                <p>{niche.intro}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionTitle
            eyebrow="Guia visual"
            title="Pistas editoriales para seguir construyendo esta ruta"
            subtitle="Estos bloques funcionan como referencias para el tipo de contenido, enfoque y organización que puede tomar esta página más adelante."
          />

          <div className="service-niche-story-grid">
            {storyCards.map((item) => (
              <article key={item.id} className="service-niche-story-card">
                <div className="service-niche-story-card__media" />
                <div className="service-niche-story-card__body">
                  <span>{niche.eyebrow}</span>
                  <h3>{item.title}</h3>
                  <p>{item.meta}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="service-niche-cta">
            <div>
              <span className="eyebrow">Siguiente paso</span>
              <h2>Cuando apruebes la dirección visual, conectamos el catálogo real.</h2>
              <p>
                La estructura ya queda lista para convertir estos bloques en
                categorías, tarjetas de servicio o paquetes especializados sin
                rehacer la experiencia pública.
              </p>
            </div>

            <div className="service-niche-cta__actions">
              <Button to={`/contacto?mode=proposal&niche=${niche.slug}`}>
                Solicitar orientación
              </Button>
              <Button to="/servicios" variant="secondary">
                Ver todos los servicios
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
