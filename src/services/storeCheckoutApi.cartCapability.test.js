import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient.js", () => ({ supabase: null }));

let api;

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("VITE_CRM_BASE_URL", "https://api.example.test");
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ ok: true }),
  });
  api = await import("@/services/storeCheckoutApi.js");
});

describe("public cart capability transport", () => {
  it("requires the token when reading a cart by id", async () => {
    await expect(api.getStoreCartCurrent({ cartId: "cart-1" })).rejects.toThrow(
      "cartToken es requerido"
    );
  });

  it("sends cart_token on current-cart reads", async () => {
    await api.getStoreCartCurrent({ cartId: "cart-1", cartToken: "owner-token" });
    const [url] = global.fetch.mock.calls[0];
    expect(String(url)).toContain("cart_id=cart-1");
    expect(String(url)).toContain("cart_token=owner-token");
  });

  it.each([
    ["add", () => api.addStoreCartItem({ cartId: "cart-1", cartToken: "owner-token", productId: "product-1", quantity: 1 })],
    ["update", () => api.updateStoreCartItem({ itemId: "item-1", cartToken: "owner-token", quantity: 2 })],
    ["delete", () => api.deleteStoreCartItem({ itemId: "item-1", cartToken: "owner-token" })],
  ])("sends X-Cart-Token for %s", async (_name, call) => {
    await call();
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers["X-Cart-Token"]).toBe("owner-token");
  });
});
