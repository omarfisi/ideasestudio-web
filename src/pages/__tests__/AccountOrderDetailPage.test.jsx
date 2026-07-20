import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

let mockSession = { user: { id: "user-1" } };
vi.mock("@/contexts/AuthContext.jsx", () => ({
  useAuth: () => ({ session: mockSession, loading: false }),
}));

const getMyOrderDetailMock = vi.fn();
const cancelMyOrderMock = vi.fn();
vi.mock("@/lib/accountApi.js", () => ({
  getMyOrderDetail: (...args) => getMyOrderDetailMock(...args),
  cancelMyOrder: (...args) => cancelMyOrderMock(...args),
}));

const { default: AccountOrderDetailPage } = await import("@/pages/AccountOrderDetailPage.jsx");

const BASE_ORDER = {
  id: "order-1",
  order_number: "ORD-1",
  status: "pending",
  payment_status: "pending",
  currency: "USD",
  grand_total: 500,
  customer_email: "ana@example.com",
  created_at: "2026-01-01T00:00:00Z",
  document_type: null,
  invoice_id: null,
  proposal_id: null,
  items: [],
};

function renderPage(order = BASE_ORDER) {
  getMyOrderDetailMock.mockResolvedValue({ item: order });
  return render(
    <MemoryRouter initialEntries={["/mi-cuenta/ordenes/order-1"]}>
      <Routes>
        <Route path="/mi-cuenta/ordenes/:orderId" element={<AccountOrderDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockSession = { user: { id: "user-1" } };
  getMyOrderDetailMock.mockReset();
  cancelMyOrderMock.mockReset();
});

describe("AccountOrderDetailPage — Cancelar orden button visibility", () => {
  it("shows 'Cancelar orden' for a pending, unpaid order", async () => {
    renderPage();
    expect(await screen.findByRole("button", { name: "Cancelar orden" })).toBeInTheDocument();
  });

  it("hides 'Cancelar orden' for a paid order", async () => {
    renderPage({ ...BASE_ORDER, status: "paid", payment_status: "paid" });
    await screen.findByText("ORD-1");
    expect(screen.queryByRole("button", { name: "Cancelar orden" })).not.toBeInTheDocument();
  });

  it("hides 'Cancelar orden' for an already-cancelled order", async () => {
    renderPage({ ...BASE_ORDER, status: "cancelled", payment_status: "cancelled" });
    await screen.findByText("ORD-1");
    expect(screen.queryByRole("button", { name: "Cancelar orden" })).not.toBeInTheDocument();
  });

  it("shows 'Cancelar orden' for a pending cotización even with no 'Completar pago' CTA", async () => {
    renderPage({
      ...BASE_ORDER,
      document_type: "proposal",
      invoice_id: null,
    });
    expect(await screen.findByRole("button", { name: "Cancelar orden" })).toBeInTheDocument();
    expect(screen.queryByText("Completar pago")).not.toBeInTheDocument();
  });
});

describe("AccountOrderDetailPage — confirmation modal", () => {
  it("opens the confirmation modal with the expected title on click", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar orden" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Cancelar esta orden")).toBeInTheDocument();
  });

  it("'Volver' closes the modal without calling cancelMyOrder", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar orden" }));
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(cancelMyOrderMock).not.toHaveBeenCalled();
  });

  it("submits the typed reason to cancelMyOrder on confirm", async () => {
    cancelMyOrderMock.mockResolvedValue({
      ok: true,
      item: { id: "order-1", order_number: "ORD-1", status: "cancelled", payment_status: "cancelled" },
    });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar orden" }));
    fireEvent.change(screen.getByLabelText("Motivo (opcional)"), {
      target: { value: "Ya no lo necesito" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));

    await waitFor(() => expect(cancelMyOrderMock).toHaveBeenCalledWith("order-1", "Ya no lo necesito"));
  });
});

describe("AccountOrderDetailPage — post-success UI updates", () => {
  it("shows the Cancelada badge and hides Cancelar orden / Completar pago after a successful cancel", async () => {
    cancelMyOrderMock.mockResolvedValue({
      ok: true,
      item: { id: "order-1", order_number: "ORD-1", status: "cancelled", payment_status: "cancelled" },
    });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar orden" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));

    expect(await screen.findByText("Cancelada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar orden" })).not.toBeInTheDocument();
    expect(screen.queryByText("Completar pago")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the rest of the order (total, email) intact after the minimal cancel response merges in", async () => {
    cancelMyOrderMock.mockResolvedValue({
      ok: true,
      item: { id: "order-1", order_number: "ORD-1", status: "cancelled", payment_status: "cancelled" },
    });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar orden" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));

    await screen.findByText("Cancelada");
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("$500.00").length).toBeGreaterThan(0);
  });
});

describe("AccountOrderDetailPage — loading state and errors", () => {
  it("shows 'Cancelando…' and disables the confirm button while the request is in flight", async () => {
    let resolvePromise;
    cancelMyOrderMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar orden" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));

    const pendingButton = await screen.findByRole("button", { name: "Cancelando…" });
    expect(pendingButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "Volver" })).toBeDisabled();

    resolvePromise({
      ok: true,
      item: { id: "order-1", order_number: "ORD-1", status: "cancelled", payment_status: "cancelled" },
    });
    await screen.findByText("Cancelada");
  });

  it("shows a friendly message for order_has_completed_payment and keeps the order unchanged", async () => {
    cancelMyOrderMock.mockRejectedValue(new Error("order_has_completed_payment"));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar orden" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));

    expect(
      await screen.findByText(
        "Esta orden ya tiene un pago registrado y no se puede cancelar desde aquí. Contáctanos para continuar."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // The order itself must be untouched by a failed cancel attempt — the
    // page never optimistically marks it cancelled before the server
    // confirms it.
    expect(screen.queryByText("Cancelada")).not.toBeInTheDocument();
  });

  it("shows a friendly message for order_cancel_not_allowed", async () => {
    cancelMyOrderMock.mockRejectedValue(new Error("order_cancel_not_allowed"));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar orden" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));

    expect(await screen.findByText("Esta orden ya no se puede cancelar.")).toBeInTheDocument();
  });

  it("falls back to the generic message for an unrecognized/network error", async () => {
    cancelMyOrderMock.mockRejectedValue(new Error("network_error"));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar orden" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));

    expect(
      await screen.findByText("No pudimos conectar con el sistema de pagos. Intenta nuevamente.")
    ).toBeInTheDocument();
  });
});
