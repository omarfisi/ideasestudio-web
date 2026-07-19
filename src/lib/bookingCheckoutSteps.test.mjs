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
  buildBookingSelectionField,
  mapOrderTotals,
  mapBookingErrorMessage,
  isSelectedSlotStillAvailable,
  mergeTrustedOrderTotals,
  shouldPreparePaymentSession,
  resolveCheckoutOutcome,
  isRetryBlocked,
  isBookingConflictError,
  normalizeToken,
  mapProfileToCrmFieldValues,
  mergeProfileValuesWithoutOverwrite,
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

/* ── buildBookingSelectionField ───────────────────────────────────────── */
test("buildBookingSelectionField: carrito sin booking devuelve null", () => {
  assert.equal(buildBookingSelectionField({}), null);
  assert.equal(buildBookingSelectionField(null), null);
});

test("buildBookingSelectionField: null explicitos se filtran", () => {
  assert.equal(buildBookingSelectionField({ boda: null, cumpleanos: null }), null);
});

test("buildBookingSelectionField: una seleccion devuelve el objeto, no un array", () => {
  const selection = {
    service_slug: "boda",
    starts_at: "2026-08-01T14:00:00+00:00",
    ends_at: "2026-08-01T18:00:00+00:00",
    package_id: "pkg-1",
    selected_addons: [{ addon_id: "addon-1", quantity: 2 }],
    estimated_total: 999,
    estimated_duration_minutes: 240,
    deposit_amount: 250,
  };
  const result = buildBookingSelectionField({ boda: selection });
  assert.equal(Array.isArray(result), false);
  assert.deepEqual(result, selection);
  // Paquete y addons viajan intactos, tal como los construyo el panel.
  assert.equal(result.package_id, "pkg-1");
  assert.deepEqual(result.selected_addons, [{ addon_id: "addon-1", quantity: 2 }]);
});

test("buildBookingSelectionField: dos o mas selecciones devuelven un array", () => {
  const boda = { service_slug: "boda", starts_at: "2026-08-01T14:00:00+00:00" };
  const cumpleanos = { service_slug: "cumpleanos", starts_at: "2026-08-02T18:00:00+00:00" };
  const result = buildBookingSelectionField({ boda, cumpleanos, logo: null });
  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, 2);
  assert.deepEqual(new Set(result.map((r) => r.service_slug)), new Set(["boda", "cumpleanos"]));
});

/* ── mapOrderTotals ────────────────────────────────────────────────────── */
test("mapOrderTotals: respuesta de create-order con pago completo", () => {
  const totals = mapOrderTotals({
    contract_total: 500,
    amount_due_now: 500,
    deposit_total: 0,
    balance_due: 0,
    grand_total: 500,
  });
  assert.deepEqual(totals, { contractTotal: 500, amountDueNow: 500, depositTotal: 0, balanceDue: 0 });
});

test("mapOrderTotals: respuesta con deposito y balance pendiente", () => {
  const totals = mapOrderTotals({
    contract_total: 999.95,
    amount_due_now: 250,
    deposit_total: 250,
    balance_due: 749.95,
    grand_total: 999.95,
  });
  assert.equal(totals.contractTotal, 999.95);
  assert.equal(totals.amountDueNow, 250);
  assert.equal(totals.depositTotal, 250);
  assert.equal(totals.balanceDue, 749.95);
});

test("mapOrderTotals: orden legacy (GET /orders/{id}, sin contract_total/deposit_total) usa fallback", () => {
  // Raw store_orders row shape — no contract_total/deposit_total keys,
  // only grand_total/amount_due_now/deposit_amount/balance_due.
  const totals = mapOrderTotals({
    grand_total: 300,
    amount_due_now: 300,
    deposit_amount: 0,
    balance_due: 0,
  });
  assert.equal(totals.contractTotal, 300);
  assert.equal(totals.amountDueNow, 300);
  assert.equal(totals.depositTotal, 0);
});

test("mapOrderTotals: precios manipulados en la seleccion del cliente nunca son la autoridad", () => {
  // Un estimated_total/deposit_amount fabricado en el selection del cliente
  // no tiene ningun campo compatible en mapOrderTotals — solo lee las
  // claves que el backend controla (contract_total/amount_due_now/
  // deposit_total/balance_due/grand_total/deposit_amount de la ORDEN, no
  // del selection). Simulamos una orden real cuyo total no coincide con lo
  // que un cliente malicioso hubiera "estimado" en el navegador.
  const clientEstimated = { estimated_total: 1, deposit_amount: 1 }; // manipulado
  const realOrder = { contract_total: 500, amount_due_now: 500, deposit_total: 0, balance_due: 0 };
  const totals = mapOrderTotals({ ...clientEstimated, ...realOrder });
  assert.equal(totals.amountDueNow, 500); // no 1 — el campo del cliente no es leido
});

test("mapOrderTotals: orden vacia no revienta, todo en cero", () => {
  assert.deepEqual(mapOrderTotals(null), { contractTotal: 0, amountDueNow: 0, depositTotal: 0, balanceDue: 0 });
  assert.deepEqual(mapOrderTotals({}), { contractTotal: 0, amountDueNow: 0, depositTotal: 0, balanceDue: 0 });
});

/* ── mapBookingErrorMessage ────────────────────────────────────────────── */
test("mapBookingErrorMessage: slot ocupado", () => {
  assert.equal(
    mapBookingErrorMessage("booking_time_slot_not_available"),
    "Ese horario acaba de ocuparse. Selecciona otro horario."
  );
});

test("mapBookingErrorMessage: hold expirado", () => {
  assert.equal(
    mapBookingErrorMessage("booking_hold_expired"),
    "El tiempo para completar el pago expiró. Selecciona nuevamente la fecha y hora."
  );
});

test("mapBookingErrorMessage: booking_selection_required", () => {
  assert.equal(
    mapBookingErrorMessage("booking_selection_required"),
    "Completa la configuración del servicio antes de continuar."
  );
});

test("mapBookingErrorMessage: payment_review_required advierte no reintentar", () => {
  const msg = mapBookingErrorMessage("payment_review_required");
  assert.equal(msg, "El pago necesita revisión. No intentes pagar nuevamente.");
});

test("mapBookingErrorMessage: codigo no mapeado usa el fallback, nunca se pierde silenciosamente", () => {
  assert.equal(mapBookingErrorMessage("algun_error_futuro_no_mapeado", "mensaje de respaldo"), "mensaje de respaldo");
  assert.equal(mapBookingErrorMessage(null, "mensaje de respaldo"), "mensaje de respaldo");
  assert.equal(mapBookingErrorMessage("algun_error_futuro_no_mapeado"), "algun_error_futuro_no_mapeado");
});

/* ── isSelectedSlotStillAvailable ──────────────────────────────────────── */
test("isSelectedSlotStillAvailable: slot sigue en la nueva respuesta", () => {
  const selected = { starts_at: "2026-08-01T14:00:00+00:00" };
  const slots = [{ starts_at: "2026-08-01T13:00:00+00:00" }, { starts_at: "2026-08-01T14:00:00+00:00" }];
  assert.equal(isSelectedSlotStillAvailable(selected, slots), true);
});

test("isSelectedSlotStillAvailable: cambiar addon quita el slot -> se invalida", () => {
  const selected = { starts_at: "2026-08-01T14:00:00+00:00" };
  const slotsAfterLongerAddon = [{ starts_at: "2026-08-01T13:00:00+00:00" }];
  assert.equal(isSelectedSlotStillAvailable(selected, slotsAfterLongerAddon), false);
});

test("isSelectedSlotStillAvailable: sin slot seleccionado siempre es valido (nada que invalidar)", () => {
  assert.equal(isSelectedSlotStillAvailable(null, []), true);
  assert.equal(isSelectedSlotStillAvailable(undefined, [{ starts_at: "x" }]), true);
});

/* ── mergeTrustedOrderTotals ───────────────────────────────────────────── */
test("mergeTrustedOrderTotals: preserva el deposito conocido tras un refresh incompleto (GET /orders/{id})", () => {
  const trusted = { id: "order-1", contractTotal: 999.95, amountDueNow: 250, depositTotal: 250, balanceDue: 749.95 };
  // Simula la respuesta real de GET /orders/{id}: sin estos 4 campos, cae
  // en el fallback de mapOrderTotals (amountDueNow = grand_total = total).
  const staleRefresh = { id: "order-1", status: "processing", paymentStatus: "deposit_paid", contractTotal: 999.95, amountDueNow: 999.95, depositTotal: 0, balanceDue: 0 };
  const merged = mergeTrustedOrderTotals(staleRefresh, trusted);
  assert.equal(merged.amountDueNow, 250);
  assert.equal(merged.depositTotal, 250);
  assert.equal(merged.balanceDue, 749.95);
  // Los campos que SI deben refrescarse (status/paymentStatus) vienen del refresh, no del trusted.
  assert.equal(merged.status, "processing");
  assert.equal(merged.paymentStatus, "deposit_paid");
});

test("mergeTrustedOrderTotals: no mezcla totales de una orden distinta", () => {
  const trusted = { id: "order-1", contractTotal: 500, amountDueNow: 500, depositTotal: 0, balanceDue: 0 };
  const otherOrderRefresh = { id: "order-2", contractTotal: 80, amountDueNow: 80, depositTotal: 0, balanceDue: 0 };
  const merged = mergeTrustedOrderTotals(otherOrderRefresh, trusted);
  assert.equal(merged.amountDueNow, 80); // no se contamina con order-1
});

test("mergeTrustedOrderTotals: sin fuente confiable devuelve el refresh tal cual", () => {
  const refresh = { id: "order-1", amountDueNow: 500 };
  assert.deepEqual(mergeTrustedOrderTotals(refresh, null), refresh);
});

/* ── shouldPreparePaymentSession ───────────────────────────────────────── */
function baseCtx(overrides = {}) {
  return {
    activeStepKey: "review",
    bookingReady: true,
    detailsValid: true,
    completedOrder: null,
    paymentIntent: null,
    preparation: { running: false, completed: false },
    ...overrides,
  };
}

test("shouldPreparePaymentSession: entra a review con todo listo -> dispara", () => {
  assert.equal(shouldPreparePaymentSession(baseCtx()), true);
});

test("shouldPreparePaymentSession: no es el paso review -> no dispara", () => {
  assert.equal(shouldPreparePaymentSession(baseCtx({ activeStepKey: "schedule" })), false);
  assert.equal(shouldPreparePaymentSession(baseCtx({ activeStepKey: "details" })), false);
});

test("shouldPreparePaymentSession: booking todavia descubriendo o con error de resolucion -> no dispara", () => {
  assert.equal(shouldPreparePaymentSession(baseCtx({ bookingReady: false })), false);
});

test("shouldPreparePaymentSession: datos del cliente incompletos -> no dispara", () => {
  assert.equal(shouldPreparePaymentSession(baseCtx({ detailsValid: false })), false);
});

test("shouldPreparePaymentSession: ya existe completedOrder (pago exitoso) -> nunca recrea otra orden", () => {
  assert.equal(shouldPreparePaymentSession(baseCtx({ completedOrder: { id: "order-1" } })), false);
});

test("shouldPreparePaymentSession: ya existe un PaymentIntent -> reutiliza, no dispara de nuevo (volver y regresar a review)", () => {
  assert.equal(
    shouldPreparePaymentSession(baseCtx({ paymentIntent: { clientSecret: "secret_123" } })),
    false
  );
});

test("shouldPreparePaymentSession: preparation.running true -> no dispara una segunda vez (protege doble invocacion de StrictMode)", () => {
  const preparation = { running: false, completed: false };
  assert.equal(shouldPreparePaymentSession(baseCtx({ preparation })), true);
  // El primer disparo marca running=true de forma sincrona (mismo objeto ref
  // que usaria un useRef real) antes de que el segundo invoke de StrictMode
  // vuelva a evaluar la condicion.
  preparation.running = true;
  assert.equal(shouldPreparePaymentSession(baseCtx({ preparation })), false);
});

test("shouldPreparePaymentSession: preparation.completed true -> un re-render no repite la creacion", () => {
  const preparation = { running: false, completed: true };
  assert.equal(shouldPreparePaymentSession(baseCtx({ preparation })), false);
});

/* ── isBookingConflictError / isRetryBlocked ───────────────────────────── */
test("isBookingConflictError: slot ocupado y hold expirado deben regresar a Fecha y hora", () => {
  assert.equal(isBookingConflictError("booking_time_slot_not_available"), true);
  assert.equal(isBookingConflictError("booking_hold_expired"), true);
});

test("isBookingConflictError: otros codigos de error no son conflicto de slot", () => {
  assert.equal(isBookingConflictError("payment_review_required"), false);
  assert.equal(isBookingConflictError("booking_package_invalid"), false);
  assert.equal(isBookingConflictError(null), false);
});

test("isRetryBlocked: payment_review_required bloquea reintentos, automaticos y manuales", () => {
  assert.equal(isRetryBlocked("payment_review_required"), true);
});

test("isRetryBlocked: errores genericos (red, validacion) permiten 'Intentar nuevamente'", () => {
  assert.equal(isRetryBlocked("booking_package_invalid"), false);
  assert.equal(isRetryBlocked("network_error"), false);
  assert.equal(isRetryBlocked(null), false);
});

/* ── normalizeToken ────────────────────────────────────────────────────── */
test("normalizeToken: acentos, mayusculas y espacios normalizan igual", () => {
  assert.equal(normalizeToken("Teléfono"), normalizeToken("  TELEFONO "));
  assert.equal(normalizeToken("Teléfono"), "telefono");
});

/* ── mapProfileToCrmFieldValues ────────────────────────────────────────── */
test("mapProfileToCrmFieldValues: mapea por map_to o name usando keywords conocidos", () => {
  const crmFields = [
    { name: "full_name", map_to: "nombre" },
    { name: "email_field", map_to: "email" },
    { name: "phone_field", map_to: "telefono" },
    { name: "unrelated_field", map_to: "notas" },
  ];
  const profile = { name: "Jane Doe", email: "jane@example.com", phone: "7875551234", company: null };

  const result = mapProfileToCrmFieldValues(crmFields, profile);

  assert.deepEqual(result, {
    full_name: "Jane Doe",
    email_field: "jane@example.com",
    phone_field: "7875551234",
  });
});

test("mapProfileToCrmFieldValues: perfil vacio o null no revienta, devuelve objeto vacio", () => {
  const crmFields = [{ name: "full_name", map_to: "nombre" }];
  assert.deepEqual(mapProfileToCrmFieldValues(crmFields, null), {});
  assert.deepEqual(mapProfileToCrmFieldValues(crmFields, {}), {});
});

test("mapProfileToCrmFieldValues: un valor vacio en el perfil no se incluye (no pisa con vacio)", () => {
  const crmFields = [{ name: "phone_field", map_to: "telefono" }];
  const result = mapProfileToCrmFieldValues(crmFields, { phone: "" });
  assert.deepEqual(result, {});
});

/* ── mergeProfileValuesWithoutOverwrite ────────────────────────────────── */
test("mergeProfileValuesWithoutOverwrite: rellena campos vacios con datos del perfil", () => {
  const current = { name: "", email: "", phone: "" };
  const profile = { name: "Jane Doe", email: "jane@example.com", phone: "7875551234" };
  const merged = mergeProfileValuesWithoutOverwrite(current, profile);
  assert.deepEqual(merged, profile);
});

test("mergeProfileValuesWithoutOverwrite: NUNCA sobrescribe un dato que el cliente ya escribio", () => {
  // El caso central del bug: el cliente ya empezo a escribir su telefono
  // antes de que el perfil terminara de cargar — ese valor debe sobrevivir.
  const current = { name: "", email: "", phone: "787-000-9999" };
  const profile = { name: "Jane Doe", email: "jane@example.com", phone: "7875551234" };
  const merged = mergeProfileValuesWithoutOverwrite(current, profile);
  assert.equal(merged.phone, "787-000-9999");
  assert.equal(merged.name, "Jane Doe");
  assert.equal(merged.email, "jane@example.com");
});

test("mergeProfileValuesWithoutOverwrite: un valor de solo espacios cuenta como vacio y si se rellena", () => {
  const current = { name: "   " };
  const merged = mergeProfileValuesWithoutOverwrite(current, { name: "Jane Doe" });
  assert.equal(merged.name, "Jane Doe");
});

/* ── resolveCheckoutOutcome (feat/store-quote-checkout-flow) ───────────── */
test("resolveCheckoutOutcome: payment_required=false enruta a quote_confirmation con saleMode/proposalId/customerName", () => {
  const outcome = resolveCheckoutOutcome({
    paymentRequired: false,
    saleMode: "cotizacion",
    proposalId: "prop-1",
    customerName: "Ana Perez",
  });
  assert.deepEqual(outcome, {
    type: "quote_confirmation",
    saleMode: "cotizacion",
    proposalId: "prop-1",
    customerName: "Ana Perez",
  });
});

test("resolveCheckoutOutcome: payment_required=true enruta a continue_to_payment", () => {
  const outcome = resolveCheckoutOutcome({ paymentRequired: true, saleMode: "compra_directa" });
  assert.deepEqual(outcome, { type: "continue_to_payment" });
});

test("resolveCheckoutOutcome: sin payment_required (respuesta legacy) se trata como true", () => {
  assert.deepEqual(resolveCheckoutOutcome({ saleMode: "compra_directa" }), { type: "continue_to_payment" });
  assert.deepEqual(resolveCheckoutOutcome(null), { type: "continue_to_payment" });
  assert.deepEqual(resolveCheckoutOutcome(undefined), { type: "continue_to_payment" });
});

test("resolveCheckoutOutcome: payment_required no booleano nunca se trata como cotizacion", () => {
  assert.deepEqual(resolveCheckoutOutcome({ paymentRequired: "false" }), { type: "continue_to_payment" });
  assert.deepEqual(resolveCheckoutOutcome({ paymentRequired: 0 }), { type: "continue_to_payment" });
});

test("resolveCheckoutOutcome: saleMode/proposalId/customerName ausentes se normalizan a null", () => {
  assert.deepEqual(resolveCheckoutOutcome({ paymentRequired: false }), {
    type: "quote_confirmation",
    saleMode: null,
    proposalId: null,
    customerName: null,
  });
});

/* ── isRetryBlocked / mapBookingErrorMessage — cotizacion ───────────────── */
test("isRetryBlocked: mixed_sale_modes_not_supported bloquea reintentos", () => {
  assert.equal(isRetryBlocked("mixed_sale_modes_not_supported"), true);
});

test("isRetryBlocked: order_awaiting_proposal_approval bloquea reintentos", () => {
  assert.equal(isRetryBlocked("order_awaiting_proposal_approval"), true);
});

test("mapBookingErrorMessage: mixed_sale_modes_not_supported da mensaje amigable, no el codigo crudo", () => {
  const message = mapBookingErrorMessage("mixed_sale_modes_not_supported", "fallback");
  assert.notEqual(message, "mixed_sale_modes_not_supported");
  assert.ok(message.toLowerCase().includes("compra directa"));
  assert.ok(message.toLowerCase().includes("cotización"));
});

test("mapBookingErrorMessage: order_awaiting_proposal_approval da mensaje amigable, no el codigo crudo", () => {
  const message = mapBookingErrorMessage("order_awaiting_proposal_approval", "fallback");
  assert.notEqual(message, "order_awaiting_proposal_approval");
  assert.ok(message.toLowerCase().includes("aprobación"));
});

console.log(`\n${passed} pruebas OK`);
if (process.exitCode) {
  console.error("Hay pruebas fallidas.");
} else {
  console.log("Todas las pruebas pasaron.");
}
