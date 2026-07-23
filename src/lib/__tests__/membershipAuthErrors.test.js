import { describe, it, expect } from "vitest";
import { translateSupabaseAuthError } from "@/lib/membershipAuthErrors.js";

describe("translateSupabaseAuthError", () => {
  it("maps invalid credentials to a friendly message", () => {
    expect(translateSupabaseAuthError({ message: "Invalid login credentials" })).toBe(
      "Credenciales inválidas."
    );
  });

  it("maps an already-registered account to a friendly message", () => {
    expect(translateSupabaseAuthError({ message: "User already registered" })).toBe(
      "Ya existe una cuenta con este correo."
    );
  });

  it("maps rate limiting to a friendly message", () => {
    expect(translateSupabaseAuthError({ message: "Email rate limit exceeded" })).toBe(
      "Se realizaron demasiados intentos. Intenta más tarde."
    );
  });

  it("never leaks a raw/unrecognized Supabase message", () => {
    const raw = "relation \"auth.users\" violates row-level security policy xyz123";
    const result = translateSupabaseAuthError({ message: raw });
    expect(result).not.toContain("row-level security");
    expect(result).not.toContain("auth.users");
    expect(result).toBe("No pudimos completar la solicitud. Intenta nuevamente.");
  });

  it("handles a missing/undefined error without throwing", () => {
    expect(translateSupabaseAuthError(undefined)).toBe(
      "No pudimos completar la solicitud. Intenta nuevamente."
    );
  });
});
