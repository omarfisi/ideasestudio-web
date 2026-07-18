/**
 * orderPaymentState.js
 *
 * Pure helpers for classifying an order's payment state on the customer-
 * facing "Mi cuenta" pages (AccountOrderDetailPage, AccountOrderPaymentPage,
 * the cart's empty state). No React, no API calls — takes a plain order
 * object in, returns a plain classification out.
 */

/**
 * Classifies an order into exactly one payment-action state, driving what
 * the order-detail page shows (badge, CTA, message). Reads both
 * order.status and order.payment_status since either can carry a terminal
 * value (cancelled/refunded) depending on where the order came from.
 */
export function getOrderPaymentAction(order) {
  const status = String(order?.status || "").toLowerCase();
  const paymentStatus = String(order?.payment_status || "").toLowerCase();
  const bookingStatus = String(order?.booking_status || "").toLowerCase();

  if (paymentStatus === "paid" || status === "paid") {
    return { kind: "paid", badgeLabel: "Pagada", ctaLabel: null, message: null };
  }

  if (["cancelled", "canceled"].includes(status) || ["cancelled", "canceled"].includes(paymentStatus)) {
    return { kind: "cancelled", badgeLabel: "Cancelada", ctaLabel: null, message: null };
  }

  if (status === "refunded" || paymentStatus === "refunded") {
    return { kind: "refunded", badgeLabel: "Reembolsada", ctaLabel: null, message: null };
  }

  if (paymentStatus === "payment_review_required") {
    return {
      kind: "review_required",
      badgeLabel: "En revisión",
      ctaLabel: null,
      message: "Tu pago necesita revisión. Comunícate con nosotros para continuar.",
    };
  }

  if (paymentStatus === "deposit_paid") {
    // The balance-payment flow doesn't exist yet on the backend (see
    // order_deposit_already_paid) — showing a CTA here would lead to a
    // guaranteed error, so this state has none, same as paid/cancelled.
    return { kind: "deposit_paid", badgeLabel: "Depósito pagado", ctaLabel: null, message: null };
  }

  // Checked before payable/retryable and driven by the backend's own
  // booking_status (server-computed from hold_expires_at, never a date
  // the frontend recalculates itself) — an expired hold means paying would
  // just fail with booking_hold_expired_restart_checkout, so "Completar
  // pago" must never be offered here; the fix is picking a new slot first.
  if (bookingStatus === "expired") {
    return {
      kind: "booking_expired",
      badgeLabel: "Horario pendiente",
      ctaLabel: "Seleccionar nueva fecha",
      message: "La reserva anterior expiró antes de completarse el pago.",
    };
  }

  if (paymentStatus === "failed") {
    return { kind: "retryable", badgeLabel: "Pago fallido", ctaLabel: "Intentar pago nuevamente", message: null };
  }

  if (["pending", "pending_payment", "authorized"].includes(paymentStatus)) {
    return { kind: "payable", badgeLabel: "Pago pendiente", ctaLabel: "Completar pago", message: null };
  }

  return {
    kind: "not_payable",
    badgeLabel: "No disponible",
    ctaLabel: null,
    message: "Esta orden ya no acepta pagos.",
  };
}

/** Whether this order currently has an actionable "pay now" CTA. */
export function isOrderPayable(order) {
  const action = getOrderPaymentAction(order);
  return action.kind === "payable" || action.kind === "retryable";
}

/**
 * Broader than isOrderPayable — also true for an expired-hold order, which
 * can't be paid yet but still has a real next step (reschedule, then pay).
 * Used by the cart's empty-state nudge so that case still points the
 * customer at their order instead of silently falling back to "Ir a
 * servicios" as if nothing were pending.
 */
export function hasPendingOrderAction(order) {
  const action = getOrderPaymentAction(order);
  return ["payable", "retryable", "booking_expired"].includes(action.kind);
}

const ORDER_PAYMENT_ERROR_MESSAGES = {
  store_order_not_found: "No encontramos esta orden.",
  order_already_paid: "Esta orden ya fue pagada.",
  order_not_payable: "Esta orden ya no acepta pagos.",
  order_deposit_already_paid: "El depósito de esta orden ya fue pagado.",
  order_requires_manual_review: "Este pago necesita revisión antes de continuar.",
  payment_review_required: "Este pago necesita revisión antes de continuar.",
  order_amount_due_now_is_zero: "No hay ningún monto pendiente por pagar en esta orden.",
  unsupported_currency: "No pudimos preparar el pago para esta orden.",
  store_provider_not_supported: "No pudimos preparar el pago para esta orden.",
  auth_required: "Inicia sesión para continuar.",
  customer_contact_not_found: "No encontramos esta orden.",
  order_not_reschedulable: "Esta orden no tiene una reserva de horario que se pueda reprogramar.",
  booking_hold_expired_restart_checkout:
    "Tu reserva de horario expiró. Selecciona nuevamente una fecha disponible para continuar.",
  booking_time_slot_not_available: "Ese horario ya no está disponible. Selecciona otro.",
  order_cancel_not_allowed: "Esta orden ya no se puede cancelar.",
  order_has_completed_payment:
    "Esta orden ya tiene un pago registrado. Contacta a Ideas Estudio para solicitar asistencia.",
  payment_cancellation_failed: "No pudimos cancelar la orden en este momento. Inténtalo nuevamente.",
};

/**
 * Maps a raw backend error code (or a generic JS/network error) to a short,
 * user-facing Spanish message — never lets a technical code like
 * store_order_not_found or payment_review_required reach the screen as-is.
 */
export function mapOrderPaymentErrorMessage(code) {
  if (code && ORDER_PAYMENT_ERROR_MESSAGES[code]) {
    return ORDER_PAYMENT_ERROR_MESSAGES[code];
  }
  return "No pudimos conectar con el sistema de pagos. Intenta nuevamente.";
}

// Retrying preparePaymentSession() for any of these can never succeed on
// its own — each needs a different action (reschedule, contact support, or
// nothing at all since the order is already in a terminal state) — so the
// generic "Intentar nuevamente" button must never appear for them.
const NON_RETRYABLE_ERROR_CODES = [
  "booking_hold_expired_restart_checkout",
  "payment_review_required",
  "order_requires_manual_review",
  "order_already_paid",
  "order_not_payable",
  "order_deposit_already_paid",
];

/**
 * Classifies a payment-session error code into a recovery action for
 * AccountOrderPaymentPage — separate from mapOrderPaymentErrorMessage
 * because some codes (booking_hold_expired_restart_checkout above all)
 * need a distinct visual treatment and a real recovery CTA, not just a
 * translated error string next to a doomed "Intentar nuevamente" button.
 */
export function getOrderPaymentRecoveryAction(errorCode) {
  if (errorCode === "booking_hold_expired_restart_checkout") {
    return {
      kind: "booking_expired",
      title: "Tu reserva de horario expiró",
      message:
        "Por seguridad, la fecha y hora se reservaron temporalmente mientras completabas el pago. " +
        "Selecciona nuevamente una fecha disponible para continuar.",
      primaryLabel: "Seleccionar nueva fecha",
      retryAllowed: false,
    };
  }

  return {
    kind: NON_RETRYABLE_ERROR_CODES.includes(errorCode) ? "blocked" : "generic",
    title: null,
    message: mapOrderPaymentErrorMessage(errorCode),
    primaryLabel: null,
    retryAllowed: !NON_RETRYABLE_ERROR_CODES.includes(errorCode),
  };
}
