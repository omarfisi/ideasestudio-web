import { appendWorkspace } from "@/lib/workspace.js";

const CRM_BASE =
  (typeof import.meta !== "undefined" && import.meta?.env?.VITE_CRM_BASE_URL) ||
  "https://ideasestudio-api.onrender.com";

async function _apiFetch(path, opts = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  let res;
  try {
    res = await fetch(`${CRM_BASE}${appendWorkspace(path)}`, {
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
    throw new Error(detail);
  }
  return data;
}

export async function getFormByPlacement(sectionKey) {
  return _apiFetch(`/api/public/forms/placement/${encodeURIComponent(sectionKey)}`);
}

export async function getFormBySlug(slug) {
  return _apiFetch(`/api/public/forms/by-slug/${encodeURIComponent(slug)}`);
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
