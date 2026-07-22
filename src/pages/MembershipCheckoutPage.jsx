import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import PageHero from "@/components/shared/PageHero.jsx";
import {
  createMembershipCheckoutSession,
  getMembershipPlanSelection,
} from "@/lib/api.js";
import { formatPrice } from "@/lib/formatPrice.js";

const PERIOD_LABELS = {
  month: "mes",
  week: "semana",
  project: "proyecto",
  piece: "pieza",
  session: "sesión",
  unlimited: "ilimitado",
};

function translatePeriod(period) {
  if (!period) return "";
  return PERIOD_LABELS[period] || period;
}

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
    if (!selection) return;

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
        <PageHero
          eyebrow="Membresías"
          title="Selecciona un plan primero"
          subtitle="Vuelve al servicio y elige un plan desde 'Conocer planes' para continuar."
        />
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
        <PageHero eyebrow="Membresías" title="Cargando tu plan…" />
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
        <PageHero
          eyebrow="Membresías"
          title="No pudimos cargar este plan"
          subtitle="El plan seleccionado ya no está disponible, o el servicio ya no forma parte de él."
        />
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
  const benefits = (plan.features_json || []).filter((f) => f.label);

  return (
    <>
      <PageHero eyebrow="Membresías" title={plan.name} subtitle="Revisa el resumen antes de continuar al pago seguro." />

      <section className="section">
        <div className="container membership-checkout">
          <div className="card-light membership-checkout__summary">
            <p className="label-text" style={{ color: "rgba(11,11,13,0.6)" }}>
              Servicio
            </p>
            <p className="body-md" style={{ fontWeight: 600 }}>
              {service.name}
            </p>

            <div className="mt-4 flex items-baseline gap-1">
              <span style={{ fontFamily: "Manrope, sans-serif", fontWeight: 900, fontSize: "32px" }}>
                {formatPrice(plan.price, plan.currency)}
              </span>
              <span className="body-md" style={{ color: "rgba(11,11,13,0.6)" }}>
                /{translatePeriod(plan.billing_interval)}
              </span>
            </div>

            {plan.trial_period_days > 0 ? (
              <p className="label-text mt-2">{plan.trial_period_days} días de prueba</p>
            ) : null}

            {benefits.length > 0 ? (
              <div className="mt-4">
                <p className="label-text mb-2" style={{ color: "var(--ideas-black)" }}>
                  Beneficios principales
                </p>
                <ul className="list-ideas">
                  {benefits.map((benefit) => (
                    <li key={benefit.key || benefit.label}>
                      {benefit.label}
                      {benefit.quantity != null ? ` (${Number(benefit.quantity).toLocaleString("es-PR")})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <form className="card-light membership-checkout__form" onSubmit={handleSubmit}>
            <p className="label-text mb-4" style={{ color: "var(--ideas-black)" }}>
              Datos del cliente
            </p>

            <label className="membership-checkout__field">
              <span>Correo electrónico</span>
              <input
                type="email"
                required
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                disabled={submitState.status === "loading"}
                placeholder="tu@correo.com"
              />
            </label>

            <label className="membership-checkout__field">
              <span>Nombre (opcional)</span>
              <input
                type="text"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                disabled={submitState.status === "loading"}
                placeholder="Tu nombre"
              />
            </label>

            <Button type="submit" disabled={submitState.status === "loading"} block>
              {submitState.status === "loading" ? "Redirigiendo…" : "Continuar al pago seguro"}
            </Button>

            {submitState.status === "error" ? (
              <p className="form-status form-status--error" role="alert">
                {submitState.message}
              </p>
            ) : null}
          </form>
        </div>
      </section>
    </>
  );
}
