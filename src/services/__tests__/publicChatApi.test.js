import { describe, it, expect, vi, beforeEach } from "vitest";

const { requestPublicChatHuman, getPublicAvatarRuntime, sendPublicChatQuickReply, submitProjectDetails } = await import("@/services/publicChatApi.js");

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

describe("sendPublicChatQuickReply", () => {
  it("hace POST al endpoint público con el contrato exacto", async () => {
    fetch.mockResolvedValue(jsonResponse(200, {
      ok: true,
      response_text: "Respuesta",
      visitor_message: "Quiero cotizar.",
      next_questions: [],
      actions: [],
    }));

    const result = await sendPublicChatQuickReply("session-1", "reply-1", "client-1");
    const [url, options] = fetch.mock.calls[0];
    expect(String(url)).toMatch(/\/public\/chat\/quick-reply$/);
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      session_id: "session-1",
      quick_reply_id: "reply-1",
      client_message_id: "client-1",
    });
    expect(result.response_text).toBe("Respuesta");
  });

  it("conserva los errores HTTP del backend", async () => {
    fetch.mockResolvedValue(jsonResponse(409, { detail: "Conversación bajo control humano." }));
    await expect(sendPublicChatQuickReply("session-1", "reply-1", "client-1")).rejects.toMatchObject({ status: 409 });
  });
});

describe("submitProjectDetails", () => {
  it("hace POST al contrato público de project-details", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { ok: true, submission_id: "sub-1", response_text: "Recibido" }));
    const payload = {
      session_id: "session-1",
      full_name: "Ana Pérez",
      email: "ana@example.com",
      message: "Necesito una identidad visual.",
      consent: true,
      client_submission_id: "client-sub-1",
      phone: "7875550100",
    };
    await submitProjectDetails(payload);
    const [url, options] = fetch.mock.calls[0];
    expect(String(url)).toMatch(/\/public\/chat\/project-details$/);
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual(payload);
  });

  it("conserva 409 para que el widget pueda permitir retry con la misma identidad", async () => {
    fetch.mockResolvedValue(jsonResponse(409, { detail: "Procesando" }));
    await expect(submitProjectDetails({ session_id: "session-1" })).rejects.toMatchObject({ status: 409 });
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

describe("publicChatApi local backend base", () => {
  it("resolves every request against the configured local CRM backend, never the Vite dev proxy", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { ok: true, status: "waiting_agent" }));
    await requestPublicChatHuman("session-local-base-check");
    const [url] = fetch.mock.calls[0];
    // import.meta.env.VITE_CRM_BASE_URL in this test run comes from
    // .env.local (http://127.0.0.1:8000) — publicChatApi.js has no
    // relative-path fallback at all (getPublicChatBaseUrl() throws if the
    // env var is missing), so this must always be absolute and local here.
    expect(String(url)).toMatch(/^http:\/\/127\.0\.0\.1:8000\/public\/chat\//);
  });
});
