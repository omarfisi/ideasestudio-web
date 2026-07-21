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
