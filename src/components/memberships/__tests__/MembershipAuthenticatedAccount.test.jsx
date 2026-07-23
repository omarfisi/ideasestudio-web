import { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const signOutMock = vi.fn();

vi.mock("@/lib/supabaseClient.js", () => ({
  supabase: { auth: { signOut: (...args) => signOutMock(...args) } },
}));

const { default: MembershipAuthenticatedAccount } = await import(
  "@/components/memberships/MembershipAuthenticatedAccount.jsx"
);

// Rendered inside StrictMode deliberately — see MembershipLoginPanel.test.jsx
// for why: it's what actually catches the isMountedRef/StrictMode bug that
// caused the real "stuck forever" report, which a plain render() would miss.
function renderAccount(email) {
  return render(
    <StrictMode>
      <MembershipAuthenticatedAccount email={email} />
    </StrictMode>
  );
}

beforeEach(() => {
  signOutMock.mockReset();
  signOutMock.mockResolvedValue({ error: null });
});

describe("MembershipAuthenticatedAccount", () => {
  it("shows the session email", () => {
    renderAccount("cliente@example.com");
    expect(screen.getByText("cliente@example.com")).toBeInTheDocument();
  });

  it("calls supabase.auth.signOut when 'Usar otra cuenta' is clicked", async () => {
    renderAccount("cliente@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Usar otra cuenta" }));
    await waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(1));
  });

  it("shows a readable error and never claims the switch happened when signOut fails", async () => {
    signOutMock.mockResolvedValue({ error: { message: "network error" } });
    renderAccount("cliente@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Usar otra cuenta" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No pudimos completar la solicitud. Intenta nuevamente.");
    // Still showing the same account — nothing here can flip the session
    // on its own if signOut itself failed.
    expect(screen.getByText("cliente@example.com")).toBeInTheDocument();
  });
});

describe("MembershipAuthenticatedAccount — timeout", () => {
  const STORAGE_KEY = "ideas_membership_checkout_selection_v1";

  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ membershipPlanId: "plan-1", serviceId: "svc-1" }));
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it("shows a safe timeout message, re-enables 'Usar otra cuenta', and never clears the stored plan selection", async () => {
    signOutMock.mockImplementation(() => new Promise(() => {}));
    renderAccount("cliente@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Usar otra cuenta" }));

    expect(screen.getByRole("button", { name: "Cerrando sesión…" })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "No pudimos comunicarnos con el servicio de acceso. Intenta nuevamente."
    );

    expect(screen.getByRole("button", { name: "Usar otra cuenta" })).not.toBeDisabled();
    expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });
});

describe("MembershipAuthenticatedAccount — synchronous SDK failure", () => {
  it("shows a safe message and releases the button when signOut throws synchronously", async () => {
    signOutMock.mockImplementation(() => {
      throw new Error("sync failure");
    });
    renderAccount("cliente@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Usar otra cuenta" }));

    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent("sync failure");
    expect(screen.getByRole("button", { name: "Usar otra cuenta" })).not.toBeDisabled();
  });
});
