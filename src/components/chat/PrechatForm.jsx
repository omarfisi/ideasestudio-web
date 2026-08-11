import { useRef, useState } from "react";
import { submitPublicForm } from "@/lib/publicFormsApi.js";
import { verifyPrechat } from "@/services/publicChatApi.js";

const PRECHAT_FORM_SLUG = "aira-prechat";

const CONSENT_LABEL =
  "Acepto que Ideas Estudio utilice mis datos para responder esta conversación y dar seguimiento a mi solicitud.";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validate(values) {
  const errors = {};
  if (!values.full_name.trim()) errors.full_name = "Escribe tu nombre.";
  if (!values.email.trim()) errors.email = "Escribe tu correo electrónico.";
  else if (!isValidEmail(values.email.trim())) errors.email = "Escribe un correo electrónico válido.";
  if (!values.consent) errors.consent = "Debes aceptar para continuar.";
  return errors;
}

/**
 * Pantalla previa al chat público de AIRA. Reutiliza el sistema de
 * formularios existente (submitPublicForm contra el form "aira-prechat" ya
 * seedeado en el backend) — nunca un segundo sistema de captura de leads.
 * Un submission_id por sí solo no basta como prueba de que el pre-chat
 * ocurrió (podría inventarse en el navegador): por eso, tras el submit,
 * este componente pide al backend un prechat_token de un solo uso
 * (POST /public/chat/prechat) que valida esa submission server-side antes
 * de emitirlo. Nunca se guarda nombre/email/teléfono para el chat — solo
 * ese token opaco viaja hacia PublicChatWidget.
 */
export default function PrechatForm({ onVerified, onCancel }) {
  const [values, setValues] = useState({ full_name: "", email: "", phone: "", consent: false, _honeypot: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | error
  const [serverError, setServerError] = useState("");
  const submitTimestampRef = useRef(Date.now());

  function setField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setServerError("");

    if (values._honeypot) {
      // Bot detectado: no revelamos nada, simplemente no avanzamos.
      return;
    }

    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setStatus("submitting");
    try {
      const submission = await submitPublicForm(PRECHAT_FORM_SLUG, {
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        consent: true,
        honeypot: values._honeypot || "",
        submit_timestamp: submitTimestampRef.current,
      });

      if (!submission?.submission_id) {
        throw new Error("No se pudo registrar tu información. Intenta de nuevo.");
      }

      const verification = await verifyPrechat(submission.submission_id);
      if (!verification?.prechat_token) {
        throw new Error("No se pudo verificar tu información. Intenta de nuevo.");
      }

      onVerified(verification.prechat_token);
    } catch (error) {
      setStatus("error");
      setServerError(error?.message || "No se pudo iniciar la conversación. Intenta de nuevo en un momento.");
      return;
    }
    setStatus("idle");
  }

  const submitting = status === "submitting";

  return (
    <form className="public-chat-widget__prechat" onSubmit={handleSubmit} noValidate>
      <div className="public-chat-widget__prechat-intro">
        <h2>Antes de comenzar</h2>
        <p>Cuéntanos quién eres para que AIRA pueda ayudarte y darte seguimiento si hace falta.</p>
      </div>

      <div aria-hidden="true" className="public-chat-widget__prechat-honeypot">
        <input
          type="text"
          name="website"
          autoComplete="off"
          tabIndex={-1}
          value={values._honeypot}
          onChange={(event) => setField("_honeypot", event.target.value)}
        />
      </div>

      <div className="public-chat-widget__prechat-field">
        <label htmlFor="prechat-full-name">Nombre completo</label>
        <input
          id="prechat-full-name"
          type="text"
          autoComplete="name"
          value={values.full_name}
          onChange={(event) => setField("full_name", event.target.value)}
          disabled={submitting}
          aria-invalid={Boolean(errors.full_name)}
          aria-describedby={errors.full_name ? "prechat-full-name-error" : undefined}
        />
        {errors.full_name && (
          <p id="prechat-full-name-error" className="public-chat-widget__prechat-field-error" role="alert">
            {errors.full_name}
          </p>
        )}
      </div>

      <div className="public-chat-widget__prechat-field">
        <label htmlFor="prechat-email">Correo electrónico</label>
        <input
          id="prechat-email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => setField("email", event.target.value)}
          disabled={submitting}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "prechat-email-error" : undefined}
        />
        {errors.email && (
          <p id="prechat-email-error" className="public-chat-widget__prechat-field-error" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      <div className="public-chat-widget__prechat-field">
        <label htmlFor="prechat-phone">Teléfono (opcional)</label>
        <input
          id="prechat-phone"
          type="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={(event) => setField("phone", event.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="public-chat-widget__prechat-consent">
        <label>
          <input
            type="checkbox"
            checked={values.consent}
            onChange={(event) => setField("consent", event.target.checked)}
            disabled={submitting}
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? "prechat-consent-error" : undefined}
          />
          <span>{CONSENT_LABEL}</span>
        </label>
        {errors.consent && (
          <p id="prechat-consent-error" className="public-chat-widget__prechat-field-error" role="alert">
            {errors.consent}
          </p>
        )}
      </div>

      {serverError && (
        <p className="public-chat-widget__error" role="alert" aria-live="assertive">
          {serverError}
        </p>
      )}

      <div className="public-chat-widget__prechat-actions">
        {onCancel && (
          <button type="button" className="public-chat-widget__action-btn" onClick={onCancel} disabled={submitting}>
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="public-chat-widget__action-btn public-chat-widget__action-btn--primary"
          disabled={submitting}
        >
          {submitting ? "Enviando…" : "Comenzar conversación"}
        </button>
      </div>
    </form>
  );
}
