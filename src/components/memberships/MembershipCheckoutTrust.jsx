const TRUST_ITEMS = [
  "Pago seguro procesado por Stripe.",
  "Renovación mensual automática mientras la membresía esté activa.",
  "Cancelación sujeta a las condiciones de tu plan.",
  "Stripe procesa tus datos de pago de forma segura.",
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
