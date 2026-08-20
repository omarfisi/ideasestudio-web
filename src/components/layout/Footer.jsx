import { Link } from "react-router-dom";
import { SITE_CONTACT } from "@/lib/siteContact.js";

const BRAND_LOGO_URL =
  "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/logos/favicon_ideasestudio.webp";

// Real routes confirmed against src/data/clientNiches.js and the router
// (src/router/AppRouter.jsx) — these previously all pointed at the same
// "/#caminos" anchor instead of each solution's own page.
const serviceLinks = [
  { label: "Marca o negocio", to: "/servicios/marca-o-negocio" },
  { label: "Presencia visual", to: "/servicios/presencia-visual-profesional" },
  { label: "Momentos especiales", to: "/servicios/momento-especial" },
  { label: "Solucion a medida", to: "/servicios/solucion-creativa" },
];

// "/#servicios" and "/#blog" pointed at section ids that don't exist on the
// live HomePage (only in an unused HomePage.backup.jsx) — fixed to their
// real index pages instead. "/#portafolio" and "/#contacto" are kept as-is:
// both ids genuinely exist on HomePage.jsx today.
const quickLinks = [
  { label: "Inicio", to: "/" },
  { label: "Servicios", to: "/servicios" },
  { label: "Conoce tu negocio", to: "/conoce-tu-negocio" },
  { label: "Portafolio", to: "/#portafolio" },
  { label: "Blog", to: "/blog" },
  { label: "Contacto", to: "/#contacto" },
];

const socialLinks = [
  {
    label: "Facebook",
    href: SITE_CONTACT.social.facebook,
    Icon: FacebookIcon,
  },
  {
    label: "Instagram",
    href: SITE_CONTACT.social.instagram,
    Icon: InstagramIcon,
  },
  {
    label: "YouTube",
    href: SITE_CONTACT.social.youtube,
    Icon: YouTubeIcon,
  },
];

function ArrowRightIcon() {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" fill="none" aria-hidden="true">
      <path
        d="M1.5 1.5L6 6L1.5 10.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
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

function MapPinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21C15.5 17.2 18 14.2 18 10.8C18 7.6 15.3 5 12 5C8.7 5 6 7.6 6 10.8C6 14.2 8.5 17.2 12 21Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.5" r="2.3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 18V6M12 6L7 11M12 6L17 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Footer() {
  function handleBackToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="site-footer">
      <div className="container site-footer__shell">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <Link className="site-footer__brand-link" to="/" aria-label="Ideas Estudio">
              <span className="site-footer__brand-mark">
                <img src={BRAND_LOGO_URL} alt="" loading="lazy" />
              </span>
              <span className="site-footer__brand-text">
                <strong>Ideas Estudio</strong>
                <small>La idea que tu negocio necesita</small>
              </span>
            </Link>

            <p className="site-footer__copy">
              Un estudio creativo con soluciones visuales y digitales para marcas,
              negocios, eventos y proyectos que necesitan una presencia clara,
              coherente y bien producida.
            </p>

            <div className="site-footer__socials" aria-label="Redes sociales">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  className="site-footer__social"
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                >
                  <item.Icon />
                </a>
              ))}
            </div>
          </div>

          <div className="site-footer__column">
            <h2 className="site-footer__title">Servicios</h2>
            <ul className="site-footer__list">
              {serviceLinks.map((item) => (
                <li key={item.label}>
                  <Link className="site-footer__link" to={item.to}>
                    <ArrowRightIcon />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="site-footer__column">
            <h2 className="site-footer__title">Navegacion</h2>
            <ul className="site-footer__list">
              {quickLinks.map((item) => (
                <li key={item.label}>
                  <Link className="site-footer__link" to={item.to}>
                    <ArrowRightIcon />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="site-footer__column">
            <h2 className="site-footer__title">Contacto</h2>
            <div className="site-footer__contact">
              <a className="site-footer__contact-row" href={`mailto:${SITE_CONTACT.email}`}>
                <EmailIcon />
                <span>{SITE_CONTACT.email}</span>
              </a>

              <a className="site-footer__contact-row" href={SITE_CONTACT.phone.href}>
                <PhoneIcon />
                <span>{SITE_CONTACT.phone.display}</span>
              </a>

              <div className="site-footer__contact-row">
                <MapPinIcon />
                <span>Puerto Rico · Servicio remoto y presencial por coordinacion</span>
              </div>
            </div>

            {/* Real standalone /contacto route (same convention as Header.jsx's
                primary nav) rather than "/#contacto" — guarantees this CTA works
                identically from any page, no hash-scroll dependency. */}
            <Link className="site-footer__cta-link" to="/contacto">
              Hablemos de tu idea
            </Link>
          </div>
        </div>
      </div>

      <div className="site-footer__base">
        <div className="container site-footer__bottom">
          <div className="site-footer__bottom-copy">
            <span>&copy; {new Date().getFullYear()} Ideas Estudio</span>
            <span>Todos los derechos reservados.</span>
          </div>

          <div className="site-footer__bottom-meta">
            <Link to="/servicios">Servicios</Link>
            <span aria-hidden="true">|</span>
            <Link to="/#portafolio">Portafolio</Link>
            <span aria-hidden="true">|</span>
            <Link to="/#contacto">Contacto</Link>
            <span aria-hidden="true">|</span>
            <Link to="/privacy-policy">Privacy</Link>
            <span aria-hidden="true">|</span>
            <Link to="/terms">Terms</Link>
            <span aria-hidden="true">|</span>
            <Link to="/data-deletion">Data deletion</Link>
          </div>

          <button
            type="button"
            className="site-footer__top"
            onClick={handleBackToTop}
            aria-label="Volver arriba"
          >
            <ArrowUpIcon />
          </button>
        </div>
      </div>
    </footer>
  );
}
