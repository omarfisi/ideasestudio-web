// A single Stripe statement (not two overlapping ones), and a neutral
// renewal claim — this component never receives billing_interval, so it
// must never assert "mensual" when a plan could just as well be anual
// (see MembershipPlanSummary's own precise renewalCopy for that detail).
const TRUST_ITEMS = [
  "Stripe procesa tu pago de forma segura.",
  "Renovación automática según las condiciones del plan.",
  "Cancelación sujeta a las condiciones de tu plan.",
];

export default function MembershipCheckoutTrust() {
  return (
    <ul className="list-ideas membership-checkout-trust">
      {TRUST_ITEMS.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
