import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("@/services/publicChatApi.js", () => ({
  startPublicChat: vi.fn(),
  sendPublicChatMessage: vi.fn(),
  getPublicChatEvents: vi.fn(),
}));

const { default: PublicChatWidget } = await import("@/components/chat/PublicChatWidget.jsx");
const { startPublicChat, sendPublicChatMessage, getPublicChatEvents } = await import("@/services/publicChatApi.js");

function openWidget() {
  fireEvent.click(screen.getByRole("button", { name: /abrir chat/i }));
}

async function typeAndSend(text) {
  const input = screen.getByLabelText(/escribe tu mensaje/i);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: /enviar mensaje/i }));
  return input;
}

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
  startPublicChat.mockResolvedValue({
    session_id: "session-1",
    visitor_id: "visitor-1",
    greeting: "¡Hola! ¿En qué puedo ayudarte?",
  });
  sendPublicChatMessage.mockResolvedValue({
    ok: true,
    response_text: "Ofrecemos fotografía y video.",
    knowledge_used: true,
    citations: [{ citation_id: "C1", document_title: "Servicios", section_title: null, label: "Servicios" }],
    request_id: "req-1",
  });
  getPublicChatEvents.mockResolvedValue({ events: [] });
});

describe("PublicChatWidget — estado inicial", () => {
  it("renderiza cerrado por defecto (solo el botón flotante)", () => {
    render(<PublicChatWidget />);
    expect(screen.getByRole("button", { name: /abrir chat/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(startPublicChat).not.toHaveBeenCalled();
  });
});

describe("PublicChatWidget — apertura e inicio de sesión", () => {
  it("al abrir, inicia sesión y muestra el saludo", async () => {
    render(<PublicChatWidget />);
    openWidget();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await waitFor(() => expect(startPublicChat).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("¡Hola! ¿En qué puedo ayudarte?")).toBeInTheDocument();
  });

  it("reutiliza la sesión existente en sessionStorage sin volver a llamar a start", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await waitFor(() => expect(startPublicChat).not.toHaveBeenCalled());
  });
});

describe("PublicChatWidget — envío de mensajes", () => {
  it("envía un mensaje, muestra la burbuja del usuario y la respuesta con citas", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    await typeAndSend("¿qué servicios ofrecen?");

    expect(await screen.findByText("¿qué servicios ofrecen?")).toBeInTheDocument();
    expect(await screen.findByText("Ofrecemos fotografía y video.")).toBeInTheDocument();
    expect(screen.getByText("Servicios")).toBeInTheDocument();
    expect(sendPublicChatMessage).toHaveBeenCalledWith("session-1", "¿qué servicios ofrecen?");
  });

  it("limpia el input después de enviar", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    const input = await typeAndSend("hola");
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("no permite enviar un mensaje vacío", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    expect(screen.getByRole("button", { name: /enviar mensaje/i })).toBeDisabled();
    expect(sendPublicChatMessage).not.toHaveBeenCalled();
  });
});

describe("PublicChatWidget — manejo de errores", () => {
  it("muestra un mensaje amigable cuando hay rate limiting (429)", async () => {
    const error = new Error("Too many requests");
    error.status = 429;
    sendPublicChatMessage.mockRejectedValueOnce(error);

    render(<PublicChatWidget />);
    openWidget();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    await typeAndSend("hola de nuevo");

    expect(await screen.findByText(/muy rápido/i)).toBeInTheDocument();
  });

  it("reintenta transparentemente cuando la sesión expiró (404)", async () => {
    const error = new Error("Not found");
    error.status = 404;
    sendPublicChatMessage.mockRejectedValueOnce(error);
    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "Respuesta tras reintento.", knowledge_used: false, citations: [], request_id: "req-2",
    });
    startPublicChat.mockResolvedValueOnce({ session_id: "session-1", visitor_id: "v1", greeting: "Hola" });
    startPublicChat.mockResolvedValueOnce({ session_id: "session-2", visitor_id: "v2", greeting: "Hola de nuevo" });

    render(<PublicChatWidget />);
    openWidget();
    await screen.findByText("Hola");

    await typeAndSend("pregunta");

    expect(await screen.findByText("Respuesta tras reintento.")).toBeInTheDocument();
    expect(startPublicChat).toHaveBeenCalledTimes(2);
  });
});

describe("PublicChatWidget — Centro de Conversaciones (toma de control humano)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sondea periódicamente y muestra la respuesta de un agente humano sin que el visitante escriba de nuevo", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getPublicChatEvents.mockResolvedValue({
      events: [{ id: "srv-1", role: "agent", content: "¡Hola! Soy Ana, ¿en qué te ayudo?", created_at: "2026-08-05T10:00:05Z" }],
    });

    render(<PublicChatWidget />);
    openWidget();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    await vi.advanceTimersByTimeAsync(5000);

    expect(await screen.findByText("¡Hola! Soy Ana, ¿en qué te ayudo?")).toBeInTheDocument();
  });

  it("nunca duplica un mensaje ya mostrado por la respuesta directa de /message", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // El servidor real solo devuelve eventos creados DESPUÉS del cursor
    // "after" — se simula acá devolviendo el evento solo mientras no se
    // haya pasado ningún cursor, igual que haría una consulta real
    // `created_at > after`. Tras enviar un mensaje, el widget avanza el
    // cursor a "ahora", así que un poll posterior ya no debería verlo.
    getPublicChatEvents.mockImplementation((_sessionId, after) =>
      Promise.resolve({
        events: after ? [] : [{ id: "srv-2", role: "assistant", content: "Ofrecemos fotografía y video.", created_at: "2026-08-05T10:00:00Z" }],
      })
    );

    render(<PublicChatWidget />);
    openWidget();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    const input = screen.getByLabelText(/escribe tu mensaje/i);
    fireEvent.change(input, { target: { value: "hola" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar mensaje/i }));
    await screen.findByText("Ofrecemos fotografía y video.");

    await vi.advanceTimersByTimeAsync(5000);

    const matches = await screen.findAllByText("Ofrecemos fotografía y video.");
    expect(matches).toHaveLength(1);
  });

  it("nunca muestra los mensajes del propio visitante devueltos por el polling (evita eco duplicado)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getPublicChatEvents.mockResolvedValue({
      events: [{ id: "srv-3", role: "user", content: "hola", created_at: "2026-08-05T10:00:00Z" }],
    });

    render(<PublicChatWidget />);
    openWidget();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    await vi.advanceTimersByTimeAsync(5000);

    const matches = screen.queryAllByText("hola");
    expect(matches).toHaveLength(0);
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
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    const input = screen.getByLabelText(/escribe tu mensaje/i);
    expect(input).toHaveAttribute("maxlength", "800");
  });
});
