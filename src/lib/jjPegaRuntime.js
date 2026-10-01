const env = typeof import.meta !== "undefined" ? import.meta.env || {} : {};

const clean = (value) => String(value || "").trim().replace(/\/+$/, "");

export const JJ_PEGA_API_BASE = clean(
  env.VITE_JJ_PEGA_API_BASE || env.VITE_JJ_PEGA_CRM_BASE_URL,
);
export const JJ_PEGA_WORKSPACE_ID = String(env.VITE_JJ_PEGA_WORKSPACE_ID || "").trim();
export const JJ_PEGA_SUPABASE_URL = clean(env.VITE_JJ_PEGA_SUPABASE_URL);
export const JJ_PEGA_SUPABASE_ANON_KEY = String(env.VITE_JJ_PEGA_SUPABASE_ANON_KEY || "").trim();
export const JJ_PEGA_STRIPE_PUBLISHABLE_KEY = String(
  env.VITE_JJ_PEGA_STRIPE_PUBLISHABLE_KEY || "",
).trim();

export function requireJJPegaWorkspace() {
  if (!JJ_PEGA_WORKSPACE_ID) {
    throw new Error("Falta VITE_JJ_PEGA_WORKSPACE_ID para ejecutar el stack de JJ Pega.");
  }
  return JJ_PEGA_WORKSPACE_ID;
}

export function requireJJPegaApiBase() {
  if (!JJ_PEGA_API_BASE) {
    throw new Error("Falta VITE_JJ_PEGA_API_BASE para ejecutar el stack de JJ Pega.");
  }
  return JJ_PEGA_API_BASE;
}
