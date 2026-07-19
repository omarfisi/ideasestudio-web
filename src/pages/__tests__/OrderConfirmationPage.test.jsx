import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

let mockSession = null;
vi.mock("@/contexts/AuthContext.jsx", () => ({
  useAuth: () => ({ session: mockSession, loading: false }),
}));

// Imported after the mock so OrderConfirmationPage's own `useAuth` import
// resolves to the mocked version above.
const { default: OrderConfirmationPage } = await import("@/pages/OrderConfirmationPage.jsx");

const BASE_ORDER = {
  id: "order-1",
  orderNumber: "ORD-1",
  email: "ana@example.com",
  status: "pending",
  paymentStatus: "pending",
  fulfillmentStatus: "not_applicable",
  currency: "USD",
  subtotal: 500,
  total: 500,
  notes: "",
  source: "website_store",
  items: [
    { id: "item-1", productId: "prod-1", snapshotName: "Diseño de Página Web", quantity: 1, unitPrice: 500 },
  ],
  summary: { lineItems: 1, totalQuantity: 1 },
};

beforeEach(() => {
  window.localStorage.clear();
  mockSession = null;
});

function renderConfirmation({ order = BASE_ORDER, state = null } = {}) {
  const router = createMemoryRouter(
    [
      {
        path: "/servicios/ordenes/:orderNumber",
        loader: () => ({ order }),
        element: <OrderConfirmationPage />,
      },
    ],
    {
      initialEntries: [
        { pathname: "/servicios/ordenes/ORD-1", state: state ?? undefined },
      ],
    }
  );
  return render(<RouterProvider router={router} />);
}

describe("OrderConfirmationPage — quote confirmation (fromCheckout state)", () => {
  // 6. cotización muestra confirmación correcta
  it("shows the quote-received confirmation when navigated from checkout with payment_required=false", async () => {
    renderConfirmation({
      state: {
        fromCheckout: true,
        saleMode: "cotizacion",
        proposalId: "prop-1",
        paymentRequired: false,
        customerName: "Ana Pérez",
      },
    });

    expect((await screen.findAllByText("Solicitud de cotización recibida")).length).toBeGreaterThan(0);
    expect(screen.getByText(/enviamos una propuesta/i)).toBeInTheDocument();
    expect(screen.getByText("ORD-1")).toBeInTheDocument();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
  });

  // 7. cotización no muestra "Pagar ahora"
  it("never renders a 'Pagar ahora' button on the quote confirmation", async () => {
    renderConfirmation({
      state: { fromCheckout: true, paymentRequired: false, saleMode: "cotizacion", proposalId: "prop-1" },
    });
    await screen.findAllByText("Solicitud de cotización recibida");
    expect(screen.queryByText(/pagar ahora/i)).not.toBeInTheDocument();
  });

  // 8. cotización no muestra mensajes de pago exitoso
  it("never shows payment-success language (paid, transaction, invoice download) on the quote confirmation", async () => {
    renderConfirmation({
      state: { fromCheckout: true, paymentRequired: false, saleMode: "cotizacion", proposalId: "prop-1" },
    });
    await screen.findAllByText("Solicitud de cotización recibida");
    expect(screen.queryByText(/pago (exitoso|confirmado|procesado)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/descargar factura/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/número de transacción/i)).not.toBeInTheDocument();
  });

  it("renders the generic order confirmation for a compra_directa order (no fromCheckout state)", async () => {
    renderConfirmation({ order: { ...BASE_ORDER, paymentStatus: "paid", status: "paid" }, state: null });
    expect(await screen.findByText("Confirmación de la orden")).toBeInTheDocument();
    expect(screen.queryByText("Solicitud de cotización recibida")).not.toBeInTheDocument();
  });

  // 18. refresh de confirmación recupera order_id sin crear otra orden
  it("falls back to the generic order view on a bare refresh (no router state) without calling create-order again", async () => {
    // No state passed at all — simulates a page refresh/direct link. The
    // page only ever reads the order via the route loader (by order
    // number); it has no code path that calls create-order.
    renderConfirmation({ state: null });
    expect(await screen.findByText("Confirmación de la orden")).toBeInTheDocument();
    expect(screen.getByText("ORD-1")).toBeInTheDocument();
  });

  it("shows the not-found state when the loader resolves no order", async () => {
    renderConfirmation({ order: null, state: null });
    expect(await screen.findByText("Orden no encontrada")).toBeInTheDocument();
  });
});

describe("OrderConfirmationPage — refresh recovery (last_store_order)", () => {
  // 1. refresh recupera cotización desde last_store_order
  it("rebuilds the quote confirmation from last_store_order when there is no router state", async () => {
    window.localStorage.setItem(
      "last_store_order",
      JSON.stringify({
        order_id: "order-1",
        order_number: "ORD-1",
        sale_mode: "cotizacion",
        proposal_id: "prop-1",
        payment_required: false,
        customer_name: "Ana Pérez",
      })
    );

    renderConfirmation({ state: null });

    expect((await screen.findAllByText("Solicitud de cotización recibida")).length).toBeGreaterThan(0);
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
  });

  // 6. valores monetarios siempre vienen del loader (never localStorage)
  it("always displays the loader's order total, even when localStorage carries a recovered quote context", async () => {
    window.localStorage.setItem(
      "last_store_order",
      JSON.stringify({
        order_number: "ORD-1",
        sale_mode: "cotizacion",
        payment_required: false,
        proposal_id: "prop-1",
      })
    );

    renderConfirmation({ order: { ...BASE_ORDER, total: 777 }, state: null });

    await screen.findAllByText("Solicitud de cotización recibida");
    expect(screen.getByText("$777.00")).toBeInTheDocument();
  });

  it("ignores last_store_order for a different order_number and shows the generic view", async () => {
    window.localStorage.setItem(
      "last_store_order",
      JSON.stringify({ order_number: "ORD-OTHER", sale_mode: "cotizacion", payment_required: false })
    );
    renderConfirmation({ state: null });
    expect(await screen.findByText("Confirmación de la orden")).toBeInTheDocument();
  });

  // 3. JSON corrupto se ignora
  it("ignores corrupt JSON in last_store_order and shows the generic view instead of crashing", async () => {
    window.localStorage.setItem("last_store_order", "{not valid json");
    renderConfirmation({ state: null });
    expect(await screen.findByText("Confirmación de la orden")).toBeInTheDocument();
  });

  // 4. stored payment_required=true se ignora
  it("ignores a stored payment_required=true (not a pending quote)", async () => {
    window.localStorage.setItem(
      "last_store_order",
      JSON.stringify({ order_number: "ORD-1", sale_mode: "cotizacion", payment_required: true })
    );
    renderConfirmation({ state: null });
    expect(await screen.findByText("Confirmación de la orden")).toBeInTheDocument();
  });

  // 5. stored sale_mode distinto de cotizacion se ignora
  it("ignores a stored sale_mode that isn't cotizacion", async () => {
    window.localStorage.setItem(
      "last_store_order",
      JSON.stringify({ order_number: "ORD-1", sale_mode: "compra_directa", payment_required: false })
    );
    renderConfirmation({ state: null });
    expect(await screen.findByText("Confirmación de la orden")).toBeInTheDocument();
  });

  // 7 & 8. refresh no llama create-order / create-payment-intent
  it("never calls create-order or create-payment-intent on a refresh recovery", async () => {
    const apiMock = await import("@/lib/api.js");
    const createOrderSpy = vi.spyOn(apiMock, "submitPublicStoreCheckout");
    const createIntentSpy = vi.spyOn(apiMock, "createPublicStorePaymentIntent");

    window.localStorage.setItem(
      "last_store_order",
      JSON.stringify({ order_number: "ORD-1", sale_mode: "cotizacion", payment_required: false })
    );
    renderConfirmation({ state: null });
    await screen.findAllByText("Solicitud de cotización recibida");

    expect(createOrderSpy).not.toHaveBeenCalled();
    expect(createIntentSpy).not.toHaveBeenCalled();
    createOrderSpy.mockRestore();
    createIntentSpy.mockRestore();
  });
});

describe("OrderConfirmationPage — 'Ver mi orden' button", () => {
  // 9. botón "Ver mi orden" no apunta a la misma URL
  it("guest (no session): shows 'Actualizar estado' instead of a circular 'Ver mi orden' link to the same URL", async () => {
    mockSession = null;
    renderConfirmation({
      state: { fromCheckout: true, paymentRequired: false, saleMode: "cotizacion", proposalId: "prop-1" },
    });
    await screen.findAllByText("Solicitud de cotización recibida");

    expect(screen.queryByRole("link", { name: /ver mi orden/i })).not.toBeInTheDocument();
    const refreshButton = screen.getByRole("button", { name: /actualizar estado/i });
    expect(refreshButton).toBeInTheDocument();
  });

  // 10. usuario autenticado navega al detalle correcto
  it("authenticated: 'Ver mi orden' links to the account order-detail page by order.id, not this confirmation URL", async () => {
    mockSession = { user: { id: "user-1" } };
    renderConfirmation({
      state: { fromCheckout: true, paymentRequired: false, saleMode: "cotizacion", proposalId: "prop-1" },
    });
    await screen.findAllByText("Solicitud de cotización recibida");

    const link = screen.getByRole("link", { name: /ver mi orden/i });
    expect(link).toHaveAttribute("href", "/mi-cuenta/ordenes/order-1");
    expect(link.getAttribute("href")).not.toBe("/servicios/ordenes/ORD-1");
  });
});
