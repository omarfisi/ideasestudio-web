import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)));

const getPublicProductCategoriesMock = vi.fn();
const getPublicProductsMock = vi.fn();
const addProductToPublicCartMock = vi.fn();
const getPublicMembershipPlansMock = vi.fn();

vi.mock("@/lib/api.js", () => ({
  getPublicProductCategories: (...args) => getPublicProductCategoriesMock(...args),
  getPublicProducts: (...args) => getPublicProductsMock(...args),
  addProductToPublicCart: (...args) => addProductToPublicCartMock(...args),
  getPublicMembershipPlans: (...args) => getPublicMembershipPlansMock(...args),
}));

vi.mock("@/components/seo/SEOHead.jsx", () => ({ default: () => null }));
vi.mock("@/hooks/usePageSeo.js", () => ({ usePageSeo: () => null }));

const { default: StorePage } = await import("@/pages/StorePage.jsx");

const pageSource = readFileSync(path.join(__dirname, "../StorePage.jsx"), "utf8");

function membershipPlan(overrides = {}) {
  return {
    id: `plan-${Math.random().toString(36).slice(2)}`,
    name: "Membresía Crecimiento",
    slug: "membresia-crecimiento",
    description: "Contenido gráfico y video cada mes.",
    price: "79.00",
    currency: "USD",
    billing_interval: "month",
    trial_period_days: 0,
    is_featured: false,
    sort_order: 20,
    features_json: [],
    limits_json: null,
    cta_label: null,
    cta_url: null,
    badge_text: null,
    ...overrides,
  };
}

function renderStorePage({ initialEntry = "/servicios" } = {}) {
  const router = createMemoryRouter(
    [
      {
        path: "/servicios",
        loader: () => ({ filters: { category: "all", productType: "service", search: "" } }),
        element: <StorePage />,
      },
    ],
    { initialEntries: [initialEntry] }
  );
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  getPublicProductCategoriesMock.mockReset().mockResolvedValue([]);
  getPublicProductsMock.mockReset().mockResolvedValue({ items: [] });
  addProductToPublicCartMock.mockReset();
  getPublicMembershipPlansMock.mockReset();
});

describe("StorePage — services catalog is untouched", () => {
  it("still renders the main services catalog heading", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([]);
    renderStorePage();
    expect(await screen.findByText("Servicios profesionales")).toBeInTheDocument();
  });
});

describe("StorePage — monthly plans section", () => {
  it("renders a 'Servicios mensuales' section with id=mensualidades", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([membershipPlan({ name: "Crecimiento" })]);
    const { container } = renderStorePage();
    await screen.findByText("Crecimiento");
    const section = container.querySelector("#mensualidades");
    expect(section).not.toBeNull();
    expect(section.textContent).toMatch(/Servicios mensuales/);
  });

  it("shows the required intro copy", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([]);
    renderStorePage();
    expect(
      await screen.findByText("Planes mensuales para marcas que necesitan apoyo creativo continuo.")
    ).toBeInTheDocument();
  });

  it("fetches plans via getPublicMembershipPlans (GET /public/membership-plans)", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([]);
    renderStorePage();
    await waitFor(() => expect(getPublicMembershipPlansMock).toHaveBeenCalledTimes(1));
  });

  it("renders three plans inside the mensualidades section without breaking the catalog", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([
      membershipPlan({ name: "Presencia" }),
      membershipPlan({ name: "Crecimiento" }),
      membershipPlan({ name: "Premium" }),
    ]);
    renderStorePage();
    await screen.findByText("Presencia");
    expect(screen.getByText("Crecimiento")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText("Servicios profesionales")).toBeInTheDocument();
  });

  it("shows the empty-state copy with zero plans instead of hardcoded ones", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([]);
    renderStorePage();
    expect(
      await screen.findByText("Próximamente tendremos servicios mensuales disponibles.")
    ).toBeInTheDocument();
  });
});

describe("StorePage — no duplicated / no Stripe / no hardcoded plans", () => {
  it("delegates plan rendering to MembershipPlansSection instead of duplicating markup", () => {
    expect(pageSource).toMatch(/<MembershipPlansSection\s*\/>/);
  });

  it("never references Stripe in its own source", () => {
    expect(pageSource.toLowerCase()).not.toMatch(/stripe/);
  });

  it("never hardcodes the known TEST plan slugs", () => {
    expect(pageSource).not.toMatch(/membresia-presencia-test/);
    expect(pageSource).not.toMatch(/membresia-crecimiento-test/);
    expect(pageSource).not.toMatch(/membresia-premium-test/);
  });
});
