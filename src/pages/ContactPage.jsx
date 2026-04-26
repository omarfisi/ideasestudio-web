import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { submitLeadForm } from "@/lib/publicLeadForms.js";
import FormPlacementRenderer from "@/components/forms/FormPlacementRenderer.jsx";

const SERVICE_OPTIONS = [
  "Branding e identidad visual",
  "Fotografía y video",
  "Diseño web y presencia digital",
  "Contenido para redes sociales",
  "Estrategia de marca",
  "Propuesta comercial",
  "Otro / No estoy seguro",
];

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

// ─── Trust badges ─────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  { icon: "✦", label: "Respuesta personalizada" },
  { icon: "✦", label: "Atención directa" },
  { icon: "✦", label: "Enfoque estratégico" },
];

const CONTACT_INFO = [
  {
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    label: "Correo",
    value: "omarfisi@ideasestudiopr.com",
    href: "mailto:omarfisi@ideasestudiopr.com",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
        <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    label: "Teléfono",
    value: "+1 787-503-0349",
    href: "tel:+17875030349",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    label: "Tiempo de respuesta",
    value: "Dentro de 24 horas hábiles",
    href: null,
  },
];

const CONTACT_MAP_EMBED_URL =
  "https://maps.google.com/maps?q=18.0261881,-66.6123375&z=17&output=embed";
const CONTACT_FORM_SECTION_KEY = "contact_main_form";

// ─── Contact form ─────────────────────────────────────────────────────────────

function ContactForm({ prefilledService }) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    business_name: "",
    service_interest: prefilledService || "",
    message: "",
  });
  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [statusMsg, setStatusMsg] = useState("");

  const emailValid = useMemo(() => isValidEmail(form.email), [form.email]);
  const nameValid = form.full_name.trim().length >= 2;
  const messageValid = form.message.trim().length >= 10;
  const canSubmit = emailValid && nameValid && messageValid;

  function field(name) {
    return {
      name,
      value: form[name],
      onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
      onBlur: () => setTouched((t) => ({ ...t, [name]: true })),
    };
  }

  function hasError(name) {
    if (!touched[name]) return false;
    if (name === "email") return !emailValid;
    if (name === "full_name") return !nameValid;
    if (name === "message") return !messageValid;
    return false;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ full_name: true, email: true, message: true });
    if (!canSubmit) return;

    setStatus("loading");
    setStatusMsg("");

    try {
      const result = await submitLeadForm({
        ...form,
        source: "website_contact",
        segment: "pagina_contacto",
        segments: ["pagina_contacto", "nuevos_suscriptores"],
        submission_kind: "commercial_contact",
        meta: {
          form_name: "contact_main_form",
          page_url: "/contacto",
          entry_point: "contact_page",
          ui_context: "ideas_web_public",
        },
      });

      setStatus("success");
      setStatusMsg(
        result?.message ||
          "Gracias por escribirnos. Muy pronto estaremos en contacto contigo."
      );
      setForm({
        full_name: "",
        email: "",
        phone: "",
        business_name: "",
        service_interest: prefilledService || "",
        message: "",
      });
      setTouched({});
    } catch (err) {
      setStatus("error");
      setStatusMsg(
        err?.message ||
          "No pudimos enviar tu mensaje. Por favor inténtalo nuevamente."
      );
    }
  }

  if (status === "success") {
    return (
      <div className="contact-form-success">
        <div className="contact-form-success__icon">✓</div>
        <h3 className="contact-form-success__title">Mensaje recibido</h3>
        <p className="contact-form-success__text">{statusMsg}</p>
        <button
          className="contact-form-success__reset"
          onClick={() => setStatus("idle")}
        >
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <div className="contact-form__grid">
        <div className={`contact-field${hasError("full_name") ? " is-error" : ""}`}>
          <label className="contact-field__label" htmlFor="cf-name">
            Nombre completo <span aria-hidden="true">*</span>
          </label>
          <input
            id="cf-name"
            type="text"
            placeholder="Tu nombre"
            autoComplete="name"
            required
            {...field("full_name")}
          />
          {hasError("full_name") && (
            <span className="contact-field__error">Escribe tu nombre para continuar.</span>
          )}
        </div>

        <div className={`contact-field${hasError("email") ? " is-error" : ""}`}>
          <label className="contact-field__label" htmlFor="cf-email">
            Email <span aria-hidden="true">*</span>
          </label>
          <input
            id="cf-email"
            type="email"
            placeholder="tu@email.com"
            autoComplete="email"
            required
            {...field("email")}
          />
          {hasError("email") && (
            <span className="contact-field__error">Escribe un correo electrónico válido.</span>
          )}
        </div>

        <div className="contact-field">
          <label className="contact-field__label" htmlFor="cf-phone">
            Teléfono <span className="contact-field__optional">(opcional)</span>
          </label>
          <input
            id="cf-phone"
            type="tel"
            placeholder="+1 787-000-0000"
            autoComplete="tel"
            {...field("phone")}
          />
        </div>

        <div className="contact-field">
          <label className="contact-field__label" htmlFor="cf-business">
            Nombre del negocio <span className="contact-field__optional">(opcional)</span>
          </label>
          <input
            id="cf-business"
            type="text"
            placeholder="Nombre de tu empresa o proyecto"
            autoComplete="organization"
            {...field("business_name")}
          />
        </div>

        <div className="contact-field contact-field--full">
          <label className="contact-field__label" htmlFor="cf-service">
            Servicio de interés <span className="contact-field__optional">(opcional)</span>
          </label>
          <select id="cf-service" {...field("service_interest")}>
            <option value="">Selecciona una opción</option>
            {SERVICE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className={`contact-field contact-field--full${hasError("message") ? " is-error" : ""}`}>
          <label className="contact-field__label" htmlFor="cf-message">
            Mensaje <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="cf-message"
            rows={5}
            placeholder="Cuéntanos qué necesitas, en qué etapa estás, si tienes una fecha o cualquier detalle relevante."
            required
            {...field("message")}
          />
          {hasError("message") && (
            <span className="contact-field__error">Escribe un mensaje un poco más claro.</span>
          )}
        </div>
      </div>

      {status === "error" && (
        <p className="contact-form__error-banner">{statusMsg}</p>
      )}

      <div className="contact-form__footer">
        <button
          type="submit"
          className="contact-form__submit"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Enviando…" : "Enviar mensaje"}
        </button>
        <p className="contact-form__note">
          Te responderemos dentro de 24 horas hábiles.
        </p>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const prefilledService = searchParams.get("service") || "";

  return (
    <div className="contact-page">

      {/* ── HERO ── */}
      <section className="contact-hero">
        <div className="contact-hero__inner page-shell">
          <div className="contact-hero__content">
            <span className="eyebrow-yellow">Ideas Estudio</span>
            <h1 className="contact-hero__title">
              Hablemos de tu marca, tu negocio o tu próximo proyecto.
            </h1>
            <p className="contact-hero__text">
              Cuéntanos lo que necesitas y te orientamos con claridad. Ya sea
              branding, contenido, fotografía, video, web o una solución a la
              medida, estamos listos para escucharte.
            </p>
            <ul className="contact-hero__trust">
              {TRUST_ITEMS.map((item) => (
                <li key={item.label}>
                  <span className="contact-hero__trust-icon">{item.icon}</span>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="contact-hero__visual">
            <div className="contact-hero__visual-inner">
              <div className="contact-hero__visual-tag">
                <span className="contact-hero__visual-dot" />
                Disponible ahora
              </div>
              <p className="contact-hero__visual-headline">
                Cada proyecto empieza con una conversación.
              </p>
              <p className="contact-hero__visual-sub">
                Cuéntanos tu idea y te ayudamos a darle forma con claridad y dirección estratégica.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FORM SECTION ── */}
      <section className="contact-form-section section-space block-light">
        <div className="contact-form-section__inner page-shell">
          <div className="contact-form-section__header">
            <h2 className="section-title">Déjanos tu mensaje</h2>
            <p className="body-lg" style={{ opacity: 0.65, maxWidth: "52ch", marginTop: "12px" }}>
              Completa este formulario y nos pondremos en contacto contigo para
              orientarte según lo que necesitas.
            </p>
          </div>
          <div className="contact-form-section__body">
            <div className="contact-form-section__form-col">
              <FormPlacementRenderer
                sectionKey={CONTACT_FORM_SECTION_KEY}
                fallback={<ContactForm prefilledService={prefilledService} />}
              />
            </div>
            <aside className="contact-form-section__info-col">
              <div className="contact-info-card">
                <p className="contact-info-card__label">Información de contacto</p>
                <ul className="contact-info-list">
                  {CONTACT_INFO.map((item) => (
                    <li key={item.label} className="contact-info-item">
                      <span className="contact-info-item__icon">{item.icon}</span>
                      <div>
                        <span className="contact-info-item__label">{item.label}</span>
                        {item.href ? (
                          <a className="contact-info-item__value contact-info-item__value--link" href={item.href}>
                            {item.value}
                          </a>
                        ) : (
                          <span className="contact-info-item__value">{item.value}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="contact-promise-card">
                <p className="contact-promise-card__title">Lo que puedes esperar</p>
                <ul className="contact-promise-list">
                  <li>Respuesta directa y personalizada</li>
                  <li>Orientación clara según tu situación</li>
                  <li>Sin compromiso en la primera conversación</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── MAP SECTION ── */}
      <section className="contact-map-section section-space">
        <div className="contact-map-section__inner page-shell">
          <div className="contact-map-section__content">
            <p className="contact-map-section__eyebrow">Ubicación</p>
            <h2 className="contact-map-section__title">
              Encuéntranos y conversemos sobre tu proyecto
            </h2>
            <p className="contact-map-section__text">
              Si prefieres ubicar Ideas Estudio primero, aquí tienes el mapa con
              la localización para que puedas ver la zona y tener un punto de referencia claro.
            </p>
            <div className="contact-map-section__details">
              <div className="contact-map-detail-card">
                <span className="contact-map-detail-card__label">Dirección</span>
                <strong>Ideas Estudio</strong>
                <p>Ponce, Puerto Rico</p>
              </div>
              <div className="contact-map-detail-card">
                <span className="contact-map-detail-card__label">Teléfono</span>
                <a href="tel:+17875030349">+1 787-503-0349</a>
              </div>
              <div className="contact-map-detail-card">
                <span className="contact-map-detail-card__label">Correo</span>
                <a href="mailto:omarfisi@ideasestudiopr.com">
                  omarfisi@ideasestudiopr.com
                </a>
              </div>
            </div>
            <div className="contact-map-section__actions">
              <a
                className="contact-map-section__btn"
                href="https://www.google.com/maps/place/Ideas+Estudio/@18.0261881,-66.6123375,17z"
                target="_blank"
                rel="noreferrer"
              >
                Abrir en Google Maps
              </a>
            </div>
          </div>
          <div className="contact-map-section__map-wrap">
            <iframe
              title="Ubicación de Ideas Estudio en Google Maps"
              src={CONTACT_MAP_EMBED_URL}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              className="contact-map-section__map"
            />
          </div>
        </div>
      </section>

      {/* ── CLOSING CTA ── */}
      <section className="contact-cta-close section-space">
        <div className="page-shell">
          <div className="contact-cta-close__inner">
            <div>
              <p className="contact-cta-close__eyebrow">Sigue explorando</p>
              <h2 className="contact-cta-close__title">
                Si aún estás explorando ideas
              </h2>
              <p className="contact-cta-close__text">
                Puedes ver nuestros servicios o revisar parte del trabajo que
                hemos desarrollado para marcas y negocios.
              </p>
            </div>
            <div className="contact-cta-close__actions">
              <Link to="/servicios" className="contact-cta-close__btn-primary">
                Ver servicios
              </Link>
              <Link to="/portafolio" className="contact-cta-close__btn-secondary">
                Ver portafolio
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
