import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

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

function renderCard(props = {}) {
  return render(
    <MemoryRouter>
      <ProductCard product={monthlyProduct()} {...props} />
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

  it("falls back to the existing onAddToCart CTA when the service has no published plans yet", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([]);
    const onAddToCart = vi.fn();
    renderCard({ onAddToCart });
    await waitFor(() => expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const btn = catalogPlansButton();
    expect(btn).not.toBeNull();
    fireEvent.click(btn);
    expect(onAddToCart).toHaveBeenCalledWith(expect.objectContaining({ slug: "gestion-de-redes-sociales" }));
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
