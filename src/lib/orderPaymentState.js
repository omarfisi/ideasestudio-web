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
