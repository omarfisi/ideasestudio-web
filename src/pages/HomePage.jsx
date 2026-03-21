import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFeaturedServices } from "@/lib/api.js";
import HeroClientsShowcase from "@/components/home/HeroClientsShowcase.jsx";

const solutionBlocks = [
  {
    number: "01",
    title: "Fotografia Profesional",
    text: "Retratos, bodas, sesiones, eventos, productos y contenido visual de alto impacto.",
  },
  {
    number: "02",
    title: "Produccion de Videos",
    text: "Piezas comerciales, videos de marca, contenido promocional y material para campanas.",
  },
  {
    number: "03",
    title: "Diseno Web",
    text: "Webs limpias, modernas y enfocadas en convertir visitas en contactos o ventas.",
  },
  {
    number: "04",
    title: "Branding y Marketing",
    text: "Identidad visual, materiales promocionales, estrategia de contenido y presencia digital.",
  },
];

const processSteps = [
  {
    step: "01",
    title: "Descubrimiento",
    text: "Entendemos tu negocio, objetivo, estilo, mercado y el tipo de cliente que quieres atraer.",
  },
  {
    step: "02",
    title: "Direccion Creativa",
    text: "Definimos la linea visual y la solucion correcta segun tu etapa, servicio y necesidad.",
  },
  {
    step: "03",
    title: "Produccion",
    text: "Disenamos, fotografiamos, desarrollamos o producimos el activo visual y comercial.",
  },
  {
    step: "04",
    title: "Entrega y Activacion",
    text: "Dejamos tu pieza lista para publicarse, vender, presentarse o integrarse a tu operacion.",
  },
];

const portfolioBlocks = [
  {
    eyebrow: "Branding",
    title: "Identidades visuales con presencia",
    text: "Diseno limpio, elegante y funcional para marcas que quieren verse serias y memorables.",
  },
  {
    eyebrow: "Web",
    title: "Paginas enfocadas en conversion",
    text: "Estructuras modernas con jerarquia clara, servicios visibles y llamadas a la accion correctas.",
  },
  {
    eyebrow: "Foto + Video",
    title: "Contenido que eleva la percepcion",
    text: "Imagenes y piezas audiovisuales que comunican valor, confianza y profesionalismo.",
  },
];

const fallbackServices = [
  {
    id: "fallback-1",
    name: "Diseno de Pagina Web Basica",
    slug: "diseno-de-pagina-web-basica",
    category: "web",
    shortDescription:
      "Web profesional para presentar tu marca, servicios y contacto con estructura clara.",
    price: 499.99,
    currency: "USD",
    deliveryTime: "30 dias",
    includes: [
      "Diseno responsive",
      "Secciones clave",
      "Formulario de contacto",
    ],
  },
  {
    id: "fallback-2",
    name: "Diseno de Logotipo",
    slug: "diseno-de-logotipo",
    category: "branding_design",
    shortDescription:
      "Identidad visual profesional alineada a la esencia y posicionamiento de tu marca.",
    price: 345.95,
    currency: "USD",
    deliveryTime: "30 dias",
    includes: ["Investigacion base", "Conceptos creativos", "Entrega final"],
  },
  {
    id: "fallback-3",
    name: "Fotografia Profesional de Bodas",
    slug: "fotografia-profesional-de-bodas",
    category: "photography",
    shortDescription:
      "Cobertura fotografica emotiva y profesional para documentar el gran dia.",
    price: 999.95,
    currency: "USD",
    deliveryTime: "A coordinar",
    includes: ["Cobertura del evento", "Edicion profesional", "Entrega digital"],
  },
];

function formatCurrency(value, currency = "USD") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Cotizacion personalizada";
  }

  return new Intl.NumberFormat("es-PR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function normalizeCategoryLabel(category) {
  const map = {
    web: "Web",
    branding_design: "Branding",
    photography: "Fotografia",
    marketing: "Marketing",
    social_media: "Redes Sociales",
    video: "Video",
    others: "Servicios",
    service: "Servicios",
  };

  return map[category] || "Servicios";
}

function getServiceContactUrl(service) {
  const name = encodeURIComponent(service?.name || "Servicio");
  const slug = encodeURIComponent(service?.slug || "");
  return `/contacto?service=${name}&serviceSlug=${slug}&mode=proposal`;
}

export default function HomePage() {
  const [featuredServices, setFeaturedServices] = useState(fallbackServices);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadFeatured() {
      try {
        setServicesLoading(true);
        setServicesError("");
        const data = await getFeaturedServices(6);

        if (!ignore && Array.isArray(data) && data.length) {
          setFeaturedServices(data);
        }
      } catch (error) {
        if (!ignore) {
          setServicesError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los servicios destacados."
          );
        }
      } finally {
        if (!ignore) {
          setServicesLoading(false);
        }
      }
    }

    loadFeatured();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <main className="home-redesign">
      <HeroClientsShowcase />

      <section className="home-section home-section--dark">
        <div className="container">
          <div className="home-section-heading home-section-heading--dark">
            <span className="home-section-heading__eyebrow">Que hacemos</span>
            <h2>Servicios creativos con estructura comercial real</h2>
            <p>
              La idea no es solo verse bien. La idea es que la marca, la web y
              el contenido trabajen para vender, presentar o posicionar mejor.
            </p>
          </div>

          <div className="home-solutions-grid">
            {solutionBlocks.map((item) => (
              <article key={item.number} className="home-solution-card">
                <span className="home-solution-card__number">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="servicios" className="home-section">
        <div className="container">
          <div className="home-section-heading">
            <span className="home-section-heading__eyebrow">
              Servicios destacados
            </span>
            <h2>Catalogo real conectado al CRM</h2>
            <p>
              Esta seccion toma los servicios del backend y los presenta dentro
              de una Home mas fuerte, mas clara y mas alineada con la marca.
            </p>
          </div>

          {servicesError ? (
            <div className="home-alert">
              No se pudieron cargar algunos servicios en vivo. Se esta
              mostrando una version segura de respaldo.
            </div>
          ) : null}

          <div className="home-services-grid">
            {featuredServices.map((service) => (
              <article
                key={service.id || service.slug}
                className="home-service-card"
              >
                <div className="home-service-card__top">
                  <span className="home-service-card__tag">
                    {normalizeCategoryLabel(service.category)}
                  </span>
                  <span className="home-service-card__price">
                    {formatCurrency(service.price, service.currency || "USD")}
                  </span>
                </div>

                <h3>{service.name}</h3>
                <p>
                  {service.shortDescription ||
                    "Servicio profesional disenado para fortalecer tu presencia visual y comercial."}
                </p>

                <div className="home-service-card__meta">
                  <span>{service.deliveryTime || "A coordinar"}</span>
                  <span>{service.slug ? "Disponible" : "Consulta"}</span>
                </div>

                <ul className="home-service-card__list">
                  {(service.includes || []).slice(0, 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <div className="home-service-card__actions">
                  <Link
                    to={`/servicios/${service.slug}`}
                    className="home-btn home-btn--primary home-btn--small"
                  >
                    Ver servicio
                  </Link>

                  <Link
                    to={getServiceContactUrl(service)}
                    className="home-btn home-btn--ghost home-btn--small"
                  >
                    Solicitar
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="home-section__footer">
            <Link to="/servicios" className="home-btn home-btn--secondary">
              Ver todo el catalogo
            </Link>
          </div>

          {servicesLoading ? (
            <p className="home-loading-text">Cargando servicios destacados...</p>
          ) : null}
        </div>
      </section>

      <section className="home-section">
        <div className="container home-process-wrapper">
          <div className="home-section-heading home-section-heading--left">
            <span className="home-section-heading__eyebrow">Proceso</span>
            <h2>Una metodologia simple para que todo se vea y funcione mejor</h2>
            <p>
              No se trata de llenar la pagina con cosas. Se trata de construir
              un recorrido visual y comercial que tenga sentido.
            </p>
          </div>

          <div className="home-process-grid">
            {processSteps.map((item) => (
              <article key={item.step} className="home-process-card">
                <span className="home-process-card__step">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-section--portfolio">
        <div className="container">
          <div className="home-section-heading">
            <span className="home-section-heading__eyebrow">
              Direccion visual
            </span>
            <h2>Una Home con mas caracter, contraste y enfoque premium</h2>
            <p>
              Inspirada en referencias mas editoriales y modernas, pero
              aterrizada al lenguaje de Ideas Estudio: limpia, directa y
              comercial.
            </p>
          </div>

          <div className="home-portfolio-grid">
            {portfolioBlocks.map((item) => (
              <article key={item.title} className="home-portfolio-card">
                <span className="home-portfolio-card__eyebrow">
                  {item.eyebrow}
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-cta">
        <div className="container home-cta__box">
          <div>
            <span className="home-section-heading__eyebrow">Ideas Estudio</span>
            <h2>Listo para redisenar tu presencia visual y comercial?</h2>
            <p>
              Desde branding y web hasta fotografia, video y contenido, la Home
              ya queda alineada a un sistema mas fuerte, segmentado y listo para
              crecer.
            </p>
          </div>

          <div className="home-cta__actions">
            <Link
              to="/contacto?mode=proposal"
              className="home-btn home-btn--primary"
            >
              Solicitar propuesta
            </Link>
            <Link to="/servicios" className="home-btn home-btn--secondary">
              Explorar servicios
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
