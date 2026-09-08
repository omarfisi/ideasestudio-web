import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/storeCheckoutApi.js", () => ({
  addStoreCartItem: vi.fn(),
  createStoreOrder: vi.fn(),
  createStorePaymentIntent: vi.fn(),
  deleteStoreCartItem: vi.fn(),
  getStoreCartCurrent: vi.fn(),
  getStoreCategories: vi.fn(),
  getStoreOrderById: vi.fn(),
  getStoreOrderByNumber: vi.fn(),
  getStoreProductBySlug: vi.fn(),
  getStoreProducts: vi.fn(),
  resolveStoreCart: vi.fn(),
  updateStoreCartItem: vi.fn(),
  validateStoreCoupon: vi.fn(),
}));

const { getPublicCatalog, getPublicServiceBySlug } = await import("@/lib/api.js");

const publicService = {
  id: "service-1",
  name: "Servicio público",
  slug: "servicio-publico",
  category: "web",
  base_price: 100,
  currency: "USD",
  is_active: true,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("public services endpoints", () => {
  it("uses the scoped public catalog route", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, items: [publicService], total: 1 }), { status: 200 })
    );

    const result = await getPublicCatalog();

    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe("/public/services");
    expect(result.items).toHaveLength(1);
    expect(result.items[0].slug).toBe(publicService.slug);
  });

  it("uses the scoped public detail route", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, item: publicService }), { status: 200 })
    );

    const result = await getPublicServiceBySlug(publicService.slug);

    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe(
      `/public/services/${publicService.slug}`
    );
    expect(result.slug).toBe(publicService.slug);
  });
});
