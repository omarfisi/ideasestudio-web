import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient.js";

const BRAND_LOGO =
  "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/logos/favicon_ideasestudio.webp";

// phase: "verifying" | "ready" | "invalid" | "done"
export default function AccountPasswordResetPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!supabase) {
      setPhase("invalid");
      return;
    }

    let resolved = false;

    const resolve = (valid) => {
      if (resolved) return;
      resolved = true;
      setPhase(valid ? "ready" : "invalid");
    };

    // Supabase fires PASSWORD_RECOVERY after exchanging the code from the URL
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        resolve(true);
      } else if (event === "SIGNED_IN" && session) {
        resolve(true);
      }
    });

    // Also check if a session already exists (token exchanged before mount)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) resolve(true);
    });

    // Fallback: if nothing resolves in 5s, treat as invalid
    const timer = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        resolve(!!data.session);
      });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 8) {
      setStatus("error");
      setErrorMsg("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    setStatus("loading");
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message || "No se pudo actualizar la contraseña. Intenta nuevamente.");
      return;
    }

    setPhase("done");
  }

  return (
    <div className="customer-login-wrap">
      <div className="customer-login-card customer-login-card--single">
        <div className="customer-login-form-panel">
          <img src={BRAND_LOGO} alt="Ideas Estudio" className="customer-login-logo" />

          {phase === "verifying" && (
            <>
              <h1 className="customer-login-heading">Verificando enlace…</h1>
              <p className="customer-login-subheading">
                Un momento, estamos procesando tu solicitud.
              </p>
              <div className="customer-login-spinner" />
            </>
          )}

          {phase === "invalid" && (
            <>
              <h1 className="customer-login-heading">Enlace inválido</h1>
              <p className="customer-login-subheading">
                Este enlace expiró o ya fue usado. Solicita uno nuevo desde la página de acceso.
              </p>
              <button
                className="customer-login-submit"
                onClick={() => navigate("/mi-cuenta/login")}
              >
                Volver al login
              </button>
            </>
          )}

          {phase === "ready" && (
            <>
              <h1 className="customer-login-heading">Crear contraseña</h1>
              <p className="customer-login-subheading">
                Elige una contraseña segura de al menos 8 caracteres.
              </p>

              <form className="customer-login-form" onSubmit={handleSubmit}>
                <div className="customer-login-field">
                  <label className="customer-login-label" htmlFor="rp-password">
                    Nueva contraseña
                  </label>
                  <input
                    id="rp-password"
                    type="password"
                    className="customer-login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    disabled={status === "loading"}
                    autoComplete="new-password"
                  />
                </div>

                <div className="customer-login-field">
                  <label className="customer-login-label" htmlFor="rp-confirm">
                    Confirmar contraseña
                  </label>
                  <input
                    id="rp-confirm"
                    type="password"
                    className="customer-login-input"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                    disabled={status === "loading"}
                    autoComplete="new-password"
                  />
                </div>

                {status === "error" && (
                  <p className="customer-login-error">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  className="customer-login-submit"
                  disabled={status === "loading"}
                >
                  {status === "loading" ? "Guardando…" : "Guardar contraseña"}
                </button>
              </form>
            </>
          )}

          {phase === "done" && (
            <>
              <div className="customer-login-success">
                <div className="customer-login-success__icon">✅</div>
                <p className="customer-login-success__title">¡Contraseña creada!</p>
                <p className="customer-login-success__text">
                  Ya puedes iniciar sesión con tu email y contraseña.
                </p>
              </div>
              <button
                className="customer-login-submit"
                style={{ marginTop: "20px" }}
                onClick={() => navigate("/mi-cuenta")}
              >
                Ir a mi cuenta
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
