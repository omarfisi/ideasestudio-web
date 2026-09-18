import { Link } from "react-router-dom";
import "./JJPegaFooter.css";

const JJ_PEGA_EMAIL = "info@jjpega.com";

const links = [
  { label: "Inicio", to: "/" },
  { label: "Tienda", to: "/servicios" },
  { label: "Personaliza", to: "/personaliza" },
  { label: "Ayuda", to: "/#ayuda" },
];

export default function JJPegaFooter() {
  return (
    <footer className="jjp-footer">
      <div className="jjp-footer__inner">
        <div className="jjp-footer__brand">
          <Link to="/" className="jjp-footer__logo" aria-label="JJ Pega inicio">
            <img src="/assets/jj-high-quality/trimmed/logo-header.webp" alt="JJ Pega" />
          </Link>
          <p>Stickers, ideas y buenas vibras para todo lo que quieres pegar.</p>
        </div>

        <nav className="jjp-footer__column" aria-label="Enlaces JJ Pega">
          <h2>Explora</h2>
          {links.map((item) => <Link key={item.label} to={item.to}>{item.label}<span>→</span></Link>)}
        </nav>

        <div className="jjp-footer__column">
          <h2>Hablemos</h2>
          <a href={"mailto:" + JJ_PEGA_EMAIL}>{JJ_PEGA_EMAIL}</a>
          <span>Puerto Rico · Envíos a todo el mundo</span>
          <Link className="jjp-footer__cta" to="/contacto">Cuéntanos tu idea →</Link>
        </div>
      </div>

      <div className="jjp-footer__bottom">
        <span>© {new Date().getFullYear()} JJ Pega · Stickers &amp; good vibes</span>
        <span>Hecho con cariño desde Puerto Rico</span>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Volver arriba">↑</button>
      </div>
    </footer>
  );
}
