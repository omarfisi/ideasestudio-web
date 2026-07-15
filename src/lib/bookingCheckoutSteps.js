/**
 * bookingCheckoutSteps.js
 *
 * Pure helpers for the guided booking checkout stepper. No React, no API
 * calls, no side effects — everything here takes plain data in and returns
 * plain data out, so the stepper's rules (which steps exist, when a step is
 * complete, when navigation is allowed) can be reasoned about and tested in
 * isolation from ServiceBookingCheckoutPanel / CheckoutPage.
 */

export const STEP_LABELS = {
  schedule: "Fecha y hora",
  customize: "Personaliza",
  details: "Tus datos",
  review: "Revisar y pagar",
};

/**
 * Aggregates the per-service booking status reported by each
 * ServiceBookingSection into a single status object the checkout page can
 * act on. `itemStatuses` only contains entries for items that have actually
 * resolved (successfully, with a booking error, or with no booking
 * capability); `totalExpectedCount` is the total number of cart items, used
 * to detect when discovery is still in progress.
 *
 * An item that failed to resolve at all (no slug could be found for it)
 * must be reported with `resolutionError: true` — it is NOT the same as a
 * confirmed non-booking item. Treating a resolution failure as "no booking"
 * would let a cart that actually needed a date slip through unchecked, so
 * any resolutionError forces hasBooking/scheduleComplete to stay false and
 * surfaces the failure via `resolutionErrors` for the caller to block on.
 */
export function aggregateBookingStatus(itemStatuses, totalExpectedCount) {
  const resolved = itemStatuses.filter((item) => item?.resolved);
  const status = resolved.length >= totalExpectedCount && totalExpectedCount > 0
    ? "ready"
    : totalExpectedCount === 0
    ? "ready"
    : "loading";

  const resolutionErrors = itemStatuses.filter((item) => item?.resolutionError);
  const hasResolutionError = resolutionErrors.length > 0;

  const okItems = resolved.filter((item) => !item.resolutionError);
  const bookingItems = okItems.filter(
    (item) => item.hasCalendar || item.hasPackages || item.hasAddons
  );

  const hasBooking = !hasResolutionError && bookingItems.length > 0;
  const requiresCalendar = !hasResolutionError && bookingItems.some((item) => item.hasCalendar);
  const hasCustomization =
    !hasResolutionError && bookingItems.some((item) => item.hasPackages || item.hasAddons);

  const calendarItems = bookingItems.filter((item) => item.hasCalendar);
  const customizableItems = bookingItems.filter(
    (item) => item.hasPackages || item.hasAddons
  );

  const scheduleComplete =
    status === "ready" &&
    !hasResolutionError &&
    calendarItems.every((item) => item.scheduleComplete);
  const customizationComplete =
    status === "ready" &&
    !hasResolutionError &&
    customizableItems.every((item) => item.customizationComplete !== false);

  return {
    status,
    hasBooking,
    requiresCalendar,
    hasCustomization,
    scheduleComplete,
    customizationComplete,
    services: itemStatuses,
    resolutionErrors,
  };
}

/**
 * Builds the ordered list of step keys for this cart's real capabilities.
 * "schedule" and "customize" only appear when the cart actually needs them —
 * never as decorative/empty steps.
 */
export function buildSteps({ requiresCalendar, hasCustomization }) {
  const steps = [];
  if (requiresCalendar) steps.push("schedule");
  if (hasCustomization) steps.push("customize");
  steps.push("details");
  steps.push("review");
  return steps;
}

/**
 * Whether a given step's own requirement is satisfied, given the current
 * checkout context. "review" has no completion state of its own — it's the
 * terminal step where the order/payment happen.
 */
export function isStepComplete(stepKey, ctx) {
  switch (stepKey) {
    case "schedule":
      return Boolean(ctx?.scheduleComplete);
    case "customize":
      return Boolean(ctx?.customizationComplete);
    case "details":
      return Boolean(ctx?.detailsValid);
    case "review":
      return false;
    default:
      return false;
  }
}

/**
 * Highest step index reachable given which earlier steps are complete.
 * Scans from the start and stops at the first incomplete step.
 */
export function computeMaxReachableIndex(steps, ctx) {
  let max = 0;
  for (let i = 0; i < steps.length - 1; i += 1) {
    if (isStepComplete(steps[i], ctx)) {
      max = i + 1;
    } else {
      break;
    }
  }
  return max;
}

/**
 * Whether clicking step `targetIndex` in the stepper should be allowed.
 * Going back (or clicking the active step) is always allowed and never
 * discards data. Going forward is only allowed through already-completed
 * steps.
 */
export function canNavigateToStep(targetIndex, { steps, activeIndex, ctx }) {
  if (targetIndex === activeIndex) return true;
  if (targetIndex < activeIndex) return true;
  return targetIndex <= computeMaxReachableIndex(steps, ctx);
}

/**
 * Per-step visual state for rendering the stepper pills.
 */
export function getStepVisualState(stepKey, index, activeIndex, ctx) {
  if (index === activeIndex) return "active";
  if (isStepComplete(stepKey, ctx)) return "completed";
  return "upcoming";
}
