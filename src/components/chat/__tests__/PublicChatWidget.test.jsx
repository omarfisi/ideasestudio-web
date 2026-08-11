import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("@/services/publicChatApi.js", () => ({
  startPublicChat: vi.fn(),
  sendPublicChatMessage: vi.fn(),
  verifyPrechat: vi.fn(),
}));

vi.mock("@/lib/publicFormsApi.js", () => ({
  submitPublicForm: vi.fn(),
}));

const { default: PublicChatWidget } = await import("@/components/chat/PublicChatWidget.jsx");
const { startPublicChat, sendPublicChatMessage, verifyPrechat } = await import("@/services/publicChatApi.js");
const { submitPublicForm } = await import("@/lib/publicFormsApi.js");

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
  });
  sendPublicChatMessage.mockResolvedValue({
    ok: true,
    response_text: "Ofrecemos fotografía y video.",
    knowledge_used: true,
    citations: [{ citation_id: "C1", document_title: "Servicios", section_title: null, label: "Servicios" }],
    request_id: "req-1",
  });
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
    expect(sendPublicChatMessage).toHaveBeenCalledWith("session-1", "¿qué servicios ofrecen?");
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
