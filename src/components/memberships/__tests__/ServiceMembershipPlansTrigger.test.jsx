import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/api.js", () => ({
  getPublicMembershipPlansByService: vi.fn().mockResolvedValue([]),
}));

const { default: ServiceMembershipPlansTrigger } = await import(
  "@/components/memberships/ServiceMembershipPlansTrigger.jsx"
);

function renderTrigger(props = {}) {
  return render(
    <MemoryRouter>
      <ServiceMembershipPlansTrigger
        serviceId="svc-1"
        serviceName="Gestión de Redes Sociales"
        plans={[{ id: "plan-1", name: "Membresía Crecimiento — TEST" }]}
        loading={false}
        error={null}
        hasPlans
        className="btn btn-primary"
        {...props}
      >
        Conocer planes
      </ServiceMembershipPlansTrigger>
    </MemoryRouter>
  );
}

describe("ServiceMembershipPlansTrigger — rendering", () => {
  it("renders nothing when hasPlans is false", () => {
    const { container } = renderTrigger({ hasPlans: false, plans: [] });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when serviceId is missing, even with hasPlans true", () => {
    const { container } = renderTrigger({ serviceId: null });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a type=button element with the given children and className", () => {
    renderTrigger();
    const btn = screen.getByRole("button", { name: "Conocer planes" });
    expect(btn.type).toBe("button");
    expect(btn).toHaveClass("btn", "btn-primary");
  });
});

describe("ServiceMembershipPlansTrigger — click behavior", () => {
  it("opens the modal with the preloaded plans, without a new fetch", async () => {
    const { getPublicMembershipPlansByService } = await import("@/lib/api.js");
    renderTrigger();
    fireEvent.click(screen.getByRole("button", { name: "Conocer planes" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Membresía Crecimiento — TEST")).toBeInTheDocument();
    expect(getPublicMembershipPlansByService).not.toHaveBeenCalled();
  });

  it("calls the optional onOpen callback", () => {
    const onOpen = vi.fn();
    renderTrigger({ onOpen });
    fireEvent.click(screen.getByRole("button", { name: "Conocer planes" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("preventDefault/stopPropagation: a click does not bubble to an ancestor handler", () => {
    const parentHandler = vi.fn();
    render(
      <MemoryRouter>
        <div onClick={parentHandler}>
          <ServiceMembershipPlansTrigger
            serviceId="svc-1"
            serviceName="Gestión de Redes Sociales"
            plans={[{ id: "plan-1", name: "Plan Básico" }]}
            loading={false}
            error={null}
            hasPlans
          >
            Conocer planes
          </ServiceMembershipPlansTrigger>
        </div>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("button", { name: "Conocer planes" }));
    expect(parentHandler).not.toHaveBeenCalled();
  });
});
