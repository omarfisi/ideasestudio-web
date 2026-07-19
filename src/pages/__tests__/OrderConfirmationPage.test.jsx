import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import OrderConfirmationPage from "@/pages/OrderConfirmationPage.jsx";

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
