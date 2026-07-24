import { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const createMembershipCheckoutSessionMock = vi.fn();

vi.mock("@/lib/api.js", () => ({
  createMembershipCheckoutSession: (...args) => createMembershipCheckoutSessionMock(...args),
}));

// dedupeByKey is left as the REAL implementation (same convention as
// MembershipAuthenticatedAccount.test.jsx) — the StrictMode test below
// relies on its actual dedup behavior.
vi.mock("@/lib/authenticatedApi.js", async () => {
  const actual = await vi.importActual("@/lib/authenticatedApi.js");
  return { ...actual };
});

vi.mock("@/lib/stripeClient.js", () => ({ stripePromise: Promise.resolve({}) }));

const embeddedCheckoutProviderOptionsSpy = vi.fn();
vi.mock("@stripe/react-stripe-js", () => ({
  EmbeddedCheckoutProvider: ({ children, options }) => {
    embeddedCheckoutProviderOptionsSpy(options);
    return <div data-testid="embedded-checkout-provider">{children}</div>;
  },
  EmbeddedCheckout: () => <div data-testid="embedded-checkout" />,
}));

const { default: MembershipEmbeddedCheckout } = await import(
  "@/components/memberships/MembershipEmbeddedCheckout.jsx"
);

const originalLocation = window.location;
const assignMock = vi.fn();

// dedupeByKey's in-flight cache is keyed by userId:membershipPlanId:
// serviceId and lives at module scope in authenticatedApi.js (by design —
// see its own docstring), so it is NOT reset between tests. Every test
// here must use its own unique serviceId, or it would silently reuse a
// previous test's (possibly never-resolving, e.g. the loading-state test)
// cached in-flight promise instead of actually calling the mock again.
let nextServiceId = 0;

function renderEmbedded(props = {}, { strict = false } = {}) {
  nextServiceId += 1;
  const element = (
    <MembershipEmbeddedCheckout
      userId="user-1"
      membershipPlanId="plan-1"
      serviceId={`svc-${nextServiceId}`}
      customerEmail="cliente@example.com"
      customerName=""
      onError={vi.fn()}
      {...props}
    />
  );
  return render(strict ? <StrictMode>{element}</StrictMode> : element);
}

beforeEach(() => {
  createMembershipCheckoutSessionMock.mockReset();
  embeddedCheckoutProviderOptionsSpy.mockReset();
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

describe("MembershipEmbeddedCheckout", () => {
  it("shows a loading state before the session resolves", () => {
    createMembershipCheckoutSessionMock.mockReturnValue(new Promise(() => {}));
    renderEmbedded();
    expect(screen.getByText("Preparando el pago seguro…")).toBeInTheDocument();
    expect(screen.queryByTestId("embedded-checkout")).not.toBeInTheDocument();
  });

  it("mounts Stripe's Embedded Checkout once the session resolves, fed by the client_secret", async () => {
    createMembershipCheckoutSessionMock.mockResolvedValue({
      ok: true,
      session_id: "cs_test_1",
      checkout_ui_mode: "embedded",
      client_secret: "cs_test_1_secret_fake",
    });
    renderEmbedded();
    expect(await screen.findByTestId("embedded-checkout")).toBeInTheDocument();
    expect(embeddedCheckoutProviderOptionsSpy).toHaveBeenCalledWith({ clientSecret: "cs_test_1_secret_fake" });
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("never writes the client_secret to sessionStorage or localStorage", async () => {
    createMembershipCheckoutSessionMock.mockResolvedValue({
      ok: true,
      session_id: "cs_test_1",
      checkout_ui_mode: "embedded",
      client_secret: "cs_test_1_secret_fake",
    });
    renderEmbedded();
    await screen.findByTestId("embedded-checkout");

    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      expect(sessionStorage.getItem(key)).not.toContain("cs_test_1_secret_fake");
    }
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      expect(localStorage.getItem(key)).not.toContain("cs_test_1_secret_fake");
    }
  });

  it("redirects via window.location.assign for the hosted rollback fallback, never mounting the embedded UI", async () => {
    createMembershipCheckoutSessionMock.mockResolvedValue({
      ok: true,
      session_id: "cs_test_2",
      checkout_ui_mode: "hosted",
      session_url: "https://checkout.stripe.com/c/pay/cs_test_2",
    });
    renderEmbedded();
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith("https://checkout.stripe.com/c/pay/cs_test_2"));
    expect(screen.queryByTestId("embedded-checkout")).not.toBeInTheDocument();
  });

  it("reports a safe, translated error via onError and never renders the embedded UI", async () => {
    createMembershipCheckoutSessionMock.mockRejectedValue(new Error("membership_plan_not_synced_to_stripe_test"));
    const onError = vi.fn();
    renderEmbedded({ onError });
    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith("El pago no está disponible en este momento. Intenta más tarde.")
    );
    expect(screen.queryByTestId("embedded-checkout")).not.toBeInTheDocument();
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("never sends two session requests for React StrictMode's dev mount→cleanup→remount simulation", async () => {
    let callCount = 0;
    createMembershipCheckoutSessionMock.mockImplementation(() => {
      callCount += 1;
      return Promise.resolve({
        ok: true,
        session_id: "cs_test_3",
        checkout_ui_mode: "embedded",
        client_secret: "cs_test_3_secret_fake",
      });
    });
    renderEmbedded({}, { strict: true });
    await screen.findByTestId("embedded-checkout");
    expect(callCount).toBe(1);
  });
});
