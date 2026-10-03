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


describe("public store workspace transport", () => {
  it("does not send a client workspace override to the canonical production API", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_CRM_BASE_URL", "https://api.ideasestudio.com");
    vi.stubEnv("VITE_PUBLIC_WORKSPACE_ID", "cfdd0b5a-3468-4d5a-86da-50e1f4f324a6");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, items: [] }),
    });
    const productionApi = await import("@/services/storeCheckoutApi.js");

    await productionApi.getStoreProducts({ limit: 10 });
    const [url] = global.fetch.mock.calls[0];
    expect(String(url)).not.toContain("workspace_id=");
  });

  it("preserves the explicit workspace override for a loopback API", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_CRM_BASE_URL", "http://127.0.0.1:8000");
    vi.stubEnv("VITE_PUBLIC_WORKSPACE_ID", "c7e594e2-5218-40fc-9e4b-e830a21d96b3");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, items: [] }),
    });
    const localApi = await import("@/services/storeCheckoutApi.js");

    await localApi.getStoreProducts({ limit: 10 });
    const [url] = global.fetch.mock.calls[0];
    expect(String(url)).toContain(
      "workspace_id=c7e594e2-5218-40fc-9e4b-e830a21d96b3"
    );
  });
});
