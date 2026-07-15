/**
 * serviceContentLabels.js
 *
 * Commercial-language layer for the public service detail page. Translates
 * internal classification values (service_type, commercial_segment, flow
 * type) into customer-facing Spanish copy, and derives quick facts, "cómo
 * funciona" steps and CTA labels from real product data.
 *
 * Pure functions only — no JSX, no API calls. Every value returned here is
 * either a translated label for a real field or an empty string/array; none
 * of it is invented per-service copy.
 */
import {
  getServiceFlowType,
  isBookingFlow,
  SERVICE_FLOW_TYPES,
} from "@/lib/serviceFlowType.js";

const SERVICE_TYPE_LABELS = {
  project: "Proyecto creativo",
  subscription: "Servicio recurrente",
};

const SEGMENT_LABELS = {
  emprendedores: "Emprendedores",
  empresas_corporaciones: "Empresas y corporaciones",
  eventos: "Eventos",
  marcas_negocios: "Marcas y negocios",
};

const MODALITY_LABELS = {
  booking: "Reserva con coordinación de fecha",
  quote: "Cotización a medida",
  direct: "Contratación directa",
  monthly: "Plan mensual",
};

const CTA_LABELS = {
  booking: "Reservar este servicio",
  quote: "Solicitar cotización",
  direct: "Contratar ahora",
  monthly: "Conocer planes",
};

const STEPS_BY_BUCKET = {
  booking: [
    "Selecciona el servicio",
    "Coordinamos fecha y detalles",
    "Recibes la entrega final",
  ],
  quote: ["Solicita información", "Recibe una propuesta", "Aprueba y comenzamos"],
  direct: ["Añade el servicio", "Completa el pago", "Recibe la confirmación"],
  monthly: [
    "Elige tu plan",
    "Completa el pago",
    "Activamos tu gestión mensual",
  ],
};

export function toReadableLabel(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function normalizeList(rawValue) {
  if (!rawValue) return [];

  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof rawValue === "string") {
    return rawValue
      .split(/\r?\n|,/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

/**
 * Collapse the 6 internal flow types into the 4 commercial buckets used to
 * pick CTA copy and "cómo funciona" steps.
 */
export function getFlowBucket(product) {
  const flowType = getServiceFlowType(product);
  if (flowType === SERVICE_FLOW_TYPES.E_MONTHLY) return "monthly";
  if (flowType === SERVICE_FLOW_TYPES.D_QUOTE) return "quote";
  if (isBookingFlow(product)) return "booking";
  return "direct";
}

export function getServiceTypeLabel(product) {
  const raw = String(
    product?.metadata?.service_type || product?.metadata?.product_type || ""
  )
    .trim()
    .toLowerCase();
  if (!raw) return "";
  return SERVICE_TYPE_LABELS[raw] || toReadableLabel(raw);
}

export function getSegmentLabel(product) {
  const raw = String(
    product?.metadata?.commercial_segment || product?.metadata?.segment || ""
  )
    .trim()
    .toLowerCase();
  if (!raw) return "";
  return SEGMENT_LABELS[raw] || toReadableLabel(raw);
}

export function getModalityLabel(product) {
  return MODALITY_LABELS[getFlowBucket(product)];
}

export function getPrimaryCtaLabel(product) {
  return CTA_LABELS[getFlowBucket(product)];
}

export function getHowItWorksSteps(product) {
  return STEPS_BY_BUCKET[getFlowBucket(product)];
}

/** "30 días" / "1 día" — turnaround time, not session duration. */
export function getDeliveryValue(product) {
  const metadata = product?.metadata || {};
  const raw =
    metadata.default_duration_days ??
    metadata.duration_days ??
    metadata.delivery_time_days ??
    metadata.duration ??
    metadata.delivery_time;

  if (raw === null || raw === undefined || raw === "") return "";

  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric === 1 ? "1 día" : `${numeric} días`;
  }

  return toReadableLabel(raw);
}

/**
 * Up to 4 real, translated quick facts for the hero column.
 * Every entry maps to an icon key resolved to a lucide icon in the page.
 */
export function getQuickFacts(product) {
  const facts = [];

  const delivery = getDeliveryValue(product);
  if (delivery) {
    facts.push({ key: "delivery", icon: "clock", label: "Entrega", value: delivery });
  }

  const modality = getModalityLabel(product);
  if (modality) {
    facts.push({ key: "modality", icon: "badge", label: "Modalidad", value: modality });
  }

  const serviceType = getServiceTypeLabel(product);
  if (serviceType) {
    facts.push({ key: "type", icon: "layers", label: "Tipo de servicio", value: serviceType });
  }

  const segment = getSegmentLabel(product);
  if (segment) {
    facts.push({ key: "segment", icon: "sparkles", label: "Ideal para", value: segment });
  }

  return facts.slice(0, 4);
}

/**
 * Real "qué incluye" content. Checks flat metadata fields first, then falls
 * back to metadata_json.details_schema — where store products synced from
 * the services catalog actually carry this content.
 */
export function getIncludesItems(product) {
  const metadata = product?.metadata || {};

  const fromMetadata = [
    ...normalizeList(metadata.includes),
    ...normalizeList(metadata.includes_items),
    ...normalizeList(metadata.deliverables),
  ];
  if (fromMetadata.length) return fromMetadata;

  const rawMetadata =
    product?.raw?.metadata_json && typeof product.raw.metadata_json === "object"
      ? product.raw.metadata_json
      : {};
  const fromRaw = [
    ...normalizeList(rawMetadata.includes),
    ...normalizeList(rawMetadata.includes_items),
    ...normalizeList(rawMetadata.deliverables),
  ];
  if (fromRaw.length) return fromRaw;

  const detailsSchema = metadata.details_schema || rawMetadata.details_schema || {};
  const fromDetailsSchema = normalizeList(
    detailsSchema.includes_items?.length
      ? detailsSchema.includes_items
      : detailsSchema.includes
  );
  if (fromDetailsSchema.length) return fromDetailsSchema;

  return normalizeList(detailsSchema.deliverables);
}
