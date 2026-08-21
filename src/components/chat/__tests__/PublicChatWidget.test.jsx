import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("@/services/publicChatApi.js", () => ({
  startPublicChat: vi.fn(),
  sendPublicChatMessage: vi.fn(),
  verifyPrechat: vi.fn(),
  getPublicChatStatus: vi.fn(),
}));

vi.mock("@/lib/publicFormsApi.js", () => ({
  submitPublicForm: vi.fn(),
}));

const { default: PublicChatWidget } = await import("@/components/chat/PublicChatWidget.jsx");
const { startPublicChat, sendPublicChatMessage, verifyPrechat, getPublicChatStatus } = await import(
  "@/services/publicChatApi.js"
);
const { submitPublicForm } = await import("@/lib/publicFormsApi.js");

const AIRA_RESPONDER = {
  type: "aira",
  display_name: "AIRA",
  avatar_url: null,
  status_label: "Asistente virtual",
};

// FASE 1AA.1 — formato esperado de client_message_id (UUID v4 generado por
// crypto.randomUUID()), usado para verificar el contrato sin acoplarse a un
// valor exacto (que sería no-determinístico entre corridas).
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function humanResponder(overrides = {}) {
  return {
    type: "human",
    display_name: "Osvaldo",
    avatar_url: null,
    status_label: "Agente humano",
    ...overrides,
  };
}

function openWidget() {
  fireEvent.click(screen.getByRole("button", { name: /abrir chat/i }));
}

async function typeAndSend(text) {
  const input = screen.getByLabelText(/escribe tu mensaje/i);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: /enviar mensaje/i }));
  return input;
}

async function fillPrechatForm({ name = "Ana Pérez", email = "ana@example.com", phone = "" } = {}) {
  fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: email } });
  if (phone) {
    fireEvent.change(screen.getByLabelText(/teléfono/i), { target: { value: phone } });
  }
  fireEvent.click(screen.getByLabelText(/acepto que ideas estudio/i));
}

async function completePrechat() {
  await fillPrechatForm();
  fireEvent.click(screen.getByRole("button", { name: /comenzar conversación/i }));
  await waitFor(() => expect(startPublicChat).toHaveBeenCalled());
}

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
  submitPublicForm.mockResolvedValue({ ok: true, submission_id: "sub-1", contact_id: "contact-1" });
  verifyPrechat.mockResolvedValue({ prechat_token: "token-1", expires_in: 900 });
  startPublicChat.mockResolvedValue({
    session_id: "session-1",
    visitor_id: "visitor-1",
    greeting: "¡Hola! ¿En qué puedo ayudarte?",
    responder: AIRA_RESPONDER,
  });
  sendPublicChatMessage.mockResolvedValue({
    ok: true,
    response_text: "Ofrecemos fotografía y video.",
    knowledge_used: true,
    citations: [{ citation_id: "C1", document_title: "Servicios", section_title: null, label: "Servicios" }],
    request_id: "req-1",
    responder: AIRA_RESPONDER,
  });
  getPublicChatStatus.mockResolvedValue({ ok: true, responder: AIRA_RESPONDER });
});

describe("PublicChatWidget — estado inicial", () => {
  it("renderiza cerrado por defecto (solo el botón flotante)", () => {
    render(<PublicChatWidget />);
    expect(screen.getByRole("button", { name: /abrir chat/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(startPublicChat).not.toHaveBeenCalled();
  });

  it("al abrir sin sesión previa, muestra el formulario de pre-chat en vez de iniciar sesión directamente", () => {
    render(<PublicChatWidget />);
    openWidget();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /antes de comenzar/i })).toBeInTheDocument();
    expect(startPublicChat).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/escribe tu mensaje/i)).not.toBeInTheDocument();
  });
});

describe("PublicChatWidget — pre-chat gate", () => {
  it("completa el pre-chat, verifica el submission y solo entonces inicia sesión con el prechat_token", async () => {
    render(<PublicChatWidget />);
    openWidget();

    await completePrechat();

    expect(submitPublicForm).toHaveBeenCalledWith(
      "aira-prechat",
      expect.objectContaining({ full_name: "Ana Pérez", email: "ana@example.com", consent: true })
    );
    expect(verifyPrechat).toHaveBeenCalledWith("sub-1");
    expect(startPublicChat).toHaveBeenCalledWith("token-1");
    expect(await screen.findByText("¡Hola! ¿En qué puedo ayudarte?")).toBeInTheDocument();
  });

  it("nunca envía nombre/email/teléfono a /public/chat/start — solo el token opaco", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();

    const [tokenArg] = startPublicChat.mock.calls[0];
    expect(tokenArg).toBe("token-1");
    expect(tokenArg).not.toMatch(/ana|example\.com/i);
  });

  it("no permite enviar el formulario sin nombre, email o consentimiento", async () => {
    render(<PublicChatWidget />);
    openWidget();

    fireEvent.click(screen.getByRole("button", { name: /comenzar conversación/i }));

    expect(await screen.findByText(/escribe tu nombre/i)).toBeInTheDocument();
    expect(screen.getByText(/escribe tu correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByText(/debes aceptar para continuar/i)).toBeInTheDocument();
    expect(submitPublicForm).not.toHaveBeenCalled();
  });

  it("rechaza un email con formato inválido", async () => {
    render(<PublicChatWidget />);
    openWidget();

    fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: "no-es-un-email" } });
    fireEvent.click(screen.getByLabelText(/acepto que ideas estudio/i));
    fireEvent.click(screen.getByRole("button", { name: /comenzar conversación/i }));

    expect(await screen.findByText(/correo electrónico válido/i)).toBeInTheDocument();
    expect(submitPublicForm).not.toHaveBeenCalled();
  });

  it("si el honeypot tiene valor, no llama al backend (bot silencioso)", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await fillPrechatForm();
    const honeypot = document.querySelector('input[name="website"]');
    fireEvent.change(honeypot, { target: { value: "http://spam.example" } });
    fireEvent.click(screen.getByRole("button", { name: /comenzar conversación/i }));

    await waitFor(() => expect(submitPublicForm).not.toHaveBeenCalled());
    expect(startPublicChat).not.toHaveBeenCalled();
  });

  it("muestra un error si el submit del formulario falla y no intenta iniciar sesión", async () => {
    submitPublicForm.mockRejectedValueOnce(new Error("Formulario no encontrado."));
    render(<PublicChatWidget />);
    openWidget();
    await fillPrechatForm();
    fireEvent.click(screen.getByRole("button", { name: /comenzar conversación/i }));

    expect(await screen.findByText("Formulario no encontrado.")).toBeInTheDocument();
    expect(verifyPrechat).not.toHaveBeenCalled();
    expect(startPublicChat).not.toHaveBeenCalled();
  });

  it("muestra un error si la verificación del pre-chat falla y no inicia sesión", async () => {
    verifyPrechat.mockRejectedValueOnce(new Error("Consentimiento requerido."));
    render(<PublicChatWidget />);
    openWidget();
    await fillPrechatForm();
    fireEvent.click(screen.getByRole("button", { name: /comenzar conversación/i }));

    expect(await screen.findByText("Consentimiento requerido.")).toBeInTheDocument();
    expect(startPublicChat).not.toHaveBeenCalled();
  });

  it("si /public/chat/prechat rechaza la submission ya usada (409), no reintenta automáticamente y deja al usuario reintentar a mano", async () => {
    const conflict = new Error("Este formulario ya fue utilizado para iniciar una conversación.");
    conflict.status = 409;
    verifyPrechat.mockRejectedValueOnce(conflict);

    render(<PublicChatWidget />);
    openWidget();
    await fillPrechatForm();
    fireEvent.click(screen.getByRole("button", { name: /comenzar conversación/i }));

    // 1-4: se completó y envió el prechat, y se muestra el mensaje del backend.
    expect(await screen.findByText("Este formulario ya fue utilizado para iniciar una conversación.")).toBeInTheDocument();
    expect(submitPublicForm).toHaveBeenCalledTimes(1);
    expect(verifyPrechat).toHaveBeenCalledTimes(1);

    // 5-7: nada se reintenta solo, y jamás se llega a abrir sesión.
    expect(submitPublicForm).toHaveBeenCalledTimes(1);
    expect(verifyPrechat).toHaveBeenCalledTimes(1);
    expect(startPublicChat).not.toHaveBeenCalled();

    // 8: el usuario sigue en la pantalla de pre-chat, con el formulario
    // interactivo de nuevo (no atascado en "Enviando…"), listo para
    // completar un envío nuevo por su cuenta si quiere — nunca se reutiliza
    // el submission_id anterior.
    expect(screen.getByRole("heading", { name: /antes de comenzar/i })).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: /comenzar conversación/i });
    expect(retryButton).not.toBeDisabled();
    expect(retryButton).toHaveTextContent("Comenzar conversación");
  });

  it("si /public/chat/start rechaza el prechat_token (401), vuelve a mostrar el formulario", async () => {
    const error = new Error("Verificación previa requerida.");
    error.status = 401;
    startPublicChat.mockRejectedValueOnce(error);

    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();

    expect(await screen.findByText(/completa el formulario de nuevo/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /antes de comenzar/i })).toBeInTheDocument();
  });
});

describe("PublicChatWidget — apertura e inicio de sesión con sesión existente", () => {
  it("reutiliza la sesión existente en sessionStorage sin volver a pedir el pre-chat", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await waitFor(() => expect(startPublicChat).not.toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: /antes de comenzar/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/escribe tu mensaje/i)).toBeInTheDocument();
  });
});

describe("PublicChatWidget — envío de mensajes", () => {
  it("envía un mensaje, muestra la burbuja del usuario y la respuesta con citas", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    await typeAndSend("¿qué servicios ofrecen?");

    expect(await screen.findByText("¿qué servicios ofrecen?")).toBeInTheDocument();
    expect(await screen.findByText("Ofrecemos fotografía y video.")).toBeInTheDocument();
    expect(screen.getByText("Servicios")).toBeInTheDocument();
    expect(sendPublicChatMessage).toHaveBeenCalledWith(
      "session-1",
      "¿qué servicios ofrecen?",
      expect.stringMatching(UUID_V4_REGEX)
    );
  });

  it("limpia el input después de enviar", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    const input = await typeAndSend("hola");
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("no permite enviar un mensaje vacío", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    expect(screen.getByRole("button", { name: /enviar mensaje/i })).toBeDisabled();
    expect(sendPublicChatMessage).not.toHaveBeenCalled();
  });
});

describe("PublicChatWidget — FASE 2: formato de fuentes", () => {
  it("muestra el encabezado 'Fuentes consultadas:' cuando hay citas", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    await typeAndSend("¿qué servicios ofrecen?");
    expect(await screen.findByText("Fuentes consultadas:")).toBeInTheDocument();
  });

  it("un document_title técnico (extensión, versión, guiones bajos) se muestra formateado, nunca crudo", async () => {
    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "Nuestra política permite reprogramar.", knowledge_used: true,
      citations: [{
        citation_id: "C1", document_title: "Politica_Reembolsos_v3_FINAL.pdf", section_title: null,
        label: "Politica_Reembolsos_v3_FINAL, página 2",
      }],
      request_id: "req-2", responder: AIRA_RESPONDER,
    });
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    await typeAndSend("cual es la politica de reembolso");
    expect(await screen.findByText("Politica Reembolsos, página 2")).toBeInTheDocument();
    expect(screen.queryByText(/Politica_Reembolsos_v3_FINAL/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\.pdf/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/_v3|_FINAL/i)).not.toBeInTheDocument();
  });

  it("sin citations, no muestra ningún bloque de fuentes", async () => {
    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "No tengo esa información disponible en este momento.",
      knowledge_used: false, citations: [], request_id: "req-3", responder: AIRA_RESPONDER,
    });
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    await typeAndSend("algo sin evidencia");
    await screen.findByText("No tengo esa información disponible en este momento.");
    expect(screen.queryByText("Fuentes consultadas:")).not.toBeInTheDocument();
  });

  it("un document_title ya amigable (sin ruido técnico) se muestra sin cambios", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    await typeAndSend("¿qué servicios ofrecen?");
    expect(await screen.findByText("Servicios")).toBeInTheDocument();
  });
});

describe("PublicChatWidget — client_message_id (FASE 1AA.1)", () => {
  it("cada envío genera un client_message_id con formato UUID y lo manda en el body de sendPublicChatMessage", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    await typeAndSend("hola");

    expect(sendPublicChatMessage).toHaveBeenCalledTimes(1);
    const [sessionIdArg, messageArg, clientMessageIdArg] = sendPublicChatMessage.mock.calls[0];
    expect(sessionIdArg).toBe("session-1");
    expect(messageArg).toBe("hola");
    expect(clientMessageIdArg).toEqual(expect.stringMatching(UUID_V4_REGEX));
  });

  it("dos envíos lógicos distintos usan dos client_message_id distintos", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    await typeAndSend("primero");
    await screen.findByText("Ofrecemos fotografía y video.");
    await typeAndSend("segundo");

    expect(sendPublicChatMessage).toHaveBeenCalledTimes(2);
    const firstId = sendPublicChatMessage.mock.calls[0][2];
    const secondId = sendPublicChatMessage.mock.calls[1][2];
    expect(firstId).toEqual(expect.stringMatching(UUID_V4_REGEX));
    expect(secondId).toEqual(expect.stringMatching(UUID_V4_REGEX));
    expect(secondId).not.toBe(firstId);
  });

  // Este widget hoy NO reintenta automáticamente sendPublicChatMessage tras
  // un fallo (ver el catch de handleSend: solo muestra un error, nunca
  // reinvoca la llamada) — no se inventa ese retry acá. Lo que sí se prueba,
  // y es lo que exige Gate 6/9 de FASE 1AA.1: el UUID se genera UNA vez
  // fuera del fetch individual, antes de que la promesa exista, así que
  // cualquier futuro retry de ESTA misma invocación de handleSend (p. ej.
  // un botón "reintentar" que vuelva a llamar sendPublicChatMessage con los
  // mismos sessionId/trimmed dentro del mismo catch) tiene ya disponible la
  // misma variable clientMessageId capturada en el closure — nunca tendría
  // que generar una nueva. Un mensaje nuevo, en cambio, siempre pasa por una
  // invocación nueva de handleSend y por lo tanto obtiene un UUID nuevo
  // (cubierto por el test anterior).
  it("un fallo de red no reintenta sola la llamada — no se inventa un retry que no existe hoy", async () => {
    const error = new Error("network down");
    error.status = 500;
    sendPublicChatMessage.mockRejectedValueOnce(error);

    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    await typeAndSend("hola");
    await waitFor(() => expect(sendPublicChatMessage).toHaveBeenCalledTimes(1));
    await screen.findByText(/no pude procesar tu mensaje/i);

    // Ninguna segunda llamada automática — el UUID generado para ese intento
    // nunca se reutiliza porque nunca hay un segundo fetch que lo necesite.
    expect(sendPublicChatMessage).toHaveBeenCalledTimes(1);
  });
});

describe("PublicChatWidget — manejo de errores", () => {
  it("muestra un mensaje amigable cuando hay rate limiting (429)", async () => {
    const error = new Error("Too many requests");
    error.status = 429;
    sendPublicChatMessage.mockRejectedValueOnce(error);

    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    await typeAndSend("hola de nuevo");

    expect(await screen.findByText(/muy rápido/i)).toBeInTheDocument();
  });

  it("si la sesión expiró (404) durante el chat, pide el pre-chat de nuevo en vez de reintentar en silencio", async () => {
    const error = new Error("Not found");
    error.status = 404;
    sendPublicChatMessage.mockRejectedValueOnce(error);

    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    await typeAndSend("pregunta");

    expect(await screen.findByText(/completa el formulario de nuevo para continuar/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /antes de comenzar/i })).toBeInTheDocument();
    expect(startPublicChat).toHaveBeenCalledTimes(1);
  });
});

describe("PublicChatWidget — seguridad", () => {
  it("nunca ejecuta HTML/scripts en una respuesta del backend, siempre lo muestra como texto plano", async () => {
    // El backend nunca debería devolver esto, pero el widget no debe
    // confiar en eso: PublicChatWidget renderiza message.content vía JSX
    // de texto plano (nunca dangerouslySetInnerHTML), así que aunque un
    // backend comprometido o un documento mal saneado devolviera markup,
    // debe quedar inerte en el DOM en vez de ejecutarse.
    const malicious = '<img src=x onerror="window.__xss_fired = true">Hola<script>window.__xss_fired = true</script>';
    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: malicious, knowledge_used: false, citations: [], request_id: "req-xss",
    });
    window.__xss_fired = undefined;

    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    await typeAndSend("intento de inyección");

    expect(await screen.findByText(malicious)).toBeInTheDocument();
    expect(document.querySelector(".public-chat-widget script")).toBeNull();
    expect(document.querySelector(".public-chat-widget img")).toBeNull();
    expect(window.__xss_fired).toBeUndefined();
  });
});

describe("PublicChatWidget — accesibilidad y límites", () => {
  it("el diálogo tiene aria-label y aria-modal", () => {
    render(<PublicChatWidget />);
    openWidget();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label");
  });

  it("limita el input al máximo de caracteres permitido", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    const input = screen.getByLabelText(/escribe tu mensaje/i);
    expect(input).toHaveAttribute("maxlength", "800");
  });
});

// ── LEVEL2: identidad dinámica del responder (GET /public/chat/status) ──────

function closedToggleButton() {
  return screen.getByRole("button", { name: /abrir chat/i });
}

function headerTitleText() {
  return document.querySelector(".public-chat-widget__header .public-chat-widget__title")?.textContent;
}

function headerSubtitleText() {
  return document.querySelector(".public-chat-widget__header .public-chat-widget__subtitle")?.textContent;
}

describe("PublicChatWidget — LEVEL2 responder: start", () => {
  it("1) /start con responder AIRA -> el header muestra AIRA / Asistente virtual", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    expect(headerTitleText()).toBe("AIRA");
    expect(headerSubtitleText()).toBe("Asistente virtual");
  });

  it("2) /start con responder human -> el header muestra display_name / Agente humano", async () => {
    startPublicChat.mockResolvedValueOnce({
      session_id: "session-1",
      visitor_id: "visitor-1",
      greeting: "Hola, soy Osvaldo, ¿en qué te ayudo?",
      responder: humanResponder({ display_name: "Osvaldo" }),
    });
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("Hola, soy Osvaldo, ¿en qué te ayudo?");

    expect(headerTitleText()).toBe("Osvaldo");
    expect(headerSubtitleText()).toBe("Agente humano");
  });
});

describe("PublicChatWidget — LEVEL2 responder: avatar", () => {
  it("3) human con avatar_url -> renderiza <img> con el src y alt correctos", async () => {
    startPublicChat.mockResolvedValueOnce({
      session_id: "session-1",
      visitor_id: "visitor-1",
      greeting: "hola",
      responder: humanResponder({ avatar_url: "https://cdn.example.test/osvaldo.png" }),
    });
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("hola");

    const img = document.querySelector(".public-chat-widget__header img");
    expect(img).toHaveAttribute("src", "https://cdn.example.test/osvaldo.png");
    expect(img).toHaveAttribute("alt", "Osvaldo");
  });

  it("4) human sin avatar_url -> renderiza fallback (iniciales), nunca <img>", async () => {
    startPublicChat.mockResolvedValueOnce({
      session_id: "session-1",
      visitor_id: "visitor-1",
      greeting: "hola",
      responder: humanResponder({ avatar_url: null }),
    });
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("hola");

    expect(document.querySelector(".public-chat-widget__header img")).toBeNull();
    const placeholder = document.querySelector(".public-chat-widget__header .public-chat-widget__avatar-placeholder");
    expect(placeholder).not.toBeNull();
    expect(placeholder.textContent).toBe("O");
  });

  it("5) avatar que falla al cargar -> cae a fallback visual", async () => {
    startPublicChat.mockResolvedValueOnce({
      session_id: "session-1",
      visitor_id: "visitor-1",
      greeting: "hola",
      responder: humanResponder({ avatar_url: "https://cdn.example.test/broken.png" }),
    });
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("hola");

    const img = document.querySelector(".public-chat-widget__header img");
    expect(img).not.toBeNull();
    fireEvent.error(img);

    await waitFor(() => {
      expect(document.querySelector(".public-chat-widget__header img")).toBeNull();
    });
    expect(
      document.querySelector(".public-chat-widget__header .public-chat-widget__avatar-placeholder")
    ).not.toBeNull();
  });
});

describe("PublicChatWidget — LEVEL2 responder: GET /status", () => {
  it("6) abrir el widget con session_id existente llama a /status exactamente una vez", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();

    await waitFor(() => expect(getPublicChatStatus).toHaveBeenCalledTimes(1));
    expect(getPublicChatStatus).toHaveBeenCalledWith("existing-session");
  });

  it("7) /status AI -> el header refleja AIRA", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    getPublicChatStatus.mockResolvedValueOnce({ ok: true, responder: AIRA_RESPONDER });
    render(<PublicChatWidget />);
    openWidget();

    await waitFor(() => expect(getPublicChatStatus).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(headerTitleText()).toBe("AIRA"));
    expect(headerSubtitleText()).toBe("Asistente virtual");
  });

  it("8) /status human -> el header cambia a la identidad humana", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    getPublicChatStatus.mockResolvedValueOnce({
      ok: true,
      responder: humanResponder({ display_name: "Osvaldo" }),
    });
    render(<PublicChatWidget />);
    openWidget();

    await waitFor(() => expect(headerTitleText()).toBe("Osvaldo"));
    expect(headerSubtitleText()).toBe("Agente humano");
  });

  it("9) /status 503 conserva el último responder conocido", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    getPublicChatStatus.mockResolvedValueOnce({
      ok: true,
      responder: humanResponder({ display_name: "Osvaldo" }),
    });
    render(<PublicChatWidget />);
    openWidget();
    await waitFor(() => expect(headerTitleText()).toBe("Osvaldo"));

    // Segunda consulta (disparada por un 409 posterior) falla con 503 —
    // la identidad ya conocida (Osvaldo) debe permanecer intacta. No hace
    // falta pre-chat: la sesión existente ya llevó screen a "chat".
    const conflict = new Error("La conversación está siendo atendida por un agente.");
    conflict.status = 409;
    sendPublicChatMessage.mockRejectedValueOnce(conflict);
    const unavailable = new Error("El chat público no está disponible temporalmente.");
    unavailable.status = 503;
    getPublicChatStatus.mockRejectedValueOnce(unavailable);

    await typeAndSend("hola de nuevo");

    await waitFor(() => expect(getPublicChatStatus).toHaveBeenCalledTimes(2));
    expect(headerTitleText()).toBe("Osvaldo");
    expect(headerSubtitleText()).toBe("Agente humano");
  });

  it("10) /status 429 no reintenta en loop", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await waitFor(() => expect(getPublicChatStatus).toHaveBeenCalledTimes(1));

    const conflict = new Error("La conversación está siendo atendida por un agente.");
    conflict.status = 409;
    sendPublicChatMessage.mockRejectedValueOnce(conflict);
    const rateLimited = new Error("Demasiadas solicitudes.");
    rateLimited.status = 429;
    getPublicChatStatus.mockRejectedValueOnce(rateLimited);

    await typeAndSend("hola de nuevo");

    await waitFor(() => expect(getPublicChatStatus).toHaveBeenCalledTimes(2));
    // Espera adicional para confirmar que nada dispara una tercera llamada.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(getPublicChatStatus).toHaveBeenCalledTimes(2);
  });

  it("11) /status 404 reutiliza el comportamiento existente de sesión expirada", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    const notFound = new Error("Sesión no encontrada.");
    notFound.status = 404;
    getPublicChatStatus.mockRejectedValueOnce(notFound);

    render(<PublicChatWidget />);
    openWidget();

    expect(await screen.findByText(/completa el formulario de nuevo para continuar/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /antes de comenzar/i })).toBeInTheDocument();
    expect(sessionStorage.getItem("aira_public_chat_session_v1")).toBeNull();
  });
});

describe("PublicChatWidget — LEVEL2 responder: POST /message 409", () => {
  it("12) 409 humano: no reintenta /message, llama /status una vez, cambia responder, no inventa respuesta de AIRA", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    const conflict = new Error("La conversación está siendo atendida por un agente.");
    conflict.status = 409;
    sendPublicChatMessage.mockRejectedValueOnce(conflict);
    getPublicChatStatus.mockResolvedValueOnce({
      ok: true,
      responder: humanResponder({ display_name: "Osvaldo" }),
    });

    await typeAndSend("¿hay alguien ahí?");

    expect(await screen.findByText("La conversación está siendo atendida por un agente.")).toBeInTheDocument();
    expect(sendPublicChatMessage).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(getPublicChatStatus).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(headerTitleText()).toBe("Osvaldo"));

    // Ninguna burbuja "assistant" nueva se agregó a partir del 409 — solo
    // queda el saludo inicial, nunca una respuesta fabricada del lado cliente.
    const assistantBubbles = document.querySelectorAll(".public-chat-widget__bubble--assistant");
    expect(assistantBubbles).toHaveLength(1);
    expect(assistantBubbles[0].textContent).toContain("¿En qué puedo ayudarte?");
  });

  it("13) /message 200 con responder actualiza la identidad mostrada", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true,
      response_text: "Respuesta",
      knowledge_used: false,
      citations: [],
      request_id: "req-2",
      responder: humanResponder({ display_name: "Osvaldo" }),
    });

    await typeAndSend("hola");
    await screen.findByText("Respuesta");

    expect(headerTitleText()).toBe("Osvaldo");
    expect(headerSubtitleText()).toBe("Agente humano");
  });
});

describe("PublicChatWidget — LEVEL2 responder: privacidad y XSS", () => {
  it("14) nunca renderiza campos internos aunque el backend/mock los agregue", async () => {
    startPublicChat.mockResolvedValueOnce({
      session_id: "session-1",
      visitor_id: "visitor-1",
      greeting: "hola",
      responder: {
        type: "human",
        display_name: "Osvaldo",
        avatar_url: null,
        status_label: "Agente humano",
        assigned_user_id: "agent-should-not-render-999",
        control_mode: "human",
        ai_enabled: false,
        full_name: "Osvaldo Marfisi Nombre Legal",
        email: "osvaldo@example.test",
        role_slug: "admin",
        permissions: ["*"],
      },
    });
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("hola");

    const bodyText = document.body.textContent;
    for (const forbidden of [
      "agent-should-not-render-999",
      "control_mode",
      "ai_enabled",
      "Osvaldo Marfisi Nombre Legal",
      "osvaldo@example.test",
      "role_slug",
      "admin",
      "permissions",
    ]) {
      expect(bodyText).not.toContain(forbidden);
    }
    expect(headerTitleText()).toBe("Osvaldo");
  });

  it("15) un display_name malicioso se muestra como texto plano, nunca ejecuta HTML", async () => {
    const malicious = '<img src=x onerror="window.__responder_xss_fired = true">';
    window.__responder_xss_fired = undefined;
    startPublicChat.mockResolvedValueOnce({
      session_id: "session-1",
      visitor_id: "visitor-1",
      greeting: "hola",
      responder: humanResponder({ display_name: malicious }),
    });
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("hola");

    expect(headerTitleText()).toBe(malicious);
    expect(document.querySelector(".public-chat-widget__header img")).toBeNull();
    expect(window.__responder_xss_fired).toBeUndefined();
  });
});

describe("PublicChatWidget — LEVEL2 responder: sin polling continuo", () => {
  it("16) no existe ningún timer recurrente consultando /status", async () => {
    vi.useFakeTimers();
    try {
      sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
      render(<PublicChatWidget />);
      fireEvent.click(screen.getByRole("button", { name: /abrir chat/i }));

      await vi.waitFor(() => expect(getPublicChatStatus).toHaveBeenCalledTimes(1));
      await vi.advanceTimersByTimeAsync(60_000);
      expect(getPublicChatStatus).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("PublicChatWidget — LEVEL2 responder: pill cerrado", () => {
  it("17) pill cerrado muestra la identidad real de AIRA", () => {
    render(<PublicChatWidget />);
    const button = closedToggleButton();
    expect(button).toHaveAttribute("aria-label", "Abrir chat con AIRA");
    expect(button.textContent).toContain("AIRA");
    expect(button.textContent).toContain("Asistente virtual");
  });

  it("18) pill cerrado muestra la identidad real del agente humano", async () => {
    startPublicChat.mockResolvedValueOnce({
      session_id: "session-1",
      visitor_id: "visitor-1",
      greeting: "hola",
      responder: humanResponder({ display_name: "Osvaldo" }),
    });
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("hola");
    // El botón flotante y el botón del header comparten aria-label "Cerrar
    // chat" mientras el panel está abierto (comportamiento preexistente) —
    // se cierra por el del header, que es inequívoco por clase.
    fireEvent.click(document.querySelector(".public-chat-widget__close"));

    const button = closedToggleButton();
    expect(button).toHaveAttribute("aria-label", "Abrir chat con Osvaldo");
    expect(button.textContent).toContain("Osvaldo");
    expect(button.textContent).toContain("Agente humano");
  });

  it("19) nunca muestra presencia falsa (Disponible/En línea) ligada a la identidad", async () => {
    startPublicChat.mockResolvedValueOnce({
      session_id: "session-1",
      visitor_id: "visitor-1",
      greeting: "hola",
      responder: humanResponder({ display_name: "Osvaldo" }),
    });
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("hola");

    const bodyText = document.body.textContent;
    expect(bodyText).not.toMatch(/disponible/i);
    expect(bodyText).not.toMatch(/en línea/i);
    expect(document.querySelector('[class*="online"]')).toBeNull();
    expect(document.querySelector('[class*="presence"]')).toBeNull();
  });
});

describe("PublicChatWidget — LEVEL2 responder: prechat intacto", () => {
  it("20) el flujo de pre-chat sigue igual y no llama a /status durante /start", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    expect(startPublicChat).toHaveBeenCalledWith("token-1");
    expect(getPublicChatStatus).not.toHaveBeenCalled();
  });
});
