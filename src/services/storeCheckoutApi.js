import { CRM_PUBLIC_API_BASE_URL } from "@/lib/constants.js";

function getStoreBaseUrl() {
  const base = (CRM_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");

  if (!base) {
    throw new Error(
      "Falta VITE_CRM_BASE_URL. Define la URL del backend CRM en tu .env."
    );
  }

  return `${base}/api/store`;
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

async function storeFetch(path, { query = undefined, ...options } = {}) {
  const url = buildStoreUrl(path, query || {});
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
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
    },
  });
}

export async function getStoreProductBySlug(slug) {
  return storeFetch(`/products/${slug}`, { method: "GET" });
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
  if (!cartId && !cartToken) {
    throw new Error("cartId o cartToken es requerido para consultar el carrito.");
  }

  return storeFetch("/cart/current", {
    method: "GET",
    query: {
      cart_id: cartId || null,
      cart_token: cartToken || null,
    },
  });
}

export async function addStoreCartItem({ cartId, productId, quantity = 1 }) {
  return storeFetch("/cart/items", {
    method: "POST",
    body: JSON.stringify({
      cart_id: cartId,
      product_id: productId,
      quantity,
    }),
  });
}

export async function updateStoreCartItem({ itemId, quantity }) {
  return storeFetch(`/cart/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export async function deleteStoreCartItem({ itemId }) {
  return storeFetch(`/cart/items/${itemId}`, {
    method: "DELETE",
  });
}

export async function createStoreOrder(payload) {
  return storeFetch("/checkout/create-order", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createStorePaymentIntent({ orderId, provider = "stripe" }) {
  return storeFetch("/payments/create-intent", {
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      provider,
    }),
  });
}

export async function getStoreOrderById(orderId) {
  return storeFetch(`/orders/${orderId}`, { method: "GET" });
}

export async function getStoreOrderByNumber(orderNumber) {
  return storeFetch(`/orders/by-number/${orderNumber}`, { method: "GET" });
}

export async function validateStoreCoupon({ code, orderAmount, currency = "USD" }) {
  return storeFetch("/coupons/validate", {
    method: "POST",
    body: JSON.stringify({ code, order_amount: orderAmount, currency }),
  });
}
