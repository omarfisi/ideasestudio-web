import { useMemo, useState } from "react";
import { submitLeadForm } from "@/lib/publicLeadForms.js";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export default function SplitLeadBlock({
  eyebrow = "Ideas Estudio",
  title = "Recibe ideas, contenido y estrategias para hacer crecer tu negocio.",
  description = "Déjanos tu correo y te compartiremos contenido útil, claro y pensado para ayudarte a comunicar mejor tu marca.",
  imageSrc,
  imageAlt = "Ideas Estudio",
  buttonLabel = "Enviar",
  successMessage = "Listo. Pronto recibirás contenido útil directamente en tu correo.",
  source = "website_contact",
  segment = "pagina_contacto",
  segments = ["pagina_contacto"],
  submissionKind = "lead_capture",
  meta = {},
  theme = "dark",
  showNameField = true,
  showMessageField = false,
  namePlaceholder = "Tu nombre",
  emailPlaceholder = "Tu email",
  messagePlaceholder = "Cuéntanos brevemente qué te interesa",
  consentLabel = "Sin spam. Solo contenido útil.",
  defaultMessage = "",
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(defaultMessage);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [touchedEmail, setTouchedEmail] = useState(false);

  const emailIsValid = useMemo(() => isValidEmail(email), [email]);

  const canSubmit = useMemo(() => {
    if (!emailIsValid) return false;
    if (showNameField && String(fullName).trim().length < 2) return false;
    if (showMessageField && String(message).trim().length < 5) return false;
    return true;
  }, [emailIsValid, showNameField, fullName, showMessageField, message]);

  async function handleSubmit(e) {
    e.preventDefault();
    setTouchedEmail(true);
    setError("");

    if (!emailIsValid) {
      setError("Escribe un correo electrónico válido.");
      return;
    }

    if (showNameField && String(fullName).trim().length < 2) {
      setError("Escribe tu nombre para continuar.");
      return;
    }

    if (showMessageField && String(message).trim().length < 5) {
      setError("Escribe un mensaje un poco más claro.");
      return;
    }

    setLoading(true);

    try {
      await submitLeadForm({
        full_name: fullName,
        email,
        message: showMessageField ? message : defaultMessage || `Lead desde ${source}`,
        source,
        segment,
        segments,
        submission_kind: submissionKind,
        meta,
      });

      setSuccess(true);
      setFullName("");
      setEmail("");
      setMessage(defaultMessage);
      setError("");
    } catch (err) {
      setError(
        err?.message ||
          "No pudimos enviar tu información ahora mismo. Inténtalo nuevamente."
      );
    } finally {
      setLoading(false);
    }
  }

  const isDark = theme === "dark";

  return (
    <section className={`split-lead-block split-lead-block--${isDark ? "dark" : "light"}`}>
      <div className="split-lead-block__card">
        <div className="split-lead-block__content">
          {eyebrow && <p className="split-lead-block__eyebrow">{eyebrow}</p>}
          <h2 className="split-lead-block__title">{title}</h2>
          {description && <p className="split-lead-block__description">{description}</p>}

          {success ? (
            <div className="split-lead-block__success">
              <div className="split-lead-block__success-icon">✓</div>
              <p>{successMessage}</p>
            </div>
          ) : (
            <form className="split-lead-block__form" onSubmit={handleSubmit} noValidate>
              {showNameField ? (
                <input
                  className="split-lead-block__field"
                  type="text"
                  name="full_name"
                  placeholder={namePlaceholder}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              ) : null}

              <input
                className={`split-lead-block__field${touchedEmail && !emailIsValid ? " is-invalid" : ""}`}
                type="email"
                name="email"
                placeholder={emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouchedEmail(true)}
                autoComplete="email"
                required
              />

              {showMessageField ? (
                <textarea
                  className="split-lead-block__field split-lead-block__field--textarea"
                  name="message"
                  placeholder={messagePlaceholder}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              ) : null}

              {error ? <p className="split-lead-block__error">{error}</p> : null}

              <button
                className="split-lead-block__button"
                type="submit"
                disabled={loading || !canSubmit}
              >
                {loading ? "Enviando..." : buttonLabel}
              </button>

              <p className="split-lead-block__consent">{consentLabel}</p>
            </form>
          )}
        </div>

        {imageSrc && (
          <div className="split-lead-block__media">
            <img
              className="split-lead-block__image"
              src={imageSrc}
              alt={imageAlt}
              loading="lazy"
            />
          </div>
        )}
      </div>
    </section>
  );
}
