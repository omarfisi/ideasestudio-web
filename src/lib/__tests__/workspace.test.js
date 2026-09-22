import { describe, it, expect, afterEach, vi } from "vitest";

const JJ_PEGA_WORKSPACE_ID = "0d8c04a8-6be2-4559-93de-0b2be2639f82";

// workspace.js reads import.meta.env.VITE_JJ_PEGA_WORKSPACE_ID once at module
// load time, so each scenario needs a fresh module instance.
async function importWorkspaceModule() {
  vi.resetModules();
  return import("@/lib/workspace.js");
}

describe("workspace.js — JJ Pega workspace isolation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("respects VITE_JJ_PEGA_WORKSPACE_ID when it is configured", async () => {
    const configured = "11111111-1111-1111-1111-111111111111";
    vi.stubEnv("VITE_JJ_PEGA_WORKSPACE_ID", configured);
    const { PUBLIC_WORKSPACE_ID } = await importWorkspaceModule();
    expect(PUBLIC_WORKSPACE_ID).toBe(configured);
  });

  it("fails closed when VITE_JJ_PEGA_WORKSPACE_ID is empty/unset", async () => {
    vi.stubEnv("VITE_JJ_PEGA_WORKSPACE_ID", "");
    const { PUBLIC_WORKSPACE_ID } = await importWorkspaceModule();
    expect(PUBLIC_WORKSPACE_ID).toBe("");
  });

  it("appendWorkspace() adds the JJ Pega workspace_id with a leading ?", async () => {
    vi.stubEnv("VITE_JJ_PEGA_WORKSPACE_ID", JJ_PEGA_WORKSPACE_ID);
    const { appendWorkspace } = await importWorkspaceModule();
    expect(appendWorkspace("/api/public/forms/aira-prechat/submit")).toBe(
      `/api/public/forms/aira-prechat/submit?workspace_id=${JJ_PEGA_WORKSPACE_ID}`
    );
  });

  it("appendWorkspace() adds workspace_id with & when the URL already has a query string", async () => {
    vi.stubEnv("VITE_JJ_PEGA_WORKSPACE_ID", JJ_PEGA_WORKSPACE_ID);
    const { appendWorkspace } = await importWorkspaceModule();
    expect(appendWorkspace("/api/blog/home?foo=bar")).toBe(
      `/api/blog/home?foo=bar&workspace_id=${JJ_PEGA_WORKSPACE_ID}`
    );
  });
});
