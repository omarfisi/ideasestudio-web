import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)));

const getPublicProductCategoriesMock = vi.fn();
const getPublicProductsMock = vi.fn();
const addProductToPublicCartMock = vi.fn();

vi.mock("@/lib/api.js", () => ({
  getPublicProductCategories: (...args) => getPublicProductCategoriesMock(...args),
  getPublicProducts: (...args) => getPublicProductsMock(...args),
  addProductToPublicCart: (...args) => addProductToPublicCartMock(...args),
}));

vi.mock("@/components/seo/SEOHead.jsx", () => ({ default: () => null }));
vi.mock("@/hooks/usePageSeo.js", () => ({ usePageSeo: () => null }));

const { default: StorePage } = await import("@/pages/StorePage.jsx");

const pageSource = readFileSync(path.join(__dirname, "../StorePage.jsx"), "utf8");

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
});

describe("StorePage — services catalog is untouched", () => {
  it("still renders the main services catalog heading", async () => {
    renderStorePage();
    expect(await screen.findByText("Servicios profesionales")).toBeInTheDocument();
  });
});

// fix(memberships): show plans from service detail — the general
// "Servicios mensuales" grid at the bottom of /servicios is gone. Plans
// are now reached per-service via the "Conocer planes" button on
// ProductDetailPage (see ProductDetailPage.test.jsx and
// ServiceMembershipPlansModal.test.jsx), not as a catalog-wide section.

describe("StorePage — no general plans section", () => {
  it("does not render a #mensualidades section", async () => {
    const { container } = renderStorePage();
    await screen.findByText("Servicios profesionales");
    expect(container.querySelector("#mensualidades")).toBeNull();
  });

  it("does not show the old 'Servicios mensuales' heading or intro copy", async () => {
    renderStorePage();
    await screen.findByText("Servicios profesionales");
    expect(screen.queryByText("Servicios mensuales")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Planes mensuales para marcas que necesitan apoyo creativo continuo.")
    ).not.toBeInTheDocument();
  });

  it("does not import or render MembershipPlansSection", () => {
    expect(pageSource).not.toMatch(/MembershipPlansSection/);
  });

  it("does not import getPublicMembershipPlans — no membership fetch happens on this page anymore", () => {
    expect(pageSource).not.toMatch(/getPublicMembershipPlans/);
  });

  it("no longer has a scroll-to-hash effect (there is no in-page anchor left to scroll to)", () => {
    expect(pageSource).not.toMatch(/scrollIntoView/);
    expect(pageSource).not.toMatch(/location\.hash/);
    expect(pageSource).not.toMatch(/useLocation/);
  });

  it("SEO description no longer references a monthly-services section that no longer exists on this page", () => {
    expect(pageSource).not.toMatch(/servicios mensuales/i);
  });
});

describe("StorePage — no Stripe, no hardcoded plans", () => {
  it("never references Stripe in its own source", () => {
    expect(pageSource.toLowerCase()).not.toMatch(/stripe/);
  });

  it("never hardcodes the known TEST plan slugs", () => {
    expect(pageSource).not.toMatch(/membresia-presencia-test/);
    expect(pageSource).not.toMatch(/membresia-crecimiento-test/);
    expect(pageSource).not.toMatch(/membresia-premium-test/);
  });
});
