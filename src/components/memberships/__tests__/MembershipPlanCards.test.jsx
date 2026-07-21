import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import MembershipPlanCards from "@/components/memberships/MembershipPlanCards.jsx";

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)));
const componentSource = readFileSync(
  path.join(__dirname, "../MembershipPlanCards.jsx"),
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

function renderCards(plans) {
  return render(
    <MemoryRouter>
      <MembershipPlanCards plans={plans} />
    </MemoryRouter>
  );
}

describe("MembershipPlanCards — pure presentational, no fetch", () => {
  it("never fetches — renders synchronously from the plans prop alone", () => {
    renderCards([plan({ name: "Sincrónico" })]);
    expect(screen.getByText("Sincrónico")).toBeInTheDocument();
  });

  it("does not import any api client or router loader", () => {
    expect(componentSource).not.toMatch(/from "@\/lib\/api\.js"/);
    expect(componentSource).not.toMatch(/useLoaderData/);
    expect(componentSource).not.toMatch(/useEffect/);
  });
});

describe("MembershipPlanCards — plan counts", () => {
  it("renders nothing for an empty list", () => {
    const { container } = renderCards([]);
    expect(container.querySelectorAll("article").length).toBe(0);
  });

  it("renders a single card for one plan", () => {
    renderCards([plan({ name: "Solo Plan" })]);
    expect(screen.getByText("Solo Plan")).toBeInTheDocument();
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(1);
  });

  it("renders three cards for three plans", () => {
    renderCards([plan({ name: "Presencia" }), plan({ name: "Crecimiento" }), plan({ name: "Premium" })]);
    expect(screen.getByText("Presencia")).toBeInTheDocument();
    expect(screen.getByText("Crecimiento")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();
  });

  it("renders five cards without breaking (plan count is never fixed)", () => {
    renderCards([0, 1, 2, 3, 4].map((i) => plan({ name: `Plan ${i}` })));
    for (let i = 0; i < 5; i += 1) {
      expect(screen.getByText(`Plan ${i}`)).toBeInTheDocument();
    }
  });

  it("chooses a different grid class depending on plan count", () => {
    expect(componentSource).toMatch(/grid-cols-1 max-w-md mx-auto/);
    expect(componentSource).toMatch(/sm:grid-cols-2 max-w-3xl mx-auto/);
    expect(componentSource).toMatch(/lg:grid-cols-3/);
  });
});

describe("MembershipPlanCards — featured plan", () => {
  it("shows a badge for the featured plan", () => {
    renderCards([plan({ name: "Destacado", is_featured: true })]);
    expect(screen.getByText("Más popular")).toBeInTheDocument();
  });

  it("uses the plan's own badge_text over the default when both apply", () => {
    renderCards([plan({ name: "Premium", is_featured: true, badge_text: "Mejor valor" })]);
    expect(screen.getByText("Mejor valor")).toBeInTheDocument();
    expect(screen.queryByText("Más popular")).not.toBeInTheDocument();
  });
});

describe("MembershipPlanCards — trial copy", () => {
  it("does not show trial text when trial_period_days is 0", () => {
    renderCards([plan({ name: "Sin prueba", trial_period_days: 0 })]);
    expect(screen.queryByText(/días de prueba/)).not.toBeInTheDocument();
  });

  it("shows trial text when trial_period_days is 7", () => {
    renderCards([plan({ name: "Con prueba", trial_period_days: 7 })]);
    expect(screen.getByText("7 días de prueba")).toBeInTheDocument();
  });
});

describe("MembershipPlanCards — CTA", () => {
  it("uses the plan's custom CTA label and URL", () => {
    renderCards([plan({ name: "Con CTA", cta_label: "Suscribirme ahora", cta_url: "/mi-cuenta" })]);
    const link = screen.getByRole("link", { name: /Suscribirme ahora/ });
    expect(link).toHaveAttribute("href", "/mi-cuenta");
  });

  it("falls back to the default label and /contacto when the plan has none", () => {
    renderCards([plan({ name: "Sin CTA", cta_label: null, cta_url: null })]);
    const link = screen.getByRole("link", { name: /Solicitar información/ });
    expect(link).toHaveAttribute("href", "/contacto");
  });
});

describe("MembershipPlanCards — services array (general/multi-service shape)", () => {
  it("shows no 'Servicios incluidos' block for a plan with zero linked services", () => {
    renderCards([plan({ name: "Sin servicios", services: [] })]);
    expect(screen.queryByText("Servicios incluidos")).not.toBeInTheDocument();
    expect(screen.getByText(/Piezas gráficas/)).toBeInTheDocument();
  });

  it("renders a single included service", () => {
    renderCards([plan({ name: "Un servicio", services: [serviceItem({ label: "Diseño de Logotipo" })] })]);
    expect(screen.getByText("Servicios incluidos")).toBeInTheDocument();
    expect(screen.getByText("Diseño de Logotipo")).toBeInTheDocument();
  });

  it("renders multiple included services", () => {
    renderCards([
      plan({
        name: "Varios servicios",
        services: [
          serviceItem({ id: "s1", label: "Diseño de Logotipo" }),
          serviceItem({ id: "s2", label: "Video corto (2/month)" }),
          serviceItem({ id: "s3", label: "Reunión estratégica" }),
        ],
      }),
    ]);
    expect(screen.getByText("Diseño de Logotipo")).toBeInTheDocument();
    expect(screen.getByText("Video corto (2/month)")).toBeInTheDocument();
    expect(screen.getByText("Reunión estratégica")).toBeInTheDocument();
  });

  it("does not render service items as links yet (the /servicios/:slug route is a separate, unresolved issue)", () => {
    renderCards([plan({ name: "Plan con enlace pendiente", services: [serviceItem({ label: "Diseño de Logotipo", slug: "diseno-de-logotipo" })] })]);
    expect(screen.queryByRole("link", { name: /Diseño de Logotipo/ })).not.toBeInTheDocument();
  });

  it("a featured included service is visually distinguished (bold)", () => {
    const { container } = renderCards([
      plan({ name: "Con destacado", services: [serviceItem({ label: "Diseño de Logotipo", is_featured: true })] }),
    ]);
    const strong = container.querySelector("strong");
    expect(strong?.textContent).toBe("Diseño de Logotipo");
  });

  it("a service with an image renders its thumbnail", () => {
    const { container } = renderCards([
      plan({ name: "Con imagen", services: [serviceItem({ label: "Diseño de Logotipo", image_url: "https://example.com/logo.jpg" })] }),
    ]);
    expect(container.querySelector("img")).toHaveAttribute("src", "https://example.com/logo.jpg");
  });
});

describe("MembershipPlanCards — included_service (single-service shape, from the by-service endpoint)", () => {
  it("renders the included_service label as a highlighted callout", () => {
    renderCards([
      plan({
        name: "Plan Básico",
        services: undefined,
        included_service: { service_id: "svc-1", quantity: "8.00", period: "month", label: "8 publicaciones mensuales", description: null },
      }),
    ]);
    expect(screen.getByText(/8 publicaciones mensuales/)).toBeInTheDocument();
  });

  it("does not also render a 'Servicios incluidos' list when only included_service is present", () => {
    renderCards([
      plan({
        name: "Plan Básico",
        services: undefined,
        included_service: { service_id: "svc-1", quantity: "8.00", period: "month", label: "8 publicaciones mensuales", description: null },
      }),
    ]);
    expect(screen.queryByText("Servicios incluidos")).not.toBeInTheDocument();
  });
});

describe("MembershipPlanCards — no leaks, no hardcoding", () => {
  it("never renders workspace_id, metadata_json or Stripe IDs even if present in the plan object", () => {
    const { container } = renderCards([
      plan({
        name: "Con campos internos",
        workspace_id: "cfdd0b5a-3468-4d5a-86da-50e1f4f324a6",
        metadata_json: { is_test: true },
        stripe_test_product_id: "prod_test_123",
      }),
    ]);
    expect(container.innerHTML).not.toMatch(/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/);
    expect(container.innerHTML).not.toMatch(/prod_test_123/);
    expect(container.innerHTML).not.toMatch(/is_test/);
  });

  it("renders by mapping over the plans prop, not a fixed array", () => {
    expect(componentSource).toMatch(/items\.map\(/);
  });

  it("never hardcodes plan or service names", () => {
    expect(componentSource).not.toMatch(/"Diseño gráfico"/);
    expect(componentSource).not.toMatch(/"Manejo básico de redes"/);
    expect(componentSource).not.toMatch(/membresia-presencia-test/);
  });

  it("never references Stripe", () => {
    expect(componentSource.toLowerCase()).not.toMatch(/stripe/);
  });
});
