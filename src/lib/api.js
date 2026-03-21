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

    throw new Error(message);
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
    raw?.full_description ||
    raw?.long_description ||
    raw?.details_schema?.long_description ||
    raw?.details_schema?.summary ||
    raw?.short_description ||
    raw?.name ||
    ""
  );
}

function getShortDescription(raw) {
  return (
    raw?.short_description ||
    raw?.details_schema?.short_description ||
    raw?.details_schema?.summary ||
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

function normalizeService(raw) {
  if (!raw) {
    return null;
  }

  const includes = getIncludes(raw);

  return {
    id: raw.id,
    name: raw.name || "Servicio",
    slug: raw.slug,
    category: normalizeCategory(raw.category),
    clientTypes: inferClientTypes(raw),
    saleType: inferSaleType(raw),
    price: Number(raw.base_price ?? 0),
    shortDescription: getShortDescription(raw),
    description: getDescription(raw),
    includes,
    featured: inferFeatured(raw),
    status: raw.is_active ? "active" : "inactive",
    image: raw?.details_schema?.summary || raw?.name || "",
    gallery: getGallery(raw, includes),
    deliveryTime: getDeliveryTime(raw),
    raw,
  };
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

export async function getPublicClientRouteBundle(routeKey) {
  const services = await getPublicCatalogByClientType(routeKey);

  return {
    route: getClientRouteByKey(routeKey),
    services,
  };
}
