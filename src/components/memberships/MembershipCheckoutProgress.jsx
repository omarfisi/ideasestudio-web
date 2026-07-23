const STEPS = [
  { key: "plan", label: "Plan seleccionado" },
  { key: "cuenta", label: "Cuenta" },
  { key: "pago", label: "Pago" },
];

/**
 * Purely visual progress indicator — "Cuenta" is hardcoded as the current
 * step in this phase because there is no auth gate wired up yet (that's a
 * later phase). It never reads real auth/submit state, so it can't drift
 * out of sync with logic that doesn't exist yet.
 */
export default function MembershipCheckoutProgress({ currentStep = "cuenta" }) {
  const currentIndex = STEPS.findIndex((step) => step.key === currentStep);

  return (
    <ol className="membership-checkout-progress" aria-label="Progreso de la compra">
      {STEPS.map((step, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "pending";
        return (
          <li
            key={step.key}
            className={`membership-checkout-progress__step membership-checkout-progress__step--${state}`}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span className="membership-checkout-progress__marker">
              {state === "done" ? "✓" : index + 1}
            </span>
            <span className="membership-checkout-progress__label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
