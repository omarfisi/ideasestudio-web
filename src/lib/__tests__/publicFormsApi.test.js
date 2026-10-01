import { afterEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);
vi.stubEnv("VITE_JJ_PEGA_API_BASE", "http://127.0.0.1:8000");
vi.stubEnv("VITE_JJ_PEGA_WORKSPACE_ID", "0d8c04a8-6be2-4559-93de-0b2be2639f82");

const { isLocalHost, isPrivateLanHost, resolvePublicFormsApiBase, submitPublicForm } = await import("@/lib/publicFormsApi.js");

afterEach(() => {
  fetchMock.mockReset();
});

describe("publicFormsApi local backend selection", () => {
  it.each([
    ["localhost", "http://127.0.0.1:8000"],
    ["127.0.0.1", "http://127.0.0.1:8000"],
    ["::1", "http://127.0.0.1:8000"],
  ])("selects the local API for %s", (hostname, expectedBase) => {
    expect(isLocalHost(hostname)).toBe(true);
    expect(resolvePublicFormsApiBase({
      hostname,
      origin: "http://127.0.0.1:5196",
      crmBase: "http://127.0.0.1:8000",
      apiBase: "http://127.0.0.1:8000",
    })).toBe(expectedBase);
  });

  it("keeps the production API for a production hostname", () => {
    expect(isLocalHost("www.ideasestudio.com")).toBe(false);
    expect(resolvePublicFormsApiBase({
      hostname: "www.ideasestudio.com",
      origin: "https://www.ideasestudio.com",
      crmBase: "https://api.ideasestudio.com",
      apiBase: "https://api.ideasestudio.com",
    })).toBe("https://api.ideasestudio.com");
  });

  it("uses the Vite proxy for a private LAN hostname", () => {
    expect(isPrivateLanHost("192.168.68.63")).toBe(true);
    expect(resolvePublicFormsApiBase({
      hostname: "192.168.68.63",
      crmBase: "http://127.0.0.1:8000",
      apiBase: "http://127.0.0.1:8000",
    })).toBe("");
  });

  it("submits through the configured local CRM backend instead of the Vite production proxy", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, submission_id: "new-submission" }),
    });

    await submitPublicForm("aira-prechat", { full_name: "Synthetic User", email: "user@example.invalid" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toMatch(/^https?:\/\/127\.0\.0\.1:8000\/api\/public\/forms\/aira-prechat\/submit\?/);
    expect(url).toContain("workspace_id=0d8c04a8-6be2-4559-93de-0b2be2639f82");
  });

  it("never falls back to origin on a local host, even when origin is a real page URL", () => {
    // Vite's dev server proxies /api and /public straight to another server
    // (see vite.config.js) — resolving to `origin` here would silently route
    // the request through that proxy instead of failing closed. This is the
    // exact split that produced "Envío no encontrado.": a real browser tab
    // creating the submission remotely while /prechat (always an absolute
    // VITE_CRM_BASE_URL) verified it against the local database.
    expect(resolvePublicFormsApiBase({
      hostname: "127.0.0.1",
      origin: "http://127.0.0.1:5196",
      crmBase: "",
      apiBase: "",
    })).toBe("");
  });

  it("fails closed instead of silently falling back to production when local config is missing", async () => {
    expect(resolvePublicFormsApiBase({
      hostname: "127.0.0.1",
      origin: "http://127.0.0.1:5196",
      crmBase: "",
      apiBase: "",
    })).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
