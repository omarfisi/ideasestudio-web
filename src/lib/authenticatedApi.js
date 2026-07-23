import { supabase } from "@/lib/supabaseClient.js";
import { CRM_PUBLIC_API_BASE_URL } from "@/lib/constants.js";

// Fase 3 — customer profile/membership integration. Supabase remains the
// sole owner of session state (persistSession/autoRefreshToken already on
// in supabaseClient.js): nothing here ever writes a token to
// sessionStorage/localStorage, and every call re-reads the CURRENT session
// from supabase.auth.getSession() right before the request — never a
// cached/stale token held in module state.

export class MissingSessionError extends Error {
  constructor() {
    super("missing_session");
    this.name = "MissingSessionError";
  }
}

// Normalized error every authenticatedFetch caller can rely on: `.code` is
// always the backend's own stable detail string (e.g.
// "customer_email_mismatch") or a fixed http_<status>/network_error
// fallback — never a raw response body, HTML page, or stack trace.
export class ApiRequestError extends Error {
  constructor(code, status) {
    super(code);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }
}

function getBaseUrl() {
  const base = (CRM_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
  if (!base) {
    throw new Error("Falta VITE_CRM_BASE_URL. Define la URL del backend CRM en tu .env.");
  }
  return base;
}

// getSession() reads the SDK's already-persisted/auto-refreshed session
// from memory/storage — it does not itself make a network call the way
// getUser() does, so this is safe to call before every single request
// without adding a round-trip per call.
export async function getCurrentAccessToken() {
  if (!supabase) throw new MissingSessionError();
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new MissingSessionError();
  return token;
}

export function buildAuthenticatedHeaders(accessToken, extraHeaders = {}) {
  return {
    "Content-Type": "application/json",
    ...extraHeaders,
    Authorization: `Bearer ${accessToken}`,
  };
}

async function parseJsonSafe(response) {
  const text = await response.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // Never surfaces raw HTML (e.g. a proxy error page) as the error body.
    return null;
  }
}

/**
 * Central authenticated request wrapper for the membership customer-
 * profile/checkout endpoints. Always re-reads the access token immediately
 * before sending the request (never a token captured earlier and reused).
 *
 * retryOn401 (default false): after a 401, calls supabase.auth.refreshSession()
 * and retries EXACTLY once with the refreshed token — never a loop, never a
 * second retry. Reserved for idempotent GETs (profile/membership reads);
 * mutating calls (resolve, patch, checkout) never opt in, so a request that
 * may have already taken effect server-side is never silently repeated.
 */
export async function authenticatedFetch(path, options = {}) {
  const { retryOn401 = false, headers: extraHeaders, ...fetchOptions } = options;

  const token = await getCurrentAccessToken(); // throws MissingSessionError before any network call
  const url = `${getBaseUrl()}${path}`;

  async function send(accessToken) {
    try {
      return await fetch(url, {
        ...fetchOptions,
        headers: buildAuthenticatedHeaders(accessToken, extraHeaders),
      });
    } catch {
      throw new ApiRequestError("network_error", 0);
    }
  }

  let response = await send(token);

  if (response.status === 401 && retryOn401 && supabase) {
    const refreshed = await supabase.auth.refreshSession().catch(() => null);
    const refreshedToken = refreshed?.data?.session?.access_token;
    if (refreshedToken) {
      response = await send(refreshedToken);
    }
  }

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    const code = (data && typeof data.detail === "string" && data.detail) || `http_${response.status}`;
    throw new ApiRequestError(code, response.status);
  }

  return data;
}

// ── In-flight request de-duplication ────────────────────────────────────
//
// React StrictMode's dev-only mount→cleanup→remount simulation runs an
// effect's setup twice back-to-back — a naive fire-and-forget call inside
// that effect sends the underlying network request twice for real (a
// `cancelled` flag only suppresses the resulting setState, never the
// actual fetch). dedupeByKey shares the SAME in-flight promise across both
// invocations instead of starting a second request.
const _inFlightByKey = new Map();

export function dedupeByKey(key, factory) {
  const existing = _inFlightByKey.get(key);
  if (existing) return existing;

  const promise = Promise.resolve()
    .then(factory)
    .finally(() => {
      _inFlightByKey.delete(key);
    });
  _inFlightByKey.set(key, promise);
  return promise;
}

// ── Customer profile / membership API (Fase 3) ──────────────────────────
//
// None of these ever accept/send email, contact_id, workspace_id, user_id
// or auth_user_id from the caller — identity is always the Authorization
// header's JWT, resolved server-side. Every payload here is built from an
// explicit allow-list, never a spread of an arbitrary caller-supplied object.

export async function resolveCustomerProfile({ name, phone } = {}) {
  const payload = {};
  if (name) payload.name = name;
  if (phone) payload.phone = phone;
  return authenticatedFetch("/public/customer-profile/resolve", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCustomerProfile() {
  return authenticatedFetch("/public/customer-profile/me", { retryOn401: true });
}

export async function updateCustomerProfile({ name, phone } = {}) {
  const payload = {};
  if (name !== undefined) payload.name = name;
  if (phone !== undefined) payload.phone = phone;
  return authenticatedFetch("/public/customer-profile/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getMyMembership() {
  return authenticatedFetch("/public/my-membership", { retryOn401: true });
}
