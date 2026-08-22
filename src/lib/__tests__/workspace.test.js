import { describe, it, expect, afterEach, vi } from "vitest";

// FASE 4A — el default correcto es el workspace activo "CRM", donde vive
// todo el catálogo comercial y el contenido público desde PR-5c/5d (ver
// WORKSPACE_CONFIGURATION_DECISION_REPORT). El workspace legacy "Ideas
// Estudio" quedó vacío tras esa migración -- caer ahí silenciosamente es
// justamente el bug que este archivo antes afirmaba como comportamiento
// correcto.
const CRM_WORKSPACE_ID = "c7e594e2-5218-40fc-9e4b-e830a21d96b3";
const LEGACY_IDEAS_ESTUDIO_WORKSPACE_ID = "cfdd0b5a-3468-4d5a-86da-50e1f4f324a6";

// workspace.js reads import.meta.env.VITE_PUBLIC_WORKSPACE_ID once at module
// load time, so each scenario needs a fresh module instance.
async function importWorkspaceModule() {
  vi.resetModules();
  return import("@/lib/workspace.js");
}

describe("workspace.js — public workspace fallback", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("respects VITE_PUBLIC_WORKSPACE_ID when it is configured", async () => {
    const configured = "11111111-1111-1111-1111-111111111111";
    vi.stubEnv("VITE_PUBLIC_WORKSPACE_ID", configured);
    const { PUBLIC_WORKSPACE_ID } = await importWorkspaceModule();
    expect(PUBLIC_WORKSPACE_ID).toBe(configured);
  });

  it("falls back to the active CRM workspace when VITE_PUBLIC_WORKSPACE_ID is empty/unset", async () => {
    // "" is the closest reliable stand-in for "not defined" in this test
    // environment (this repo's own .env/.env.local already define the var,
    // so only an explicit empty stub exercises the fallback branch) — falsy
    // either way, so the `||` in workspace.js takes the same path.
    vi.stubEnv("VITE_PUBLIC_WORKSPACE_ID", "");
    const { PUBLIC_WORKSPACE_ID } = await importWorkspaceModule();
    expect(PUBLIC_WORKSPACE_ID).toBe(CRM_WORKSPACE_ID);
  });

  it("never falls back to the legacy empty Ideas Estudio workspace", async () => {
    vi.stubEnv("VITE_PUBLIC_WORKSPACE_ID", "");
    const { PUBLIC_WORKSPACE_ID } = await importWorkspaceModule();
    expect(PUBLIC_WORKSPACE_ID).not.toBe(LEGACY_IDEAS_ESTUDIO_WORKSPACE_ID);
  });

  it("appendWorkspace() adds the CRM workspace_id with a leading ? when the URL has no query string", async () => {
    vi.stubEnv("VITE_PUBLIC_WORKSPACE_ID", "");
    const { appendWorkspace } = await importWorkspaceModule();
    expect(appendWorkspace("/api/public/forms/aira-prechat/submit")).toBe(
      `/api/public/forms/aira-prechat/submit?workspace_id=${CRM_WORKSPACE_ID}`
    );
  });

  it("appendWorkspace() adds workspace_id with & when the URL already has a query string", async () => {
    vi.stubEnv("VITE_PUBLIC_WORKSPACE_ID", "");
    const { appendWorkspace } = await importWorkspaceModule();
    expect(appendWorkspace("/api/blog/home?foo=bar")).toBe(
      `/api/blog/home?foo=bar&workspace_id=${CRM_WORKSPACE_ID}`
    );
  });
});
