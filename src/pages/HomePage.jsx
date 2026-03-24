import React, { useEffect, useState } from "react";

const OBJETIVO_WORDS = ["marca", "empresa", "crecimiento", "presencia"];
const CAMINOS_CARDS = [
  {
    visualClass: "is-visual-1",
    badge: "01. Marca / Negocio",
    title: "Tengo una marca o negocio",
    description:
      "Branding, contenido, web, redes y presencia digital para emprendedores, marcas personales y pequeños negocios.",
    lead: "Este camino está diseñado para:",
    items: [
      "Fortalecer tu identidad visual y posicionamiento.",
      "Mejorar tu presencia digital en canales clave.",
      "Convertir visitas en contactos o clientes reales.",
      "Unificar la comunicación de tu marca.",
    ],
    chip: "Marca y negocio",
  },
  {
    visualClass: "is-visual-2",
    badge: "02. Presencia visual",
    title: "Necesito presencia visual profesional",
    description:
      "Imagen corporativa, fotografía profesional, video institucional y contenido de marca para empresas y organizaciones.",
    lead: "Con esta opción podrás:",
    items: [
      "Elevar la percepción profesional de tu marca.",
      "Comunicar confianza con imagen coherente.",
      "Generar piezas para web, redes y presentaciones.",
      "Conectar visualmente con clientes y aliados.",
    ],
    chip: "Presencia visual",
  },
  {
    visualClass: "is-visual-3",
    badge: "03. Momento especial",
    title: "Quiero capturar un momento especial",
    description:
      "Fotografía, video, sesiones, bodas, cumpleaños y cobertura visual para recuerdos auténticos y memorables.",
    lead: "Con esta cobertura lograrás:",
    items: [
      "Documentar cada detalle con calidad profesional.",
      "Crear piezas emocionales y atemporales.",
      "Capturar momentos espontáneos con intención.",
      "Entregar recuerdos listos para compartir.",
    ],
    chip: "Momentos especiales",
  },
  {
    visualClass: "is-visual-4",
    badge: "04. Solución a medida",
    title: "Busco una solución creativa a mi idea",
    description:
      "Campañas, proyectos mixtos, combinaciones de servicios y propuestas personalizadas según tu necesidad.",
    lead: "Esta solución personalizada te permite:",
    items: [
      "Diseñar una propuesta alineada a tus objetivos.",
      "Combinar servicios sin perder coherencia visual.",
      "Priorizar acciones según etapa y presupuesto.",
      "Ejecutar con enfoque estratégico y comercial.",
    ],
    chip: "Solución a medida",
  },
];

export default function HomePage() {
  const [wordIndex, setWordIndex] = useState(0);
  const [typedObjetivo, setTypedObjetivo] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeCamino, setActiveCamino] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(() =>
    typeof window !== "undefined" && window.innerWidth <= 980 ? 1 : 2
  );

  const caminoSlides = [];

  for (let index = 0; index < CAMINOS_CARDS.length; index += cardsPerView) {
    caminoSlides.push(CAMINOS_CARDS.slice(index, index + cardsPerView));
  }

  useEffect(() => {
    const currentWord = OBJETIVO_WORDS[wordIndex];
    const typingSpeed = isDeleting ? 45 : 85;
    const pauseBeforeDelete = 1200;
    const pauseBeforeNext = 250;

    let timeout;

    if (!isDeleting && typedObjetivo === currentWord) {
      timeout = setTimeout(() => {
        setIsDeleting(true);
      }, pauseBeforeDelete);
    } else if (isDeleting && typedObjetivo === "") {
      timeout = setTimeout(() => {
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % OBJETIVO_WORDS.length);
      }, pauseBeforeNext);
    } else {
      timeout = setTimeout(() => {
        if (!isDeleting) {
          setTypedObjetivo(currentWord.slice(0, typedObjetivo.length + 1));
        } else {
          setTypedObjetivo(
            currentWord.slice(0, Math.max(typedObjetivo.length - 1, 0))
          );
        }
      }, typingSpeed);
    }

    return () => clearTimeout(timeout);
  }, [typedObjetivo, isDeleting, wordIndex]);

  useEffect(() => {
    const handleResize = () => {
      setCardsPerView(window.innerWidth <= 980 ? 1 : 2);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setActiveCamino((prev) => Math.min(prev, caminoSlides.length - 1));
  }, [caminoSlides.length]);

  useEffect(() => {
    if (caminoSlides.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveCamino((prev) => (prev + 1) % caminoSlides.length);
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, [caminoSlides.length]);

  return (
    <main>
      <section id="hero">
        <div className="container">
          <div className="hero-editorial">
            <div className="hero-editorial__content">
              <h1 className="hero-editorial__title">
                Estrategias{" "}
                <span className="hero-editorial__type">
                  <span className="hero-editorial__type--yellow">visuales</span>
                </span>{" "}
                para impulsar tu{" "}
                <span className="hero-editorial__type">
                  <span className="hero-editorial__type--yellow">
                    {typedObjetivo || "\u00A0"}
                  </span>
                  <span className="hero-editorial__cursor" aria-hidden="true">
                    |
                  </span>
                </span>
              </h1>

              <p className="hero-editorial__text">
                En Ideas Estudio, diseñamos estrategias visuales que impulsan tus
                objetivos. Ya sea posicionar tu marca, fortalecer la identidad de
                tu negocio o crear un impacto duradero, convertimos cada concepto
                en un paso estratégico hacia tus metas.
              </p>

              <div className="hero-editorial__actions">
                <a
                  href="#caminos"
                  className="hero-editorial__button hero-editorial__button--dark"
                >
                  Explorar caminos
                </a>

                <a
                  href="#contacto"
                  className="hero-editorial__button hero-editorial__button--yellow"
                >
                  Solicitar información
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="caminos" className="section-split">
        <div className="container">
          <div className="prospectos-ref">
            <div className="prospectos-ref__intro">
              <p className="prospectos-ref__eyebrow">Elige tu camino</p>
              <h2 className="prospectos-ref__title">
                Encuentra la solución ideal para ti
              </h2>
              <p className="prospectos-ref__text">
                Sabemos que cada proyecto es único. Por eso, puedes elegir la
                opción que mejor se ajuste a tus necesidades y avanzar por el
                camino más adecuado.
              </p>
            </div>

            <div className="prospectos-ref__slider">
              <button
                type="button"
                className="prospectos-ref__arrow"
                onClick={() =>
                  setActiveCamino((prev) => (prev - 1 + caminoSlides.length) % caminoSlides.length)
                }
                aria-label="Tarjeta anterior"
              >
                ‹
              </button>

              <div className="prospectos-ref__viewport">
                <div
                  className="prospectos-ref__grid"
                  style={{ transform: `translateX(-${activeCamino * 100}%)` }}
                >
                  {caminoSlides.map((slide, slideIndex) => (
                    <div
                      className="prospectos-ref__slide"
                      key={`camino-slide-${slideIndex}`}
                      style={{
                        gridTemplateColumns: `repeat(${cardsPerView}, minmax(0, 1fr))`,
                      }}
                    >
                      {slide.map((card) => (
                        <article
                          className={`prospecto-ref-card ${card.visualClass}`}
                          key={card.badge}
                        >
                          <div className="prospecto-ref-card__media">
                            <div className="prospecto-ref-card__visual" />
                            <span className="prospecto-ref-card__badge">{card.badge}</span>
                          </div>
                          <div className="prospecto-ref-card__body">
                            <h3>{card.title}</h3>
                            <p className="prospecto-ref-card__description">{card.description}</p>
                            <p className="prospecto-ref-card__lead">{card.lead}</p>
                            <ul className="prospecto-ref-card__list">
                              {card.items.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                            <div className="prospecto-ref-card__footer">
                              <span className="prospecto-ref-card__chip">{card.chip}</span>
                              <a className="prospecto-ref-card__cta" href="#contacto">
                                Más información
                              </a>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="prospectos-ref__arrow"
                onClick={() => setActiveCamino((prev) => (prev + 1) % caminoSlides.length)}
                aria-label="Siguiente tarjeta"
              >
                ›
              </button>
            </div>

            <div className="prospectos-ref__dots" aria-label="Navegación de tarjetas">
              {caminoSlides.map((_, index) => (
                <button
                  key={`camino-dot-${index}`}
                  type="button"
                  className={`prospectos-ref__dot ${
                    index === activeCamino ? "is-active" : ""
                  }`}
                  onClick={() => setActiveCamino(index)}
                  aria-label={`Ir al slide ${index + 1}`}
                  aria-current={index === activeCamino ? "true" : "false"}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="servicios" className="section-split">
        <div className="container">
          <div className="servicios-preview">
            <p className="servicios-preview__eyebrow">Servicios principales</p>

            <div className="servicios-preview__heading">
              <h2 className="servicios-preview__title">
                Un estudio creativo con soluciones visuales y digitales
              </h2>
              <p className="servicios-preview__text">
                Trabajamos fotografía, video, diseño, contenido y presencia
                digital para ayudarte a comunicar mejor tu marca, tu negocio o tu
                momento especial.
              </p>
            </div>

            <div className="servicios-preview__grid">
              <article className="servicio-preview-card">
                <h3>Fotografía profesional</h3>
                <p>
                  Estudio, exterior, eventos, productos, bodas y sesiones
                  especiales.
                </p>
              </article>

              <article className="servicio-preview-card">
                <h3>Producción de video</h3>
                <p>
                  Contenido visual para marcas, negocios, campañas y cobertura de
                  eventos.
                </p>
              </article>

              <article className="servicio-preview-card">
                <h3>Diseño gráfico</h3>
                <p>
                  Identidad visual, piezas promocionales y materiales para
                  comunicar mejor.
                </p>
              </article>

              <article className="servicio-preview-card">
                <h3>Presencia digital</h3>
                <p>
                  Contenido, redes sociales, páginas web y apoyo creativo para
                  crecer online.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section id="portafolio" className="section-split">
        <div className="container">
          <p>Placeholder</p>
          <h2>Portafolio</h2>
        </div>
      </section>

      <section id="contacto" className="section-split">
        <div className="container">
          <p>Placeholder</p>
          <h2>Contacto / CTA final</h2>
        </div>
      </section>
    </main>
  );
}
