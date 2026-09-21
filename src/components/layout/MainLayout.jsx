import { useEffect, useState } from "react";
import { NavLink, Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import HashScrollHandler from "@/components/layout/HashScrollHandler.jsx";
import { Link } from "react-router-dom";
import JJPegaFooter from "@/components/layout/JJPegaFooter.jsx";
import { getPublicCart } from "@/lib/api.js";

function JJHeader({ compact = false }) {
  const [cartQuantity, setCartQuantity] = useState(0);

  useEffect(() => {
    let active = true;
    const refreshCartQuantity = async () => {
      try {
        const cart = await getPublicCart();
        if (active) setCartQuantity(Number(cart?.summary?.totalQuantity || 0));
      } catch {
        if (active) setCartQuantity(0);
      }
    };

    refreshCartQuantity();
    window.addEventListener("jj-cart-updated", refreshCartQuantity);
    return () => {
      active = false;
      window.removeEventListener("jj-cart-updated", refreshCartQuantity);
    };
  }, []);

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
        {!compact && <div className="jj-site-header__tools"><span aria-hidden="true">⌕</span><Link to="/servicios/carrito" className="jj-site-header__cart">🛒 <b>{cartQuantity}</b></Link></div>}
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
      <JJPegaFooter compact={compactHeader} />
      <ScrollRestoration />
      <HashScrollHandler />
    </div>
  );
}
