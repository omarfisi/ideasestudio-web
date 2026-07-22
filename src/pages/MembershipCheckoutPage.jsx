import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import MembershipCheckoutHero from "@/components/memberships/MembershipCheckoutHero.jsx";
import MembershipCheckoutProgress from "@/components/memberships/MembershipCheckoutProgress.jsx";
import MembershipPlanSummary from "@/components/memberships/MembershipPlanSummary.jsx";
import MembershipCustomerPanel from "@/components/memberships/MembershipCustomerPanel.jsx";
import MembershipCheckoutTrust from "@/components/memberships/MembershipCheckoutTrust.jsx";
import {
  createMembershipCheckoutSession,
  getMembershipPlanSelection,
} from "@/lib/api.js";

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
 * scratch.
 */
export default function MembershipCheckoutPage() {
  const location = useLocation();
  const membershipPlanId = location.state?.membershipPlanId || null;
  const serviceId = location.state?.serviceId || null;

  const hasSelectionIds = Boolean(membershipPlanId && serviceId);
  const [status, setStatus] = useState(hasSelectionIds ? "loading" : "missing_selection");
  const [selection, setSelection] = useState(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [submitState, setSubmitState] = useState({ status: "idle", message: "" });

  useEffect(() => {
    if (!hasSelectionIds) {
      return;
    }

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

    setSubmitState({ status: "loading", message: "" });

    try {
      const origin = window.location.origin;
      const session = await createMembershipCheckoutSession({
        membershipPlanId: selection.plan.id,
        serviceId: selection.service.id,
        customerEmail,
        customerName,
        successUrl: `${origin}/membresias/checkout/exito?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/membresias/checkout/cancelado`,
      });
      window.location.assign(session.session_url);
    } catch (error) {
      setSubmitState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No pudimos iniciar el pago seguro. Intenta nuevamente.",
      });
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

  return (
    <>
      <MembershipCheckoutHero status="ready" />

      <section className="section">
        <div className="container">
          <MembershipCheckoutProgress currentStep="cuenta" />

          <div className="membership-checkout">
            <div className="membership-checkout__summary-col">
              <MembershipPlanSummary plan={plan} service={service} />
            </div>
            <div className="membership-checkout__panel-col">
              <MembershipCustomerPanel
                customerEmail={customerEmail}
                customerName={customerName}
                onEmailChange={setCustomerEmail}
                onNameChange={setCustomerName}
                onSubmit={handleSubmit}
                submitState={submitState}
              />
              <MembershipCheckoutTrust />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
