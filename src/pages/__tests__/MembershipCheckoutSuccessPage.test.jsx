import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

const getMembershipCheckoutSessionStatusMock = vi.fn();

vi.mock("@/lib/api.js", () => ({
  getMembershipCheckoutSessionStatus: (...args) => getMembershipCheckoutSessionStatusMock(...args),
}));

const { default: MembershipCheckoutSuccessPage } = await import(
  "@/pages/MembershipCheckoutSuccessPage.jsx"
);

function statusResponse(overrides = {}) {
  return {
    ok: true,
    status: "trialing",
    plan: { id: "plan-1", name: "Membresía Crecimiento — TEST" },
    service: { id: "svc-1", name: "Gestión de Redes Sociales" },
    trial_end: "2026-08-01T00:00:00Z",
    current_period_end: null,
    ...overrides,
  };
}

function renderPage(search = "?session_id=cs_test_123") {
  const router = createMemoryRouter(
    [{ path: "/membresias/checkout/exito", element: <MembershipCheckoutSuccessPage /> }],
    { initialEntries: [`/membresias/checkout/exito${search}`] }
  );
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  getMembershipCheckoutSessionStatusMock.mockReset();
});

describe("MembershipCheckoutSuccessPage", () => {
  it("re-queries the backend using session_id instead of trusting the URL alone, and renders the confirmed subscription", async () => {
    getMembershipCheckoutSessionStatusMock.mockResolvedValue(statusResponse());
    renderPage();
    await waitFor(() => expect(getMembershipCheckoutSessionStatusMock).toHaveBeenCalledWith("cs_test_123"));
    expect(await screen.findByText("Membresía Crecimiento — TEST")).toBeInTheDocument();
    expect(screen.getByText("Gestión de Redes Sociales")).toBeInTheDocument();
    expect(screen.getByText("En período de prueba")).toBeInTheDocument();
    expect(screen.getByText(/Tu período de prueba termina el/)).toBeInTheDocument();
  });

  it("shows the fallback message when there is no session_id in the URL", async () => {
    renderPage("");
    expect(await screen.findByText("No pudimos confirmar tu suscripción")).toBeInTheDocument();
    expect(getMembershipCheckoutSessionStatusMock).not.toHaveBeenCalled();
  });

  it("shows the fallback message when the backend can't confirm the session", async () => {
    getMembershipCheckoutSessionStatusMock.mockRejectedValue(new Error("checkout_session_not_found"));
    renderPage();
    expect(await screen.findByText("No pudimos confirmar tu suscripción")).toBeInTheDocument();
  });
});
