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

/**
 * Builds the `booking_selection` field for the create-order request from the
 * `{ slug: selection }` map ServiceBookingCheckoutPanel reports through
 * onSelectionChange. Matches the shape the backend accepts: null when the
 * cart has no booking item, a single object when there's exactly one, an
 * array when there's more than one. Centralizes the null-filtering rule that
 * used to be duplicated in both CheckoutPage submit paths (CRM-form and
 * fallback-form), so both take the same selections through the same logic.
 */
export function buildBookingSelectionField(bookingSelectionsMap) {
  const selections = Object.values(bookingSelectionsMap || {}).filter(Boolean);
  if (selections.length === 0) return null;
  if (selections.length === 1) return selections[0];
  return selections;
}

/**
 * Maps a create-order (or order-by-id) response's order object to the
 * authoritative totals the UI must display post-creation. The backend
 * returns two different shapes depending on the endpoint: create-order's
 * response uses the friendly keys (contract_total/deposit_total), while
 * GET /orders/{id} returns the raw store_orders row (grand_total/
 * deposit_amount) — these fallback chains cover both without the caller
 * needing to know which endpoint produced the object.
 */
export function mapOrderTotals(rawOrder) {
  const order = rawOrder || {};
  const num = (value) => (value === null || value === undefined ? null : Number(value));

  return {
    contractTotal: num(order.contract_total ?? order.grand_total ?? order.total) ?? 0,
    amountDueNow: num(order.amount_due_now ?? order.grand_total ?? order.total) ?? 0,
    depositTotal: num(order.deposit_total ?? order.deposit_amount) ?? 0,
    balanceDue: num(order.balance_due) ?? 0,
  };
}

/**
 * GET /orders/{id} returns a generic order bundle that (as of this PR) does
 * not include amount_due_now/balance_due/deposit_total — only create-order's
 * response carries those. Refreshing an order through that endpoint (to
 * re-check payment/status before charging, or while polling after payment)
 * must never silently downgrade an already-known deposit-aware total back to
 * the full contract value. `trustedSource` is whichever normalized order
 * object last actually carried correct totals for this same order id (the
 * just-created order, or the previously-confirmed one already in state);
 * everything else about `latestOrder` (status, paymentStatus, ...) is used
 * as-is since those DO need to be fresh.
 */
export function mergeTrustedOrderTotals(latestOrder, trustedSource) {
  if (!latestOrder) return latestOrder;
  if (!trustedSource || trustedSource.id !== latestOrder.id) return latestOrder;
  return {
    ...latestOrder,
    contractTotal: trustedSource.contractTotal,
    amountDueNow: trustedSource.amountDueNow,
    depositTotal: trustedSource.depositTotal,
    balanceDue: trustedSource.balanceDue,
  };
}

/**
 * Maps a backend booking/checkout error `detail` code to a short,
 * user-facing Spanish message. Falls back to the raw detail (or a generic
 * message) for anything not in this list, so an unmapped/future backend
 * error code is never silently swallowed — it still reaches the user, just
 * without a friendlier phrasing.
 */
const BOOKING_ERROR_MESSAGES = {
  booking_selection_required: "Completa la configuración del servicio antes de continuar.",
  booking_time_slot_not_available: "Ese horario acaba de ocuparse. Selecciona otro horario.",
  booking_window_invalid: "Ese horario ya no es válido. Selecciona otra fecha y hora.",
  booking_package_invalid: "El paquete seleccionado ya no está disponible. Elige otro.",
  booking_addon_invalid: "Uno de los extras seleccionados ya no está disponible.",
  booking_currency_mismatch: "Hubo un problema con la moneda de este servicio. Intenta de nuevo.",
  booking_hold_expired: "El tiempo para completar el pago expiró. Selecciona nuevamente la fecha y hora.",
  store_order_amount_due_now_zero: "El monto a pagar quedó en cero. Revisa tu cupón o selección.",
  payment_review_required: "El pago necesita revisión. No intentes pagar nuevamente.",
  mixed_sale_modes_not_supported:
    "No puedes combinar productos de compra directa y servicios por cotización en la misma orden. Completa cada tipo por separado.",
  order_awaiting_proposal_approval:
    "Esta cotización todavía está pendiente de aprobación. Cuando sea aprobada, recibirás la factura correspondiente.",
};

export function mapBookingErrorMessage(errorCode, fallbackMessage) {
  if (errorCode && BOOKING_ERROR_MESSAGES[errorCode]) {
    return BOOKING_ERROR_MESSAGES[errorCode];
  }
  return fallbackMessage || errorCode || "No se pudo completar el checkout.";
}

/**
 * Whether a previously-selected slot is still present in a freshly-fetched
 * slots list — used to invalidate a stale selection after the customer
 * changes package/addons and availability is re-queried (a duration change
 * can make the old slot no longer fit). Compares by starts_at, which is
 * what each slot is keyed by throughout the booking panel.
 */
export function isSelectedSlotStillAvailable(selectedSlot, slots) {
  if (!selectedSlot?.starts_at) return true;
  return (slots || []).some((slot) => slot.starts_at === selectedSlot.starts_at);
}

/**
 * Pure decision function for whether the review step should auto-start
 * preparePaymentSession() (order + PaymentIntent creation). Encodes every
 * guard condition in one place so the triggering useEffect stays a thin
 * "if shouldPreparePaymentSession(...) call it" wrapper — this is what
 * actually prevents duplicate orders/PaymentIntents (React StrictMode's
 * double-invoke, re-renders, navigating back to review), since `preparation`
 * is expected to be a ref object (`{ running, completed }`) that updates
 * synchronously, unlike state.
 */
export function shouldPreparePaymentSession({
  activeStepKey,
  bookingReady,
  detailsValid,
  completedOrder,
  paymentIntent,
  preparation,
}) {
  if (activeStepKey !== "review") return false;
  if (!bookingReady) return false;
  if (!detailsValid) return false;
  if (completedOrder) return false;
  if (paymentIntent?.clientSecret) return false;
  if (preparation?.running || preparation?.completed) return false;
  return true;
}

/**
 * Decides what preparePaymentSession() does right after create-order
 * resolves (or is reused from a prior call) — continue toward Stripe
 * (ensureOrderPayable + ensurePaymentIntent), or skip straight to the
 * quote confirmation screen without ever touching Stripe.
 *
 * The backend's payment_required is the only source of truth — read
 * defensively (missing/non-boolean => true) so a legacy backend response
 * with no payment_required field at all keeps following the existing
 * compra-directa path, never accidentally skipping payment.
 */
export function resolveCheckoutOutcome(quoteResult) {
  const paymentRequired =
    typeof quoteResult?.paymentRequired === "boolean" ? quoteResult.paymentRequired : true;

  if (paymentRequired) {
    return { type: "continue_to_payment" };
  }

  return {
    type: "quote_confirmation",
    saleMode: quoteResult?.saleMode ?? null,
    proposalId: quoteResult?.proposalId ?? null,
    customerName: quoteResult?.customerName ?? null,
  };
}

/**
 * payment_review_required means the payment already reached Stripe/the
 * backend and needs manual review — retrying (automatically or via a
 * button) could create a second attempt against a payment that's still
 * being sorted out, so it must stay permanently blocked.
 *
 * mixed_sale_modes_not_supported and order_awaiting_proposal_approval are
 * also blocked: retrying the same request changes nothing — the cart
 * composition (mixed modes) or the CRM approval state (awaiting approval)
 * has to change first, not the request itself.
 */
export function isRetryBlocked(errorCode) {
  return (
    errorCode === "payment_review_required" ||
    errorCode === "mixed_sale_modes_not_supported" ||
    errorCode === "order_awaiting_proposal_approval"
  );
}

/**
 * These two error codes mean the previously-selected slot is no longer
 * usable (someone else booked it, or the hold expired) — the fix isn't
 * "retry the same request", it's "go pick a different slot", so callers
 * use this to route back to the schedule step instead of showing a retry
 * button.
 */
export function isBookingConflictError(errorCode) {
  return errorCode === "booking_time_slot_not_available" || errorCode === "booking_hold_expired";
}

/**
 * Accent-insensitive, case-insensitive, whitespace-trimmed comparison key —
 * used to match a CRM-configured field's name/map_to against a fixed list of
 * known keywords (e.g. "Teléfono" / "telefono" / "TELEFONO " all normalize
 * to "telefono") regardless of how the CRM form happens to label it.
 */
export function normalizeToken(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

const PROFILE_FIELD_KEYWORDS = {
  name: ["name", "nombre", "full_name", "fullname", "customer_name", "nombre_completo"],
  email: ["email", "correo", "correo_electronico"],
  phone: ["phone", "telefono", "tel", "customer_phone", "whatsapp"],
  company: ["company", "empresa", "business_name", "negocio"],
};

/**
 * Maps a loaded customer profile ({name, email, phone, company}) onto the
 * dynamic CRM-form field names it corresponds to, by matching each field's
 * map_to/name against PROFILE_FIELD_KEYWORDS — same matching strategy
 * CheckoutPage.jsx already uses for the phone-placeholder override, so it
 * stays correct if the CRM form ever renames/reorders its fields.
 *
 * Only returns entries for fields that (a) matched a known profile
 * attribute and (b) that attribute has a non-empty value on the profile.
 * Callers are responsible for not overwriting a value the customer already
 * typed — this function only decides *where* each profile value would go,
 * not whether it's safe to apply.
 */
export function mapProfileToCrmFieldValues(crmFields, profile) {
  const result = {};
  if (!profile || !Array.isArray(crmFields)) return result;

  for (const field of crmFields) {
    const token = normalizeToken(field?.map_to || field?.name);
    const matchedKey = Object.keys(PROFILE_FIELD_KEYWORDS).find((key) =>
      PROFILE_FIELD_KEYWORDS[key].includes(token)
    );
    if (matchedKey && profile[matchedKey]) {
      result[field.name] = profile[matchedKey];
    }
  }

  return result;
}

/**
 * Merges profile-sourced values into the current form values object without
 * ever overwriting a value the customer already has (typed, or already
 * defaulted from elsewhere) — the whole point of "no sobrescribir datos que
 * el usuario ya comenzó a escribir". A value counts as "already present" if
 * it's a non-empty, non-whitespace-only string.
 */
export function mergeProfileValuesWithoutOverwrite(currentValues, profileValues) {
  const merged = { ...currentValues };
  for (const [key, value] of Object.entries(profileValues || {})) {
    const existing = merged[key];
    if (existing === undefined || existing === null || String(existing).trim() === "") {
      merged[key] = value;
    }
  }
  return merged;
}
