import { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const signInWithPasswordMock = vi.fn();
const signInWithOtpMock = vi.fn();

vi.mock("@/lib/supabaseClient.js", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args) => signInWithPasswordMock(...args),
      signInWithOtp: (...args) => signInWithOtpMock(...args),
    },
  },
}));

const { default: MembershipLoginPanel } = await import(
  "@/components/memberships/MembershipLoginPanel.jsx"
);

// Rendered inside StrictMode deliberately: this is what caught the real
// bug behind the "stuck forever" report — StrictMode's dev-only mount→
// cleanup→remount simulation left isMountedRef.current stuck at `false`
// under the old effect, which silently blocked every setStatus() call
// after an await. A render() without StrictMode would never have caught
// that; the app itself renders through <React.StrictMode> in main.jsx.
function renderPanel() {
  return render(
    <StrictMode>
      <MemoryRouter>
        <MembershipLoginPanel />
      </MemoryRouter>
    </StrictMode>
  );
}

beforeEach(() => {
  signInWithPasswordMock.mockReset();
  signInWithOtpMock.mockReset();
});

describe("MembershipLoginPanel — password login error", () => {
  it("shows a readable message and never the raw Supabase error", async () => {
    signInWithPasswordMock.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    renderPanel();

    fireEvent.change(screen.getByPlaceholderText("tu@correo.com"), {
      target: { value: "cliente@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Credenciales inválidas.");
    expect(alert).not.toHaveTextContent("Invalid login credentials");
  });
});

describe("MembershipLoginPanel — magic link", () => {
  it("shows a confirmation message after the link is sent", async () => {
    signInWithOtpMock.mockResolvedValue({ error: null });
    renderPanel();

    fireEvent.change(screen.getByPlaceholderText("tu@correo.com"), {
      target: { value: "cliente@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar enlace mágico" }));

    await waitFor(() =>
      expect(signInWithOtpMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "cliente@example.com",
          options: expect.objectContaining({
            emailRedirectTo: expect.stringContaining("/membresias/checkout"),
          }),
        })
      )
    );
    expect(await screen.findByText(/revisa tu correo/i)).toBeInTheDocument();
  });
});

describe("MembershipLoginPanel — password login timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a safe timeout message, re-enables the button, and allows a second attempt when signInWithPassword never resolves", async () => {
    signInWithPasswordMock.mockImplementation(() => new Promise(() => {}));
    renderPanel();

    fireEvent.change(screen.getByPlaceholderText("tu@correo.com"), {
      target: { value: "cliente@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "whatever" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(screen.getByRole("button", { name: "Iniciando sesión…" })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "No pudimos comunicarnos con el servicio de acceso. Intenta nuevamente."
    );
    expect(alert).not.toHaveTextContent("AUTH_REQUEST_TIMEOUT");

    const retryButton = screen.getByRole("button", { name: "Iniciar sesión" });
    expect(retryButton).not.toBeDisabled();

    // submittingRef must have been released — a second attempt calls Supabase again.
    signInWithPasswordMock.mockResolvedValueOnce({ error: null });
    fireEvent.click(retryButton);
    expect(signInWithPasswordMock).toHaveBeenCalledTimes(2);
  });
});

describe("MembershipLoginPanel — magic link timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a safe timeout message and re-enables the magic link button when signInWithOtp never resolves", async () => {
    signInWithOtpMock.mockImplementation(() => new Promise(() => {}));
    renderPanel();

    fireEvent.change(screen.getByPlaceholderText("tu@correo.com"), {
      target: { value: "cliente@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar enlace mágico" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "No pudimos comunicarnos con el servicio de acceso. Intenta nuevamente."
    );
    expect(screen.getByRole("button", { name: "Enviar enlace mágico" })).not.toBeDisabled();
  });
});

describe("MembershipLoginPanel — synchronous SDK failure", () => {
  it("shows a safe message and releases the button when signInWithPassword throws synchronously", async () => {
    signInWithPasswordMock.mockImplementation(() => {
      throw new Error("sync failure");
    });
    renderPanel();

    fireEvent.change(screen.getByPlaceholderText("tu@correo.com"), {
      target: { value: "cliente@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "whatever" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent("sync failure");
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).not.toBeDisabled();
  });
});
