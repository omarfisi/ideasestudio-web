import { useState } from "react";
import { Navigate } from "react-router-dom";
import PageHero from "@/components/shared/PageHero.jsx";
import Button from "@/components/shared/Button.jsx";
import { supabase } from "@/lib/supabaseClient.js";
import { useAuth } from "@/contexts/AuthContext.jsx";

export default function AccountLoginPage() {
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | sent | error
  const [message, setMessage] = useState("");

  if (loading) {
    return (
      <section className="section">
        <div className="container">
          <div className="empty-state">
            <p>Verificando sesión...</p>
          </div>
        </div>
      </section>
    );
  }

  if (session) {
    return <Navigate replace to="/mi-cuenta" />;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setStatus("error");
      setMessage("Ingresa tu email para continuar.");
      return;
    }

    if (!supabase) {
      setStatus("error");
      setMessage("El portal de cliente no está configurado todavía. Contacta al equipo.");
      return;
    }

    setStatus("loading");
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/mi-cuenta/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message || "No se pudo enviar el enlace. Intenta nuevamente.");
      return;
    }

    setStatus("sent");
    setMessage(`Revisa tu bandeja de entrada en ${trimmedEmail}. El enlace expira en 10 minutos.`);
  }

  return (
    <>
      <PageHero
        eyebrow="Mi cuenta"
        title="Accede a tu portal"
        subtitle="Ingresa tu email y te enviamos un enlace seguro para entrar sin contraseña."
      />

      <section className="section">
        <div className="container" style={{ maxWidth: "480px", margin: "0 auto" }}>
          {status === "sent" ? (
            <div className="detail-panel">
              <h2>Enlace enviado</h2>
              <p className="detail-summary__note">{message}</p>
              <p className="detail-summary__note">
                Una vez que hagas clic en el enlace, serás redirigido a tu portal de cliente.
              </p>
              <Button
                onClick={() => {
                  setStatus("idle");
                  setMessage("");
                }}
                variant="secondary"
              >
                Reenviar enlace
              </Button>
            </div>
          ) : (
            <form className="detail-panel" onSubmit={handleSubmit}>
              <h2>Ingresa a tu cuenta</h2>
              <p className="detail-summary__note">
                Usa el mismo email con el que realizaste tu compra.
              </p>

              <div className="form-grid">
                <label className="field field--full">
                  <span>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    disabled={status === "loading"}
                    autoComplete="email"
                  />
                </label>
              </div>

              {status === "error" ? (
                <p className="form-status form-status--error">{message}</p>
              ) : null}

              <Button type="submit" disabled={status === "loading"}>
                {status === "loading" ? "Enviando enlace..." : "Enviar enlace de acceso"}
              </Button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
