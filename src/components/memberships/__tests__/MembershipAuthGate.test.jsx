import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/supabaseClient.js", () => ({
  supabase: { auth: { signInWithPassword: vi.fn(), signInWithOtp: vi.fn(), signUp: vi.fn() } },
}));

const { default: MembershipAuthGate } = await import(
  "@/components/memberships/MembershipAuthGate.jsx"
);

function renderGate() {
  return render(
    <MemoryRouter>
      <MembershipAuthGate />
    </MemoryRouter>
  );
}

describe("MembershipAuthGate — accessible tabs", () => {
  it("exposes the W3C tabs pattern: tablist/tab/tabpanel with aria-selected and roving tabindex", () => {
    renderGate();
    const loginTab = screen.getByRole("tab", { name: "Iniciar sesión" });
    const signupTab = screen.getByRole("tab", { name: "Crear cuenta" });

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(loginTab).toHaveAttribute("aria-selected", "true");
    expect(signupTab).toHaveAttribute("aria-selected", "false");
    expect(loginTab).toHaveAttribute("tabindex", "0");
    expect(signupTab).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("moves selection and focus with ArrowRight/ArrowLeft", () => {
    renderGate();
    const loginTab = screen.getByRole("tab", { name: "Iniciar sesión" });
    const signupTab = screen.getByRole("tab", { name: "Crear cuenta" });

    fireEvent.keyDown(loginTab, { key: "ArrowRight" });
    expect(signupTab).toHaveAttribute("aria-selected", "true");
    expect(signupTab).toHaveFocus();
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeInTheDocument();

    fireEvent.keyDown(signupTab, { key: "ArrowLeft" });
    expect(loginTab).toHaveAttribute("aria-selected", "true");
    expect(loginTab).toHaveFocus();
  });

  it("wraps around with ArrowRight from the last tab and ArrowLeft from the first", () => {
    renderGate();
    const loginTab = screen.getByRole("tab", { name: "Iniciar sesión" });
    const signupTab = screen.getByRole("tab", { name: "Crear cuenta" });

    fireEvent.keyDown(loginTab, { key: "ArrowLeft" });
    expect(signupTab).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(signupTab, { key: "ArrowRight" });
    expect(loginTab).toHaveAttribute("aria-selected", "true");
  });

  it("jumps to the first/last tab with Home/End", () => {
    renderGate();
    const loginTab = screen.getByRole("tab", { name: "Iniciar sesión" });
    const signupTab = screen.getByRole("tab", { name: "Crear cuenta" });

    fireEvent.keyDown(loginTab, { key: "End" });
    expect(signupTab).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(signupTab, { key: "Home" });
    expect(loginTab).toHaveAttribute("aria-selected", "true");
  });
});
