import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/storeCheckoutApi.js", () => ({
  getStoreProducts: vi.fn(),
  getStoreProductBySlug: vi.fn(),
}));

import { getStoreProducts, getStoreProductBySlug } from "@/services/storeCheckoutApi.js";
import { getPublicProducts, getPublicProductBySlug } from "@/lib/api.js";

const STORE_PRODUCT_ID = "798a0e90-8de7-40cb-a7bc-9e18c20543c7";
const REAL_SERVICE_ID = "affe2a2d-6152-443d-a137-567e8028f1fe";

beforeEach(() => {
  vi.clearAllMocks();
});

// Regression test for a real bug found in production: GET /api/store/
// products (the catalog LIST endpoint, what /servicios actually calls)
// never includes a top-level service_id — only metadata_json.
// source_service_id — while GET /api/store/products/{slug} (the single-
// product DETAIL endpoint) does include a top-level service_id. Both
// endpoints share one normalizer (normalizeProduct in src/lib/api.js), so
// reading only raw.service_id silently produced serviceId: null for every
// catalog card, which disabled the membership-plans fetch entirely and
// forced the "no plans" fallback (which, before this fix, added the base
// service straight to the cart) even though the linked service had
// published, public, active plans.
describe("getPublicProducts / getPublicProductBySlug — service_id resolution", () => {
  it("resolves product.serviceId from metadata_json.source_service_id when the catalog LIST response has no top-level service_id", async () => {
    getStoreProducts.mockResolvedValue({
      items: [
        {
          id: STORE_PRODUCT_ID,
          name: "Gestión de Redes Sociales",
          slug: "gestion-de-redes-sociales",
          product_type: "service",
          price: 99.99,
          currency: "USD",
          is_active: true,
          metadata_json: {
            source: "services_master",
            purchase_flow: "monthly_plan",
            source_service_id: REAL_SERVICE_ID,
          },
        },
      ],
      count: 1,
    });

    const { items } = await getPublicProducts({ category: "all", productType: "service" });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(STORE_PRODUCT_ID);
    expect(items[0].serviceId).toBe(REAL_SERVICE_ID);
    // Never the store_products row's own id.
    expect(items[0].serviceId).not.toBe(STORE_PRODUCT_ID);
  });

  it("resolves product.serviceId from the top-level service_id when the single-product DETAIL response has one", async () => {
    getStoreProductBySlug.mockResolvedValue({
      item: {
        id: STORE_PRODUCT_ID,
        name: "Gestión de Redes Sociales",
        slug: "gestion-de-redes-sociales",
        product_type: "service",
        price: 99.99,
        currency: "USD",
        is_active: true,
        service_id: REAL_SERVICE_ID,
        metadata_json: {
          source: "services_master",
          purchase_flow: "monthly_plan",
          source_service_id: REAL_SERVICE_ID,
        },
      },
    });

    const product = await getPublicProductBySlug("gestion-de-redes-sociales");
    expect(product.serviceId).toBe(REAL_SERVICE_ID);
  });

  it("returns serviceId: null (not product.id) when no service link exists in any shape", async () => {
    getStoreProducts.mockResolvedValue({
      items: [
        {
          id: "unrelated-product-id",
          name: "Producto Digital",
          slug: "producto-digital",
          product_type: "digital",
          price: 10,
          currency: "USD",
          is_active: true,
          metadata_json: {},
        },
      ],
      count: 1,
    });

    const { items } = await getPublicProducts({});
    expect(items[0].serviceId).toBeNull();
  });
});
