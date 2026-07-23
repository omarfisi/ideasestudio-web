import { describe, it, expect } from "vitest";
import { translateCheckoutError } from "@/lib/membershipCheckoutErrors.js";

describe("translateCheckoutError", () => {
  it("never leaks the backend's raw error code", () => {
    const message = translateCheckoutError(new Error("membership_plan_not_synced_to_stripe_test"));
    expect(message).not.toContain("membership_plan_not_synced_to_stripe_test");
    expect(message).toBe("El pago no está disponible en este momento. Intenta más tarde.");
  });

  it("maps a not-found plan to a friendly message", () => {
    expect(translateCheckoutError(new Error("membership_plan_selection_not_found"))).toBe(
      "Este plan ya no está disponible."
    );
  });

  it("falls back to a generic message for an unrecognized error", () => {
    const message = translateCheckoutError(new Error("some_internal_stack_trace_detail"));
    expect(message).toBe("No pudimos iniciar el pago seguro. Intenta nuevamente.");
  });
});
