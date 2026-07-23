// Only membershipPlanId/serviceId ever live here — never price, currency,
// benefits, trial, a Stripe session_url, or anything auth-related. The
// backend (via getMembershipPlanSelection) stays the sole authority on the
// plan's actual terms; this is purely "which plan/service was the visitor
// looking at" so a reload or a magic-link redirect back to /membresias/
// checkout doesn't strand them at "Selecciona un plan primero".
const STORAGE_KEY = "ideas_membership_checkout_selection_v1";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function saveMembershipCheckoutSelection({ membershipPlanId, serviceId }) {
  if (!isNonEmptyString(membershipPlanId) || !isNonEmptyString(serviceId)) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ membershipPlanId, serviceId }));
  } catch {
    // Storage unavailable (private browsing, quota) — non-fatal, just no restore.
  }
}

export function readMembershipCheckoutSelection() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Rejects objects, numbers, arrays and blank strings, not just
    // falsy/missing values — a stray number or array here would otherwise
    // sail through a plain truthiness check and reach getMembershipPlanSelection.
    if (!isNonEmptyString(parsed?.membershipPlanId) || !isNonEmptyString(parsed?.serviceId)) {
      clearMembershipCheckoutSelection();
      return null;
    }
    return { membershipPlanId: parsed.membershipPlanId, serviceId: parsed.serviceId };
  } catch {
    clearMembershipCheckoutSelection();
    return null;
  }
}

export function clearMembershipCheckoutSelection() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // non-fatal
  }
}
