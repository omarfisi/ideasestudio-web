import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getMyMembershipMock = vi.fn();
const cancelMyMembershipMock = vi.fn();
const reactivateMyMembershipMock = vi.fn();
const createBillingPortalSessionMock = vi.fn();

vi.mock("@/lib/authenticatedApi.js", async () => {
  const actual = await vi.importActual("@/lib/authenticatedApi.js");
  return {
    ...actual,
    getMyMembership: (...args) => getMyMembershipMock(...args),
    cancelMyMembership: (...args) => cancelMyMembershipMock(...args),
    reactivateMyMembership: (...args) => reactivateMyMembershipMock(...args),
    createBillingPortalSession: (...args) => createBillingPortalSessionMock(...args),
  };
});

const { default: MyMembershipPanel } = await import("@/components/account/MyMembershipPanel.jsx");

function renderPanel(userId = "user-1") {
  return render(
    <MemoryRouter>
      <MyMembershipPanel userId={userId} />
    </MemoryRouter>
  );
}

function membership(overrides = {}) {
  return {
    subscription_id: "sub-uuid-1",
    status: "active",
    plan_id: "plan-uuid-1",
    plan_name: "Membresía Crecimiento",
    billing_interval: "month",
    current_period_start: "2026-07-01T00:00:00Z",
    current_period_end: "2026-08-01T00:00:00Z",
    trial_end: null,
    cancel_at_period_end: false,
    can_cancel: false,
    can_reactivate: false,
    can_manage_billing: false,
    created_at: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

const originalLocation = window.location;
const assignMock = vi.fn();

beforeEach(() => {
  getMyMembershipMock.mockReset();
  cancelMyMembershipMock.mockReset();
  reactivateMyMembershipMock.mockReset();
  createBillingPortalSessionMock.mockReset();
  assignMock.mockReset();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { origin: originalLocation.origin, assign: assignMock },
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});

describe("MyMembershipPanel", () => {
  it("shows a friendly message when there is no membership", async () => {
    getMyMembershipMock.mockResolvedValue({ ok: true, membership: null });
    renderPanel();
    expect(await screen.findByText("No tienes una membresía activa.")).toBeInTheDocument();
  });

  it("shows 'Periodo de prueba' for trialing", async () => {
    getMyMembershipMock.mockResolvedValue({ ok: true, membership: membership({ status: "trialing" }) });
    renderPanel();
    expect(await screen.findByText("Periodo de prueba")).toBeInTheDocument();
  });

  it("shows 'Activa' for active", async () => {
    getMyMembershipMock.mockResolvedValue({ ok: true, membership: membership({ status: "active" }) });
    renderPanel();
    expect(await screen.findByText("Activa")).toBeInTheDocument();
  });

  it("shows 'Pago pendiente' for past_due", async () => {
    getMyMembershipMock.mockResolvedValue({ ok: true, membership: membership({ status: "past_due" }) });
    renderPanel();
    expect(await screen.findByText("Pago pendiente")).toBeInTheDocument();
  });

  it("shows 'Cancelada' for canceled", async () => {
    getMyMembershipMock.mockResolvedValue({ ok: true, membership: membership({ status: "canceled" }) });
    renderPanel();
    expect(await screen.findByText("Cancelada")).toBeInTheDocument();
  });

  it("never exposes subscription_id, plan_id or any Stripe/contact identifier", async () => {
    getMyMembershipMock.mockResolvedValue({ ok: true, membership: membership() });
    renderPanel();
    await waitFor(() => expect(screen.getByText("Membresía Crecimiento")).toBeInTheDocument());
    const raw = document.body.textContent;
    expect(raw).not.toContain("sub-uuid-1");
    expect(raw).not.toContain("plan-uuid-1");
    expect(raw).not.toMatch(/stripe|contact_id|metadata/i);
  });

  it("shows a login link when the session has expired (auth_required)", async () => {
    const error = new Error("auth_required");
    error.code = "auth_required";
    error.status = 401;
    getMyMembershipMock.mockRejectedValue(error);
    renderPanel();
    expect(await screen.findByText("Tu sesión expiró")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/mi-cuenta/login");
  });
});

describe("MyMembershipPanel — cancel/reactivate/billing-portal actions", () => {
  it("shows no action buttons when can_cancel/can_reactivate/can_manage_billing are all false", async () => {
    getMyMembershipMock.mockResolvedValue({ ok: true, membership: membership() });
    renderPanel();
    await waitFor(() => expect(screen.getByText("Membresía Crecimiento")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Cancelar membresía" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reactivar membresía" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Administrar facturación" })).not.toBeInTheDocument();
  });

  it("shows only 'Cancelar membresía' when can_cancel is true", async () => {
    getMyMembershipMock.mockResolvedValue({ ok: true, membership: membership({ can_cancel: true }) });
    renderPanel();
    expect(await screen.findByRole("button", { name: "Cancelar membresía" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reactivar membresía" })).not.toBeInTheDocument();
  });

  it("shows 'Reactivar membresía' when can_reactivate is true", async () => {
    getMyMembershipMock.mockResolvedValue({
      ok: true,
      membership: membership({ can_reactivate: true, cancel_at_period_end: true }),
    });
    renderPanel();
    expect(await screen.findByRole("button", { name: "Reactivar membresía" })).toBeInTheDocument();
  });

  it("never shows 'Administrar facturación' even when can_manage_billing is true — temporarily hidden until payment-method updates are handled internally", async () => {
    getMyMembershipMock.mockResolvedValue({
      ok: true,
      membership: membership({ can_cancel: true, can_manage_billing: true }),
    });
    renderPanel();
    await screen.findByRole("button", { name: "Cancelar membresía" });
    expect(screen.queryByRole("button", { name: "Administrar facturación" })).not.toBeInTheDocument();
  });

  it("clicking 'Cancelar membresía' opens a confirmation dialog, not a native confirm()", async () => {
    getMyMembershipMock.mockResolvedValue({ ok: true, membership: membership({ can_cancel: true }) });
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar membresía" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("¿Cancelar tu membresía?")).toBeInTheDocument();
    expect(cancelMyMembershipMock).not.toHaveBeenCalled();
  });

  it("'Volver' closes the dialog without calling cancelMyMembership", async () => {
    getMyMembershipMock.mockResolvedValue({ ok: true, membership: membership({ can_cancel: true }) });
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar membresía" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(cancelMyMembershipMock).not.toHaveBeenCalled();
  });

  it("confirming cancel calls cancelMyMembership and refreshes the membership state", async () => {
    getMyMembershipMock
      .mockResolvedValueOnce({ ok: true, membership: membership({ can_cancel: true }) })
      .mockResolvedValueOnce({
        ok: true,
        membership: membership({ can_cancel: false, can_reactivate: true, cancel_at_period_end: true }),
      });
    cancelMyMembershipMock.mockResolvedValue({
      ok: true,
      membership: {
        status: "active",
        cancel_at_period_end: true,
        current_period_end: "2026-08-01T00:00:00Z",
        message: "Tu membresía permanecerá activa hasta el final del periodo pagado.",
      },
    });
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar membresía" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, cancelar al final del periodo" }));

    await waitFor(() => expect(cancelMyMembershipMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Tu membresía permanecerá activa hasta el final del periodo pagado.")).toBeInTheDocument();
    await waitFor(() => expect(getMyMembershipMock).toHaveBeenCalledTimes(2));
  });

  it("shows an inline error in the dialog when cancelMyMembership fails, and keeps the dialog open", async () => {
    getMyMembershipMock.mockResolvedValue({ ok: true, membership: membership({ can_cancel: true }) });
    const error = new Error("membership_already_canceling");
    error.code = "membership_already_canceling";
    cancelMyMembershipMock.mockRejectedValue(error);
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar membresía" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, cancelar al final del periodo" }));

    expect(await screen.findByText("Tu membresía ya está programada para cancelarse al final del periodo.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not call cancelMyMembership twice when the confirm button is clicked repeatedly before it resolves", async () => {
    getMyMembershipMock.mockResolvedValue({ ok: true, membership: membership({ can_cancel: true }) });
    let resolvePromise;
    cancelMyMembershipMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar membresía" }));
    const confirmButton = await screen.findByRole("button", { name: "Sí, cancelar al final del periodo" });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(cancelMyMembershipMock).toHaveBeenCalledTimes(1);
    resolvePromise({
      ok: true,
      membership: { status: "active", cancel_at_period_end: true, current_period_end: null, message: "ok" },
    });
  });

  it("confirming reactivate calls reactivateMyMembership and shows the success message", async () => {
    getMyMembershipMock
      .mockResolvedValueOnce({
        ok: true,
        membership: membership({ can_reactivate: true, cancel_at_period_end: true }),
      })
      .mockResolvedValueOnce({ ok: true, membership: membership({ can_cancel: true, cancel_at_period_end: false }) });
    reactivateMyMembershipMock.mockResolvedValue({
      ok: true,
      membership: {
        status: "active",
        cancel_at_period_end: false,
        current_period_end: "2026-08-01T00:00:00Z",
        message: "Tu membresía continuará renovándose normalmente.",
      },
    });
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Reactivar membresía" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, reactivar" }));

    await waitFor(() => expect(reactivateMyMembershipMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Tu membresía continuará renovándose normalmente.")).toBeInTheDocument();
  });

  it("closing the confirm dialog with Escape does not call cancelMyMembership", async () => {
    getMyMembershipMock.mockResolvedValue({ ok: true, membership: membership({ can_cancel: true }) });
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar membresía" }));
    await screen.findByRole("dialog");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(cancelMyMembershipMock).not.toHaveBeenCalled();
  });
});
