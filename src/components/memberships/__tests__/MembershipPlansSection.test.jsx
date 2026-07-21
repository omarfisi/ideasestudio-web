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
    features_json: [],
    limits_json: null,
    cta_label: null,
    cta_url: null,
    badge_text: null,
    services: [],
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

// Not currently rendered by any route (StorePage no longer mounts it —
// see fix(memberships): show plans from service detail), but kept and
// still tested: card-rendering itself is now MembershipPlanCards'
// responsibility (see MembershipPlanCards.test.jsx) — this file only
// covers MembershipPlansSection's own remaining job: fetch the full
// catalog and hand it off, with its own loading/error/empty states.

describe("MembershipPlansSection — fetch + delegate", () => {
  it("fetches the full public catalog via getPublicMembershipPlans", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([plan({ name: "Uno" })]);
    renderSection();
    await screen.findByText("Uno");
    expect(getPublicMembershipPlansMock).toHaveBeenCalledTimes(1);
  });

  it("delegates card rendering to MembershipPlanCards instead of duplicating markup", () => {
    expect(componentSource).toMatch(/<MembershipPlanCards plans=\{plans\}\s*\/>/);
    expect(componentSource).toMatch(/from "@\/components\/memberships\/MembershipPlanCards\.jsx"/);
  });

  it("renders three cards for three plans (via delegation)", async () => {
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

  it("shows the empty state with zero plans", async () => {
    getPublicMembershipPlansMock.mockResolvedValue([]);
    renderSection();
    expect(
      await screen.findByText("Próximamente tendremos servicios mensuales disponibles.")
    ).toBeInTheDocument();
  });
});

describe("MembershipPlansSection — no Stripe, no own chrome", () => {
  it("never references Stripe anywhere in the component source", () => {
    expect(componentSource.toLowerCase()).not.toMatch(/stripe/);
  });

  it("does not render its own SEO, Header, Footer or route", () => {
    expect(componentSource).not.toMatch(/SEOHead/);
    expect(componentSource).not.toMatch(/usePageSeo/);
    expect(componentSource).not.toMatch(/<Header/);
    expect(componentSource).not.toMatch(/<Footer/);
    expect(componentSource).not.toMatch(/createBrowserRouter|<Route/);
  });
});
