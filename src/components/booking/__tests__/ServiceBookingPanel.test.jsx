import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/publicServicesApi.js", () => ({
  getPublicServiceBooking: vi.fn(),
  getPublicServiceAvailability: vi.fn(),
  getPublicServiceAvailabilityAuthoritative: vi.fn(),
}));
vi.mock("@/lib/api.js", () => ({ resolveProductSlugById: vi.fn() }));

const { default: ServiceBookingPanel } = await import("@/components/booking/ServiceBookingPanel.jsx");
const { getPublicServiceBooking } = await import("@/lib/publicServicesApi.js");

const BOOKING = {
  service: { base_price: 100 },
  booking_settings: { requires_calendar: false, base_duration_minutes: 60 },
  packages: [
    { id: "basic", name: "Básico", price: 100, is_default: true },
    { id: "pro", name: "Pro", price: 180 },
  ],
  addons: [{ id: "rush", name: "Entrega rápida", price: 25, min_quantity: 0, max_quantity: 1 }],
};

describe("ServiceBookingPanel reusable boundary", () => {
  beforeEach(() => vi.resetAllMocks());

  it("does not require cart.items or sessionToken and reports loading", () => {
    getPublicServiceBooking.mockReturnValue(new Promise(() => {}));
    render(<ServiceBookingPanel slug="branding" serviceName="Branding" section="customize" onSelectionChange={vi.fn()} />);
    expect(screen.getByText("Cargando disponibilidad para Branding...")).toBeInTheDocument();
  });

  it("renders packages and add-ons from booking configuration", async () => {
    getPublicServiceBooking.mockResolvedValue(BOOKING);
    render(<ServiceBookingPanel slug="branding" serviceName="Branding" section="customize" onSelectionChange={vi.fn()} />);
    expect(await screen.findByText("Básico")).toBeInTheDocument();
    expect(screen.getByText("Entrega rápida")).toBeInTheDocument();
  });

  it("reports an unavailable booking without throwing", async () => {
    getPublicServiceBooking.mockRejectedValue(new Error("unavailable"));
    const onStatusChange = vi.fn();
    const { container } = render(<ServiceBookingPanel slug="branding" serviceName="Branding" section="customize" onSelectionChange={vi.fn()} onStatusChange={onStatusChange} />);
    await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith("branding", expect.objectContaining({ resolved: true })));
    expect(container).toBeTruthy();
  });
});
