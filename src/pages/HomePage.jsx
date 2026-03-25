import React, { useEffect, useState } from "react";
import portfolioProcessHero from "../assets/quland-process/process-1.png";
import portfolioProcessStep1 from "../assets/quland-process/process-2.png";
import portfolioProcessStep2 from "../assets/quland-process/process-3.png";
import portfolioProcessStep3 from "../assets/quland-process/process-4.png";
import portfolioProcessStep4 from "../assets/quland-process/process-5.png";

const PORTFOLIO_VISUAL_SLIDES = [
  {
    image: portfolioProcessHero,
    eyebrow: "Ideas Estudio",
    title: "Soluciones visuales para marcas y negocios",
    text: "Fotografía, video, diseño y presencia digital con enfoque estratégico.",
  },
  {
    image: portfolioProcessStep1,
    eyebrow: "Dirección",
    title: "Concepto y enfoque creativo",
    text: "Definimos la intención visual antes de ejecutar cada pieza.",
  },
  {
    image: portfolioProcessStep2,
    eyebrow: "Diseño",
    title: "Presencia visual profesional",
    text: "Construimos una imagen más clara, sólida y coherente para tu proyecto.",
  },
  {
    image: portfolioProcessStep3,
    eyebrow: "Producción",
    title: "Contenido para web y redes",
    text: "Creamos materiales pensados para comunicar, mostrar y conectar.",
  },
  {
    image: portfolioProcessStep4,
    eyebrow: "Entrega",
    title: "Activos listos para publicar",
    text: "Organizamos tus piezas visuales para que salgan a tiempo y con consistencia.",
  },
  {
    image:
      "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/public-web/presencia-visual.webp",
    eyebrow: "Marca",
    title: "Imagen que inspira confianza",
    text: "Desarrollamos piezas que elevan la percepción profesional de tu servicio.",
  },
  {
    image:
      "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/public-web/marca-negocio.webp",
    eyebrow: "Negocio",
    title: "Comunicación alineada a tu negocio",
    text: "Cada formato responde a tus objetivos comerciales y de posicionamiento.",
  },
  {
    image:
      "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/public-web/solucion-social.webp",
    eyebrow: "Contenido",
    title: "Formatos pensados para compartir",
    text: "Piezas visuales preparadas para redes, campañas y momentos clave.",
  },
];

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

const PORTFOLIO_PROCESS_STEPS = [
  {
    number: "01",
    title: "Descubrimiento y enfoque",
    description:
      "Analizamos tu idea, tus objetivos y el contexto de tu marca para definir dirección, alcance y prioridades.",
    image: portfolioProcessStep1,
  },
  {
    number: "02",
    title: "Dirección visual",
    description:
      "Aterrizamos estilo, referencias, estructura y recursos para que la propuesta se vea coherente y profesional.",
    image: portfolioProcessStep2,
  },
  {
    number: "03",
    title: "Producción y desarrollo",
    description:
      "Ejecutamos fotografía, video, diseño o contenido digital con una línea visual clara y consistente.",
    image: portfolioProcessStep3,
  },
  {
    number: "04",
    title: "Entrega y optimización",
    description:
      "Organizamos entregables, revisiones finales y ajustes para que el proyecto quede listo para publicar o lanzar.",
    image: portfolioProcessStep4,
  },
];

const SLIDESHOW_INTERVAL_MS = 20000;

export default function HomePage() {
  const [wordIndex, setWordIndex] = useState(0);
  const [typedObjetivo, setTypedObjetivo] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeCamino, setActiveCamino] = useState(0);
  const [activePortfolioMedia, setActivePortfolioMedia] = useState(0);
  const [activePortfolioStep, setActivePortfolioStep] = useState(0);
  const [isPortfolioTransitionEnabled, setIsPortfolioTransitionEnabled] = useState(true);
  const [cardsPerView, setCardsPerView] = useState(() =>
    typeof window !== "undefined" && window.innerWidth <= 980 ? 1 : 2
  );

  const caminoSlides = [];
  const portfolioLoopSteps = [...PORTFOLIO_PROCESS_STEPS, ...PORTFOLIO_PROCESS_STEPS];

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
    }, SLIDESHOW_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [caminoSlides.length]);

  useEffect(() => {
    if (PORTFOLIO_PROCESS_STEPS.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setIsPortfolioTransitionEnabled(true);
      setActivePortfolioStep((prev) => prev + 1);
    }, SLIDESHOW_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (PORTFOLIO_VISUAL_SLIDES.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActivePortfolioMedia((prev) => (prev + 1) % PORTFOLIO_VISUAL_SLIDES.length);
    }, SLIDESHOW_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (activePortfolioStep < PORTFOLIO_PROCESS_STEPS.length) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setIsPortfolioTransitionEnabled(false);
      setActivePortfolioStep(0);
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [activePortfolioStep]);

  useEffect(() => {
    if (isPortfolioTransitionEnabled) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      setIsPortfolioTransitionEnabled(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isPortfolioTransitionEnabled]);

  const portfolioActiveDot = activePortfolioStep % PORTFOLIO_PROCESS_STEPS.length;
  const getPortfolioMediaIndex = (offset = 0) =>
    (activePortfolioMedia + offset) % PORTFOLIO_VISUAL_SLIDES.length;

  const handlePortfolioNext = () => {
    setIsPortfolioTransitionEnabled(true);
    setActivePortfolioStep((prev) => prev + 1);
  };

  const handlePortfolioPrev = () => {
    setIsPortfolioTransitionEnabled(true);
    setActivePortfolioStep((prev) =>
      prev === 0 ? PORTFOLIO_PROCESS_STEPS.length - 1 : prev - 1
    );
  };

  const handlePortfolioDot = (index) => {
    setIsPortfolioTransitionEnabled(true);
    setActivePortfolioStep(index);
  };

  const handlePortfolioMediaNext = () => {
    setActivePortfolioMedia((prev) => (prev + 1) % PORTFOLIO_VISUAL_SLIDES.length);
  };

  const handlePortfolioMediaPrev = () => {
    setActivePortfolioMedia((prev) =>
      prev === 0 ? PORTFOLIO_VISUAL_SLIDES.length - 1 : prev - 1
    );
  };

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

      <section id="portafolio" className="section-split">
        <div className="container">
          <div className="portfolio-process">
            <div className="portfolio-process__top">
              <div className="portfolio-process__media-card portfolio-process__media-card--wide">
                {PORTFOLIO_VISUAL_SLIDES.map((slide, index) => (
                  <div
                    key={`portfolio-top-${index}`}
                    className={`portfolio-process__media-slide ${
                      index === getPortfolioMediaIndex() ? "is-active" : ""
                    }`}
                  >
                    <img src={slide.image} alt="" />
                    <div className="portfolio-process__media-overlay">
                      <p className="portfolio-process__media-eyebrow">{slide.eyebrow}</p>
                      <h3>{slide.title}</h3>
                      <p className="portfolio-process__media-text">{slide.text}</p>
                    </div>
                  </div>
                ))}
                <div className="portfolio-process__media-dots" aria-hidden="true">
                  {PORTFOLIO_VISUAL_SLIDES.map((_, index) => (
                    <span
                      key={`portfolio-top-dot-${index}`}
                      className={`portfolio-process__media-dot ${
                        index === getPortfolioMediaIndex() ? "is-active" : ""
                      }`}
                    />
                  ))}
                </div>

                <div className="portfolio-process__media-controls">
                  <button
                    type="button"
                    className="portfolio-process__media-control"
                    onClick={handlePortfolioMediaPrev}
                    aria-label="Imagen anterior"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    className="portfolio-process__media-control"
                    onClick={handlePortfolioMediaNext}
                    aria-label="Imagen siguiente"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>

            <div className="portfolio-process__body">
              <div className="portfolio-process__left-stack">
                <div className="portfolio-process__media-card portfolio-process__media-card--stack">
                  {PORTFOLIO_VISUAL_SLIDES.map((slide, index) => (
                    <div
                      key={`portfolio-left-a-${index}`}
                      className={`portfolio-process__media-slide ${
                        index === getPortfolioMediaIndex(1) ? "is-active" : ""
                      }`}
                    >
                      <img src={slide.image} alt="" />
                      <div className="portfolio-process__media-overlay portfolio-process__media-overlay--compact">
                        <p className="portfolio-process__media-eyebrow">{slide.eyebrow}</p>
                        <h3>{slide.title}</h3>
                        <p className="portfolio-process__media-text">{slide.text}</p>
                      </div>
                    </div>
                  ))}

                  <div className="portfolio-process__media-controls portfolio-process__media-controls--stack">
                    <button
                      type="button"
                      className="portfolio-process__media-control"
                      onClick={handlePortfolioMediaPrev}
                      aria-label="Imagen anterior"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      className="portfolio-process__media-control"
                      onClick={handlePortfolioMediaNext}
                      aria-label="Imagen siguiente"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div className="portfolio-process__media-card portfolio-process__media-card--stack">
                  {PORTFOLIO_VISUAL_SLIDES.map((slide, index) => (
                    <div
                      key={`portfolio-left-b-${index}`}
                      className={`portfolio-process__media-slide ${
                        index === getPortfolioMediaIndex(2) ? "is-active" : ""
                      }`}
                    >
                      <img src={slide.image} alt="" />
                      <div className="portfolio-process__media-overlay portfolio-process__media-overlay--compact">
                        <p className="portfolio-process__media-eyebrow">{slide.eyebrow}</p>
                        <h3>{slide.title}</h3>
                        <p className="portfolio-process__media-text">{slide.text}</p>
                      </div>
                    </div>
                  ))}

                  <div className="portfolio-process__media-controls portfolio-process__media-controls--stack">
                    <button
                      type="button"
                      className="portfolio-process__media-control"
                      onClick={handlePortfolioMediaPrev}
                      aria-label="Imagen anterior"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      className="portfolio-process__media-control"
                      onClick={handlePortfolioMediaNext}
                      aria-label="Imagen siguiente"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>

              <div className="portfolio-process__list">
                <div className="portfolio-process__slider">
                  <div className="portfolio-process__viewport">
                    <div
                      className={`portfolio-process__track ${
                        isPortfolioTransitionEnabled ? "is-animated" : ""
                      }`}
                      style={{
                        transform: `translateY(calc(-${activePortfolioStep} * (var(--portfolio-card-height) + var(--portfolio-card-gap))))`,
                      }}
                    >
                      {portfolioLoopSteps.map((step, index) => (
                        <article className="portfolio-process__item" key={`${step.number}-${index}`}>
                          <div className="portfolio-process__item-media">
                            <img src={step.image} alt="" />
                          </div>

                          <div className="portfolio-process__item-body">
                            <h3>{step.title}</h3>
                            <p>{step.description}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="portfolio-process__controls">
                    <button
                      type="button"
                      className="portfolio-process__control"
                      onClick={handlePortfolioPrev}
                      aria-label="Tarjeta anterior"
                    >
                      ↑
                    </button>

                    <div className="portfolio-process__dots" aria-label="Navegación del proceso">
                      {PORTFOLIO_PROCESS_STEPS.map((step, index) => (
                        <button
                          key={`portfolio-step-${step.number}`}
                          type="button"
                          className={`portfolio-process__dot ${
                            index === portfolioActiveDot ? "is-active" : ""
                          }`}
                          onClick={() => handlePortfolioDot(index)}
                          aria-label={`Ir al paso ${step.number}`}
                          aria-current={index === portfolioActiveDot ? "true" : "false"}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      className="portfolio-process__control"
                      onClick={handlePortfolioNext}
                      aria-label="Siguiente tarjeta"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </div>
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

      <section id="contacto" className="section-split">
        <div className="container">
          <p>Placeholder</p>
          <h2>Contacto / CTA final</h2>
        </div>
      </section>
    </main>
  );
}
