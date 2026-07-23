import { describe, it, expect, vi, beforeEach } from "vitest";

const getSessionMock = vi.fn();
const refreshSessionMock = vi.fn();

vi.mock("@/lib/supabaseClient.js", () => ({
  supabase: {
    auth: {
      getSession: (...args) => getSessionMock(...args),
      refreshSession: (...args) => refreshSessionMock(...args),
    },
  },
}));

const {
  authenticatedFetch,
  getCurrentAccessToken,
  buildAuthenticatedHeaders,
  dedupeByKey,
  resolveCustomerProfile,
  getCustomerProfile,
  updateCustomerProfile,
  getMyMembership,
  MissingSessionError,
  ApiRequestError,
} = await import("@/lib/authenticatedApi.js");

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  };
}

beforeEach(() => {
  getSessionMock.mockReset();
  refreshSessionMock.mockReset();
  vi.stubGlobal("fetch", vi.fn());
  getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-abc" } } });
});

describe("getCurrentAccessToken", () => {
  it("throws MissingSessionError when there is no session", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    await expect(getCurrentAccessToken()).rejects.toBeInstanceOf(MissingSessionError);
  });

  it("returns the access token when a session exists", async () => {
    await expect(getCurrentAccessToken()).resolves.toBe("token-abc");
  });
});

describe("buildAuthenticatedHeaders", () => {
  it("returns an Authorization Bearer header plus Content-Type", () => {
    const headers = buildAuthenticatedHeaders("token-abc");
    expect(headers.Authorization).toBe("Bearer token-abc");
    expect(headers["Content-Type"]).toBe("application/json");
  });
});

describe("authenticatedFetch", () => {
  it("throws auth_required-equivalent MissingSessionError and never calls fetch without a session", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    await expect(authenticatedFetch("/public/customer-profile/me")).rejects.toBeInstanceOf(MissingSessionError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("adds Authorization: Bearer <token> to every request", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { ok: true }));
    await authenticatedFetch("/public/customer-profile/me");
    const [, options] = fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer token-abc");
  });

  it("never logs the access token", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetch.mockResolvedValue(jsonResponse(200, { ok: true }));
    await authenticatedFetch("/public/customer-profile/me");
    const allLogged = [...consoleSpy.mock.calls, ...errorSpy.mock.calls].flat().join(" ");
    expect(allLogged).not.toContain("token-abc");
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("keeps Content-Type: application/json by default", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { ok: true }));
    await authenticatedFetch("/public/customer-profile/me");
    const [, options] = fetch.mock.calls[0];
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("GET with retryOn401 retries exactly once after refreshSession on a 401", async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse(401, { detail: "auth_required" }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true, name: "Ana" }));
    refreshSessionMock.mockResolvedValue({ data: { session: { access_token: "token-refreshed" } } });

    const result = await authenticatedFetch("/public/customer-profile/me", { retryOn401: true });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe("Bearer token-refreshed");
    expect(result).toEqual({ ok: true, name: "Ana" });
  });

  it("POST (checkout-style) never retries automatically on 401 even with a real session available", async () => {
    fetch.mockResolvedValue(jsonResponse(401, { detail: "auth_required" }));
    await expect(
      authenticatedFetch("/membership-subscriptions/checkout-session", { method: "POST" })
    ).rejects.toMatchObject({ code: "auth_required" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(refreshSessionMock).not.toHaveBeenCalled();
  });

  it("normalizes a raw HTML error response into a safe, non-crashing error", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => "<html><body>Bad Gateway</body></html>",
    });
    await expect(authenticatedFetch("/public/customer-profile/me")).rejects.toMatchObject({
      code: "http_502",
    });
  });

  it("normalizes a 401 response into ApiRequestError with the backend's own code", async () => {
    fetch.mockResolvedValue(jsonResponse(401, { detail: "auth_required" }));
    await expect(authenticatedFetch("/public/customer-profile/me")).rejects.toMatchObject({
      code: "auth_required",
      status: 401,
    });
  });

  it("normalizes a 409 response into ApiRequestError with the backend's own code", async () => {
    fetch.mockResolvedValue(jsonResponse(409, { detail: "customer_contact_conflict" }));
    await expect(authenticatedFetch("/public/customer-profile/resolve", { method: "POST" })).rejects.toMatchObject({
      code: "customer_contact_conflict",
      status: 409,
    });
  });

  it("normalizes a 422 response into ApiRequestError with the backend's own code", async () => {
    fetch.mockResolvedValue(jsonResponse(422, { detail: "customer_email_mismatch" }));
    await expect(authenticatedFetch("/membership-subscriptions/checkout-session", { method: "POST" })).rejects.toMatchObject({
      code: "customer_email_mismatch",
      status: 422,
    });
  });

  it("returns an ApiRequestError instance (not a bare object) callers can instanceof-check", async () => {
    fetch.mockResolvedValue(jsonResponse(404, { detail: "customer_profile_not_found" }));
    try {
      await authenticatedFetch("/public/customer-profile/me");
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRequestError);
    }
  });
});

describe("dedupeByKey", () => {
  it("shares the same in-flight promise for the same key instead of calling the factory twice", async () => {
    const factory = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve("done"), 10)));
    const [a, b] = await Promise.all([
      dedupeByKey("key-1", factory),
      dedupeByKey("key-1", factory),
    ]);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(a).toBe("done");
    expect(b).toBe("done");
  });

  it("starts a new request once the previous one for that key has settled", async () => {
    const factory = vi.fn().mockResolvedValue("done");
    await dedupeByKey("key-2", factory);
    await dedupeByKey("key-2", factory);
    expect(factory).toHaveBeenCalledTimes(2);
  });
});

describe("resolveCustomerProfile", () => {
  it("sends only name/phone in the body, never email or any id", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { ok: true }));
    await resolveCustomerProfile({ name: "Ana Pérez", phone: "7875551234" });
    const [, options] = fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body).toEqual({ name: "Ana Pérez", phone: "7875551234" });
  });

  it("sends an empty body when neither name nor phone is given", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { ok: true }));
    await resolveCustomerProfile();
    const [, options] = fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({});
  });

  it("never sends email, contact_id, workspace_id, user_id or auth_user_id", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { ok: true }));
    await resolveCustomerProfile({ name: "Ana" });
    const [, options] = fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    for (const forbidden of ["email", "contact_id", "workspace_id", "user_id", "auth_user_id"]) {
      expect(body).not.toHaveProperty(forbidden);
    }
  });

  it("calls POST /public/customer-profile/resolve with Authorization", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { ok: true }));
    await resolveCustomerProfile();
    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain("/public/customer-profile/resolve");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer token-abc");
  });
});

describe("getCustomerProfile", () => {
  it("calls GET /public/customer-profile/me with Authorization", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { ok: true, name: "Ana", email: "ana@example.com", phone: null }));
    const result = await getCustomerProfile();
    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain("/public/customer-profile/me");
    expect(options.headers.Authorization).toBe("Bearer token-abc");
    expect(result.email).toBe("ana@example.com");
  });
});

describe("updateCustomerProfile", () => {
  it("PATCHes only the permitted fields (name/phone)", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { ok: true }));
    await updateCustomerProfile({ name: "Ana", phone: "7875551234" });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain("/public/customer-profile/me");
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body)).toEqual({ name: "Ana", phone: "7875551234" });
  });
});

describe("getMyMembership", () => {
  it("calls GET /public/my-membership with Authorization", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { ok: true, membership: null }));
    await getMyMembership();
    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain("/public/my-membership");
    expect(options.headers.Authorization).toBe("Bearer token-abc");
  });
});
