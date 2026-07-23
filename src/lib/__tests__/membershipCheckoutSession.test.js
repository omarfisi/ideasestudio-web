import { describe, it, expect, beforeEach } from "vitest";
import {
  saveMembershipCheckoutSelection,
  readMembershipCheckoutSelection,
  clearMembershipCheckoutSelection,
} from "@/lib/membershipCheckoutSession.js";

const STORAGE_KEY = "ideas_membership_checkout_selection_v1";

beforeEach(() => {
  sessionStorage.clear();
});

describe("membershipCheckoutSession", () => {
  it("round-trips membershipPlanId/serviceId through sessionStorage", () => {
    saveMembershipCheckoutSelection({ membershipPlanId: "plan-1", serviceId: "svc-1" });
    expect(readMembershipCheckoutSelection()).toEqual({
      membershipPlanId: "plan-1",
      serviceId: "svc-1",
    });
  });

  it("never persists anything beyond the two ids, even if extra fields are passed", () => {
    saveMembershipCheckoutSelection({
      membershipPlanId: "plan-1",
      serviceId: "svc-1",
      price: "79.00",
      session_url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });
    const raw = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    expect(Object.keys(raw).sort()).toEqual(["membershipPlanId", "serviceId"]);
  });

  it("returns null when nothing has been saved", () => {
    expect(readMembershipCheckoutSelection()).toBeNull();
  });

  it("returns null instead of throwing on corrupted JSON", () => {
    sessionStorage.setItem(STORAGE_KEY, "{not valid json");
    expect(readMembershipCheckoutSelection()).toBeNull();
  });

  it("returns null when a stored entry is missing one of the two ids", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ membershipPlanId: "plan-1" }));
    expect(readMembershipCheckoutSelection()).toBeNull();
  });

  it("clears the stored selection", () => {
    saveMembershipCheckoutSelection({ membershipPlanId: "plan-1", serviceId: "svc-1" });
    clearMembershipCheckoutSelection();
    expect(readMembershipCheckoutSelection()).toBeNull();
  });

  it("rejects blank-string ids and never saves them", () => {
    saveMembershipCheckoutSelection({ membershipPlanId: "   ", serviceId: "svc-1" });
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("rejects a stored entry whose ids are numbers, not strings", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ membershipPlanId: 1, serviceId: 2 }));
    expect(readMembershipCheckoutSelection()).toBeNull();
  });

  it("rejects a stored entry whose ids are arrays/objects, not strings", () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ membershipPlanId: ["plan-1"], serviceId: { id: "svc-1" } })
    );
    expect(readMembershipCheckoutSelection()).toBeNull();
  });

  it("rejects a stored entry with blank-string ids", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ membershipPlanId: "  ", serviceId: "svc-1" }));
    expect(readMembershipCheckoutSelection()).toBeNull();
  });

  it("actively deletes an invalid entry from storage once detected, instead of leaving it behind", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ membershipPlanId: 1, serviceId: 2 }));
    readMembershipCheckoutSelection();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("actively deletes corrupted JSON from storage once detected", () => {
    sessionStorage.setItem(STORAGE_KEY, "{not valid json");
    readMembershipCheckoutSelection();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
