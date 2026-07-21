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

  // Documents a real, pre-existing naming collision discovered while
  // building this: services whose name/category infer the "monthly" flow
  // bucket (serviceFlowType.js — matches "redes sociales", "mensual",
  // "mantenimiento", etc.) already have an UNRELATED primary purchase
  // button that also reads "Conocer planes" (CTA_LABELS.monthly in
  // serviceContentLabels.js) and triggers handleCartAction("checkout") —
  // a real cart/checkout flow, not this feature's payment-free modal.
  // Not fixed here (that legacy CTA copy is a separate, unrelated
  // decision) — this test only proves the two buttons stay
  // distinguishable via className despite the identical visible text.
  it("stays distinguishable by className from the unrelated pre-existing 'monthly flow' checkout CTA that shares the same label", async () => {
    renderPage(product({ name: "Gestión de Redes Sociales", slug: "gestion-de-redes-sociales" }));
    await screen.findByRole("heading", { level: 1, name: "Gestión de Redes Sociales" });
    const allConocerPlanes = screen.getAllByText("Conocer planes");
    expect(allConocerPlanes.length).toBeGreaterThan(1);
    expect(plansButton()).not.toBeNull();
    expect(plansButton()).toHaveTextContent("Conocer planes");
    expect(document.querySelector(".service-detail-purchase__checkout-btn")).toHaveTextContent("Conocer planes");
  });
});
