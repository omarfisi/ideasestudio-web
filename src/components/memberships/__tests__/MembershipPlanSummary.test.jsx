import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import MembershipPlanSummary from "@/components/memberships/MembershipPlanSummary.jsx";

function plan(overrides = {}) {
  return {
    id: "plan-1",
    name: "Membresía Crecimiento",
    price: "79.00",
    currency: "USD",
    billing_interval: "month",
    trial_period_days: 0,
    features_json: [],
    ...overrides,
  };
}

const service = { id: "svc-1", name: "Gestión de Redes Sociales" };

describe("MembershipPlanSummary — renewal copy derives from billing_interval", () => {
  it("shows a monthly renewal message for a month interval", () => {
    render(<MembershipPlanSummary plan={plan({ billing_interval: "month" })} service={service} />);
    expect(screen.getByText("Renovación automática mensual.")).toBeInTheDocument();
  });

  it("shows a yearly renewal message for a year interval", () => {
    render(<MembershipPlanSummary plan={plan({ billing_interval: "year" })} service={service} />);
    expect(screen.getByText("Renovación automática anual.")).toBeInTheDocument();
    expect(screen.queryByText("Renovación automática mensual.")).not.toBeInTheDocument();
  });

  it("never fabricates a renewal claim for an interval it doesn't recognize", () => {
    render(<MembershipPlanSummary plan={plan({ billing_interval: "project" })} service={service} />);
    expect(screen.queryByText(/renovación automática/i)).not.toBeInTheDocument();
  });
});
