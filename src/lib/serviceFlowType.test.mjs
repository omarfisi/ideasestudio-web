/**
 * Pure Node test runner for serviceFlowType.js — no framework, no DOM.
 * Run with: node src/lib/serviceFlowType.test.mjs
 *
 * Item 6 of the sale_mode fix's frontend test plan: "todos los servicios
 * de propuesta usan el mismo flujo" — getServiceFlowType must classify a
 * product purely from its purchase_flow/sale_mode metadata, never from its
 * name, slug, or category. Also covers the ORD-20260719-0BA6D4 root cause
 * from the frontend side: "Materiales de Marketing" (purchase_flow=
 * proposal_request) must resolve D_QUOTE ("Solicitar propuesta"), and
 * "Producción de Videos Básico para Eventos" (purchase_flow=booking) must
 * resolve A_BOOKING ("Reservar fecha") — this frontend classifier already
 * read purchase_flow correctly before this fix; only the backend's
 * checkout resolver had the bug.
 */
import assert from "node:assert/strict";
import {
  SERVICE_FLOW_TYPES,
  normalizeSaleMode,
  getServiceFlowType,
  getServiceFlowConfig,
  isBookingFlow,
} from "./serviceFlowType.js";

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

/* ── The exact ORD-20260719-0BA6D4 products ──────────────────────────────── */
test("Materiales de Marketing (purchase_flow=proposal_request) resolves D_QUOTE regardless of name", () => {
  const product = {
    name: "Materiales de Marketing",
    slug: "materiales-de-marketing",
    metadata: { purchase_flow: "proposal_request" },
  };
  assert.equal(getServiceFlowType(product), SERVICE_FLOW_TYPES.D_QUOTE);
  assert.equal(getServiceFlowConfig(product).cta, "Solicitar propuesta");
});

test("Producción de Videos Básico para Eventos (purchase_flow=booking) resolves A_BOOKING, not D_QUOTE", () => {
  const product = {
    name: "Producción de Videos Básico para Eventos",
    slug: "produccion-de-videos-basico-para-eventos",
    metadata: { purchase_flow: "booking" },
  };
  assert.equal(getServiceFlowType(product), SERVICE_FLOW_TYPES.A_BOOKING);
  assert.equal(getServiceFlowConfig(product).cta, "Reservar fecha");
  assert.equal(isBookingFlow(product), true);
});

/* ── Item 6: same purchase_flow, different names/slugs/categories -> same flow ── */
test("every proposal_request product uses the same D_QUOTE flow regardless of name/slug/category", () => {
  const products = [
    { name: "Materiales de Marketing", slug: "materiales-de-marketing", category: "marketing_digital" },
    { name: "Producción de Videos Avanzado", slug: "produccion-de-videos-avanzado", category: "video" },
    { name: "Fotografía Editorial Premium", slug: "fotografia-editorial-premium", category: "fotografia" },
    { name: "Identidad de Marca Completa", slug: "identidad-de-marca-completa", category: "branding_diseno" },
    { name: "Un Servicio Completamente Nuevo Sin Precedente", slug: "servicio-nuevo-xyz", category: "" },
  ];

  for (const base of products) {
    const product = { ...base, metadata: { purchase_flow: "proposal_request" } };
    assert.equal(
      getServiceFlowType(product),
      SERVICE_FLOW_TYPES.D_QUOTE,
      `expected D_QUOTE for ${base.name}`
    );
  }
});

test("every booking product uses the same A_BOOKING flow regardless of name/slug/category", () => {
  const products = [
    { name: "Fotografía Profesional de Bodas", slug: "fotografia-bodas", category: "fotografia" },
    { name: "Producción de Videos Básico para Eventos", slug: "produccion-videos-eventos", category: "video" },
    { name: "Sesión Corporativa", slug: "sesion-corporativa", category: "fotografia" },
  ];

  for (const base of products) {
    const product = { ...base, metadata: { purchase_flow: "booking" } };
    assert.equal(getServiceFlowType(product), SERVICE_FLOW_TYPES.A_BOOKING, `expected A_BOOKING for ${base.name}`);
  }
});

/* ── normalizeSaleMode synonym coverage ──────────────────────────────────── */
test("normalizeSaleMode: proposal_request and cotizacion both map to D_QUOTE", () => {
  assert.equal(normalizeSaleMode("proposal_request"), SERVICE_FLOW_TYPES.D_QUOTE);
  assert.equal(normalizeSaleMode("cotizacion"), SERVICE_FLOW_TYPES.D_QUOTE);
  assert.equal(normalizeSaleMode("quote"), SERVICE_FLOW_TYPES.D_QUOTE);
});

test("normalizeSaleMode: booking and direct_purchase never collide", () => {
  assert.equal(normalizeSaleMode("booking"), SERVICE_FLOW_TYPES.A_BOOKING);
  assert.equal(normalizeSaleMode("direct_purchase"), SERVICE_FLOW_TYPES.C_FIXED_PRICE);
  assert.notEqual(normalizeSaleMode("booking"), normalizeSaleMode("direct_purchase"));
});

test("normalizeSaleMode: case/hyphen-insensitive", () => {
  assert.equal(normalizeSaleMode("Proposal-Request"), SERVICE_FLOW_TYPES.D_QUOTE);
  assert.equal(normalizeSaleMode("  PROPOSAL_REQUEST  "), SERVICE_FLOW_TYPES.D_QUOTE);
});

test("normalizeSaleMode: unrecognized value returns null (falls through to inference)", () => {
  assert.equal(normalizeSaleMode("something_new"), null);
});

/* ── Priority: explicit metadata always wins over name/slug inference ────── */
test("explicit purchase_flow wins even when the name would otherwise infer a different flow", () => {
  // Name alone would infer D_QUOTE (contains "video"/"producción") per
  // inferFromNameSlugCategory, but an explicit booking flow must win.
  const product = {
    name: "Producción de Videos Básico para Eventos",
    slug: "produccion-de-videos-basico-para-eventos",
    metadata: { purchase_flow: "booking" },
  };
  assert.equal(getServiceFlowType(product), SERVICE_FLOW_TYPES.A_BOOKING);
});

console.log(`\n${passed} pruebas OK`);
if (process.exitCode) {
  console.error("Hay pruebas fallidas.");
} else {
  console.log("Todas las pruebas pasaron.");
}
