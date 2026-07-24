import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getMyMembershipMock = vi.fn();

vi.mock("@/lib/authenticatedApi.js", async () => {
  const actual = await vi.importActual("@/lib/authenticatedApi.js");
  return {
    ...actual,
    getMyMembership: (...args) => getMyMembershipMock(...args),
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
    created_at: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  getMyMembershipMock.mockReset();
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
