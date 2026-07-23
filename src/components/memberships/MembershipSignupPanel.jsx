import { useEffect, useRef, useState } from "react";
import Button from "@/components/shared/Button.jsx";
import { supabase } from "@/lib/supabaseClient.js";
import { translateSupabaseAuthError, GENERIC_AUTH_ERROR_MESSAGE } from "@/lib/membershipAuthErrors.js";
import { withAuthTimeout, AuthRequestTimeoutError } from "@/lib/authRequestTimeout.js";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Real supabase.auth.signUp — this project never implemented one before.
 * Never touches the backend, never uses a service role key, never writes
 * to auth.users directly, never creates a CRM profile: purely the public
 * anon-key SDK call, exactly like every other auth action in this repo.
 *
 * Deliberately does NOT autofocus its email field on mount — see
 * MembershipLoginPanel's docstring for why (MembershipAuthGate owns tab
 * focus per the W3C tabs pattern).
 */
export default function MembershipSignupPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const isMountedRef = useRef(true);
  // See MembershipLoginPanel's submittingRef for why this can't just be
  // `status.state === "loading"` — a fast double-click can invoke this
  // handler twice before the first setStatus({loading}) has re-rendered.
  const submittingRef = useRef(false);

  useEffect(() => {
    // See MembershipLoginPanel's identical effect for why this reset is
    // required (React StrictMode's dev-only mount→cleanup→remount
    // simulation leaves this stuck at `false` forever without it).
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isLoading = status.state === "loading";

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current || !supabase) return;

    if (password.length < MIN_PASSWORD_LENGTH) {
      setStatus({
        state: "error",
        message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      });
      return;
    }
    if (password !== confirmPassword) {
      setStatus({ state: "error", message: "Las contraseñas no coinciden." });
      return;
    }
    submittingRef.current = true;
    setStatus({ state: "loading", message: "" });
    if (import.meta.env.DEV) console.log("[membership-auth] signup started");

    try {
      const { data, error } = await withAuthTimeout(() =>
        supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/membresias/checkout` },
        })
      );
      if (import.meta.env.DEV) console.log("[membership-auth] signup resolved");
      if (!isMountedRef.current) return;

      if (error) {
        setStatus({ state: "error", message: translateSupabaseAuthError(error) });
        return;
      }

      // Supabase's anti-enumeration shape (a confirmed account that already
      // owns this email comes back as a user with an empty identities array
      // and NO error) is NOT trusted on its own — Supabase can be configured
      // to hide this signal entirely, so asserting "an account already
      // exists" here could be both wrong and a mild enumeration risk. This
      // uses a neutral message that's true either way instead.
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setStatus({
          state: "error",
          message:
            "Si ya tienes una cuenta con este correo, inicia sesión en su lugar. Si acabas de registrarte, revisa tu correo para confirmar tu cuenta.",
        });
        return;
      }

      if (!data?.session) {
        setStatus({ state: "pending_confirmation", message: "" });
        return;
      }
      // A session came back immediately (email confirmation disabled on this
      // Supabase project) — AuthContext picks it up on its own.
      setStatus({ state: "idle", message: "" });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.log(
          err instanceof AuthRequestTimeoutError
            ? "[membership-auth] signup timeout"
            : "[membership-auth] signup rejected"
        );
      }
      if (!isMountedRef.current) return;
      setStatus({ state: "error", message: translateSupabaseAuthError(err) });
    } finally {
      submittingRef.current = false;
      if (isMountedRef.current) {
        setStatus((prev) => (prev.state === "loading" ? { state: "error", message: GENERIC_AUTH_ERROR_MESSAGE } : prev));
      }
      if (import.meta.env.DEV) console.log("[membership-auth] signup finished");
    }
  }

  if (status.state === "pending_confirmation") {
    return (
      <div role="status" aria-live="polite" className="membership-checkout-authgate__sent">
        <p>Revisa tu correo para confirmar tu cuenta.</p>
      </div>
    );
  }

  return (
    <form className="membership-checkout-authgate__form" onSubmit={handleSubmit} noValidate>
      <label className="membership-checkout__field">
        <span>Correo electrónico</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isLoading}
          placeholder="tu@correo.com"
        />
      </label>

      <label className="membership-checkout__field">
        <span>Contraseña</span>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isLoading}
          placeholder="Mínimo 8 caracteres"
        />
      </label>

      <label className="membership-checkout__field">
        <span>Confirmar contraseña</span>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={isLoading}
          placeholder="Repite la contraseña"
        />
      </label>

      {status.state === "error" ? (
        <p className="form-status form-status--error" role="alert">
          {status.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isLoading} block aria-busy={isLoading}>
        {isLoading ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
