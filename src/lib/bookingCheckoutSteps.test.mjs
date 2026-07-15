/**
 * Pure Node test runner for bookingCheckoutSteps.js — no framework, no DOM.
 * Run with: node src/lib/bookingCheckoutSteps.test.mjs
 */
import assert from "node:assert/strict";
import {
  aggregateBookingStatus,
  buildSteps,
  isStepComplete,
  computeMaxReachableIndex,
  canNavigateToStep,
} from "./bookingCheckoutSteps.js";

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

/* ── 1. Step generation — booking with calendar + extras ─────────────── */
test("steps: booking con calendario y extras", () => {
  const steps = buildSteps({ requiresCalendar: true, hasCustomization: true });
  assert.deepEqual(steps, ["schedule", "customize", "details", "review"]);
});

test("steps: booking con calendario sin extras", () => {
  const steps = buildSteps({ requiresCalendar: true, hasCustomization: false });
  assert.deepEqual(steps, ["schedule", "details", "review"]);
});

test("steps: booking sin calendario con extras", () => {
  const steps = buildSteps({ requiresCalendar: false, hasCustomization: true });
  assert.deepEqual(steps, ["customize", "details", "review"]);
});

test("steps: booking sin calendario ni personalizacion", () => {
  const steps = buildSteps({ requiresCalendar: false, hasCustomization: false });
  assert.deepEqual(steps, ["details", "review"]);
});

/* ── 2. Step generation — non-booking cart ────────────────────────────── */
test("steps: carrito sin booking (compra directa)", () => {
  const status = aggregateBookingStatus(
    [{ slug: "diseno-logo", resolved: true, hasCalendar: false, hasPackages: false, hasAddons: false }],
    1
  );
  assert.equal(status.hasBooking, false);
  const steps = buildSteps({
    requiresCalendar: status.requiresCalendar,
    hasCustomization: status.hasCustomization,
  });
  assert.deepEqual(steps, ["details", "review"]);
});

/* ── 3. Enablement rules ───────────────────────────────────────────────── */
test("isStepComplete: schedule depende de scheduleComplete", () => {
  assert.equal(isStepComplete("schedule", { scheduleComplete: false }), false);
  assert.equal(isStepComplete("schedule", { scheduleComplete: true }), true);
});

test("isStepComplete: customize depende de customizationComplete", () => {
  assert.equal(isStepComplete("customize", { customizationComplete: false }), false);
  assert.equal(isStepComplete("customize", { customizationComplete: true }), true);
});

test("isStepComplete: details depende de detailsValid", () => {
  assert.equal(isStepComplete("details", { detailsValid: false }), false);
  assert.equal(isStepComplete("details", { detailsValid: true }), true);
});

test("isStepComplete: review nunca se marca completo por si mismo", () => {
  assert.equal(isStepComplete("review", { scheduleComplete: true, customizationComplete: true, detailsValid: true }), false);
});

/* ── 4. Calendario requerido incompleto bloquea avance ────────────────── */
test("calendario incompleto bloquea navegar mas alla del paso 0", () => {
  const steps = ["schedule", "details", "review"];
  const ctx = { scheduleComplete: false, detailsValid: true };
  assert.equal(computeMaxReachableIndex(steps, ctx), 0);
  assert.equal(canNavigateToStep(1, { steps, activeIndex: 0, ctx }), false);
  assert.equal(canNavigateToStep(2, { steps, activeIndex: 0, ctx }), false);
});

test("calendario completo desbloquea el siguiente paso", () => {
  const steps = ["schedule", "details", "review"];
  const ctx = { scheduleComplete: true, detailsValid: false };
  assert.equal(computeMaxReachableIndex(steps, ctx), 1);
  assert.equal(canNavigateToStep(1, { steps, activeIndex: 0, ctx }), true);
  assert.equal(canNavigateToStep(2, { steps, activeIndex: 0, ctx }), false);
});

/* ── 5. Booking sin calendario — no exige fecha ───────────────────────── */
test("servicio sin calendario nunca bloquea por scheduleComplete", () => {
  const status = aggregateBookingStatus(
    [{ slug: "sesion-sin-calendario", resolved: true, hasCalendar: false, hasPackages: true, hasAddons: false, customizationComplete: true }],
    1
  );
  assert.equal(status.requiresCalendar, false);
  assert.equal(status.scheduleComplete, true); // vacuously true — no calendar item to satisfy
});

/* ── 6. Extras opcionales no bloquean el avance ───────────────────────── */
test("extras opcionales no bloquean customizationComplete", () => {
  const status = aggregateBookingStatus(
    [{ slug: "boda", resolved: true, hasCalendar: true, hasPackages: false, hasAddons: true, scheduleComplete: true, customizationComplete: true }],
    1
  );
  assert.equal(status.customizationComplete, true);
});

/* ── 7. Carrito mixto: booking + compra directa ───────────────────────── */
test("carrito mixto solo exige fecha para el item booking", () => {
  const status = aggregateBookingStatus(
    [
      { slug: "boda", resolved: true, hasCalendar: true, hasPackages: false, hasAddons: false, scheduleComplete: false },
      { slug: "logo", resolved: true, hasCalendar: false, hasPackages: false, hasAddons: false },
    ],
    2
  );
  assert.equal(status.hasBooking, true);
  assert.equal(status.requiresCalendar, true);
  assert.equal(status.scheduleComplete, false); // la boda aun no tiene fecha
  const steps = buildSteps(status);
  assert.deepEqual(steps, ["schedule", "details", "review"]);
});

/* ── 8. Varios servicios booking — ambos deben completarse ────────────── */
test("dos servicios booking: ambos deben tener fecha para desbloquear", () => {
  const oneIncomplete = aggregateBookingStatus(
    [
      { slug: "boda", resolved: true, hasCalendar: true, scheduleComplete: true },
      { slug: "cumpleanos", resolved: true, hasCalendar: true, scheduleComplete: false },
    ],
    2
  );
  assert.equal(oneIncomplete.scheduleComplete, false);

  const bothComplete = aggregateBookingStatus(
    [
      { slug: "boda", resolved: true, hasCalendar: true, scheduleComplete: true },
      { slug: "cumpleanos", resolved: true, hasCalendar: true, scheduleComplete: true },
    ],
    2
  );
  assert.equal(bothComplete.scheduleComplete, true);
});

/* ── 9. Paso de pago solo habilitado al completar datos y reservas ────── */
test("revisar y pagar solo alcanzable tras completar todos los pasos previos", () => {
  const steps = ["schedule", "customize", "details", "review"];
  const incompleteDetails = { scheduleComplete: true, customizationComplete: true, detailsValid: false };
  assert.equal(canNavigateToStep(3, { steps, activeIndex: 2, ctx: incompleteDetails }), false);

  const allComplete = { scheduleComplete: true, customizationComplete: true, detailsValid: true };
  assert.equal(canNavigateToStep(3, { steps, activeIndex: 2, ctx: allComplete }), true);
});

/* ── Discovery state: no debe declararse "ready" antes de tiempo ──────── */
test("aggregateBookingStatus: loading mientras falten items por resolver", () => {
  const status = aggregateBookingStatus(
    [{ slug: "boda", resolved: true, hasCalendar: true, scheduleComplete: false }],
    2 // el carrito tiene 2 items, solo 1 resuelto
  );
  assert.equal(status.status, "loading");
});

test("aggregateBookingStatus: ready solo cuando todos los items resolvieron", () => {
  const status = aggregateBookingStatus(
    [
      { slug: "boda", resolved: true, hasCalendar: true, scheduleComplete: true },
      { slug: "logo", resolved: true, hasCalendar: false },
    ],
    2
  );
  assert.equal(status.status, "ready");
});

test("aggregateBookingStatus: items no-booking cuentan como resueltos", () => {
  const status = aggregateBookingStatus(
    [{ slug: "logo", resolved: true, hasCalendar: false, hasPackages: false, hasAddons: false }],
    1
  );
  assert.equal(status.status, "ready");
  assert.equal(status.hasBooking, false);
});

test("aggregateBookingStatus: carrito vacio esta ready de inmediato", () => {
  const status = aggregateBookingStatus([], 0);
  assert.equal(status.status, "ready");
  assert.equal(status.hasBooking, false);
});

/* ── Retroceder nunca pierde acceso a pasos ya visitados ──────────────── */
test("retroceder a un paso anterior siempre esta permitido", () => {
  const steps = ["schedule", "customize", "details", "review"];
  const ctx = { scheduleComplete: true, customizationComplete: false, detailsValid: false };
  assert.equal(canNavigateToStep(0, { steps, activeIndex: 2, ctx }), true);
  assert.equal(canNavigateToStep(1, { steps, activeIndex: 2, ctx }), true);
});

test("el paso activo siempre es clickeable", () => {
  const steps = ["details", "review"];
  const ctx = { detailsValid: false };
  assert.equal(canNavigateToStep(0, { steps, activeIndex: 0, ctx }), true);
});

/* ── Bloqueo 4: slug no resoluble no se convierte en "no booking" ─────── */
test("resolutionError bloquea hasBooking aunque el resto del carrito sea booking valido", () => {
  const status = aggregateBookingStatus(
    [
      { slug: "boda", resolved: true, hasCalendar: true, scheduleComplete: true },
      { slug: "__unresolved_0", resolved: true, resolutionError: true, hasCalendar: false, hasPackages: false, hasAddons: false, scheduleComplete: false, customizationComplete: false },
    ],
    2
  );
  assert.equal(status.status, "ready");
  assert.equal(status.resolutionErrors.length, 1);
  assert.equal(status.hasBooking, false);
  assert.equal(status.scheduleComplete, false);
  assert.equal(status.customizationComplete, false);
});

test("carrito con un item valido y otro no resoluble reporta el error, no lo oculta", () => {
  const status = aggregateBookingStatus(
    [
      { slug: "logo", resolved: true, hasCalendar: false, hasPackages: false, hasAddons: false },
      { slug: "__unresolved_0", resolved: true, resolutionError: true, hasCalendar: false, hasPackages: false, hasAddons: false, scheduleComplete: false, customizationComplete: false },
    ],
    2
  );
  assert.equal(status.resolutionErrors.length, 1);
  // Aunque el otro item sea legitimamente "no booking", no se debe armar
  // un wizard de compra directa mientras haya un item sin resolver.
  assert.equal(status.hasBooking, false);
});

test("sin resolutionErrors el carrito se comporta igual que antes", () => {
  const status = aggregateBookingStatus(
    [{ slug: "boda", resolved: true, hasCalendar: true, scheduleComplete: true }],
    1
  );
  assert.equal(status.resolutionErrors.length, 0);
  assert.equal(status.hasBooking, true);
});

console.log(`\n${passed} pruebas OK`);
if (process.exitCode) {
  console.error("Hay pruebas fallidas.");
} else {
  console.log("Todas las pruebas pasaron.");
}
