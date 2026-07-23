// Never surfaces a raw backend error code (e.g.
// membership_plan_not_synced_to_stripe_test, stripe_customer_create_failed)
// to the customer — only a fixed, friendly message. The technical detail is
// only ever logged to the console in development, never rendered.
const MESSAGE_MAP = [
  [/session_expired|unauthorized|forbidden/i, "Tu sesión expiró. Inicia sesión nuevamente."],
  [/not_synced_to_stripe|stripe_price|stripe_customer|stripe_checkout_session/i, "El pago no está disponible en este momento. Intenta más tarde."],
  [/selection_not_found|plan_not_found|not_found/i, "Este plan ya no está disponible."],
];

export function translateCheckoutError(error) {
  const raw = String(error?.message || "");
  if (import.meta.env.DEV) {
    console.error("[membership-checkout] session creation failed:", raw);
  }
  for (const [pattern, friendly] of MESSAGE_MAP) {
    if (pattern.test(raw)) return friendly;
  }
  return "No pudimos iniciar el pago seguro. Intenta nuevamente.";
}
