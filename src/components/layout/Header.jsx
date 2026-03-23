import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const CLIENT_PATHS = [
  {
    title: "Tengo una marca o negocio",
    description: "Branding, contenido, web y redes para crecer.",
    href: "/#caminos",
  },
  {
    title: "Necesito presencia visual profesional",
    description: "Imagen corporativa, foto y video para empresas.",
    href: "/#caminos",
  },
  {
    title: "Quiero capturar un momento especial",
    description: "Bodas, cumpleaños, sesiones y eventos.",
    href: "/#caminos",
  },
  {
    title: "Busco una solución creativa a mi medida",
    description: "Campañas, proyectos mixtos y propuestas personalizadas.",
    href: "/#caminos",
  },
];

function ChevronDownIcon({ open = false }) {
  return (
    <svg
      className={`ie-header-chevron ${open ? "is-open" : ""}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 9L12 15L18 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 4H5L7.4 14.4C7.6 15.3 8.4 16 9.4 16H17.8C18.8 16 19.6 15.3 19.8 14.4L21 8H6.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="20" r="1.5" fill="currentColor" />
      <circle cx="18" cy="20" r="1.5" fill="currentColor" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7H20M4 12H20M4 17H20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Header() {
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const dropdownRef = useRef(null);

  const crmUrl =
    import.meta.env.VITE_APP_CRM_URL ||
    import.meta.env.VITE_CRM_BASE_URL ||
    "/crm";

  const cartPath = "/carrito";

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSolutionsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const crmIsExternal = /^https?:\/\//i.test(crmUrl);

  function toggleMobileMenu() {
    setMobileOpen((prev) => {
      const next = !prev;

      if (!next) {
        setSolutionsOpen(false);
      }

      return next;
    });
  }

  return (
    <>
      <style>{`
        :root {
          --ie-bg: #ffffff;
          --ie-text: #111111;
          --ie-muted: #5f6368;
          --ie-line: rgba(17, 17, 17, 0.08);
          --ie-line-strong: rgba(17, 17, 17, 0.12);
          --ie-shadow: 0 16px 48px rgba(17, 17, 17, 0.08);
          --ie-yellow: #f3cc00;
          --ie-yellow-soft: rgba(243, 204, 0, 0.16);
          --ie-yellow-soft-2: rgba(243, 204, 0, 0.10);
          --ie-radius-xl: 24px;
          --ie-radius-lg: 18px;
          --ie-radius-md: 14px;
        }

        .ie-header-wrap {
          position: sticky;
          top: 0;
          z-index: 50;
          padding: 18px 18px 0;
          background:
            linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0));
          backdrop-filter: blur(6px);
        }

        .ie-header-shell {
          max-width: 1240px;
          margin: 0 auto;
          position: relative;
        }

        .ie-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 14px 18px;
          background: var(--ie-bg);
          border: 1px solid var(--ie-line);
          box-shadow: var(--ie-shadow);
          border-radius: var(--ie-radius-xl);
        }

        .ie-brand {
          min-width: 0;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: var(--ie-text);
          text-decoration: none;
          font-weight: 800;
          letter-spacing: -0.03em;
          font-size: 1.08rem;
        }

        .ie-brand__logo {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          object-fit: cover;
          background: #fff;
          border: 1px solid var(--ie-line);
          flex-shrink: 0;
        }

        .ie-brand__fallback {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--ie-yellow);
          color: #111;
          font-size: 0.95rem;
          font-weight: 900;
          border: 1px solid rgba(17,17,17,0.06);
          flex-shrink: 0;
        }

        .ie-nav {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }

        .ie-nav__link,
        .ie-nav__button {
          appearance: none;
          border: 0;
          background: transparent;
          color: var(--ie-text);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 0.98rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
        }

        .ie-nav__link:hover,
        .ie-nav__button:hover,
        .ie-nav__button.is-active {
          background: var(--ie-yellow-soft-2);
        }

        .ie-header-chevron {
          transition: transform 0.2s ease;
        }

        .ie-header-chevron.is-open {
          transform: rotate(180deg);
        }

        .ie-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ie-icon-btn {
          width: 46px;
          height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          border: 1px solid var(--ie-line-strong);
          background: #fff;
          color: var(--ie-text);
          text-decoration: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .ie-icon-btn:hover {
          transform: translateY(-1px);
          border-color: rgba(17,17,17,0.18);
          box-shadow: 0 10px 24px rgba(17,17,17,0.08);
        }

        .ie-crm-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 0 18px;
          height: 46px;
          border-radius: 14px;
          background: #111111;
          color: #ffffff;
          text-decoration: none;
          font-weight: 700;
          letter-spacing: -0.02em;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .ie-crm-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(17,17,17,0.16);
        }

        .ie-crm-btn__dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: var(--ie-yellow);
          box-shadow: 0 0 0 4px rgba(243, 204, 0, 0.16);
          flex-shrink: 0;
        }

        .ie-mobile-toggle {
          display: none;
          width: 46px;
          height: 46px;
          border-radius: 14px;
          border: 1px solid var(--ie-line-strong);
          background: #fff;
          color: var(--ie-text);
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .ie-dropdown {
          position: absolute;
          top: calc(100% + 12px);
          left: 50%;
          transform: translateX(-50%);
          width: min(760px, calc(100vw - 36px));
          background: #fff;
          border: 1px solid var(--ie-line);
          border-radius: 24px;
          box-shadow: 0 24px 60px rgba(17,17,17,0.10);
          padding: 18px;
        }

        .ie-dropdown__intro {
          padding: 6px 6px 14px;
        }

        .ie-dropdown__eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--ie-text);
        }

        .ie-dropdown__eyebrow::before {
          content: "";
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: var(--ie-yellow);
        }

        .ie-dropdown__title {
          margin: 10px 0 4px;
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--ie-text);
        }

        .ie-dropdown__text {
          margin: 0;
          color: var(--ie-muted);
          line-height: 1.5;
        }

        .ie-dropdown__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 12px;
        }

        .ie-dropdown__item {
          display: flex;
          gap: 12px;
          padding: 14px;
          border-radius: 18px;
          text-decoration: none;
          color: inherit;
          border: 1px solid transparent;
          background: #fff;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }

        .ie-dropdown__item:hover {
          transform: translateY(-1px);
          border-color: rgba(17,17,17,0.08);
          background: #fcfcfc;
        }

        .ie-dropdown__icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: var(--ie-yellow-soft);
          border: 1px solid rgba(243, 204, 0, 0.28);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #111;
          font-size: 1rem;
          flex-shrink: 0;
        }

        .ie-dropdown__item-title {
          margin: 0 0 4px;
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--ie-text);
        }

        .ie-dropdown__item-text {
          margin: 0;
          color: var(--ie-muted);
          line-height: 1.45;
          font-size: 0.95rem;
        }

        .ie-mobile-panel {
          margin-top: 12px;
          background: #fff;
          border: 1px solid var(--ie-line);
          border-radius: 24px;
          box-shadow: var(--ie-shadow);
          padding: 14px;
        }

        .ie-mobile-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ie-mobile-link,
        .ie-mobile-button,
        .ie-mobile-crm {
          width: 100%;
          min-height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 14px;
          text-decoration: none;
          font-weight: 700;
          color: var(--ie-text);
          background: #fff;
          border: 1px solid var(--ie-line);
        }

        .ie-mobile-button {
          cursor: pointer;
        }

        .ie-mobile-crm {
          background: #111;
          color: #fff;
          border-color: #111;
          justify-content: center;
          margin-top: 8px;
        }

        .ie-mobile-submenu {
          display: grid;
          gap: 8px;
          margin: 8px 0 2px;
        }

        .ie-mobile-submenu a {
          display: block;
          text-decoration: none;
          color: var(--ie-text);
          background: var(--ie-yellow-soft-2);
          border-radius: 14px;
          padding: 12px 14px;
          border: 1px solid rgba(17,17,17,0.06);
        }

        .ie-mobile-submenu strong {
          display: block;
          font-size: 0.96rem;
          margin-bottom: 3px;
        }

        .ie-mobile-submenu span {
          display: block;
          font-size: 0.9rem;
          line-height: 1.45;
          color: var(--ie-muted);
          font-weight: 500;
        }

        @media (max-width: 1080px) {
          .ie-nav,
          .ie-actions {
            display: none;
          }

          .ie-mobile-toggle {
            display: inline-flex;
            margin-left: auto;
          }
        }

        @media (max-width: 640px) {
          .ie-header-wrap {
            padding: 14px 14px 0;
          }

          .ie-header {
            padding: 12px 14px;
            border-radius: 20px;
          }

          .ie-brand span:last-child {
            font-size: 1rem;
          }

          .ie-brand__logo,
          .ie-brand__fallback {
            width: 40px;
            height: 40px;
            border-radius: 12px;
          }

          .ie-dropdown {
            width: calc(100vw - 28px);
          }

          .ie-dropdown__grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="ie-header-wrap">
        <div className="ie-header-shell" ref={dropdownRef}>
          <div className="ie-header">
            <Link className="ie-brand" to="/">
              {logoError ? (
                <span className="ie-brand__fallback">IE</span>
              ) : (
                <img
                  className="ie-brand__logo"
                  src="/favicon_ideasestudio.jpg"
                  alt="Ideas Estudio"
                  onError={() => setLogoError(true)}
                />
              )}
              <span>Ideas Estudio</span>
            </Link>

            <nav className="ie-nav" aria-label="Navegacion principal">
              <Link className="ie-nav__link" to="/">
                Inicio
              </Link>

              <button
                type="button"
                className={`ie-nav__button ${solutionsOpen ? "is-active" : ""}`}
                onClick={() => setSolutionsOpen((prev) => !prev)}
                aria-expanded={solutionsOpen}
                aria-haspopup="true"
              >
                Soluciones
                <ChevronDownIcon open={solutionsOpen} />
              </button>

              <a className="ie-nav__link" href="/#servicios">
                Servicios
              </a>

              <a className="ie-nav__link" href="/#portafolio">
                Portafolio
              </a>

              <a className="ie-nav__link" href="/#contacto">
                Contacto
              </a>
            </nav>

            <div className="ie-actions">
              <Link className="ie-icon-btn" to={cartPath} aria-label="Carrito">
                <CartIcon />
              </Link>

              <a
                className="ie-crm-btn"
                href={crmUrl}
                target={crmIsExternal ? "_blank" : undefined}
                rel={crmIsExternal ? "noreferrer" : undefined}
              >
                <span className="ie-crm-btn__dot" />
                CRM App
              </a>
            </div>

            <button
              type="button"
              className="ie-mobile-toggle"
              onClick={toggleMobileMenu}
              aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>

          {solutionsOpen && !mobileOpen && (
            <div className="ie-dropdown" role="menu">
              <div className="ie-dropdown__intro">
                <span className="ie-dropdown__eyebrow">Ideas Estudio</span>
                <h3 className="ie-dropdown__title">
                  Elige el camino que mejor encaje contigo
                </h3>
                <p className="ie-dropdown__text">
                  Esta landing esta pensada para ayudarte a identificar rapido
                  que tipo de solucion necesitas.
                </p>
              </div>

              <div className="ie-dropdown__grid">
                {CLIENT_PATHS.map((item, index) => (
                  <a key={item.title} href={item.href} className="ie-dropdown__item">
                    <span className="ie-dropdown__icon">{index + 1}</span>
                    <span>
                      <h4 className="ie-dropdown__item-title">{item.title}</h4>
                      <p className="ie-dropdown__item-text">{item.description}</p>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {mobileOpen && (
            <div className="ie-mobile-panel">
              <div className="ie-mobile-list">
                <Link className="ie-mobile-link" to="/">
                  <span>Inicio</span>
                </Link>

                <button
                  type="button"
                  className="ie-mobile-button"
                  onClick={() => setSolutionsOpen((prev) => !prev)}
                >
                  <span>Soluciones</span>
                  <ChevronDownIcon open={solutionsOpen} />
                </button>

                {solutionsOpen && (
                  <div className="ie-mobile-submenu">
                    {CLIENT_PATHS.map((item) => (
                      <a key={item.title} href={item.href}>
                        <strong>{item.title}</strong>
                        <span>{item.description}</span>
                      </a>
                    ))}
                  </div>
                )}

                <a className="ie-mobile-link" href="/#servicios">
                  <span>Servicios</span>
                </a>

                <a className="ie-mobile-link" href="/#portafolio">
                  <span>Portafolio</span>
                </a>

                <a className="ie-mobile-link" href="/#contacto">
                  <span>Contacto</span>
                </a>

                <Link className="ie-mobile-link" to={cartPath}>
                  <span>Carrito</span>
                </Link>

                <a
                  className="ie-mobile-crm"
                  href={crmUrl}
                  target={crmIsExternal ? "_blank" : undefined}
                  rel={crmIsExternal ? "noreferrer" : undefined}
                >
                  CRM App
                </a>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
