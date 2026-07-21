import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
  getPublicClientRouteBundle: vi.fn().mockResolvedValue({ route: null, services: [] }),
  getPublicProductBySlug: vi.fn().mockResolvedValue(null),
  getPublicOrderByNumber: vi.fn().mockResolvedValue(null),
  getPublicPortfolioItems: vi.fn().mockResolvedValue([]),
  getPublicServiceSegment: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/components/seo/SEOHead.jsx", () => ({ default: () => null }));
vi.mock("@/hooks/usePageSeo.js", () => ({ usePageSeo: () => null }));

const routerSource = readFileSync(path.join(__dirname, "../AppRouter.jsx"), "utf8");

beforeEach(() => {
  getPublicProductCategoriesMock.mockReset().mockResolvedValue([]);
  getPublicProductsMock.mockReset().mockResolvedValue({ items: [] });
  addProductToPublicCartMock.mockReset();
  getPublicMembershipPlansMock.mockReset().mockResolvedValue([]);
});

describe("AppRouter — /membresias redirect", () => {
  it("redirects /membresias to /servicios#mensualidades and lands on the services page", async () => {
    window.history.pushState({}, "", "/membresias");

    const { RouterProvider } = await import("react-router-dom");
    const { default: router } = await import("@/router/AppRouter.jsx");

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/servicios");
      expect(window.location.hash).toBe("#mensualidades");
    });

    expect(await screen.findByText("Servicios profesionales")).toBeInTheDocument();
  });

  it("does not import or reference the deleted MembershipsPage module", () => {
    expect(routerSource).not.toMatch(/MembershipsPage/);
  });

  it("uses a replace redirect (no dead history entry) to /servicios#mensualidades", () => {
    expect(routerSource).toMatch(
      /path:\s*"membresias",\s*\n\s*element:\s*<Navigate to="\/servicios#mensualidades" replace \/>/
    );
  });
});
