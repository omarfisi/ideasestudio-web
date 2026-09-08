import { afterEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

async function loadLeadForms(crmBase) {
  vi.resetModules();
  vi.stubEnv("VITE_CRM_BASE_URL", crmBase);
  return import("@/lib/publicLeadForms.js");
}

function okResponse(data = { ok: true }) {
  return {
    ok: true,
    json: async () => data,
  };
}

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllEnvs();
});

describe("publicLeadForms CRM routing", () => {
  it("fails closed and never fetches when the CRM base is missing", async () => {
    const { submitLeadForm } = await loadLeadForms("");

    await expect(
      submitLeadForm({ full_name: "Synthetic User", email: "user@example.invalid" }),
    ).rejects.toThrow(/VITE_CRM_BASE_URL/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the explicitly configured local CRM base and preserves workspace and payload", async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ submission_id: "local-submission" }));
    const { submitLeadForm } = await loadLeadForms("http://127.0.0.1:8000/");

    const result = await submitLeadForm({
      full_name: " Synthetic User ",
      email: "USER@example.invalid ",
      source: "website_contact",
      meta: { test_case: "local-routing" },
    });

    expect(result).toEqual({ submission_id: "local-submission" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "http://127.0.0.1:8000/api/public/contact-submit?workspace_id=c7e594e2-5218-40fc-9e4b-e830a21d96b3",
    );
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toMatchObject({
      full_name: "Synthetic User",
      email: "user@example.invalid",
      source: "website_contact",
      meta: { test_case: "local-routing", submitted_from_frontend: true },
    });
  });

  it("uses an explicitly configured production base without a silent fallback", async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ submission_id: "production-configured" }));
    const { submitLeadForm } = await loadLeadForms("https://api.ideasestudio.com");

    await submitLeadForm({ full_name: "Configured User", email: "user@example.invalid" });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://api.ideasestudio.com/api/public/contact-submit?workspace_id=c7e594e2-5218-40fc-9e4b-e830a21d96b3",
    );
  });
});
