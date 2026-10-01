import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead.jsx";
import { usePageSeo } from "@/hooks/usePageSeo.js";
import { submitLeadForm } from "@/lib/publicLeadForms.js";
import "./JJPegaContact.css";

const SERVICE_OPTIONS = [
  "Sticker personalizado",
  "Pack de stickers",
  "Diseño generado con IA",
  "Stickers para regalo",
  "Pedido para negocio o evento",
  "Otro / No estoy seguro",
];

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

// ─── Trust badges ─────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  { icon: "✦", label: "Diseños personalizados" },
  { icon: "✦", label: "Atención directa" },
  { icon: "✦", label: "Buenas vibras" },
];

const CONTACT_INFO = [
  {
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    label: "Correo",
    value: "info@jjpega.com",
    href: "mailto:info@jjpega.com",
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
  // The CRM form marks the message as required, without a minimum-length
  // constraint. Keep the public page in sync so a short but non-empty
  // message is not incorrectly reported as missing.
  const messageValid = form.message.trim().length > 0;
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
        segments: ["jj_pega_contacto", "nuevos_suscriptores"],
        submission_kind: "commercial_contact",
        meta: {
          form_name: "contact_main_form",
          page_url: "/contacto",
          entry_point: "contact_page",
          ui_context: "jj_pega_web_public",
        },
      });

      setStatus("success");
      setStatusMsg(
        result?.message ||
          "¡Listo! Recibimos tu idea. Te responderemos por email muy pronto."
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
        <h3 className="contact-form-success__title">¡Idea recibida!</h3>
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
    <form className="contact-form jj-contact-form" onSubmit={handleSubmit} noValidate>
      <div className="jj-contact-form__grid">
        <div className={`jj-contact-form__field${hasError("full_name") ? " is-error" : ""}`}>
          <label htmlFor="cf-name">Nombre completo <span>*</span></label>
          <input id="cf-name" type="text" placeholder="Tu nombre" autoComplete="name" required aria-invalid={hasError("full_name") || undefined} {...field("full_name")} />
        </div>
        <div className={`jj-contact-form__field${hasError("email") ? " is-error" : ""}`}>
          <label htmlFor="cf-email">Email <span>*</span></label>
          <input id="cf-email" type="email" placeholder="tu@email.com" autoComplete="email" required aria-invalid={hasError("email") || undefined} {...field("email")} />
        </div>
        <div className="jj-contact-form__field jj-contact-form__field--full">
          <label htmlFor="cf-business">Nombre del negocio <em>(opcional)</em></label>
          <input id="cf-business" type="text" placeholder="Nombre de tu empresa o proyecto" autoComplete="organization" {...field("business_name")} />
        </div>
        <div className="jj-contact-form__field jj-contact-form__field--full">
          <label htmlFor="cf-service">¿Qué quieres crear? <em>(opcional)</em></label>
          <select id="cf-service" {...field("service_interest")}>
            <option value="">Selecciona una opción</option>
            {SERVICE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className={`jj-contact-form__field jj-contact-form__field--full${hasError("message") ? " is-error" : ""}`}>
          <label htmlFor="cf-message">Mensaje <span>*</span></label>
          <textarea id="cf-message" rows={4} placeholder="Cuéntanos qué quieres crear, para cuándo lo necesitas o cualquier detalle de tu idea." required aria-invalid={hasError("message") || undefined} {...field("message")} />
        </div>
      </div>
      {(hasError("full_name") || hasError("email") || hasError("message")) && <p className="jj-contact-form__validation" role="alert">Revisa los campos obligatorios antes de enviar.</p>}
      {status === "error" && <p className="contact-form__error-banner">{statusMsg}</p>}
      <div className="jj-contact-form__actions">
        <button type="submit" className="jj-contact-form__submit" disabled={status === "loading"} aria-label={status === "loading" ? "Enviando mensaje" : "Enviar mensaje"}>
          <img src="/assets/jj-pega/contact/contact-submit-button.webp" alt="Enviar mensaje" />
          {status === "loading" && <span>Enviando…</span>}
        </button>
        <p className="jj-contact-form__note">Te responderemos por email dentro de 24 horas hábiles.</p>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactPage() {
  const pageSeo = usePageSeo();
  const [searchParams] = useSearchParams();
  const prefilledService = searchParams.get("service") || "";

  return (
    <div className="contact-page">
      <SEOHead
        title="Contacto | JJ Pega"
        description="Cuéntanos qué quieres crear y el equipo de JJ Pega te ayudará a convertirlo en stickers."
        canonical="https://jjpega.com/contacto"
        seoEntry={pageSeo}
      />

      {/* ── HERO VISUAL JJ PEGA ── */}
      <section className="contact-hero contact-hero--artwork" aria-labelledby="contact-hero-title">
        <div className="contact-hero__artwork page-shell">
          <img
            className="contact-hero__artwork-image"
            src="/assets/jj-pega/contact/contact-hero.webp"
            alt="JJ Pega: cuéntanos qué quieres pegar y crear"
          />
          <Link
            to="#contact-form"
            className="contact-hero__artwork-button"
            aria-label="Escríbenos"
          >
            <img src="/assets/jj-pega/contact/contact-button.webp" alt="Escríbenos" />
          </Link>
          <h1 id="contact-hero-title" className="sr-only">Contacto JJ Pega</h1>
        </div>
      </section>

      {/* ── FORM SECTION ── */}
      <section id="contact-form" className="contact-form-section section-space block-light">
        <div className="contact-form-section__frame">
          <img
            className="contact-form-section__frame-image"
            src="/assets/jj-pega/contact/contact-form-frame.webp"
            alt="Marco decorativo de JJ Pega para el formulario de contacto"
          />
          <div className="contact-form-section__inner page-shell">
            <div className="contact-form-section__body">
              <div className="contact-form-section__form-col">
                <img
                  className="contact-form-section__header-decor"
                  src="/assets/jj-pega/contact/contact-form-banner.webp"
                  alt="Hablemos de tu idea. Cuéntanos tu idea y te ayudamos a darle vida."
                />
                <ContactForm prefilledService={prefilledService} />
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
