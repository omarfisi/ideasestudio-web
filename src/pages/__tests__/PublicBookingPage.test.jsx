import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

const getPublicCatalogMock = vi.fn();
const getPublicServiceBySlugMock = vi.fn();
const getPublicServiceBookingMock = vi.fn();
const createPublicServiceReservationMock = vi.fn();
const getPublicProductBySlugMock = vi.fn();
const createOrUpdatePublicCartMock = vi.fn();
const submitPublicStoreCheckoutMock = vi.fn();
const createPublicStorePaymentIntentMock = vi.fn();
const getPublicOrderByIdMock = vi.fn();

vi.mock("@/lib/api.js", () => ({
  getPublicCatalog: (...args) => getPublicCatalogMock(...args),
  getPublicServiceBySlug: (...args) => getPublicServiceBySlugMock(...args),
  getPublicProductBySlug: (...args) => getPublicProductBySlugMock(...args),
  createOrUpdatePublicCart: (...args) => createOrUpdatePublicCartMock(...args),
  submitPublicStoreCheckout: (...args) => submitPublicStoreCheckoutMock(...args),
  createPublicStorePaymentIntent: (...args) => createPublicStorePaymentIntentMock(...args),
  getPublicOrderById: (...args) => getPublicOrderByIdMock(...args),
}));

vi.mock("@/lib/publicServicesApi.js", () => ({
  getPublicServiceBooking: (...args) => getPublicServiceBookingMock(...args),
  createPublicServiceReservation: (...args) => createPublicServiceReservationMock(...args),
}));

vi.mock("@/lib/stripeClient.js", () => ({ stripePromise: { id: "test-stripe" } }));
vi.mock("@stripe/react-stripe-js", () => ({ Elements: ({ children }) => children }));
vi.mock("@/components/checkout/StoreCardPaymentForm.jsx", () => ({
  default: ({ order, onPaymentSucceeded }) => (
    <div data-testid="store-card-payment-form">
      <span>Pago para {order.orderNumber || order.id}</span>
      <button type="button" onClick={() => onPaymentSucceeded?.()}>Simular pago aprobado</button>
    </div>
  ),
}));

vi.mock("@/components/seo/SEOHead.jsx", () => ({ default: () => null }));
vi.mock("@/hooks/usePageSeo.js", () => ({ usePageSeo: () => null }));
vi.mock("@/components/booking/ServiceBookingPanel.jsx", () => ({
  default: ({ slug, serviceName, section, onSelectionChange, onStatusChange }) => (
    <div data-testid="booking-panel" data-slug={slug} data-service-name={serviceName} data-section={section}>
      {section === "schedule" && (
        <button type="button" onClick={() => {
          onStatusChange?.(slug, { display: {
            timezone: "America/Puerto_Rico",
            packageName: "Básico",
            durationMinutes: 60,
            total: 100,
            currency: "USD",
            addons: [],
          } });
          onSelectionChange?.(slug, {
            service_slug: slug,
            starts_at: "2026-09-03T14:15:00+00:00",
            ends_at: "2026-09-03T15:15:00+00:00",
            package_id: "package-1",
            selected_addons: [{ addon_id: "addon-1", quantity: 1 }],
          });
        }}>Seleccionar horario de prueba</button>
      )}
    </div>
  ),
}));

const { default: PublicBookingPage } = await import("@/pages/PublicBookingPage.jsx");

const bookingConfig = {
  booking_settings: { requires_calendar: true },
};

const service = (overrides = {}) => ({
  id: "service-1",
  name: "Sesión de fotografía",
  slug: "sesion-fotografia",
  shortDescription: "Una sesión para tu proyecto.",
  isActive: true,
  ...overrides,
});

function renderAt(initialEntry) {
  const router = createMemoryRouter(
    [
      { path: "/reservar", element: <PublicBookingPage /> },
      { path: "/reservar/:slug", element: <PublicBookingPage /> },
    ],
    { initialEntries: [initialEntry] }
  );
  return { ...render(<RouterProvider router={router} />), router };
}

beforeEach(() => {
  getPublicCatalogMock.mockReset();
  getPublicServiceBySlugMock.mockReset();
  getPublicServiceBookingMock.mockReset();
  createPublicServiceReservationMock.mockReset();
  getPublicProductBySlugMock.mockReset();
  createOrUpdatePublicCartMock.mockReset();
  submitPublicStoreCheckoutMock.mockReset();
  createPublicStorePaymentIntentMock.mockReset();
  getPublicOrderByIdMock.mockReset();
});

describe("PublicBookingPage /reservar", () => {
  it("renders the public booking heading and loading state", () => {
    getPublicCatalogMock.mockReturnValue(new Promise(() => {}));
    renderAt("/reservar");
    expect(screen.getByRole("heading", { name: "Agenda una cita" })).toBeInTheDocument();
    expect(screen.getByText("Cargando servicios")).toBeInTheDocument();
  });

  it("shows a catalog error", async () => {
    getPublicCatalogMock.mockRejectedValue(new Error("Catálogo no disponible"));
    renderAt("/reservar");
    expect(await screen.findByText("Catálogo no disponible")).toBeInTheDocument();
  });

  it("shows the empty state when no active service is bookable", async () => {
    getPublicCatalogMock.mockResolvedValue({ items: [service({ isActive: false })] });
    renderAt("/reservar");
    expect(await screen.findByText("No hay servicios reservables disponibles")).toBeInTheDocument();
    expect(getPublicServiceBookingMock).not.toHaveBeenCalled();
  });

  it("shows only active services with calendar booking configuration", async () => {
    const bookable = service();
    const noCalendar = service({ id: "service-2", slug: "sin-calendario", name: "Servicio sin agenda" });
    getPublicCatalogMock.mockResolvedValue({ items: [bookable, noCalendar] });
    getPublicServiceBookingMock.mockImplementation((slug) =>
      Promise.resolve(slug === bookable.slug ? bookingConfig : { booking_settings: { requires_calendar: false } })
    );
    renderAt("/reservar");
    expect(await screen.findByText(bookable.name)).toBeInTheDocument();
    expect(screen.queryByText(noCalendar.name)).not.toBeInTheDocument();
  });

  it("navigates to the service slug when selected", async () => {
    getPublicCatalogMock.mockResolvedValue({ items: [service()] });
    getPublicServiceBookingMock.mockResolvedValue(bookingConfig);
    const { router } = renderAt("/reservar");
    const card = await screen.findByRole("button", { name: /Seleccionar servicio/i });
    fireEvent.click(card);
    await waitFor(() => expect(router.state.location.pathname).toBe("/reservar/sesion-fotografia"));
  });

  it("does not create a reservation while selecting a service", async () => {
    getPublicCatalogMock.mockResolvedValue({ items: [service()] });
    getPublicServiceBookingMock.mockResolvedValue(bookingConfig);
    renderAt("/reservar");
    await screen.findByRole("button", { name: /Seleccionar servicio/i });
    expect(getPublicServiceBookingMock).not.toHaveBeenCalledWith(expect.stringMatching(/reservations/));
  });
});

describe("PublicBookingPage /reservar/:slug", () => {
  it("supports a direct deep link to a valid bookable service", async () => {
    getPublicServiceBySlugMock.mockResolvedValue(service());
    getPublicServiceBookingMock.mockResolvedValue(bookingConfig);
    renderAt("/reservar/sesion-fotografia");
    expect(await screen.findByTestId("booking-panel")).toHaveAttribute("data-slug", "sesion-fotografia");
    expect(screen.getByTestId("booking-panel")).toHaveAttribute("data-section", "schedule");
  });

  it("shows not found for an unknown slug", async () => {
    getPublicServiceBySlugMock.mockResolvedValue(null);
    renderAt("/reservar/no-existe");
    expect(await screen.findByRole("heading", { name: "Servicio no encontrado" })).toBeInTheDocument();
    expect(getPublicServiceBookingMock).not.toHaveBeenCalled();
  });

  it("shows unavailable when the service has no public calendar", async () => {
    getPublicServiceBySlugMock.mockResolvedValue(service());
    getPublicServiceBookingMock.mockResolvedValue({ booking_settings: { requires_calendar: false } });
    renderAt("/reservar/sesion-fotografia");
    expect(await screen.findByRole("heading", { name: "Reserva no disponible" })).toBeInTheDocument();
  });

  it("shows a clear error when loading the direct service fails", async () => {
    getPublicServiceBySlugMock.mockRejectedValue(new Error("Error de servicio"));
    renderAt("/reservar/sesion-fotografia");
    expect(await screen.findByText("Error de servicio")).toBeInTheDocument();
  });

  it("passes the service name and slug to the reusable booking panel", async () => {
    getPublicServiceBySlugMock.mockResolvedValue(service({ name: "Reserva editorial" }));
    getPublicServiceBookingMock.mockResolvedValue(bookingConfig);
    renderAt("/reservar/sesion-fotografia");
    const panel = await screen.findByTestId("booking-panel");
    expect(panel).toHaveAttribute("data-service-name", "Reserva editorial");
    expect(panel).toHaveAttribute("data-slug", "sesion-fotografia");
  });

  it("does not require a cart or session token", async () => {
    getPublicServiceBySlugMock.mockResolvedValue(service());
    getPublicServiceBookingMock.mockResolvedValue(bookingConfig);
    renderAt("/reservar/sesion-fotografia");
    await screen.findByTestId("booking-panel");
    expect(screen.queryByText(/carrito|sessiontoken/i)).not.toBeInTheDocument();
  });

  it("shows customer fields only after a real slot selection", async () => {
    getPublicServiceBySlugMock.mockResolvedValue(service());
    getPublicServiceBookingMock.mockResolvedValue(bookingConfig);
    renderAt("/reservar/sesion-fotografia");
    await screen.findByTestId("booking-panel");
    expect(screen.queryByLabelText("Nombre *")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Seleccionar horario de prueba" }));
    expect(await screen.findByLabelText("Nombre *")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico *")).toBeInTheDocument();
    expect(screen.getAllByText("America/Puerto_Rico")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Fecha y hora" })).toBeInTheDocument();
    expect(screen.getByText("Resumen de reserva")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tus datos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Notas" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Editar" })).toHaveAttribute("href", "#booking-schedule");
  });

  it("validates required customer data before submitting", async () => {
    getPublicServiceBySlugMock.mockResolvedValue(service());
    getPublicServiceBookingMock.mockResolvedValue(bookingConfig);
    renderAt("/reservar/sesion-fotografia");
    await screen.findByTestId("booking-panel");
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar horario de prueba" }));
    fireEvent.click(await screen.findByRole("button", { name: "Continuar al pago" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Escribe tu nombre.");
    expect(createPublicServiceReservationMock).not.toHaveBeenCalled();
  });

  it("creates the cart/order/payment flow without using the direct reservation endpoint", async () => {
    getPublicServiceBySlugMock.mockResolvedValue(service());
    getPublicServiceBookingMock.mockResolvedValue(bookingConfig);
    getPublicProductBySlugMock.mockResolvedValue({ id: "product-1" });
    createOrUpdatePublicCartMock.mockResolvedValue({ id: "cart-1", sessionToken: "cart-token" });
    submitPublicStoreCheckoutMock.mockResolvedValue({
      order: { id: "order-1", orderNumber: "ORD-1", amountDueNow: 169.95, balanceDue: 0, currency: "USD" },
      paymentRequired: true,
    });
    createPublicStorePaymentIntentMock.mockResolvedValue({
      id: "payment-1",
      provider: "stripe",
      status: "pending",
      providerPaymentId: "pi-1",
      clientSecret: "secret-1",
    });
    renderAt("/reservar/sesion-fotografia");
    await screen.findByTestId("booking-panel");
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar horario de prueba" }));
    fireEvent.change(await screen.findByLabelText("Nombre *"), { target: { value: "AIRA Booking Test" } });
    fireEvent.change(screen.getByLabelText("Correo electrónico *"), { target: { value: "aira-booking-test@example.com" } });
    fireEvent.change(screen.getByLabelText("Información adicional"), { target: { value: "BKG4 local runtime validation" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar al pago" }));

    await waitFor(() => expect(getPublicProductBySlugMock).toHaveBeenCalledWith("sesion-fotografia"));
    expect(createOrUpdatePublicCartMock).toHaveBeenCalledWith({
      items: [{ productId: "product-1", quantity: 1 }],
      replaceItems: true,
    });
    expect(submitPublicStoreCheckoutMock).toHaveBeenCalledWith(expect.objectContaining({
      name: "AIRA Booking Test",
      email: "aira-booking-test@example.com",
      booking_selection: expect.objectContaining({
        service_slug: "sesion-fotografia",
        starts_at: "2026-09-03T14:15:00+00:00",
        package_id: "package-1",
      }),
    }));
    expect(createPublicStorePaymentIntentMock).toHaveBeenCalledWith({ orderId: "order-1" });
    expect(createPublicServiceReservationMock).not.toHaveBeenCalled();
    expect(await screen.findByText("Pago requerido hoy")).toBeInTheDocument();
    expect(screen.getAllByText("$169.95")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Pagar $169.95" })).toBeEnabled();
    expect(screen.getByTestId("store-card-payment-form")).toBeInTheDocument();
  });

  it("shows the confirmed copy when the paid order reports a confirmed reservation", async () => {
    getPublicServiceBySlugMock.mockResolvedValue(service());
    getPublicServiceBookingMock.mockResolvedValue(bookingConfig);
    getPublicProductBySlugMock.mockResolvedValue({ id: "product-1" });
    createOrUpdatePublicCartMock.mockResolvedValue({ id: "cart-1", sessionToken: "cart-token" });
    submitPublicStoreCheckoutMock.mockResolvedValue({
      order: { id: "order-1", orderNumber: "ORD-1", amountDueNow: 169.95, balanceDue: 0, currency: "USD" },
      paymentRequired: true,
    });
    createPublicStorePaymentIntentMock.mockResolvedValue({
      id: "payment-1", provider: "stripe", status: "pending", providerPaymentId: "pi-1", clientSecret: "secret-1",
    });
    getPublicOrderByIdMock.mockResolvedValue({
      paymentStatus: "paid",
      bookingSummary: [{ status: "confirmed" }],
    });
    renderAt("/reservar/sesion-fotografia");
    await screen.findByTestId("booking-panel");
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar horario de prueba" }));
    fireEvent.change(await screen.findByLabelText("Nombre *"), { target: { value: "AIRA Booking Test" } });
    fireEvent.change(screen.getByLabelText("Correo electrónico *"), { target: { value: "aira-booking-test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar al pago" }));
    await screen.findByTestId("store-card-payment-form");
    fireEvent.click(screen.getByRole("button", { name: "Simular pago aprobado" }));

    expect(await screen.findByText("Reserva confirmada")).toBeInTheDocument();
    expect(getPublicOrderByIdMock).toHaveBeenCalledWith("order-1");
  });

  it("handles a missing store product without creating cart or order", async () => {
    getPublicServiceBySlugMock.mockResolvedValue(service());
    getPublicServiceBookingMock.mockResolvedValue(bookingConfig);
    getPublicProductBySlugMock.mockResolvedValue(null);
    renderAt("/reservar/sesion-fotografia");
    await screen.findByTestId("booking-panel");
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar horario de prueba" }));
    fireEvent.change(await screen.findByLabelText("Nombre *"), { target: { value: "AIRA Booking Test" } });
    fireEvent.change(screen.getByLabelText("Correo electrónico *"), { target: { value: "aira-booking-test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar al pago" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos registrar la solicitud. Inténtalo nuevamente.");
    expect(createOrUpdatePublicCartMock).not.toHaveBeenCalled();
    expect(submitPublicStoreCheckoutMock).not.toHaveBeenCalled();
    expect(createPublicStorePaymentIntentMock).not.toHaveBeenCalled();
  });
});
