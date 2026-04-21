import { useEffect, useMemo, useState } from "react";
import TestimonialsSlider from "@/components/shared/TestimonialsSlider.jsx";
import SplitLeadBlock from "@/components/forms/SplitLeadBlock.jsx";
import {
  getTestimonialsForPage,
  TESTIMONIAL_SECTION_COPY,
} from "@/data/testimonials.js";
import { getPublicPortfolioItems } from "@/lib/api.js";
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
      "Para marcas y negocios que necesitan verse mejor, comunicar con más claridad y vender con más orden.",
    lead: "Es para ti si:",
    items: [
      "Tu marca no refleja el nivel real de lo que ofreces.",
      "No tienes una ruta clara entre presencia visual y ventas.",
      "Publicas, pero no comunicas con criterio.",
      "Necesitas branding, contenido, web o piezas comerciales.",
    ],
    chip: "Marca y negocio",
    href: "/servicios",
    ctaLabel: "Ver servicio",
  },
  {
    visualClass: "is-visual-2",
    badge: "02. Presencia visual",
    title: "Necesito presencia visual profesional",
    description:
      "Para empresas y equipos que necesitan proyectar confianza con imagen corporativa, fotografía y materiales de presentación.",
    lead: "Es para ti si:",
    items: [
      "Tu empresa no proyecta el nivel de confianza que merece.",
      "Faltan piezas visuales para reuniones, web o propuestas.",
      "Tu imagen se siente dispersa entre canales y materiales.",
      "Necesitas retrato, foto institucional, video o deck.",
    ],
    chip: "Presencia visual",
    href: "/servicios",
    ctaLabel: "Ver servicio",
  },
  {
    visualClass: "is-visual-3",
    badge: "03. Momento especial",
    title: "Quiero capturar un momento especial",
    description:
      "Para personas que quieren documentar una fecha, sesión o evento con calidad, intención y una experiencia bien presentada.",
    lead: "Es para ti si:",
    items: [
      "No estás seguro qué tipo de sesión o cobertura necesitas.",
      "Quieres guardar un momento importante con criterio.",
      "Buscas una experiencia clara antes de reservar.",
      "Necesitas foto, video o una cobertura más completa.",
    ],
    chip: "Momentos especiales",
    href: "/servicios",
    ctaLabel: "Ver servicio",
  },
  {
    visualClass: "is-visual-4",
    badge: "04. Solución a medida",
    title: "Busco una solución creativa a mi medida",
    description:
      "Para proyectos que mezclan disciplinas o no encajan en un servicio estándar y necesitan una propuesta consultiva.",
    lead: "Es para ti si:",
    items: [
      "Tu necesidad mezcla foto, video, diseño, web o contenido.",
      "El proyecto primero requiere diagnóstico, luego propuesta.",
      "No quieres un paquete fijo, sino una solución a tu medida.",
      "Buscas criterio y ejecución integrada, no servicios sueltos.",
    ],
    chip: "Solución a medida",
    href: "#contacto",
    ctaLabel: "Quiero esta solución",
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

const portfolioIntro = {
  title: "Proyectos visuales que convierten ideas en presencia real.",
  titleHighlight: ["visuales", "presencia real"],
  description:
    "Una muestra de trabajos pensados para comunicar mejor, verse mejor y construir una propuesta más clara, sólida y profesional.",
};

const SLIDESHOW_INTERVAL_MS = 20000;

export default function HomePage() {
  const [wordIndex, setWordIndex] = useState(0);
  const [typedObjetivo, setTypedObjetivo] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeCamino, setActiveCamino] = useState(0);
  const [homePortfolioItems, setHomePortfolioItems] = useState([]);
  const [portfolioLoading, setPortfolioLoading] = useState(true);

  const CAT_EYEBROW_HOME = { fotografia:"FOTOGRAFÍA", video:"VIDEO", branding_diseno:"DISEÑO GRÁFICO", web:"WEB", marketing_digital:"MARKETING" };

  const toSlide = (item) => ({
    image: item.homeCoverUrl || item.coverUrl || "",
    eyebrow: CAT_EYEBROW_HOME[item.category] || (item.category || "").toUpperCase(),
    title: item.title || "",
    text: item.description ? item.description.slice(0, 120) : "",
  });

  const portfolioSlides = useMemo(() => {
    if (!homePortfolioItems.length) return [];
    const third = Math.ceil(homePortfolioItems.length / 3);
    return homePortfolioItems.slice(0, third).map(toSlide);
  }, [homePortfolioItems]);

  const portfolioPortraitSlides = useMemo(() => {
    if (homePortfolioItems.length < 2) return portfolioSlides;
    const third = Math.ceil(homePortfolioItems.length / 3);
    const slice = homePortfolioItems.slice(third, third * 2);
    return slice.length ? slice.map(toSlide) : portfolioSlides;
  }, [homePortfolioItems]);

  const portfolioCardItems = useMemo(() => {
    if (homePortfolioItems.length < 3) return homePortfolioItems;
    const third = Math.ceil(homePortfolioItems.length / 3);
    const slice = homePortfolioItems.slice(third * 2);
    return slice.length ? slice : homePortfolioItems;
  }, [homePortfolioItems]);
  const [activePortfolioTopMedia, setActivePortfolioTopMedia] = useState(0);
  const [activePortfolioLeftMedia, setActivePortfolioLeftMedia] = useState(1);
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
    setActivePortfolioTopMedia(0);
    setActivePortfolioLeftMedia(0);
  }, [portfolioSlides.length, portfolioPortraitSlides.length]);

  useEffect(() => {
    if (portfolioSlides.length <= 1) return undefined;
    const id = window.setInterval(() => {
      setActivePortfolioTopMedia((prev) => (prev + 1) % portfolioSlides.length);
    }, SLIDESHOW_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [portfolioSlides.length]);

  useEffect(() => {
    if (portfolioPortraitSlides.length <= 1) return undefined;
    const id = window.setInterval(() => {
      setActivePortfolioLeftMedia((prev) => (prev + 1) % portfolioPortraitSlides.length);
    }, SLIDESHOW_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [portfolioPortraitSlides.length]);

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

  useEffect(() => {
    let cancelled = false;
    setPortfolioLoading(true);
    getPublicPortfolioItems().then((items) => {
      if (cancelled) return;
      const filtered = items
        .filter((item) => item.placements.includes("home_portfolio"))
        .slice(0, 12);
      setHomePortfolioItems(filtered);
      setPortfolioLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const portfolioActiveDot = activePortfolioStep % PORTFOLIO_PROCESS_STEPS.length;
  const getPortfolioTopMediaIndex = () => activePortfolioTopMedia;
  const getPortfolioLeftMediaIndex = () => activePortfolioLeftMedia;

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

  const handlePortfolioTopMediaNext = () => {
    setActivePortfolioTopMedia((prev) => (prev + 1) % Math.max(portfolioSlides.length, 1));
  };

  const handlePortfolioTopMediaPrev = () => {
    setActivePortfolioTopMedia((prev) =>
      prev === 0 ? Math.max(portfolioSlides.length - 1, 0) : prev - 1
    );
  };

  const handlePortfolioLeftMediaNext = () => {
    setActivePortfolioLeftMedia((prev) => (prev + 1) % Math.max(portfolioPortraitSlides.length, 1));
  };

  const handlePortfolioLeftMediaPrev = () => {
    setActivePortfolioLeftMedia((prev) =>
      prev === 0 ? Math.max(portfolioPortraitSlides.length - 1, 0) : prev - 1
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
                <span className="highlight-box-glow">visuales</span>{" "}
                para impulsar tu
                <br />
                <span className="hero-editorial__type hero-editorial__type--animated">
                  <span className="hero-editorial__type--yellow">
                    {typedObjetivo || "\u00A0"}
                    {!isDeleting && typedObjetivo === OBJETIVO_WORDS[wordIndex] ? "." : ""}
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
              <p className="prospectos-ref__eyebrow">Servicios para marcas y negocios</p>
              <h2 className="prospectos-ref__title">
                Descubre la propuesta adecuada para <span className="highlight-box-glow">tu marca,</span> negocio o evento social.
              </h2>
              <p className="prospectos-ref__text">
                Cada opción responde a una necesidad concreta. Aquí puedes identificar
                lo que necesitas hoy y avanzar al servicio que mejor encaja con tu etapa,
                tu prioridad y tu objetivo comercial.
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
                              <a className="prospecto-ref-card__cta" href={card.href}>
                                {card.ctaLabel}
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
          <div className="portfolio-showcase__intro">
            <h2>
              Proyectos <span className="highlight-box-glow">visuales</span> que convierten ideas en presencia real.
            </h2>
            <p>{portfolioIntro.description}</p>
          </div>

          <div className="portfolio-process">
            <div className="portfolio-process__top">
              <div className="portfolio-process__media-card portfolio-process__media-card--wide">
                {portfolioSlides.map((slide, index) => (
                  <div
                    key={`portfolio-top-${index}`}
                    className={`portfolio-process__media-slide ${
                      index === getPortfolioTopMediaIndex() ? "is-active" : ""
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
                  {portfolioSlides.map((_, index) => (
                    <span
                      key={`portfolio-top-dot-${index}`}
                      className={`portfolio-process__media-dot ${
                        index === getPortfolioTopMediaIndex() ? "is-active" : ""
                      }`}
                    />
                  ))}
                </div>

                <div className="portfolio-process__media-controls">
                  <button
                    type="button"
                    className="portfolio-process__media-control"
                    onClick={handlePortfolioTopMediaPrev}
                    aria-label="Imagen anterior"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    className="portfolio-process__media-control"
                    onClick={handlePortfolioTopMediaNext}
                    aria-label="Imagen siguiente"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>

            <div className="portfolio-process__body">
              <div className="portfolio-process__left-stack">
                <div className="portfolio-process__media-card portfolio-process__media-card--portrait">
                  {portfolioPortraitSlides.map((slide, index) => (
                    <div
                      key={`portfolio-left-portrait-${index}`}
                      className={`portfolio-process__media-slide ${
                        index === getPortfolioLeftMediaIndex() ? "is-active" : ""
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
                      onClick={handlePortfolioLeftMediaPrev}
                      aria-label="Imagen anterior"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      className="portfolio-process__media-control"
                      onClick={handlePortfolioLeftMediaNext}
                      aria-label="Imagen siguiente"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>

              <div className="portfolio-process__list">
                <div className="portfolio-items-grid">
                  {portfolioLoading ? (
                    <>
                      <div className="portfolio-item-card portfolio-item-card--skeleton" aria-hidden="true" />
                      <div className="portfolio-item-card portfolio-item-card--skeleton" aria-hidden="true" />
                      <div className="portfolio-item-card portfolio-item-card--skeleton" aria-hidden="true" />
                      <div className="portfolio-item-card portfolio-item-card--skeleton" aria-hidden="true" />
                    </>
                  ) : portfolioCardItems.length > 0 ? (
                    portfolioCardItems.map((item) => (
                      <a
                        key={item.id}
                        href="/portafolio"
                        className="portfolio-item-card"
                        aria-label={item.title}
                      >
                        <div className="portfolio-item-card__media">
                          {(item.homeCoverUrl || item.coverUrl) && (
                            <img
                              src={item.homeCoverUrl || item.coverUrl}
                              alt={item.title}
                              loading="lazy"
                            />
                          )}
                        </div>
                        <div className="portfolio-item-card__body">
                          {(item.subcategory || item.category) && (
                            <p className="portfolio-item-card__eyebrow">
                              {CAT_EYEBROW_HOME[item.subcategory] || CAT_EYEBROW_HOME[item.category] || (item.subcategory || item.category || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                            </p>
                          )}
                          <h3 className="portfolio-item-card__title">{item.title}</h3>
                          {item.clientName && (
                            <p className="portfolio-item-card__client">{item.clientName}</p>
                          )}
                        </div>
                      </a>
                    ))
                  ) : null}
                </div>
                <div className="portfolio-items-cta">
                  <a href="/portafolio" className="portfolio-items-cta__link">
                    Ver portafolio completo <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TestimonialsSlider
        eyebrow={TESTIMONIAL_SECTION_COPY.home.eyebrow}
        titleNode={<>Clientes que ya confiaron en <span className="highlight-box-glow">nosotros</span> para construir su marca y cubrir sus eventos.</>}
        description={TESTIMONIAL_SECTION_COPY.home.description}
        items={getTestimonialsForPage("home")}
      />

      <section id="contacto" className="section-split px-4 pb-20 md:px-6">
        <div className="mx-auto max-w-[1220px]">
          <SplitLeadBlock
            eyebrow="Ideas Estudio"
            title={<>Recibe ideas y <span style={{ color: "#f2cc3d" }}>estrategias</span> para hacer crecer tu negocio.</>}
            description="Diseño, branding, contenido y marketing digital explicados de forma clara y útil para negocios reales."
            imageSrc="https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80"
            imageAlt="Ideas Estudio — Estrategias de marca"
            buttonLabel="Quiero recibir ideas"
            successMessage="Listo. Pronto recibirás contenido útil directamente en tu correo."
            showNameField={true}
            namePlaceholder="Tu nombre"
            emailPlaceholder="Tu email"
            consentLabel="Sin spam. Solo contenido útil."
            source="website_home"
            segment="home_leads"
            segments={["home_leads", "newsletter"]}
            submissionKind="lead_capture"
            defaultMessage="Lead desde Home"
            meta={{ page_url: "/", form_name: "home_split_lead_block", entry_point: "home_page", ui_context: "ideas_web_public", ab_variant: "home_v1" }}
            theme="dark"
          />
        </div>
      </section>
    </main>
  );
}
