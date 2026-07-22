import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

const getPublicMembershipPlansByServiceMock = vi.fn();
vi.mock("@/lib/api.js", () => ({
  getPublicMembershipPlansByService: (...args) => getPublicMembershipPlansByServiceMock(...args),
}));

const { default: ProductCard } = await import("@/components/shared/ProductCard.jsx");

// "Gestión de Redes Sociales" infers the "monthly" purchase flow from its
// name (serviceFlowType.js), same product the catalog screenshot showed.
function monthlyProduct(overrides = {}) {
  return {
    id: "prod-redes",
    name: "Gestión de Redes Sociales",
    slug: "gestion-de-redes-sociales",
    category: { name: "Marketing Digital", slug: "marketing-digital" },
    shortDescription: "Gestión profesional de redes.",
    price: 99.99,
    currency: "USD",
    coverImage: null,
    serviceId: "svc-redes",
    metadata: {},
    ...overrides,
  };
}

// Booking-flow product, unrelated to memberships — must never fetch
// plans or change behavior.
function bookingProduct(overrides = {}) {
  return {
    id: "prod-shoot",
    name: "Sesión Fotográfica",
    slug: "sesion-fotografica",
    category: { name: "Fotografía", slug: "fotografia" },
    shortDescription: "Sesión profesional de fotos.",
    price: 250,
    currency: "USD",
    coverImage: null,
    serviceId: "svc-foto",
    metadata: { purchase_flow: "booking" },
    ...overrides,
  };
}

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderCard(props = {}) {
  return render(
    <MemoryRouter initialEntries={["/servicios"]}>
      <ProductCard product={monthlyProduct()} {...props} />
      <LocationDisplay />
    </MemoryRouter>
  );
}

function catalogPlansButton() {
  return document.querySelector(".product-card__booking-btn");
}

beforeEach(() => {
  getPublicMembershipPlansByServiceMock.mockReset().mockResolvedValue([]);
});

describe("ProductCard — 'Ver detalles' link", () => {
  it("always links to the service detail page, regardless of plans", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([{ id: "plan-1", name: "Plan Básico" }]);
    renderCard();
    await waitFor(() => expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalled());
    const link = screen.getByText("Ver detalles");
    expect(link).toHaveAttribute("href", "/servicios/gestion-de-redes-sociales");
  });
});

describe("ProductCard — 'Conocer planes' opens the plans modal, never checkout", () => {
  it("shows 'Conocer planes' and opens the modal directly when the service has published plans", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([
      { id: "plan-1", name: "Membresía Crecimiento — TEST" },
    ]);
    const onAddToCart = vi.fn();
    renderCard({ onAddToCart });
    await waitFor(() => expect(catalogPlansButton()).toHaveTextContent("Conocer planes"));

    expect(catalogPlansButton().type).toBe("button");
    fireEvent.click(catalogPlansButton());

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Membresía Crecimiento — TEST")).toBeInTheDocument();
  });

  it("does not call onAddToCart (never adds the base service) when opening the plans modal", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([{ id: "plan-1", name: "Plan Básico" }]);
    const onAddToCart = vi.fn();
    renderCard({ onAddToCart });
    await waitFor(() => expect(catalogPlansButton()).toHaveTextContent("Conocer planes"));
    fireEvent.click(catalogPlansButton());
    await screen.findByRole("dialog");
    expect(onAddToCart).not.toHaveBeenCalled();
  });

  it("does not navigate away — the card stays on the catalog", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([{ id: "plan-1", name: "Plan Básico" }]);
    renderCard({ onAddToCart: vi.fn() });
    await waitFor(() => expect(catalogPlansButton()).toHaveTextContent("Conocer planes"));
    fireEvent.click(catalogPlansButton());
    await screen.findByRole("dialog");
    // The card's own content (name) is still present — a real navigation
    // would have unmounted this component.
    expect(screen.getByText("Gestión de Redes Sociales")).toBeInTheDocument();
  });

  it("does not change the URL when the modal opens", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([{ id: "plan-1", name: "Plan Básico" }]);
    renderCard({ onAddToCart: vi.fn() });
    await waitFor(() => expect(catalogPlansButton()).toHaveTextContent("Conocer planes"));
    expect(screen.getByTestId("location")).toHaveTextContent("/servicios");
    fireEvent.click(catalogPlansButton());
    await screen.findByRole("dialog");
    expect(screen.getByTestId("location")).toHaveTextContent("/servicios");
  });

  it("clicking the CTA does not trigger the card's 'Ver detalles' Link", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([{ id: "plan-1", name: "Plan Básico" }]);
    renderCard({ onAddToCart: vi.fn() });
    await waitFor(() => expect(catalogPlansButton()).toHaveTextContent("Conocer planes"));
    fireEvent.click(catalogPlansButton());
    await screen.findByRole("dialog");
    // A click on "Ver detalles" would have navigated to the product slug —
    // still on /servicios confirms the CTA click never reached that Link.
    expect(screen.getByTestId("location")).toHaveTextContent("/servicios");
    expect(screen.queryByTestId("location")).not.toHaveTextContent("gestion-de-redes-sociales");
  });

  // Regression test for a real bug found in manual testing: the fallback
  // button for a monthly-flow service with no published plans used to
  // render flowConfig.cta ("Conocer planes" for E_MONTHLY —
  // serviceFlowType.js) wired to onAddToCart — a button with the SAME
  // text as the plans-modal trigger that silently added the base service
  // to the cart. Relabeled "Contratar servicio mensual" so it can never
  // be confused with the modal CTA.
  it("falls back to a relabeled 'Contratar servicio mensual' CTA when the service has no published plans yet — never 'Conocer planes'", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([]);
    const onAddToCart = vi.fn();
    renderCard({ onAddToCart });
    await waitFor(() => expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Conocer planes")).not.toBeInTheDocument();
    const btn = catalogPlansButton();
    expect(btn).not.toBeNull();
    expect(btn).toHaveTextContent("Contratar servicio mensual");
    fireEvent.click(btn);
    expect(onAddToCart).toHaveBeenCalledWith(expect.objectContaining({ slug: "gestion-de-redes-sociales" }));
  });

  // Regression test for the actual root cause: while the plans request is
  // still in flight, hasMembershipPlans is false (useServiceMembershipPlans
  // starts with plans: []), which used to fall through to the SAME
  // checkout-wired "Conocer planes" button described above — a real race
  // every catalog page load hits, however briefly.
  it("shows a disabled 'Cargando planes…' placeholder while the request is in flight — never calls onAddToCart", async () => {
    let resolvePromise;
    getPublicMembershipPlansByServiceMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );
    const onAddToCart = vi.fn();
    renderCard({ onAddToCart });

    const btn = await waitFor(() => {
      const el = catalogPlansButton();
      expect(el).toHaveTextContent("Cargando planes…");
      return el;
    });
    expect(btn).toBeDisabled();
    expect(screen.queryByText("Conocer planes")).not.toBeInTheDocument();

    fireEvent.click(btn);
    expect(onAddToCart).not.toHaveBeenCalled();

    resolvePromise([{ id: "plan-1", name: "Plan Básico" }]);
    await waitFor(() => expect(catalogPlansButton()).toHaveTextContent("Conocer planes"));
  });

  it("shows a disabled error placeholder if the plans request fails — never falls back to onAddToCart", async () => {
    getPublicMembershipPlansByServiceMock.mockRejectedValue(new Error("boom"));
    const onAddToCart = vi.fn();
    renderCard({ onAddToCart });

    const btn = await waitFor(() => {
      const el = catalogPlansButton();
      expect(el).toHaveTextContent("No se pudieron cargar los planes");
      return el;
    });
    expect(btn).toBeDisabled();
    expect(screen.queryByText("Conocer planes")).not.toBeInTheDocument();

    fireEvent.click(btn);
    expect(onAddToCart).not.toHaveBeenCalled();
  });
});

describe("ProductCard — other purchase flows are unaffected", () => {
  it("never fetches membership plans for a non-monthly product", async () => {
    render(
      <MemoryRouter>
        <ProductCard product={bookingProduct()} onAddToCart={vi.fn()} />
      </MemoryRouter>
    );
    await screen.findByText("Sesión Fotográfica");
    expect(getPublicMembershipPlansByServiceMock).not.toHaveBeenCalled();
  });

  it("keeps its existing onAddToCart CTA behavior for a non-monthly product", async () => {
    const onAddToCart = vi.fn();
    render(
      <MemoryRouter>
        <ProductCard product={bookingProduct()} onAddToCart={onAddToCart} />
      </MemoryRouter>
    );
    await screen.findByText("Sesión Fotográfica");
    fireEvent.click(catalogPlansButton());
    expect(onAddToCart).toHaveBeenCalledWith(expect.objectContaining({ slug: "sesion-fotografica" }));
  });
});
