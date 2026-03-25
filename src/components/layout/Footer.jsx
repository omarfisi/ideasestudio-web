const BRAND_LOGO_URL =
  "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/logos/favicon_ideasestudio.webp";

const serviceLinks = [
  { label: "Marca o negocio", href: "/#caminos" },
  { label: "Presencia visual", href: "/#caminos" },
  { label: "Momentos especiales", href: "/#caminos" },
  { label: "Solucion a medida", href: "/#caminos" },
];

const quickLinks = [
  { label: "Inicio", href: "/" },
  { label: "Servicios", href: "/#servicios" },
  { label: "Portafolio", href: "/#portafolio" },
  { label: "Blog", href: "/#blog" },
  { label: "Contacto", href: "/#contacto" },
];

const socialLinks = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/ideasestudiopr",
    Icon: FacebookIcon,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/ideasestudiopr/",
    Icon: InstagramIcon,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@ideasestudio",
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
            <a className="site-footer__brand-link" href="/" aria-label="Ideas Estudio">
              <span className="site-footer__brand-mark">
                <img src={BRAND_LOGO_URL} alt="" loading="lazy" />
              </span>
              <span className="site-footer__brand-text">
                <strong>Ideas Estudio</strong>
                <small>La idea que tu negocio necesita</small>
              </span>
            </a>

            <p className="site-footer__copy">
              Un estudio creativo con soluciones visuales y digitales para marcas,
              negocios, eventos y proyectos que necesitan una presencia clara,
              coherente y bien producida.
            </p>

            <div className="site-footer__socials" aria-label="Redes sociales">
              {socialLinks.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  className="site-footer__social"
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          <div className="site-footer__column">
            <h2 className="site-footer__title">Servicios</h2>
            <ul className="site-footer__list">
              {serviceLinks.map((item) => (
                <li key={item.label}>
                  <a className="site-footer__link" href={item.href}>
                    <ArrowRightIcon />
                    <span>{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="site-footer__column">
            <h2 className="site-footer__title">Navegacion</h2>
            <ul className="site-footer__list">
              {quickLinks.map((item) => (
                <li key={item.label}>
                  <a className="site-footer__link" href={item.href}>
                    <ArrowRightIcon />
                    <span>{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="site-footer__column">
            <h2 className="site-footer__title">Contacto</h2>
            <div className="site-footer__contact">
              <a className="site-footer__contact-row" href="mailto:omarfisi@ideasestudiopr.com">
                <EmailIcon />
                <span>omarfisi@ideasestudiopr.com</span>
              </a>

              <a className="site-footer__contact-row" href="tel:17875030349">
                <PhoneIcon />
                <span>1-787-503-0349</span>
              </a>

              <div className="site-footer__contact-row">
                <MapPinIcon />
                <span>Puerto Rico · Servicio remoto y presencial por coordinacion</span>
              </div>
            </div>

            <a className="site-footer__cta-link" href="/#contacto">
              Hablemos de tu idea
            </a>
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
            <a href="/#servicios">Servicios</a>
            <span aria-hidden="true">|</span>
            <a href="/#portafolio">Portafolio</a>
            <span aria-hidden="true">|</span>
            <a href="/#contacto">Contacto</a>
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
