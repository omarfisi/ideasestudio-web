import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient.js";
import { translateSupabaseAuthError } from "@/lib/membershipAuthErrors.js";
import { withAuthTimeout } from "@/lib/authRequestTimeout.js";

/**
 * Identity strip shown once a Supabase session exists. "Usar otra cuenta"
 * only triggers signOut() — AuthContext's onAuthStateChange subscription
 * (already wired app-wide) is what actually flips the checkout page back
 * to the auth gate on success, so there is nothing else to coordinate
 * here. If signOut() itself errors or times out, the session likely never
 * changed — this surfaces that explicitly rather than leaving the visitor
 * thinking the switch happened. Never touches sessionStorage either way,
 * so the plan selection survives regardless of outcome.
 */
export default function MembershipAuthenticatedAccount({ email }) {
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const isMountedRef = useRef(true);

  useEffect(() => {
    // See MembershipLoginPanel's identical effect for why this reset is
    // required (React StrictMode's dev-only mount→cleanup→remount
    // simulation leaves this stuck at `false` forever without it).
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function handleUseAnotherAccount() {
    if (!supabase || signingOut) return;
    setSigningOut(true);
    setErrorMessage("");
    if (import.meta.env.DEV) console.log("[membership-auth] logout started");

    try {
      const { error } = await withAuthTimeout(() => supabase.auth.signOut());
      if (import.meta.env.DEV) console.log("[membership-auth] logout resolved");
      if (!isMountedRef.current) return;
      if (error) {
        setErrorMessage(translateSupabaseAuthError(error));
      }
    } catch (err) {
      if (import.meta.env.DEV) console.log("[membership-auth] logout timeout-or-rejected");
      if (!isMountedRef.current) return;
      setErrorMessage(translateSupabaseAuthError(err));
    } finally {
      if (isMountedRef.current) {
        setSigningOut(false);
      }
      if (import.meta.env.DEV) console.log("[membership-auth] logout finished");
    }
  }

  return (
    <div className="card-light membership-checkout-account">
      <p className="label-text" style={{ color: "rgba(11,11,13,0.6)" }}>
        Cuenta
      </p>
      <p className="membership-checkout-account__email">{email}</p>
      <button
        type="button"
        className="membership-checkout-account__switch"
        onClick={handleUseAnotherAccount}
        disabled={signingOut}
        aria-busy={signingOut}
      >
        {signingOut ? "Cerrando sesión…" : "Usar otra cuenta"}
      </button>
      {errorMessage ? (
        <p className="form-status form-status--error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
