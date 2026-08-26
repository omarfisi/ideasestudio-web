import { describe, it, expect, vi, beforeEach } from "vitest";

const { requestPublicChatHuman, getPublicAvatarRuntime } = await import("@/services/publicChatApi.js");

function jsonResponse(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name] ?? null },
    json: async () => body,
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("requestPublicChatHuman", () => {
  // 1 — hace POST correcto (método + path)
  it("hace POST a /public/chat/request-human", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { ok: true, status: "waiting_agent" }));
    await requestPublicChatHuman("session-1");
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(String(url)).toMatch(/\/public\/chat\/request-human$/);
    expect(options.method).toBe("POST");
  });

  // 2 — body exacto: solo session_id, nunca conversation_id/workspace_id
  it("envía el body exacto {session_id} sin campos extra", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { ok: true, status: "waiting_agent" }));
    await requestPublicChatHuman("session-abc");
    const [, options] = fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ session_id: "session-abc" });
  });

  it("devuelve el body de la respuesta tal cual", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { ok: true, status: "human_active" }));
    const result = await requestPublicChatHuman("session-1");
    expect(result).toEqual({ ok: true, status: "human_active" });
  });

  // 3 — errores conservan status/Retry-After, mismo helper que el resto del archivo
  it("un 404 lanza un Error con status=404", async () => {
    fetch.mockResolvedValue(jsonResponse(404, { detail: "Sesión no encontrada. Inicia una nueva conversación." }));
    await expect(requestPublicChatHuman("session-1")).rejects.toMatchObject({ status: 404 });
  });

  it("un 409 lanza un Error con status=409 y el detail del backend", async () => {
    fetch.mockResolvedValue(jsonResponse(409, { detail: "Esta conversación ya no puede solicitar atención de una persona." }));
    await expect(requestPublicChatHuman("session-1")).rejects.toMatchObject({
      status: 409,
      message: "Esta conversación ya no puede solicitar atención de una persona.",
    });
  });

  it("un 429 expone status=429 y retryAfterSeconds desde el header Retry-After", async () => {
    fetch.mockResolvedValue(
      jsonResponse(429, { detail: "Demasiadas solicitudes. Intenta de nuevo más tarde." }, { "Retry-After": "12" })
    );
    await expect(requestPublicChatHuman("session-1")).rejects.toMatchObject({ status: 429, retryAfterSeconds: 12 });
  });

  it("un 503 lanza un Error con status=503", async () => {
    fetch.mockResolvedValue(jsonResponse(503, { detail: "El chat público no está disponible temporalmente." }));
    await expect(requestPublicChatHuman("session-1")).rejects.toMatchObject({ status: 503 });
  });
});

describe("getPublicAvatarRuntime", () => {
  it("hace GET público sin parámetros administrativos ni autenticación Supabase", async () => {
    fetch.mockResolvedValue(jsonResponse(200, {
      profile: "aira",
      variant: "default",
      default_pose: "neutral",
      poses: { neutral: { url: "https://cdn.example/neutral.png", expires_at: "future" } },
      rules: [],
    }));

    await getPublicAvatarRuntime();

    const [url, options] = fetch.mock.calls[0];
    expect(String(url)).toMatch(/\/public\/chat\/avatar$/);
    expect(options.method).toBe("GET");
    expect(options.body).toBeUndefined();
    expect(String(url)).not.toMatch(/workspace_id|profile_id|variant_id|version_id/);
    expect(options.headers).toEqual({ "Content-Type": "application/json" });
  });
});
