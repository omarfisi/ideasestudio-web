import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import { useAuth } from "@/contexts/AuthContext.jsx";
import MembershipCheckoutHero from "@/components/memberships/MembershipCheckoutHero.jsx";
import MembershipCheckoutProgress from "@/components/memberships/MembershipCheckoutProgress.jsx";
import MembershipPlanSummary from "@/components/memberships/MembershipPlanSummary.jsx";
import MembershipAuthGate from "@/components/memberships/MembershipAuthGate.jsx";
import MembershipAuthenticatedAccount from "@/components/memberships/MembershipAuthenticatedAccount.jsx";
import MembershipCustomerPanel from "@/components/memberships/MembershipCustomerPanel.jsx";
import MembershipCheckoutTrust from "@/components/memberships/MembershipCheckoutTrust.jsx";
import {
  createMembershipCheckoutSession,
  getMembershipPlanSelection,
} from "@/lib/api.js";
import {
  saveMembershipCheckoutSelection,
  readMembershipCheckoutSelection,
  clearMembershipCheckoutSelection,
} from "@/lib/membershipCheckoutSession.js";
import { translateCheckoutError } from "@/lib/membershipCheckoutErrors.js";

/**
 * Dedicated membership subscription checkout — deliberately NOT the
 * store's general cart/checkout (CartPage.jsx / CheckoutPage.jsx). A
 * membership plan is billed as a recurring Stripe Subscription, never a
 * one-time PaymentIntent, so this never touches store_carts/store_orders
 * and never navigates through /servicios/checkout.
 *
 * membershipPlanId/serviceId arrive via router navigation `state` from
 * ServiceMembershipPlansModal — but that state is never trusted by
 * itself: on mount this always re-fetches the authoritative selection
 * (name/price/trial/benefits/service) from the backend, which re-runs
 * every validation (plan public/active, service linked/active) from
 * scratch. When `state` is empty (a reload, or a magic-link/signup
 * redirect landing back here), the ids fall back to sessionStorage —
 * never the plan's price/benefits/trial, only the two ids — and still go
 * through that same backend re-validation before anything renders.
 *
 * Fase 2 — auth gate: createMembershipCheckoutSession only ever runs with
 * a real Supabase session in hand, and customer_email is always
 * session.user.email (never a free-typed field) — the backend does not
 * verify a JWT for this endpoint yet, so this is a frontend-only gate.
 * Sending Authorization: Bearer <access_token> and verifying it
 * server-side, deriving auth_user_id, and linking it to contacts.user_id
 * are Fase 3 — deliberately not done here.
 */
export default function MembershipCheckoutPage() {
  const location = useLocation();
  const { session, loading: authLoading } = useAuth();

  const stateMembershipPlanId = location.state?.membershipPlanId || null;
  const stateServiceId = location.state?.serviceId || null;
  const hasStateIds = Boolean(stateMembershipPlanId && stateServiceId);
  const storedIds = hasStateIds ? null : readMembershipCheckoutSelection();

  const membershipPlanId = stateMembershipPlanId || storedIds?.membershipPlanId || null;
  const serviceId = stateServiceId || storedIds?.serviceId || null;
  const hasSelectionIds = Boolean(membershipPlanId && serviceId);

  const [status, setStatus] = useState(hasSelectionIds ? "loading" : "missing_selection");
  const [selection, setSelection] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [submitState, setSubmitState] = useState({ status: "idle", message: "" });

  useEffect(() => {
    if (!hasSelectionIds) {
      return;
    }

    saveMembershipCheckoutSelection({ membershipPlanId, serviceId });

    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const data = await getMembershipPlanSelection({ membershipPlanId, serviceId });
        if (cancelled) return;
        setSelection(data);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        clearMembershipCheckoutSelection();
        setStatus("error");
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [hasSelectionIds, membershipPlanId, serviceId]);

  const effectiveStatus = hasSelectionIds ? status : "missing_selection";

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selection || submitState.status === "loading") return;

    const customerEmail = session?.user?.email;
    if (!customerEmail) {
      setSubmitState({
        status: "error",
        message: "Tu sesión no es válida o expiró. Vuelve a iniciar sesión.",
      });
      return;
    }

    setSubmitState({ status: "loading", message: "" });

    try {
      const origin = window.location.origin;
      const checkoutSession = await createMembershipCheckoutSession({
        membershipPlanId: selection.plan.id,
        serviceId: selection.service.id,
        customerEmail,
        customerName,
        successUrl: `${origin}/membresias/checkout/exito?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/membresias/checkout/cancelado`,
      });
      clearMembershipCheckoutSelection();
      window.location.assign(checkoutSession.session_url);
    } catch (error) {
      setSubmitState({ status: "error", message: translateCheckoutError(error) });
    }
  }

  if (effectiveStatus === "missing_selection") {
    return (
      <>
        <MembershipCheckoutHero status="missing_selection" />
        <section className="section">
          <div className="container">
            <div className="empty-state">
              <Button to="/servicios">Ver servicios</Button>
            </div>
          </div>
        </section>
      </>
    );
  }

  if (effectiveStatus === "loading") {
    return (
      <>
        <MembershipCheckoutHero status="loading" />
        <section className="section">
          <div className="container">
            <p className="body-md">Un momento…</p>
          </div>
        </section>
      </>
    );
  }

  if (effectiveStatus === "error") {
    return (
      <>
        <MembershipCheckoutHero status="error" />
        <section className="section">
          <div className="container">
            <div className="empty-state">
              <Button to="/servicios">Volver a servicios</Button>
            </div>
          </div>
        </section>
      </>
    );
  }

  const { plan, service } = selection;
  const progressStep = session ? "pago" : "cuenta";

  return (
    <>
      <MembershipCheckoutHero status="ready" />

      <section className="section">
        <div className="container">
          <MembershipCheckoutProgress currentStep={progressStep} />

          <div className="membership-checkout">
            <div className="membership-checkout__summary-col">
              <MembershipPlanSummary plan={plan} service={service} />
            </div>
            <div className="membership-checkout__panel-col">
              {authLoading ? (
                <div className="card-light membership-checkout-authgate" aria-busy="true">
                  <p className="body-md">Verificando tu sesión…</p>
                </div>
              ) : !session ? (
                <MembershipAuthGate />
              ) : (
                <>
                  <MembershipAuthenticatedAccount email={session.user.email} />
                  <MembershipCustomerPanel
                    customerName={customerName}
                    onNameChange={setCustomerName}
                    onSubmit={handleSubmit}
                    submitState={submitState}
                  />
                </>
              )}
              <MembershipCheckoutTrust />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
