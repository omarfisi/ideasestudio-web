import { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const signUpMock = vi.fn();

vi.mock("@/lib/supabaseClient.js", () => ({
  supabase: { auth: { signUp: (...args) => signUpMock(...args) } },
}));

const { default: MembershipSignupPanel } = await import(
  "@/components/memberships/MembershipSignupPanel.jsx"
);

// Rendered inside StrictMode deliberately — see MembershipLoginPanel.test.jsx
// for why: it's what actually catches the isMountedRef/StrictMode bug that
// caused the real "stuck forever" report, which a plain render() would miss.
function renderPanel() {
  return render(
    <StrictMode>
      <MembershipSignupPanel />
    </StrictMode>
  );
}

function fillForm({ email, password, confirmPassword }) {
  fireEvent.change(screen.getByPlaceholderText("tu@correo.com"), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText("Mínimo 8 caracteres"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByPlaceholderText("Repite la contraseña"), {
    target: { value: confirmPassword },
  });
}

beforeEach(() => {
  signUpMock.mockReset();
});

describe("MembershipSignupPanel — validation", () => {
  it("rejects mismatched passwords without calling Supabase", async () => {
    renderPanel();
    fillForm({ email: "cliente@example.com", password: "password123", confirmPassword: "different1" });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Las contraseñas no coinciden.");
    expect(signUpMock).not.toHaveBeenCalled();
  });
});

describe("MembershipSignupPanel — pending confirmation", () => {
  it("shows a 'check your email' message when signUp succeeds without a session", async () => {
    signUpMock.mockResolvedValue({ data: { user: { identities: [{ id: "1" }] }, session: null }, error: null });
    renderPanel();
    fillForm({ email: "cliente@example.com", password: "password123", confirmPassword: "password123" });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByText("Revisa tu correo para confirmar tu cuenta.")).toBeInTheDocument();
  });

  it("never renders the payment CTA while pending confirmation", async () => {
    signUpMock.mockResolvedValue({ data: { user: { identities: [{ id: "1" }] }, session: null }, error: null });
    renderPanel();
    fillForm({ email: "cliente@example.com", password: "password123", confirmPassword: "password123" });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await screen.findByText("Revisa tu correo para confirmar tu cuenta.");
    expect(screen.queryByRole("button", { name: "Continuar al pago seguro" })).not.toBeInTheDocument();
  });
});

describe("MembershipSignupPanel — Supabase's anti-enumeration empty-identities shape", () => {
  it("uses a neutral message instead of confidently asserting the account exists", async () => {
    signUpMock.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null });
    renderPanel();
    fillForm({ email: "cliente@example.com", password: "password123", confirmPassword: "password123" });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    const alert = await screen.findByRole("alert");
    // Neutral: true whether an account already existed or this really was
    // a fresh signup pending confirmation — Supabase can be configured to
    // hide which one it is, so this never claims certainty either way.
    expect(alert).not.toHaveTextContent(/^Ya existe una cuenta/);
    expect(alert).toHaveTextContent(/ya tienes una cuenta/i);
    expect(alert).toHaveTextContent(/revisa tu correo/i);
  });
});

describe("MembershipSignupPanel — timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a safe timeout message, re-enables the button, and allows retrying when signUp never resolves", async () => {
    signUpMock.mockImplementation(() => new Promise(() => {}));
    renderPanel();
    fillForm({ email: "cliente@example.com", password: "password123", confirmPassword: "password123" });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByRole("button", { name: "Creando cuenta…" })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "No pudimos comunicarnos con el servicio de acceso. Intenta nuevamente."
    );
    expect(alert).not.toHaveTextContent("AUTH_REQUEST_TIMEOUT");

    const retryButton = screen.getByRole("button", { name: "Crear cuenta" });
    expect(retryButton).not.toBeDisabled();

    signUpMock.mockResolvedValueOnce({ data: { user: { identities: [{ id: "1" }] }, session: null }, error: null });
    fireEvent.click(retryButton);
    expect(signUpMock).toHaveBeenCalledTimes(2);
  });
});

describe("MembershipSignupPanel — synchronous SDK failure", () => {
  it("shows a safe message and releases the button when signUp throws synchronously", async () => {
    signUpMock.mockImplementation(() => {
      throw new Error("sync failure");
    });
    renderPanel();
    fillForm({ email: "cliente@example.com", password: "password123", confirmPassword: "password123" });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent("sync failure");
    expect(screen.getByRole("button", { name: "Crear cuenta" })).not.toBeDisabled();
  });
});
