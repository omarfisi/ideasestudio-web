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

// Only "month"/"year" are real values for plan.billing_interval (see
// MembershipBillingInterval in the backend's app/schemas/membership.py) —
// this never fabricates a recurrence claim for anything else: an
// unrecognized interval simply renders no renewal line at all.
const RENEWAL_COPY = {
  month: "Renovación automática mensual.",
  year: "Renovación automática anual.",
};

function renewalCopy(billingInterval) {
  return RENEWAL_COPY[billingInterval] || null;
}

/**
 * Left-column summary — every number here comes straight from the
 * backend-resolved `plan`/`service` (MembershipCheckoutPage always
 * re-fetches this via getMembershipPlanSelection before rendering it).
 * Never computes or overrides price/currency/trial itself.
 */
export default function MembershipPlanSummary({ plan, service }) {
  const benefits = (plan.features_json || []).filter((f) => f.label);
  const renewalText = renewalCopy(plan.billing_interval);

  return (
    <div className="card-light membership-checkout-summary">
      <p className="label-text" style={{ color: "rgba(11,11,13,0.6)" }}>
        Plan
      </p>
      <h2 className="membership-checkout-summary__plan-name">{plan.name}</h2>

      <p className="label-text mt-4" style={{ color: "rgba(11,11,13,0.6)" }}>
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
      {renewalText ? <p className="membership-checkout-summary__renewal">{renewalText}</p> : null}

      {plan.trial_period_days > 0 ? (
        <p className="label-text mt-3">{plan.trial_period_days} días de prueba</p>
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
  );
}
