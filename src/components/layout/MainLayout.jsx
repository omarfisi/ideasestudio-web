import { NavLink, Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import HashScrollHandler from "@/components/layout/HashScrollHandler.jsx";
import { Link } from "react-router-dom";
import JJPegaFooter from "@/components/layout/JJPegaFooter.jsx";

function JJHeader({ compact = false }) {
  return (
    <header className="jj-site-header">
      <div className="container jj-site-header__inner">
        <Link to="/" className="jj-site-header__brand" aria-label="JJ Pega inicio">
          <img src="/assets/jj-high-quality/trimmed/logo-header.webp" alt="JJ Pega" />
        </Link>
        {!compact && <nav aria-label="Navegación principal" className="jj-site-header__nav">
          <NavLink to="/" end>Inicio</NavLink>
          <NavLink to="/servicios" className="jj-nav-link--store">Tienda</NavLink>
          <NavLink to="/personaliza">Personaliza</NavLink>
          <a href="#ayuda">Ayuda</a>
        </nav>}
        {!compact && <div className="jj-site-header__tools"><span aria-hidden="true">⌕</span><Link to="/servicios/carrito" className="jj-site-header__cart">🛒 <b>0</b></Link></div>}
      </div>
    </header>
  );
}

export default function MainLayout() {
  const location = useLocation();
  const compactHeader = location.pathname === "/" || location.pathname === "/coming-soon";

  return (
    <div className="site-shell">
      <JJHeader compact={compactHeader} />
      <main className="site-main">
        <Outlet />
      </main>
      <JJPegaFooter />
      <ScrollRestoration />
      <HashScrollHandler />
    </div>
  );
}
