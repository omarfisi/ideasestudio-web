import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)));

const getPublicMembershipPlansByServiceMock = vi.fn();
vi.mock("@/lib/api.js", () => ({
  getPublicMembershipPlansByService: (...args) => getPublicMembershipPlansByServiceMock(...args),
}));

const { default: ServiceMembershipPlansModal } = await import(
  "@/components/memberships/ServiceMembershipPlansModal.jsx"
);

const componentSource = readFileSync(
  path.join(__dirname, "../ServiceMembershipPlansModal.jsx"),
  "utf8"
);

function planByService(overrides = {}) {
  return {
    id: `plan-${Math.random().toString(36).slice(2)}`,
    name: "Plan Básico",
    slug: "plan-basico",
    description: "Gestión mensual de redes.",
    price: "199.00",
    currency: "USD",
    billing_interval: "month",
    trial_period_days: 0,
    is_featured: false,
    badge_text: null,
    cta_label: null,
    cta_url: null,
    features_json: [],
    included_service: {
      service_id: "svc-1",
      quantity: "8.00",
      period: "month",
      label: "8 publicaciones mensuales",
      description: null,
    },
    ...overrides,
  };
}

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}|{JSON.stringify(location.state)}</div>;
}

function renderModal(props = {}) {
  return render(
    <MemoryRouter>
      <button type="button">Conocer planes</button>
      <ServiceMembershipPlansModal serviceId="svc-1" serviceName="Gestión de Redes Sociales" open onClose={() => {}} {...props} />
      <LocationDisplay />
    </MemoryRouter>
  );
}

beforeEach(() => {
  getPublicMembershipPlansByServiceMock.mockReset();
});

describe("ServiceMembershipPlansModal — visibility", () => {
  it("renders nothing when open is false", () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([]);
    const { container } = render(
      <MemoryRouter>
        <ServiceMembershipPlansModal serviceId="svc-1" open={false} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the title and intro copy when open", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([]);
    renderModal();
    expect(await screen.findByText("Planes disponibles para este servicio")).toBeInTheDocument();
    expect(screen.getByText("Escoge el plan mensual que mejor se adapte a las necesidades de tu marca.")).toBeInTheDocument();
  });
});

describe("ServiceMembershipPlansModal — fetch scoping", () => {
  it("fetches only the plans for the given serviceId", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([]);
    renderModal({ serviceId: "svc-42" });
    await waitFor(() => expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalledWith("svc-42"));
  });

  it("does not fetch when closed", () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <ServiceMembershipPlansModal serviceId="svc-1" open={false} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(getPublicMembershipPlansByServiceMock).not.toHaveBeenCalled();
  });
});

describe("ServiceMembershipPlansModal — plan counts", () => {
  it("shows one plan", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([planByService({ name: "Plan Básico" })]);
    renderModal();
    expect(await screen.findByText("Plan Básico")).toBeInTheDocument();
  });

  it("shows three plans", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([
      planByService({ name: "Plan Básico" }),
      planByService({ name: "Plan Avanzado" }),
      planByService({ name: "Plan Premium" }),
    ]);
    renderModal();
    await screen.findByText("Plan Básico");
    expect(screen.getByText("Plan Avanzado")).toBeInTheDocument();
    expect(screen.getByText("Plan Premium")).toBeInTheDocument();
  });

  it("shows five plans", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue(
      [0, 1, 2, 3, 4].map((i) => planByService({ name: `Plan ${i}` }))
    );
    renderModal();
    await screen.findByText("Plan 0");
    for (let i = 1; i < 5; i += 1) {
      expect(screen.getByText(`Plan ${i}`)).toBeInTheDocument();
    }
  });
});

describe("ServiceMembershipPlansModal — empty state", () => {
  it("shows the exact empty-state copy, not a blank panel", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([]);
    renderModal();
    expect(
      await screen.findByText("Este servicio todavía no está disponible dentro de un plan mensual.")
    ).toBeInTheDocument();
  });
});

describe("ServiceMembershipPlansModal — loading, error, retry", () => {
  it("shows skeletons while the request is in flight", async () => {
    let resolvePromise;
    getPublicMembershipPlansByServiceMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );
    const { container } = renderModal();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    resolvePromise([]);
    await waitFor(() => expect(container.querySelectorAll(".animate-pulse").length).toBe(0));
  });

  it("shows a generic error message on failure", async () => {
    getPublicMembershipPlansByServiceMock.mockRejectedValue(new Error("boom"));
    renderModal();
    expect(await screen.findByText("No pudimos cargar los planes disponibles.")).toBeInTheDocument();
  });

  it("retry re-fetches and can succeed the second time", async () => {
    getPublicMembershipPlansByServiceMock
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce([planByService({ name: "Plan Básico" })]);
    renderModal();
    const retryBtn = await screen.findByText("Reintentar");
    fireEvent.click(retryBtn);
    expect(await screen.findByText("Plan Básico")).toBeInTheDocument();
  });
});

describe("ServiceMembershipPlansModal — closing", () => {
  it("close button calls onClose", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([]);
    const onClose = vi.fn();
    renderModal({ onClose });
    await screen.findByText("Planes disponibles para este servicio");
    fireEvent.click(screen.getByLabelText(/Cerrar planes de/));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape key calls onClose", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([]);
    const onClose = vi.fn();
    renderModal({ onClose });
    await screen.findByText("Planes disponibles para este servicio");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking the backdrop calls onClose", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([]);
    const onClose = vi.fn();
    renderModal({ onClose });
    const dialog = await screen.findByRole("dialog");
    fireEvent.mouseDown(dialog.parentElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("restores focus to the previously focused element when it closes", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([]);
    const triggerButton = document.createElement("button");
    document.body.appendChild(triggerButton);
    triggerButton.focus();
    expect(document.activeElement).toBe(triggerButton);

    const { rerender } = render(
      <MemoryRouter>
        <ServiceMembershipPlansModal serviceId="svc-1" open onClose={() => {}} />
      </MemoryRouter>
    );
    await screen.findByText("Planes disponibles para este servicio");

    rerender(
      <MemoryRouter>
        <ServiceMembershipPlansModal serviceId="svc-1" open={false} onClose={() => {}} />
      </MemoryRouter>
    );

    await waitFor(() => expect(document.activeElement).toBe(triggerButton));
    document.body.removeChild(triggerButton);
  });
});

describe("ServiceMembershipPlansModal — plan selection", () => {
  it("always shows 'Seleccionar este plan', ignoring legacy cta_label/cta_url fields", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([
      planByService({ name: "Con CTA", cta_label: "Seleccionar plan", cta_url: "/contacto" }),
    ]);
    renderModal();
    expect(await screen.findByRole("button", { name: "Seleccionar este plan" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Seleccionar plan/ })).not.toBeInTheDocument();
  });

  it("navigates to /membresias/checkout with the plan and service ids on selection", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([
      planByService({ id: "plan-123", name: "Sin CTA", cta_label: null, cta_url: null }),
    ]);
    renderModal();
    const button = await screen.findByRole("button", { name: "Seleccionar este plan" });
    fireEvent.click(button);
    const location = await screen.findByTestId("location");
    expect(location).toHaveTextContent("/membresias/checkout");
    expect(location).toHaveTextContent("plan-123");
    expect(location).toHaveTextContent("svc-1");
  });
});

describe("ServiceMembershipPlansModal — controlled mode (preloaded plans from the caller)", () => {
  it("uses the plans prop directly and never fetches when plans is provided", async () => {
    renderModal({ plans: [planByService({ name: "Plan Precargado" })], loading: false, error: null });
    expect(await screen.findByText("Plan Precargado")).toBeInTheDocument();
    expect(getPublicMembershipPlansByServiceMock).not.toHaveBeenCalled();
  });

  it("shows the loading skeleton when the controlled loading prop is true, without fetching", async () => {
    const { container } = renderModal({ plans: [], loading: true, error: null });
    await screen.findByText("Planes disponibles para este servicio");
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(getPublicMembershipPlansByServiceMock).not.toHaveBeenCalled();
  });

  it("shows the empty state when controlled plans resolved to an empty list", async () => {
    renderModal({ plans: [], loading: false, error: null });
    expect(
      await screen.findByText("Este servicio todavía no está disponible dentro de un plan mensual.")
    ).toBeInTheDocument();
    expect(getPublicMembershipPlansByServiceMock).not.toHaveBeenCalled();
  });

  it("shows the error state when the controlled error prop is set, without fetching on its own first", async () => {
    renderModal({ plans: [], loading: false, error: new Error("boom") });
    expect(await screen.findByText("No pudimos cargar los planes disponibles.")).toBeInTheDocument();
    expect(getPublicMembershipPlansByServiceMock).not.toHaveBeenCalled();
  });

  it("retry from a controlled error state falls back to the component's own fetch", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([planByService({ name: "Plan Recuperado" })]);
    renderModal({ plans: [], loading: false, error: new Error("boom") });
    const retryBtn = await screen.findByText("Reintentar");
    fireEvent.click(retryBtn);
    expect(await screen.findByText("Plan Recuperado")).toBeInTheDocument();
    expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalledTimes(1);
  });
});

describe("ServiceMembershipPlansModal — accessibility, no Stripe, responsive, no hardcoding", () => {
  it("is a labeled dialog", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([]);
    renderModal();
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "service-membership-plans-modal-title");
  });

  it("locks background scroll while open", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([]);
    renderModal();
    await screen.findByText("Planes disponibles para este servicio");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("never references Stripe", () => {
    expect(componentSource.toLowerCase()).not.toMatch(/stripe/);
  });

  it("never hardcodes plan or service names", () => {
    expect(componentSource).not.toMatch(/"Plan Básico"/);
    expect(componentSource).not.toMatch(/"Gestión de Redes Sociales"/);
  });

  it("has responsive classes for a near-full-screen mobile presentation", () => {
    expect(componentSource).toMatch(/sm:items-center/);
    expect(componentSource).toMatch(/sm:rounded-2xl/);
  });

  it("does not use alert() or window.confirm()", () => {
    expect(componentSource).not.toMatch(/\balert\(/);
    expect(componentSource).not.toMatch(/window\.confirm\(/);
  });
});

// Regression tests for a real bug found in production: the caller
// (ServiceMembershipPlansTrigger, ProductDetailPage) passed onClose as a
// plain inline arrow function — a NEW function identity on every one of
// THEIR renders, not just when open/close actually toggled. Since the
// old code closed over `onClose` directly inside a useEffect keyed on
// [open, onClose], any unrelated parent re-render while the modal was
// open tore the effect down and rebuilt it: unlocking then re-locking
// body scroll, removing then re-adding the Escape listener, and
// re-running the focus/restore-focus logic — which, because .focus()
// scrolls its target into view by default, made the page visibly jump
// every single time. This is reproduced here with a wrapper that forces
// unrelated re-renders while passing a fresh onClose each time, exactly
// like the real callers did.
describe("ServiceMembershipPlansModal — stable across unrelated parent re-renders", () => {
  function RerenderingHost({ onEscapeClose }) {
    const [tick, setTick] = useState(0);
    return (
      <MemoryRouter>
        <button type="button" data-testid="force-rerender" onClick={() => setTick((t) => t + 1)}>
          force rerender #{tick}
        </button>
        <ServiceMembershipPlansModal
          serviceId="svc-1"
          serviceName="Gestión de Redes Sociales"
          open
          // Deliberately a fresh arrow function every render — the exact
          // shape of the real bug.
          onClose={() => onEscapeClose()}
        />
      </MemoryRouter>
    );
  }

  it("stays open and mounted across several unrelated parent re-renders", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([planByService({ name: "Plan Básico" })]);
    const onEscapeClose = vi.fn();
    render(<RerenderingHost onEscapeClose={onEscapeClose} />);
    await screen.findByText("Plan Básico");

    const forceRerender = screen.getByTestId("force-rerender");
    for (let i = 0; i < 5; i += 1) {
      fireEvent.click(forceRerender);
    }

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Plan Básico")).toBeInTheDocument();
    expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalledTimes(1);
  });

  it("sets body scroll lock exactly once, never toggling it off and back on during unrelated parent re-renders", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([]);
    const onEscapeClose = vi.fn();

    // Spies on every assignment to body.style.overflow (not just its
    // value after the fact) — the old bug's teardown/rebuild cycle briefly
    // restored the previous value before re-locking, which a simple
    // post-hoc check of the final value can't detect since React runs
    // the effect cleanup + re-run synchronously within the same
    // fireEvent.click call.
    const overflowSetSpy = vi.fn();
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(document.body.style), "overflow");
    Object.defineProperty(document.body.style, "overflow", {
      configurable: true,
      get() {
        return descriptor.get.call(this);
      },
      set(value) {
        overflowSetSpy(value);
        descriptor.set.call(this, value);
      },
    });

    render(<RerenderingHost onEscapeClose={onEscapeClose} />);
    await screen.findByText("Planes disponibles para este servicio");
    expect(document.body.style.overflow).toBe("hidden");

    overflowSetSpy.mockClear();
    const forceRerender = screen.getByTestId("force-rerender");
    for (let i = 0; i < 5; i += 1) {
      fireEvent.click(forceRerender);
    }

    expect(overflowSetSpy).not.toHaveBeenCalled();
    delete document.body.style.overflow;
  });

  it("Escape still calls the latest onClose after unrelated parent re-renders (not a stale closure)", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([]);
    const onEscapeClose = vi.fn();
    render(<RerenderingHost onEscapeClose={onEscapeClose} />);
    await screen.findByText("Planes disponibles para este servicio");

    const forceRerender = screen.getByTestId("force-rerender");
    for (let i = 0; i < 3; i += 1) {
      fireEvent.click(forceRerender);
    }

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onEscapeClose).toHaveBeenCalledTimes(1);
  });

  it("focuses the close button with preventScroll on open (never causes the page to jump)", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([]);
    const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
    renderModal();
    await screen.findByText("Planes disponibles para este servicio");
    await waitFor(() =>
      expect(focusSpy).toHaveBeenCalledWith(expect.objectContaining({ preventScroll: true }))
    );
    focusSpy.mockRestore();
  });
});
