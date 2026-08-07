import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("@/services/publicChatApi.js", () => ({
  startPublicChat: vi.fn(),
  sendPublicChatMessage: vi.fn(),
  getPublicChatEvents: vi.fn(),
  ratePublicChat: vi.fn(),
}));

const { default: PublicChatWidget } = await import("@/components/chat/PublicChatWidget.jsx");
const { startPublicChat, sendPublicChatMessage, getPublicChatEvents, ratePublicChat } = await import("@/services/publicChatApi.js");

function openWidget() {
  fireEvent.click(screen.getByRole("button", { name: /abrir soporte técnico/i }));
}

async function goToThreadViaAskQuestion() {
  openWidget();
  await screen.findByText("¡Hola! 👋");
  fireEvent.click(screen.getByRole("button", { name: /hacer una pregunta/i }));
  await screen.findByPlaceholderText(/escribe tu pregunta/i);
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
  Object.defineProperty(window.navigator, "onLine", { value: true, writable: true, configurable: true });
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
    control_mode: "ai",
  });
  getPublicChatEvents.mockResolvedValue({ events: [], control_mode: "ai", support_status: "new", agent_name: null });
  ratePublicChat.mockResolvedValue({ ok: true, already_rated: false });
});

describe("PublicChatWidget — estado cerrado", () => {
  it("renderiza cerrado por defecto como una cápsula con el texto 'Soporte Técnico'", () => {
    render(<PublicChatWidget />);
    const toggle = screen.getByRole("button", { name: /abrir soporte técnico/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveTextContent("Soporte Técnico");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(startPublicChat).not.toHaveBeenCalled();
  });
});

describe("PublicChatWidget — pantalla inicial (home)", () => {
  it("al abrir muestra el saludo, categorías rápidas y las 3 acciones", async () => {
    render(<PublicChatWidget />);
    openWidget();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByText("¡Hola! 👋")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cotización" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fotografía" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hacer una pregunta/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buscar en la documentación/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hablar con una persona/i })).toBeInTheDocument();
  });

  it("'Hacer una pregunta' navega al hilo sin enviar ningún mensaje todavía", async () => {
    render(<PublicChatWidget />);
    await goToThreadViaAskQuestion();
    await waitFor(() => expect(startPublicChat).toHaveBeenCalledTimes(1));
    expect(sendPublicChatMessage).not.toHaveBeenCalled();
  });

  it("clickear una categoría envía un primer mensaje real con esa categoría", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await screen.findByText("¡Hola! 👋");
    fireEvent.click(screen.getByRole("button", { name: "Fotografía" }));

    await waitFor(() => expect(sendPublicChatMessage).toHaveBeenCalled());
    expect(sendPublicChatMessage.mock.calls[0][1]).toMatch(/Fotografía/);
    expect(await screen.findByText(/Fotografía/)).toBeInTheDocument();
  });

  it("'Hablar con una persona' envía un mensaje real señalando la intención", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await screen.findByText("¡Hola! 👋");
    fireEvent.click(screen.getByRole("button", { name: /hablar con una persona/i }));

    await waitFor(() => expect(sendPublicChatMessage).toHaveBeenCalled());
    expect(sendPublicChatMessage.mock.calls[0][1]).toMatch(/hablar con una persona/i);
  });
});

describe("PublicChatWidget — conversación con AIRA", () => {
  it("envía un mensaje, muestra la burbuja del usuario y la respuesta con citas", async () => {
    render(<PublicChatWidget />);
    await goToThreadViaAskQuestion();

    await typeAndSend("¿qué servicios ofrecen?");

    expect(await screen.findByText("¿qué servicios ofrecen?")).toBeInTheDocument();
    expect(await screen.findByText("Ofrecemos fotografía y video.")).toBeInTheDocument();
    expect(screen.getByText("Servicios")).toBeInTheDocument();
    expect(sendPublicChatMessage).toHaveBeenCalledWith("session-1", "¿qué servicios ofrecen?");
  });

  it("limpia el input después de enviar", async () => {
    render(<PublicChatWidget />);
    await goToThreadViaAskQuestion();

    const input = await typeAndSend("hola");
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("no permite enviar un mensaje vacío", async () => {
    render(<PublicChatWidget />);
    await goToThreadViaAskQuestion();
    expect(screen.getByRole("button", { name: /enviar mensaje/i })).toBeDisabled();
    expect(sendPublicChatMessage).not.toHaveBeenCalled();
  });

  it("Enter envía el mensaje y Shift+Enter no lo envía", async () => {
    render(<PublicChatWidget />);
    await goToThreadViaAskQuestion();
    const input = screen.getByLabelText(/escribe tu mensaje/i);

    fireEvent.change(input, { target: { value: "con salto" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(sendPublicChatMessage).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "hola" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(sendPublicChatMessage).toHaveBeenCalledWith("session-1", "hola"));
  });
});

describe("PublicChatWidget — toma de control humano", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("muestra la franja 'esperando agente' cuando control_mode es human y todavía no respondió", async () => {
    sendPublicChatMessage.mockResolvedValue({
      ok: true, response_text: "Un miembro de nuestro equipo está revisando tu conversación y te responderá en breve.",
      knowledge_used: false, citations: [], request_id: "req-2", control_mode: "human", agent_name: null,
    });
    const user = render(<PublicChatWidget />);
    await goToThreadViaAskQuestion();
    await typeAndSend("hola, necesito ayuda");

    expect(await screen.findByText(/esperando a que un agente tome tu conversación/i)).toBeInTheDocument();
    user.unmount();
  });

  it("cuando un agente toma la conversación, se narra su nombre como evento del sistema y se actualiza el estado del header", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<PublicChatWidget />);
    await goToThreadViaAskQuestion();

    getPublicChatEvents.mockResolvedValue({
      events: [{ id: "srv-1", role: "agent", content: "¡Hola! Soy Ana, ¿en qué te ayudo?", created_at: "2026-08-06T10:00:05Z" }],
      control_mode: "human", support_status: "open", agent_name: "Ana",
    });

    await vi.advanceTimersByTimeAsync(5000);

    expect(await screen.findByText(/Ana se unió a la conversación/i)).toBeInTheDocument();
    expect(await screen.findByText("¡Hola! Soy Ana, ¿en qué te ayudo?")).toBeInTheDocument();
    expect(await screen.findByText(/Ana disponible/i)).toBeInTheDocument();
  });
});

describe("PublicChatWidget — resolución y valoración", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("al resolverse la conversación (detectado por polling) se muestra la tarjeta de valoración con 5 estrellas", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<PublicChatWidget />);
    await goToThreadViaAskQuestion();

    getPublicChatEvents.mockResolvedValue({ events: [], control_mode: "human", support_status: "resolved", agent_name: "Ana" });
    await vi.advanceTimersByTimeAsync(5000);

    expect(await screen.findByText(/la conversación fue marcada como resuelta/i)).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    // El composer se deshabilita — no tiene sentido seguir escribiendo en una conversación resuelta sin haber creado una nueva.
    expect(screen.getByLabelText(/escribe tu mensaje/i)).toBeDisabled();
  });

  it("enviar una valoración llama a ratePublicChat con el puntaje y comentario, y ofrece iniciar una nueva conversación", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<PublicChatWidget />);
    await goToThreadViaAskQuestion();
    getPublicChatEvents.mockResolvedValue({ events: [], control_mode: "human", support_status: "resolved", agent_name: "Ana" });
    await vi.advanceTimersByTimeAsync(5000);
    await screen.findByText(/la conversación fue marcada como resuelta/i);

    fireEvent.click(screen.getByRole("radio", { name: "4 de 5 estrellas" }));
    fireEvent.change(screen.getByPlaceholderText(/comentario/i), { target: { value: "Muy buena atención" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar valoración/i }));

    await waitFor(() => expect(ratePublicChat).toHaveBeenCalledWith("session-1", 4, "Muy buena atención"));
    expect(await screen.findByText(/gracias por tu valoración/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /crear nueva conversación/i })).toBeInTheDocument();
  });

  it("'Crear nueva conversación' limpia la sesión y vuelve a la pantalla inicial", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<PublicChatWidget />);
    await goToThreadViaAskQuestion();
    getPublicChatEvents.mockResolvedValue({ events: [], control_mode: "human", support_status: "resolved", agent_name: "Ana" });
    await vi.advanceTimersByTimeAsync(5000);
    await screen.findByText(/la conversación fue marcada como resuelta/i);

    fireEvent.click(screen.getByRole("radio", { name: "5 de 5 estrellas" }));
    fireEvent.click(screen.getByRole("button", { name: /enviar valoración/i }));
    await screen.findByRole("button", { name: /crear nueva conversación/i });

    fireEvent.click(screen.getByRole("button", { name: /crear nueva conversación/i }));

    expect(await screen.findByText("¡Hola! 👋")).toBeInTheDocument();
    expect(sessionStorage.getItem("aira_public_chat_session_v1")).toBeNull();
  });
});

describe("PublicChatWidget — manejo de errores", () => {
  it("muestra un mensaje amigable cuando hay rate limiting (429)", async () => {
    const error = new Error("Too many requests");
    error.status = 429;
    sendPublicChatMessage.mockRejectedValueOnce(error);

    render(<PublicChatWidget />);
    await goToThreadViaAskQuestion();
    await typeAndSend("hola de nuevo");

    expect(await screen.findByText(/muy rápido/i)).toBeInTheDocument();
  });

  it("reintenta transparentemente cuando la sesión expiró (404)", async () => {
    const error = new Error("Not found");
    error.status = 404;
    sendPublicChatMessage.mockRejectedValueOnce(error);
    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "Respuesta tras reintento.", knowledge_used: false, citations: [], request_id: "req-2", control_mode: "ai",
    });
    startPublicChat.mockResolvedValueOnce({ session_id: "session-1", visitor_id: "v1", greeting: "Hola" });
    startPublicChat.mockResolvedValueOnce({ session_id: "session-2", visitor_id: "v2", greeting: "Hola de nuevo" });

    render(<PublicChatWidget />);
    await goToThreadViaAskQuestion();
    await typeAndSend("pregunta");

    expect(await screen.findByText("Respuesta tras reintento.")).toBeInTheDocument();
    expect(startPublicChat).toHaveBeenCalledTimes(2);
  });

  it("muestra una franja de 'sin conexión' cuando el navegador pierde internet y deshabilita el composer", async () => {
    render(<PublicChatWidget />);
    await goToThreadViaAskQuestion();

    Object.defineProperty(window.navigator, "onLine", { value: false, writable: true, configurable: true });
    fireEvent(window, new Event("offline"));

    await waitFor(() =>
      expect(document.querySelector(".public-chat-widget__banner--offline")).toBeInTheDocument()
    );
    expect(screen.getByLabelText(/escribe tu mensaje/i)).toBeDisabled();

    Object.defineProperty(window.navigator, "onLine", { value: true, writable: true, configurable: true });
    fireEvent(window, new Event("online"));
    await waitFor(() =>
      expect(document.querySelector(".public-chat-widget__banner--offline")).not.toBeInTheDocument()
    );
  });
});

describe("PublicChatWidget — Centro de Conversaciones (polling)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sondea periódicamente y muestra la respuesta de un agente humano sin que el visitante escriba de nuevo", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getPublicChatEvents.mockResolvedValue({
      events: [{ id: "srv-1", role: "agent", content: "¡Hola! Soy Ana, ¿en qué te ayudo?", created_at: "2026-08-06T10:00:05Z" }],
      control_mode: "human", support_status: "open", agent_name: "Ana",
    });

    render(<PublicChatWidget />);
    await goToThreadViaAskQuestion();

    await vi.advanceTimersByTimeAsync(5000);

    expect(await screen.findByText("¡Hola! Soy Ana, ¿en qué te ayudo?")).toBeInTheDocument();
  });

  it("nunca duplica un mensaje ya mostrado por la respuesta directa de /message", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getPublicChatEvents.mockImplementation((_sessionId, after) =>
      Promise.resolve({
        events: after ? [] : [{ id: "srv-2", role: "assistant", content: "Ofrecemos fotografía y video.", created_at: "2026-08-06T10:00:00Z" }],
        control_mode: "ai", support_status: "new", agent_name: null,
      })
    );

    render(<PublicChatWidget />);
    await goToThreadViaAskQuestion();
    fireEvent.change(screen.getByLabelText(/escribe tu mensaje/i), { target: { value: "hola" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar mensaje/i }));
    await screen.findByText("Ofrecemos fotografía y video.");

    await vi.advanceTimersByTimeAsync(5000);

    const matches = await screen.findAllByText("Ofrecemos fotografía y video.");
    expect(matches).toHaveLength(1);
  });

  it("nunca muestra los mensajes del propio visitante devueltos por el polling (evita eco duplicado)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getPublicChatEvents.mockResolvedValue({
      events: [{ id: "srv-3", role: "user", content: "hola", created_at: "2026-08-06T10:00:00Z" }],
      control_mode: "ai", support_status: "new", agent_name: null,
    });

    render(<PublicChatWidget />);
    await goToThreadViaAskQuestion();
    await vi.advanceTimersByTimeAsync(5000);

    const matches = screen.queryAllByText("hola");
    expect(matches).toHaveLength(0);
  });
});

describe("PublicChatWidget — seguridad", () => {
  it("nunca ejecuta HTML/scripts en una respuesta del backend, siempre lo muestra como texto plano", async () => {
    const malicious = '<img src=x onerror="window.__xss_fired = true">Hola<script>window.__xss_fired = true</script>';
    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: malicious, knowledge_used: false, citations: [], request_id: "req-xss", control_mode: "ai",
    });
    window.__xss_fired = undefined;

    render(<PublicChatWidget />);
    await goToThreadViaAskQuestion();
    await typeAndSend("intento de inyección");

    expect(await screen.findByText(malicious)).toBeInTheDocument();
    expect(document.querySelector(".public-chat-widget script")).toBeNull();
    expect(document.querySelector(".public-chat-widget img[src='x']")).toBeNull();
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
    await goToThreadViaAskQuestion();
    const input = screen.getByLabelText(/escribe tu mensaje/i);
    expect(input).toHaveAttribute("maxlength", "800");
  });

  it("el listado de mensajes usa aria-live para anunciar mensajes nuevos", async () => {
    render(<PublicChatWidget />);
    await goToThreadViaAskQuestion();
    const messagesRegion = document.querySelector(".public-chat-widget__messages");
    expect(messagesRegion).toHaveAttribute("aria-live", "polite");
  });
});
