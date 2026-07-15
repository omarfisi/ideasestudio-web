import { Check } from "lucide-react";
import {
  STEP_LABELS,
  canNavigateToStep,
  getStepVisualState,
} from "@/lib/bookingCheckoutSteps.js";

/**
 * Guided checkout stepper. Renders only the steps this cart actually needs
 * (schedule/customize appear only when the cart requires them) plus an
 * optional trailing display-only "Confirmación" pill for non-booking carts.
 * Clicking a step only navigates when canNavigateToStep() allows it —
 * going back is always allowed, going forward requires the steps in
 * between to be complete.
 */
export default function BookingStepper({
  steps,
  activeIndex,
  ctx,
  onStepClick,
  showConfirmationPill = false,
  confirmed = false,
}) {
  return (
    <nav className="booking-stepper" aria-label="Progreso del checkout">
      <ol className="booking-stepper__list">
        {steps.map((stepKey, index) => {
          const state = getStepVisualState(stepKey, index, activeIndex, ctx);
          const clickable = canNavigateToStep(index, { steps, activeIndex, ctx });

          return (
            <li key={stepKey} className={`booking-stepper__item is-${state}`}>
              <button
                type="button"
                className="booking-stepper__btn"
                onClick={() => clickable && onStepClick(index)}
                disabled={!clickable}
                aria-current={state === "active" ? "step" : undefined}
              >
                <span className="booking-stepper__marker" aria-hidden="true">
                  {state === "completed" ? <Check size={14} /> : index + 1}
                </span>
                <span className="booking-stepper__label">{STEP_LABELS[stepKey]}</span>
              </button>
            </li>
          );
        })}

        {showConfirmationPill && (
          <li className={`booking-stepper__item is-${confirmed ? "completed" : "upcoming"}`}>
            <span className="booking-stepper__btn booking-stepper__btn--static">
              <span className="booking-stepper__marker" aria-hidden="true">
                {confirmed ? <Check size={14} /> : steps.length + 1}
              </span>
              <span className="booking-stepper__label">Confirmación</span>
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}
