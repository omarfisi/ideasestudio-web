import React, { useEffect, useState } from "react";

const OBJETIVO_WORDS = ["marca", "empresa", "crecimiento", "presencia"];

export default function HomePage() {
  const [wordIndex, setWordIndex] = useState(0);
  const [typedObjetivo, setTypedObjetivo] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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
      <div className="section-divider-circuit" aria-hidden="true" />

      <section id="caminos">
        <div className="container">
          <div className="prospectos-ref">
            <div className="prospectos-ref__intro">
              <p className="prospectos-ref__eyebrow">Elige tu camino</p>
              <h2 className="prospectos-ref__title">
                Soluciones según lo que estás buscando
              </h2>
              <p className="prospectos-ref__text">
                No todos los clientes necesitan lo mismo. Escoge la opción que más
                se parezca a tu necesidad y te guiamos por el camino correcto.
              </p>
            </div>

            <div className="prospectos-ref__grid">
              <article className="prospecto-ref-card">
                <div className="prospecto-ref-card__content">
                  <p className="prospecto-ref-card__kicker">01</p>
                  <h3>Tengo una marca o negocio</h3>
                  <p>
                    Branding, contenido, web, redes y presencia digital para
                    emprendedores, marcas personales y pequeños negocios.
                  </p>
                  <a href="#contacto">Explorar opción</a>
                </div>
                <div className="prospecto-ref-card__visual">
                  <span>Marca / Negocio</span>
                </div>
              </article>

              <article className="prospecto-ref-card">
                <div className="prospecto-ref-card__content">
                  <p className="prospecto-ref-card__kicker">02</p>
                  <h3>Necesito presencia visual profesional</h3>
                  <p>
                    Imagen corporativa, fotografía profesional, video
                    institucional y contenido de marca para empresas y
                    organizaciones.
                  </p>
                  <a href="#contacto">Explorar opción</a>
                </div>
                <div className="prospecto-ref-card__visual">
                  <span>Presencia visual</span>
                </div>
              </article>

              <article className="prospecto-ref-card">
                <div className="prospecto-ref-card__content">
                  <p className="prospecto-ref-card__kicker">03</p>
                  <h3>Quiero capturar un momento especial</h3>
                  <p>
                    Fotografía, video, sesiones, bodas, cumpleaños y cobertura
                    visual para recuerdos auténticos y memorables.
                  </p>
                  <a href="#contacto">Explorar opción</a>
                </div>
                <div className="prospecto-ref-card__visual">
                  <span>Momento especial</span>
                </div>
              </article>

              <article className="prospecto-ref-card">
                <div className="prospecto-ref-card__content">
                  <p className="prospecto-ref-card__kicker">04</p>
                  <h3>Busco una solución creativa a mi medida</h3>
                  <p>
                    Campañas, proyectos mixtos, combinaciones de servicios y
                    propuestas personalizadas según tu necesidad.
                  </p>
                  <a href="#contacto">Explorar opción</a>
                </div>
                <div className="prospecto-ref-card__visual">
                  <span>Solución a medida</span>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>
      <div className="section-divider-circuit" aria-hidden="true" />

      <section id="servicios">
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
      <div className="section-divider-circuit" aria-hidden="true" />

      <section id="portafolio">
        <div className="container">
          <p>Placeholder</p>
          <h2>Portafolio</h2>
        </div>
      </section>
      <div className="section-divider-circuit" aria-hidden="true" />

      <section id="contacto">
        <div className="container">
          <p>Placeholder</p>
          <h2>Contacto / CTA final</h2>
        </div>
      </section>
    </main>
  );
}
