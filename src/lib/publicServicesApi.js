import { CRM_PUBLIC_API_BASE_URL } from "@/lib/constants.js";

function base() {
  return (CRM_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
}

async function pub(path, options = {}) {
  const url = `${base()}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.ok === false) {
    const msg = data?.detail || data?.message || data?.error || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function getPublicServiceBooking(slug) {
  return pub(`/public/services/${encodeURIComponent(slug)}/booking`);
}

export async function getPublicServiceAvailability(slug, from, to) {
  const params = new URLSearchParams({ from, to });
  return pub(`/public/services/${encodeURIComponent(slug)}/availability?${params}`);
}

export async function createPublicServiceReservation(slug, payload) {
  return pub(`/public/services/${encodeURIComponent(slug)}/reservations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
