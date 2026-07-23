import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient.js";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { TESTIMONIALS } from "@/data/testimonials.js";

const BRAND_LOGO =
  "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/logos/favicon_ideasestudio.webp";

const TESTIMONIAL = TESTIMONIALS["maria-del-mar"];

// mode: "password" | "magic" | "recovery"
// status: "idle" | "loading" | "sent" | "error"
export default function AccountLoginPage() {
  const { session, loading } = useAuth();

  // ?mode=recovery lets a caller (e.g. the membership checkout's auth gate)
  // deep-link straight into the recovery form instead of dumping the
  // visitor on the password tab and making them find their way there.
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(searchParams.get("mode") === "recovery" ? "recovery" : "password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [sentEmail, setSentEmail] = useState("");

  if (loading) {
    return (
      <div className="customer-login-wrap">
        <p style={{ color: "#6b7280" }}>Verificando sesión…</p>
      </div>
    );
  }

  if (session) {
    return <Navigate replace to="/mi-cuenta" />;
  }

  function switchMode(next) {
    setMode(next);
    setStatus("idle");
    setErrorMsg("");
  }

  async function handlePasswordLogin(e) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) {
      setStatus("error");
      setErrorMsg("Ingresa tu email y contraseña.");
      return;
    }
    if (!supabase) {
      setStatus("error");
      setErrorMsg("El portal no está configurado. Contacta al equipo.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
      if (error) throw error;
      // On success AuthContext picks up the session automatically
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err?.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos."
          : err?.message || "No se pudo iniciar sesión."
      );
    }
  }

  async function handleMagicLink(e) {
    e?.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setStatus("error");
      setErrorMsg("Ingresa tu email para continuar.");
      return;
    }
    if (!supabase) {
      setStatus("error");
      setErrorMsg("El portal no está configurado. Contacta al equipo.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: `${window.location.origin}/mi-cuenta/callback` },
      });
      if (error) throw error;
      setSentEmail(trimmed);
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err?.message || "No se pudo enviar el enlace.");
    }
  }

  async function handleRecovery(e) {
    e?.preventDefault();
    setErrorMsg("");

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setStatus("error");
      setErrorMsg("Escribe tu email primero.");
      return;
    }
    if (!supabase) {
      setStatus("error");
      setErrorMsg("El portal no está configurado. Contacta al equipo.");
      return;
    }

    setStatus("loading");

    try {
      const redirectTo = `${window.location.origin}/mi-cuenta/reset-password`;
      console.log("[password-reset] redirectTo", redirectTo);

      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });

      if (error) {
        console.error("[password-reset] error", error);
        throw error;
      }

      setSentEmail(trimmed);
      setStatus("sent");
    } catch (err) {
      console.error("[password-reset] catch", err);
      setStatus("error");
      setErrorMsg(
        err?.message || "No se pudo enviar el enlace. Verifica la configuración de Supabase."
      );
    }
  }

  const isLoading = status === "loading";

  const headings = {
    password: "Accede a tu cuenta",
    magic: "Enlace de acceso",
    recovery: "Crear o recuperar contraseña",
  };
  const subheadings = {
    password: "Usa el email y contraseña de tu cuenta de cliente.",
    magic: "Te enviamos un enlace seguro para entrar sin contraseña.",
    recovery: "Te enviamos un enlace para establecer o recuperar tu contraseña.",
  };
  const submitLabels = {
    password: { idle: "Iniciar sesión", loading: "Iniciando sesión…" },
    magic: { idle: "Enviar enlace de acceso", loading: "Enviando enlace…" },
    recovery: { idle: "Enviar enlace", loading: "Enviando enlace…" },
  };

  return (
    <div className="customer-login-wrap">
      <div className="customer-login-card">

        {/* ── Left: form panel ── */}
        <div className="customer-login-form-panel">
          <img src={BRAND_LOGO} alt="Ideas Estudio" className="customer-login-logo" />

          {status === "sent" ? (
            <div className="customer-login-success">
              <div className="customer-login-success__icon">✉️</div>
              <p className="customer-login-success__title">Enlace enviado</p>
              <p className="customer-login-success__text">
                Revisa tu bandeja de entrada en <strong>{sentEmail}</strong>.
              </p>
              <p className="customer-login-success__hint">
                {mode === "recovery"
                  ? "Haz clic en el enlace para crear o restablecer tu contraseña. Expira en 10 minutos."
                  : "El enlace expira en 10 minutos. Haz clic y serás redirigido a tu portal."}
              </p>
              <button
                className="customer-login-success__back"
                onClick={() => { setStatus("idle"); setErrorMsg(""); }}
              >
                ← Volver
              </button>
            </div>
          ) : (
            <>
              <h1 className="customer-login-heading">{headings[mode]}</h1>
              <p className="customer-login-subheading">{subheadings[mode]}</p>

              <form
                className="customer-login-form"
                onSubmit={
                  mode === "password"
                    ? handlePasswordLogin
                    : mode === "magic"
                    ? handleMagicLink
                    : handleRecovery
                }
              >
                <div className="customer-login-field">
                  <label className="customer-login-label" htmlFor="cl-email">
                    Email
                  </label>
                  <input
                    id="cl-email"
                    type="email"
                    className="customer-login-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>

                {mode === "password" && (
                  <div className="customer-login-field">
                    <label className="customer-login-label" htmlFor="cl-password">
                      Contraseña
                    </label>
                    <input
                      id="cl-password"
                      type="password"
                      className="customer-login-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                  </div>
                )}

                {mode === "password" && (
                  <div className="customer-login-row">
                    <label className="customer-login-remember">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        disabled={isLoading}
                      />
                      Recuérdame
                    </label>
                    <button
                      type="button"
                      className="customer-login-forgot"
                      onClick={() => switchMode("recovery")}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                )}

                {status === "error" && (
                  <p className="customer-login-error">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  className="customer-login-submit"
                  disabled={isLoading}
                >
                  {isLoading
                    ? submitLabels[mode].loading
                    : submitLabels[mode].idle}
                </button>

                {mode === "password" && (
                  <>
                    <div className="customer-login-divider">o</div>
                    <button
                      type="button"
                      className="customer-login-alt-btn"
                      disabled={isLoading}
                      onClick={() => switchMode("magic")}
                    >
                      Acceder con enlace mágico
                    </button>
                  </>
                )}

                <p className="customer-login-toggle">
                  {mode === "password" && (
                    <>
                      ¿Sin contraseña?
                      <button type="button" onClick={() => switchMode("recovery")}>
                        Crear contraseña
                      </button>
                    </>
                  )}
                  {mode === "magic" && (
                    <>
                      ¿Tienes contraseña?
                      <button type="button" onClick={() => switchMode("password")}>
                        Iniciar sesión
                      </button>
                    </>
                  )}
                  {mode === "recovery" && (
                    <>
                      ¿Ya tienes contraseña?
                      <button type="button" onClick={() => switchMode("password")}>
                        Volver al login
                      </button>
                    </>
                  )}
                </p>
              </form>
            </>
          )}
        </div>

        {/* ── Right: brand panel ── */}
        <div className="customer-login-brand-panel">
          <div className="customer-login-brand-top">
            <div className="customer-login-brand-badge">Portal de Cliente</div>
            <h2 className="customer-login-brand-title">
              Tu proyecto,<br />
              <span>en un solo lugar</span>
            </h2>
            <p className="customer-login-brand-subtitle">
              Accede a tus facturas, propuestas, estado de proyectos y más
              desde tu portal personalizado.
            </p>
          </div>

          <div className="customer-login-brand-bottom">
            <div className="customer-login-stars">
              {"★★★★★".split("").map((s, i) => (
                <span key={i}>{s}</span>
              ))}
            </div>
            <blockquote className="customer-login-quote">
              "{TESTIMONIAL.quote}"
            </blockquote>
            <p className="customer-login-quote-author">— {TESTIMONIAL.name}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
