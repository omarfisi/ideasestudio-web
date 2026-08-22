import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/services/publicChatApi.js", () => ({
  startPublicChat: vi.fn(),
  sendPublicChatMessage: vi.fn(),
  verifyPrechat: vi.fn(),
  getPublicChatStatus: vi.fn(),
  getPublicChatEvents: vi.fn(),
  recognizeVisitor: vi.fn(),
  forgetVisitor: vi.fn(),
}));

vi.mock("@/lib/publicFormsApi.js", () => ({
  submitPublicForm: vi.fn(),
}));

const { default: PublicChatWidget } = await import("@/components/chat/PublicChatWidget.jsx");
const {
  startPublicChat,
  sendPublicChatMessage,
  verifyPrechat,
  getPublicChatStatus,
  getPublicChatEvents,
  recognizeVisitor,
  forgetVisitor,
} = await import("@/services/publicChatApi.js");
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

// FASE 3B.2 — el widget usa <Link> (react-router-dom) para el botón de
// CTA, que solo se instancia cuando message.cta existe. Los tests que
// ejercitan un CTA necesitan un Router real alrededor; el resto de este
// archivo sigue usando render(<PublicChatWidget />) sin envoltorio porque
// sus fixtures nunca incluyen cta.
function renderWithRouter() {
  return render(
    <MemoryRouter>
      <PublicChatWidget />
    </MemoryRouter>
  );
}

function openWidget() {
  fireEvent.click(screen.getByRole("button", { name: /abrir chat/i }));
}

// FASE HANDOFF H3B — helper propio para cerrar el panel: la barra flotante
// alterna su aria-label entre "Abrir chat.../Cerrar chat" según isOpen y,
// una vez abierto, existe un SEGUNDO botón con el mismo label "Cerrar
// chat" (el de la cabecera), así que buscar por texto es ambiguo — se
// selecciona el toggle por su clase, no por accesibilidad, deliberadamente
// distinto de openWidget().
function closeWidget() {
  fireEvent.click(document.querySelector(".public-chat-widget__toggle"));
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
  // FASE HANDOFF H3B — default inocuo: sin mensajes nuevos, SIN responder
  // (sanitizeResponder(undefined) devuelve null, así que el widget nunca
  // pisa la identidad ya establecida por /start o /message). El poller
  // arranca en cuanto hay sessionId, incluso con el panel cerrado (ver
  // H3B.2), así que prácticamente todos los tests de este archivo terminan
  // llamando a getPublicChatEvents al menos una vez -- este default evita
  // que se conviertan en tests de H3B por accidente, y evita tener que
  // correlacionar manualmente esta identidad con la de cada
  // startPublicChat.mockResolvedValueOnce(...) de tests preexistentes.
  getPublicChatEvents.mockResolvedValue({ ok: true, messages: [] });
  recognizeVisitor.mockResolvedValue({ recognized: false, full_name: null, email: null, phone: null });
  forgetVisitor.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.useRealTimers();
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
    expect(startPublicChat).toHaveBeenCalledWith("token-1", false);
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

    expect(startPublicChat).toHaveBeenCalledWith("token-1", false);
    expect(getPublicChatStatus).not.toHaveBeenCalled();
  });
});

describe("PublicChatWidget — FASE 3B.2: CTA comercial", () => {
  it("renderiza el botón de CTA recibido del backend, con su label y su href exactos", async () => {
    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "Ofrecemos diseño web profesional.", knowledge_used: true,
      citations: [], cta: { type: "quote", label: "Solicitar cotización", href: "/contacto?service=Web" },
      request_id: "req-cta-1", responder: AIRA_RESPONDER,
    });
    renderWithRouter();
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    await typeAndSend("quiero una página web");

    const ctaLink = await screen.findByRole("link", { name: /Solicitar cotización/i });
    expect(ctaLink).toHaveAttribute("href", "/contacto?service=Web");
  });

  it("sin cta en la respuesta, no renderiza ningún botón de acción comercial", async () => {
    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "Respuesta sin CTA.", knowledge_used: true,
      citations: [], cta: null, request_id: "req-cta-2", responder: AIRA_RESPONDER,
    });
    renderWithRouter();
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    await typeAndSend("hola");

    await screen.findByText("Respuesta sin CTA.");
    expect(screen.queryByRole("link", { name: /Solicitar cotización/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Conocer planes/i })).not.toBeInTheDocument();
  });

  it("renderiza un CTA de tipo contact con su propio label, sin asumir que siempre es cotización", async () => {
    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "Tenemos planes de redes sociales.", knowledge_used: true,
      citations: [],
      cta: { type: "contact", label: "Conocer planes", href: "/contacto?service=Contenido%20para%20redes%20sociales" },
      request_id: "req-cta-3", responder: AIRA_RESPONDER,
    });
    renderWithRouter();
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    await typeAndSend("quiero redes sociales");

    const ctaLink = await screen.findByRole("link", { name: /Conocer planes/i });
    expect(ctaLink).toHaveAttribute("href", "/contacto?service=Contenido%20para%20redes%20sociales");
  });

  it("el widget nunca construye ni modifica el href del backend — lo usa tal cual", async () => {
    const exactHref = "/contacto?service=Branding%20e%20identidad%20visual";
    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "Hacemos branding.", knowledge_used: true,
      citations: [], cta: { type: "quote", label: "Solicitar cotización", href: exactHref },
      request_id: "req-cta-4", responder: AIRA_RESPONDER,
    });
    renderWithRouter();
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    await typeAndSend("quiero branding");

    const ctaLink = await screen.findByRole("link", { name: /Solicitar cotización/i });
    expect(ctaLink.getAttribute("href")).toBe(exactHref);
  });

  it("un mensaje anterior sin cta y uno nuevo con cta conviven sin que el CTA se filtre al primero", async () => {
    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "Primera respuesta, sin CTA.", knowledge_used: true,
      citations: [], cta: null, request_id: "req-cta-5a", responder: AIRA_RESPONDER,
    });
    renderWithRouter();
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    await typeAndSend("hola");
    await screen.findByText("Primera respuesta, sin CTA.");
    expect(screen.queryByRole("link", { name: /Solicitar cotización/i })).not.toBeInTheDocument();

    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "Segunda respuesta, con CTA.", knowledge_used: true,
      citations: [], cta: { type: "quote", label: "Solicitar cotización", href: "/contacto?service=Web" },
      request_id: "req-cta-5b", responder: AIRA_RESPONDER,
    });
    await typeAndSend("quiero una web");
    await screen.findByText("Segunda respuesta, con CTA.");
    expect(await screen.findByRole("link", { name: /Solicitar cotización/i })).toBeInTheDocument();
  });
});

describe("PublicChatWidget — FASE 4: reconocimiento de visitante", () => {
  it("abre el pre-chat de inmediato, sin esperar a recognizeVisitor()", () => {
    let resolveRecognize;
    recognizeVisitor.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRecognize = resolve;
      })
    );
    render(<PublicChatWidget />);
    openWidget();
    // El formulario ya está visible aunque recognizeVisitor() ni siquiera
    // haya resuelto todavía -- nunca se agrega latencia a abrir el widget.
    expect(screen.getByRole("heading", { name: /antes de comenzar/i })).toBeInTheDocument();
    resolveRecognize({ recognized: false, full_name: null, email: null, phone: null });
  });

  it("precarga nombre/email/teléfono cuando recognizeVisitor() reconoce al visitante", async () => {
    recognizeVisitor.mockResolvedValueOnce({
      recognized: true, full_name: "Ada Lovelace", email: "ada@example.com", phone: "7875550100",
    });
    render(<PublicChatWidget />);
    openWidget();
    await waitFor(() => {
      expect(screen.getByLabelText(/nombre completo/i)).toHaveValue("Ada Lovelace");
    });
    expect(screen.getByLabelText(/correo electrónico/i)).toHaveValue("ada@example.com");
    expect(screen.getByLabelText(/teléfono/i)).toHaveValue("7875550100");
  });

  it("no precarga nada cuando recognizeVisitor() no reconoce al visitante (comportamiento por defecto)", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await waitFor(() => expect(recognizeVisitor).toHaveBeenCalled());
    expect(screen.getByLabelText(/nombre completo/i)).toHaveValue("");
    expect(screen.getByLabelText(/correo electrónico/i)).toHaveValue("");
  });

  it("nunca le pisa al usuario lo que ya escribió si recognizeVisitor() resuelve tarde", async () => {
    let resolveRecognize;
    recognizeVisitor.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRecognize = resolve;
      })
    );
    render(<PublicChatWidget />);
    openWidget();
    fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: "Nombre Tecleado" } });
    resolveRecognize({
      recognized: true, full_name: "Ada Lovelace", email: "ada@example.com", phone: null,
    });
    await waitFor(() => expect(recognizeVisitor).toHaveBeenCalled());
    // Le damos tiempo al microtask de la promesa a resolver sin que se
    // sobreescriba el campo que el usuario ya tocó.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByLabelText(/nombre completo/i)).toHaveValue("Nombre Tecleado");
  });

  it("si recognizeVisitor() falla (red/backend), el pre-chat sigue funcionando sin precarga", async () => {
    recognizeVisitor.mockRejectedValueOnce(new Error("network error"));
    render(<PublicChatWidget />);
    openWidget();
    await waitFor(() => expect(recognizeVisitor).toHaveBeenCalled());
    expect(screen.getByLabelText(/nombre completo/i)).toHaveValue("");
    await fillPrechatForm();
    fireEvent.click(screen.getByRole("button", { name: /comenzar conversación/i }));
    await waitFor(() => expect(startPublicChat).toHaveBeenCalled());
  });

  it('muestra "No soy yo / Olvidar mis datos" solo cuando el visitante fue reconocido', async () => {
    render(<PublicChatWidget />);
    openWidget();
    await waitFor(() => expect(recognizeVisitor).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /no soy yo/i })).not.toBeInTheDocument();
  });

  it('"No soy yo" llama a forgetVisitor() y limpia los campos precargados', async () => {
    recognizeVisitor.mockResolvedValueOnce({
      recognized: true, full_name: "Ada Lovelace", email: "ada@example.com", phone: null,
    });
    render(<PublicChatWidget />);
    openWidget();
    await waitFor(() => {
      expect(screen.getByLabelText(/nombre completo/i)).toHaveValue("Ada Lovelace");
    });

    fireEvent.click(screen.getByRole("button", { name: /no soy yo/i }));
    await waitFor(() => expect(forgetVisitor).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getByLabelText(/nombre completo/i)).toHaveValue("");
    });
    expect(screen.getByLabelText(/correo electrónico/i)).toHaveValue("");
  });

  it('el checkbox "recuérdame" empieza sin marcar y su valor viaja a startPublicChat()', async () => {
    render(<PublicChatWidget />);
    openWidget();
    await fillPrechatForm();
    const rememberCheckbox = screen.getByLabelText(/recuérdame en este navegador/i);
    expect(rememberCheckbox).not.toBeChecked();
    fireEvent.click(rememberCheckbox);
    fireEvent.click(screen.getByRole("button", { name: /comenzar conversación/i }));
    await waitFor(() => expect(startPublicChat).toHaveBeenCalledWith("token-1", true));
  });

  it("sin marcar recuérdame, startPublicChat() recibe remember_me=false", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    expect(startPublicChat).toHaveBeenCalledWith("token-1", false);
  });
});

// ── FASE HANDOFF H3B — polling de GET /public/chat/events ──────────────────

function serverMsg(overrides = {}) {
  return {
    id: `srv-${Math.random().toString(36).slice(2)}`,
    role: "customer",
    content: "contenido",
    created_at: "2026-01-01T00:00:00Z",
    citations: [],
    ...overrides,
  };
}

function userBubbles() {
  return document.querySelectorAll(".public-chat-widget__bubble--user");
}

function assistantBubbles() {
  // El indicador de "escribiendo…" también lleva la clase --assistant
  // (ver el JSX: bubble--assistant + typing juntas) — se excluye acá para
  // que este helper cuente solo mensajes reales, nunca el indicador de
  // carga transitorio.
  return document.querySelectorAll(".public-chat-widget__bubble--assistant:not(.public-chat-widget__typing)");
}

function agentBubbles() {
  return document.querySelectorAll(".public-chat-widget__bubble--agent");
}

describe("PublicChatWidget — H3B: polling de /events", () => {
  // 1 — sin sessionId, nunca hay polling
  it("1) sin sesión (visitante nuevo, sin sessionStorage) nunca llama a getPublicChatEvents", () => {
    render(<PublicChatWidget />);
    expect(getPublicChatEvents).not.toHaveBeenCalled();
  });

  // 2 — sesión restaurada inicia /events sin necesidad de abrir el panel
  it("2) con una sesión restaurada, el polling arranca en cuanto monta, sin abrir el panel", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    await waitFor(() =>
      expect(getPublicChatEvents).toHaveBeenCalledWith("existing-session", expect.objectContaining({ signal: expect.anything() }))
    );
  });

  // 3 — cadencia ~3s
  it("3) el polling corre cada ~3s mientras la sesión sigue activa", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(3000);
    expect(getPublicChatEvents).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(3000);
    expect(getPublicChatEvents).toHaveBeenCalledTimes(3);
  });

  // 4 — nunca dos /events en vuelo (encadenado, no setInterval)
  it("4) nunca hay dos /events concurrentes: la siguiente corrida espera a que la anterior termine", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    let resolveFirst;
    getPublicChatEvents.mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }));
    render(<PublicChatWidget />);
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(10000); // mucho más que 3s, la primera sigue sin resolver
    expect(getPublicChatEvents).toHaveBeenCalledTimes(1);

    resolveFirst({ ok: true, messages: [] });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(3000);
    expect(getPublicChatEvents).toHaveBeenCalledTimes(2);
  });

  // 5 — cleanup al unmount aborta el fetch en vuelo
  it("5) al desmontar, aborta el /events en vuelo", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    let capturedSignal;
    getPublicChatEvents.mockImplementationOnce((_sid, opts = {}) => {
      capturedSignal = opts.signal;
      return new Promise(() => {}); // nunca resuelve
    });
    const { unmount } = render(<PublicChatWidget />);
    await waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));
    expect(capturedSignal?.aborted).toBe(false);
    unmount();
    expect(capturedSignal?.aborted).toBe(true);
  });

  // 6 — respuesta stale de una sesión ya reemplazada se ignora
  it("6) una respuesta tardía del poll de una sesión ya expirada (A) nunca contamina la sesión nueva (B)", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "session-a");
    let resolveA;
    getPublicChatEvents.mockImplementationOnce(() => new Promise((resolve) => { resolveA = resolve; }));
    render(<PublicChatWidget />);
    openWidget();
    await waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledWith("session-a", expect.anything()));

    const notFound = new Error("Sesión no encontrada.");
    notFound.status = 404;
    sendPublicChatMessage.mockRejectedValueOnce(notFound);
    await typeAndSend("hola");
    await screen.findByRole("heading", { name: /antes de comenzar/i });

    startPublicChat.mockResolvedValueOnce({
      session_id: "session-b", visitor_id: "visitor-b", greeting: "hola de nuevo", responder: AIRA_RESPONDER,
    });
    await completePrechat();
    await screen.findByText("hola de nuevo");

    // A resuelve TARDE, con datos que nunca deberían aplicarse a B.
    resolveA({
      ok: true,
      messages: [serverMsg({ id: "m-a", content: "mensaje de A" })],
      responder: humanResponder({ display_name: "Agente de A" }),
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(headerTitleText()).toBe("AIRA");
    expect(screen.queryByText("mensaje de A")).not.toBeInTheDocument();
  });

  // 7 — 200 con mensajes nuevos los agrega al historial (también cubre restore con historial vacío, item 21)
  it("7) un snapshot 200 con mensajes nuevos del servidor los muestra en el historial", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    getPublicChatEvents.mockResolvedValueOnce({
      ok: true,
      messages: [serverMsg({ id: "m1", role: "agent", content: "Ya reviso tu caso." })],
      responder: humanResponder({ display_name: "Osvaldo" }),
    });
    render(<PublicChatWidget />);
    openWidget();
    expect(await screen.findByText("Ya reviso tu caso.")).toBeInTheDocument();
  });

  // 8 — un customer server no duplica la burbuja optimista del usuario
  it("8) un mensaje customer devuelto por /events no duplica la burbuja optimista del usuario", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    await typeAndSend("¿cuánto cuesta el servicio?");
    await vi.waitFor(() => expect(userBubbles()).toHaveLength(1));

    getPublicChatEvents.mockResolvedValueOnce({
      ok: true,
      messages: [serverMsg({ id: "m-customer-1", role: "customer", content: "¿cuánto cuesta el servicio?" })],
      responder: AIRA_RESPONDER,
    });
    await vi.advanceTimersByTimeAsync(3000);

    await vi.waitFor(() => expect(userBubbles()).toHaveLength(1)); // sigue siendo 1, nunca 2
  });

  // 9 — dos mensajes customer idénticos se emparejan 1:1
  it("9) dos mensajes customer con contenido idéntico se emparejan 1:1, ninguno se pierde ni colapsa", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    await typeAndSend("hola");
    await vi.waitFor(() => expect(userBubbles()).toHaveLength(1));
    await vi.waitFor(() => expect(screen.getByLabelText(/escribe tu mensaje/i)).not.toBeDisabled());
    await typeAndSend("hola");
    await vi.waitFor(() => expect(userBubbles()).toHaveLength(2));

    getPublicChatEvents.mockResolvedValueOnce({
      ok: true,
      messages: [
        serverMsg({ id: "m1", role: "customer", content: "hola", created_at: "2026-01-01T00:00:00Z" }),
        serverMsg({ id: "m2", role: "customer", content: "hola", created_at: "2026-01-01T00:00:01Z" }),
      ],
      responder: AIRA_RESPONDER,
    });
    await vi.advanceTimersByTimeAsync(3000);

    await vi.waitFor(() => expect(userBubbles()).toHaveLength(2)); // ambas, nunca colapsadas a una sola
  });

  // 10 — un pending local sin contraparte todavía en el snapshot permanece visible
  it("10) un mensaje local pendiente que el snapshot todavía no confirma permanece visible", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    await typeAndSend("mensaje todavía no persistido");
    await vi.waitFor(() => expect(userBubbles()).toHaveLength(1));

    // El próximo poll no trae nada nuevo (el backend todavía no lo persistió/indexó).
    getPublicChatEvents.mockResolvedValueOnce({ ok: true, messages: [], responder: AIRA_RESPONDER });
    await vi.advanceTimersByTimeAsync(3000);

    await vi.waitFor(() => expect(userBubbles()).toHaveLength(1));
    expect(screen.getByText("mensaje todavía no persistido")).toBeInTheDocument();
  });

  // 11 — assistant devuelto por POST + luego el mismo assistant en /events: una sola bubble
  it("11) la respuesta de AIRA mostrada por el POST y luego confirmada por /events no se duplica", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "Ofrecemos fotografía y video.", citations: [], responder: AIRA_RESPONDER,
    });
    await typeAndSend("¿qué servicios ofrecen?");
    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(1));

    getPublicChatEvents.mockResolvedValueOnce({
      ok: true,
      messages: [
        serverMsg({ id: "m1", role: "customer", content: "¿qué servicios ofrecen?", created_at: "2026-01-01T00:00:00Z" }),
        serverMsg({ id: "m2", role: "assistant", content: "Ofrecemos fotografía y video.", created_at: "2026-01-01T00:00:01Z" }),
      ],
      responder: AIRA_RESPONDER,
    });
    await vi.advanceTimersByTimeAsync(3000);

    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(1)); // sigue siendo una sola bubble
    expect(userBubbles()).toHaveLength(1);
  });

  // 12 — la CTA de una respuesta POST no se pierde al reconciliar contra /events (que no expone cta)
  it("12) la CTA de una respuesta POST se conserva después de que /events la reconcilie", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    renderWithRouter();
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true,
      response_text: "Tenemos un plan que te puede interesar.",
      citations: [],
      cta: { type: "membership", label: "Ver membresías", href: "/membresias" },
      responder: AIRA_RESPONDER,
    });
    await typeAndSend("¿tienen membresías?");
    await vi.waitFor(() => expect(screen.getByRole("link", { name: /ver membresías/i })).toBeInTheDocument());

    // /events NO expone cta en absoluto (contrato real de PublicChatEventMessage).
    getPublicChatEvents.mockResolvedValueOnce({
      ok: true,
      messages: [
        serverMsg({ id: "m1", role: "customer", content: "¿tienen membresías?", created_at: "2026-01-01T00:00:00Z" }),
        serverMsg({ id: "m2", role: "assistant", content: "Tenemos un plan que te puede interesar.", created_at: "2026-01-01T00:00:01Z" }),
      ],
      responder: AIRA_RESPONDER,
    });
    await vi.advanceTimersByTimeAsync(3000);

    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(1));
    expect(screen.getByRole("link", { name: /ver membresías/i })).toBeInTheDocument();
  });

  // 13 — role="agent" se muestra con estilo/identidad humana, nunca como AIRA
  it("13) un mensaje role=agent aparece en la UI con estilo/etiqueta de agente humano, nunca como AIRA", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    getPublicChatEvents.mockResolvedValueOnce({
      ok: true,
      messages: [serverMsg({ id: "m1", role: "agent", content: "Hola, soy Osvaldo, ya puedo ayudarte." })],
      responder: humanResponder({ display_name: "Osvaldo" }),
    });
    render(<PublicChatWidget />);
    openWidget();
    expect(await screen.findByText("Hola, soy Osvaldo, ya puedo ayudarte.")).toBeInTheDocument();
    expect(agentBubbles()).toHaveLength(1);
    expect(assistantBubbles()).toHaveLength(0);
    expect(screen.getByText("Agente")).toBeInTheDocument();
  });

  // 14 — responder cambia AIRA -> humano vía /events
  it("14) el responder cambia de AIRA a humano cuando /events lo reporta, sin acción del visitante", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));
    expect(headerTitleText()).toBe("AIRA");

    getPublicChatEvents.mockResolvedValueOnce({
      ok: true, messages: [], responder: humanResponder({ display_name: "Osvaldo" }),
    });
    await vi.advanceTimersByTimeAsync(3000);

    await vi.waitFor(() => expect(headerTitleText()).toBe("Osvaldo"));
    expect(headerSubtitleText()).toBe("Agente humano");
  });

  // 15 — responder cambia humano -> AIRA vía /events
  it("15) el responder cambia de humano a AIRA cuando /events lo reporta (return-to-ai)", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    getPublicChatEvents.mockResolvedValueOnce({
      ok: true, messages: [], responder: humanResponder({ display_name: "Osvaldo" }),
    });
    // Abrir el panel dispara además refreshStatus() (LEVEL2, H3B.11) — se
    // alinea con la misma identidad humana que /events, para que ambas
    // fuentes coincidan como lo harían contra un backend real (ambas leen
    // el mismo control_mode/assigned_user_id persistido).
    getPublicChatStatus.mockResolvedValueOnce({ ok: true, responder: humanResponder({ display_name: "Osvaldo" }) });
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(headerTitleText()).toBe("Osvaldo"));

    getPublicChatEvents.mockResolvedValueOnce({ ok: true, messages: [], responder: AIRA_RESPONDER });
    await vi.advanceTimersByTimeAsync(3000);

    await vi.waitFor(() => expect(headerTitleText()).toBe("AIRA"));
    expect(headerSubtitleText()).toBe("Asistente virtual");
  });

  // 16 — 404 detiene el poll, limpia sesión/historial y vuelve a prechat
  it("16) un 404 de /events detiene el polling, limpia sesión e historial, y vuelve a prechat", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    sessionStorage.setItem("aira_public_chat_history_v1", JSON.stringify([{ role: "user", content: "mensaje viejo" }]));
    const notFound = new Error("Sesión no encontrada.");
    notFound.status = 404;
    getPublicChatEvents.mockRejectedValueOnce(notFound);

    render(<PublicChatWidget />);
    openWidget();

    expect(await screen.findByText(/completa el formulario de nuevo para continuar/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /antes de comenzar/i })).toBeInTheDocument();
    expect(sessionStorage.getItem("aira_public_chat_session_v1")).toBeNull();
    // El efecto persistHistory (keyed on messages) vuelve a escribir la key
    // en cuanto expireSession() pone messages en [] -- funcionalmente
    // equivalente a "sin historial" (loadStoredHistory() de un array vacío
    // y de una key ausente producen el mismo []), así que se verifica el
    // CONTENIDO, no la presencia literal de la key.
    expect(JSON.parse(sessionStorage.getItem("aira_public_chat_history_v1") || "[]")).toEqual([]);
    expect(screen.queryByText("mensaje viejo")).not.toBeInTheDocument();

    // No reprograma un poll más allá del que causó el 404.
    const callsAfter404 = getPublicChatEvents.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(getPublicChatEvents).toHaveBeenCalledTimes(callsAfter404);
  });

  // 17 — 429 aplica backoff sin borrar la sesión, y vuelve a 3s tras el próximo éxito
  it("17) un 429 de /events no borra la sesión, aplica backoff, y vuelve al ritmo normal tras el próximo éxito", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    const rateLimited = new Error("Demasiadas solicitudes.");
    rateLimited.status = 429;
    rateLimited.retryAfterSeconds = 7;
    getPublicChatEvents.mockRejectedValueOnce(rateLimited);
    await vi.advanceTimersByTimeAsync(3000); // dispara el 2º poll (el que falla con 429)
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(2));

    // La sesión sigue viva — nunca se borró ni volvió a prechat.
    expect(sessionStorage.getItem("aira_public_chat_session_v1")).toBe("existing-session");
    expect(screen.queryByRole("heading", { name: /antes de comenzar/i })).not.toBeInTheDocument();

    // No reintenta antes del Retry-After real (7s) del backend.
    await vi.advanceTimersByTimeAsync(3000);
    expect(getPublicChatEvents).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(4000); // completa los 7s de backoff
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(3));

    // Tras el próximo poll exitoso, vuelve al ritmo normal de 3s.
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(4));
  });

  // 18 — 503 conserva sesión/historial y reintenta
  it("18) un 503 de /events conserva la sesión y el historial, y reintenta en el próximo ciclo", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    getPublicChatEvents.mockResolvedValueOnce({
      ok: true, messages: [serverMsg({ id: "m1", role: "agent", content: "hola humano" })], responder: humanResponder(),
    });
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(screen.getByText("hola humano")).toBeInTheDocument());

    const unavailable = new Error("El chat público no está disponible temporalmente.");
    unavailable.status = 503;
    getPublicChatEvents.mockRejectedValueOnce(unavailable);
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(2));

    // Sesión e historial intactos — nunca vuelve a prechat por un 503.
    expect(sessionStorage.getItem("aira_public_chat_session_v1")).toBe("existing-session");
    expect(screen.getByText("hola humano")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /antes de comenzar/i })).not.toBeInTheDocument();

    // Reintenta (backoff corto, 5s) — no queda colgado.
    await vi.advanceTimersByTimeAsync(5000);
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(3));
  });

  // 19 — error de red: mismo criterio que 503
  it("19) un error de red en /events conserva la sesión/historial y reintenta", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    getPublicChatEvents.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(2));

    expect(sessionStorage.getItem("aira_public_chat_session_v1")).toBe("existing-session");
    expect(screen.queryByRole("heading", { name: /antes de comenzar/i })).not.toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(5000);
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(3));
  });

  // 20 — AbortError es silencioso (nunca error visible, nunca reprograma desde acá)
  it("20) un AbortError (cleanup) nunca se muestra como error al visitante", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    const abortError = new DOMException("The operation was aborted.", "AbortError");
    getPublicChatEvents.mockImplementationOnce(() => Promise.reject(abortError));
    const { unmount } = render(<PublicChatWidget />);
    openWidget();
    await waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText(/no está disponible/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /antes de comenzar/i })).not.toBeInTheDocument();
    unmount();
  });

  // 22 — cerrar el widget no detiene el polling mientras la sesión sigue activa
  it("22) cerrar el panel no detiene el polling: sigue vivo mientras la sesión siga activa", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    closeWidget();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    getPublicChatEvents.mockResolvedValueOnce({
      ok: true, messages: [serverMsg({ id: "m1", role: "agent", content: "sigo aquí aunque cerraste" })], responder: humanResponder(),
    });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(2));

    // Al reabrir, el mensaje que llegó con el panel cerrado ya está ahí.
    openWidget();
    expect(screen.getByText("sigo aquí aunque cerraste")).toBeInTheDocument();
  });

  // 23 — /status nunca entra en un polling adicional (ya cubierto explícitamente arriba, ver
  // "16) no existe ningún timer recurrente consultando /status" — se deja constancia acá de
  // que sigue intacto tras H3B, sin duplicar el test).

  // 24 — regresión funcional: prechat/recognize/forget/409/citations/CTA siguen intactos
  // (cubierto por el resto de la suite de este archivo, que sigue en 100% verde tras H3B —
  // ver el resto de describes de este mismo archivo).
});

// ── FASE HANDOFF H3B.1 — reconciliación nunca usa mensajes históricos ya
// conocidos como candidatos para un pending NUEVO (P2 de la revisión de
// H3B: el matching por rol+contenido+orden podía "robar" un mensaje
// histórico idéntico si el snapshot todavía no incluía la fila real
// nueva). Ver knownServerIdsRef/reconcileMessages(..., knownServerIds).
describe("PublicChatWidget — H3B.1: reconciliación no usa historial para pending nuevos", () => {
  // Escenario completo del gate: OLD assistant "respuesta" ya conocida +
  // pending NEW assistant "respuesta" con CTA.
  it("una respuesta assistant nueva con CTA nunca se empareja con una histórica idéntica, hasta que la fila NUEVA real aparece", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    // Primer poll: el snapshot ya trae la respuesta HISTÓRICA (OLD).
    getPublicChatEvents.mockResolvedValueOnce({
      ok: true,
      messages: [serverMsg({ id: "old-1", role: "assistant", content: "respuesta", created_at: "2020-01-01T00:00:00Z" })],
      responder: AIRA_RESPONDER,
    });
    renderWithRouter(); // la CTA usa <Link>, necesita Router (mismo criterio que el test 12)
    openWidget();
    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(1));

    // El visitante dispara una respuesta NUEVA con el mismo texto exacto.
    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true,
      response_text: "respuesta",
      citations: [],
      cta: { type: "membership", label: "Ver planes", href: "/planes" },
      responder: AIRA_RESPONDER,
    });
    await typeAndSend("dame info de nuevo");
    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(2)); // OLD + pending NEW

    // Snapshot con solo OLD: la CTA nunca debe moverse a OLD, el pending
    // sigue visible con su CTA intacta.
    getPublicChatEvents.mockResolvedValueOnce({
      ok: true,
      messages: [serverMsg({ id: "old-1", role: "assistant", content: "respuesta", created_at: "2020-01-01T00:00:00Z" })],
      responder: AIRA_RESPONDER,
    });
    await vi.advanceTimersByTimeAsync(3000);

    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(2));
    let bubbles = Array.from(assistantBubbles());
    expect(bubbles[0].querySelector(".public-chat-widget__cta")).toBeNull(); // OLD sin CTA
    expect(bubbles[1].querySelector(".public-chat-widget__cta")).not.toBeNull(); // pending sigue con su CTA

    // Snapshot con OLD + NEW real: NEW recibe la CTA, el pending desaparece
    // (queda reemplazado por la fila NEW real, nunca duplicado).
    getPublicChatEvents.mockResolvedValueOnce({
      ok: true,
      messages: [
        serverMsg({ id: "old-1", role: "assistant", content: "respuesta", created_at: "2020-01-01T00:00:00Z" }),
        serverMsg({ id: "new-1", role: "assistant", content: "respuesta", created_at: "2026-01-01T00:00:05Z" }),
      ],
      responder: AIRA_RESPONDER,
    });
    await vi.advanceTimersByTimeAsync(3000);

    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(2)); // sigue en 2, nunca 3
    bubbles = Array.from(assistantBubbles());
    expect(bubbles[0].querySelector(".public-chat-widget__cta")).toBeNull(); // OLD sigue sin CTA
    expect(bubbles[1].querySelector(".public-chat-widget__cta")).not.toBeNull(); // NEW la recibió
  });

  // Dos pending idénticos, servidos por ids nuevos que llegan DE A UNO
  // (no en el mismo poll) — confirma que el matching en orden sigue
  // funcionando correctamente tras el fix de knownServerIds.
  it("dos pending idénticos se confirman de a uno, en el orden en que aparecen sus ids server nuevos", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    await typeAndSend("hola");
    await vi.waitFor(() => expect(userBubbles()).toHaveLength(1));
    await vi.waitFor(() => expect(screen.getByLabelText(/escribe tu mensaje/i)).not.toBeDisabled());
    await typeAndSend("hola");
    await vi.waitFor(() => expect(userBubbles()).toHaveLength(2));

    // Aparece un solo id nuevo "hola" — solo uno de los dos pending se confirma.
    getPublicChatEvents.mockResolvedValueOnce({
      ok: true,
      messages: [serverMsg({ id: "new-hola-1", role: "customer", content: "hola", created_at: "2026-01-01T00:00:00Z" })],
      responder: AIRA_RESPONDER,
    });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(userBubbles()).toHaveLength(2)); // uno confirmado + uno pending, sigue en 2

    // Aparece el segundo id nuevo — se confirma el segundo.
    getPublicChatEvents.mockResolvedValueOnce({
      ok: true,
      messages: [
        serverMsg({ id: "new-hola-1", role: "customer", content: "hola", created_at: "2026-01-01T00:00:00Z" }),
        serverMsg({ id: "new-hola-2", role: "customer", content: "hola", created_at: "2026-01-01T00:00:01Z" }),
      ],
      responder: AIRA_RESPONDER,
    });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(userBubbles()).toHaveLength(2)); // ambos confirmados, ninguno perdido ni triplicado
  });

  // RESTORE — el caso central del P2: historia restaurada con un id server
  // ya conocido + un pending idéntico restaurado junto a ella. El primer
  // poll tras el restore NO debe usar ese id histórico para consumir el
  // pending, aunque sea la primera corrida de esta cadena (knownServerIdsRef
  // debe sembrarse ANTES de ese primer poll, no arrancar vacío).
  it("con historia restaurada (id server conocido) + un pending idéntico también restaurado, el primer poll no consume el pending contra el histórico", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    sessionStorage.setItem(
      "aira_public_chat_history_v1",
      JSON.stringify([
        { id: "hist-1", role: "user", content: "hola", source: "server", citations: [] },
        { sendAttemptId: "pending-1", role: "user", content: "hola", pending: true, source: "local" },
      ])
    );
    // El primer poll tras el restore: el backend todavía no indexó el
    // segundo "hola" (el que generó el pending restaurado).
    getPublicChatEvents.mockResolvedValueOnce({
      ok: true,
      messages: [serverMsg({ id: "hist-1", role: "customer", content: "hola", created_at: "2020-01-01T00:00:00Z" })],
      responder: AIRA_RESPONDER,
    });
    render(<PublicChatWidget />);
    openWidget();
    await waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    // Deben seguir viéndose AMBOS "hola" — el histórico Y el pending
    // restaurado, nunca colapsados a uno solo por el primer poll.
    await waitFor(() => expect(userBubbles()).toHaveLength(2));
  });

  // LEGACY HISTORY — mensajes persistidos por el código previo a H3B
  // (sin id/sendAttemptId/source). El primer snapshot canónico los reemplaza
  // por completo, sin interpretarlos como pending outbound nuevos y sin
  // producir un duplicado (ni la copia legacy junto a la fila server real).
  it("historial legacy (sin id/source, de antes de H3B) no se interpreta como pending nuevo ni genera duplicados", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    sessionStorage.setItem(
      "aira_public_chat_history_v1",
      JSON.stringify([
        { role: "assistant", content: "Hola, soy el asistente virtual." },
        { role: "user", content: "hola" },
      ])
    );
    getPublicChatEvents.mockResolvedValueOnce({
      ok: true,
      messages: [
        serverMsg({ id: "srv-1", role: "customer", content: "hola", created_at: "2026-01-01T00:00:00Z" }),
        serverMsg({ id: "srv-2", role: "assistant", content: "Hola, soy el asistente virtual.", created_at: "2026-01-01T00:00:01Z" }),
      ],
      responder: AIRA_RESPONDER,
    });
    render(<PublicChatWidget />);
    openWidget();

    await waitFor(() => expect(userBubbles()).toHaveLength(1));
    expect(assistantBubbles()).toHaveLength(1);
  });
});

// ── FASE HANDOFF H3B.2 — carrera POST /message vs. poll /events ────────────
// Un poll corre en paralelo al POST del propio envío. Si el poll gana (la
// fila assistant real ya se incorporó y quedó "conocida" ANTES de que el
// POST resuelva del lado del navegador), el POST NUNCA debe agregar un
// segundo pending huérfano — debe reconocer su propia respuesta ya en
// pantalla y solo enriquecerla con la cta ahí mismo. Ver knownIdsAtSendStart
// en handleSend().
describe("PublicChatWidget — H3B.2: carrera POST /message vs. poll /events", () => {
  it("si el poll gana la carrera y ya incorpora la respuesta assistant, el POST tardío no duplica la burbuja y la CTA se aplica a la fila existente", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    renderWithRouter(); // la CTA usa <Link>
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    // El POST queda colgado (control manual) para simular que el poll gana.
    let resolvePost;
    sendPublicChatMessage.mockReturnValueOnce(new Promise((resolve) => { resolvePost = resolve; }));
    await typeAndSend("¿tienen membresías?");
    await vi.waitFor(() => expect(sendPublicChatMessage).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(userBubbles()).toHaveLength(1));

    // El poll gana: ya incorpora AMBAS filas server (customer + assistant)
    // ANTES de que el POST resuelva del lado del navegador. mockResolvedValue
    // (persistente, no *Once*): vi.waitFor bajo fake timers puede disparar
    // más de un ciclo de poll mientras reintenta -- un backend real siempre
    // devuelve el snapshot completo vigente, nunca "se olvida" entre polls,
    // así que el mock debe reflejar eso para no introducir un falso
    // positivo/negativo por un ciclo de poll extra e inevitable.
    getPublicChatEvents.mockResolvedValue({
      ok: true,
      messages: [
        serverMsg({ id: "srv-customer", role: "customer", content: "¿tienen membresías?", created_at: "2026-01-01T00:00:00Z" }),
        serverMsg({ id: "srv-assistant", role: "assistant", content: "Tenemos un plan que te puede interesar.", created_at: "2026-01-01T00:00:01Z" }),
      ],
      responder: AIRA_RESPONDER,
    });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(1)); // ya renderizada por el poll, sin CTA todavía
    expect(userBubbles()).toHaveLength(1); // el pending user ya quedó confirmado por este mismo poll
    expect(screen.queryByRole("link", { name: /ver planes/i })).not.toBeInTheDocument();

    // El POST resuelve TARDE, con la MISMA respuesta y una CTA.
    resolvePost({
      ok: true,
      response_text: "Tenemos un plan que te puede interesar.",
      citations: [],
      cta: { type: "membership", label: "Ver planes", href: "/planes" },
      responder: AIRA_RESPONDER,
    });
    await vi.advanceTimersByTimeAsync(3000);

    // Nunca una segunda burbuja — la CTA se aplicó a la fila que ya existía.
    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(1));
    expect(screen.getByRole("link", { name: /ver planes/i })).toBeInTheDocument();
  });

  it("si el POST gana la carrera (camino normal), sigue agregando su propio pending y no lo confunde con historial", async () => {
    // Regresión explícita: el fix de H3B.2 no debe romper el camino
    // normal (ya cubierto por el resto de la suite, p. ej. el test 11 de
    // H3B) — acá se confirma puntualmente que, sin ningún poll de por
    // medio, el POST sigue mostrando su respuesta de inmediato.
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "Ofrecemos fotografía y video.", citations: [], responder: AIRA_RESPONDER,
    });
    await typeAndSend("¿qué servicios ofrecen?");
    await waitFor(() => expect(assistantBubbles()).toHaveLength(1));
    expect(screen.getByText("Ofrecemos fotografía y video.")).toBeInTheDocument();
  });

  // 6 — sesión A→B mientras el POST de A sigue en vuelo
  it("una respuesta tardía del POST de la sesión A (ya reemplazada por B) se ignora por completo", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "session-a");
    renderWithRouter();
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    let resolvePostA;
    sendPublicChatMessage.mockReturnValueOnce(new Promise((resolve) => { resolvePostA = resolve; }));
    await typeAndSend("hola desde A");
    await vi.waitFor(() => expect(sendPublicChatMessage).toHaveBeenCalledTimes(1));

    // La sesión A expira (404 de /events) mientras el POST de A sigue en vuelo.
    const notFound = new Error("Sesión no encontrada.");
    notFound.status = 404;
    getPublicChatEvents.mockRejectedValueOnce(notFound);
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(screen.getByRole("heading", { name: /antes de comenzar/i })).toBeInTheDocument());

    // El visitante completa el pre-chat de nuevo y obtiene la sesión B.
    // No usa completePrechat()/waitFor de testing-library acá a propósito
    // -- su polling interno usa setTimeout real, que se cuelga bajo
    // vi.useFakeTimers(); se recrea el mismo flujo con vi.waitFor().
    startPublicChat.mockResolvedValueOnce({
      session_id: "session-b", visitor_id: "visitor-b", greeting: "hola de nuevo", responder: AIRA_RESPONDER,
    });
    await fillPrechatForm();
    fireEvent.click(screen.getByRole("button", { name: /comenzar conversación/i }));
    await vi.waitFor(() => expect(startPublicChat).toHaveBeenCalled());
    await vi.waitFor(() => expect(screen.getByText("hola de nuevo")).toBeInTheDocument());

    // El POST de A resuelve TARDE, con una CTA que nunca debería aplicarse a B.
    resolvePostA({
      ok: true,
      response_text: "respuesta tardía de A",
      citations: [],
      cta: { type: "membership", label: "CTA de A", href: "/a" },
      responder: humanResponder({ display_name: "Agente de A" }),
    });
    // Deja correr un ciclo completo de poll (3s) además de flushear
    // microtareas -- suficiente margen para que, SIN el guard, el estado
    // stale de A alcance a aplicarse antes de esta aserción.
    await vi.advanceTimersByTimeAsync(3000);

    expect(screen.queryByText("respuesta tardía de A")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /cta de a/i })).not.toBeInTheDocument();
    expect(headerTitleText()).toBe("AIRA"); // el responder de B no fue pisado por el de A
    // El composer de B sigue habilitado — isLoading no quedó atascado por el POST viejo.
    expect(screen.getByLabelText(/escribe tu mensaje/i)).not.toBeDisabled();
  });

  // 7 — regresión: los tests de H3B.1 siguen verdes (ver el describe
  // "PublicChatWidget — H3B.1: reconciliación no usa historial para
  // pending nuevos" más arriba en este mismo archivo, sin cambios).
});

// ── FASE HANDOFF H3B.3 — asociación estable send↔servidor + persistencia
// de CTA/sendAttemptId por id server a través de MÚLTIPLES polls ─────────
// Corrige dos P2 relacionados de la revisión de H3B.2:
//  1) knownIdsAtSendStart por sí solo no distingue "fila que apareció
//     durante MI envío" de "fila que en realidad pertenece a OTRO envío
//     con contenido idéntico que seguía pendiente" -- se agrega
//     claimByServerIdRef (Map<serverId, {sendAttemptId, cta}>) como única
//     fuente de verdad de "quién ya reclamó esta fila".
//  2) esa misma cta debe sobrevivir a TODOS los polls siguientes, no solo
//     al primero -- /events nunca la expone, así que sin persistencia
//     explícita desaparece en el segundo poll.
describe("PublicChatWidget — H3B.3: asociación estable send↔servidor y persistencia de CTA", () => {
  it("dos sends consecutivos con respuesta idéntica: el segundo nunca reclama la fila ya reclamada por el primero, ni le pisa la CTA", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    renderWithRouter();
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    // SEND1 (sendAttemptId implícito "SEND1"): resuelve rápido, antes de
    // que cualquier poll llegue a ver su fila real.
    let resolveSend1;
    sendPublicChatMessage.mockReturnValueOnce(new Promise((resolve) => { resolveSend1 = resolve; }));
    await typeAndSend("hola de nuevo");
    await vi.waitFor(() => expect(sendPublicChatMessage).toHaveBeenCalledTimes(1));
    resolveSend1({
      ok: true, response_text: "respuesta", citations: [],
      cta: { type: "membership", label: "CTA1", href: "/cta1" },
      responder: AIRA_RESPONDER,
    });
    await vi.advanceTimersByTimeAsync(0);
    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(1)); // pending local de SEND1
    await vi.waitFor(() => expect(screen.getByLabelText(/escribe tu mensaje/i)).not.toBeDisabled());

    // SEND2 (sendAttemptId "SEND2"): mismo texto de usuario, misma
    // respuesta esperada de AIRA -- también queda en vuelo.
    let resolveSend2;
    sendPublicChatMessage.mockReturnValueOnce(new Promise((resolve) => { resolveSend2 = resolve; }));
    await typeAndSend("hola de nuevo");
    await vi.waitFor(() => expect(sendPublicChatMessage).toHaveBeenCalledTimes(2));

    // Mientras SEND2 sigue en vuelo, un poll descubre por primera vez la
    // fila real de SEND1 y la reclama correctamente para SEND1.
    // mockResolvedValue (persistente, no *Once*): vi.waitFor bajo fake
    // timers puede disparar más de un ciclo de poll mientras reintenta —
    // un backend real siempre devuelve el snapshot completo vigente.
    getPublicChatEvents.mockResolvedValue({
      ok: true,
      messages: [serverMsg({ id: "srv-send1", role: "assistant", content: "respuesta", created_at: "2026-01-01T00:00:00Z" })],
      responder: AIRA_RESPONDER,
    });
    await vi.advanceTimersByTimeAsync(3000);
    // Todavía 1 sola burbuja: SEND1 ya confirmada (ahora source:"server"),
    // SEND2 ni siquiera agregó la suya (su POST sigue colgado, recién se
    // agrega cuando resuelve — ver más abajo).
    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(1));
    expect(screen.getByRole("link", { name: /^CTA1$/i })).toBeInTheDocument();

    // SEND2 resuelve TARDE, con SU PROPIA cta -- nunca debe robar la fila
    // de SEND1 (ya reclamada) ni pisar CTA1.
    resolveSend2({
      ok: true, response_text: "respuesta", citations: [],
      cta: { type: "membership", label: "CTA2", href: "/cta2" },
      responder: AIRA_RESPONDER,
    });
    await vi.advanceTimersByTimeAsync(3000);

    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(2)); // sigue en 2, nunca se fusionan
    expect(screen.getByRole("link", { name: /^CTA1$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^CTA2$/i })).toBeInTheDocument();
  });

  it("una CTA ya reclamada por un id server sobrevive a los polls siguientes, aunque /events nunca la devuelva", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    renderWithRouter();
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true,
      response_text: "Tenemos un plan que te puede interesar.",
      citations: [],
      cta: { type: "membership", label: "Ver planes", href: "/planes" },
      responder: AIRA_RESPONDER,
    });
    await typeAndSend("¿tienen membresías?");
    await vi.waitFor(() => expect(screen.getByRole("link", { name: /ver planes/i })).toBeInTheDocument());

    const snapshotConCta = () => ({
      ok: true,
      messages: [
        serverMsg({ id: "srv-customer", role: "customer", content: "¿tienen membresías?", created_at: "2026-01-01T00:00:00Z" }),
        serverMsg({ id: "srv-assistant", role: "assistant", content: "Tenemos un plan que te puede interesar.", created_at: "2026-01-01T00:00:01Z" }),
      ],
      responder: AIRA_RESPONDER,
    });

    // Primer poll: reconcilia y reclama la fila server -- la cta se traslada.
    getPublicChatEvents.mockResolvedValueOnce(snapshotConCta());
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(screen.getByRole("link", { name: /ver planes/i })).toBeInTheDocument());

    // Segundo poll: /events sigue devolviendo la MISMA fila SIN cta (nunca
    // la expone) -- debe seguir viéndose, nunca desaparecer.
    getPublicChatEvents.mockResolvedValueOnce(snapshotConCta());
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(3));
    expect(screen.getByRole("link", { name: /ver planes/i })).toBeInTheDocument();

    // Tercer poll — refuerza que no es casualidad de un solo ciclo extra.
    getPublicChatEvents.mockResolvedValueOnce(snapshotConCta());
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(4));
    expect(screen.getByRole("link", { name: /ver planes/i })).toBeInTheDocument();
    expect(assistantBubbles()).toHaveLength(1); // nunca duplicada tampoco
  });
});
