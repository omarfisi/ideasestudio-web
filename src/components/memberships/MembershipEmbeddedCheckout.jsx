import { useEffect, useRef, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripeClient.js";
import { createMembershipCheckoutSession } from "@/lib/api.js";
import { dedupeByKey } from "@/lib/authenticatedApi.js";
import { clearMembershipCheckoutSelection } from "@/lib/membershipCheckoutSession.js";
import { translateCheckoutError } from "@/lib/membershipCheckoutErrors.js";

/**
 * Mounts Stripe's own Embedded Checkout inside the Ideas Estudio page —
 * the customer never navigates to checkout.stripe.com. Requests exactly
 * one Checkout Session (deduped under StrictMode via dedupeByKey, same
 * pattern already used by MembershipAuthenticatedAccount) and keeps its
 * client_secret only in this component's own React state — never
 * sessionStorage/localStorage, never logged, never passed back up to a
 * parent that might persist it.
 *
 * Rollback path: if the backend responds checkout_ui_mode="hosted"
 * (MEMBERSHIP_CHECKOUT_UI_MODE=hosted server-side), this redirects via
 * window.location.assign exactly like the pre-Embedded-Checkout flow
 * used to — the only place that behavior still exists.
 */
export default function MembershipEmbeddedCheckout({
  userId,
  membershipPlanId,
  serviceId,
  customerEmail,
  customerName,
  onError,
}) {
  const [state, setState] = useState({ status: "loading", clientSecret: null });
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading", clientSecret: null });
      try {
        const result = await dedupeByKey(
          `membership-embedded-checkout:${userId}:${membershipPlanId}:${serviceId}`,
          () =>
            createMembershipCheckoutSession({
              membershipPlanId,
              serviceId,
              customerEmail,
              customerName,
            })
        );
        if (cancelled) return;

        if (result.checkout_ui_mode === "hosted") {
          // Rollback flag active server-side — same redirect the app
          // used before Embedded Checkout existed.
          clearMembershipCheckoutSelection();
          window.location.assign(result.session_url);
          return;
        }

        setState({ status: "ready", clientSecret: result.client_secret });
      } catch (error) {
        if (cancelled) return;
        setState({ status: "error", clientSecret: null });
        onErrorRef.current?.(translateCheckoutError(error));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, membershipPlanId, serviceId, customerEmail, customerName]);

  if (state.status === "error") {
    // The parent already surfaces the error (via onError → submitState)
    // and lets the visitor retry from the ordinary form — nothing to
    // render here.
    return null;
  }

  if (state.status !== "ready" || !state.clientSecret) {
    return (
      <div className="card-light membership-checkout-panel" aria-busy="true">
        <p className="body-md">Preparando el pago seguro…</p>
      </div>
    );
  }

  return (
    <div className="card-light membership-checkout-panel membership-embedded-checkout">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret: state.clientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
