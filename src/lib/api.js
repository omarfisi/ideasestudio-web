import { CRM_PUBLIC_API_BASE_URL } from "@/lib/constants.js";
import { getClientRouteByKey } from "@/data/routes.js";

function getBaseUrl() {
  return (CRM_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function sanitizeLeadTag(value) {
  const normalized = normalizeText(value).replace(/[^a-z0-9]+/g, "_");
  const cleaned = normalized.replace(/^_+|_+$/g, "");
  return cleaned || null;
}

function buildUrl(path, query = {}) {
  const base = getBaseUrl();

  if (!base) {
    throw new Error(
      "Falta VITE_CRM_BASE_URL. Define la URL del backend CRM en tu .env."
    );
  }

  const url = new URL(`${base}${path}`);

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

async function apiFetch(url, options = {}) {
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

function normalizeCategory(rawCategory) {
  const value = normalizeText(rawCategory);

  if (value === "branding_diseno") return "branding_design";
  if (value === "branding") return "branding_design";
  if (value === "fotografia") return "photography";
  if (value === "fotografia profesional") return "photography";
  if (value === "marketing_digital") return "marketing";
  if (value === "social_media") return "social_media";
  if (value === "video") return "video";
  if (value === "web") return "web";
  if (value === "otros") return "others";

  return value || "service";
}

function inferSaleType(raw) {
  const name = normalizeText(raw?.name);
  const serviceType = normalizeText(raw?.service_type);
  const category = normalizeCategory(raw?.category);

  if (serviceType === "subscription") {
    return "quote_only";
  }

  if (
    name.includes("boda") ||
    name.includes("evento") ||
    name.includes("cumple") ||
    name.includes("love story")
  ) {
    return "deposit_booking";
  }

  if (category === "photography") {
    return "buy_now";
  }

  if (
    category === "web" ||
    category === "video" ||
    category === "branding_design" ||
    category === "marketing" ||
    category === "social_media"
  ) {
    return "quote_only";
  }

  return "quote_only";
}

function inferClientTypes(raw) {
  const name = normalizeText(raw?.name);
  const category = normalizeCategory(raw?.category);
  const types = new Set();

  if (
    name.includes("boda") ||
    name.includes("love story") ||
    name.includes("embarazo") ||
    name.includes("cumple") ||
    name.includes("graduacion")
  ) {
    types.add("weddings_events_sessions");
  }

  if (
    category === "photography" &&
    (name.includes("producto") || name.includes("eventos"))
  ) {
    types.add("small_business");
    types.add("emerging_business");
  }

  if (
    category === "branding_design" ||
    category === "web" ||
    category === "marketing" ||
    category === "social_media" ||
    category === "video"
  ) {
    types.add("small_business");
    types.add("entrepreneur");
  }

  if (
    category === "branding_design" ||
    category === "web" ||
    category === "video"
  ) {
    types.add("emerging_business");
  }

  if (
    category === "photography" &&
    (name.includes("estudio") || name.includes("exterior"))
  ) {
    types.add("entrepreneur");
    types.add("weddings_events_sessions");
  }

  if (types.size === 0) {
    types.add("small_business");
  }

  return Array.from(types);
}

function inferFeatured(raw) {
  if (raw?.featured !== undefined) {
    return Boolean(raw.featured);
  }

  if (raw?.is_featured !== undefined) {
    return Boolean(raw.is_featured);
  }

  return Boolean(raw?.is_active);
}

function getIncludes(raw) {
  const schema = raw?.details_schema || {};

  if (Array.isArray(schema.includes_items) && schema.includes_items.length) {
    return schema.includes_items;
  }

  if (Array.isArray(schema.includes) && schema.includes.length) {
    return schema.includes;
  }

  return [];
}

function getDescription(raw) {
  return (
    raw?.long_description ||
    raw?.details_schema?.long_description ||
    raw?.details_schema?.summary ||
    raw?.full_description ||
    raw?.short_description ||
    raw?.name ||
    ""
  );
}

function getShortDescription(raw) {
  return (
    raw?.details_schema?.summary ||
    raw?.short_description ||
    raw?.details_schema?.short_description ||
    raw?.name ||
    ""
  );
}

function getGallery(raw, includes) {
  if (Array.isArray(raw?.gallery) && raw.gallery.length) {
    return raw.gallery;
  }

  const fromIncludes = includes.slice(0, 3);
  if (fromIncludes.length) {
    return fromIncludes;
  }

  const fallback = [
    raw?.details_schema?.title,
    raw?.category,
    raw?.service_type,
  ].filter(Boolean);

  return fallback.length ? fallback : ["Servicio", "Detalle", "Informacion"];
}

function getDeliveryTime(raw) {
  const days = raw?.default_duration_days;

  if (days === null || days === undefined) {
    return "A coordinar";
  }

  if (Number(days) === 1) {
    return "1 dia";
  }

  return `${days} dias`;
}

function normalizeDetailsSchema(raw) {
  const includes = getIncludes(raw);

  return {
    title: raw?.details_schema?.title || raw?.name || "Servicio",
    summary: raw?.details_schema?.summary || getShortDescription(raw),
    includes,
  };
}

function normalizeService(raw) {
  if (!raw) {
    return null;
  }

  const includes = getIncludes(raw);
  const detailsSchema = normalizeDetailsSchema(raw);
  const basePrice = Number(raw.base_price ?? 0);
  const currency = raw.currency || "USD";
  const isActive = Boolean(raw.is_active);

  return {
    id: raw.id,
    name: raw.name || "Servicio",
    slug: raw.slug,
    category: normalizeCategory(raw.category),
    rawCategory: raw.category || null,
    clientTypes: inferClientTypes(raw),
    saleType: inferSaleType(raw),
    serviceType: raw.service_type || null,
    basePrice,
    price: basePrice,
    currency,
    isActive,
    serviceTag: raw.service_tag || raw.slug || null,
    templateId: raw.template_id || null,
    shortDescription: getShortDescription(raw),
    description: getDescription(raw),
    longDescription: getDescription(raw),
    includes,
    featured: inferFeatured(raw),
    status: isActive ? "active" : "inactive",
    detailsSchema,
    image: detailsSchema.summary || raw?.name || "",
    gallery: getGallery(raw, includes),
    deliveryTime: getDeliveryTime(raw),
    raw,
  };
}

function normalizeServiceCategory(raw) {
  if (!raw) {
    return null;
  }

  return {
    id: raw.id || raw.code,
    code: raw.code,
    label: raw.label || raw.name || raw.code || "Categoria",
    description: raw.description || "",
    isActive: raw.is_active !== false,
    position: Number(raw.position ?? 100),
    raw,
  };
}

const STORE_CART_SESSION_KEY = "ideas_store_cart_session_token";

function normalizeProductCategory(raw) {
  if (!raw) {
    return null;
  }

  return {
    id: raw.id,
    name: raw.name || raw.label || "Categoria",
    slug: raw.slug || raw.code || null,
    description: raw.description || "",
    isActive: raw.is_active !== false,
    sortOrder: Number(raw.sort_order ?? raw.position ?? 100),
    raw,
  };
}

function normalizeProduct(raw) {
  if (!raw) {
    return null;
  }

  const category = normalizeProductCategory(raw.category);
  const gallery = Array.isArray(raw.gallery) ? raw.gallery.filter(Boolean) : [];

  return {
    id: raw.id,
    name: raw.name || "Producto",
    slug: raw.slug,
    categoryId: raw.category_id || category?.id || null,
    category,
    shortDescription: raw.short_description || "",
    longDescription:
      raw.long_description || raw.short_description || raw.name || "",
    price: Number(raw.price ?? 0),
    currency: raw.currency || "USD",
    compareAtPrice:
      raw.compare_at_price === null || raw.compare_at_price === undefined
        ? null
        : Number(raw.compare_at_price),
    sku: raw.sku || null,
    inventoryQty:
      raw.inventory_qty === null || raw.inventory_qty === undefined
        ? null
        : Number(raw.inventory_qty),
    trackInventory: Boolean(raw.track_inventory),
    isActive: raw.is_active !== false,
    productType: raw.product_type || "digital",
    coverImage: raw.cover_image || null,
    gallery,
    metadata:
      raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {},
    createdAt: raw.created_at || null,
    updatedAt: raw.updated_at || null,
    raw,
  };
}

function normalizeCartItem(raw) {
  if (!raw) {
    return null;
  }

  return {
    id: raw.id,
    cartSessionId: raw.cart_session_id || null,
    productId: raw.product_id || raw.productId || null,
    quantity: Number(raw.quantity ?? 0),
    unitPrice: Number(raw.unit_price ?? raw.unitPrice ?? 0),
    lineTotal: Number(raw.line_total ?? raw.lineTotal ?? 0),
    currency: raw.currency || "USD",
    snapshotName: raw.snapshot_name || raw.snapshotName || "Producto",
    snapshotDescription:
      raw.snapshot_description || raw.snapshotDescription || "",
    metadata:
      raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {},
    product: normalizeProduct(raw.product),
    createdAt: raw.created_at || null,
    updatedAt: raw.updated_at || null,
  };
}

function normalizeCart(raw) {
  if (!raw) {
    return null;
  }

  const items = Array.isArray(raw.items)
    ? raw.items.map(normalizeCartItem).filter(Boolean)
    : [];
  const summary = raw.summary && typeof raw.summary === "object" ? raw.summary : {};

  return {
    id: raw.id,
    sessionToken: raw.session_token || raw.sessionToken || null,
    contactId: raw.contact_id || raw.contactId || null,
    email: raw.email || null,
    status: raw.status || "active",
    metadata:
      raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {},
    createdAt: raw.created_at || null,
    updatedAt: raw.updated_at || null,
    items,
    summary: {
      lineItems: Number(summary.line_items ?? items.length),
      totalQuantity: Number(
        summary.total_quantity ??
          items.reduce((total, item) => total + item.quantity, 0)
      ),
      subtotal: Number(
        summary.subtotal ??
          items.reduce((total, item) => total + item.lineTotal, 0)
      ),
      currency: summary.currency || items[0]?.currency || "USD",
    },
  };
}

function normalizeOrderItem(raw) {
  if (!raw) {
    return null;
  }

  return {
    id: raw.id,
    orderId: raw.order_id || raw.orderId || null,
    productId: raw.product_id || raw.productId || null,
    quantity: Number(raw.quantity ?? 0),
    unitPrice: Number(raw.unit_price ?? raw.unitPrice ?? 0),
    total: Number(raw.total ?? 0),
    snapshotName: raw.snapshot_name || raw.snapshotName || "Producto",
    snapshotDescription:
      raw.snapshot_description || raw.snapshotDescription || "",
    metadata:
      raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {},
    product: normalizeProduct(raw.product),
    createdAt: raw.created_at || null,
    updatedAt: raw.updated_at || null,
  };
}

function normalizeOrder(raw) {
  if (!raw) {
    return null;
  }

  const items = Array.isArray(raw.items)
    ? raw.items.map(normalizeOrderItem).filter(Boolean)
    : [];
  const summary = raw.summary && typeof raw.summary === "object" ? raw.summary : {};

  return {
    id: raw.id,
    orderNumber: raw.order_number || raw.orderNumber || null,
    contactId: raw.contact_id || raw.contactId || null,
    cartSessionId: raw.cart_session_id || raw.cartSessionId || null,
    email: raw.email || null,
    status: raw.status || "pending",
    paymentStatus: raw.payment_status || raw.paymentStatus || "pending_payment",
    fulfillmentStatus:
      raw.fulfillment_status || raw.fulfillmentStatus || "not_applicable",
    currency: raw.currency || "USD",
    subtotal: Number(raw.subtotal ?? 0),
    taxTotal: Number(raw.tax_total ?? raw.taxTotal ?? 0),
    discountTotal: Number(raw.discount_total ?? raw.discountTotal ?? 0),
    total: Number(raw.total ?? 0),
    notes: raw.notes || "",
    source: raw.source || "",
    metadata:
      raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {},
    createdAt: raw.created_at || null,
    updatedAt: raw.updated_at || null,
    items,
    summary: {
      lineItems: Number(summary.line_items ?? items.length),
      totalQuantity: Number(
        summary.total_quantity ??
          items.reduce((total, item) => total + item.quantity, 0)
      ),
    },
  };
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function getStoredCartSessionToken() {
  const storage = getStorage();
  return storage ? storage.getItem(STORE_CART_SESSION_KEY) : null;
}

export function setStoredCartSessionToken(sessionToken) {
  const storage = getStorage();
  if (!storage || !sessionToken) {
    return;
  }

  storage.setItem(STORE_CART_SESSION_KEY, sessionToken);
}

export function clearStoredCartSessionToken() {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(STORE_CART_SESSION_KEY);
}

function serializeCartItems(items = []) {
  return items
    .map((item) => {
      const productId = item.productId || item.product_id || item.product?.id;
      const productSlug =
        item.productSlug || item.product_slug || item.product?.slug;
      const quantity = Number(item.quantity ?? 0);

      if (!quantity || (!productId && !productSlug)) {
        return null;
      }

      return {
        product_id: productId || undefined,
        product_slug: productSlug || undefined,
        quantity,
      };
    })
    .filter(Boolean);
}

function normalizeCatalogResponse(data, limit) {
  const items = Array.isArray(data?.items)
    ? data.items.map(normalizeService).filter(Boolean)
    : [];

  return {
    items,
    total: Number(data?.total ?? items.length),
    limit: Number(data?.limit ?? limit ?? items.length),
    offset: Number(data?.offset ?? 0),
  };
}

export async function getFeaturedServices(limit = 6) {
  const catalog = await getPublicCatalog();
  const featuredItems = catalog.items.filter((item) => item.featured);
  const source = featuredItems.length ? featuredItems : catalog.items;

  return source.slice(0, limit);
}

export async function getPublicServiceCategories() {
  try {
    const url = buildUrl("/services/categories", { active: true });
    const data = await apiFetch(url);
    const items = Array.isArray(data?.items) ? data.items : [];

    return items.map(normalizeServiceCategory).filter(Boolean);
  } catch (error) {
    return [];
  }
}

export async function getPublicCatalog(filters = {}) {
  const url = buildUrl("/services");
  const data = await apiFetch(url);
  const result = normalizeCatalogResponse(data);

  let items = result.items.filter((item) => item.status === "active");

  if (filters.clientType && filters.clientType !== "all") {
    items = items.filter((item) => item.clientTypes.includes(filters.clientType));
  }

  if (filters.category && filters.category !== "all") {
    items = items.filter((item) => item.category === filters.category);
  }

  if (filters.saleType && filters.saleType !== "all") {
    items = items.filter((item) => item.saleType === filters.saleType);
  }

  if (
    filters.minPrice !== undefined &&
    filters.minPrice !== null &&
    filters.minPrice !== ""
  ) {
    items = items.filter((item) => item.price >= Number(filters.minPrice));
  }

  if (
    filters.maxPrice !== undefined &&
    filters.maxPrice !== null &&
    filters.maxPrice !== ""
  ) {
    items = items.filter((item) => item.price <= Number(filters.maxPrice));
  }

  if (filters.search) {
    const query = normalizeText(filters.search);

    items = items.filter((item) => {
      return (
        normalizeText(item.name).includes(query) ||
        normalizeText(item.shortDescription).includes(query) ||
        normalizeText(item.description).includes(query)
      );
    });
  }

  return {
    items,
    total: items.length,
    limit: items.length,
    offset: 0,
  };
}

export async function getPublicCatalogByClientType(clientType) {
  const result = await getPublicCatalog({ clientType });
  return result.items;
}

export async function getPublicServiceBySlug(slug) {
  const url = buildUrl(`/services/${slug}`);
  const data = await apiFetch(url);
  const service = normalizeService(data?.item);

  if (!service || service.status !== "active") {
    return null;
  }

  return service;
}

export async function getPublicProductCategories() {
  try {
    const url = buildUrl("/products/categories", { active: true });
    const data = await apiFetch(url);
    const items = Array.isArray(data?.items) ? data.items : [];

    return items.map(normalizeProductCategory).filter(Boolean);
  } catch (error) {
    return [];
  }
}

export async function getPublicProducts(filters = {}) {
  const query = {
    is_active:
      filters.isActive === undefined ? true : filters.isActive,
    category:
      filters.category && filters.category !== "all" ? filters.category : null,
    product_type:
      filters.productType && filters.productType !== "all"
        ? filters.productType
        : null,
    q: filters.search || null,
    limit: filters.limit || 60,
  };

  const url = buildUrl("/products", query);
  const data = await apiFetch(url);
  const items = Array.isArray(data?.items)
    ? data.items.map(normalizeProduct).filter(Boolean)
    : [];

  return {
    items,
    count: Number(data?.count ?? items.length),
  };
}

export async function getPublicProductBySlug(slug) {
  const url = buildUrl(`/products/${slug}`);
  const data = await apiFetch(url);
  return normalizeProduct(data?.item);
}

export async function createOrUpdatePublicCart(payload) {
  const url = buildUrl("/cart");
  const body = {
    session_token: payload.sessionToken || null,
    email: payload.email || null,
    contact_id: payload.contactId || null,
    metadata: payload.metadata || {},
    items: serializeCartItems(payload.items),
    replace_items: payload.replaceItems !== false,
  };

  const data = await apiFetch(url, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const cart = normalizeCart(data?.item);
  if (cart?.sessionToken) {
    setStoredCartSessionToken(cart.sessionToken);
  }

  return cart;
}

export async function getPublicCart(sessionToken = getStoredCartSessionToken()) {
  if (!sessionToken) {
    return null;
  }

  try {
    const url = buildUrl(`/cart/${sessionToken}`);
    const data = await apiFetch(url);
    const cart = normalizeCart(data?.item);

    if (cart?.sessionToken) {
      setStoredCartSessionToken(cart.sessionToken);
    }

    return cart;
  } catch (error) {
    if (error?.status === 404) {
      clearStoredCartSessionToken();
    }
    throw error;
  }
}

export async function addProductToPublicCart({
  productId = null,
  productSlug = null,
  quantity = 1,
}) {
  const sessionToken = getStoredCartSessionToken();
  let currentCart = null;

  if (sessionToken) {
    try {
      currentCart = await getPublicCart(sessionToken);
    } catch (error) {
      currentCart = null;
    }
  }

  const itemsMap = new Map();

  (currentCart?.items || []).forEach((item) => {
    const key = item.productId || item.product?.slug;
    if (!key) {
      return;
    }

    itemsMap.set(key, {
      productId: item.productId,
      productSlug: item.product?.slug || null,
      quantity: item.quantity,
    });
  });

  const key = productId || productSlug;
  const existing = itemsMap.get(key) || {
    productId,
    productSlug,
    quantity: 0,
  };

  itemsMap.set(key, {
    productId: existing.productId || productId || null,
    productSlug: existing.productSlug || productSlug || null,
    quantity: existing.quantity + Number(quantity || 1),
  });

  return createOrUpdatePublicCart({
    sessionToken: currentCart?.sessionToken || sessionToken || null,
    email: currentCart?.email || null,
    metadata: currentCart?.metadata || {},
    items: Array.from(itemsMap.values()),
    replaceItems: true,
  });
}

export async function setPublicCartItemQuantity({
  sessionToken = getStoredCartSessionToken(),
  productId,
  quantity,
}) {
  if (!sessionToken) {
    throw new Error("No hay una sesion de carrito activa.");
  }

  const currentCart = await getPublicCart(sessionToken);
  if (!currentCart) {
    throw new Error("No se encontro el carrito actual.");
  }

  const nextItems = currentCart.items
    .map((item) => {
      if (item.productId !== productId) {
        return {
          productId: item.productId,
          productSlug: item.product?.slug || null,
          quantity: item.quantity,
        };
      }

      return {
        productId: item.productId,
        productSlug: item.product?.slug || null,
        quantity: Number(quantity || 0),
      };
    })
    .filter((item) => item.quantity > 0);

  return createOrUpdatePublicCart({
    sessionToken,
    email: currentCart.email || null,
    metadata: currentCart.metadata || {},
    items: nextItems,
    replaceItems: true,
  });
}

export async function removePublicCartItem({
  sessionToken = getStoredCartSessionToken(),
  productId,
}) {
  return setPublicCartItemQuantity({
    sessionToken,
    productId,
    quantity: 0,
  });
}

export async function submitPublicStoreCheckout(payload) {
  const url = buildUrl("/checkout");
  const body = {
    session_token: payload.sessionToken,
    customer_name: payload.name,
    email: payload.email,
    phone: payload.phone || null,
    company: payload.company || null,
    notes: payload.notes || null,
    source: payload.source || "website_store",
    metadata: payload.metadata || {},
  };

  const data = await apiFetch(url, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const order = normalizeOrder(data?.item);
  if (order?.id) {
    clearStoredCartSessionToken();
  }

  return {
    order,
    warnings: Array.isArray(data?.warnings) ? data.warnings : [],
  };
}

export async function getPublicOrderById(orderId) {
  const url = buildUrl(`/orders/${orderId}`);
  const data = await apiFetch(url);
  return normalizeOrder(data?.item);
}

export async function getPublicOrderByNumber(orderNumber) {
  const url = buildUrl(`/orders/by-number/${orderNumber}`);
  const data = await apiFetch(url);
  return normalizeOrder(data?.item);
}

function buildContactNotes(payload) {
  const blocks = [
    payload.message ? `Mensaje:\n${payload.message}` : null,
    payload.mode ? `Modo: ${payload.mode}` : null,
    payload.service ? `Servicio: ${payload.service}` : null,
    payload.serviceSlug ? `Service slug: ${payload.serviceSlug}` : null,
    payload.clientType ? `Tipo de cliente: ${payload.clientType}` : null,
    payload.pagePath ? `Pagina: ${payload.pagePath}` : null,
  ].filter(Boolean);

  return blocks.join("\n\n");
}

export async function submitPublicContact(payload) {
  const url = buildUrl("/contacts");
  const pagePath =
    payload.pagePath ||
    (typeof window !== "undefined" ? window.location.pathname : "");

  const tags = [
    "public_web",
    payload.mode || "proposal",
    payload.serviceSlug || null,
    payload.clientType || null,
  ].filter(Boolean);

  const body = {
    name: payload.name ?? "",
    email: payload.email ?? "",
    phone: payload.phone ?? "",
    whatsapp: payload.whatsapp ?? null,
    company: payload.company ?? null,
    source: payload.source ?? "public_web",
    tags,
    tipo: payload.mode ?? "proposal",
    notes: buildContactNotes({
      ...payload,
      pagePath,
    }),
  };

  const data = await apiFetch(url, {
    method: "POST",
    body: JSON.stringify(body),
  });

  return {
    ok: true,
    message: data?.message || "Solicitud recibida",
    leadId: data?.lead_id || null,
    raw: data,
  };
}

export async function submitPublicLead(payload) {
  const url = buildUrl("/lead-booster/leads");
  const formPath =
    typeof window !== "undefined" ? window.location.pathname : "";
  const pageOrigin = payload.pageOrigin || formPath;

  const tags = Array.from(
    new Set(
      [
        "website",
        sanitizeLeadTag(payload.mode),
        sanitizeLeadTag(payload.serviceSlug),
        sanitizeLeadTag(payload.clientType),
      ].filter(Boolean)
    )
  );

  const meta = {
    phone: payload.phone || null,
    whatsapp: payload.whatsapp || null,
    company: payload.company || null,
    message: payload.message || null,
    service_slug: payload.serviceSlug || null,
    service_name: payload.service || null,
    page_origin: pageOrigin || null,
    form_path: formPath || null,
    user_intent: payload.mode || "proposal",
    origin_cta: payload.originCta || null,
    submit_cta: payload.submitCta || null,
    client_type: payload.clientType || null,
    submitted_at: new Date().toISOString(),
    ...(payload.meta || {}),
  };

  const body = {
    name: payload.name ?? "",
    email: payload.email ?? "",
    company: payload.company ?? null,
    service: payload.service || payload.serviceSlug || "Servicio web",
    source: payload.source ?? "website",
    source_id: payload.serviceSlug ?? null,
    tags,
    meta: Object.fromEntries(
      Object.entries(meta).filter(
        ([, value]) => value !== null && value !== undefined && value !== ""
      )
    ),
  };

  const data = await apiFetch(url, {
    method: "POST",
    body: JSON.stringify(body),
  });

  return {
    ok: true,
    message: "Solicitud registrada en el CRM.",
    leadId: data?.id || data?.lead_id || null,
    raw: data,
  };
}

export async function getPublicClientRouteBundle(routeKey) {
  const services = await getPublicCatalogByClientType(routeKey);

  return {
    route: getClientRouteByKey(routeKey),
    services,
  };
}
