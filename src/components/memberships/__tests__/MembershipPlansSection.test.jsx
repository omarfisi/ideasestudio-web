import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)));

const getPublicMembershipPlansMock = vi.fn();
vi.mock("@/lib/api.js", () => ({
  getPublicMembershipPlans: (...args) => getPublicMembershipPlansMock(...args),
}));

const { default: MembershipPlansSection } = await import(
  "@/components/memberships/MembershipPlansSection.jsx"
);

const componentSource = readFileSync(
  path.join(__dirname, "../MembershipPlansSection.jsx"),
  "utf8"
);

function plan(overrides = {}) {
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
    features_json: [
      { key: "graphic_pieces", label: "Piezas gráficas", quantity: 6, period: "month" },
    ],
    limits_json: null,
    cta_label: null,
    cta_url: null,
    badge_text: null,
    services: [],
    ...overrides,
  };
}

function serviceItem(overrides = {}) {
  return {
    id: `service-${Math.random().toString(36).slice(2)}`,
    name: "Diseño de Logotipo",
    slug: "diseno-de-logotipo",
    short_description: "Diseño profesional de logotipo.",
    image_url: null,
    quantity: null,
    period: null,
    label: "Diseño de Logotipo",
    is_featured: false,
    sort_order: 10,
    ...overrides,
  };
}

function renderSection() {
  return render(
    <MemoryRouter>
      <MembershipPlansSection />
    </MemoryRouter>
  );
}

beforeEach(() => {
  getPublicMembershipPlansMock.mockReset();
});

describe("MembershipPlansSection — plan counts", () => {
  it("shows the empty state with zero plans", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([]);
    renderSection();
    expect(
      await screen.findByText("Próximamente tendremos servicios mensuales disponibles.")
    ).toBeInTheDocument();
  });

  it("renders a single card for one plan", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([plan({ name: "Solo Plan" })]);
    renderSection();
    expect(await screen.findByText("Solo Plan")).toBeInTheDocument();
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(1);
  });

  it("renders three cards for three plans", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([
      plan({ name: "Presencia" }),
      plan({ name: "Crecimiento" }),
      plan({ name: "Premium" }),
    ]);
    renderSection();
    await screen.findByText("Presencia");
    expect(screen.getByText("Crecimiento")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();
  });

  it("renders four cards without breaking (plan count is never fixed)", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([
      plan({ name: "Plan A" }),
      plan({ name: "Plan B" }),
      plan({ name: "Plan C" }),
      plan({ name: "Plan D" }),
    ]);
    renderSection();
    await screen.findByText("Plan A");
    for (const name of ["Plan B", "Plan C", "Plan D"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });
});

describe("MembershipPlansSection — featured plan", () => {
  it("shows a badge for the featured plan", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([plan({ name: "Destacado", is_featured: true })]);
    renderSection();
    await screen.findByText("Destacado");
    expect(screen.getByText("Más popular")).toBeInTheDocument();
  });

  it("uses the plan's own badge_text over the default when both apply", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([
      plan({ name: "Premium", is_featured: true, badge_text: "Mejor valor" }),
    ]);
    renderSection();
    await screen.findByText("Premium");
    expect(screen.getByText("Mejor valor")).toBeInTheDocument();
    expect(screen.queryByText("Más popular")).not.toBeInTheDocument();
  });
});

describe("MembershipPlansSection — trial copy", () => {
  it("does not show trial text when trial_period_days is 0", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([plan({ name: "Sin prueba", trial_period_days: 0 })]);
    renderSection();
    await screen.findByText("Sin prueba");
    expect(screen.queryByText(/días de prueba/)).not.toBeInTheDocument();
  });

  it("shows trial text when trial_period_days is 7", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([plan({ name: "Con prueba", trial_period_days: 7 })]);
    renderSection();
    await screen.findByText("Con prueba");
    expect(screen.getByText("7 días de prueba")).toBeInTheDocument();
  });
});

describe("MembershipPlansSection — CTA", () => {
  it("uses the plan's custom CTA label and URL", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([
      plan({ name: "Con CTA", cta_label: "Suscribirme ahora", cta_url: "/mi-cuenta" }),
    ]);
    renderSection();
    const link = await screen.findByRole("link", { name: /Suscribirme ahora/ });
    expect(link).toHaveAttribute("href", "/mi-cuenta");
  });

  it("falls back to the default label and /contacto when the plan has none", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([plan({ name: "Sin CTA", cta_label: null, cta_url: null })]);
    renderSection();
    const link = await screen.findByRole("link", { name: /Solicitar información/ });
    expect(link).toHaveAttribute("href", "/contacto");
  });
});

describe("MembershipPlansSection — loading and error states", () => {
  it("shows skeletons while the request is in flight", async () => {
    let resolvePromise;
    getPublicMembershipPlansMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );
    const { container } = renderSection();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    resolvePromise([]);
    await waitFor(() => expect(container.querySelectorAll(".animate-pulse").length).toBe(0));
  });

  it("shows a generic error message on API failure, no technical detail", async () => {
    getPublicMembershipPlansMock.mockRejectedValue(new Error("membership_plan_service_unreachable_at_10.0.0.5"));
    renderSection();
    expect(
      await screen.findByText("No pudimos cargar los planes de membresía en este momento. Intenta de nuevo más tarde.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/membership_plan_service_unreachable/)).not.toBeInTheDocument();
  });
});

describe("MembershipPlansSection — no Stripe, no hardcoded plans, no own chrome", () => {
  it("never references Stripe anywhere in the component source", () => {
    expect(componentSource.toLowerCase()).not.toMatch(/stripe/);
  });

  it("never hardcodes the known TEST plan slugs", () => {
    expect(componentSource).not.toMatch(/membresia-presencia-test/);
    expect(componentSource).not.toMatch(/membresia-crecimiento-test/);
    expect(componentSource).not.toMatch(/membresia-premium-test/);
  });

  it("renders the grid by mapping over the fetched list, not a fixed array", () => {
    expect(componentSource).toMatch(/plans\.map\(/);
  });

  it("does not render its own SEO, Header, Footer or route", () => {
    expect(componentSource).not.toMatch(/SEOHead/);
    expect(componentSource).not.toMatch(/usePageSeo/);
    expect(componentSource).not.toMatch(/<Header/);
    expect(componentSource).not.toMatch(/<Footer/);
    expect(componentSource).not.toMatch(/createBrowserRouter|<Route/);
  });
});

describe("MembershipPlansSection — responsive grid + internal fields", () => {
  it("chooses a different grid class depending on plan count", () => {
    expect(componentSource).toMatch(/grid-cols-1 max-w-md mx-auto/);
    expect(componentSource).toMatch(/sm:grid-cols-2 max-w-3xl mx-auto/);
    expect(componentSource).toMatch(/lg:grid-cols-3/);
  });

  it("never renders workspace_id, metadata_json or Stripe IDs even if present in the API response", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([
      plan({
        name: "Con campos internos",
        workspace_id: "cfdd0b5a-3468-4d5a-86da-50e1f4f324a6",
        metadata_json: { is_test: true },
        stripe_test_product_id: "prod_test_123",
      }),
    ]);
    const { container } = renderSection();
    await screen.findByText("Con campos internos");
    expect(container.innerHTML).not.toMatch(/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/);
    expect(container.innerHTML).not.toMatch(/prod_test_123/);
    expect(container.innerHTML).not.toMatch(/is_test/);
  });
});

describe("MembershipPlansSection — included services", () => {
  it("shows no 'Servicios incluidos' block for a plan with zero linked services", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([plan({ name: "Sin servicios", services: [] })]);
    renderSection();
    await screen.findByText("Sin servicios");
    expect(screen.queryByText("Servicios incluidos")).not.toBeInTheDocument();
    // benefits must still render — the services block is additive, never a replacement
    expect(screen.getByText(/Piezas gráficas/)).toBeInTheDocument();
  });

  it("renders a single included service", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([
      plan({ name: "Un servicio", services: [serviceItem({ label: "Diseño de Logotipo" })] }),
    ]);
    renderSection();
    await screen.findByText("Un servicio");
    expect(screen.getByText("Servicios incluidos")).toBeInTheDocument();
    expect(screen.getByText("Diseño de Logotipo")).toBeInTheDocument();
  });

  it("renders multiple included services", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([
      plan({
        name: "Varios servicios",
        services: [
          serviceItem({ id: "s1", label: "Diseño de Logotipo" }),
          serviceItem({ id: "s2", label: "Video corto (2/month)" }),
          serviceItem({ id: "s3", label: "Reunión estratégica" }),
        ],
      }),
    ]);
    renderSection();
    await screen.findByText("Varios servicios");
    expect(screen.getByText("Diseño de Logotipo")).toBeInTheDocument();
    expect(screen.getByText("Video corto (2/month)")).toBeInTheDocument();
    expect(screen.getByText("Reunión estratégica")).toBeInTheDocument();
  });

  it("does not render service items as links yet (the /servicios/:slug route is a separate, unresolved issue)", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([
      plan({ name: "Plan con enlace pendiente", services: [serviceItem({ label: "Diseño de Logotipo", slug: "diseno-de-logotipo" })] }),
    ]);
    renderSection();
    await screen.findByText("Diseño de Logotipo");
    expect(screen.queryByRole("link", { name: /Diseño de Logotipo/ })).not.toBeInTheDocument();
  });

  it("the quantity/period phrase is already baked into label — rendered verbatim, not reconstructed client-side", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([
      plan({ name: "Con cantidad", services: [serviceItem({ label: "Diseño de Logotipo (6/month)", quantity: "6.00", period: "month" })] }),
    ]);
    renderSection();
    expect(await screen.findByText("Diseño de Logotipo (6/month)")).toBeInTheDocument();
  });

  it("a custom label_override is rendered exactly as provided by the API", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([
      plan({ name: "Con etiqueta", services: [serviceItem({ label: "6 piezas gráficas mensuales" })] }),
    ]);
    renderSection();
    expect(await screen.findByText("6 piezas gráficas mensuales")).toBeInTheDocument();
  });

  it("a featured included service is visually distinguished (bold)", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([
      plan({ name: "Con destacado", services: [serviceItem({ label: "Diseño de Logotipo", is_featured: true })] }),
    ]);
    const { container } = renderSection();
    await screen.findByText("Diseño de Logotipo");
    const strong = container.querySelector("strong");
    expect(strong?.textContent).toBe("Diseño de Logotipo");
  });

  it("a service without an image renders no thumbnail element", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([
      plan({ name: "Sin imagen", services: [serviceItem({ label: "Diseño de Logotipo", image_url: null })] }),
    ]);
    const { container } = renderSection();
    await screen.findByText("Diseño de Logotipo");
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("a service with an image renders its thumbnail", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([
      plan({
        name: "Con imagen",
        services: [serviceItem({ label: "Diseño de Logotipo", image_url: "https://example.com/logo.jpg" })],
      }),
    ]);
    const { container } = renderSection();
    await screen.findByText("Diseño de Logotipo");
    expect(container.querySelector("img")).toHaveAttribute("src", "https://example.com/logo.jpg");
  });

  it("never hardcodes service names — the list is always rendered from the fetched services array", () => {
    expect(componentSource).toMatch(/services\.map\(/);
    expect(componentSource).not.toMatch(/"Diseño gráfico"/);
    expect(componentSource).not.toMatch(/"Manejo básico de redes"/);
  });

  it("still never references Stripe after adding the services block", () => {
    expect(componentSource.toLowerCase()).not.toMatch(/stripe/);
  });
});
