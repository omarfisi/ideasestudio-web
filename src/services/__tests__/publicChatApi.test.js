import { describe, it, expect, vi, beforeEach } from "vitest";

const { requestPublicChatHuman, getPublicAvatarRuntime, sendPublicChatQuickReply, submitPublicProjectDetails } = await import("@/services/publicChatApi.js");

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
  it("envía solo la sesión, la opción y el idempotency id", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { ok: true, response_text: "Respuesta", next_questions: [] }));
    await sendPublicChatQuickReply("session-1", "reply-1", "message-1");
    const [url, options] = fetch.mock.calls[0];
    expect(String(url)).toMatch(/\/public\/chat\/quick-reply$/);
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      session_id: "session-1",
      quick_reply_id: "reply-1",
      client_message_id: "message-1",
    });
  });
});

describe("submitPublicProjectDetails", () => {
  it("envía el formulario dentro de la sesión pública", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { ok: true, submission_id: "submission-1" }));
    await submitPublicProjectDetails({
      profile: { full_name: "Ana Pérez", email: "ana@example.com", phone: "" },
      sessionId: "session-1",
      serviceInterest: "Diseño web y presencia digital",
      projectTiming: "Este mes",
      preferredContact: "Correo electrónico",
      message: "Necesito una página web para mi negocio.",
      additionalInfo: "Ya tengo el contenido preparado.",
    });
    const [url, options] = fetch.mock.calls[0];
    expect(String(url)).toMatch(/^http:\/\/127\.0\.0\.1:8000\/public\/chat\/project-details$/);
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toMatchObject({
      session_id: "session-1",
      full_name: "Ana Pérez",
      email: "ana@example.com",
      phone: null,
      service_interest: "Diseño web y presencia digital",
      message: "Necesito una página web para mi negocio.",
      project_timing: "Este mes",
      preferred_contact: "Correo electrónico",
      additional_info: "Ya tengo el contenido preparado.",
      consent: true,
    });
    expect(JSON.parse(options.body).client_submission_id).toMatch(/^[0-9a-f-]{36}$/i);
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

  it("envía la key pública seleccionada sin exponer identificadores internos", async () => {
    fetch.mockResolvedValue(jsonResponse(200, { profile: "ivox", variant: "default", poses: {}, rules: [] }));

    await getPublicAvatarRuntime({ chatbotKey: "ivox-webchat-public" });

    const [url, options] = fetch.mock.calls[0];
    expect(String(url)).toMatch(/\/public\/chat\/avatar\?chatbot_key=ivox-webchat-public$/);
    expect(options.method).toBe("GET");
    expect(String(url)).not.toMatch(/workspace_id|profile_id|variant_id|version_id/);
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
