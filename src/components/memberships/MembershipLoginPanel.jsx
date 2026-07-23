import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import { supabase } from "@/lib/supabaseClient.js";
import { translateSupabaseAuthError, GENERIC_AUTH_ERROR_MESSAGE } from "@/lib/membershipAuthErrors.js";
import { withAuthTimeout, AuthRequestTimeoutError } from "@/lib/authRequestTimeout.js";

/**
 * Password login + magic link, scoped to the membership checkout. Calls
 * supabase.auth.* directly (same convention AccountLoginPage already
 * uses) rather than introducing a shared auth-service layer. On success,
 * AuthContext's onAuthStateChange picks up the new session on its own —
 * this panel never navigates or sets a session itself.
 *
 * Deliberately does NOT autofocus its email field on mount: MembershipAuthGate
 * moves focus to the tab button itself when a tab is selected (by click or
 * arrow key), per the W3C tabs pattern — stealing focus back into this
 * panel would break repeated arrow-key navigation between tabs.
 *
 * emailRedirectTo points back at /membresias/checkout (not the account
 * portal's /mi-cuenta/callback) so the visitor returns to the same
 * checkout instead of the generic account dashboard — see
 * MembershipCheckoutPage's sessionStorage restoration for how the plan
 * selection survives that round trip.
 */
export default function MembershipLoginPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const isMountedRef = useRef(true);
  // Checked synchronously before any `await` — `isLoading` (derived from
  // React state) can't prevent a second call fired before the first
  // setStatus({loading}) has actually re-rendered, since a fast double
  // click/Enter can invoke this handler twice within the same render's
  // closure. This ref is set/cleared outside of React's render cycle, so
  // it can't miss that race.
  const submittingRef = useRef(false);

  useEffect(() => {
    // Resetting to true on every (re-)run of the setup — not just relying
    // on the useRef(true) initializer — matters specifically because of
    // React StrictMode: in dev, StrictMode mounts, runs this effect,
    // synthetically unmounts (runs the cleanup below, setting this to
    // false), then remounts and runs the setup again. Without this line,
    // isMountedRef.current stayed false forever after that simulated
    // remount even though the component was genuinely mounted — which
    // made every `if (!isMountedRef.current) return;` guard below fire
    // unconditionally, so setStatus() was never reached on success,
    // error, OR timeout. That was the actual bug behind the stuck
    // "Iniciando sesión…" button, not withAuthTimeout itself.
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isLoading = status.state === "loading";

  async function handlePasswordLogin(event) {
    event.preventDefault();
    if (submittingRef.current || !supabase) return;
    submittingRef.current = true;
    setStatus({ state: "loading", message: "" });
    if (import.meta.env.DEV) console.log("[membership-auth] login started");

    try {
      const { error } = await withAuthTimeout(() =>
        supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      );
      if (import.meta.env.DEV) console.log("[membership-auth] login resolved");
      if (!isMountedRef.current) return;
      if (error) {
        setStatus({ state: "error", message: translateSupabaseAuthError(error) });
        return;
      }
      setStatus({ state: "idle", message: "" });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.log(
          err instanceof AuthRequestTimeoutError
            ? "[membership-auth] login timeout"
            : "[membership-auth] login rejected"
        );
      }
      if (!isMountedRef.current) return;
      setStatus({ state: "error", message: translateSupabaseAuthError(err) });
    } finally {
      // Always releases the guard, regardless of success, error, or
      // timeout — never left true by an early return.
      submittingRef.current = false;
      if (isMountedRef.current) {
        // Belt-and-suspenders: every reachable branch above already
        // clears "loading", but if some future edit ever adds a branch
        // that forgets to, this guarantees the UI can never stay stuck.
        // Functional update so it reads the latest queued state, not a
        // stale closure value.
        setStatus((prev) => (prev.state === "loading" ? { state: "error", message: GENERIC_AUTH_ERROR_MESSAGE } : prev));
      }
      if (import.meta.env.DEV) console.log("[membership-auth] login finished");
    }
  }

  async function handleMagicLink() {
    if (submittingRef.current || !supabase) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setStatus({ state: "error", message: "Ingresa tu correo para enviarte el enlace." });
      return;
    }
    submittingRef.current = true;
    setStatus({ state: "loading", message: "" });
    if (import.meta.env.DEV) console.log("[membership-auth] magic-link started");

    try {
      const { error } = await withAuthTimeout(() =>
        supabase.auth.signInWithOtp({
          email: trimmed,
          options: { emailRedirectTo: `${window.location.origin}/membresias/checkout` },
        })
      );
      if (import.meta.env.DEV) console.log("[membership-auth] magic-link resolved");
      if (!isMountedRef.current) return;
      if (error) {
        setStatus({ state: "error", message: translateSupabaseAuthError(error) });
        return;
      }
      setStatus({ state: "sent", message: "" });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.log(
          err instanceof AuthRequestTimeoutError
            ? "[membership-auth] magic-link timeout"
            : "[membership-auth] magic-link rejected"
        );
      }
      if (!isMountedRef.current) return;
      setStatus({ state: "error", message: translateSupabaseAuthError(err) });
    } finally {
      submittingRef.current = false;
      if (isMountedRef.current) {
        setStatus((prev) => (prev.state === "loading" ? { state: "error", message: GENERIC_AUTH_ERROR_MESSAGE } : prev));
      }
      if (import.meta.env.DEV) console.log("[membership-auth] magic-link finished");
    }
  }

  if (status.state === "sent") {
    return (
      <div role="status" aria-live="polite" className="membership-checkout-authgate__sent">
        <p>
          Revisa tu correo. Te enviamos un enlace de acceso a <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form className="membership-checkout-authgate__form" onSubmit={handlePasswordLogin} noValidate>
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
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isLoading}
          placeholder="••••••••"
        />
      </label>

      {status.state === "error" ? (
        <p className="form-status form-status--error" role="alert">
          {status.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isLoading} block aria-busy={isLoading}>
        {isLoading ? "Iniciando sesión…" : "Iniciar sesión"}
      </Button>

      <button
        type="button"
        className="membership-checkout-authgate__alt"
        onClick={handleMagicLink}
        disabled={isLoading}
      >
        Enviar enlace mágico
      </button>

      {/* AccountLoginPage reads ?mode=recovery and opens directly on its
          recovery form — this deep-links straight there instead of
          dumping the visitor on the password tab first. */}
      <Link to="/mi-cuenta/login?mode=recovery" className="membership-checkout-authgate__forgot">
        ¿Olvidaste tu contraseña?
      </Link>
    </form>
  );
}
