/**
 * Tests for resolveCatalogPurchaseFlow.
 *
 * Run with:  node src/lib/catalogPurchaseFlow.test.js
 *
 * Uses Node.js built-in `assert` — no test framework required.
 */

import assert from "node:assert/strict";
import { resolveCatalogPurchaseFlow } from "./catalogPurchaseFlow.js";

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    console.log(`  PASS  ${label}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${label}`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

// ── Known flows ────────────────────────────────────────────────────────────────

test("booking → badge label and CTA", () => {
  const flow = resolveCatalogPurchaseFlow({ purchaseFlow: "booking" });
  assert.equal(flow.value, "booking");
  assert.equal(flow.label, "Reserva con fecha");
  assert.equal(flow.ctaLabel, "Reservar fecha");
  assert.equal(flow.tone, "booking");
  assert.equal(flow.shouldShowBadge, true);
});

test("direct_purchase → badge label and CTA", () => {
  const flow = resolveCatalogPurchaseFlow({ purchaseFlow: "direct_purchase" });
  assert.equal(flow.value, "direct_purchase");
  assert.equal(flow.label, "Compra directa");
  assert.equal(flow.ctaLabel, "Comprar servicio");
  assert.equal(flow.tone, "purchase");
  assert.equal(flow.shouldShowBadge, true);
});

test("proposal_request → badge label and CTA", () => {
  const flow = resolveCatalogPurchaseFlow({ purchaseFlow: "proposal_request" });
  assert.equal(flow.value, "proposal_request");
  assert.equal(flow.label, "Solicitar propuesta");
  assert.equal(flow.ctaLabel, "Solicitar propuesta");
  assert.equal(flow.tone, "consultive");
  assert.equal(flow.shouldShowBadge, true);
});

test("monthly_plan → badge label and CTA", () => {
  const flow = resolveCatalogPurchaseFlow({ purchaseFlow: "monthly_plan" });
  assert.equal(flow.value, "monthly_plan");
  assert.equal(flow.label, "Plan mensual");
  assert.equal(flow.ctaLabel, "Ver plan mensual");
  assert.equal(flow.tone, "plan");
  assert.equal(flow.shouldShowBadge, true);
});

// ── Null / missing / invalid → safe neutral default ────────────────────────────

test("null purchaseFlow → no badge, CTA=Ver servicio", () => {
  const flow = resolveCatalogPurchaseFlow({ purchaseFlow: null });
  assert.equal(flow.value, null);
  assert.equal(flow.label, null);
  assert.equal(flow.ctaLabel, "Ver servicio");
  assert.equal(flow.shouldShowBadge, false);
});

test("missing purchaseFlow property → no badge, CTA=Ver servicio", () => {
  const flow = resolveCatalogPurchaseFlow({ name: "Servicio X" });
  assert.equal(flow.value, null);
  assert.equal(flow.shouldShowBadge, false);
  assert.equal(flow.ctaLabel, "Ver servicio");
});

test("invalid purchaseFlow string → no badge, CTA=Ver servicio", () => {
  const flow = resolveCatalogPurchaseFlow({ purchaseFlow: "buy_now" });
  assert.equal(flow.value, null);
  assert.equal(flow.shouldShowBadge, false);
  assert.equal(flow.ctaLabel, "Ver servicio");
});

test("undefined input → no badge, CTA=Ver servicio", () => {
  const flow = resolveCatalogPurchaseFlow(undefined);
  assert.equal(flow.value, null);
  assert.equal(flow.shouldShowBadge, false);
  assert.equal(flow.ctaLabel, "Ver servicio");
});

test("null input → no badge, CTA=Ver servicio", () => {
  const flow = resolveCatalogPurchaseFlow(null);
  assert.equal(flow.shouldShowBadge, false);
  assert.equal(flow.ctaLabel, "Ver servicio");
});

// ── Resolver does NOT infer flow from other fields ─────────────────────────────

test("service name containing 'boda' does not trigger booking flow", () => {
  const flow = resolveCatalogPurchaseFlow({ name: "Fotografía de Boda", purchaseFlow: null });
  assert.equal(flow.value, null);
  assert.equal(flow.shouldShowBadge, false);
});

test("category 'photography' does not trigger any flow", () => {
  const flow = resolveCatalogPurchaseFlow({ category: "photography", purchaseFlow: null });
  assert.equal(flow.value, null);
  assert.equal(flow.shouldShowBadge, false);
});

test("slug does not influence flow resolution", () => {
  const flow = resolveCatalogPurchaseFlow({ slug: "diseno-de-logotipo", purchaseFlow: null });
  assert.equal(flow.value, null);
  assert.equal(flow.shouldShowBadge, false);
});

test("sale_mode field is ignored entirely", () => {
  const flow = resolveCatalogPurchaseFlow({ sale_mode: "buy_now", purchaseFlow: null });
  assert.equal(flow.value, null);
  assert.equal(flow.shouldShowBadge, false);
});

test("high price does not trigger direct_purchase flow", () => {
  const flow = resolveCatalogPurchaseFlow({ price: 9999, purchaseFlow: null });
  assert.equal(flow.value, null);
  assert.equal(flow.shouldShowBadge, false);
});

// ── CTA navigates to service-detail (slug-based URL) ──────────────────────────

test("all flows return a ctaLabel (no flow returns empty string)", () => {
  const flows = ["booking", "direct_purchase", "proposal_request", "monthly_plan", null];
  for (const f of flows) {
    const result = resolveCatalogPurchaseFlow({ purchaseFlow: f });
    assert.ok(result.ctaLabel.length > 0, `ctaLabel empty for flow=${f}`);
  }
});

// ── Summary ────────────────────────────────────────────────────────────────────

console.log();
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
