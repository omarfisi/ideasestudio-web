import { Link } from "react-router-dom";

export default function CreativeHero() {
  return (
    <section className="ie-hero">
      <div className="container">
        <div className="ie-hero__window">
          <div className="ie-hero__bar">
            <div className="ie-hero__controls" aria-hidden="true">
              <span className="ie-hero__control ie-hero__control--red" />
              <span className="ie-hero__control ie-hero__control--yellow" />
              <span className="ie-hero__control ie-hero__control--green" />
            </div>

            <p className="ie-hero__bar-title">
              IdeasEstudio.exe - Creative Workspace
            </p>

            <div className="ie-hero__bar-pill">Online</div>
          </div>

          <div className="ie-hero__grid">
            <div className="ie-hero__content">
              <span className="ie-hero__tag">Ideas Estudio</span>

              <h1 className="ie-hero__title">
                Diseño, contenido y experiencias visuales con carácter.
              </h1>

              <p className="ie-hero__text">
                Construimos marcas, páginas web, fotografía, video y soluciones
                creativas para negocios, empresas, eventos y proyectos
                especiales.
              </p>

              <div className="ie-hero__actions">
                <Link
                  to="/servicios"
                  className="ie-hero__button ie-hero__button--primary"
                >
                  Ver servicios
                </Link>

                <Link
                  to="/portafolio"
                  className="ie-hero__button ie-hero__button--secondary"
                >
                  Ver portafolio
                </Link>
              </div>

              <div className="ie-hero__stats">
                <div className="ie-hero__stat">
                  <strong>Branding</strong>
                  <span>Identidad visual con intención</span>
                </div>
                <div className="ie-hero__stat">
                  <strong>Web</strong>
                  <span>Experiencias digitales con estructura</span>
                </div>
                <div className="ie-hero__stat">
                  <strong>Foto + Video</strong>
                  <span>Contenido visual que conecta</span>
                </div>
              </div>
            </div>

            <div className="ie-hero__visual">
              <div className="ie-hero__visual-window">
                <div className="ie-hero__visual-top">
                  <span className="ie-hero__mini-tag">Creative System</span>
                  <span className="ie-hero__mini-code">v1.0</span>
                </div>

                <div className="ie-hero__visual-body">
                  <div className="ie-hero__panel ie-hero__panel--yellow">
                    <span>Branding</span>
                  </div>

                  <div className="ie-hero__panel ie-hero__panel--light">
                    <span>Web Design</span>
                  </div>

                  <div className="ie-hero__panel ie-hero__panel--dark">
                    <span>Social Media</span>
                  </div>

                  <div className="ie-hero__panel ie-hero__panel--dark">
                    <span>Producción Visual</span>
                  </div>

                  <div className="ie-hero__screen">
                    <div className="ie-hero__screen-header">
                      <span className="ie-hero__screen-dot" />
                      <span className="ie-hero__screen-dot" />
                      <span className="ie-hero__screen-dot" />
                    </div>

                    <div className="ie-hero__screen-grid">
                      <div className="ie-hero__screen-box" />
                      <div className="ie-hero__screen-box ie-hero__screen-box--accent" />
                      <div className="ie-hero__screen-box ie-hero__screen-box--wide" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
