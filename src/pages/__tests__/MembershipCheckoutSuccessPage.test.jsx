import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

const getMembershipCheckoutSessionStatusMock = vi.fn();

vi.mock("@/lib/api.js", () => ({
  getMembershipCheckoutSessionStatus: (...args) => getMembershipCheckoutSessionStatusMock(...args),
}));

const STORAGE_KEY = "ideas_membership_checkout_selection_v1";

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
  sessionStorage.clear();
});

describe("MembershipCheckoutSuccessPage", () => {
  it("re-queries the backend using session_id instead of trusting the URL alone, and renders the confirmed subscription", async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ membershipPlanId: "plan-1", serviceId: "svc-1" }));
    getMembershipCheckoutSessionStatusMock.mockResolvedValue(statusResponse());
    renderPage();
    await waitFor(() => expect(getMembershipCheckoutSessionStatusMock).toHaveBeenCalledWith("cs_test_123"));
    expect(await screen.findByText("Membresía Crecimiento — TEST")).toBeInTheDocument();
    expect(screen.getByText("Gestión de Redes Sociales")).toBeInTheDocument();
    expect(screen.getByText("En período de prueba")).toBeInTheDocument();
    expect(screen.getByText(/Tu período de prueba termina el/)).toBeInTheDocument();
    // A definitive (non-"incomplete") answer from the backend — the
    // stored plan/service selection has done its job.
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
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

describe("MembershipCheckoutSuccessPage — polling while the webhook is still processing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps showing the confirming state and retries while status is 'incomplete', never clearing the stored selection", async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ membershipPlanId: "plan-1", serviceId: "svc-1" }));
    getMembershipCheckoutSessionStatusMock.mockResolvedValue(statusResponse({ status: "incomplete" }));
    renderPage();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("Confirmando tu suscripción…")).toBeInTheDocument();
    expect(getMembershipCheckoutSessionStatusMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(getMembershipCheckoutSessionStatusMock).toHaveBeenCalledTimes(2);
    expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("gives up after the bounded number of retries and shows a safe 'still processing' message, never a false active/trialing state", async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ membershipPlanId: "plan-1", serviceId: "svc-1" }));
    getMembershipCheckoutSessionStatusMock.mockResolvedValue(statusResponse({ status: "incomplete" }));
    renderPage();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    // 6 retries beyond the first attempt = 7 total calls before giving up.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500 * 6);
    });

    expect(screen.getByText("Tu pago sigue en proceso")).toBeInTheDocument();
    expect(screen.queryByText("En período de prueba")).not.toBeInTheDocument();
    expect(screen.queryByText("Activa")).not.toBeInTheDocument();
    // Genuinely unresolved — never assumed to be "done", so the stored
    // selection is deliberately left alone.
    expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("stops polling and shows the confirmed subscription as soon as a later attempt reports a definitive status", async () => {
    getMembershipCheckoutSessionStatusMock
      .mockResolvedValueOnce(statusResponse({ status: "incomplete" }))
      .mockResolvedValueOnce(statusResponse({ status: "active", trial_end: null, current_period_end: "2026-09-01T00:00:00Z" }));
    renderPage();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(getMembershipCheckoutSessionStatusMock).toHaveBeenCalledTimes(2);
  });
});
