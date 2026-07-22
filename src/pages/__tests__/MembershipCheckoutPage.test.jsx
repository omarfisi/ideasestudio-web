import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

const getMembershipPlanSelectionMock = vi.fn();
const createMembershipCheckoutSessionMock = vi.fn();

vi.mock("@/lib/api.js", () => ({
  getMembershipPlanSelection: (...args) => getMembershipPlanSelectionMock(...args),
  createMembershipCheckoutSession: (...args) => createMembershipCheckoutSessionMock(...args),
}));

const { default: MembershipCheckoutPage } = await import("@/pages/MembershipCheckoutPage.jsx");

function selectionResponse(overrides = {}) {
  return {
    plan: {
      id: "plan-1",
      name: "Membresía Crecimiento — TEST",
      price: "79.00",
      currency: "USD",
      billing_interval: "month",
      trial_period_days: 7,
      features_json: [{ key: "posts", label: "8 publicaciones", quantity: 8 }],
    },
    service: {
      id: "svc-1",
      name: "Gestión de Redes Sociales",
    },
    selection: {
      membership_plan_id: "plan-1",
      service_id: "svc-1",
      price: "79.00",
      currency: "USD",
      billing_interval: "month",
      trial_period_days: 7,
    },
    ...overrides,
  };
}

function renderPage({ state = { membershipPlanId: "plan-1", serviceId: "svc-1" } } = {}) {
  const router = createMemoryRouter(
    [{ path: "/membresias/checkout", element: <MembershipCheckoutPage /> }],
    { initialEntries: [{ pathname: "/membresias/checkout", state }] }
  );
  return render(<RouterProvider router={router} />);
}

const originalLocation = window.location;
const assignMock = vi.fn();

beforeEach(() => {
  getMembershipPlanSelectionMock.mockReset();
  createMembershipCheckoutSessionMock.mockReset();
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

describe("MembershipCheckoutPage — missing selection", () => {
  it("shows the missing-selection message when no plan/service ids arrive via navigation state", async () => {
    renderPage({ state: null });
    expect(await screen.findByText("Selecciona un plan primero")).toBeInTheDocument();
    expect(getMembershipPlanSelectionMock).not.toHaveBeenCalled();
  });
});

describe("MembershipCheckoutPage — loading the plan", () => {
  it("re-fetches the authoritative selection from the backend using the navigation state ids", async () => {
    getMembershipPlanSelectionMock.mockResolvedValue(selectionResponse());
    renderPage();
    await waitFor(() =>
      expect(getMembershipPlanSelectionMock).toHaveBeenCalledWith({
        membershipPlanId: "plan-1",
        serviceId: "svc-1",
      })
    );
    expect(await screen.findByText("Gestión de Redes Sociales")).toBeInTheDocument();
    expect(screen.getByText("$79.00")).toBeInTheDocument();
    expect(screen.getByText("7 días de prueba")).toBeInTheDocument();
  });

  it("never renders a quantity control or a calendar/date picker — this is a fixed-plan subscription, not a service booking", async () => {
    getMembershipPlanSelectionMock.mockResolvedValue(selectionResponse());
    renderPage();
    await screen.findByText("Gestión de Redes Sociales");
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/cantidad/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /fecha/i })).not.toBeInTheDocument();
    expect(document.querySelector("input[type='date']")).not.toBeInTheDocument();
  });

  it("shows the service as the plan's included service, not as a separately purchasable product", async () => {
    getMembershipPlanSelectionMock.mockResolvedValue(selectionResponse());
    renderPage();
    await screen.findByText("Gestión de Redes Sociales");
    expect(screen.queryByRole("button", { name: /agregar al carrito/i })).not.toBeInTheDocument();
  });

  it("shows an error state when the plan/service selection is no longer valid", async () => {
    getMembershipPlanSelectionMock.mockRejectedValue(new Error("not_found"));
    renderPage();
    expect(await screen.findByText("No pudimos cargar este plan")).toBeInTheDocument();
  });
});

describe("MembershipCheckoutPage — starting the subscription checkout", () => {
  it("submits customer data, creates a Checkout Session, and redirects to Stripe's hosted page", async () => {
    getMembershipPlanSelectionMock.mockResolvedValue(selectionResponse());
    createMembershipCheckoutSessionMock.mockResolvedValue({
      ok: true,
      session_id: "cs_test_123",
      session_url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });
    renderPage();
    await screen.findByText("Gestión de Redes Sociales");

    fireEvent.change(screen.getByPlaceholderText("tu@correo.com"), {
      target: { value: "cliente@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuar al pago seguro" }));

    await waitFor(() =>
      expect(createMembershipCheckoutSessionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          membershipPlanId: "plan-1",
          serviceId: "svc-1",
          customerEmail: "cliente@example.com",
          successUrl: expect.stringContaining("/membresias/checkout/exito?session_id={CHECKOUT_SESSION_ID}"),
          cancelUrl: expect.stringContaining("/membresias/checkout/cancelado"),
        })
      )
    );
    await waitFor(() =>
      expect(assignMock).toHaveBeenCalledWith("https://checkout.stripe.com/c/pay/cs_test_123")
    );
  });

  it("keeps the form on screen and shows an inline error when session creation fails", async () => {
    getMembershipPlanSelectionMock.mockResolvedValue(selectionResponse());
    createMembershipCheckoutSessionMock.mockRejectedValue(new Error("membership_plan_not_synced_to_stripe_test"));
    renderPage();
    await screen.findByText("Gestión de Redes Sociales");

    fireEvent.change(screen.getByPlaceholderText("tu@correo.com"), {
      target: { value: "cliente@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuar al pago seguro" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("membership_plan_not_synced_to_stripe_test");
    expect(assignMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Continuar al pago seguro" })).toBeInTheDocument();
  });
});
