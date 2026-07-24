import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

const getMembershipPlanSelectionMock = vi.fn();
const createMembershipCheckoutSessionMock = vi.fn();
const resolveCustomerProfileMock = vi.fn();

vi.mock("@/lib/api.js", () => ({
  getMembershipPlanSelection: (...args) => getMembershipPlanSelectionMock(...args),
  createMembershipCheckoutSession: (...args) => createMembershipCheckoutSessionMock(...args),
}));

// MembershipAuthenticatedAccount (rendered once a session exists) resolves
// the CRM profile on its own via authenticatedApi.js — dedupeByKey is left
// as the REAL implementation (StrictMode-dedup tests below rely on it),
// only resolveCustomerProfile itself is mocked. Defaults to success so the
// existing "authenticated" test cases below (written before profile
// resolution existed) keep passing without every one of them having to
// know about it.
vi.mock("@/lib/authenticatedApi.js", async () => {
  const actual = await vi.importActual("@/lib/authenticatedApi.js");
  return {
    ...actual,
    resolveCustomerProfile: (...args) => resolveCustomerProfileMock(...args),
  };
});

// Starts authenticated by default — most of this suite is about plan
// loading/submission, not auth itself. Tests that care about the auth
// gate override this per-case (see "auth gate" describe blocks below).
let mockAuthState = {
  session: { user: { id: "user-1", email: "cliente@example.com" } },
  loading: false,
};

vi.mock("@/contexts/AuthContext.jsx", () => ({
  useAuth: () => mockAuthState,
}));

const { default: MembershipCheckoutPage } = await import("@/pages/MembershipCheckoutPage.jsx");

const STORAGE_KEY = "ideas_membership_checkout_selection_v1";

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

function renderPageAtSearch(search) {
  const router = createMemoryRouter(
    [{ path: "/membresias/checkout", element: <MembershipCheckoutPage /> }],
    { initialEntries: [{ pathname: "/membresias/checkout", search, state: null }] }
  );
  return render(<RouterProvider router={router} />);
}

const originalLocation = window.location;
const assignMock = vi.fn();

beforeEach(() => {
  getMembershipPlanSelectionMock.mockReset();
  createMembershipCheckoutSessionMock.mockReset();
  resolveCustomerProfileMock.mockReset().mockResolvedValue({ ok: true, name: null, email: "cliente@example.com", phone: null });
  assignMock.mockReset();
  sessionStorage.clear();
  mockAuthState = {
    session: { user: { id: "user-1", email: "cliente@example.com" } },
    loading: false,
  };
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
  it("shows the missing-selection message when no plan/service ids arrive via navigation state or sessionStorage", async () => {
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

// Profile resolution (MembershipAuthenticatedAccount) runs independently
// of the plan-selection load and settles asynchronously (even with a
// same-tick-resolving mock, it's still a microtask) — waiting only for
// the plan text risks a race where the submit button is still disabled
// when the click fires, especially under a slower/parallel test run.
// Every test below that clicks "Continuar al pago seguro" waits for it to
// actually be enabled first, exactly like a real user would only be able to.
async function waitForSubmitEnabled() {
  const button = await screen.findByRole("button", { name: "Continuar al pago seguro" });
  await waitFor(() => expect(button).not.toBeDisabled());
  return button;
}

describe("MembershipCheckoutPage — authenticated: starting the subscription checkout", () => {
  it("submits with customer_email from session.user.email, creates a Checkout Session, and redirects to Stripe's hosted page", async () => {
    getMembershipPlanSelectionMock.mockResolvedValue(selectionResponse());
    createMembershipCheckoutSessionMock.mockResolvedValue({
      ok: true,
      session_id: "cs_test_123",
      session_url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });
    renderPage();
    await screen.findByText("Gestión de Redes Sociales");

    // The account's email is shown, never an editable field for it.
    expect(screen.getByText("cliente@example.com")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("tu@correo.com")).not.toBeInTheDocument();

    fireEvent.click(await waitForSubmitEnabled());

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

  it("keeps the form on screen and shows a safe, friendly error when session creation fails — never the backend's raw code", async () => {
    getMembershipPlanSelectionMock.mockResolvedValue(selectionResponse());
    createMembershipCheckoutSessionMock.mockRejectedValue(new Error("membership_plan_not_synced_to_stripe_test"));
    renderPage();
    await screen.findByText("Gestión de Redes Sociales");

    fireEvent.click(await waitForSubmitEnabled());

    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent("membership_plan_not_synced_to_stripe_test");
    expect(alert).toHaveTextContent("El pago no está disponible en este momento. Intenta más tarde.");
    expect(assignMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Continuar al pago seguro" })).toBeInTheDocument();
  });

  it("blocks checkout and shows a session-expired message if the authenticated user somehow has no email", async () => {
    mockAuthState = { session: { user: { id: "user-2" } }, loading: false };
    getMembershipPlanSelectionMock.mockResolvedValue(selectionResponse());
    renderPage();
    await screen.findByText("Gestión de Redes Sociales");

    fireEvent.click(await waitForSubmitEnabled());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tu sesión no es válida o expiró. Vuelve a iniciar sesión."
    );
    expect(createMembershipCheckoutSessionMock).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("keeps the submit button disabled while the profile is still resolving", async () => {
    getMembershipPlanSelectionMock.mockResolvedValue(selectionResponse());
    let resolveProfile;
    resolveCustomerProfileMock.mockReturnValue(new Promise((resolve) => { resolveProfile = resolve; }));
    renderPage();
    await screen.findByText("Gestión de Redes Sociales");

    expect(screen.getByRole("button", { name: "Continuar al pago seguro" })).toBeDisabled();

    resolveProfile({ ok: true, name: null, email: "cliente@example.com", phone: null });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continuar al pago seguro" })).not.toBeDisabled()
    );
    expect(createMembershipCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it("blocks checkout when the profile resolve conflicts (409) and never calls createMembershipCheckoutSession", async () => {
    getMembershipPlanSelectionMock.mockResolvedValue(selectionResponse());
    const conflictError = new Error("customer_contact_conflict");
    conflictError.code = "customer_contact_conflict";
    conflictError.status = 409;
    resolveCustomerProfileMock.mockRejectedValue(conflictError);
    renderPage();
    await screen.findByText("Gestión de Redes Sociales");

    expect(
      await screen.findByText("No pudimos vincular tu cuenta automáticamente. Comunícate con soporte.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar al pago seguro" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Continuar al pago seguro" }));
    expect(createMembershipCheckoutSessionMock).not.toHaveBeenCalled();
  });
});

describe("MembershipCheckoutPage — unauthenticated: auth gate", () => {
  beforeEach(() => {
    mockAuthState = { session: null, loading: false };
  });

  it("shows the auth gate instead of the payment form, and never calls createMembershipCheckoutSession", async () => {
    getMembershipPlanSelectionMock.mockResolvedValue(selectionResponse());
    renderPage();
    await screen.findByText("Gestión de Redes Sociales");

    expect(screen.getByRole("tab", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Crear cuenta" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continuar al pago seguro" })).not.toBeInTheDocument();
    expect(createMembershipCheckoutSessionMock).not.toHaveBeenCalled();
  });
});

describe("MembershipCheckoutPage — verifying session", () => {
  it("shows a loading state and never the payment form while auth is resolving", async () => {
    mockAuthState = { session: undefined, loading: true };
    getMembershipPlanSelectionMock.mockResolvedValue(selectionResponse());
    renderPage();
    await screen.findByText("Gestión de Redes Sociales");

    expect(screen.getByText("Verificando tu sesión…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continuar al pago seguro" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Iniciar sesión" })).not.toBeInTheDocument();
  });
});

describe("MembershipCheckoutPage — sessionStorage restoration", () => {
  it("restores membershipPlanId/serviceId from sessionStorage when navigation state is empty, and still re-validates against the backend", async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ membershipPlanId: "plan-1", serviceId: "svc-1" })
    );
    getMembershipPlanSelectionMock.mockResolvedValue(selectionResponse());

    renderPage({ state: null });

    await waitFor(() =>
      expect(getMembershipPlanSelectionMock).toHaveBeenCalledWith({
        membershipPlanId: "plan-1",
        serviceId: "svc-1",
      })
    );
    expect(await screen.findByText("Gestión de Redes Sociales")).toBeInTheDocument();
  });

  it("never restores price/benefits from sessionStorage — only the two ids are ever stored", async () => {
    getMembershipPlanSelectionMock.mockResolvedValue(selectionResponse());
    renderPage();
    await screen.findByText("Gestión de Redes Sociales");

    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    expect(Object.keys(stored).sort()).toEqual(["membershipPlanId", "serviceId"]);
  });

  it("preserves the plan selection across a magic-link/signup redirect back to the checkout (no navigation state, only sessionStorage)", async () => {
    // Simulates: visitor was on checkout, requested a magic link (which
    // saved the ids), clicked the email link, and landed back on
    // /membresias/checkout as a brand-new navigation — no location.state,
    // exactly like following an external email link would produce.
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ membershipPlanId: "plan-1", serviceId: "svc-1" })
    );
    getMembershipPlanSelectionMock.mockResolvedValue(selectionResponse());
    mockAuthState = { session: null, loading: false };

    renderPage({ state: null });

    expect(await screen.findByRole("tab", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(getMembershipPlanSelectionMock).toHaveBeenCalledWith({
      membershipPlanId: "plan-1",
      serviceId: "svc-1",
    });
  });

  it("clears the stored selection once a Checkout Session is created", async () => {
    getMembershipPlanSelectionMock.mockResolvedValue(selectionResponse());
    createMembershipCheckoutSessionMock.mockResolvedValue({
      ok: true,
      session_id: "cs_test_123",
      session_url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });
    renderPage();
    await screen.findByText("Gestión de Redes Sociales");

    fireEvent.click(await waitForSubmitEnabled());

    await waitFor(() => expect(assignMock).toHaveBeenCalled());
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("MembershipCheckoutPage — direct link via URL query params", () => {
  it("loads the plan from ?membershipPlanId=&serviceId= when there is no navigation state", async () => {
    getMembershipPlanSelectionMock.mockResolvedValue(selectionResponse());

    renderPageAtSearch("?membershipPlanId=plan-1&serviceId=svc-1");

    await waitFor(() =>
      expect(getMembershipPlanSelectionMock).toHaveBeenCalledWith({
        membershipPlanId: "plan-1",
        serviceId: "svc-1",
      })
    );
    expect(await screen.findByText("Gestión de Redes Sociales")).toBeInTheDocument();
  });

  it("still re-validates against the backend and shows the ordinary error state for a query-param plan the backend rejects", async () => {
    getMembershipPlanSelectionMock.mockRejectedValue(new Error("not_found"));

    renderPageAtSearch("?membershipPlanId=plan-private&serviceId=svc-1");

    await waitFor(() => expect(getMembershipPlanSelectionMock).toHaveBeenCalled());
    expect(await screen.findByRole("link", { name: "Volver a servicios" })).toBeInTheDocument();
  });

  it("shows the missing-selection message when only one of the two query params is present", async () => {
    renderPageAtSearch("?membershipPlanId=plan-1");
    expect(await screen.findByRole("link", { name: "Ver servicios" })).toBeInTheDocument();
    expect(getMembershipPlanSelectionMock).not.toHaveBeenCalled();
  });
});
