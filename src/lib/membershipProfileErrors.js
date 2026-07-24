import { MissingSessionError } from "@/lib/authenticatedApi.js";

// Same rule as membershipCheckoutErrors.js: never surface a raw backend
// code — only a fixed, friendly message. `error.code` (ApiRequestError)
// is checked first since it's the exact, stable string the backend sends
// as `detail`; error.message falls back to the same value by construction.
const CODE_MAP = {
  missing_session: "Tu sesión expiró. Inicia sesión nuevamente.",
  auth_required: "Tu sesión expiró. Inicia sesión nuevamente.",
  customer_profile_not_found: "No pudimos encontrar tu perfil.",
  membership_profile_not_found: "No pudimos encontrar tu perfil.",
  customer_email_required: "Tu cuenta no tiene un correo válido.",
  customer_email_invalid: "Tu cuenta no tiene un correo válido.",
  customer_email_mismatch: "El correo de la sesión no coincide con el correo del checkout.",
  customer_contact_conflict: "No pudimos vincular tu cuenta automáticamente. Comunícate con soporte.",
  network_error: "No pudimos conectar con el servidor. Intenta nuevamente.",
  membership_not_found: "No encontramos una membresía activa en tu cuenta.",
  membership_not_cancelable: "Esta membresía no se puede cancelar en este momento.",
  membership_already_canceling: "Tu membresía ya está programada para cancelarse al final del periodo.",
  membership_not_scheduled_for_cancellation: "Tu membresía no está programada para cancelarse.",
  membership_already_ended: "El periodo de tu membresía ya finalizó.",
  billing_customer_not_found: "Todavía no hay información de facturación asociada a tu cuenta.",
  stripe_request_failed: "No pudimos comunicarnos con Stripe. Intenta nuevamente en unos minutos.",
};

export function translateProfileError(error) {
  if (import.meta.env.DEV) {
    console.error("[membership-profile] request failed:", error?.code || error?.message);
  }
  if (error instanceof MissingSessionError) {
    return CODE_MAP.auth_required;
  }
  const code = error?.code || String(error?.message || "");
  if (CODE_MAP[code]) return CODE_MAP[code];
  if (error?.status === 422) return "Revisa la información ingresada.";
  if (error?.status === 401) return CODE_MAP.auth_required;
  return "No pudimos completar la solicitud. Intenta nuevamente.";
}

// Maps the same errors to a coarse UI state so callers can decide whether
// to allow retry, block continuation entirely, or bounce back to login.
export function classifyProfileError(error) {
  const code = error?.code || String(error?.message || "");
  if (error instanceof MissingSessionError || code === "auth_required" || error?.status === 401) {
    return "auth_required";
  }
  if (code === "customer_contact_conflict") {
    return "conflict";
  }
  return "error";
}
