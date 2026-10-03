import { CRM_PUBLIC_API_BASE_URL } from "@/lib/constants.js";
import { PUBLIC_WORKSPACE_ID } from "@/lib/workspace.js";
import { supabase } from "@/lib/supabaseClient.js";

function getStoreBaseUrl() {
  const base = (CRM_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");

  if (!base) {
    throw new Error(
      "Falta VITE_CRM_BASE_URL. Define la URL del backend CRM en tu .env."
    );
  }

  return `${base}/api/store`;
}

function getLocalWorkspaceOverride() {
  const workspaceId = String(PUBLIC_WORKSPACE_ID || "").trim();
  if (!workspaceId) return undefined;

  try {
    const hostname = new URL(CRM_PUBLIC_API_BASE_URL).hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return workspaceId;
    }
  } catch {
    // Invalid/missing API base is handled by getStoreBaseUrl().
  }

  return undefined;
}

function buildStoreUrl(path, query = {}) {
  const url = new URL(`${getStoreBaseUrl()}${path}`);

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

// Never throws, never blocks checkout: a guest has no session (null is the
// normal case), and a broken/expired token should degrade to "send no
// header" rather than fail the request — the backend already treats a
// missing/invalid Authorization header as a guest (see
// optional_current_user on the backend).
async function _getOptionalAuthToken() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

async function storeFetch(path, { query = undefined, withAuth = false, ...options } = {}) {
  const url = buildStoreUrl(path, query || {});
  const authToken = withAuth ? await _getOptionalAuthToken() : null;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.ok === false) {
    const message =
      data?.message ||
      data?.detail ||
      data?.error ||
      `Request failed with status ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function getStoreCategories({ includeInactive = false } = {}) {
  return storeFetch("/categories", {
    method: "GET",
    query: {
      include_inactive: includeInactive ? "true" : undefined,
      workspace_id: getLocalWorkspaceOverride(),
    },
  });
}

export async function getStoreProducts(filters = {}) {
  return storeFetch("/products", {
    method: "GET",
    query: {
      category_slug:
        filters.category && filters.category !== "all" ? filters.category : null,
      product_type:
        filters.productType && filters.productType !== "all"
          ? filters.productType
          : null,
      q: filters.search || null,
      include_inactive: filters.isActive === false ? "true" : undefined,
      limit: filters.limit || 60,
      offset: filters.offset || 0,
      workspace_id: getLocalWorkspaceOverride(),
    },
  });
}

export async function getStoreProductBySlug(slug) {
  return storeFetch(`/products/${slug}`, {
    method: "GET",
    query: { workspace_id: getLocalWorkspaceOverride() },
  });
}

export async function resolveStoreCart({
  cartToken = null,
  sessionId = null,
  userId = null,
  contactId = null,
  currency = "USD",
} = {}) {
  return storeFetch("/cart/resolve", {
    method: "POST",
    body: JSON.stringify({
      cart_token: cartToken || null,
      session_id: sessionId || null,
      user_id: userId || null,
      contact_id: contactId || null,
      currency,
    }),
  });
}

export async function getStoreCartCurrent({ cartId = null, cartToken = null } = {}) {
  if (!cartToken) {
    throw new Error("cartToken es requerido para consultar el carrito.");
  }

  return storeFetch("/cart/current", {
    method: "GET",
    query: {
      cart_id: cartId || null,
      cart_token: cartToken,
    },
  });
}

export async function addStoreCartItem({ cartId, cartToken, productId, quantity = 1 }) {
  if (!cartToken) throw new Error("cartToken es requerido para modificar el carrito.");
  return storeFetch("/cart/items", {
    method: "POST",
    headers: { "X-Cart-Token": cartToken },
    body: JSON.stringify({
      cart_id: cartId,
      product_id: productId,
      quantity,
    }),
  });
}

export async function updateStoreCartItem({ itemId, cartToken, quantity }) {
  if (!cartToken) throw new Error("cartToken es requerido para modificar el carrito.");
  return storeFetch(`/cart/items/${itemId}`, {
    method: "PATCH",
    headers: { "X-Cart-Token": cartToken },
    body: JSON.stringify({ quantity }),
  });
}

export async function deleteStoreCartItem({ itemId, cartToken }) {
  if (!cartToken) throw new Error("cartToken es requerido para modificar el carrito.");
  return storeFetch(`/cart/items/${itemId}`, {
    method: "DELETE",
    headers: { "X-Cart-Token": cartToken },
  });
}

export async function createStoreOrder(payload, { cartToken = null } = {}) {
  // withAuth: if the customer is logged in, the backend links the created/
  // found contact to their account (contacts.user_id) — see
  // resolve_customer_contact on the backend. Guests (no session) still work
  // exactly as before; the backend treats a missing token as a guest.
  return storeFetch("/checkout/create-order", {
    method: "POST",
    withAuth: true,
    headers: cartToken ? { "X-Cart-Token": cartToken } : undefined,
    body: JSON.stringify(payload),
  });
}

export async function createStorePaymentIntent({ orderId, provider = "stripe", cartToken = null }) {
  return storeFetch("/payments/create-intent", {
    method: "POST",
    headers: cartToken ? { "X-Cart-Token": cartToken } : undefined,
    body: JSON.stringify({
      order_id: orderId,
      provider,
    }),
  });
}

export async function getStoreOrderById(orderId, { cartToken = null } = {}) {
  return storeFetch(`/orders/${orderId}`, {
    method: "GET",
    headers: cartToken ? { "X-Cart-Token": cartToken } : undefined,
  });
}

export async function getStoreOrderByNumber(orderNumber, { cartToken = null } = {}) {
  return storeFetch(`/orders/by-number/${orderNumber}`, {
    method: "GET",
    headers: cartToken ? { "X-Cart-Token": cartToken } : undefined,
  });
}

export async function validateStoreCoupon({ code, orderAmount, currency = "USD" }) {
  return storeFetch("/coupons/validate", {
    method: "POST",
    body: JSON.stringify({ code, order_amount: orderAmount, currency }),
  });
}
