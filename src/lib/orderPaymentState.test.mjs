/**
 * Pure Node test runner for orderPaymentState.js — no framework, no DOM.
 * Run with: node src/lib/orderPaymentState.test.mjs
 */
import assert from "node:assert/strict";
import {
  getOrderPaymentAction,
  isOrderPayable,
  hasPendingOrderAction,
  mapOrderPaymentErrorMessage,
  getOrderPaymentRecoveryAction,
  canCustomerCancelOrder,
} from "./orderPaymentState.js";

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok   - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

/* ── getOrderPaymentAction ─────────────────────────────────────────────── */
test("getOrderPaymentAction: pago pendiente y pagable muestra Completar pago", () => {
  const action = getOrderPaymentAction({ status: "pending", payment_status: "pending" });
  assert.equal(action.kind, "payable");
  assert.equal(action.ctaLabel, "Completar pago");
});

test("getOrderPaymentAction: pending_payment tambien es pagable", () => {
  const action = getOrderPaymentAction({ status: "pending", payment_status: "pending_payment" });
  assert.equal(action.kind, "payable");
});

test("getOrderPaymentAction: payment_review_required no permite reintento", () => {
  const action = getOrderPaymentAction({ status: "processing", payment_status: "payment_review_required" });
  assert.equal(action.kind, "review_required");
  assert.equal(action.ctaLabel, null);
  assert.match(action.message, /revisión/);
});

test("getOrderPaymentAction: pagada no muestra completar pago", () => {
  const action = getOrderPaymentAction({ status: "paid", payment_status: "paid" });
  assert.equal(action.kind, "paid");
  assert.equal(action.badgeLabel, "Pagada");
  assert.equal(action.ctaLabel, null);
});

test("getOrderPaymentAction: cancelada no muestra completar pago", () => {
  const action = getOrderPaymentAction({ status: "cancelled", payment_status: "pending" });
  assert.equal(action.kind, "cancelled");
  assert.equal(action.ctaLabel, null);
});

test("getOrderPaymentAction: reembolsada no muestra completar pago", () => {
  const action = getOrderPaymentAction({ status: "refunded", payment_status: "refunded" });
  assert.equal(action.kind, "refunded");
  assert.equal(action.ctaLabel, null);
});

test("getOrderPaymentAction: pago fallido pero reintentable", () => {
  const action = getOrderPaymentAction({ status: "pending", payment_status: "failed" });
  assert.equal(action.kind, "retryable");
  assert.equal(action.ctaLabel, "Intentar pago nuevamente");
});

test("getOrderPaymentAction: deposito pagado no ofrece completar pago (flujo de balance no existe aun)", () => {
  const action = getOrderPaymentAction({ status: "processing", payment_status: "deposit_paid" });
  assert.equal(action.kind, "deposit_paid");
  assert.equal(action.ctaLabel, null);
});

test("getOrderPaymentAction: estado desconocido cae en 'no pagable' con mensaje amigable, sin codigos crudos", () => {
  const action = getOrderPaymentAction({ status: "some_future_status", payment_status: "some_future_status" });
  assert.equal(action.kind, "not_payable");
  assert.equal(action.message, "Esta orden ya no acepta pagos.");
});

test("getOrderPaymentAction: orden vacia/null no revienta", () => {
  const action = getOrderPaymentAction(null);
  assert.equal(action.kind, "not_payable");
});

/* ── isOrderPayable ─────────────────────────────────────────────────────── */
test("isOrderPayable: true para pendiente y para fallido-reintentable", () => {
  assert.equal(isOrderPayable({ status: "pending", payment_status: "pending" }), true);
  assert.equal(isOrderPayable({ status: "pending", payment_status: "failed" }), true);
});

test("isOrderPayable: false para pagada, cancelada, reembolsada, en revision", () => {
  assert.equal(isOrderPayable({ status: "paid", payment_status: "paid" }), false);
  assert.equal(isOrderPayable({ status: "cancelled", payment_status: "pending" }), false);
  assert.equal(isOrderPayable({ status: "refunded", payment_status: "refunded" }), false);
  assert.equal(isOrderPayable({ status: "processing", payment_status: "payment_review_required" }), false);
});

/* ── mapOrderPaymentErrorMessage ───────────────────────────────────────── */
test("mapOrderPaymentErrorMessage: codigos tecnicos conocidos se traducen", () => {
  assert.equal(mapOrderPaymentErrorMessage("store_order_not_found"), "No encontramos esta orden.");
  assert.equal(mapOrderPaymentErrorMessage("order_already_paid"), "Esta orden ya fue pagada.");
  assert.equal(mapOrderPaymentErrorMessage("order_not_payable"), "Esta orden ya no acepta pagos.");
  assert.equal(
    mapOrderPaymentErrorMessage("order_requires_manual_review"),
    "Este pago necesita revisión antes de continuar."
  );
});

test("mapOrderPaymentErrorMessage: codigo desconocido o de red usa el mensaje generico, nunca crudo", () => {
  const msg = mapOrderPaymentErrorMessage("some_random_network_error");
  assert.equal(msg, "No pudimos conectar con el sistema de pagos. Intenta nuevamente.");
  assert.doesNotMatch(msg, /some_random_network_error/);
});

test("mapOrderPaymentErrorMessage: sin codigo tambien usa el mensaje generico", () => {
  assert.equal(
    mapOrderPaymentErrorMessage(null),
    "No pudimos conectar con el sistema de pagos. Intenta nuevamente."
  );
});

test("mapOrderPaymentErrorMessage: booking_hold_expired_restart_checkout tiene traduccion propia", () => {
  const msg = mapOrderPaymentErrorMessage("booking_hold_expired_restart_checkout");
  assert.match(msg, /reserva de horario expiró/);
  assert.doesNotMatch(msg, /booking_hold_expired_restart_checkout/);
});

/* ── getOrderPaymentAction: booking_status ─────────────────────────────── */
test("getOrderPaymentAction: booking_status=expired oculta Completar pago y ofrece reprogramar", () => {
  const action = getOrderPaymentAction({ status: "pending", payment_status: "pending", booking_status: "expired" });
  assert.equal(action.kind, "booking_expired");
  assert.equal(action.ctaLabel, "Seleccionar nueva fecha");
  assert.equal(action.badgeLabel, "Horario pendiente");
  assert.match(action.message, /reserva anterior expiró/);
});

test("getOrderPaymentAction: booking_status=active_hold permite Completar pago normalmente", () => {
  const action = getOrderPaymentAction({ status: "pending", payment_status: "pending", booking_status: "active_hold" });
  assert.equal(action.kind, "payable");
  assert.equal(action.ctaLabel, "Completar pago");
});

test("getOrderPaymentAction: orden pagada gana incluso si booking_status quedo como expired", () => {
  const action = getOrderPaymentAction({ status: "paid", payment_status: "paid", booking_status: "expired" });
  assert.equal(action.kind, "paid");
});

/* ── isOrderPayable / hasPendingOrderAction ────────────────────────────── */
test("isOrderPayable: false para reserva expirada (no se puede pagar sin reprogramar primero)", () => {
  assert.equal(isOrderPayable({ status: "pending", payment_status: "pending", booking_status: "expired" }), false);
});

test("hasPendingOrderAction: true para reserva expirada (aun requiere accion del cliente)", () => {
  assert.equal(hasPendingOrderAction({ status: "pending", payment_status: "pending", booking_status: "expired" }), true);
});

test("hasPendingOrderAction: false para pagada/cancelada, igual que isOrderPayable", () => {
  assert.equal(hasPendingOrderAction({ status: "paid", payment_status: "paid" }), false);
  assert.equal(hasPendingOrderAction({ status: "cancelled", payment_status: "pending" }), false);
});

/* ── getOrderPaymentRecoveryAction ─────────────────────────────────────── */
test("getOrderPaymentRecoveryAction: booking_hold_expired_restart_checkout bloquea reintento y da CTA de reprogramar", () => {
  const action = getOrderPaymentRecoveryAction("booking_hold_expired_restart_checkout");
  assert.equal(action.kind, "booking_expired");
  assert.equal(action.retryAllowed, false);
  assert.equal(action.primaryLabel, "Seleccionar nueva fecha");
  assert.equal(action.title, "Tu reserva de horario expiró");
});

test("getOrderPaymentRecoveryAction: codigos terminales bloquean reintento sin ofrecer reprogramar", () => {
  for (const code of [
    "payment_review_required",
    "order_requires_manual_review",
    "order_already_paid",
    "order_not_payable",
    "order_deposit_already_paid",
  ]) {
    const action = getOrderPaymentRecoveryAction(code);
    assert.equal(action.retryAllowed, false, `${code} no debe permitir reintento`);
    assert.equal(action.kind, "blocked");
  }
});

test("getOrderPaymentRecoveryAction: error generico (red, timeout) si permite Intentar nuevamente", () => {
  const action = getOrderPaymentRecoveryAction("some_network_error");
  assert.equal(action.retryAllowed, true);
  assert.equal(action.kind, "generic");
});

/* ── getOrderPaymentAction: cotizacion (feat/store-quote-checkout-flow) ── */
test("getOrderPaymentAction: proposal pendiente sin invoice_id oculta el boton de pago", () => {
  const order = { status: "pending", payment_status: "pending", document_type: "proposal", invoice_id: null };
  const action = getOrderPaymentAction(order);
  assert.equal(action.kind, "quote_pending_approval");
  assert.equal(action.ctaLabel, null);
  assert.equal(isOrderPayable(order), false);
  assert.equal(hasPendingOrderAction(order), false);
});

test("getOrderPaymentAction: proposal aprobada (invoice_id enlazado) cae al flujo normal de payment_status", () => {
  const order = {
    status: "pending",
    payment_status: "pending",
    document_type: "proposal",
    proposal_id: "prop-1",
    invoice_id: "inv-1",
  };
  const action = getOrderPaymentAction(order);
  assert.notEqual(action.kind, "quote_pending_approval");
  assert.equal(action.kind, "payable");
  assert.equal(isOrderPayable(order), true);
});

test("getOrderPaymentAction: orden con document_type=proposal ya pagada no se marca como pendiente de aprobacion", () => {
  const action = getOrderPaymentAction({
    status: "paid",
    payment_status: "paid",
    document_type: "proposal",
    invoice_id: "inv-1",
  });
  assert.equal(action.kind, "paid");
});

test("getOrderPaymentAction: compra_directa (document_type=invoice) nunca se clasifica como cotizacion pendiente", () => {
  const action = getOrderPaymentAction({
    status: "pending",
    payment_status: "pending",
    document_type: "invoice",
    invoice_id: null,
  });
  assert.notEqual(action.kind, "quote_pending_approval");
  assert.equal(action.kind, "payable");
});

test("getOrderPaymentAction: orden legacy sin document_type no se clasifica como cotizacion pendiente", () => {
  const action = getOrderPaymentAction({ status: "pending", payment_status: "pending" });
  assert.notEqual(action.kind, "quote_pending_approval");
});

/* ── canCustomerCancelOrder ────────────────────────────────────────────── */
test("canCustomerCancelOrder: orden pendiente sin pago es cancelable", () => {
  assert.equal(canCustomerCancelOrder({ status: "pending", payment_status: "pending" }), true);
});

test("canCustomerCancelOrder: orden pagada no es cancelable", () => {
  assert.equal(canCustomerCancelOrder({ status: "paid", payment_status: "paid" }), false);
});

test("canCustomerCancelOrder: orden ya cancelada no es cancelable de nuevo", () => {
  assert.equal(canCustomerCancelOrder({ status: "cancelled", payment_status: "cancelled" }), false);
});

test("canCustomerCancelOrder: payment_status=deposit_paid bloquea la cancelacion", () => {
  assert.equal(canCustomerCancelOrder({ status: "pending", payment_status: "deposit_paid" }), false);
});

test("canCustomerCancelOrder: deposit_paid_amount > 0 bloquea aunque el status siga pendiente", () => {
  assert.equal(
    canCustomerCancelOrder({ status: "pending", payment_status: "pending", deposit_paid_amount: 50 }),
    false
  );
});

test("canCustomerCancelOrder: deposit_paid_amount en 0 no bloquea", () => {
  assert.equal(
    canCustomerCancelOrder({ status: "pending", payment_status: "pending", deposit_paid_amount: 0 }),
    true
  );
});

test("canCustomerCancelOrder: status completed no es cancelable", () => {
  assert.equal(canCustomerCancelOrder({ status: "completed", payment_status: "paid" }), false);
});

test("canCustomerCancelOrder: reembolsada no es cancelable (status o payment_status)", () => {
  assert.equal(canCustomerCancelOrder({ status: "refunded", payment_status: "refunded" }), false);
  assert.equal(canCustomerCancelOrder({ status: "pending", payment_status: "refunded" }), false);
});

test("canCustomerCancelOrder: cotizacion pendiente de aprobacion (sin invoice_id) SI es cancelable", () => {
  assert.equal(
    canCustomerCancelOrder({
      status: "pending",
      payment_status: "pending",
      document_type: "proposal",
      invoice_id: null,
    }),
    true
  );
});

test("canCustomerCancelOrder: nunca depende de service_slug/service_tag, solo del estado", () => {
  const base = { status: "pending", payment_status: "pending" };
  assert.equal(canCustomerCancelOrder({ ...base, service_slug: "fotografia" }), true);
  assert.equal(canCustomerCancelOrder({ ...base, service_slug: "video" }), true);
  assert.equal(canCustomerCancelOrder({ ...base, service_slug: "diseno-web" }), true);
  assert.equal(canCustomerCancelOrder({ ...base, service_tag: "multi-servicio" }), true);
});

test("canCustomerCancelOrder: el can_cancel del backend (GET /my/orders/{id}) manda cuando esta presente", () => {
  // Server-authoritative override: even though this order otherwise looks
  // pending/cancelable from status alone, an explicit can_cancel: false
  // from the detail endpoint wins — never re-derived client-side once the
  // server has already computed it.
  assert.equal(canCustomerCancelOrder({ status: "pending", payment_status: "pending", can_cancel: false }), false);
  assert.equal(canCustomerCancelOrder({ status: "paid", payment_status: "paid", can_cancel: true }), true);
});

test("canCustomerCancelOrder: orden vacia/null no revienta y no es cancelable", () => {
  assert.equal(canCustomerCancelOrder(null), false);
  assert.equal(canCustomerCancelOrder(undefined), false);
  assert.equal(canCustomerCancelOrder({}), true);
});

console.log(`\n${passed} pruebas OK`);
if (process.exitCode) {
  console.error("Hay pruebas fallidas.");
} else {
  console.log("Todas las pruebas pasaron.");
}
