/**
 * serviceFlowType.js
 *
 * Central helper to classify a product/service into its presentation flow type.
 * Pure functions — no API calls, no side effects.
 * Safe fallback to D_QUOTE when data is missing or unrecognized.
 */

export const SERVICE_FLOW_TYPES = {
  A_BOOKING: "A_BOOKING",
  B_BOOKING_EXTRAS: "B_BOOKING_EXTRAS",
  C_FIXED_PRICE: "C_FIXED_PRICE",
  D_QUOTE: "D_QUOTE",
  E_MONTHLY: "E_MONTHLY",
  F_FIXED_SESSION: "F_FIXED_SESSION",
};

export const SERVICE_FLOW_CONFIG = {
  [SERVICE_FLOW_TYPES.A_BOOKING]: {
    label: "Reserva",
    cta: "Reservar fecha",
    allowsQuantity: false,
    showsDelivery: false,
    isBooking: true,
  },
  [SERVICE_FLOW_TYPES.B_BOOKING_EXTRAS]: {
    label: "Reserva con extras",
    cta: "Reservar fecha",
    allowsQuantity: false,
    showsDelivery: false,
    isBooking: true,
  },
  [SERVICE_FLOW_TYPES.C_FIXED_PRICE]: {
    label: "Precio fijo",
    cta: "Agregar al resumen",
    allowsQuantity: true,
    showsDelivery: false,
    isBooking: false,
  },
  [SERVICE_FLOW_TYPES.D_QUOTE]: {
    label: "Propuesta",
    cta: "Solicitar propuesta",
    allowsQuantity: false,
    showsDelivery: false,
    isBooking: false,
  },
  [SERVICE_FLOW_TYPES.E_MONTHLY]: {
    label: "Plan mensual",
    cta: "Conocer planes",
    allowsQuantity: false,
    showsDelivery: false,
    isBooking: false,
  },
  [SERVICE_FLOW_TYPES.F_FIXED_SESSION]: {
    label: "Sesión",
    cta: "Ver disponibilidad",
    allowsQuantity: false,
    showsDelivery: false,
    isBooking: true,
  },
};

const SAFE_DEFAULT = SERVICE_FLOW_TYPES.D_QUOTE;

/**
 * Normalize a raw sale_mode / flow_type string into a SERVICE_FLOW_TYPES value.
 * Returns null when the value is unrecognized.
 */
export function normalizeSaleMode(value) {
  if (!value) return null;
  const v = String(value).trim().toLowerCase().replace(/-/g, "_");

  if (v === "booking" || v === "deposit_booking") {
    return SERVICE_FLOW_TYPES.A_BOOKING;
  }
  if (v === "booking_extras" || v === "booking_with_extras") {
    return SERVICE_FLOW_TYPES.B_BOOKING_EXTRAS;
  }
  if (
    v === "fixed_price" ||
    v === "price_fixed" ||
    v === "buy_now" ||
    v === "direct_purchase" ||
    v === "compra_directa"
  ) {
    return SERVICE_FLOW_TYPES.C_FIXED_PRICE;
  }
  if (
    v === "quote" ||
    v === "proposal" ||
    v === "quotation" ||
    v === "quote_only" ||
    v === "proposal_request" ||
    v === "cotizacion"
  ) {
    return SERVICE_FLOW_TYPES.D_QUOTE;
  }
  if (
    v === "monthly" ||
    v === "subscription" ||
    v === "recurring" ||
    v === "monthly_plan"
  ) {
    return SERVICE_FLOW_TYPES.E_MONTHLY;
  }
  if (v === "fixed_session" || v === "session") {
    return SERVICE_FLOW_TYPES.F_FIXED_SESSION;
  }

  return null;
}

/**
 * Infer the flow type from name, slug, and category when no explicit field is set.
 * Conservative: defaults to D_QUOTE when nothing matches.
 */
function inferFromNameSlugCategory(product) {
  const name = String(product?.name || "").toLowerCase();
  const slug = String(product?.slug || "").toLowerCase();
  const categoryRaw =
    product?.category?.slug ||
    product?.category?.name ||
    (typeof product?.category === "string" ? product.category : "");
  const category = String(categoryRaw || "").toLowerCase();

  const combined = `${name} ${slug} ${category}`;

  // E_MONTHLY — check before session keywords to avoid false positives
  if (
    /mensual|monthly|redes\s*sociales|social_media|mantenimiento|seo\s*mensual/.test(
      combined
    )
  ) {
    return SERVICE_FLOW_TYPES.E_MONTHLY;
  }

  // A_BOOKING / B_BOOKING_EXTRAS — events and weddings
  if (
    /boda|bodas|wedding|quincea|cumplea[nñ]os|evento|eventos|event|love\s*story/.test(
      combined
    )
  ) {
    if (/extra|adicional|plus/.test(combined)) {
      return SERVICE_FLOW_TYPES.B_BOOKING_EXTRAS;
    }
    return SERVICE_FLOW_TYPES.A_BOOKING;
  }

  // F_FIXED_SESSION — photography sessions
  if (
    /sesi[oó]n|session|estudio|studio|exterior|retrato|headshot|portrait|embarazo|pregnancy|graduaci[oó]n|graduation/.test(
      combined
    )
  ) {
    return SERVICE_FLOW_TYPES.F_FIXED_SESSION;
  }

  // D_QUOTE — design, web, video, branding, marketing, production
  if (
    /p[aá]gina\s*web|ecommerce|tienda\s*online|branding|logo|video|producci[oó]n|campa[nñ]a|marketing|dise[nñ]o/.test(
      combined
    )
  ) {
    return SERVICE_FLOW_TYPES.D_QUOTE;
  }

  return SAFE_DEFAULT;
}

/**
 * Classify a product into its service flow type.
 *
 * Priority:
 *   1. product.metadata.sale_mode
 *   2. product.metadata.purchase_flow  (primary signal on synced store products)
 *   3. product.metadata.flow_type
 *   4. product.sale_mode
 *   5. product.purchase_flow
 *   6. product.flow_type
 *   7. product.saleType  (used in local mock data)
 *   8. Inferred from name / slug / category
 *   9. D_QUOTE (safe default)
 */
export function getServiceFlowType(product) {
  if (!product) return SAFE_DEFAULT;

  const metadata = product?.metadata || {};

  const fromExplicit =
    normalizeSaleMode(metadata.sale_mode) ||
    normalizeSaleMode(metadata.purchase_flow) ||
    normalizeSaleMode(metadata.flow_type) ||
    normalizeSaleMode(product.sale_mode) ||
    normalizeSaleMode(product.purchase_flow) ||
    normalizeSaleMode(product.flow_type) ||
    normalizeSaleMode(product.saleType);

  if (fromExplicit) return fromExplicit;

  return inferFromNameSlugCategory(product);
}

/**
 * Return the full configuration object for a product's flow type.
 */
export function getServiceFlowConfig(product) {
  const flowType = getServiceFlowType(product);
  return SERVICE_FLOW_CONFIG[flowType] || SERVICE_FLOW_CONFIG[SAFE_DEFAULT];
}

/**
 * True when the product follows a booking flow (calendar / date selection).
 */
export function isBookingFlow(product) {
  return getServiceFlowConfig(product).isBooking;
}

/**
 * True when the product allows a user-editable quantity in the cart/detail.
 */
export function allowsServiceQuantity(product) {
  return getServiceFlowConfig(product).allowsQuantity;
}

/**
 * True when the product should surface a delivery cost line.
 */
export function showsDeliveryCost(product) {
  return getServiceFlowConfig(product).showsDelivery;
}
