import { CRM_PUBLIC_API_BASE_URL } from "@/lib/constants.js";
import { PUBLIC_WORKSPACE_ID } from "@/lib/workspace.js";
import { getClientRouteByKey } from "@/data/routes.js";
import { mapOrderTotals } from "@/lib/bookingCheckoutSteps.js";
import { authenticatedFetch } from "@/lib/authenticatedApi.js";
import {
  addStoreCartItem,
  createStoreOrder,
  createStorePaymentIntent,
  deleteStoreCartItem,
  getStoreCartCurrent,
  getStoreCategories,
  getStoreOrderById,
  getStoreOrderByNumber,
  getStoreProductBySlug,
  getStoreProducts,
  resolveStoreCart,
  updateStoreCartItem,
  validateStoreCoupon,
} from "@/services/storeCheckoutApi.js";

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
    const detail = data?.detail;
    const detailText = Array.isArray(detail)
      ? detail.map((d) => d?.msg || d?.message || String(d)).filter(Boolean).join(" ")
      : typeof detail === "string"
      ? detail
      : null;
    const message =
      data?.message ||
      detailText ||
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

function labelFromSlug(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "Categoria";
  }

  return text
    .split(/[-_]/g)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function normalizeProductCategory(raw) {
  if (!raw) {
    return null;
  }

  return {
    id: raw.id,
    name: raw.name || raw.label || labelFromSlug(raw.slug || raw.code),
    slug: raw.slug || raw.code || raw.category_slug || null,
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

  const category = normalizeProductCategory(
    raw.category ||
      (raw.category_slug
        ? {
            slug: raw.category_slug,
            name: labelFromSlug(raw.category_slug),
          }
        : null)
  );
  const gallerySource = raw.gallery_json ?? raw.gallery ?? [];
  const gallery = Array.isArray(gallerySource)
    ? gallerySource.filter(Boolean)
    : [];
  const metadataSource =
    raw.metadata_json && typeof raw.metadata_json === "object"
      ? raw.metadata_json
      : raw.metadata && typeof raw.metadata === "object"
      ? raw.metadata
      : {};

  return {
    id: raw.id,
    name: raw.name || "Servicio",
    slug: raw.slug,
    categoryId: raw.category_id || category?.id || null,
    category,
    shortDescription: raw.short_description || raw.description_short || "",
    longDescription:
      raw.long_description ||
      raw.description_long ||
      raw.short_description ||
      raw.description_short ||
      raw.name ||
      "",
    price: Number(raw.price ?? 0),
    currency: raw.currency || "USD",
    compareAtPrice:
      (raw.compare_at_price === null || raw.compare_at_price === undefined) &&
      (raw.compare_price === null || raw.compare_price === undefined)
        ? null
        : Number(raw.compare_at_price ?? raw.compare_price),
    sku: raw.sku || null,
    inventoryQty:
      raw.inventory_qty === null || raw.inventory_qty === undefined
        ? null
        : Number(raw.inventory_qty),
    trackInventory: Boolean(raw.track_inventory),
    isActive: raw.is_active !== false,
    productType: raw.product_type || "digital",
    coverImage: raw.cover_image || raw.cover_image_url || null,
    gallery,
    metadata: metadataSource,
    // The public.services row this product was synced from, if any.
    // GET /api/store/products/{slug} (single-product detail) includes a
    // top-level service_id — but GET /api/store/products (the catalog
    // LIST endpoint, what the storefront grid actually calls) does NOT;
    // it only carries metadata_json.source_service_id. Both endpoints
    // share this one normalizer, so it must check both shapes — reading
    // only raw.service_id silently produced serviceId: null for every
    // catalog card (never the detail page, which is why the bug only
    // showed up on /servicios and not on a service's own detail page),
    // which in turn disabled the membership-plans fetch entirely and
    // forced the "no plans" fallback even when real, published plans
    // existed.
    serviceId:
      raw.service_id ||
      raw.source_service_id ||
      metadataSource.source_service_id ||
      metadataSource.service_id ||
      null,
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
    cartId: raw.cart_id || null,
    productId: raw.product_id || raw.productId || null,
    productSlug:
      raw.product_slug ||
      raw.productSlug ||
      raw.product?.slug ||
      raw.slug ||
      null,
    quantity: Number(raw.quantity ?? 0),
    unitPrice: Number(
      raw.unit_price ?? raw.unitPrice ?? raw.price_snapshot ?? 0
    ),
    lineTotal: Number(raw.line_total ?? raw.lineTotal ?? 0),
    currency: raw.currency || "USD",
    snapshotName:
      raw.snapshot_name || raw.snapshotName || raw.name_snapshot || "Servicio",
    snapshotDescription:
      raw.snapshot_description || raw.snapshotDescription || "",
    metadata:
      raw.metadata_json && typeof raw.metadata_json === "object"
        ? raw.metadata_json
        : raw.metadata && typeof raw.metadata === "object"
        ? raw.metadata
        : {},
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
  const summary =
    raw.summary && typeof raw.summary === "object" ? raw.summary : {};
  const subtotal = Number(
    summary.subtotal ??
      raw.subtotal ??
      items.reduce((total, item) => total + item.lineTotal, 0)
  );

  return {
    id: raw.id,
    sessionToken: raw.session_token || raw.sessionToken || raw.cart_token || null,
    contactId: raw.contact_id || raw.contactId || null,
    email: raw.email || raw.customer_email || null,
    status: raw.status || "active",
    metadata:
      raw.metadata_json && typeof raw.metadata_json === "object"
        ? raw.metadata_json
        : raw.metadata && typeof raw.metadata === "object"
        ? raw.metadata
        : {},
    createdAt: raw.created_at || null,
    updatedAt: raw.updated_at || null,
    items,
    summary: {
      lineItems: Number(summary.line_items ?? items.length),
      totalQuantity: Number(
        summary.total_quantity ??
          items.reduce((total, item) => total + item.quantity, 0)
      ),
      subtotal,
      currency: summary.currency || raw.currency || items[0]?.currency || "USD",
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
    unitPrice: Number(raw.unit_price ?? raw.unitPrice ?? raw.price_snapshot ?? 0),
    total: Number(raw.total ?? raw.line_total ?? 0),
    snapshotName:
      raw.snapshot_name || raw.snapshotName || raw.name_snapshot || "Servicio",
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
  const totals = mapOrderTotals(raw);

  return {
    id: raw.id,
    orderNumber: raw.order_number || raw.orderNumber || null,
    contactId: raw.contact_id || raw.contactId || null,
    cartSessionId: raw.cart_session_id || raw.cartSessionId || null,
    email: raw.email || null,
    status: raw.status || "pending",
    paymentStatus: raw.payment_status || raw.paymentStatus || "pending",
    fulfillmentStatus:
      raw.fulfillment_status || raw.fulfillmentStatus || "not_applicable",
    currency: raw.currency || "USD",
    subtotal: Number(raw.subtotal ?? 0),
    taxTotal: Number(raw.tax_total ?? raw.taxTotal ?? 0),
    discountTotal: Number(raw.discount_total ?? raw.discountTotal ?? 0),
    total: Number(raw.total ?? raw.grand_total ?? 0),
    // Authoritative booking totals (see mapOrderTotals) — contractTotal is
    // the full service/order value, amountDueNow is what Stripe actually
    // charges now (may be a deposit), depositTotal/balanceDue are only
    // non-zero for a deposit-only booking.
    contractTotal: totals.contractTotal,
    amountDueNow: totals.amountDueNow,
    depositTotal: totals.depositTotal,
    balanceDue: totals.balanceDue,
    notes: raw.notes || "",
    source: raw.source || "",
    metadata:
      raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {},
    createdAt: raw.created_at || null,
    updatedAt: raw.updated_at || null,
    // Present on endpoints that select the full store_orders row (e.g. Mi
    // cuenta order detail); null on the guest-by-number confirmation
    // endpoint, which selects an explicit column allowlist that doesn't
    // include them. A caller must treat null as "unknown", never as "no
    // proposal/invoice exists".
    documentType: raw.document_type || raw.documentType || null,
    proposalId: raw.proposal_id || raw.proposalId || null,
    invoiceId: raw.invoice_id || raw.invoiceId || null,
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
      const quantity = Number(item.quantity ?? 0);

      if (!quantity || !productId) {
        return null;
      }

      return {
        product_id: productId,
        quantity,
      };
    })
    .filter(Boolean);
}

function normalizeStoreCartEnvelope(data) {
  if (!data || !data.cart) {
    return null;
  }

  const cart = {
    ...(data.cart || {}),
    items: Array.isArray(data.items) ? data.items : [],
    summary: {
      line_items: Number(data.count ?? (data.items || []).length),
      total_quantity: Number(
        (data.items || []).reduce(
          (total, item) => total + Number(item.quantity ?? 0),
          0
        )
      ),
      subtotal: Number(data.cart?.subtotal ?? 0),
      currency: data.cart?.currency || "USD",
    },
  };

  return normalizeCart(cart);
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
  } catch {
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
    const data = await getStoreCategories();
    const items = Array.isArray(data?.items) ? data.items : [];

    return items.map(normalizeProductCategory).filter(Boolean);
  } catch {
    return [];
  }
}

export async function getPublicProducts(filters = {}) {
  const data = await getStoreProducts(filters);
  const rawItems = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.products)
    ? data.products
    : Array.isArray(data)
    ? data
    : [];
  const items = rawItems.map(normalizeProduct).filter(Boolean);

  return {
    items,
    count: Number(data?.count ?? data?.total ?? items.length),
  };
}

export async function getPublicProductBySlug(slug) {
  const data = await getStoreProductBySlug(slug);
  return normalizeProduct(data?.item);
}

const SLUG_CACHE_PREFIX = "cart_product_slug_";

export function cacheProductSlug(productId, slug) {
  if (productId && slug) {
    try {
      localStorage.setItem(`${SLUG_CACHE_PREFIX}${productId}`, slug);
    } catch {
      // localStorage not available
    }
  }
}

export async function resolveProductSlugById(productId) {
  if (!productId) return null;
  try {
    const cached = localStorage.getItem(`${SLUG_CACHE_PREFIX}${productId}`);
    if (cached) return cached;
  } catch {
    // localStorage not available
  }
  try {
    const data = await getStoreProducts({ limit: 200 });
    const items = Array.isArray(data?.items) ? data.items : [];
    const match = items.find((p) => p.id === productId);
    if (match?.slug) {
      cacheProductSlug(productId, match.slug);
      return match.slug;
    }
  } catch {
    // fallback failed
  }
  return null;
}

export async function createOrUpdatePublicCart(payload) {
  const seedToken =
    payload.sessionToken || getStoredCartSessionToken() || null;

  let cartEnvelope = await resolveStoreCart({
    cartToken: seedToken,
    sessionId: seedToken,
    contactId: payload.contactId || null,
    currency: "USD",
  });
  const cartId = cartEnvelope?.cart?.id;
  if (!cartId) {
    throw new Error("No se pudo inicializar el resumen de servicios.");
  }

  const nextItems = serializeCartItems(payload.items);
  const replaceItems = payload.replaceItems !== false;

  if (replaceItems) {
    const desiredByProductId = new Map(
      nextItems.map((item) => [String(item.product_id), Number(item.quantity)])
    );
    const currentItems = Array.isArray(cartEnvelope?.items)
      ? cartEnvelope.items
      : [];

    for (const item of currentItems) {
      const key = String(item.product_id || "");
      const wantedQuantity = desiredByProductId.get(key);

      if (!key) {
        continue;
      }

      if (!wantedQuantity) {
        cartEnvelope = await deleteStoreCartItem({ itemId: item.id });
        continue;
      }

      if (Number(item.quantity || 0) !== Number(wantedQuantity)) {
        cartEnvelope = await updateStoreCartItem({
          itemId: item.id,
          quantity: Number(wantedQuantity),
        });
      }

      desiredByProductId.delete(key);
    }

    for (const [productId, quantity] of desiredByProductId.entries()) {
      cartEnvelope = await addStoreCartItem({
        cartId,
        productId,
        quantity,
      });
    }
  } else {
    for (const item of nextItems) {
      cartEnvelope = await addStoreCartItem({
        cartId,
        productId: item.product_id,
        quantity: item.quantity,
      });
    }
  }

  const cart = normalizeStoreCartEnvelope(cartEnvelope);
  if (cart?.sessionToken) {
    setStoredCartSessionToken(cart.sessionToken);
  }

  return cart;
}

async function resolveProductIdForCart({ productId, productSlug }) {
  if (productId) {
    return productId;
  }

  if (!productSlug) {
    return null;
  }

  const product = await getPublicProductBySlug(productSlug);
  return product?.id || null;
}

export async function getPublicCart(sessionToken = getStoredCartSessionToken()) {
  if (!sessionToken) {
    return null;
  }

  try {
    const data = await getStoreCartCurrent({ cartToken: sessionToken });
    const cart = normalizeStoreCartEnvelope(data);

    if (cart?.sessionToken) {
      setStoredCartSessionToken(cart.sessionToken);
    }

    return cart;
  } catch (error) {
    if (error?.status === 404) {
      clearStoredCartSessionToken();
      return null;
    }
    throw error;
  }
}

export async function addProductToPublicCart({
  productId = null,
  productSlug = null,
  quantity = 1,
}) {
  const resolvedProductId = await resolveProductIdForCart({
    productId,
    productSlug,
  });
  if (!resolvedProductId) {
    throw new Error("No se pudo resolver el servicio para el resumen.");
  }

  if (productSlug) cacheProductSlug(resolvedProductId, productSlug);

  return createOrUpdatePublicCart({
    sessionToken: getStoredCartSessionToken() || null,
    items: [
      {
        productId: resolvedProductId,
        quantity: Number(quantity || 1),
      },
    ],
    replaceItems: false,
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
  const currentItem = currentCart.items.find(
    (item) => String(item.productId) === String(productId)
  );
  if (!currentItem) {
    return currentCart;
  }

  const nextQuantity = Number(quantity || 0);
  const envelope =
    nextQuantity > 0
      ? await updateStoreCartItem({
          itemId: currentItem.id,
          quantity: nextQuantity,
        })
      : await deleteStoreCartItem({
          itemId: currentItem.id,
        });

  const cart = normalizeStoreCartEnvelope(envelope);
  if (cart?.sessionToken) {
    setStoredCartSessionToken(cart.sessionToken);
  }
  return cart;
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

function normalizeBookingSummaryEntry(raw) {
  if (!raw) return null;
  return {
    reservationHoldId: raw.reservation_hold_id ?? null,
    serviceSlug: raw.service_slug ?? null,
    startsAt: raw.starts_at ?? null,
    endsAt: raw.ends_at ?? null,
    packageName: raw.package_name ?? null,
    addons: Array.isArray(raw.addons)
      ? raw.addons.map((a) => ({
          addonId: a.addon_id,
          name: a.name,
          quantity: a.quantity,
          price: Number(a.price ?? 0),
          durationMinutes: Number(a.duration_minutes ?? 0),
          unitLabel: a.unit_label || "",
        }))
      : [],
    serviceTotal: Number(raw.service_total ?? 0),
    depositAmount: Number(raw.deposit_amount ?? 0),
    // "configured" (no calendar — nothing held) vs a real hold's status
    // (e.g. "pending_payment"). reservationHoldId/startsAt/endsAt are all
    // null for a "configured" entry — never assume a hold exists.
    status: raw.status || "configured",
  };
}

function normalizeBookingSummary(raw) {
  return Array.isArray(raw) ? raw.map(normalizeBookingSummaryEntry).filter(Boolean) : [];
}

export async function submitPublicStoreCheckout(payload) {
  const sessionToken = payload.sessionToken || getStoredCartSessionToken();
  const cart = await getPublicCart(sessionToken);
  if (!cart?.id) {
    throw new Error("No se encontró un carrito válido para checkout.");
  }

  const data = await createStoreOrder({
    cart_id: cart.id,
    customer_name: payload.name,
    customer_email: payload.email,
    customer_phone: payload.phone || null,
    contact_id: payload.contactId || cart.contactId || null,
    notes: payload.notes || null,
    document_type: payload.documentType || "invoice",
    coupon_code: payload.couponCode || null,
    // Recomputed and re-validated entirely server-side (availability,
    // package, addons, deposit) — never trusted for money or scheduling.
    // null when the cart has no booking item, an object for one, an array
    // for more than one (see buildBookingSelectionField).
    booking_selection: payload.booking_selection ?? null,
    billing_address: {
      line1: payload.billingAddress?.line1 || null,
      line2: payload.billingAddress?.line2 || null,
      city: payload.billingAddress?.city || null,
      state: payload.billingAddress?.state || null,
      country: payload.billingAddress?.country || null,
      postal_code: payload.billingAddress?.postalCode || null,
    },
    shipping_address: payload.shippingAddress
      ? {
          line1: payload.shippingAddress?.line1 || null,
          line2: payload.shippingAddress?.line2 || null,
          city: payload.shippingAddress?.city || null,
          state: payload.shippingAddress?.state || null,
          country: payload.shippingAddress?.country || null,
          postal_code: payload.shippingAddress?.postalCode || null,
        }
      : null,
  });

  const order = normalizeOrder({
    ...(data?.order || {}),
    email: payload.email,
    notes: payload.notes || "",
    source: payload.source || "website_store",
    total: data?.order?.grand_total ?? 0,
    // create-order's own response envelope carries these at the top
    // level, not nested under order — the order object itself never has
    // them at this point in the flow.
    document_type: data?.sale_mode === "cotizacion" ? "proposal" : "invoice",
    proposal_id: data?.proposal_id ?? null,
  });
  if (order?.id) {
    clearStoredCartSessionToken();
  }

  return {
    order,
    bookingSummary: normalizeBookingSummary(data?.booking_summary),
    warnings: [],
    // The backend is the only source of truth for whether this order needs
    // payment right now — never inferred from what was sent. A pre-Bloqueo-3
    // backend response has no payment_required field at all; that must be
    // treated as true (the legacy compra-directa flow), not false.
    saleMode: data?.sale_mode || "compra_directa",
    proposalId: data?.proposal_id ?? null,
    // "completed" | "failed" | null (compra directa, or a legacy backend
    // response with no such field) — display framing only, see
    // resolveCheckoutOutcome.
    proposalGenerationStatus: data?.proposal_generation_status ?? null,
    paymentRequired:
      typeof data?.payment_required === "boolean" ? data.payment_required : true,
  };
}

export async function createPublicStorePaymentIntent({
  orderId,
  provider = "stripe",
}) {
  const data = await createStorePaymentIntent({ orderId, provider });
  return {
    id: data?.payment?.id || null,
    provider: data?.payment?.provider || "stripe",
    status: data?.payment?.status || "pending",
    providerPaymentId: data?.payment?.provider_payment_id || null,
    clientSecret: data?.payment?.client_secret || null,
  };
}

export async function getPublicOrderById(orderId) {
  const data = await getStoreOrderById(orderId);
  return normalizeOrder(data?.item);
}

export async function getPublicOrderByNumber(orderNumber) {
  const data = await getStoreOrderByNumber(orderNumber);
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

// ─────────────────────────────────────────────────────────────
// Portafolio público
// ─────────────────────────────────────────────────────────────

function normalizePortfolioItem(raw) {
  if (!raw) return null;
  const coverUrl = raw.cover_url || "";
  return {
    id: raw.id || "",
    title: raw.title || "",
    slug: raw.slug || "",
    description: raw.description || "",
    category: raw.category || "",
    subcategory: raw.subcategory || "",
    segment: raw.segment || "",
    clientName: raw.client_name || "",
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    // Imagen según contexto — fallback siempre a cover_url
    coverUrl,
    homeCoverUrl: raw.home_cover_url || coverUrl,
    portfolioCoverUrl: raw.portfolio_cover_url || coverUrl,
    mediaUrls: Array.isArray(raw.media_urls) ? raw.media_urls.filter(Boolean) : [],
    isPublished: !!raw.is_published,
    isFeatured: !!raw.is_featured,
    visualOrder: Number(raw.visual_order ?? 100),
    placements: Array.isArray(raw.placements) ? raw.placements : ["portfolio_page"],
    sectionKey: raw.section_key || "general",
    mediaKind: raw.media_kind || "image",
    videoUrl: raw.video_url || "",
  };
}

export async function getPublicPortfolioItems(params = {}) {
  try {
    const url = buildUrl("/portfolio", {
      is_published: true,
      ...params,
    });
    const data = await apiFetch(url);
    const raw = Array.isArray(data?.items) ? data.items
               : Array.isArray(data)        ? data
               : [];
    return raw.map(normalizePortfolioItem).filter(Boolean);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// Membresías público
// ─────────────────────────────────────────────────────────────

// Deliberately does NOT swallow errors into an empty array (unlike
// getPublicPortfolioItems above) — the membership page must show a
// distinct "something went wrong" state from a genuine "zero plans
// published" state, so the caller needs to be able to tell a failed
// fetch apart from a successful empty one.
export async function getPublicMembershipPlans() {
  const url = buildUrl("/public/membership-plans");
  const data = await apiFetch(url);
  return Array.isArray(data?.items) ? data.items : [];
}

// Same "never swallow errors" reasoning as getPublicMembershipPlans above
// — the "Conocer planes" modal needs to tell a failed fetch apart from a
// genuine "this service isn't in any plan yet" empty list.
export async function getPublicMembershipPlansByService(serviceId) {
  const url = buildUrl(`/public/services/${encodeURIComponent(serviceId)}/membership-plans`);
  const data = await apiFetch(url);
  return Array.isArray(data?.items) ? data.items : [];
}

// ─────────────────────────────────────────────────────────────
// Checkout de suscripción de membresías — flujo separado del carrito de
// la tienda (nunca pasa por store_carts/store_orders/PaymentIntent). Ver
// app/routers/membership_subscriptions_public.py en el backend.
// ─────────────────────────────────────────────────────────────

// Re-validates a plan+service selection server-side. Never trust the
// modal's own in-memory plan data alone once the user has navigated away
// from it — the checkout page always re-fetches this before rendering
// anything.
export async function getMembershipPlanSelection({ membershipPlanId, serviceId }) {
  const url = buildUrl(`/public/membership-plans/${encodeURIComponent(membershipPlanId)}/selection`, {
    service_id: serviceId,
  });
  return apiFetch(url);
}

// Fase 3 — requires a Supabase session: uses authenticatedFetch, never the
// plain apiFetch above, so every call always carries
// `Authorization: Bearer <access_token>`. customer_email is kept in the
// payload only for backend backward-compatibility (the caller must always
// pass session.user.email here, never a free-typed value — the backend
// independently derives the real identity from the JWT and rejects a
// mismatch). Never retried automatically on 401 — see authenticatedFetch's
// retryOn401 docstring: a checkout session may have already been created
// server-side, so this always surfaces the error and lets the visitor
// retry manually instead.
//
// Embedded Checkout migration: no successUrl/cancelUrl parameters — the
// backend always resolves a fixed, server-side redirect target by Stripe
// mode. Response is either { checkout_ui_mode: "embedded", client_secret }
// or { checkout_ui_mode: "hosted", session_url } (rollback path only) —
// never both.
export async function createMembershipCheckoutSession({
  membershipPlanId,
  serviceId,
  customerEmail,
  customerName,
}) {
  return authenticatedFetch("/membership-subscriptions/checkout-session", {
    method: "POST",
    body: JSON.stringify({
      membership_plan_id: membershipPlanId,
      service_id: serviceId,
      customer_email: customerEmail,
      customer_name: customerName || null,
    }),
  });
}

export async function getMembershipCheckoutSessionStatus(sessionId) {
  const url = buildUrl(`/membership-subscriptions/checkout-session/${encodeURIComponent(sessionId)}`);
  return apiFetch(url);
}

// ─────────────────────────────────────────────────────────────
// Blog público
// ─────────────────────────────────────────────────────────────

export async function getBlogHome() {
  const url = buildUrl("/api/blog/home", { workspace_id: PUBLIC_WORKSPACE_ID || undefined });
  return apiFetch(url);
}

export async function getBlogPosts(params = {}) {
  const url = buildUrl("/api/blog/posts", {
    workspace_id: PUBLIC_WORKSPACE_ID || undefined,
    ...params,
  });
  return apiFetch(url);
}

export async function getBlogPostBySlug(slug) {
  const url = buildUrl(`/api/blog/posts/${slug}`);
  return apiFetch(url);
}

export async function getBlogRelated(slug) {
  const url = buildUrl(`/api/blog/posts/${slug}/related`);
  return apiFetch(url);
}

export async function getBlogCategories() {
  const url = buildUrl("/api/blog/categories");
  return apiFetch(url);
}

export async function getBlogComments(slug) {
  const url = buildUrl(`/api/blog/posts/${slug}/comments`);
  return apiFetch(url);
}

export async function submitBlogComment(slug, payload) {
  const url = buildUrl(`/api/blog/posts/${slug}/comments`);
  return apiFetch(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export { validateStoreCoupon };

// ─────────────────────────────────────────────────────────────
// Equipo público
// ─────────────────────────────────────────────────────────────

export async function getPublicTeam() {
  const url = buildUrl("/public/team", { workspace_id: PUBLIC_WORKSPACE_ID || undefined });
  return apiFetch(url);
}

// ─────────────────────────────────────────────────────────────
// Service segments público
// ─────────────────────────────────────────────────────────────

export async function getPublicServiceSegment(slug) {
  const url = buildUrl(`/public/service-segments/${slug}`);
  return apiFetch(url);
}
