import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

let mockSession = null;
vi.mock("@/contexts/AuthContext.jsx", () => ({
  useAuth: () => ({ session: mockSession, loading: false }),
}));

// Imported after the mock so OrderConfirmationPage's own `useAuth` import
// resolves to the mocked version above.
const { default: OrderConfirmationPage } = await import("@/pages/OrderConfirmationPage.jsx");

const BASE_ORDER = {
  id: "order-1",
  orderNumber: "ORD-1",
  email: "ana@example.com",
  status: "pending",
  paymentStatus: "pending",
  fulfillmentStatus: "not_applicable",
  currency: "USD",
  subtotal: 500,
  total: 500,
  notes: "",
  source: "website_store",
  createdAt: "2026-07-20T12:00:00Z",
  items: [
    { id: "item-1", productId: "prod-1", snapshotName: "Diseño de Página Web", quantity: 1, unitPrice: 500 },
  ],
  summary: { lineItems: 1, totalQuantity: 1 },
};

const QUOTE_STATE = {
  fromCheckout: true,
  saleMode: "cotizacion",
  proposalId: "prop-1",
  paymentRequired: false,
  customerName: "Ana Pérez",
};

beforeEach(() => {
  window.localStorage.clear();
  mockSession = null;
});

function renderConfirmation({ order = BASE_ORDER, state = null } = {}) {
  const router = createMemoryRouter(
    [
      {
        path: "/servicios/ordenes/:orderNumber",
        loader: () => ({ order }),
        element: <OrderConfirmationPage />,
      },
    ],
    {
      initialEntries: [
        { pathname: "/servicios/ordenes/ORD-1", state: state ?? undefined },
      ],
    }
  );
  return render(<RouterProvider router={router} />);
}

async function findCard() {
  return screen.findByText("Tu solicitud fue recibida correctamente");
}

describe("OrderConfirmationPage — quote confirmation redesign", () => {
  // 1. muestra nuevo título
  it("shows the new hero title", async () => {
    renderConfirmation({ state: QUOTE_STATE });
    expect(
      await screen.findByRole("heading", { level: 1, name: "Recibimos tu solicitud de propuesta" })
    ).toBeInTheDocument();
  });

  // 2. no repite el título dentro de la tarjeta
  it("never repeats the hero title inside the card — the card has its own distinct heading", async () => {
    renderConfirmation({ state: QUOTE_STATE });
    await screen.findByRole("heading", { level: 1, name: "Recibimos tu solicitud de propuesta" });
    expect(screen.queryAllByText("Recibimos tu solicitud de propuesta")).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 2, name: "Tu solicitud fue recibida correctamente" })
    ).toBeInTheDocument();
  });

  // 3. muestra "No se realizó ningún cargo"
  it("shows 'No se realizó ningún cargo'", async () => {
    renderConfirmation({ state: QUOTE_STATE });
    expect(await screen.findByText("No se realizó ningún cargo.")).toBeInTheDocument();
  });

  // 4. usa "Número de solicitud"
  it("uses 'Número de solicitud', never 'Número de orden'", async () => {
    renderConfirmation({ state: QUOTE_STATE });
    await findCard();
    expect(screen.getByText("Número de solicitud")).toBeInTheDocument();
    expect(screen.queryByText("Número de orden")).not.toBeInTheDocument();
    expect(screen.getByText("ORD-1")).toBeInTheDocument();
  });

  // 5. no muestra "Ver mi orden"
  it("never shows 'Ver mi orden'", async () => {
    mockSession = { user: { id: "user-1" } };
    renderConfirmation({ state: QUOTE_STATE });
    await findCard();
    expect(screen.queryByText(/ver mi orden/i)).not.toBeInTheDocument();
  });

  // 6. muestra "Ver estado de mi solicitud"
  it("shows 'Ver estado de mi solicitud' as the primary action", async () => {
    renderConfirmation({ state: QUOTE_STATE });
    await findCard();
    expect(screen.getByText("Ver estado de mi solicitud")).toBeInTheDocument();
  });

  // 7. muestra servicios solicitados
  it("shows the 'Servicios solicitados' section with each item's name/qty/estimate", async () => {
    renderConfirmation({ state: QUOTE_STATE });
    await findCard();
    expect(screen.getByText("Servicios solicitados")).toBeInTheDocument();
    expect(screen.getByText("Diseño de Página Web")).toBeInTheDocument();
    expect(screen.getByText("Cantidad: 1")).toBeInTheDocument();
    expect(screen.getByText(/Estimado:/)).toBeInTheDocument();
  });

  // 8. muestra total como "Total estimado"
  it("shows the total as 'Total estimado'", async () => {
    renderConfirmation({ state: QUOTE_STATE });
    await findCard();
    expect(screen.getByText("Total estimado")).toBeInTheDocument();
    expect(screen.getByText("$500.00")).toBeInTheDocument();
  });

  // 9. muestra aviso de variación de alcance
  it("shows the scope-may-vary disclaimer", async () => {
    renderConfirmation({ state: QUOTE_STATE });
    await findCard();
    expect(
      screen.getByText("El total final puede variar según el alcance aprobado en la propuesta.")
    ).toBeInTheDocument();
  });

  // 10. muestra próximos pasos
  it("shows the '¿Qué ocurre ahora?' next-steps section with all 3 steps", async () => {
    renderConfirmation({ state: QUOTE_STATE });
    await findCard();
    expect(screen.getByText("¿Qué ocurre ahora?")).toBeInTheDocument();
    expect(screen.getByText("Revisamos tu solicitud.")).toBeInTheDocument();
    expect(screen.getByText("Preparamos la propuesta.")).toBeInTheDocument();
    expect(
      screen.getByText("Te enviamos la propuesta por correo para revisión y aprobación.")
    ).toBeInTheDocument();
  });

  // 11. completed muestra "Propuesta creada"
  it("proposalGenerationStatus=completed shows the 'Propuesta creada' badge and confirms the email was sent", async () => {
    renderConfirmation({ state: { ...QUOTE_STATE, proposalGenerationStatus: "completed" } });
    await findCard();
    expect(screen.getByText("Propuesta creada")).toBeInTheDocument();
    expect(
      screen.getByText("La propuesta fue generada y será enviada al correo indicado.")
    ).toBeInTheDocument();
    expect(screen.getByText("También enviamos una confirmación a:")).toBeInTheDocument();
  });

  // 12. failed no muestra error técnico
  it("proposalGenerationStatus=failed never shows a technical error, only a friendly received message", async () => {
    renderConfirmation({ state: { ...QUOTE_STATE, proposalGenerationStatus: "failed" } });
    await findCard();
    // "Solicitud recibida" also appears as the hero eyebrow — scope to the
    // status badge specifically to avoid a false multi-match.
    expect(document.querySelector(".quote-confirmation-badge")).toHaveTextContent("Solicitud recibida");
    expect(
      screen.getByText(
        "Recibimos tu solicitud. Nuestro equipo preparará la propuesta y se comunicará contigo."
      )
    ).toBeInTheDocument();
    const bodyText = document.body.textContent;
    expect(bodyText).not.toMatch(/asyncpg|traceback|stack trace|failed|error interno/i);
  });

  // 13. null muestra "Propuesta en preparación"
  it("proposalGenerationStatus=null (or missing) shows 'Propuesta en preparación'", async () => {
    renderConfirmation({ state: QUOTE_STATE });
    await findCard();
    expect(screen.getByText("Propuesta en preparación")).toBeInTheDocument();
    expect(screen.getByText("Enviaremos la propuesta a:")).toBeInTheDocument();
    expect(document.querySelector(".quote-confirmation-badge--pending")).toBeInTheDocument();
  });

  it("pending and failed badges use distinct CSS tones (yellow vs. black+yellow-border), never sharing one class", async () => {
    const { unmount } = renderConfirmation({ state: QUOTE_STATE });
    await findCard();
    expect(document.querySelector(".quote-confirmation-badge--pending")).toBeInTheDocument();
    expect(document.querySelector(".quote-confirmation-badge--received")).not.toBeInTheDocument();
    unmount();

    renderConfirmation({ state: { ...QUOTE_STATE, proposalGenerationStatus: "failed" } });
    await findCard();
    expect(document.querySelector(".quote-confirmation-badge--received")).toBeInTheDocument();
    expect(document.querySelector(".quote-confirmation-badge--pending")).not.toBeInTheDocument();
  });

  // 14. compra directa conserva su pantalla actual
  it("compra directa (no fromCheckout state) keeps the existing generic order screen untouched", async () => {
    renderConfirmation({ order: { ...BASE_ORDER, paymentStatus: "paid", status: "paid" }, state: null });
    expect(await screen.findByText("Confirmación de la orden")).toBeInTheDocument();
    expect(screen.queryByText("Tu solicitud fue recibida correctamente")).not.toBeInTheDocument();
    expect(screen.queryByText("Recibimos tu solicitud de propuesta")).not.toBeInTheDocument();
  });

  // 15. funciona tras refresh
  it("rebuilds the quote confirmation from last_store_order on refresh (no router state)", async () => {
    window.localStorage.setItem(
      "last_store_order",
      JSON.stringify({
        order_id: "order-1",
        order_number: "ORD-1",
        sale_mode: "cotizacion",
        proposal_id: "prop-1",
        payment_required: false,
        customer_name: "Ana Pérez",
        proposal_generation_status: "completed",
      })
    );
    renderConfirmation({ state: null });
    await findCard();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("Propuesta creada")).toBeInTheDocument();
  });

  // 16. funciona para usuario invitado
  it("guest: primary action is a reload button labeled 'Ver estado de mi solicitud', never a Link", async () => {
    mockSession = null;
    renderConfirmation({ state: QUOTE_STATE });
    await findCard();
    expect(screen.queryByRole("link", { name: /ver estado de mi solicitud/i })).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: /ver estado de mi solicitud/i });
    expect(button).toBeInTheDocument();
  });

  // 17. funciona para usuario autenticado
  it("authenticated: primary action links to the account order-detail page by order.id", async () => {
    mockSession = { user: { id: "user-1" } };
    renderConfirmation({ state: QUOTE_STATE });
    await findCard();
    const link = screen.getByRole("link", { name: /ver estado de mi solicitud/i });
    expect(link).toHaveAttribute("href", "/mi-cuenta/ordenes/order-1");
  });

  // 18. funciona con varios servicios
  it("shows every service row when the order has multiple items", async () => {
    renderConfirmation({
      order: {
        ...BASE_ORDER,
        items: [
          { id: "item-1", productId: "prod-1", snapshotName: "Materiales de Marketing", quantity: 1, unitPrice: 299.99 },
          { id: "item-2", productId: "prod-2", snapshotName: "Producción de Videos Avanzado", quantity: 1, unitPrice: 450 },
        ],
      },
      state: QUOTE_STATE,
    });
    await findCard();
    expect(screen.getByText("Materiales de Marketing")).toBeInTheDocument();
    expect(screen.getByText("Producción de Videos Avanzado")).toBeInTheDocument();
  });

  // 19. responsive no desborda correo ni número
  it("wraps long emails via a dedicated word-break class instead of overflowing", async () => {
    renderConfirmation({
      order: { ...BASE_ORDER, email: "una-direccion-de-correo-realmente-larga-para-probar@ideasestudiopr.com" },
      state: QUOTE_STATE,
    });
    await findCard();
    const emailNodes = screen.getAllByText("una-direccion-de-correo-realmente-larga-para-probar@ideasestudiopr.com");
    const referenceEmail = emailNodes.find((node) => node.className.includes("quote-confirmation-reference__email"));
    expect(referenceEmail).toBeTruthy();
  });

  // 20. CTA no enlaza circularmente a la misma página
  it("the authenticated CTA never links back to this same confirmation URL", async () => {
    mockSession = { user: { id: "user-1" } };
    renderConfirmation({ state: QUOTE_STATE });
    await findCard();
    const link = screen.getByRole("link", { name: /ver estado de mi solicitud/i });
    expect(link.getAttribute("href")).not.toBe("/servicios/ordenes/ORD-1");
  });

  it("shows reference info (número de solicitud, fecha, nombre, correo) in one grid", async () => {
    renderConfirmation({ state: QUOTE_STATE });
    const card = (await findCard()).closest("article");
    const utils = within(card);
    expect(utils.getByText("Fecha")).toBeInTheDocument();
    expect(utils.getByText("Nombre")).toBeInTheDocument();
    expect(utils.getByText("Correo")).toBeInTheDocument();
    expect(utils.getByText("Ana Pérez")).toBeInTheDocument();
  });

  it("never shows the not-found or generic states when a quote order loads correctly", async () => {
    renderConfirmation({ state: QUOTE_STATE });
    await findCard();
    expect(screen.queryByText("Orden no encontrada")).not.toBeInTheDocument();
    expect(screen.queryByText("Confirmación de la orden")).not.toBeInTheDocument();
  });

  it("shows the not-found state when the loader resolves no order", async () => {
    renderConfirmation({ order: null, state: null });
    expect(await screen.findByText("Orden no encontrada")).toBeInTheDocument();
  });

  it("never calls create-order or create-payment-intent on a refresh recovery", async () => {
    const apiMock = await import("@/lib/api.js");
    const createOrderSpy = vi.spyOn(apiMock, "submitPublicStoreCheckout");
    const createIntentSpy = vi.spyOn(apiMock, "createPublicStorePaymentIntent");

    window.localStorage.setItem(
      "last_store_order",
      JSON.stringify({ order_number: "ORD-1", sale_mode: "cotizacion", payment_required: false })
    );
    renderConfirmation({ state: null });
    await findCard();

    expect(createOrderSpy).not.toHaveBeenCalled();
    expect(createIntentSpy).not.toHaveBeenCalled();
    createOrderSpy.mockRestore();
    createIntentSpy.mockRestore();
  });

  it("never renders a 'Pagar ahora' or 'Completar pago' button on the quote confirmation", async () => {
    renderConfirmation({ state: QUOTE_STATE });
    await findCard();
    expect(screen.queryByText(/pagar ahora/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/completar pago/i)).not.toBeInTheDocument();
  });
});
