import { AuthRequestTimeoutError } from "@/lib/authRequestTimeout.js";

// Never surfaces a raw Supabase error message — only a fixed, friendly
// string ever reaches the UI. An unrecognized error collapses to a single
// generic fallback rather than risking a leaked internal detail.
const MESSAGE_MAP = [
  [/invalid login credentials/i, "Credenciales inválidas."],
  [/email not confirmed/i, "El correo todavía no ha sido confirmado."],
  [/user already registered|already.*registered/i, "Ya existe una cuenta con este correo."],
  [/password.*(least|character|weak|short)/i, "La contraseña no cumple los requisitos."],
  [/rate limit|too many requests/i, "Se realizaron demasiados intentos. Intenta más tarde."],
  [/session.*expired|jwt expired/i, "La sesión expiró. Inicia sesión nuevamente."],
];

export const GENERIC_AUTH_ERROR_MESSAGE = "No pudimos completar la solicitud. Intenta nuevamente.";

export function translateSupabaseAuthError(error) {
  // Checked by type, not by matching "AUTH_REQUEST_TIMEOUT" against the
  // string patterns below — this is a client-side timeout, never a
  // Supabase error, and deserves its own exact wording rather than
  // falling through to the generic fallback.
  if (error instanceof AuthRequestTimeoutError) {
    return "No pudimos comunicarnos con el servicio de acceso. Intenta nuevamente.";
  }
  const raw = String(error?.message || "");
  for (const [pattern, friendly] of MESSAGE_MAP) {
    if (pattern.test(raw)) return friendly;
  }
  return GENERIC_AUTH_ERROR_MESSAGE;
}
