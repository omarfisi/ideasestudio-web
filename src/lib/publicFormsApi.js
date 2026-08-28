import { appendWorkspace } from "@/lib/workspace.js";

function cleanBase(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

export function isLocalHost(hostname) {
  const normalized = String(hostname || "").trim().toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

export function isPrivateLanHost(hostname) {
  const normalized = String(hostname || "").trim().toLowerCase();
  if (isLocalHost(normalized)) return false;
  const octets = normalized.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }
  return octets[0] === 10 || octets[0] === 192 && octets[1] === 168 ||
    octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31;
}

export function resolvePublicFormsApiBase({ hostname, crmBase, apiBase } = {}) {
  if (isLocalHost(hostname)) {
    // Never fall back to `origin` here: Vite's dev server proxies /api and
    // /public straight to production (see vite.config.js). Falling back to
    // origin on a missing crmBase/apiBase would silently route the request
    // through that proxy and create the submission remotely, while /prechat
    // (which always uses an absolute VITE_CRM_BASE_URL, no fallback) verifies
    // it against the local database — the exact split that produced "Envío
    // no encontrado." An empty config here must fail closed instead (see
    // apiBase() below), never silently resolve to something that reaches
    // production.
    return cleanBase(crmBase) || cleanBase(apiBase);
  }

  // A Vite dev server opened from a private LAN address must use its own
  // relative /api and /public paths. Absolute 127.0.0.1 URLs point back to
  // the phone, not to the Mac running the backend, and bypass Vite's proxy.
  if (isPrivateLanHost(hostname)) return "";

  return cleanBase(apiBase) || cleanBase(crmBase);
}

function getPublicFormsApiBase() {
  const env = import.meta.env || {};
  const location = typeof window !== "undefined" ? window.location : null;
  return resolvePublicFormsApiBase({
    hostname: location?.hostname,
    crmBase: env.VITE_CRM_BASE_URL,
    apiBase: env.VITE_API_BASE,
  });
}

function apiBase() {
  const resolved = getPublicFormsApiBase();
  if (resolved) return resolved;
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  if (isLocalHost(hostname)) {
    // Fail closed in local dev: never silently fall back to production —
    // that's exactly the bug that let a local form submission get created
    // remotely while /prechat verified it against the local database.
    throw new Error(
      "Falta VITE_CRM_BASE_URL/VITE_API_BASE. Define la URL del backend local en tu .env."
    );
  }
  if (isPrivateLanHost(hostname)) return "";
  return "https://api.ideasestudio.com";
}

async function _apiFetch(path, opts = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  let res;
  try {
    res = await fetch(`${apiBase()}${appendWorkspace(path)}`, {
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      signal: controller.signal,
      ...opts,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const detail = data?.detail || data?.message || "Error en la solicitud.";
    const error = new Error(detail);
    error.status = res.status;
    throw error;
  }
  return data;
}

export async function getFormByPlacement(sectionKey) {
  return _apiFetch(`/api/public/forms/placement/${encodeURIComponent(sectionKey)}`);
}

export async function getFormBySlug(slug) {
  return getPublicForm(slug);
}

export async function submitForm(payload) {
  const body = {
    ...payload,
    honeypot: payload.honeypot ?? "",
    submit_timestamp: payload.submit_timestamp ?? Date.now(),
    page_url: payload.page_url ?? (typeof window !== "undefined" ? window.location.href : ""),
    referrer: payload.referrer ?? (typeof document !== "undefined" ? document.referrer || "" : ""),
  };
  return _apiFetch("/api/public/forms/submit", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function _publicFetch(path, opts = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  let res;
  try {
    res = await fetch(`${apiBase()}${path}`, {
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      signal: controller.signal,
      ...opts,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const detail = data?.detail || data?.message || "Error en la solicitud.";
    const error = new Error(detail);
    error.status = res.status;
    throw error;
  }
  return data;
}

export async function getPublicForm(slug) {
  return _publicFetch(`/public/forms/${encodeURIComponent(slug)}`);
}

export async function getPublicFormLanding(slug) {
  return _publicFetch(`/public/form-landings/${encodeURIComponent(slug)}`);
}

export async function getPublicFormLandingByFormSlug(formSlug) {
  return _publicFetch(`/public/form-landings/by-form/${encodeURIComponent(formSlug)}`);
}

export async function submitPublicForm(slug, payload) {
  const body = {
    ...payload,
    honeypot: payload.honeypot ?? "",
    submit_timestamp: payload.submit_timestamp ?? Date.now(),
    page_url: payload.page_url ?? (typeof window !== "undefined" ? window.location.href : ""),
    referrer: payload.referrer ?? (typeof document !== "undefined" ? document.referrer || "" : ""),
  };
  return _apiFetch(`/api/public/forms/${encodeURIComponent(slug)}/submit`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
