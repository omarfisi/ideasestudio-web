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

/**
 * Authoritative availability — accounts for the selected package and
 * duration-affecting addons, unlike the legacy GET above (base service
 * duration only). This is the version the booking panel should call by
 * default; GET stays as an explicit fallback for compatibility only.
 */
export async function getPublicServiceAvailabilityAuthoritative(
  slug,
  { fromDate, toDate, packageId = null, selectedAddons = [] }
) {
  return pub(`/public/services/${encodeURIComponent(slug)}/availability`, {
    method: "POST",
    body: JSON.stringify({
      from_date: fromDate,
      to_date: toDate,
      package_id: packageId,
      selected_addons: selectedAddons,
    }),
  });
}

export async function createPublicServiceReservation(slug, payload) {
  return pub(`/public/services/${encodeURIComponent(slug)}/reservations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
