import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const apiMock = vi.fn();
vi.mock("@/lib/api.js", () => ({
  getMembershipCheckoutSessionStatus: (...args) => apiMock(...args),
  createMembershipCheckoutSession: (...args) => apiMock(...args),
  getMembershipPlanSelection: (...args) => apiMock(...args),
}));

const { default: MembershipCheckoutCancelPage } = await import(
  "@/pages/MembershipCheckoutCancelPage.jsx"
);

describe("MembershipCheckoutCancelPage", () => {
  it("shows the cancellation message and never calls the backend — no subscription is created or activated", () => {
    render(
      <MemoryRouter>
        <MembershipCheckoutCancelPage />
      </MemoryRouter>
    );
    expect(screen.getByText("No se realizó ningún cargo")).toBeInTheDocument();
    expect(
      screen.getByText("Cancelaste el proceso de pago. Tu plan no fue activado.")
    ).toBeInTheDocument();
    expect(apiMock).not.toHaveBeenCalled();
  });

  it("links back to the services catalog so the user can restart plan selection", () => {
    render(
      <MemoryRouter>
        <MembershipCheckoutCancelPage />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "Volver a los planes" })).toHaveAttribute(
      "href",
      "/servicios"
    );
  });
});
