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
  // Defense-in-depth companion to src/lib/__tests__/api.normalizeProduct.test.js
  // (which proves the real API-layer bug is fixed): confirms this page
  // resolves the service link via resolveProductServiceId() — checking
  // source_service_id, not just serviceId — rather than trusting
  // product.serviceId directly, so a future gap in the normalizer can't
  // silently disable the plans fetch again.
  it("resolves the service id via source_service_id when serviceId is missing from the product data", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([{ id: "plan-1", name: "Plan Básico" }]);
    renderPage(monthlyProduct({ serviceId: undefined, source_service_id: "svc-redes-raw" }));
    await screen.findByRole("heading", { level: 1, name: "Gestión de Redes Sociales" });
    await waitFor(() => expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalledWith("svc-redes-raw"));
    await waitFor(() => expect(plansButton()).toHaveTextContent("Ver planes disponibles"));
  });

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

  // Regression test for a real bug found in manual testing: clicking
  // "Ver planes disponibles" was triggering handleCartAction("checkout")
  // instead of opening the modal, because the shared Button component
  // renders a plain <button> with no explicit `type` when given onClick
  // but no to/href — which the browser defaults to type="submit" — and
  // both branches of the checkout/plans-modal ternary occupied the same
  // position, so React could reuse the same DOM node across the async
  // swap from "checkout CTA" to "plans CTA". Fixed with a native
  // <button type="button">, explicit preventDefault/stopPropagation, and
  // distinct `key`s on each ternary branch so the two are never the same
  // element.
  it("clicking 'Ver planes disponibles' never adds to cart or navigates to checkout — it is type=button and stays on the detail page", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([
      { id: "plan-1", name: "Membresía Presencia — TEST" },
      { id: "plan-2", name: "Membresía Crecimiento — TEST" },
      { id: "plan-3", name: "Membresía Premium — TEST" },
    ]);
    renderPage(monthlyProduct());
    await screen.findByRole("heading", { level: 1, name: "Gestión de Redes Sociales" });
    await waitFor(() => expect(plansButton()).toHaveTextContent("Ver planes disponibles"));

    expect(plansButton().type).toBe("button");

    fireEvent.click(plansButton());

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Membresía Presencia — TEST")).toBeInTheDocument();
    expect(screen.getByText("Membresía Crecimiento — TEST")).toBeInTheDocument();
    expect(screen.getByText("Membresía Premium — TEST")).toBeInTheDocument();

    // Never touched the cart / checkout flow.
    expect(addProductToPublicCartMock).not.toHaveBeenCalled();
    // Still on the product detail page — a real navigation to
    // /servicios/checkout would unmount this heading (no matching route
    // is registered for it in this test's router).
    expect(
      screen.getByRole("heading", { level: 1, name: "Gestión de Redes Sociales" })
    ).toBeInTheDocument();
  });

  it("the mobile sticky CTA also opens the modal (type=button) instead of checkout when plans are available", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([{ id: "plan-1", name: "Plan Básico" }]);
    renderPage(monthlyProduct());
    await screen.findByRole("heading", { level: 1, name: "Gestión de Redes Sociales" });
    const mobileBtn = await waitFor(() => {
      const el = document.querySelector(".service-detail-mobile-cta__btn");
      expect(el).toHaveTextContent("Ver planes disponibles");
      return el;
    });

    expect(mobileBtn.type).toBe("button");

    fireEvent.click(mobileBtn);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(addProductToPublicCartMock).not.toHaveBeenCalled();
  });

  it("closing the modal after opening it via 'Ver planes disponibles' does not navigate away", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValue([{ id: "plan-1", name: "Plan Básico" }]);
    renderPage(monthlyProduct());
    await screen.findByRole("heading", { level: 1, name: "Gestión de Redes Sociales" });
    await waitFor(() => expect(plansButton()).toHaveTextContent("Ver planes disponibles"));
    fireEvent.click(plansButton());
    await screen.findByRole("dialog");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      screen.getByRole("heading", { level: 1, name: "Gestión de Redes Sociales" })
    ).toBeInTheDocument();
    expect(addProductToPublicCartMock).not.toHaveBeenCalled();
  });

  // Regression test for the second real bug found in production: even
  // after relabeling the empty-state fallback to "Contratar servicio
  // mensual", it was STILL wired to handleCartAction("checkout") — clicking
  // it added the base service to the cart and navigated to
  // /servicios/checkout, exactly what a monthly-flow service must never
  // do. E_MONTHLY now has zero direct-purchase path in any state,
  // including empty: only a disabled status message and a working
  // "Reintentar" that re-runs the plans fetch. "Añadir al resumen" is
  // also hidden entirely for monthly-flow services — that secondary
  // button used to render unconditionally regardless of flow type.
  it("shows a disabled 'Planes no disponibles temporalmente' placeholder with a working Reintentar when the service has no published plans — never 'Conocer planes', never a cart/checkout action, no 'Añadir al resumen'", async () => {
    getPublicMembershipPlansByServiceMock.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { id: "plan-1", name: "Plan Básico" },
    ]);
    renderPage(monthlyProduct());
    await screen.findByRole("heading", { level: 1, name: "Gestión de Redes Sociales" });
    await waitFor(() => expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Ver planes disponibles")).not.toBeInTheDocument();
    expect(plansButton()).toBeNull();
    expect(screen.queryByText("Conocer planes")).not.toBeInTheDocument();
    expect(screen.queryByText("Añadir al resumen")).not.toBeInTheDocument();

    const placeholders = screen.getAllByText("Planes no disponibles temporalmente");
    expect(placeholders.length).toBe(2); // desktop + mobile
    placeholders.forEach((el) => expect(el.closest("button")).toBeDisabled());
    fireEvent.click(placeholders[0]);
    expect(addProductToPublicCartMock).not.toHaveBeenCalled();

    const retryButtons = screen.getAllByRole("button", { name: "Reintentar" });
    expect(retryButtons.length).toBe(2); // desktop + mobile
    fireEvent.click(retryButtons[0]);
    await waitFor(() => expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(plansButton()).toHaveTextContent("Ver planes disponibles"));
    expect(addProductToPublicCartMock).not.toHaveBeenCalled();
  });

  // Regression test for the actual root cause of the reported bug: while
  // the plans request is still in flight, hasMembershipPlans is false
  // (useServiceMembershipPlans starts with plans: []), which used to make
  // the page fall through to the SAME checkout-wired button described
  // above — so clicking "Conocer planes" during the loading window (a
  // real, if brief, race every page load hits) added to cart/navigated
  // to checkout instead of doing nothing until the modal button appears.
  it("shows a disabled 'Cargando planes…' placeholder while the request is in flight — never a checkout-wired button", async () => {
    let resolvePromise;
    getPublicMembershipPlansByServiceMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );
    renderPage(monthlyProduct());
    await screen.findByRole("heading", { level: 1, name: "Gestión de Redes Sociales" });

    const loadingButtons = screen.getAllByText("Cargando planes…");
    expect(loadingButtons.length).toBe(2); // desktop + mobile
    loadingButtons.forEach((el) => expect(el.closest("button")).toBeDisabled());
    expect(screen.queryByText("Ver planes disponibles")).not.toBeInTheDocument();
    expect(screen.queryByText("Conocer planes")).not.toBeInTheDocument();

    fireEvent.click(loadingButtons[0]);
    expect(addProductToPublicCartMock).not.toHaveBeenCalled();

    resolvePromise([{ id: "plan-1", name: "Plan Básico" }]);
    await waitFor(() => expect(plansButton()).toHaveTextContent("Ver planes disponibles"));
    expect(screen.queryByText("Cargando planes…")).not.toBeInTheDocument();
  });

  it("shows a disabled error placeholder with a working Reintentar if the plans request fails — never falls back to the checkout CTA", async () => {
    getPublicMembershipPlansByServiceMock
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce([{ id: "plan-1", name: "Plan Básico" }]);
    renderPage(monthlyProduct());
    await screen.findByRole("heading", { level: 1, name: "Gestión de Redes Sociales" });
    await waitFor(() => expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalledTimes(1));

    const errorButtons = screen.getAllByText("No se pudieron cargar los planes");
    expect(errorButtons.length).toBe(2); // desktop + mobile
    errorButtons.forEach((el) => expect(el.closest("button")).toBeDisabled());
    expect(screen.queryByText("Ver planes disponibles")).not.toBeInTheDocument();
    expect(screen.queryByText("Conocer planes")).not.toBeInTheDocument();

    fireEvent.click(errorButtons[0]);
    expect(addProductToPublicCartMock).not.toHaveBeenCalled();

    const retryButtons = screen.getAllByRole("button", { name: "Reintentar" });
    expect(retryButtons.length).toBe(2); // desktop + mobile
    fireEvent.click(retryButtons[0]);
    await waitFor(() => expect(getPublicMembershipPlansByServiceMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(plansButton()).toHaveTextContent("Ver planes disponibles"));
    expect(addProductToPublicCartMock).not.toHaveBeenCalled();
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
