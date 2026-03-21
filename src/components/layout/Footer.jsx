import { Link } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import { APP_CRM_URL } from "@/lib/constants.js";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div>
          <div className="site-brand site-brand--footer">
            <span className="site-brand__mark">IE</span>
            <span className="site-brand__text">
              <strong>Ideas Estudio</strong>
              <small>Imagen, contenido y comercio digital</small>
            </span>
          </div>
          <p className="site-footer__copy">
            Esta base publica esta pensada para presentar servicios, filtrar el
            catalogo y luego conectarse con tu CRM como motor de propuestas,
            reservas, pagos y automatizaciones.
          </p>
        </div>

        <div>
          <h2 className="site-footer__title">Navegacion</h2>
          <div className="site-footer__links">
            <Link to="/">Inicio</Link>
            <Link to="/servicios">Servicios</Link>
            <Link to="/portafolio">Portafolio</Link>
            <Link to="/sobre-nosotros">Sobre Nosotros</Link>
            <Link to="/contacto">Contacto</Link>
          </div>
        </div>

        <div>
          <h2 className="site-footer__title">Operacion</h2>
          <div className="site-footer__links">
            <Link to="/pequenos-negocios">Pequenos Negocios</Link>
            <Link to="/emprendedores">Emprendedores</Link>
            <Link to="/empresas-emergentes">Empresas Emergentes</Link>
            <Link to="/bodas-eventos-sesiones">Bodas y Sesiones</Link>
          </div>
        </div>

        <div className="site-footer__cta">
          <h2 className="site-footer__title">Backend</h2>
          <p>
            El CRM sigue siendo el motor privado de la operacion. Esta capa
            publica queda lista para integrarse cuando definas los endpoints.
          </p>
          <Button href={APP_CRM_URL} variant="secondary" target="_blank" rel="noreferrer">
            Acceso CRM
          </Button>
        </div>
      </div>

      <div className="container site-footer__bottom">
        <span>&copy; {new Date().getFullYear()} Ideas Estudio</span>
        <span>Catalogo desacoplado y preparado para integrar el CRM</span>
      </div>
    </footer>
  );
}
