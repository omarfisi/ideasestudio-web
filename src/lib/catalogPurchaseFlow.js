/**
 * Pure resolver: determines the configured purchase flow for a public catalog service.
 *
 * Input source: product.purchaseFlow, which is set from
 *   details_schema.catalog.purchase_flow as returned by the /services API.
 *
 * This helper does NOT inspect service name, slug, category, price,
 * legacy sale_mode, or any other field.
 *
 * @param {object} product - Normalized service object from getPublicCatalog()
 * @returns {{ value, label, ctaLabel, tone, shouldShowBadge }}
 */

const VALID_FLOWS = new Set([
  "booking",
  "direct_purchase",
  "proposal_request",
  "monthly_plan",
]);

const FLOW_METADATA = {
  booking: {
    value: "booking",
    label: "Reserva con fecha",
    ctaLabel: "Reservar fecha",
    tone: "booking",
    shouldShowBadge: true,
  },
  direct_purchase: {
    value: "direct_purchase",
    label: "Compra directa",
    ctaLabel: "Comprar servicio",
    tone: "purchase",
    shouldShowBadge: true,
  },
  proposal_request: {
    value: "proposal_request",
    label: "Solicitar propuesta",
    ctaLabel: "Solicitar propuesta",
    tone: "consultive",
    shouldShowBadge: true,
  },
  monthly_plan: {
    value: "monthly_plan",
    label: "Plan mensual",
    ctaLabel: "Ver plan mensual",
    tone: "plan",
    shouldShowBadge: true,
  },
};

const DEFAULT_FLOW = {
  value: null,
  label: null,
  ctaLabel: "Ver servicio",
  tone: "default",
  shouldShowBadge: false,
};

export function resolveCatalogPurchaseFlow(product) {
  if (!product || typeof product !== "object") return DEFAULT_FLOW;
  const flow = product.purchaseFlow ?? null;
  if (!flow || !VALID_FLOWS.has(flow)) return DEFAULT_FLOW;
  return FLOW_METADATA[flow];
}
