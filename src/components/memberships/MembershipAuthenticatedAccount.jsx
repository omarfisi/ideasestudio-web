import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient.js";
import { translateSupabaseAuthError } from "@/lib/membershipAuthErrors.js";
import { withAuthTimeout } from "@/lib/authRequestTimeout.js";
import { dedupeByKey, resolveCustomerProfile } from "@/lib/authenticatedApi.js";
import { classifyProfileError, translateProfileError } from "@/lib/membershipProfileErrors.js";

/**
 * Identity strip shown once a Supabase session exists. "Usar otra cuenta"
 * only triggers signOut() — AuthContext's onAuthStateChange subscription
 * (already wired app-wide) is what actually flips the checkout page back
 * to the auth gate on success, so there is nothing else to coordinate
 * here. If signOut() itself errors or times out, the session likely never
 * changed — this surfaces that explicitly rather than leaving the visitor
 * thinking the switch happened. Never touches sessionStorage either way,
 * so the plan selection survives regardless of outcome.
 *
 * Fase 3 — also owns resolving the authenticated customer's CRM contact
 * (POST /public/customer-profile/resolve) right after a session appears.
 * Reports its outcome via onProfileStatusChange("resolving"|"ready"|
 * "conflict"|"error") so MembershipCheckoutPage/MembershipCustomerPanel can
 * gate the "Continuar al pago seguro" button on it — checkout must never
 * proceed before the contact is actually linked. dedupeByKey (keyed by
 * email) shares the same in-flight promise across React StrictMode's dev
 * mount→cleanup→remount simulation, so that never sends two real POSTs.
 */
export default function MembershipAuthenticatedAccount({ email, onProfileStatusChange }) {
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [profileState, setProfileState] = useState({ status: "resolving", message: "" });
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

  function reportStatus(status, message = "") {
    setProfileState({ status, message });
    onProfileStatusChange?.(status);
  }

  async function runResolveProfile() {
    reportStatus("resolving");
    try {
      await dedupeByKey(`membership-profile-resolve:${email}`, () => resolveCustomerProfile());
      if (!isMountedRef.current) return;
      reportStatus("ready");
    } catch (error) {
      if (!isMountedRef.current) return;
      const classified = classifyProfileError(error);
      reportStatus(classified === "conflict" ? "conflict" : "error", translateProfileError(error));
    }
  }

  useEffect(() => {
    runResolveProfile();
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

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

      {profileState.status === "resolving" ? (
        <p className="body-md membership-checkout-account__profile-status" aria-busy="true">
          Vinculando tu cuenta…
        </p>
      ) : profileState.status === "ready" ? (
        <p className="body-md membership-checkout-account__profile-status membership-checkout-account__profile-status--ok">
          Cuenta vinculada.
        </p>
      ) : (
        <div className="form-status form-status--error" role="alert">
          <p>{profileState.message}</p>
          {profileState.status === "error" ? (
            <button
              type="button"
              className="membership-checkout-account__retry"
              onClick={runResolveProfile}
            >
              Reintentar
            </button>
          ) : null}
        </div>
      )}

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
