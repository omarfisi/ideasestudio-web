import { CRM_PUBLIC_API_BASE_URL } from "@/lib/constants.js";
import { supabase } from "@/lib/supabaseClient.js";

function getBaseUrl() {
  return (CRM_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
}

async function _getAuthToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function accountFetch(path, options = {}) {
  const token = await _getAuthToken();
  if (!token) {
    throw new Error("Sesión no encontrada. Inicia sesión para continuar.");
  }

  const url = `${getBaseUrl()}/api/store${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = body?.detail || body?.message || res.statusText;
    throw new Error(detail);
  }

  return res.json();
}

export async function getMyProfile() {
  return accountFetch("/my/profile");
}

export async function getMyOrders() {
  return accountFetch("/my/orders");
}

export async function getMyOrderDetail(orderId) {
  return accountFetch(`/my/orders/${orderId}`);
}

export async function postMyOrderPaymentSession(orderId) {
  return accountFetch(`/my/orders/${orderId}/payment-session`, { method: "POST" });
}

export async function postMyOrderReschedule(orderId, startsAt) {
  return accountFetch(`/my/orders/${orderId}/reschedule`, {
    method: "POST",
    body: JSON.stringify({ starts_at: startsAt }),
  });
}

export async function cancelMyOrder(orderId, reason) {
  return accountFetch(`/my/orders/${orderId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason: reason || null }),
  });
}
