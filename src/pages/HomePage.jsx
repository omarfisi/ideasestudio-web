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

      <section id="caminos" className="section-split">
        <div className="container">
          <div className="prospectos-ref">
            <div className="prospectos-ref__intro">
              <p className="prospectos-ref__eyebrow">Elige tu camino</p>
              <h2 className="prospectos-ref__title">
                Servicios pensados para cada necesidad
              </h2>
              <p className="prospectos-ref__text">
                Cada proyecto es diferente. Escoge la opción que mejor represente
                lo que necesitas y descubre el camino más adecuado para ti o tu
                negocio.
              </p>
            </div>

            <div className="prospectos-ref__grid">
              <article className="prospecto-ref-card">
                <div className="prospecto-ref-card__media">
                  <div className="prospecto-ref-card__visual" />
                  <span className="prospecto-ref-card__badge">01. Marca / Negocio</span>
                </div>
                <div className="prospecto-ref-card__body">
                  <h3>Tengo una marca o negocio</h3>
                  <p className="prospecto-ref-card__description">
                    Branding, contenido, web, redes y presencia digital para
                    emprendedores, marcas personales y pequeños negocios.
                  </p>
                  <p className="prospecto-ref-card__lead">Este camino está diseñado para:</p>
                  <ul className="prospecto-ref-card__list">
                    <li>Fortalecer tu identidad visual y posicionamiento.</li>
                    <li>Mejorar tu presencia digital en canales clave.</li>
                    <li>Convertir visitas en contactos o clientes reales.</li>
                    <li>Unificar la comunicación de tu marca.</li>
                  </ul>
                  <div className="prospecto-ref-card__footer">
                    <span className="prospecto-ref-card__chip">Marca y negocio</span>
                    <a className="prospecto-ref-card__cta" href="#contacto">
                      Más información
                    </a>
                  </div>
                </div>
              </article>

              <article className="prospecto-ref-card">
                <div className="prospecto-ref-card__media">
                  <div className="prospecto-ref-card__visual" />
                  <span className="prospecto-ref-card__badge">02. Presencia visual</span>
                </div>
                <div className="prospecto-ref-card__body">
                  <h3>Necesito presencia visual profesional</h3>
                  <p className="prospecto-ref-card__description">
                    Imagen corporativa, fotografía profesional, video institucional
                    y contenido de marca para empresas y organizaciones.
                  </p>
                  <p className="prospecto-ref-card__lead">Con esta opción podrás:</p>
                  <ul className="prospecto-ref-card__list">
                    <li>Elevar la percepción profesional de tu marca.</li>
                    <li>Comunicar confianza con imagen coherente.</li>
                    <li>Generar piezas para web, redes y presentaciones.</li>
                    <li>Conectar visualmente con clientes y aliados.</li>
                  </ul>
                  <div className="prospecto-ref-card__footer">
                    <span className="prospecto-ref-card__chip">Presencia visual</span>
                    <a className="prospecto-ref-card__cta" href="#contacto">
                      Más información
                    </a>
                  </div>
                </div>
              </article>

              <article className="prospecto-ref-card">
                <div className="prospecto-ref-card__media">
                  <div className="prospecto-ref-card__visual" />
                  <span className="prospecto-ref-card__badge">03. Momento especial</span>
                </div>
                <div className="prospecto-ref-card__body">
                  <h3>Quiero capturar un momento especial</h3>
                  <p className="prospecto-ref-card__description">
                    Fotografía, video, sesiones, bodas, cumpleaños y cobertura
                    visual para recuerdos auténticos y memorables.
                  </p>
                  <p className="prospecto-ref-card__lead">Con esta cobertura lograrás:</p>
                  <ul className="prospecto-ref-card__list">
                    <li>Documentar cada detalle con calidad profesional.</li>
                    <li>Crear piezas emocionales y atemporales.</li>
                    <li>Capturar momentos espontáneos con intención.</li>
                    <li>Entregar recuerdos listos para compartir.</li>
                  </ul>
                  <div className="prospecto-ref-card__footer">
                    <span className="prospecto-ref-card__chip">Momentos especiales</span>
                    <a className="prospecto-ref-card__cta" href="#contacto">
                      Más información
                    </a>
                  </div>
                </div>
              </article>

              <article className="prospecto-ref-card">
                <div className="prospecto-ref-card__media">
                  <div className="prospecto-ref-card__visual" />
                  <span className="prospecto-ref-card__badge">04. Solución a medida</span>
                </div>
                <div className="prospecto-ref-card__body">
                  <h3>Busco una solución creativa a mi idea</h3>
                  <p className="prospecto-ref-card__description">
                    Campañas, proyectos mixtos, combinaciones de servicios y
                    propuestas personalizadas según tu necesidad.
                  </p>
                  <p className="prospecto-ref-card__lead">Esta solución personalizada te permite:</p>
                  <ul className="prospecto-ref-card__list">
                    <li>Diseñar una propuesta alineada a tus objetivos.</li>
                    <li>Combinar servicios sin perder coherencia visual.</li>
                    <li>Priorizar acciones según etapa y presupuesto.</li>
                    <li>Ejecutar con enfoque estratégico y comercial.</li>
                  </ul>
                  <div className="prospecto-ref-card__footer">
                    <span className="prospecto-ref-card__chip">Solución a medida</span>
                    <a className="prospecto-ref-card__cta" href="#contacto">
                      Más información
                    </a>
                  </div>
                </div>
              </article>
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
