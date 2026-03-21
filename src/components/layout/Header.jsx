import { Link, NavLink } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";

const navItems = [
  { to: "/", label: "Inicio" },
  { to: "/servicios", label: "Servicios" },
  { to: "/portafolio", label: "Portafolio" },
  { to: "/sobre-nosotros", label: "Sobre Nosotros" },
  { to: "/contacto", label: "Contacto" },
];

export default function Header() {
  return (
    <header className="site-header">
      <div className="container site-header__bar">
        <Link to="/" className="site-brand" aria-label="Ideas Estudio">
          <span className="site-brand__mark">IE</span>
          <span className="site-brand__text">
            <strong>Ideas Estudio</strong>
            <small>Frontend publico + CRM ready</small>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Principal">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive
                  ? "site-nav__link site-nav__link--active"
                  : "site-nav__link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="site-actions">
          <Button to="/carrito" variant="ghost">
            Carrito
          </Button>
          <Button to="/contacto">Solicitar propuesta</Button>
        </div>
      </div>
    </header>
  );
}
