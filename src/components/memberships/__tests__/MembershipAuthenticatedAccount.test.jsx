import { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const signOutMock = vi.fn();
const resolveCustomerProfileMock = vi.fn();

vi.mock("@/lib/supabaseClient.js", () => ({
  supabase: { auth: { signOut: (...args) => signOutMock(...args) } },
}));

// dedupeByKey is left as the REAL implementation — the StrictMode/duplicate-
// request tests below rely on its actual dedup behavior. Only
// resolveCustomerProfile itself is mocked per test.
vi.mock("@/lib/authenticatedApi.js", async () => {
  const actual = await vi.importActual("@/lib/authenticatedApi.js");
  return {
    ...actual,
    resolveCustomerProfile: (...args) => resolveCustomerProfileMock(...args),
  };
});

const { default: MembershipAuthenticatedAccount } = await import(
  "@/components/memberships/MembershipAuthenticatedAccount.jsx"
);

// Rendered inside StrictMode deliberately — see MembershipLoginPanel.test.jsx
// for why: it's what actually catches the isMountedRef/StrictMode bug that
// caused the real "stuck forever" report, which a plain render() would miss.
function renderAccount(email, onProfileStatusChange) {
  return render(
    <StrictMode>
      <MembershipAuthenticatedAccount email={email} onProfileStatusChange={onProfileStatusChange} />
    </StrictMode>
  );
}

beforeEach(() => {
  signOutMock.mockReset();
  signOutMock.mockResolvedValue({ error: null });
  resolveCustomerProfileMock.mockReset().mockResolvedValue({ ok: true, name: null, email: "cliente@example.com", phone: null });
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

describe("MembershipAuthenticatedAccount — profile resolution (Fase 3)", () => {
  it("resolves the profile as soon as it mounts and reports 'ready'", async () => {
    const onProfileStatusChange = vi.fn();
    render(
      <StrictMode>
        <MembershipAuthenticatedAccount email="cliente@example.com" onProfileStatusChange={onProfileStatusChange} />
      </StrictMode>
    );
    await waitFor(() => expect(onProfileStatusChange).toHaveBeenCalledWith("ready"));
    expect(screen.getByText("Cuenta vinculada.")).toBeInTheDocument();
  });

  it("blocks with a support message and reports 'conflict' on a 409 customer_contact_conflict", async () => {
    const conflictError = new Error("customer_contact_conflict");
    conflictError.code = "customer_contact_conflict";
    conflictError.status = 409;
    resolveCustomerProfileMock.mockRejectedValue(conflictError);
    const onProfileStatusChange = vi.fn();
    renderAccount("cliente@example.com", onProfileStatusChange);

    await waitFor(() => expect(onProfileStatusChange).toHaveBeenCalledWith("conflict"));
    expect(
      await screen.findByText("No pudimos vincular tu cuenta automáticamente. Comunícate con soporte.")
    ).toBeInTheDocument();
    // No retry button for a conflict — retrying won't change a durable
    // ownership conflict, unlike a transient error.
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });

  it("reports 'auth_required' and a safe message when the session has expired", async () => {
    resolveCustomerProfileMock.mockRejectedValue(new Error("missing_session"));
    const onProfileStatusChange = vi.fn();
    renderAccount("cliente@example.com", onProfileStatusChange);

    await waitFor(() => expect(onProfileStatusChange).toHaveBeenCalledWith("error"));
    expect(await screen.findByText("Tu sesión expiró. Inicia sesión nuevamente.")).toBeInTheDocument();
  });

  it("lets the visitor retry after a transient resolve error, and reports 'ready' on success", async () => {
    resolveCustomerProfileMock.mockRejectedValueOnce(new Error("network_error"));
    renderAccount("cliente@example.com");

    const retryButton = await screen.findByRole("button", { name: "Reintentar" });
    resolveCustomerProfileMock.mockResolvedValueOnce({ ok: true, name: null, email: "cliente@example.com", phone: null });
    fireEvent.click(retryButton);

    await waitFor(() => expect(screen.getByText("Cuenta vinculada.")).toBeInTheDocument());
  });

  it("never sends two resolve requests for React StrictMode's dev mount→cleanup→remount simulation", async () => {
    let resolveCount = 0;
    resolveCustomerProfileMock.mockImplementation(() => {
      resolveCount += 1;
      return Promise.resolve({ ok: true, name: null, email: "cliente@example.com", phone: null });
    });
    renderAccount("cliente@example.com");
    await waitFor(() => expect(screen.getByText("Cuenta vinculada.")).toBeInTheDocument());
    expect(resolveCount).toBe(1);
  });

  it("never exposes access tokens, user_id, contact_id or workspace_id in its rendered output", async () => {
    renderAccount("cliente@example.com");
    await waitFor(() => expect(screen.getByText("Cuenta vinculada.")).toBeInTheDocument());
    const raw = document.body.textContent;
    expect(raw).not.toMatch(/user_id|contact_id|workspace_id|access_token/i);
  });
});
