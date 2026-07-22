import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)));

const getPublicProductCategoriesMock = vi.fn();
const getPublicProductsMock = vi.fn();
const addProductToPublicCartMock = vi.fn();
const getMembershipPlanSelectionMock = vi.fn();
const createMembershipCheckoutSessionMock = vi.fn();
const getMembershipCheckoutSessionStatusMock = vi.fn();

vi.mock("@/lib/api.js", () => ({
  getPublicProductCategories: (...args) => getPublicProductCategoriesMock(...args),
  getPublicProducts: (...args) => getPublicProductsMock(...args),
  addProductToPublicCart: (...args) => addProductToPublicCartMock(...args),
  getPublicClientRouteBundle: vi.fn().mockResolvedValue({ route: null, services: [] }),
  getPublicProductBySlug: vi.fn().mockResolvedValue(null),
  getPublicOrderByNumber: vi.fn().mockResolvedValue(null),
  getPublicPortfolioItems: vi.fn().mockResolvedValue([]),
  getPublicServiceSegment: vi.fn().mockResolvedValue(null),
  getPublicMembershipPlansByService: vi.fn().mockResolvedValue([]),
  getMembershipPlanSelection: (...args) => getMembershipPlanSelectionMock(...args),
  createMembershipCheckoutSession: (...args) => createMembershipCheckoutSessionMock(...args),
  getMembershipCheckoutSessionStatus: (...args) => getMembershipCheckoutSessionStatusMock(...args),
}));

vi.mock("@/components/seo/SEOHead.jsx", () => ({ default: () => null }));
vi.mock("@/hooks/usePageSeo.js", () => ({ usePageSeo: () => null }));

const routerSource = readFileSync(path.join(__dirname, "../AppRouter.jsx"), "utf8");

beforeEach(() => {
  getPublicProductCategoriesMock.mockReset().mockResolvedValue([]);
  getPublicProductsMock.mockReset().mockResolvedValue({ items: [] });
  addProductToPublicCartMock.mockReset();
  getMembershipPlanSelectionMock.mockReset();
  createMembershipCheckoutSessionMock.mockReset();
  getMembershipCheckoutSessionStatusMock.mockReset();
});

describe("AppRouter — /membresias redirect", () => {
  it("redirects /membresias to /servicios (no #mensualidades — that general section no longer exists) and lands on the services page", async () => {
    window.history.pushState({}, "", "/membresias");

    const { RouterProvider } = await import("react-router-dom");
    const { default: router } = await import("@/router/AppRouter.jsx");

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/servicios");
      expect(window.location.hash).toBe("");
    });

    expect(await screen.findByText("Servicios profesionales")).toBeInTheDocument();
  });

  it("does not import or reference the deleted MembershipsPage module", () => {
    expect(routerSource).not.toMatch(/MembershipsPage/);
  });

  it("uses a replace redirect (no dead history entry) to /servicios, with no hash", () => {
    expect(routerSource).toMatch(
      /path:\s*"membresias",\s*\n\s*element:\s*<Navigate to="\/servicios" replace \/>/
    );
    expect(routerSource).not.toMatch(/servicios#mensualidades/);
  });
});

describe("AppRouter — dedicated membership subscription checkout routes", () => {
  it("registers /membresias/checkout, /membresias/checkout/exito and /membresias/checkout/cancelado as their own routes", () => {
    expect(routerSource).toMatch(/path:\s*"membresias\/checkout",\s*\n\s*element:\s*<MembershipCheckoutPage \/>/);
    expect(routerSource).toMatch(
      /path:\s*"membresias\/checkout\/exito",\s*\n\s*element:\s*<MembershipCheckoutSuccessPage \/>/
    );
    expect(routerSource).toMatch(
      /path:\s*"membresias\/checkout\/cancelado",\s*\n\s*element:\s*<MembershipCheckoutCancelPage \/>/
    );
  });

  it("renders the checkout page (not the store cart/checkout) at /membresias/checkout without touching the store cart", async () => {
    window.history.pushState({}, "", "/membresias/checkout");
    vi.resetModules();
    const { RouterProvider } = await import("react-router-dom");
    const { default: router } = await import("@/router/AppRouter.jsx");

    render(<RouterProvider router={router} />);

    expect(await screen.findByText("Selecciona un plan primero")).toBeInTheDocument();
    expect(addProductToPublicCartMock).not.toHaveBeenCalled();
    expect(getPublicProductsMock).not.toHaveBeenCalled();
  });

  it("renders the success page and re-queries the backend by session_id at /membresias/checkout/exito", async () => {
    getMembershipCheckoutSessionStatusMock.mockResolvedValue({
      ok: true,
      status: "active",
      plan: { id: "plan-1", name: "Membresía Crecimiento — TEST" },
      service: { id: "svc-1", name: "Gestión de Redes Sociales" },
      trial_end: null,
      current_period_end: "2026-08-14T00:00:00Z",
    });

    window.history.pushState({}, "", "/membresias/checkout/exito?session_id=cs_test_123");
    vi.resetModules();
    const { RouterProvider } = await import("react-router-dom");
    const { default: router } = await import("@/router/AppRouter.jsx");

    render(<RouterProvider router={router} />);

    await waitFor(() => expect(getMembershipCheckoutSessionStatusMock).toHaveBeenCalledWith("cs_test_123"));
    expect(await screen.findByText("Membresía Crecimiento — TEST")).toBeInTheDocument();
    expect(addProductToPublicCartMock).not.toHaveBeenCalled();
  });

  it("renders a static cancellation message at /membresias/checkout/cancelado without calling any backend endpoint", async () => {
    window.history.pushState({}, "", "/membresias/checkout/cancelado");
    vi.resetModules();
    const { RouterProvider } = await import("react-router-dom");
    const { default: router } = await import("@/router/AppRouter.jsx");

    render(<RouterProvider router={router} />);

    expect(await screen.findByText("No se realizó ningún cargo")).toBeInTheDocument();
    expect(getMembershipPlanSelectionMock).not.toHaveBeenCalled();
    expect(createMembershipCheckoutSessionMock).not.toHaveBeenCalled();
    expect(getMembershipCheckoutSessionStatusMock).not.toHaveBeenCalled();
    expect(addProductToPublicCartMock).not.toHaveBeenCalled();
  });
});
