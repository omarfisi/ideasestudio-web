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

const BRAND_LOGO_URL =
  "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/logos/favicon_ideasestudio.webp";

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

function CrmAccessIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 4H18C19.1 4 20 4.9 20 6V18C20 19.1 19.1 20 18 20H14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10 8L14 12L10 16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 12H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 8H16V5H14C11.8 5 10 6.8 10 9V11H8V14H10V19H13V14H15.2L16 11H13V9C13 8.45 13.45 8 14 8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 8.2C20.8 7.4 20.2 6.8 19.4 6.6C17.8 6.2 12 6.2 12 6.2S6.2 6.2 4.6 6.6C3.8 6.8 3.2 7.4 3 8.2C2.6 9.8 2.6 12 2.6 12S2.6 14.2 3 15.8C3.2 16.6 3.8 17.2 4.6 17.4C6.2 17.8 12 17.8 12 17.8S17.8 17.8 19.4 17.4C20.2 17.2 20.8 16.6 21 15.8C21.4 14.2 21.4 12 21.4 12S21.4 9.8 21 8.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M10 9.5L15 12L10 14.5V9.5Z" fill="currentColor" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7H20V17H4V7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M4 8L12 13L20 8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22 16.92V20A2 2 0 0 1 20.18 22C11.47 22 4 14.53 4 5.82A2 2 0 0 1 6 4H9.08A2 2 0 0 1 11.06 5.67L11.58 8.64A2 2 0 0 1 11.01 10.4L9.5 11.91C10.59 14.29 12.71 16.41 15.09 17.5L16.6 15.99A2 2 0 0 1 18.36 15.42L21.33 15.94A2 2 0 0 1 22 16.92Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
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

  const cartPath = "/servicios/carrito";

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
          --ie-line: rgba(17, 17, 17, 0.10);
          --ie-line-strong: rgba(17, 17, 17, 0.12);
          --ie-shadow: 0 10px 20px rgba(17, 17, 17, 0.05);
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
          padding: 0 18px 0;
          background: transparent;
        }

        .ie-header-shell {
          max-width: 1240px;
          margin: 0 auto;
          position: relative;
        }

        .ie-header {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 22px;
          padding: 14px 22px;
          background: var(--ie-bg);
          border: 1px solid var(--ie-line);
          border-top: 0;
          box-shadow: var(--ie-shadow);
          border-radius: 0 0 18px 18px;
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

        .ie-brand__text {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .ie-brand__name {
          font-weight: 800;
          line-height: 1.05;
        }

        .ie-brand__slogan {
          font-size: 0.74rem;
          font-weight: 600;
          line-height: 1.2;
          letter-spacing: 0;
          color: var(--ie-muted);
        }

        .ie-brand__logo {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          object-fit: cover;
          background: transparent;
          border: none;
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
          border: none;
          flex-shrink: 0;
        }

        .ie-nav {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-left: 0;
          justify-self: center;
        }

        .ie-nav__link,
        .ie-nav__button {
          appearance: none;
          border: 0;
          background: transparent;
          color: #4d4d4d;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 2px;
          border-radius: 0;
          font-size: 0.99rem;
          font-weight: 650;
          cursor: pointer;
          transition: color 0.2s ease, transform 0.2s ease;
        }

        .ie-nav__link:hover,
        .ie-nav__button:hover,
        .ie-nav__button.is-active {
          color: var(--ie-text);
          transform: translateY(-1px);
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
          gap: 14px;
          justify-self: end;
        }

        .ie-icon-btn {
          min-height: 42px;
          padding: 0 14px;
          gap: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          border: 1px solid rgba(17, 17, 17, 0.12);
          background: #ffffff;
          color: #444444;
          text-decoration: none;
          transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
        }

        .ie-icon-btn span {
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .ie-icon-btn:hover {
          transform: translateY(-1px);
          color: #111111;
          background: #f7f7f7;
        }

        .ie-crm-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 24px;
          height: 48px;
          border-radius: 999px;
          border: 1px solid #d4b200;
          background: var(--ie-yellow);
          color: #111111;
          text-decoration: none;
          font-weight: 800;
          letter-spacing: -0.02em;
          transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
        }

        .ie-crm-btn span {
          font-size: 0.92rem;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .ie-crm-btn svg {
          width: 20px;
          height: 20px;
        }

        .ie-crm-btn:hover {
          transform: translateY(-1px);
          background: #111111;
          color: #ffffff;
        }

        .ie-mobile-toggle {
          display: none;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1px solid var(--ie-line-strong);
          background: #fff;
          color: var(--ie-text);
          align-items: center;
          justify-content: center;
          justify-self: end;
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
            margin-left: 0;
          }
        }

        @media (max-width: 640px) {
          .ie-header-wrap {
            padding: 0 14px 0;
          }

          .ie-header {
            padding: 12px 14px;
            border-radius: 0 0 16px 16px;
          }

          .ie-brand__name {
            font-size: 1rem;
          }

          .ie-brand__slogan {
            font-size: 0.7rem;
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

      <div className="ie-topbar">
        <div className="ie-topbar__inner">
          <div className="ie-topbar__left">
            <a href="mailto:omarfisi@ideasestudiopr.com" className="ie-topbar__item">
              <span className="ie-topbar__icon ie-topbar__icon--social" aria-hidden="true">
                <EmailIcon />
              </span>
              <span>omarfisi@ideasestudiopr.com</span>
            </a>

            <a href="tel:17875030349" className="ie-topbar__item">
              <span className="ie-topbar__icon ie-topbar__icon--social" aria-hidden="true">
                <PhoneIcon />
              </span>
              <span>1-787-503-0349</span>
            </a>
          </div>

          <div className="ie-topbar__right">
            <a
              href="https://www.facebook.com/ideasestudiopr"
              target="_blank"
              rel="noreferrer"
              className="ie-topbar__social"
              aria-label="Facebook"
            >
              <FacebookIcon />
            </a>

            <a
              href="https://www.instagram.com/ideasestudiopr/"
              target="_blank"
              rel="noreferrer"
              className="ie-topbar__social"
              aria-label="Instagram"
            >
              <InstagramIcon />
            </a>

            <a
              href="https://www.youtube.com/@ideasestudio"
              target="_blank"
              rel="noreferrer"
              className="ie-topbar__social"
              aria-label="YouTube"
            >
              <YouTubeIcon />
            </a>
          </div>
        </div>
      </div>

      <header className="ie-header-wrap">
        <div className="ie-header-shell" ref={dropdownRef}>
          <div className="ie-header">
            <Link className="ie-brand" to="/">
              {logoError ? (
                <span className="ie-brand__fallback">IE</span>
              ) : (
                <img
                  className="ie-brand__logo"
                  src={BRAND_LOGO_URL}
                  alt="Ideas Estudio"
                  onError={() => setLogoError(true)}
                />
              )}
              <span className="ie-brand__text">
                <span className="ie-brand__name">Ideas Estudio</span>
                <span className="ie-brand__slogan">La idea que tu negocio necesita</span>
              </span>
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

              <Link className="ie-nav__link" to="/servicios">
                Servicios
              </Link>

              <a className="ie-nav__link" href="/#portafolio">
                Portafolio
              </a>

              <a className="ie-nav__link" href="/#blog">
                Blog
              </a>

              <a className="ie-nav__link" href="/#contacto">
                Contacto
              </a>
            </nav>

            <div className="ie-actions">
              <Link className="ie-icon-btn" to={cartPath} aria-label="Ordenes">
                <CartIcon />
                <span>Ordenes</span>
              </Link>

              <a
                className="ie-crm-btn"
                href={crmUrl}
                target={crmIsExternal ? "_blank" : undefined}
                rel={crmIsExternal ? "noreferrer" : undefined}
                aria-label="Acceder CRM"
                title="Acceder CRM"
              >
                <CrmAccessIcon />
                <span>Acceder CRM</span>
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

                <Link className="ie-mobile-link" to="/servicios">
                  <span>Servicios</span>
                </Link>

                <a className="ie-mobile-link" href="/#portafolio">
                  <span>Portafolio</span>
                </a>

                <a className="ie-mobile-link" href="/#blog">
                  <span>Blog</span>
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
