import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MembershipCheckoutTrust from "@/components/memberships/MembershipCheckoutTrust.jsx";

describe("MembershipCheckoutTrust", () => {
  it("never asserts a fixed 'renovación mensual' claim — billing_interval can be yearly too", () => {
    render(<MembershipCheckoutTrust />);
    expect(screen.queryByText(/renovaci[oó]n mensual/i)).not.toBeInTheDocument();
    expect(screen.getByText("Renovación automática según las condiciones del plan.")).toBeInTheDocument();
  });

  it("states the Stripe processing claim exactly once, not twice", () => {
    render(<MembershipCheckoutTrust />);
    const stripeMentions = screen.getAllByText(/stripe/i);
    expect(stripeMentions).toHaveLength(1);
  });
});
