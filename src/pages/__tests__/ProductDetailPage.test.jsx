import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)));

const addProductToPublicCartMock = vi.fn();
const getPublicProductsMock = vi.fn();
const getPublicMembershipPlansByServiceMock = vi.fn();

vi.mock("@/lib/api.js", () => ({
  addProductToPublicCart: (...args) => addProductToPublicCartMock(...args),
  getPublicProducts: (...args) => getPublicProductsMock(...args),
  getPublicMembershipPlansByService: (...args) => getPublicMembershipPlansByServiceMock(...args),
}));

const { default: ProductDetailPage } = await import("@/pages/ProductDetailPage.jsx");

const pageSource = readFileSync(path.join(__dirname, "../ProductDetailPage.jsx"), "utf8");

// Deliberately NOT "Gestión de Redes Sociales" (or any name/category
// matching the monthly-flow keyword regex in serviceFlowType.js —
// mensual|monthly|redes sociales|mantenimiento|seo mensual): a product
// whose inferred flow bucket is "monthly" already has its OWN, unrelated
// primary purchase button labeled "Conocer planes" (CTA_LABELS.monthly
// in serviceContentLabels.js — an existing checkout-flow CTA that has
// nothing to do with this feature). Using a neutral name here keeps
// these tests scoped to exactly one "Conocer planes" element. See the
// dedicated collision test below.
function product(overrides = {}) {
  return {
    id: "prod-1",
    name: "Diseño de Logotipo",
    slug: "diseno-de-logotipo",
    category: { name: "Branding y Diseño", slug: "branding-diseno" },
    shortDescription: "Diseño profesional de logotipo.",
    longDescription: "Diseño profesional de logotipo.",
    price: 345.95,
    currency: "USD",
    coverImage: null,
    gallery: [],
    serviceId: "svc-1",
    ...overrides,
  };
}

function renderPage(prod = product()) {
  const router = createMemoryRouter(
    [
      {
        path: "/servicios/:slug",
        loader: () => ({ product: prod }),
        element: <ProductDetailPage />,
      },
    ],
    { initialEntries: [`/servicios/${prod.slug}`] }
  );
  return render(<RouterProvider router={router} />);
}

function plansButton() {
  return document.querySelector(".service-detail-purchase__plans-btn");
}

beforeEach(() => {
  addProductToPublicCartMock.mockReset();
  getPublicProductsMock.mockReset().mockResolvedValue({ items: [] });
  getPublicMembershipPlansByServiceMock.mockReset().mockResolvedValue([]);
});

describe("ProductDetailPage — 'Conocer planes' button", () => {
  // 3. existe

  it("shows the 'Conocer planes' button when the product has a serviceId", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Diseño de Logotipo" });
    expect(plansButton()).toHaveTextContent("Conocer planes");
  });

  it("does not show the button when the product has no serviceId", async () => {
    renderPage(product({ serviceId: null }));
    await screen.findByRole("heading", { level: 1, name: "Diseño de Logotipo" });
    expect(plansButton()).toBeNull();
  });

  // 4. al pulsarlo abre modal

  it("clicking it opens the plans modal", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Diseño de Logotipo" });
    fireEvent.click(plansButton());
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  // 5. usa el service_id del producto actual

  it("fetches plans scoped to the product's own serviceId", async () => {
    renderPage(product({ serviceId: "svc-42" }));
    await screen.findByRole("heading", { level: 1, name: "Diseño de Logotipo" });
    fireEvent.click(plansButton());
    await waitFor(() => expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalledWith("svc-42"));
  });

  // 10. servicio sin planes muestra empty state

  it("shows the empty state inside the modal when the service has no plans", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([]);
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Diseño de Logotipo" });
    fireEvent.click(plansButton());
    expect(
      await screen.findByText("Este servicio todavía no está disponible dentro de un plan mensual.")
    ).toBeInTheDocument();
  });

  // 14. cerrar modal funciona

  it("closing the modal removes it from the DOM", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Diseño de Logotipo" });
    fireEvent.click(plansButton());
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByLabelText(/Cerrar planes de/));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("does not navigate to a general plans page — opens the modal in place", () => {
    expect(pageSource).not.toMatch(/navigate\(.*membresias/);
    expect(pageSource).not.toMatch(/navigate\(.*mensualidades/);
  });

  it("no Stripe reference tied to the plans button/modal wiring", () => {
    const idx = pageSource.indexOf("Conocer planes");
    const nearby = pageSource.slice(Math.max(0, idx - 200), idx + 200);
    expect(nearby.toLowerCase()).not.toMatch(/stripe/);
  });
});

function checkoutButton() {
  return document.querySelector(".service-detail-purchase__checkout-btn");
}

// "Gestión de Redes Sociales" infers the "monthly" flow bucket
// (serviceFlowType.js — matches "redes sociales"), which has its OWN
// primary checkout CTA also labeled "Conocer planes"
// (CTA_LABELS.monthly in serviceContentLabels.js) — a real cart/checkout
// action, unrelated to this feature's plans modal. Previously both
// buttons rendered at once with identical text (fixed in
// fix/membership-service-cta): now only one CTA shows at a time, chosen
// by whether the service actually has published membership plans.
function monthlyProduct(overrides = {}) {
  return product({
    name: "Gestión de Redes Sociales",
    slug: "gestion-de-redes-sociales",
    serviceId: "svc-redes",
    ...overrides,
  });
}

describe("ProductDetailPage — single CTA for monthly-flow services with membership plans", () => {
  it("shows only 'Ver planes disponibles' when the service has published plans — no duplicate 'Conocer planes'", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([{ id: "plan-1", name: "Plan Básico" }]);
    renderPage(monthlyProduct());
    await screen.findByRole("heading", { level: 1, name: "Gestión de Redes Sociales" });
    await waitFor(() => expect(plansButton()).toHaveTextContent("Ver planes disponibles"));
    expect(checkoutButton()).toBeNull();
    expect(screen.queryByText("Conocer planes")).not.toBeInTheDocument();
  });

  it("clicking 'Ver planes disponibles' opens the modal without a second fetch", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([{ id: "plan-1", name: "Plan Básico" }]);
    renderPage(monthlyProduct());
    await screen.findByRole("heading", { level: 1, name: "Gestión de Redes Sociales" });
    await waitFor(() => expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalledTimes(1));
    fireEvent.click(plansButton());
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Plan Básico")).toBeInTheDocument();
    expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to the original checkout CTA when the service has no published plans — no 'Ver planes disponibles', no plans button", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([]);
    renderPage(monthlyProduct());
    await screen.findByRole("heading", { level: 1, name: "Gestión de Redes Sociales" });
    await waitFor(() => expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalled());
    expect(screen.queryByText("Ver planes disponibles")).not.toBeInTheDocument();
    expect(plansButton()).toBeNull();
    expect(checkoutButton()).toHaveTextContent("Conocer planes");
    // The mobile sticky bar mirrors the same single logical CTA in the
    // DOM (visibility is CSS-controlled, not a second conditional
    // branch) — so exactly two "Conocer planes" elements is correct
    // (desktop + mobile), never a third from a stray plans button.
    expect(screen.getAllByText("Conocer planes").length).toBe(2);
    expect(document.querySelector(".service-detail-mobile-cta__btn")).toHaveTextContent("Conocer planes");
  });

  it("never shows two CTAs at once while the plans request is in flight", async () => {
    let resolvePromise;
    getPublicMembershipPlansByServiceMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );
    renderPage(monthlyProduct());
    await screen.findByRole("heading", { level: 1, name: "Gestión de Redes Sociales" });
    expect(checkoutButton()).not.toBeNull();
    expect(screen.queryByText("Ver planes disponibles")).not.toBeInTheDocument();

    resolvePromise([{ id: "plan-1", name: "Plan Básico" }]);
    await waitFor(() => expect(plansButton()).toHaveTextContent("Ver planes disponibles"));
    expect(checkoutButton()).toBeNull();
  });

  it("falls back safely to the checkout CTA if the plans request fails, without breaking the page", async () => {
    getPublicMembershipPlansByServiceMock.mockRejectedValue(new Error("boom"));
    renderPage(monthlyProduct());
    await screen.findByRole("heading", { level: 1, name: "Gestión de Redes Sociales" });
    await waitFor(() => expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalled());
    expect(checkoutButton()).not.toBeNull();
    expect(screen.queryByText("Ver planes disponibles")).not.toBeInTheDocument();
  });

  it("fetches membership plans exactly once per service, including after opening the modal (no duplicate calls)", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([{ id: "plan-1", name: "Plan Básico" }]);
    renderPage(monthlyProduct());
    await screen.findByRole("heading", { level: 1, name: "Gestión de Redes Sociales" });
    await waitFor(() => expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalledTimes(1));
    fireEvent.click(plansButton());
    await screen.findByRole("dialog");
    expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalledWith("svc-redes");
    expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalledTimes(1);
  });
});

describe("ProductDetailPage — other purchase flows are unaffected", () => {
  it("non-monthly service keeps its own primary CTA plus the separate 'Conocer planes' button, unconditionally", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Diseño de Logotipo" });
    expect(checkoutButton()).not.toBeNull();
    expect(plansButton()).toHaveTextContent("Conocer planes");
  });

  it("never fetches membership plans for a non-monthly service until its modal is opened", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Diseño de Logotipo" });
    expect(getPublicMembershipPlansByServiceMock).not.toHaveBeenCalled();
    fireEvent.click(plansButton());
    await waitFor(() => expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalledTimes(1));
  });
});
