/**
 * Pure Node test runner for orderPaymentState.js — no framework, no DOM.
 * Run with: node src/lib/orderPaymentState.test.mjs
 */
import assert from "node:assert/strict";
import {
  getOrderPaymentAction,
  isOrderPayable,
  mapOrderPaymentErrorMessage,
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

console.log(`\n${passed} pruebas OK`);
if (process.exitCode) {
  console.error("Hay pruebas fallidas.");
} else {
  console.log("Todas las pruebas pasaron.");
}
