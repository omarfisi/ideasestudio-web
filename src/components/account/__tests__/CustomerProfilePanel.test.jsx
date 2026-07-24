import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const getCustomerProfileMock = vi.fn();
const updateCustomerProfileMock = vi.fn();

vi.mock("@/lib/authenticatedApi.js", async () => {
  const actual = await vi.importActual("@/lib/authenticatedApi.js");
  return {
    ...actual,
    getCustomerProfile: (...args) => getCustomerProfileMock(...args),
    updateCustomerProfile: (...args) => updateCustomerProfileMock(...args),
  };
});

const { default: CustomerProfilePanel } = await import("@/components/account/CustomerProfilePanel.jsx");

function renderPanel(email = "cliente@example.com") {
  return render(<CustomerProfilePanel userId="user-1" email={email} />);
}

beforeEach(() => {
  getCustomerProfileMock.mockReset();
  updateCustomerProfileMock.mockReset();
  getCustomerProfileMock.mockResolvedValue({ ok: true, name: "Ana Pérez", email: "cliente@example.com", phone: "7875551234" });
});

describe("CustomerProfilePanel", () => {
  it("shows the email as non-editable", async () => {
    renderPanel();
    const emailInput = await screen.findByDisplayValue("cliente@example.com");
    expect(emailInput).toBeDisabled();
  });

  it("shows name and phone as editable", async () => {
    renderPanel();
    const nameInput = await screen.findByDisplayValue("Ana Pérez");
    const phoneInput = await screen.findByDisplayValue("7875551234");
    expect(nameInput).not.toBeDisabled();
    expect(phoneInput).not.toBeDisabled();
  });

  it("disables save when nothing changed", async () => {
    renderPanel();
    await screen.findByDisplayValue("Ana Pérez");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  it("blocks a name over 200 characters", async () => {
    renderPanel();
    const nameInput = await screen.findByDisplayValue("Ana Pérez");
    fireEvent.change(nameInput, { target: { value: "a".repeat(201) } });
    expect(screen.getByText("El nombre no puede superar los 200 caracteres.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  it("blocks a phone over 50 characters", async () => {
    renderPanel();
    const phoneInput = await screen.findByDisplayValue("7875551234");
    fireEvent.change(phoneInput, { target: { value: "1".repeat(51) } });
    expect(screen.getByText("El teléfono no puede superar los 50 caracteres.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  it("never sends an empty PATCH — an unchanged field is simply omitted", async () => {
    updateCustomerProfileMock.mockResolvedValue({ ok: true, name: "Ana García", email: "cliente@example.com", phone: "7875551234" });
    renderPanel();
    const nameInput = await screen.findByDisplayValue("Ana Pérez");
    fireEvent.change(nameInput, { target: { value: "Ana García" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(updateCustomerProfileMock).toHaveBeenCalledWith({ name: "Ana García" }));
  });

  it("saves successfully and shows a confirmation", async () => {
    updateCustomerProfileMock.mockResolvedValue({ ok: true, name: "Ana García", email: "cliente@example.com", phone: "7875551234" });
    renderPanel();
    const nameInput = await screen.findByDisplayValue("Ana Pérez");
    fireEvent.change(nameInput, { target: { value: "Ana García" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText("Perfil actualizado.")).toBeInTheDocument();
  });

  it("shows a safe error message when saving fails", async () => {
    const error = new Error("customer_profile_not_found");
    error.code = "customer_profile_not_found";
    error.status = 404;
    updateCustomerProfileMock.mockRejectedValue(error);
    renderPanel();
    const nameInput = await screen.findByDisplayValue("Ana Pérez");
    fireEvent.change(nameInput, { target: { value: "Ana García" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText("No pudimos encontrar tu perfil.")).toBeInTheDocument();
  });
});
