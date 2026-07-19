import { describe, it, expect, vi, beforeEach } from "vitest";

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

import { createStoreOrder, getStoreCartCurrent } from "@/services/storeCheckoutApi.js";
import {
  submitPublicStoreCheckout,
  setStoredCartSessionToken,
  getStoredCartSessionToken,
} from "@/lib/api.js";

const BASE_CART = {
  id: "cart-1",
  status: "open",
  session_token: "session-abc",
  contact_id: null,
};

function mockCartLookup() {
  getStoreCartCurrent.mockResolvedValue({ cart: BASE_CART, items: [], count: 0 });
}

function checkoutPayload(overrides = {}) {
  return {
    sessionToken: "session-abc",
    name: "Ana Pérez",
    email: "ana@example.com",
    documentType: "invoice",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  setStoredCartSessionToken("session-abc");
});

describe("submitPublicStoreCheckout — sale_mode / payment_required contract", () => {
  it("surfaces sale_mode=cotizacion, proposal_id, and payment_required=false from the backend response", async () => {
    mockCartLookup();
    createStoreOrder.mockResolvedValue({
      order: { id: "order-1", order_number: "ORD-1", grand_total: 500, status: "pending", payment_status: "pending" },
      sale_mode: "cotizacion",
      proposal_id: "prop-1",
      payment_required: false,
      booking_summary: [],
    });

    const result = await submitPublicStoreCheckout(checkoutPayload());

    expect(result.saleMode).toBe("cotizacion");
    expect(result.proposalId).toBe("prop-1");
    expect(result.paymentRequired).toBe(false);
    expect(result.order.id).toBe("order-1");
  });

  it("surfaces sale_mode=compra_directa and payment_required=true", async () => {
    mockCartLookup();
    createStoreOrder.mockResolvedValue({
      order: { id: "order-2", order_number: "ORD-2", grand_total: 200, status: "pending", payment_status: "pending" },
      sale_mode: "compra_directa",
      proposal_id: null,
      payment_required: true,
      booking_summary: [],
    });

    const result = await submitPublicStoreCheckout(checkoutPayload());

    expect(result.saleMode).toBe("compra_directa");
    expect(result.proposalId).toBeNull();
    expect(result.paymentRequired).toBe(true);
  });

  // 11. respuesta legacy sin payment_required conserva compra directa
  it("defaults payment_required to true when the backend response has no such field (legacy)", async () => {
    mockCartLookup();
    createStoreOrder.mockResolvedValue({
      order: { id: "order-3", order_number: "ORD-3", grand_total: 300, status: "pending", payment_status: "pending" },
      booking_summary: [],
      // no sale_mode / proposal_id / payment_required at all
    });

    const result = await submitPublicStoreCheckout(checkoutPayload());

    expect(result.paymentRequired).toBe(true);
    expect(result.saleMode).toBe("compra_directa");
  });

  // 15. éxito de cotización limpia carrito (cart token cleared once the order exists)
  it("clears the stored cart session token once the order is created, regardless of sale_mode", async () => {
    mockCartLookup();
    createStoreOrder.mockResolvedValue({
      order: { id: "order-4", order_number: "ORD-4", grand_total: 500, status: "pending", payment_status: "pending" },
      sale_mode: "cotizacion",
      proposal_id: "prop-4",
      payment_required: false,
    });

    expect(getStoredCartSessionToken()).toBe("session-abc");
    await submitPublicStoreCheckout(checkoutPayload());
    expect(getStoredCartSessionToken()).toBeNull();
  });

  // 14. error de propuesta no limpia carrito (create-order itself rejects/throws)
  it("does not clear the cart session token when order creation fails", async () => {
    mockCartLookup();
    createStoreOrder.mockRejectedValue(new Error("mixed_sale_modes_not_supported"));

    await expect(submitPublicStoreCheckout(checkoutPayload())).rejects.toThrow();
    expect(getStoredCartSessionToken()).toBe("session-abc");
  });
});
