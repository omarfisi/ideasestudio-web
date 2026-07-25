import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const API_BASE = (
  import.meta.env.VITE_CRM_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "https://api.ideasestudiopr.com"
).replace(/\/+$/, "");

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconCheck() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="var(--ideas-yellow)" />
      <path
        d="M12 20.5l6 6 10-12"
        stroke="var(--ideas-black)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="#f5f5f5" />
      <path
        d="M20 13v9M20 26.5v.5"
        stroke="var(--ideas-black)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconError() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="#f5f5f5" />
      <path
        d="M14 14l12 12M26 14L14 26"
        stroke="#d00"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Deliberately rendered outside MainLayout (no site Header/Footer): this is
// a one-purpose email-compliance confirmation page, not a marketing page —
// keeping it isolated avoids distracting nav/CTAs during an unsubscribe
// flow. Every state below already includes its own explicit way back
// ("No, volver al inicio" / "Volver a Ideas Estudio" / "Contactar"), so the
// footer-audit's "add a clear way back to home" requirement is already met
// without adding the marketing footer here.
export default function UnsubscribePage() {
  const [token, setToken] = useState(null);
  // ready | submitting | success | invalid | error
  const [status, setStatus] = useState("ready");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (!t) {
      setStatus("invalid");
    } else {
      setToken(t);
    }
  }, []);

  async function confirmUnsubscribe() {
    if (!token) return;
    setStatus("submitting");

    const body = new URLSearchParams();
    body.set("token", token);

    try {
      const res = await fetch(`${API_BASE}/email/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      const text = await res.text();

      if (!res.ok || /inv[aá]lido|invalid|error/i.test(text)) {
        setStatus("invalid");
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="unsub-page">
      <div className="unsub-card">
        {/* Brand mark */}
        <div className="unsub-brand">
          <span className="unsub-brand__dot" />
          <span className="unsub-brand__name">Ideas Estudio</span>
        </div>

        {status === "ready" && (
          <div className="unsub-state">
            <p className="unsub-eyebrow">Correos promocionales</p>
            <h1 className="unsub-title">Cancelar suscripción</h1>
            <p className="unsub-body">
              Estás a punto de cancelar tu suscripción a los correos
              promocionales de Ideas Estudio. No recibirás más mensajes de
              marketing.
            </p>
            <button className="unsub-btn unsub-btn--primary" onClick={confirmUnsubscribe}>
              Sí, cancelar suscripción
            </button>
            <Link to="/" className="unsub-link">
              No, volver al inicio
            </Link>
          </div>
        )}

        {status === "submitting" && (
          <div className="unsub-state">
            <p className="unsub-eyebrow">Procesando</p>
            <h1 className="unsub-title">Cancelar suscripción</h1>
            <p className="unsub-body">Procesando tu solicitud…</p>
            <button className="unsub-btn unsub-btn--primary" disabled>
              Procesando…
            </button>
          </div>
        )}

        {status === "success" && (
          <div className="unsub-state">
            <div className="unsub-icon">
              <IconCheck />
            </div>
            <h1 className="unsub-title">Suscripción cancelada</h1>
            <p className="unsub-body">
              Listo. Ya no recibirás correos promocionales de Ideas Estudio.
            </p>
            <Link to="/" className="unsub-btn unsub-btn--secondary">
              Volver a Ideas Estudio
            </Link>
          </div>
        )}

        {status === "invalid" && (
          <div className="unsub-state">
            <div className="unsub-icon">
              <IconWarning />
            </div>
            <h1 className="unsub-title">Enlace no válido</h1>
            <p className="unsub-body">
              Este enlace no es válido o ha expirado. Si crees que es un error,
              contáctanos y lo resolvemos.
            </p>
            <Link to="/contacto" className="unsub-btn unsub-btn--secondary">
              Contactar
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="unsub-state">
            <div className="unsub-icon">
              <IconError />
            </div>
            <h1 className="unsub-title">Algo salió mal</h1>
            <p className="unsub-body">
              No pudimos procesar la solicitud. Intenta abrir el enlace
              nuevamente o contáctanos si el problema persiste.
            </p>
            <button
              className="unsub-btn unsub-btn--primary"
              onClick={() => setStatus("ready")}
            >
              Intentar de nuevo
            </button>
            <Link to="/contacto" className="unsub-link">
              Contactar soporte
            </Link>
          </div>
        )}
      </div>

      <style>{`
        .unsub-page {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          background: var(--ideas-black);
          background-image: radial-gradient(
            circle at top right,
            rgba(249, 208, 1, 0.12),
            transparent 40%
          );
        }

        .unsub-card {
          background: var(--ideas-white);
          border-radius: 16px;
          padding: 48px 40px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35);
        }

        .unsub-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 40px;
        }

        .unsub-brand__dot {
          display: block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--ideas-yellow);
        }

        .unsub-brand__name {
          font-family: "Manrope", sans-serif;
          font-weight: 800;
          font-size: 15px;
          color: var(--ideas-black);
          letter-spacing: -0.01em;
        }

        .unsub-state {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .unsub-icon {
          margin-bottom: 4px;
        }

        .unsub-eyebrow {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(11, 11, 13, 0.45);
          margin: 0;
        }

        .unsub-title {
          font-family: "Manrope", sans-serif;
          font-weight: 900;
          font-size: clamp(22px, 5vw, 28px);
          color: var(--ideas-black);
          margin: 0;
          line-height: 1.15;
        }

        .unsub-body {
          font-size: 15px;
          line-height: 1.65;
          color: rgba(11, 11, 13, 0.70);
          margin: 0;
          max-width: 40ch;
        }

        .unsub-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 13px 24px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          text-decoration: none;
          border: none;
          transition: opacity 0.15s;
          width: fit-content;
        }

        .unsub-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .unsub-btn:not(:disabled):hover {
          opacity: 0.85;
        }

        .unsub-btn--primary {
          background: var(--ideas-black);
          color: var(--ideas-white);
        }

        .unsub-btn--secondary {
          background: var(--ideas-yellow);
          color: var(--ideas-black);
        }

        .unsub-link {
          font-size: 13px;
          color: rgba(11, 11, 13, 0.5);
          text-decoration: underline;
          text-underline-offset: 3px;
          width: fit-content;
        }

        .unsub-link:hover {
          color: var(--ideas-black);
        }

        @media (max-width: 520px) {
          .unsub-card {
            padding: 36px 24px;
          }
          .unsub-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
