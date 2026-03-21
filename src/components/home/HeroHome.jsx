import Button from "@/components/shared/Button.jsx";
import { APP_CRM_URL } from "@/lib/constants.js";

export default function HeroHome() {
  return (
    <section className="hero-home">
      <div className="container hero-home__grid">
        <div className="hero-home__content">
          <span className="eyebrow">Ideas Estudio</span>
          <h1 className="hero-home__title">
            Imagen, contenido y experiencias digitales pensadas para vender con
            una base lista para conectarse a tu CRM.
          </h1>
          <p className="hero-home__subtitle">
            El frontend publico organiza la experiencia del cliente, presenta el
            catalogo y prepara el camino para cotizaciones, pagos, reservas y
            automatizaciones sin acoplar la web al backend desde el dia uno.
          </p>

          <div className="hero-home__actions">
            <Button to="/servicios">Ver servicios</Button>
            <Button to="/contacto" variant="secondary">
              Solicitar propuesta
            </Button>
            <Button href={APP_CRM_URL} variant="ghost" target="_blank" rel="noreferrer">
              Acceso CRM
            </Button>
          </div>

          <div className="hero-home__metrics">
            <div className="metric-card">
              <strong>4</strong>
              <span>rutas de cliente</span>
            </div>
            <div className="metric-card">
              <strong>3</strong>
              <span>modos de venta</span>
            </div>
            <div className="metric-card">
              <strong>1</strong>
              <span>capa publica desacoplada</span>
            </div>
          </div>
        </div>

        <div className="hero-home__visual">
          <article className="hero-panel hero-panel--main">
            <span>Frontend publico</span>
            <strong>Arquitectura limpia para presentar, vender y escalar</strong>
          </article>

          <div className="hero-panel-grid">
            <article className="hero-panel hero-panel--small">
              <span>Catalogo</span>
              <strong>Compra, propuesta o reserva</strong>
            </article>
            <article className="hero-panel hero-panel--small">
              <span>CRM</span>
              <strong>Motor comercial detras del sitio</strong>
            </article>
            <article className="hero-panel hero-panel--small">
              <span>Portafolio</span>
              <strong>Imagen, branding y fotografia</strong>
            </article>
            <article className="hero-panel hero-panel--small">
              <span>Escala</span>
              <strong>Lista para checkout y automatizacion</strong>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
