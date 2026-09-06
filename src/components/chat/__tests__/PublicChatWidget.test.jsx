import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StrictMode } from "react";
import { act, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/services/publicChatApi.js", () => ({
  startPublicChat: vi.fn(),
  sendPublicChatMessage: vi.fn(),
  verifyPrechat: vi.fn(),
  getPublicChatStatus: vi.fn(),
  getPublicChatEvents: vi.fn(),
  getPublicAvatarRuntime: vi.fn(),
  requestPublicChatHuman: vi.fn(),
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
  getPublicAvatarRuntime,
  requestPublicChatHuman,
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

function widgetRoot() {
  return document.querySelector(".public-chat-widget");
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

function setScrollMetrics(element, { scrollHeight = 1000, clientHeight = 400, scrollTop = 600 } = {}) {
  Object.defineProperty(element, "scrollHeight", { configurable: true, value: scrollHeight });
  Object.defineProperty(element, "clientHeight", { configurable: true, value: clientHeight });
  Object.defineProperty(element, "scrollTop", { configurable: true, writable: true, value: scrollTop });
}

// P0 SCROLL — USER-GESTURE LOCK. The widget now arms reading mode
// directly from the raw gesture (touchstart/touchmove/wheel/pointerdown)
// on the history, never from scrollTop deltas alone — a bare
// fireEvent.scroll() no longer represents "the visitor is interacting"
// by itself. This helper simulates a real visitor scroll the way the
// component now actually listens for it: gesture first, then the
// resulting position + its 'scroll' event.
function userScrollsMessages(element, scrollMetrics) {
  fireEvent.touchStart(element);
  fireEvent.touchMove(element);
  setScrollMetrics(element, scrollMetrics);
  fireEvent.scroll(element);
}

function publicAvatarRuntime(overrides = {}) {
  const expiresAt = new Date(Date.now() + 300_000).toISOString();
  return {
    profile: "aira",
    variant: "default",
    version: 1,
    default_pose: "neutral",
    expires_at: expiresAt,
    poses: {
      neutral: { url: "https://cdn.example/neutral.png", expires_at: expiresAt },
      waving: { url: "https://cdn.example/waving.png", expires_at: expiresAt },
    },
    rules: [
      {
        event_key: "chat.opened",
        rule_type: "pose",
        payload: { pose: "waving", duration_ms: 1300, next: "neutral" },
      },
    ],
    ...overrides,
  };
}

describe("PublicChatWidget — runtime visual público de AIRA", () => {
  it("expone un rail cerrado específico para mobile y un estado fullscreen al abrir", async () => {
    getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime());
    render(<PublicChatWidget />);

    const launcher = screen.getByRole("button", { name: /abrir chat/i });
    expect(launcher).toHaveClass("public-chat-widget__toggle--mobile-rail");
    expect(widgetRoot()).not.toHaveClass("public-chat-widget--open");
    expect(screen.getByLabelText(/aira invitando a abrir el chat/i)).toBeInTheDocument();

    openWidget();
    expect(widgetRoot()).toHaveClass("public-chat-widget--open");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByLabelText(/aira invitando a abrir el chat/i)).not.toBeInTheDocument();

    closeWidget();
    expect(widgetRoot()).not.toHaveClass("public-chat-widget--open");
    expect(screen.getByRole("button", { name: /abrir chat/i })).toHaveClass("public-chat-widget__toggle--mobile-rail");
  });

  it("mantiene stage, mensajes, acciones, handoff y composer como regiones hermanas", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime());
    render(<PublicChatWidget />);
    openWidget();

    const panel = screen.getByRole("dialog");
    const stage = await screen.findByRole("region", { name: /vista previa del avatar aira/i });
    const messages = panel.querySelector(".public-chat-widget__messages");
    const handoff = panel.querySelector(".public-chat-widget__handoff-bar");
    const composer = screen.getByRole("button", { name: /enviar mensaje/i }).closest("form");

    expect(stage.parentElement).toBe(panel);
    expect(messages.parentElement).toBe(panel);
    expect(panel.querySelector(".public-chat-widget__quick-actions")).toBeNull();
    expect(handoff.parentElement).toBe(panel);
    expect(composer.parentElement).toBe(panel);
    expect(messages).not.toContainElement(stage);
  });

  it("mantiene el personaje del launcher fuera del botón y lo reemplaza por el stage al abrir", async () => {
    getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime());
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);

    const launcher = screen.getByRole("button", { name: /abrir chat/i });
    const launcherCharacter = screen.getByLabelText(/aira invitando a abrir el chat/i);
    const launcherImage = launcherCharacter.querySelector("img");
    expect(launcherCharacter).not.toBe(launcher);
    expect(launcher).not.toContainElement(launcherCharacter);
    const portrait = await screen.findByRole("img", { name: "AIRA" });
    expect(launcher).toContainElement(portrait);
    expect(portrait).toHaveAttribute("src", "https://cdn.example/neutral.png");
    expect(portrait.closest(".public-chat-widget__launcher-portrait")).toBeInTheDocument();
    expect(launcherImage).toHaveClass("public-chat-widget__launcher-image");
    expect(launcherImage).toHaveAttribute("src", expect.stringContaining("aira-point-viewer.png"));
    expect(launcher).toHaveTextContent("Iniciar conversación");

    openWidget();
    expect(screen.queryByLabelText(/aira invitando a abrir el chat/i)).not.toBeInTheDocument();
    expect(await screen.findByRole("img", { name: /AIRA:/i })).toBeInTheDocument();
    expect(document.querySelector(".public-chat-widget__stage")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ivox/i })).toBeDisabled();
    expect(screen.getByRole("group", { name: /escoge con quién hablar/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/acciones rápidas/i)).not.toBeInTheDocument();
  });

  it("alterna point-viewer e invite-chat únicamente en el personaje externo", () => {
    vi.useFakeTimers();
    getPublicAvatarRuntime.mockReturnValueOnce(new Promise(() => {}));
    render(<PublicChatWidget />);

    const launcher = screen.getByRole("button", { name: /abrir chat/i });
    const externalImage = screen.getByLabelText(/aira invitando a abrir el chat/i).querySelector("img");
    expect(externalImage).toHaveAttribute("src", expect.stringContaining("aira-point-viewer.png"));
    expect(launcher.querySelector("img")).toBeNull();

    act(() => vi.advanceTimersByTime(1_100));

    expect(externalImage).toHaveAttribute("src", expect.stringContaining("aira-invite-chat.png"));
    expect(launcher.querySelector("img")).toBeNull();
  });

  it("usa el icono genérico únicamente mientras el runtime neutral no está disponible", () => {
    getPublicAvatarRuntime.mockReturnValueOnce(new Promise(() => {}));
    render(<PublicChatWidget />);

    const launcher = screen.getByRole("button", { name: /abrir chat/i });
    expect(launcher.querySelector("img")).toBeNull();
    expect(launcher.querySelector(".public-chat-widget__avatar-placeholder--aira")).toBeInTheDocument();
  });

  it.each([1, 5, 15])(
    "mantiene el stage compacto y los mensajes en flujo normal con %i mensajes reales",
    async (messageCount) => {
      const history = Array.from({ length: messageCount }, (_, index) => ({
        id: `user-${index}`,
        role: "user",
        content: `Mensaje ${index + 1}`,
        source: "server",
      }));
      sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
      sessionStorage.setItem("aira_public_chat_history_v1", JSON.stringify(history));
      getPublicChatEvents.mockResolvedValue({
        ok: true,
        messages: history.map((message, index) => ({
          id: message.id,
          role: "customer",
          content: message.content,
          citations: [],
          created_at: new Date(1_700_000_000_000 + index).toISOString(),
        })),
        handoff_requested: false,
      });
      getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime());
      render(<PublicChatWidget />);

      openWidget();
      const stage = await screen.findByRole("region", { name: /vista previa del avatar aira/i });
      const messages = document.querySelector(".public-chat-widget__messages");
      expect(stage).toHaveAttribute("data-stage-size", "compact");
      expect(stage).toHaveClass("public-chat-widget__stage--compact");
      expect(stage.compareDocumentPosition(messages) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(messages).toContainElement(screen.getByText(`Mensaje ${messageCount}`));
    }
  );

  it("mantiene el stage expandido antes de que exista una conversación real", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime());
    render(<PublicChatWidget />);

    openWidget();
    const stage = await screen.findByRole("region", { name: /vista previa del avatar aira/i });
    expect(stage).toHaveAttribute("data-stage-size", "expanded");
    expect(stage).toHaveClass("public-chat-widget__stage--expanded");
  });

  // P3/P6/P7 — jsdom doesn't run a real layout engine, so pixel sizing
  // (PublicChatWidget.css's stage--expanded/compact height, clamp()s, and
  // the mobile media query) can't be asserted here — that's real-browser
  // territory (see MANUAL_BROWSER_PENDING in the final report). What IS a
  // code-level contract, and worth locking in: the stage element and its
  // pose <img> must never be removed from the DOM across the
  // expanded<->compact transition (i.e. AIRA never "disappears" once a
  // real conversation starts growing the history) — only the CSS size
  // class changes.
  it("el stage y la imagen del avatar nunca desaparecen del DOM al pasar de expanded a compact", async () => {
    getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime());
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    const stageBefore = document.querySelector(".public-chat-widget__stage");
    expect(stageBefore).toHaveClass("public-chat-widget__stage--expanded");
    expect(stageBefore.querySelector("img")).not.toBeNull();

    await act(async () => {
      await typeAndSend("hola");
    });
    await screen.findByText("hola");

    const stageAfter = document.querySelector(".public-chat-widget__stage");
    expect(stageAfter).not.toBeNull();
    expect(stageAfter).toHaveClass("public-chat-widget__stage--compact");
    expect(stageAfter.querySelector("img")).not.toBeNull();
  });

  it("precarga y decodifica las poses críticas sin persistir sus URLs", async () => {
    const decodedUrls = [];
    class DecodingImage {
      set src(value) { this._src = value; }
      get src() { return this._src; }
      decode() {
        decodedUrls.push(this.src);
        return Promise.resolve();
      }
    }
    vi.stubGlobal("Image", DecodingImage);
    const poseKeys = ["neutral", "waving", "talk-a", "talk-o", "presenting", "hands-clasped"];
    const poses = Object.fromEntries(poseKeys.map((key) => [key, { url: `https://cdn.example/${key}.png` }]));
    getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime({ poses }));
    render(<PublicChatWidget />);

    await waitFor(() => expect(decodedUrls).toHaveLength(poseKeys.length));
    expect(decodedUrls).toEqual(expect.arrayContaining(poseKeys.map((key) => `https://cdn.example/${key}.png`)));
    expect(sessionStorage.getItem("aira_public_chat_history_v1") || "").not.toContain("cdn.example");
  });

  it("prepara talk-a y talk-o antes de iniciar la secuencia", async () => {
    const pending = new Map();
    class ControlledImage {
      set src(value) { this._src = value; }
      get src() { return this._src; }
      decode() {
        return new Promise((resolve) => pending.set(this.src, resolve));
      }
    }
    vi.stubGlobal("Image", ControlledImage);
    getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime({
      poses: {
        neutral: { url: "https://cdn.example/neutral.png" },
        "talk-a": { url: "https://cdn.example/talk-a.png" },
        "talk-o": { url: "https://cdn.example/talk-o.png" },
      },
      rules: [{
        event_key: "chat.opened",
        rule_type: "pose_sequence",
        payload: { sequence: ["talk-a", "talk-o"], interval_ms: 280 },
      }],
    }));
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();

    await waitFor(() => {
      expect(pending.has("https://cdn.example/talk-a.png")).toBe(true);
      expect(pending.has("https://cdn.example/talk-o.png")).toBe(true);
    });
    expect(screen.queryByRole("img", { name: /AIRA: Respondiendo/i })).not.toBeInTheDocument();
    await act(async () => {
      pending.get("https://cdn.example/talk-a.png")();
      pending.get("https://cdn.example/talk-o.png")();
    });
    expect(await screen.findByRole("img", { name: /AIRA: Respondiendo/i })).toHaveAttribute(
      "src",
      "https://cdn.example/talk-a.png"
    );
  });

  it("conserva la pose anterior hasta decodificar la siguiente y limpia preloads al desmontar", async () => {
    const pending = new Map();
    const instances = [];
    class ControlledImage {
      constructor() { instances.push(this); }
      set src(value) { this._src = value; }
      get src() { return this._src; }
      decode() {
        if (this.src.endsWith("neutral.png")) return Promise.resolve();
        return new Promise((resolve) => pending.set(this.src, resolve));
      }
    }
    vi.stubGlobal("Image", ControlledImage);
    getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime({
      poses: {
        neutral: { url: "https://cdn.example/neutral.png" },
        presenting: { url: "https://cdn.example/presenting.png" },
      },
      rules: [
        { event_key: "chat.opened", rule_type: "pose", payload: { pose: "neutral" } },
        { event_key: "intent.services", rule_type: "pose", payload: { pose: "presenting" } },
      ],
    }));
    sendPublicChatMessage.mockResolvedValueOnce({
      response_text: "Servicios",
      avatar_events: ["intent.services"],
      responder: AIRA_RESPONDER,
    });
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    const { unmount } = render(<PublicChatWidget />);
    openWidget();
    expect(await screen.findByRole("img", { name: "AIRA: Disponible" })).toHaveAttribute(
      "src",
      "https://cdn.example/neutral.png"
    );
    await typeAndSend("servicios");
    await screen.findByText("Servicios");
    expect(screen.getByRole("img", { name: "AIRA: Disponible" })).toHaveAttribute(
      "src",
      "https://cdn.example/neutral.png"
    );
    await act(async () => pending.get("https://cdn.example/presenting.png")());
    expect(await screen.findByRole("img", { name: "AIRA: Presentando" })).toHaveAttribute(
      "src",
      "https://cdn.example/presenting.png"
    );

    unmount();
    expect(instances.every((image) => image.src === "")).toBe(true);
  });

  it("carga el runtime y muestra neutral inicialmente", async () => {
    getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime());
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);

    openWidget();
    expect(await screen.findByRole("img", { name: "AIRA: Saludando" })).toBeInTheDocument();
    const avatar = await screen.findByRole("img", { name: "AIRA: Disponible" }, { timeout: 2_000 });
    expect(getPublicAvatarRuntime).toHaveBeenCalledTimes(1);
    expect(avatar).toHaveAttribute("src", "https://cdn.example/neutral.png");
    expect(sessionStorage.getItem("aira_public_chat_session_v1")).toBe("existing-session");
    expect(sessionStorage.getItem("aira_public_chat_history_v1")).not.toContain("neutral.png");
  });

  it("usa waving al abrir", async () => {
    getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime());
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);

    openWidget();
    expect(await screen.findByRole("img", { name: "AIRA: Saludando" })).toHaveAttribute(
      "src",
      "https://cdn.example/waving.png"
    );
  });

  it("conecta la edición textual con listening y vuelve a idle al limpiar", async () => {
    getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime({
      rules: [{ event_key: "chat.opened", rule_type: "pose", payload: { pose: "neutral" } }],
    }));
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await screen.findByRole("img", { name: "AIRA: Disponible" });

    const input = screen.getByLabelText(/escribe tu mensaje/i);
    fireEvent.change(input, { target: { value: "hola" } });
    expect(await screen.findByRole("img", { name: "AIRA: Escuchando" })).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "" } });
    expect(await screen.findByRole("img", { name: "AIRA: Disponible" })).toBeInTheDocument();
  });

  it("no repite invite al recuperar una conversación activa", async () => {
    getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime({
      rules: [{ event_key: "chat.opened", rule_type: "pose", payload: { pose: "waving" } }],
    }));
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    sessionStorage.setItem("aira_public_chat_history_v1", JSON.stringify([
      { id: "user-1", role: "user", content: "hola", source: "server" },
    ]));
    render(<PublicChatWidget />);
    openWidget();
    expect(await screen.findByRole("img", { name: "AIRA: Disponible" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "AIRA: Saludando" })).not.toBeInTheDocument();
  });

  it("si falta neutral usa default_pose y si falla el runtime conserva el placeholder", async () => {
    getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime({
      default_pose: "waving",
      poses: { waving: { url: "https://cdn.example/waving.png" } },
    }));
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    const { unmount } = render(<PublicChatWidget />);
    openWidget();
    expect(await screen.findByRole("img", { name: "AIRA: Saludando" })).toHaveAttribute(
      "src",
      "https://cdn.example/waving.png"
    );
    unmount();

    getPublicAvatarRuntime.mockRejectedValueOnce(new Error("backend detail should stay private"));
    renderWithRouter();
    openWidget();
    await waitFor(() => expect(getPublicAvatarRuntime).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("img", { name: "AIRA no disponible" })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("backend detail should stay private");
  });

  it("renueva un runtime expirado antes de reutilizar sus URLs", async () => {
    const expired = publicAvatarRuntime();
    expired.expires_at = new Date(Date.now() - 1_000).toISOString();
    expired.poses.neutral.expires_at = expired.expires_at;
    const fresh = publicAvatarRuntime();
    let requestCount = 0;
    getPublicAvatarRuntime.mockImplementation(() => {
      requestCount += 1;
      return Promise.resolve(requestCount === 1 ? expired : fresh);
    });

    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);

    await waitFor(() => expect(getPublicAvatarRuntime.mock.calls.length).toBeGreaterThanOrEqual(2));
    openWidget();
    expect(await screen.findByRole("img", { name: "AIRA: Saludando" })).toHaveAttribute(
      "src",
      "https://cdn.example/waving.png"
    );
  });

  it("si falla una pose nueva conserva la pose anterior sin mostrar error interno", async () => {
    getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime());
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);

    openWidget();
    const avatar = await screen.findByRole("img", { name: "AIRA: Saludando" });
    fireEvent.error(avatar);

    expect(screen.getByRole("img", { name: "AIRA: Disponible" })).toHaveAttribute(
      "src",
      "https://cdn.example/neutral.png"
    );
    expect(document.body.textContent).not.toContain("storage_path");
    expect(document.body.textContent).not.toContain("bucket");
  });

  it("un responder humano conserva su avatar y nunca usa una pose de AIRA", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime());
    getPublicChatStatus.mockResolvedValueOnce({
      ok: true,
      responder: humanResponder({ avatar_url: "https://cdn.example/human.png" }),
      handoff_requested: false,
    });
    render(<PublicChatWidget />);
    openWidget();

    const humanAvatar = await screen.findByRole("img", { name: "Osvaldo" });
    expect(humanAvatar).toHaveAttribute("src", "https://cdn.example/human.png");
    expect(humanAvatar).not.toHaveAttribute("src", "https://cdn.example/neutral.png");
    expect(screen.queryByRole("region", { name: /vista previa del avatar aira/i })).not.toBeInTheDocument();
  });

  it("consume las reglas públicas para thinking y respeta el delay de completed", async () => {
    const runtime = publicAvatarRuntime({
      rules: [
        { event_key: "chat.opened", rule_type: "pose", payload: { pose: "waving", duration_ms: 10, next: "neutral" } },
        { event_key: "message.submitted", rule_type: "state", payload: { state: "thinking" } },
        { event_key: "message.completed", rule_type: "pose", payload: { pose: "neutral", delay_ms: 1_700 } },
      ],
    });
    getPublicAvatarRuntime.mockResolvedValueOnce(runtime);
    let resolveResponse;
    const response = new Promise((resolve) => { resolveResponse = resolve; });
    sendPublicChatMessage.mockReturnValueOnce(response);
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await screen.findByRole("img", { name: "AIRA: Saludando" });
    await typeAndSend("¿Qué servicios ofrecen?");

    expect(await screen.findByText("Pensando")).toBeInTheDocument();
    resolveResponse({ response_text: "Estos son nuestros servicios.", responder: AIRA_RESPONDER });
    await screen.findByText("Estos son nuestros servicios.");
    expect(screen.getByText("Disponible")).toBeInTheDocument();
  });

  it("inicia thinking, alterna left/right y solo después pasa a talking", async () => {
    const runtime = publicAvatarRuntime({
      poses: {
        neutral: { url: "https://cdn.example/neutral.png" },
        "thinking-left": { url: "https://cdn.example/thinking-left.png" },
        "thinking-right": { url: "https://cdn.example/thinking-right.png" },
        "talk-a": { url: "https://cdn.example/talk-a.png" },
        "talk-o": { url: "https://cdn.example/talk-o.png" },
      },
      rules: [
        { event_key: "chat.opened", rule_type: "pose", payload: { pose: "neutral" } },
        { event_key: "message.submitted", rule_type: "pose_sequence", payload: { sequence: ["thinking-left", "thinking-right"], interval_ms: 80 } },
        { event_key: "message.streaming", rule_type: "pose_sequence", payload: { sequence: ["talk-a", "talk-o"], interval_ms: 80 } },
      ],
    });
    getPublicAvatarRuntime.mockResolvedValueOnce(runtime);
    sendPublicChatMessage.mockReturnValueOnce(new Promise(() => {}));
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await screen.findByRole("img", { name: "AIRA: Disponible" });

    await typeAndSend("¿Qué ofrecen?");
    expect(await screen.findByRole("img", { name: "AIRA: Pensando" })).toHaveAttribute(
      "src", "https://cdn.example/thinking-left.png"
    );

    await waitFor(() => expect(screen.getByRole("img", { name: "AIRA: Pensando" })).toHaveAttribute(
      "src", "https://cdn.example/thinking-right.png"
    ));

    await waitFor(() => expect(screen.getByRole("img", { name: "AIRA: Respondiendo" })).toHaveAttribute(
      "src", "https://cdn.example/talk-a.png"
    ));
  });

  it("usa interval_ms y solo poses válidas para una secuencia de streaming", async () => {
    const runtime = publicAvatarRuntime({
      poses: {
        neutral: { url: "https://cdn.example/neutral.png" },
        "talk-a": { url: "https://cdn.example/talk-a.png" },
        "talk-o": { url: "https://cdn.example/talk-o.png" },
      },
      rules: [
        { event_key: "chat.opened", rule_type: "pose_sequence", payload: { sequence: ["talk-a", "talk-o"], interval_ms: 20 } },
      ],
    });
    getPublicAvatarRuntime.mockResolvedValueOnce(runtime);
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    renderWithRouter();
    openWidget();
    expect(await screen.findByRole("img", { name: "AIRA: Respondiendo" })).toHaveAttribute(
      "src", "https://cdn.example/talk-a.png"
    );
    await waitFor(() => expect(screen.getByRole("img", { name: "AIRA: Respondiendo" })).toHaveAttribute(
      "src", "https://cdn.example/talk-o.png"
    ));
  });

  it("aplica presenting solo cuando el backend devuelve intent.services", async () => {
    getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime({
      poses: {
        neutral: { url: "https://cdn.example/neutral.png" },
        presenting: { url: "https://cdn.example/presenting.png" },
      },
      rules: [
        { event_key: "chat.opened", rule_type: "pose", payload: { pose: "missing", next: "neutral" } },
        { event_key: "intent.services", rule_type: "pose", payload: { pose: "presenting" } },
      ],
    }));
    sendPublicChatMessage.mockResolvedValueOnce({
      response_text: "Estos son nuestros servicios.",
      avatar_events: ["intent.services"],
      responder: AIRA_RESPONDER,
    });
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    expect(await screen.findByRole("img", { name: "AIRA: Disponible" })).toHaveAttribute(
      "src", "https://cdn.example/neutral.png"
    );
    fireEvent.click(screen.getByRole("button", { name: "Servicios" }));
    fireEvent.click(screen.getByRole("button", { name: /enviar mensaje/i }));
    await screen.findByText("Estos son nuestros servicios.");
    expect(await screen.findByRole("img", { name: "AIRA: Presentando" })).toHaveAttribute(
      "src", "https://cdn.example/presenting.png"
    );
  });

  it("no infiere presenting por texto o CTA cuando avatar_events está vacío", async () => {
    getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime({
      poses: {
        neutral: { url: "https://cdn.example/neutral.png" },
        presenting: { url: "https://cdn.example/presenting.png" },
      },
      rules: [
        { event_key: "chat.opened", rule_type: "pose", payload: { pose: "neutral" } },
        { event_key: "intent.services", rule_type: "pose", payload: { pose: "presenting" } },
        { event_key: "message.completed", rule_type: "pose", payload: { pose: "neutral" } },
      ],
    }));
    sendPublicChatMessage.mockResolvedValueOnce({
      response_text: "Hablaré sobre servicios.",
      cta: { type: "contact", label: "Hablar con el equipo", href: "/contacto" },
      avatar_events: [],
      responder: AIRA_RESPONDER,
    });
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    renderWithRouter();
    openWidget();
    await screen.findByRole("img", { name: "AIRA: Disponible" });
    await typeAndSend("servicios");
    await screen.findByText("Hablaré sobre servicios.");
    expect(screen.queryByRole("img", { name: "AIRA: Presentando" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "AIRA: Disponible" })).toHaveAttribute(
      "src", "https://cdn.example/neutral.png"
    );
  });

  it("activa streaming con el interval_ms del runtime y lo cancela antes de completed", async () => {
    const runtime = publicAvatarRuntime({
      poses: {
        neutral: { url: "https://cdn.example/neutral.png" },
        "talk-a": { url: "https://cdn.example/talk-a.png" },
        "talk-o": { url: "https://cdn.example/talk-o.png" },
      },
      rules: [
        { event_key: "chat.opened", rule_type: "pose", payload: { pose: "neutral" } },
        { event_key: "message.submitted", rule_type: "state", payload: { state: "thinking" } },
        { event_key: "message.streaming", rule_type: "pose_sequence", payload: { sequence: ["talk-a", "talk-o"], interval_ms: 20 } },
        { event_key: "message.completed", rule_type: "pose", payload: { pose: "neutral" } },
      ],
    });
    getPublicAvatarRuntime.mockResolvedValueOnce(runtime);
    let resolveResponse;
    const response = new Promise((resolve) => { resolveResponse = resolve; });
    sendPublicChatMessage.mockReturnValueOnce(response);
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await screen.findByRole("img", { name: "AIRA: Disponible" });
    await typeAndSend("¿Qué ofrecen?");
    expect(await screen.findByRole("img", { name: "AIRA: Respondiendo" })).toHaveAttribute(
      "src", "https://cdn.example/talk-a.png"
    );
    await waitFor(() => expect(screen.getByRole("img", { name: "AIRA: Respondiendo" })).toHaveAttribute(
      "src", "https://cdn.example/talk-o.png"
    ));
    resolveResponse({ response_text: "Respuesta", avatar_events: [], responder: AIRA_RESPONDER });
    await screen.findByText("Respuesta");
    await waitFor(() => expect(screen.getByRole("img", { name: "AIRA: Disponible" })).toHaveAttribute(
      "src", "https://cdn.example/neutral.png"
    ));
  });

  // P4 #8 — confidence.low's pose contract (rule + i-dont-know asset) was
  // already correct in the backend/DB; the frontend's semantic-event
  // allowlist was the only piece silently dropping it. This test used to
  // assert the OLD (now-superseded) behavior — confidence.low ignored,
  // always falling back to message.completed. It's rewritten to assert
  // the corrected contract: confidence.low is applied when present, and a
  // genuinely unrecognized event (never part of any contract) still isn't
  // invented.
  it("aplica la pose de confidence.low cuando el backend la envía, pero nunca inventa un evento desconocido", async () => {
    getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime({
      poses: {
        neutral: { url: "https://cdn.example/neutral.png" },
        presenting: { url: "https://cdn.example/presenting.png" },
      },
      rules: [
        { event_key: "chat.opened", rule_type: "pose", payload: { pose: "neutral" } },
        { event_key: "confidence.low", rule_type: "pose", payload: { pose: "presenting" } },
        { event_key: "message.completed", rule_type: "pose", payload: { pose: "neutral" } },
      ],
    }));
    sendPublicChatMessage.mockResolvedValueOnce({
      response_text: "No estoy seguro.",
      avatar_events: ["confidence.low", "internal.secret"],
      responder: AIRA_RESPONDER,
    });
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await screen.findByRole("img", { name: "AIRA: Disponible" });
    await typeAndSend("no sé");
    await screen.findByText("No estoy seguro.");
    // confidence.low's own rule pose is applied — never invented from an
    // unrecognized event like "internal.secret".
    expect(await screen.findByRole("img", { name: "AIRA: Presentando" })).toHaveAttribute(
      "src", "https://cdn.example/presenting.png"
    );
  });

  it("aplica hands-clasped al solicitar handoff y conserva el stage hasta que entra un humano", async () => {
    getPublicAvatarRuntime.mockResolvedValueOnce(publicAvatarRuntime({
      poses: {
        neutral: { url: "https://cdn.example/neutral.png" },
        "hands-clasped": { url: "https://cdn.example/hands-clasped.png" },
      },
      rules: [
        { event_key: "chat.opened", rule_type: "pose", payload: { pose: "neutral" } },
        { event_key: "handoff.created", rule_type: "pose", payload: { pose: "hands-clasped" } },
      ],
    }));
    requestPublicChatHuman.mockResolvedValueOnce({ ok: true, status: "waiting_agent" });
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await screen.findByRole("img", { name: "AIRA: Disponible" });

    fireEvent.click(screen.getByRole("button", { name: /hablar con una persona/i }));

    expect(await screen.findByRole("img", { name: "AIRA: Conectando con el equipo" })).toHaveAttribute(
      "src", "https://cdn.example/hands-clasped.png"
    );
    expect(screen.getByLabelText(/vista previa del avatar aira/i)).toBeInTheDocument();
  });
});

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
  getPublicChatStatus.mockResolvedValue({ ok: true, responder: AIRA_RESPONDER, handoff_requested: false });
  // FASE HANDOFF H3B — default inocuo: sin mensajes nuevos, SIN responder
  // (sanitizeResponder(undefined) devuelve null, así que el widget nunca
  // pisa la identidad ya establecida por /start o /message). El poller
  // arranca en cuanto hay sessionId, incluso con el panel cerrado (ver
  // H3B.2), así que prácticamente todos los tests de este archivo terminan
  // llamando a getPublicChatEvents al menos una vez -- este default evita
  // que se conviertan en tests de H3B por accidente, y evita tener que
  // correlacionar manualmente esta identidad con la de cada
  // startPublicChat.mockResolvedValueOnce(...) de tests preexistentes.
  getPublicChatEvents.mockResolvedValue({ ok: true, messages: [], handoff_requested: false });
  getPublicAvatarRuntime.mockResolvedValue(null);
  requestPublicChatHuman.mockResolvedValue({ ok: true, status: "waiting_agent" });
  recognizeVisitor.mockResolvedValue({ recognized: false, full_name: null, email: null, phone: null });
  forgetVisitor.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
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
  it("muestra el estado de conexión inmediatamente mientras /start sigue pendiente", async () => {
    let resolveStart;
    startPublicChat.mockImplementationOnce(() => new Promise((resolve) => {
      resolveStart = resolve;
    }));

    render(<PublicChatWidget />);
    openWidget();
    await fillPrechatForm();
    fireEvent.click(screen.getByRole("button", { name: /comenzar conversación/i }));

    await waitFor(() => expect(startPublicChat).toHaveBeenCalled());
    expect(screen.getByText("Conectando…")).toBeInTheDocument();
    expect(screen.getByLabelText(/escribe tu mensaje/i)).toBeDisabled();

    await act(async () => {
      resolveStart({
        session_id: "session-1",
        visitor_id: "visitor-1",
        greeting: "¡Hola! ¿En qué puedo ayudarte?",
        responder: AIRA_RESPONDER,
      });
    });
    expect(await screen.findByText("¡Hola! ¿En qué puedo ayudarte?")).toBeInTheDocument();
  });

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

  it("usa el submission recién creado para /prechat aunque exista un identificador anterior en storage", async () => {
    const oldSubmissionId = "11111111-1111-4111-8111-111111111111";
    const newSubmissionId = "22222222-2222-4222-8222-222222222222";
    sessionStorage.setItem("aira_public_chat_submission_v1", oldSubmissionId);
    submitPublicForm.mockResolvedValueOnce({ ok: true, submission_id: newSubmissionId });
    verifyPrechat.mockResolvedValueOnce({ prechat_token: "token-new", expires_in: 900 });

    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();

    expect(submitPublicForm).toHaveBeenCalledTimes(1);
    expect(verifyPrechat).toHaveBeenCalledTimes(1);
    expect(verifyPrechat).toHaveBeenCalledWith(newSubmissionId);
    expect(verifyPrechat).not.toHaveBeenCalledWith(oldSubmissionId);
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

  it("si /start falla, no deja el chat operativo ni muestra acciones de sesión", async () => {
    startPublicChat.mockRejectedValueOnce(new Error("backend no disponible"));

    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();

    expect(await screen.findByText(/no se pudo iniciar el chat/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /antes de comenzar/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/escribe tu mensaje/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/acciones rápidas/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /vista previa del avatar aira/i })).not.toBeInTheDocument();
    expect(sessionStorage.getItem("aira_public_chat_session_v1")).toBeNull();
  });

  it("permite reintentar después de un fallo de /start y entra al chat con la sesión válida", async () => {
    startPublicChat.mockRejectedValueOnce(new Error("timeout"));

    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText(/no se pudo iniciar el chat/i);
    await screen.findByRole("heading", { name: /antes de comenzar/i });
    await act(async () => {});

    await fillPrechatForm();
    const consent = screen.getByLabelText(/acepto que ideas estudio/i);
    if (!consent.checked) fireEvent.click(consent);
    await waitFor(() => expect(consent).toBeChecked());
    fireEvent.click(screen.getByRole("button", { name: /comenzar conversación/i }));

    expect(await screen.findByText("¡Hola! ¿En qué puedo ayudarte?")).toBeInTheDocument();
    expect(startPublicChat).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText(/escribe tu mensaje/i)).not.toBeDisabled();
  });

  it("no trata una sesión stale de sessionStorage como un chat operativo", async () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "stale-session");
    const expired = new Error("Sesión no encontrada");
    expired.status = 404;
    getPublicChatStatus.mockRejectedValueOnce(expired);
    getPublicChatEvents.mockReturnValue(new Promise(() => {}));

    render(<PublicChatWidget />);
    openWidget();

    expect(screen.getByLabelText(/escribe tu mensaje/i)).toBeDisabled();
    expect(screen.queryByLabelText(/acciones rápidas/i)).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /antes de comenzar/i })).toBeInTheDocument();
    expect(sessionStorage.getItem("aira_public_chat_session_v1")).toBeNull();
  });

  it("si falla solo el runtime del avatar, conserva la sesión y el composer operativo", async () => {
    getPublicAvatarRuntime.mockRejectedValueOnce(new Error("avatar unavailable"));

    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();

    expect(await screen.findByText("¡Hola! ¿En qué puedo ayudarte?")).toBeInTheDocument();
    expect(screen.getByLabelText(/escribe tu mensaje/i)).not.toBeDisabled();
    expect(screen.queryByLabelText(/acciones rápidas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no se pudo iniciar el chat/i)).not.toBeInTheDocument();
  });
});

describe("PublicChatWidget — auto-scroll inteligente", () => {
  async function openChatWithPendingPoll() {
    let resolvePoll;
    getPublicChatEvents.mockImplementationOnce(() => new Promise((resolve) => {
      resolvePoll = resolve;
    }));
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    await waitFor(() => expect(resolvePoll).toBeDefined());
    return { messages: document.querySelector(".public-chat-widget__messages"), resolvePoll };
  }

  it("mantiene el fondo si el usuario ya estaba abajo y llega un mensaje nuevo", async () => {
    const { messages, resolvePoll } = await openChatWithPendingPoll();
    userScrollsMessages(messages);

    await act(async () => {
      resolvePoll({ ok: true, messages: [serverMsg({ id: "poll-bottom", content: "Mensaje nuevo" })] });
    });

    expect(messages.scrollTop).toBe(messages.scrollHeight);
  });

  it("preserva scrollTop cuando el usuario está arriba y llega un mensaje por polling", async () => {
    const { messages, resolvePoll } = await openChatWithPendingPoll();
    userScrollsMessages(messages, { scrollTop: 120 });

    await act(async () => {
      resolvePoll({ ok: true, messages: [serverMsg({ id: "poll-up", content: "Mensaje remoto" })] });
    });

    expect(messages.scrollTop).toBe(120);
  });

  it("no fuerza el fondo cuando isLoading cambia mientras el usuario está arriba", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    const messages = document.querySelector(".public-chat-widget__messages");
    userScrollsMessages(messages, { scrollTop: 140 });
    let resolveSend;
    sendPublicChatMessage.mockImplementationOnce(() => new Promise((resolve) => {
      resolveSend = resolve;
    }));

    await act(async () => {
      await typeAndSend("mensaje pendiente");
    });

    // El envío propio puede llevar al fondo inicialmente. Si el visitante
    // decide volver arriba mientras la respuesta sigue cargando, la
    // transición posterior de isLoading no debe robarle esa posición.
    userScrollsMessages(messages, { scrollTop: 140 });
    await act(async () => {
      resolveSend({ ok: true, response_text: "respuesta cargada", responder: AIRA_RESPONDER });
    });

    expect(messages.scrollTop).toBe(140);
  });

  it("reactiva el seguimiento cuando el usuario vuelve manualmente al fondo", async () => {
    const { messages, resolvePoll } = await openChatWithPendingPoll();
    userScrollsMessages(messages, { scrollTop: 100 });
    // Continuación del mismo gesto/momentum (sin un touchstart nuevo) que
    // llega realmente al fondo — la condición de reactivación (Parte 4A)
    // no exige un gesto adicional, solo que YA hubo uno y que ahora está
    // cerca del fondo.
    messages.scrollTop = messages.scrollHeight;
    fireEvent.scroll(messages);

    await act(async () => {
      resolvePoll({ ok: true, messages: [serverMsg({ id: "poll-return", content: "Mensaje posterior" })] });
    });

    expect(messages.scrollTop).toBe(messages.scrollHeight);
  });

  it("permite que el envío propio lleve al usuario al mensaje nuevo", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    const messages = document.querySelector(".public-chat-widget__messages");
    setScrollMetrics(messages, { scrollTop: 110 });
    fireEvent.scroll(messages);

    await act(async () => {
      await typeAndSend("mi mensaje");
    });

    expect(messages.scrollTop).toBe(messages.scrollHeight);
  });

  // P2/P10 items 3 and 5 — the effect that scrolls-to-bottom depends only
  // on [messages, isLoading] (never pose/poseKey/visualState), so a pose
  // cycling through several ticks — exactly what message.streaming's
  // talk-a/talk-o sequence does, repeatedly, entirely independent of any
  // new "messages" entry — must never touch scrollTop while the visitor
  // is reading up in the history.
  it("cambios de pose/avatar durante streaming (talk-a/talk-o) nunca mueven el scroll si el usuario está arriba", async () => {
    const runtime = publicAvatarRuntime({
      poses: {
        neutral: { url: "https://cdn.example/neutral.png" },
        "talk-a": { url: "https://cdn.example/talk-a.png" },
        "talk-o": { url: "https://cdn.example/talk-o.png" },
      },
      rules: [
        { event_key: "chat.opened", rule_type: "pose", payload: { pose: "neutral" } },
        { event_key: "message.streaming", rule_type: "pose_sequence", payload: { sequence: ["talk-a", "talk-o"], interval_ms: 40 } },
      ],
    });
    getPublicAvatarRuntime.mockResolvedValueOnce(runtime);
    sendPublicChatMessage.mockReturnValueOnce(new Promise(() => {}));
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await screen.findByRole("img", { name: "AIRA: Disponible" });

    const messages = document.querySelector(".public-chat-widget__messages");

    // Sending your own message may legitimately scroll to the bottom once
    // (contract item E) — that happens first. Only *after* that does the
    // visitor scroll back up to read older history, which is the actual
    // scenario under test.
    await act(async () => {
      await typeAndSend("cuéntame más");
    });
    userScrollsMessages(messages, { scrollTop: 130 });

    // The pose must actually be cycling (talk-a -> talk-o -> ...) —
    // otherwise this test would trivially pass without exercising
    // anything. scrollTop must stay exactly where the visitor left it
    // through every tick.
    expect(await screen.findByRole("img", { name: "AIRA: Respondiendo" })).toHaveAttribute(
      "src", "https://cdn.example/talk-a.png"
    );
    expect(messages.scrollTop).toBe(130);

    await waitFor(() => expect(screen.getByRole("img", { name: "AIRA: Respondiendo" })).toHaveAttribute(
      "src", "https://cdn.example/talk-o.png"
    ));
    expect(messages.scrollTop).toBe(130);

    await waitFor(() => expect(screen.getByRole("img", { name: "AIRA: Respondiendo" })).toHaveAttribute(
      "src", "https://cdn.example/talk-a.png"
    ));
    expect(messages.scrollTop).toBe(130);
  });

  it("la pose de thinking (message.submitted) tampoco mueve el scroll si el usuario está arriba", async () => {
    const runtime = publicAvatarRuntime({
      poses: {
        neutral: { url: "https://cdn.example/neutral.png" },
        "thinking-left": { url: "https://cdn.example/thinking-left.png" },
        "thinking-right": { url: "https://cdn.example/thinking-right.png" },
      },
      rules: [
        { event_key: "chat.opened", rule_type: "pose", payload: { pose: "neutral" } },
        { event_key: "message.submitted", rule_type: "pose_sequence", payload: { sequence: ["thinking-left", "thinking-right"], interval_ms: 40 } },
      ],
    });
    getPublicAvatarRuntime.mockResolvedValueOnce(runtime);
    sendPublicChatMessage.mockReturnValueOnce(new Promise(() => {}));
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await screen.findByRole("img", { name: "AIRA: Disponible" });

    const messages = document.querySelector(".public-chat-widget__messages");

    await act(async () => {
      await typeAndSend("una pregunta más");
    });
    userScrollsMessages(messages, { scrollTop: 95 });

    expect(await screen.findByRole("img", { name: "AIRA: Pensando" })).toBeInTheDocument();
    expect(messages.scrollTop).toBe(95);

    await waitFor(() => expect(screen.getByRole("img", { name: "AIRA: Pensando" })).toHaveAttribute(
      "src", "https://cdn.example/thinking-right.png"
    ));
    expect(messages.scrollTop).toBe(95);
  });

  // P11 — the visitor is up in the history when a reply arrives: since
  // scroll must stay put (items 2/3 above), the only way back to the
  // latest message is this discreet affordance. Clicking it — and only
  // clicking it — scrolls down and clears itself.
  it("muestra 'Nuevos mensajes' cuando llega una respuesta con el usuario arriba, y desaparece al usarlo", async () => {
    const { messages, resolvePoll } = await openChatWithPendingPoll();
    userScrollsMessages(messages, { scrollTop: 90 });

    expect(screen.queryByRole("button", { name: /nuevos mensajes/i })).not.toBeInTheDocument();

    await act(async () => {
      resolvePoll({ ok: true, messages: [serverMsg({ id: "poll-indicator", role: "assistant", content: "Respuesta mientras leías arriba" })] });
    });

    // Arriving while scrolled up never moves scrollTop on its own...
    expect(messages.scrollTop).toBe(90);
    // ...but the affordance appears instead.
    const indicator = await screen.findByRole("button", { name: /nuevos mensajes/i });

    fireEvent.click(indicator);

    expect(messages.scrollTop).toBe(messages.scrollHeight);
    expect(screen.queryByRole("button", { name: /nuevos mensajes/i })).not.toBeInTheDocument();
  });

  // Sending your own message always takes the near-bottom auto-scroll
  // branch (item E) — the indicator branch only ever runs for an
  // incoming, non-"user" message while genuinely scrolled up, so it can
  // never fire off your own echo by construction. This test covers the
  // complementary real-send path (vs. the poll-based one above): visitor
  // scrolls up again after their own send, then the actual reply arrives.
  it("respuesta entrante tras el propio envío también muestra 'Nuevos mensajes' si el usuario volvió a subir", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    const messages = document.querySelector(".public-chat-widget__messages");
    userScrollsMessages(messages, { scrollTop: 60 });

    let resolveSend;
    sendPublicChatMessage.mockImplementationOnce(() => new Promise((resolve) => { resolveSend = resolve; }));
    await act(async () => {
      await typeAndSend("mi propio mensaje");
    });
    // Sending your own message is allowed to move scroll once (item E) —
    // not what this test is about. Simulate the visitor scrolling back up
    // again while the reply is still loading, then let the reply resolve.
    userScrollsMessages(messages, { scrollTop: 60 });

    await act(async () => {
      resolveSend({ ok: true, response_text: "aquí está tu respuesta", responder: AIRA_RESPONDER });
    });

    expect(await screen.findByRole("button", { name: /nuevos mensajes/i })).toBeInTheDocument();
  });

  // P0 MOBILE REAL-BROWSER FIX — real iPhone evidence showed the chat
  // snapping back to the bottom while the visitor tried to read up in the
  // history. Root cause: the panel (including this scroll container) is
  // fully unmounted on close ({isOpen && <div className="__panel">...})
  // and a NEW DOM node is created on reopen, but the scroll-listener
  // effect used to depend only on [screen] — which normally doesn't
  // change across a close→reopen — so it stayed bound to the old,
  // detached node forever. isUserNearBottomRef then never learned about
  // real scrolling again, and since /events polling produces a brand new
  // `messages` array reference every ~3s even with zero new content (see
  // reconcileMessages), the auto-scroll effect kept re-forcing scrollTop
  // to the bottom on every poll cycle, regardless of where the visitor
  // had scrolled. This is a regression test for that exact scenario.
  it("tras cerrar y reabrir el chat, el listener de scroll se re-vincula al nuevo contenedor (bug real de iPhone)", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    closeWidget();
    openWidget();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    const messages = document.querySelector(".public-chat-widget__messages");
    userScrollsMessages(messages, { scrollTop: 120 });

    // The poller keeps running (independent of isOpen) at its real ~3s
    // cadence — this mocks whichever /events call comes next (poll #2,
    // already scheduled before the close/reopen) so it delivers a new
    // message, then waits for that real interval to elapse and update
    // state. Before the fix, the stale listener meant scrollTop always
    // snapped back to scrollHeight here; after the fix it must stay put.
    getPublicChatEvents.mockResolvedValueOnce({
      ok: true,
      messages: [serverMsg({ id: "poll-after-reopen", role: "assistant", content: "Mensaje tras reabrir" })],
      handoff_requested: false,
    });

    await waitFor(() => expect(screen.getByText("Mensaje tras reabrir")).toBeInTheDocument(), { timeout: 4000 });
    expect(messages.scrollTop).toBe(120);
  }, 8000);

  // PARTE M — el test exacto pedido: historial largo, usuario al fondo,
  // sube a mitad de un párrafo largo (follow=false), 3 ciclos de polling
  // (>9s con fake timers) sin mover scrollTop ni un px, luego llega una
  // respuesta real (tampoco mueve scrollTop, aparece "Nuevos mensajes"),
  // y solo tocarlo lleva al fondo y reactiva follow=true.
  it("PARTE M — historial largo: sube a mitad de un párrafo, follow=false sobrevive 3 polls (>9s), y solo el indicador restaura el fondo", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    const longParagraph = "Este es un párrafo muy largo sobre nuestros servicios. ".repeat(30);
    sessionStorage.setItem(
      "aira_public_chat_history_v1",
      JSON.stringify([
        {
          id: "srv-long-1",
          sendAttemptId: "srv-long-1",
          role: "assistant",
          content: longParagraph,
          citations: [],
          source: "server",
        },
      ])
    );
    getPublicChatEvents.mockResolvedValue({
      ok: true,
      messages: [serverMsg({ id: "srv-long-1", role: "assistant", content: longParagraph })],
      handoff_requested: false,
    });

    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    const messages = document.querySelector(".public-chat-widget__messages");
    // Usuario al fondo del historial largo...
    setScrollMetrics(messages, { scrollHeight: 3000, clientHeight: 400, scrollTop: 2600 });
    fireEvent.scroll(messages);
    // ...sube a mitad del párrafo largo, lejos del fondo — el gesto real
    // (touchstart/touchmove) es lo que arma el reading-lock, per Parte 1.
    fireEvent.touchStart(messages);
    fireEvent.touchMove(messages);
    setScrollMetrics(messages, { scrollHeight: 3000, clientHeight: 400, scrollTop: 1200 });
    fireEvent.scroll(messages);

    // 3 ciclos completos de polling, > 9s en total.
    await vi.advanceTimersByTimeAsync(3000);
    expect(messages.scrollTop).toBe(1200);
    await vi.advanceTimersByTimeAsync(3000);
    expect(messages.scrollTop).toBe(1200);
    await vi.advanceTimersByTimeAsync(3300);
    expect(messages.scrollTop).toBe(1200);

    // Llega una respuesta real mientras el usuario sigue leyendo arriba.
    getPublicChatEvents.mockResolvedValueOnce({
      ok: true,
      messages: [
        serverMsg({ id: "srv-long-1", role: "assistant", content: longParagraph }),
        serverMsg({ id: "srv-long-2", role: "assistant", content: "Respuesta nueva mientras leías" }),
      ],
      handoff_requested: false,
    });
    await vi.advanceTimersByTimeAsync(3000);

    expect(messages.scrollTop).toBe(1200);
    await vi.waitFor(() => expect(screen.getByRole("button", { name: /nuevos mensajes/i })).toBeInTheDocument());
    const indicator = screen.getByRole("button", { name: /nuevos mensajes/i });

    fireEvent.click(indicator);
    expect(messages.scrollTop).toBe(messages.scrollHeight);
    expect(screen.queryByRole("button", { name: /nuevos mensajes/i })).not.toBeInTheDocument();
  });

  // PARTE N — misma escena que arriba, pero exactamente como la pide la
  // tarea: open -> close -> reopen -> scroll up -> esperar 3 ciclos
  // completos de polling (con fake timers, así no hace falta esperar ~9s
  // reales) -> nunca debe volver al fondo.
  it("PARTE N — open/close/reopen + scroll up sobrevive 3 ciclos de polling sin volver al fondo", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    getPublicChatEvents.mockResolvedValue({ ok: true, messages: [], handoff_requested: false });

    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    closeWidget();
    openWidget();

    const messages = document.querySelector(".public-chat-widget__messages");
    setScrollMetrics(messages, { scrollHeight: 1500, clientHeight: 400, scrollTop: 1100 });
    fireEvent.scroll(messages);
    fireEvent.touchStart(messages);
    fireEvent.touchMove(messages);
    setScrollMetrics(messages, { scrollHeight: 1500, clientHeight: 400, scrollTop: 200 });
    fireEvent.scroll(messages);

    for (let cycle = 0; cycle < 3; cycle += 1) {
      await vi.advanceTimersByTimeAsync(3000);
      expect(messages.scrollTop).toBe(200);
    }
  });

  // PARTE 12 — el gesto por sí solo arma el reading-lock, ANTES incluso de
  // que scrollTop cambie: no se simula ningún cambio de posición acá, solo
  // el touch.
  it("PARTE 12 — touchstart/touchmove arman el reading-lock antes de cualquier cambio de scrollTop", async () => {
    const { messages, resolvePoll } = await openChatWithPendingPoll();
    fireEvent.touchStart(messages);
    fireEvent.touchMove(messages);

    await act(async () => {
      resolvePoll({
        ok: true,
        messages: [serverMsg({ id: "poll-touch-lock", role: "assistant", content: "No debería forzar scroll" })],
      });
    });

    expect(await screen.findByRole("button", { name: /nuevos mensajes/i })).toBeInTheDocument();
  });

  it("PARTE 12b — wheel arma el reading-lock igual que touch (desktop)", async () => {
    const { messages, resolvePoll } = await openChatWithPendingPoll();
    fireEvent.wheel(messages);

    await act(async () => {
      resolvePoll({
        ok: true,
        messages: [serverMsg({ id: "poll-wheel-lock", role: "assistant", content: "No debería forzar scroll" })],
      });
    });

    expect(await screen.findByRole("button", { name: /nuevos mensajes/i })).toBeInTheDocument();
  });

  // PARTE 13 — momentum: eventos scroll que llegan DESPUÉS de touchend
  // (sin ninguna interacción nueva) nunca reactivan follow — ni siquiera
  // si terminan a mitad de camino sin llegar realmente al fondo.
  it("PARTE 13 — scroll por momentum tras touchend (sin nueva interacción) mantiene el reading-lock", async () => {
    const { messages, resolvePoll } = await openChatWithPendingPoll();
    fireEvent.touchStart(messages);
    fireEvent.touchMove(messages);
    setScrollMetrics(messages, { scrollTop: 300 });
    fireEvent.scroll(messages);
    fireEvent.touchEnd(messages);

    // El navegador sigue entregando eventos scroll por inercia, lejos del
    // fondo, sin que el usuario haya vuelto a tocar nada.
    setScrollMetrics(messages, { scrollTop: 250 });
    fireEvent.scroll(messages);
    setScrollMetrics(messages, { scrollTop: 280 });
    fireEvent.scroll(messages);

    await act(async () => {
      resolvePoll({ ok: true, messages: [serverMsg({ id: "poll-momentum", role: "assistant", content: "sigue leyendo" })] });
    });

    expect(messages.scrollTop).toBe(280);
  });

  // PARTE 16 — enviar el propio mensaje es una de las dos únicas acciones
  // que pueden saltarse el reading-lock (la otra es el click del
  // indicador, ya cubierto arriba) — vuelve al fondo esta vez, a pesar de
  // estar leyendo. El re-armado inmediato del lock si el usuario vuelve a
  // scrollear arriba después ya está cubierto por
  // "respuesta entrante tras el propio envío...".
  it("PARTE 16 — enviar el propio mensaje durante reading mode igual scrollea al fondo una vez", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    const messages = document.querySelector(".public-chat-widget__messages");
    userScrollsMessages(messages, { scrollTop: 50 });

    await act(async () => {
      await typeAndSend("mi mensaje propio durante reading mode");
    });

    expect(messages.scrollTop).toBe(messages.scrollHeight);
  });
});

// P0 MOBILE REAL-BROWSER FIX — window.visualViewport is not implemented by
// jsdom at all, so these are pure logic tests of the wiring (custom
// properties written/removed, keyboard-open state derived and cleaned up):
// they cannot substitute for a real iPhone confirming the visual result,
// but they do lock in the exact contract the CSS depends on.
function fakeVisualViewport({ height = 640, offsetTop = 0 } = {}) {
  const listeners = { resize: [], scroll: [] };
  return {
    height,
    offsetTop,
    addEventListener: (type, handler) => listeners[type]?.push(handler),
    removeEventListener: (type, handler) => {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter((entry) => entry !== handler);
    },
    _fire(type) {
      for (const handler of listeners[type] || []) handler();
    },
    _listenerCount(type) {
      return (listeners[type] || []).length;
    },
  };
}

describe("PublicChatWidget — P0 mobile: visualViewport, keyboard-open y body scroll lock", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("al abrir, escribe --aira-vv-height/--aira-vv-top en el wrapper a partir de visualViewport", async () => {
    const vv = fakeVisualViewport({ height: 500, offsetTop: 40 });
    vi.stubGlobal("visualViewport", vv);
    render(<PublicChatWidget />);
    openWidget();

    const wrapper = widgetRoot();
    await waitFor(() => expect(wrapper.style.getPropertyValue("--aira-vv-height")).toBe("500px"));
    expect(wrapper.style.getPropertyValue("--aira-vv-top")).toBe("40px");
  });

  it("una caída grande de altura visual (teclado iOS) activa el modo keyboard-open del panel", async () => {
    const vv = fakeVisualViewport({ height: 640, offsetTop: 0 });
    vi.stubGlobal("visualViewport", vv);
    render(<PublicChatWidget />);
    openWidget();
    const panel = () => document.querySelector(".public-chat-widget__panel");
    await waitFor(() => expect(panel()).not.toHaveClass("public-chat-widget__panel--keyboard-open"));

    // Simulate the iOS keyboard opening: visualViewport shrinks, layout
    // viewport (window.innerHeight, untouched by the keyboard) does not.
    vv.height = 300;
    await act(async () => {
      vv._fire("resize");
    });

    expect(panel()).toHaveClass("public-chat-widget__panel--keyboard-open");

    // Keyboard closes — mode must revert.
    vv.height = 640;
    await act(async () => {
      vv._fire("resize");
    });
    expect(panel()).not.toHaveClass("public-chat-widget__panel--keyboard-open");
  });

  it("al cerrar, limpia los listeners de visualViewport y las custom properties (sin fugas)", async () => {
    const vv = fakeVisualViewport({ height: 640, offsetTop: 0 });
    vi.stubGlobal("visualViewport", vv);
    render(<PublicChatWidget />);
    openWidget();
    await waitFor(() => expect(vv._listenerCount("resize")).toBeGreaterThan(0));

    await act(async () => {
      closeWidget();
    });

    expect(vv._listenerCount("resize")).toBe(0);
    expect(vv._listenerCount("scroll")).toBe(0);
    expect(widgetRoot().style.getPropertyValue("--aira-vv-height")).toBe("");
    expect(widgetRoot().style.getPropertyValue("--aira-vv-top")).toBe("");
  });

  it("sin soporte de visualViewport (navegador sin la API), nunca queda en modo keyboard-open", async () => {
    vi.stubGlobal("visualViewport", undefined);
    render(<PublicChatWidget />);
    openWidget();
    await screen.findByRole("dialog");

    expect(document.querySelector(".public-chat-widget__panel")).not.toHaveClass(
      "public-chat-widget__panel--keyboard-open"
    );
  });

  it("al abrir el chat en mobile, bloquea el scroll de body Y html, y lo restaura exactamente al cerrar", async () => {
    vi.stubGlobal("innerWidth", 390);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 250 });
    render(<PublicChatWidget />);
    openWidget();
    await screen.findByRole("dialog");

    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-250px");
    // Fullscreen modal round 2 — body-only locking still let the page
    // behind be perceptibly moving on real iPhone; html itself needs
    // overflow:hidden too.
    expect(document.documentElement.style.overflow).toBe("hidden");

    await act(async () => {
      closeWidget();
    });

    expect(document.body.style.position).toBe("");
    expect(document.body.style.top).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("en desktop (ancho > 768px), abrir el chat nunca bloquea el scroll del body", async () => {
    vi.stubGlobal("innerWidth", 1440);
    render(<PublicChatWidget />);
    openWidget();
    await screen.findByRole("dialog");

    expect(document.body.style.position).not.toBe("fixed");
  });
});

describe("PublicChatWidget — mobile: intro mode vs conversation mode", () => {
  function stageEl() {
    return document.querySelector(".public-chat-widget__stage");
  }

  it("intro mode: antes de cualquier mensaje real, el stage está en expanded (avatar grande)", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    expect(stageEl()).toHaveAttribute("data-stage-size", "expanded");
  });

  it("conversation mode: tras el primer mensaje real, el stage pasa a compact (avatar reducido, más espacio para el historial)", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    expect(stageEl()).toHaveAttribute("data-stage-size", "expanded");

    await act(async () => {
      await typeAndSend("hola, tengo una pregunta");
    });

    expect(stageEl()).toHaveAttribute("data-stage-size", "compact");
  });

  it("conversation mode se mantiene (nunca vuelve a expanded) para el resto de la sesión, y el historial sigue presente/flexible", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    await act(async () => {
      await typeAndSend("primer mensaje");
    });
    expect(stageEl()).toHaveAttribute("data-stage-size", "compact");

    await act(async () => {
      await typeAndSend("segundo mensaje");
    });
    expect(stageEl()).toHaveAttribute("data-stage-size", "compact");
    // El historial sigue presente y es el área flexible del layout —
    // nunca desaparece ni se reemplaza por el stage.
    expect(document.querySelector(".public-chat-widget__messages")).toBeInTheDocument();
  });
});

// P0 MOBILE INTERACTION REGRESSION — GESTURE-LAYER ROLLBACK. Real iPhone
// evidence: the touch-gesture layer added to fight background scroll-
// chaining (custom touch-action on the panel/messages/quick-actions, plus
// a {passive:false} boundary-guard touchmove listener with
// preventDefault) broke basic composer interaction on a real device even
// after being scoped and refined twice — first breaking send, then
// breaking focus/typing entirely. Per explicit instruction, the whole
// gesture layer was removed rather than patched further: no custom
// touch-action anywhere, no preventDefault-capable touch listener
// anywhere except the ordinary <form onSubmit>. Only the PASSIVE
// (provably inert to click/focus/submit, since passive listeners cannot
// call preventDefault at all) reading-lock listeners remain. These tests
// are the regression guard for exactly what broke, so a future
// background-scroll fix can't silently reintroduce it without a test
// noticing.
describe("PublicChatWidget — mobile: el composer sigue siendo 100% interactivo (tras el rollback de la capa de gestos)", () => {
  it("tocar el input enfoca, escribir actualiza el valor, y tocar enviar despacha el mensaje", async () => {
    vi.stubGlobal("innerWidth", 390);
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

    const input = screen.getByLabelText(/escribe tu mensaje/i);
    fireEvent.touchStart(input);
    fireEvent.touchEnd(input);
    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.change(input, { target: { value: "Hola" } });
    expect(input.value).toBe("Hola");

    const sendButton = screen.getByRole("button", { name: /enviar mensaje/i });
    fireEvent.touchStart(sendButton);
    fireEvent.touchEnd(sendButton);
    fireEvent.click(sendButton);

    await waitFor(() => expect(sendPublicChatMessage).toHaveBeenCalled());
  });

  // Item 9/B/C — a direct form submit, not a manual click simulation,
  // per the instruction not to trust a synthetic click alone for this.
  it("un touchmove real sobre el history (mid-scroll) nunca llama preventDefault, ni bloquea nada fuera de sí mismo", async () => {
    render(<PublicChatWidget />);
    openWidget();
    await completePrechat();
    await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");
    const messages = document.querySelector(".public-chat-widget__messages");
    setScrollMetrics(messages, { scrollHeight: 1000, clientHeight: 400, scrollTop: 300 });

    fireEvent.touchStart(messages, { touches: [{ clientX: 50, clientY: 100 }] });
    const notPrevented = fireEvent.touchMove(messages, { touches: [{ clientX: 50, clientY: 160 }] });

    expect(notPrevented).toBe(true);
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
    expect(screen.getAllByText("Servicios").length).toBeGreaterThanOrEqual(1);
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

  // P0 IPHONE SEND FIX — regresión real confirmada en Safari real por LAN
  // (http://192.168.x.x, no es un contexto seguro): crypto.randomUUID no
  // existe ahí, y llamarlo directo tiraba un TypeError síncrono dentro de
  // handleSend, ANTES de llegar a sendPublicChatMessage — el botón se veía
  // normal pero tocarlo no hacía nada, sin ninguna petición de red. jsdom
  // nunca lo detectó porque no impone la restricción de "secure context".
  // Este test simula exactamente esa condición (randomUUID ausente,
  // getRandomValues presente — el caso real de Safari sobre HTTP) en vez
  // de solo confiar en que el entorno de test la tenga.
  it("si crypto.randomUUID no existe (contexto no seguro, como HTTP LAN real), handleSend igual funciona vía createClientMessageId()", async () => {
    const originalRandomUUID = globalThis.crypto.randomUUID;
    // Elimina SOLO randomUUID — getRandomValues sigue disponible, igual que
    // en Safari real sobre HTTP (randomUUID es lo único gateado a secure
    // context; getRandomValues no lo está).
    delete globalThis.crypto.randomUUID;

    try {
      render(<PublicChatWidget />);
      openWidget();
      await completePrechat();
      await screen.findByText("¡Hola! ¿En qué puedo ayudarte?");

      await typeAndSend("hola");

      expect(sendPublicChatMessage).toHaveBeenCalledTimes(1);
      const clientMessageIdArg = sendPublicChatMessage.mock.calls[0][2];
      // El fallback vía getRandomValues sigue produciendo un UUID v4 válido
      // (los bits de versión/variante se fuerzan a mano) — nunca undefined,
      // nunca vacío, nunca lanza.
      expect(clientMessageIdArg).toEqual(expect.stringMatching(UUID_V4_REGEX));
      // El mensaje del usuario debe verse en pantalla — la prueba real de
      // que handleSend no se rompió antes del fetch.
      expect(screen.getByText("hola")).toBeInTheDocument();
    } finally {
      globalThis.crypto.randomUUID = originalRandomUUID;
    }
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
    expect(button.textContent).toContain("Iniciar conversación");
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

// FASE HANDOFF H3B.4 — [role, contenido] de cada burbuja real (nunca el
// indicador de "escribiendo…") en el orden EXACTO en que aparecen en el
// DOM, que refleja directamente el orden del array `messages` — el único
// modo confiable de verificar cronología, a diferencia de contar
// burbujas por clase.
function timelineRoleContentPairs() {
  return Array.from(
    document.querySelectorAll(".public-chat-widget__bubble:not(.public-chat-widget__typing)")
  ).map((el) => {
    const roleMatch = el.className.match(/bubble--(\w+)/);
    const p = el.querySelector("p");
    return [roleMatch ? roleMatch[1] : "?", p ? p.textContent : ""];
  });
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

// ── FASE HANDOFF H3B.4 — cronología de pendientes locales (P2 real de
// Codex sobre H3B.3): stillPending nunca debe reconstruirse concatenando
// "todos los user pendientes" + "todos los assistant pendientes" -- eso
// reordena por rol, no por cronología real. Se filtra sobre localMessages
// (ya en el orden real en que cada mensaje se agregó) usando
// consumedLocalIds (por sendAttemptId), nunca agrupando por rol.
describe("PublicChatWidget — H3B.4: cronología de mensajes locales pendientes", () => {
  // 1 — orden básico, nada confirmado todavía
  it("1) orden básico: user1, assistant1, user2 se preserva cuando nada fue confirmado todavía", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "respuesta1", citations: [], responder: AIRA_RESPONDER,
    });
    await typeAndSend("pregunta1");
    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(1));

    sendPublicChatMessage.mockReturnValueOnce(new Promise(() => {})); // send2 queda colgado, nunca resuelve en este test
    await vi.waitFor(() => expect(screen.getByLabelText(/escribe tu mensaje/i)).not.toBeDisabled());
    await typeAndSend("pregunta2");
    await vi.waitFor(() => expect(sendPublicChatMessage).toHaveBeenCalledTimes(2));

    // Un poll corre DESPUÉS de que los 3 mensajes locales ya existen, sin
    // confirmar nada (snapshot vacío) -- esto es lo que efectivamente
    // ejercita reconcileMessages()/stillPending sobre una lista con más
    // de un intercambio sin confirmar. Sin este paso, el test no pasaría
    // nunca por la lógica que el P2 de Codex señaló. Se usa un responder
    // humano en el snapshot como señal observable de que el setMessages
    // de ESTE poll realmente se aplicó (headerTitleText cambia de "AIRA"
    // a "Osvaldo" SOLO si el updater corrió).
    getPublicChatEvents.mockResolvedValue({ ok: true, messages: [], responder: humanResponder({ display_name: "Osvaldo" }) });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(headerTitleText()).toBe("Osvaldo"));

    await vi.waitFor(() =>
      expect(timelineRoleContentPairs()).toEqual([
        ["user", "pregunta1"],
        ["assistant", "respuesta1"],
        ["user", "pregunta2"],
      ])
    );
  });

  // 2 — confirmación parcial: solo user1
  it("2) confirmación parcial: el snapshot confirma solo user1, el resto conserva su orden original", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "respuesta1", citations: [], responder: AIRA_RESPONDER,
    });
    await typeAndSend("pregunta1");
    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(1));

    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "respuesta2", citations: [], responder: AIRA_RESPONDER,
    });
    await vi.waitFor(() => expect(screen.getByLabelText(/escribe tu mensaje/i)).not.toBeDisabled());
    await typeAndSend("pregunta2");
    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(2));

    getPublicChatEvents.mockResolvedValue({
      ok: true,
      messages: [serverMsg({ id: "srv-user1", role: "customer", content: "pregunta1", created_at: "2026-01-01T00:00:00Z" })],
      responder: AIRA_RESPONDER,
    });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(userBubbles()).toHaveLength(2));

    expect(timelineRoleContentPairs()).toEqual([
      ["user", "pregunta1"],
      ["assistant", "respuesta1"],
      ["user", "pregunta2"],
      ["assistant", "respuesta2"],
    ]);
  });

  // 3 — confirmación de un intercambio completo (user1 + assistant1)
  it("3) confirmación de un intercambio completo: server confirma user1+assistant1, el resto conserva su orden", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "respuesta1", citations: [], responder: AIRA_RESPONDER,
    });
    await typeAndSend("pregunta1");
    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(1));

    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "respuesta2", citations: [], responder: AIRA_RESPONDER,
    });
    await vi.waitFor(() => expect(screen.getByLabelText(/escribe tu mensaje/i)).not.toBeDisabled());
    await typeAndSend("pregunta2");
    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(2));

    getPublicChatEvents.mockResolvedValue({
      ok: true,
      messages: [
        serverMsg({ id: "srv-user1", role: "customer", content: "pregunta1", created_at: "2026-01-01T00:00:00Z" }),
        serverMsg({ id: "srv-assistant1", role: "assistant", content: "respuesta1", created_at: "2026-01-01T00:00:01Z" }),
      ],
      responder: AIRA_RESPONDER,
    });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(2));

    expect(timelineRoleContentPairs()).toEqual([
      ["user", "pregunta1"],
      ["assistant", "respuesta1"],
      ["user", "pregunta2"],
      ["assistant", "respuesta2"],
    ]);
  });

  // 4 — más de dos intercambios sin confirmar: el filtro respeta el orden
  // original, nunca el orden por rol (una reconstrucción por bucket
  // produciría user1,user2,user3,assistant1,assistant2 -- claramente
  // incorrecto).
  it("4) tres preguntas y dos respuestas sin confirmar: el orden final nunca agrupa por rol", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "respuesta1", citations: [], responder: AIRA_RESPONDER,
    });
    await typeAndSend("pregunta1");
    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(1));

    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "respuesta2", citations: [], responder: AIRA_RESPONDER,
    });
    await vi.waitFor(() => expect(screen.getByLabelText(/escribe tu mensaje/i)).not.toBeDisabled());
    await typeAndSend("pregunta2");
    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(2));

    sendPublicChatMessage.mockReturnValueOnce(new Promise(() => {})); // pregunta3 queda colgada, sin respuesta
    await vi.waitFor(() => expect(screen.getByLabelText(/escribe tu mensaje/i)).not.toBeDisabled());
    await typeAndSend("pregunta3");
    await vi.waitFor(() => expect(sendPublicChatMessage).toHaveBeenCalledTimes(3));

    // Poll con snapshot vacío DESPUÉS de que los 5 mensajes locales ya
    // existen -- ejercita reconcileMessages()/stillPending de verdad. El
    // responder humano es la señal observable de que este setMessages
    // realmente se aplicó (headerTitleText cambia solo si el updater corrió).
    getPublicChatEvents.mockResolvedValue({ ok: true, messages: [], responder: humanResponder({ display_name: "Osvaldo" }) });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(headerTitleText()).toBe("Osvaldo"));

    await vi.waitFor(() =>
      expect(timelineRoleContentPairs()).toEqual([
        ["user", "pregunta1"],
        ["assistant", "respuesta1"],
        ["user", "pregunta2"],
        ["assistant", "respuesta2"],
        ["user", "pregunta3"],
      ])
    );
  });

  // 5 — contenido idéntico: las confirmaciones parciales mantienen
  // asociación 1:1 Y orden correctos, nunca cruzados por ser idénticos.
  it("5) contenido idéntico (hola/ok dos veces): confirmación parcial mantiene asociación y orden 1:1", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "ok", citations: [], responder: AIRA_RESPONDER,
    });
    await typeAndSend("hola");
    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(1));

    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "ok", citations: [], responder: AIRA_RESPONDER,
    });
    await vi.waitFor(() => expect(screen.getByLabelText(/escribe tu mensaje/i)).not.toBeDisabled());
    await typeAndSend("hola");
    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(2));

    // Solo el PRIMER intercambio ("hola"/"ok") queda confirmado.
    getPublicChatEvents.mockResolvedValue({
      ok: true,
      messages: [
        serverMsg({ id: "srv-hola-1", role: "customer", content: "hola", created_at: "2026-01-01T00:00:00Z" }),
        serverMsg({ id: "srv-ok-1", role: "assistant", content: "ok", created_at: "2026-01-01T00:00:01Z" }),
      ],
      responder: AIRA_RESPONDER,
    });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(userBubbles()).toHaveLength(2));
    expect(assistantBubbles()).toHaveLength(2);

    expect(timelineRoleContentPairs()).toEqual([
      ["user", "hola"],
      ["assistant", "ok"],
      ["user", "hola"],
      ["assistant", "ok"],
    ]);
  });

  // 6 — CTA: assistant1 con CTA debe permanecer antes de user2 y conservarla
  it("6) una CTA en assistant1 se conserva y assistant1 permanece antes de user2", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    renderWithRouter(); // la CTA usa <Link>
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true,
      response_text: "respuesta1",
      citations: [],
      cta: { type: "membership", label: "Ver planes", href: "/planes" },
      responder: AIRA_RESPONDER,
    });
    await typeAndSend("pregunta1");
    await vi.waitFor(() => expect(screen.getByRole("link", { name: /ver planes/i })).toBeInTheDocument());

    sendPublicChatMessage.mockReturnValueOnce(new Promise(() => {})); // pregunta2 queda colgada
    await vi.waitFor(() => expect(screen.getByLabelText(/escribe tu mensaje/i)).not.toBeDisabled());
    await typeAndSend("pregunta2");
    await vi.waitFor(() => expect(sendPublicChatMessage).toHaveBeenCalledTimes(2));

    // Poll con snapshot vacío DESPUÉS de que assistant1 (con cta) y user2
    // ya existen -- ejercita reconcileMessages()/stillPending de verdad. El
    // responder humano es la señal observable de que este setMessages
    // realmente se aplicó (headerTitleText cambia solo si el updater corrió).
    getPublicChatEvents.mockResolvedValue({ ok: true, messages: [], responder: humanResponder({ display_name: "Osvaldo" }) });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(headerTitleText()).toBe("Osvaldo"));

    await vi.waitFor(() =>
      expect(timelineRoleContentPairs()).toEqual([
        ["user", "pregunta1"],
        ["assistant", "respuesta1"],
        ["user", "pregunta2"],
      ])
    );
    expect(screen.getByRole("link", { name: /ver planes/i })).toBeInTheDocument();
  });

  // 7 — reproducción explícita del P2 original: dos sends superpuestos
  it("7) dos sends superpuestos (repro exacta del P2): user1, assistant1, user2 -- nunca user1, user2, assistant1", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    // send1 produce user1 + assistant1 (POST resuelve normalmente).
    sendPublicChatMessage.mockResolvedValueOnce({
      ok: true, response_text: "respuesta1", citations: [], responder: AIRA_RESPONDER,
    });
    await typeAndSend("pregunta1");
    await vi.waitFor(() => expect(assistantBubbles()).toHaveLength(1));

    // Antes de que el snapshot alcance a confirmar nada, send2 produce user2.
    sendPublicChatMessage.mockReturnValueOnce(new Promise(() => {}));
    await vi.waitFor(() => expect(screen.getByLabelText(/escribe tu mensaje/i)).not.toBeDisabled());
    await typeAndSend("pregunta2");
    await vi.waitFor(() => expect(sendPublicChatMessage).toHaveBeenCalledTimes(2));

    // Poll con snapshot vacío DESPUÉS de que los 3 mensajes locales ya
    // existen -- sin este paso reconcileMessages()/stillPending nunca se
    // ejecuta sobre esta lista, y el test no probaría nada del P2 real. El
    // responder humano es la señal observable de que este setMessages
    // realmente se aplicó (headerTitleText cambia solo si el updater corrió).
    getPublicChatEvents.mockResolvedValue({ ok: true, messages: [], responder: humanResponder({ display_name: "Osvaldo" }) });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(headerTitleText()).toBe("Osvaldo"));

    await vi.waitFor(() => {
      const roles = timelineRoleContentPairs().map(([role]) => role);
      expect(roles).toEqual(["user", "assistant", "user"]); // nunca ["user", "user", "assistant"]
    });
  });
});

// ── FASE HANDOFF H4B — "Hablar con una persona" ──────────────────────────
// Backend H4A (ya mergeado): POST /public/chat/request-human, más
// handoff_requested en GET /status y GET /events. Este bloque prueba
// ÚNICAMENTE el frontend: visibilidad del botón, el click en sí,
// reconciliación con /events (server-authoritative), sessionStorage como
// eco optimista, protección de sesión A->B, y que el composer nunca se
// bloquea por esto. Mismo patrón que H3B.2/H3B.3/H3B.4: fake timers +
// vi.waitFor para cualquier aserción que dependa de una continuación async
// fuera de un handler síncrono de evento (ver esos bloques para el porqué
// de nunca usar un expect() desnudo justo después de un
// advanceTimersByTimeAsync o un await de un mock).

function requestHumanButton() {
  return screen.queryByRole("button", { name: /hablar con una persona/i });
}

function handoffStatusText() {
  return screen.queryByText(/solicitaste atención de una persona/i);
}

// FASE HANDOFF H4B — el primer poll de /events se dispara de inmediato al
// montar (sin esperar ningún setTimeout, ver el efecto de polling), pero
// resuelve en un microtask -- sin forzar su resolución ANTES de la acción
// que cada test quiere probar, ese primer poll puede quedar en vuelo y
// resolver DESPUÉS del click (con el mock genérico handoff_requested:false
// del beforeEach), pisando el resultado optimista del click en una carrera
// silenciosa. advanceTimersByTimeAsync(0) fuerza a que ese primer poll ya
// haya aplicado su propio setState antes de seguir (mismo criterio que
// H3B.4 -- nunca asumir que un mock resuelto ya se aplicó al estado).
async function primeSessionAndOpenWidget(sessionId = "session-1") {
  vi.useFakeTimers();
  sessionStorage.setItem("aira_public_chat_session_v1", sessionId);
  render(<PublicChatWidget />);
  openWidget();
  await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));
  await vi.advanceTimersByTimeAsync(0);
}

describe("PublicChatWidget — H4B: botón y estado de handoff", () => {
  // 1/2/3 — visibilidad
  it("1) botón visible con AIRA + sesión + no requested", async () => {
    await primeSessionAndOpenWidget();
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());
    expect(requestHumanButton()).not.toBeDisabled();
  });

  it("2) botón no visible sin sesión (pantalla de pre-chat)", () => {
    render(<PublicChatWidget />);
    openWidget();
    expect(requestHumanButton()).not.toBeInTheDocument();
  });

  it("3) botón no visible cuando responder.type es human", async () => {
    getPublicChatEvents.mockResolvedValue({
      ok: true, messages: [], responder: humanResponder(), handoff_requested: false,
    });
    // openWidget() sobre una sesión restaurada dispara además refreshStatus()
    // (GET /status, LEVEL2) -- se alinea con el mismo responder humano para
    // que ambas fuentes coincidan (mismo criterio realista: ambos endpoints
    // derivan del mismo control_mode del lado del backend).
    getPublicChatStatus.mockResolvedValue({ ok: true, responder: humanResponder(), handoff_requested: false });
    await primeSessionAndOpenWidget();
    await vi.waitFor(() => expect(headerTitleText()).toBe("Osvaldo"));
    expect(requestHumanButton()).not.toBeInTheDocument();
  });

  // 4/5 — click
  it("4) click en waiting_agent hace POST una sola vez con el session_id correcto", async () => {
    await primeSessionAndOpenWidget();
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());

    fireEvent.click(requestHumanButton());
    await vi.waitFor(() => expect(requestPublicChatHuman).toHaveBeenCalledTimes(1));
    expect(requestPublicChatHuman).toHaveBeenCalledWith("session-1");
  });

  it("5) doble click no duplica el POST (botón deshabilitado sincrónicamente)", async () => {
    let resolveClick;
    requestPublicChatHuman.mockReturnValueOnce(new Promise((resolve) => { resolveClick = resolve; }));
    await primeSessionAndOpenWidget();
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());

    const btn = requestHumanButton();
    fireEvent.click(btn);
    // El botón queda deshabilitado en el mismo tick síncrono del primer
    // click (setHandoffRequestLoading(true) corre ANTES del primer await
    // dentro de handleRequestHuman) -- un segundo click sobre un <button
    // disabled> nunca dispara su onClick, por especificación del DOM.
    expect(btn).toBeDisabled();
    fireEvent.click(btn);

    resolveClick({ ok: true, status: "waiting_agent" });
    await vi.waitFor(() => expect(requestHumanButton()).not.toBeInTheDocument());
    expect(requestPublicChatHuman).toHaveBeenCalledTimes(1);
  });

  // 6/9/10 — éxito waiting_agent
  it("6-9) éxito waiting_agent: oculta el botón, muestra el texto informativo, y NO bloquea el composer (10)", async () => {
    await primeSessionAndOpenWidget();
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());

    fireEvent.click(requestHumanButton());
    await vi.waitFor(() => expect(requestHumanButton()).not.toBeInTheDocument());
    await vi.waitFor(() => expect(handoffStatusText()).toBeInTheDocument());
    // 10 — el composer sigue habilitado, AIRA sigue disponible.
    expect(screen.getByLabelText(/escribe tu mensaje/i)).not.toBeDisabled();
  });

  // 11/12 — reconciliación con /events (server-authoritative)
  it("11) /events con handoff_requested=true actualiza la UI aunque nunca se haya clickeado el botón", async () => {
    await primeSessionAndOpenWidget();
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());

    getPublicChatEvents.mockResolvedValue({ ok: true, messages: [], handoff_requested: true });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(requestHumanButton()).not.toBeInTheDocument());
    expect(handoffStatusText()).toBeInTheDocument();
  });

  it("12) /events con handoff_requested=false revierte el estado optimista previo", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "session-1");
    sessionStorage.setItem(
      "aira_public_chat_handoff_v1",
      JSON.stringify({ session_id: "session-1", requested: true })
    );
    render(<PublicChatWidget />);
    openWidget();
    // Estado optimista inicial (de sessionStorage): sin botón, con texto.
    expect(requestHumanButton()).not.toBeInTheDocument();
    expect(handoffStatusText()).toBeInTheDocument();

    getPublicChatEvents.mockResolvedValue({ ok: true, messages: [], handoff_requested: false });
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());
    expect(handoffStatusText()).not.toBeInTheDocument();
  });

  // 13/14/15 — sessionStorage: restore optimista + reconciliación posterior
  it("13) reload con storage requested=true muestra el estado inmediatamente, antes del primer poll", () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "session-restored");
    sessionStorage.setItem(
      "aira_public_chat_handoff_v1",
      JSON.stringify({ session_id: "session-restored", requested: true })
    );
    render(<PublicChatWidget />);
    openWidget();
    // Aserción SINCRÓNICA a propósito: nada async corrió todavía -- el
    // valor inicial optimista viene solo del useState(() => ...) al montar.
    expect(requestHumanButton()).not.toBeInTheDocument();
    expect(handoffStatusText()).toBeInTheDocument();
  });

  it("14) el primer /events con false elimina el estado optimista de sessionStorage", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "session-restored");
    sessionStorage.setItem(
      "aira_public_chat_handoff_v1",
      JSON.stringify({ session_id: "session-restored", requested: true })
    );
    getPublicChatEvents.mockResolvedValue({ ok: true, messages: [], handoff_requested: false });
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());
    expect(sessionStorage.getItem("aira_public_chat_handoff_v1")).toBeNull();
  });

  it("15) storage de OTRA sesión se ignora (nunca aplica un requested ajeno)", () => {
    sessionStorage.setItem("aira_public_chat_session_v1", "session-current");
    sessionStorage.setItem(
      "aira_public_chat_handoff_v1",
      JSON.stringify({ session_id: "session-old", requested: true })
    );
    render(<PublicChatWidget />);
    openWidget();
    expect(requestHumanButton()).toBeInTheDocument();
    expect(handoffStatusText()).not.toBeInTheDocument();
  });

  // 16/17 — limpieza de sesión
  it("16) expireSession() borra también el handoff storage", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "session-1");
    sessionStorage.setItem(
      "aira_public_chat_handoff_v1",
      JSON.stringify({ session_id: "session-1", requested: true })
    );
    const notFound = new Error("Sesión no encontrada.");
    notFound.status = 404;
    getPublicChatEvents.mockRejectedValueOnce(notFound);
    render(<PublicChatWidget />);
    openWidget();
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(screen.getByRole("heading", { name: /antes de comenzar/i })).toBeInTheDocument());
    expect(sessionStorage.getItem("aira_public_chat_handoff_v1")).toBeNull();
  });

  it("17) una sesión nueva siempre empieza con requested=false", async () => {
    vi.useFakeTimers();
    render(<PublicChatWidget />);
    openWidget();
    await fillPrechatForm();
    fireEvent.click(screen.getByRole("button", { name: /comenzar conversación/i }));
    await vi.waitFor(() => expect(startPublicChat).toHaveBeenCalled());
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());
    expect(handoffStatusText()).not.toBeInTheDocument();
  });

  // 18/19 — human_active: sin flash del botón, converge con /events
  it("18) human_active nunca produce un flash del botón antes del próximo poll", async () => {
    await primeSessionAndOpenWidget();
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());

    requestPublicChatHuman.mockResolvedValueOnce({ ok: true, status: "human_active" });
    fireEvent.click(requestHumanButton());
    // Justo después de que el POST resuelve, ANTES de que llegue el
    // próximo poll (que sigue usando el mock genérico de responder AIRA
    // del beforeEach) -- el botón no debe reaparecer.
    await vi.waitFor(() => expect(requestHumanButton()).not.toBeInTheDocument());
    // Nunca se persiste "waiting_agent" cuando el backend dijo human_active.
    expect(sessionStorage.getItem("aira_public_chat_handoff_v1")).toBeNull();
  });

  it("19) el siguiente /events con responder human oculta el estado de espera y lo mantiene oculto", async () => {
    await primeSessionAndOpenWidget();
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());

    requestPublicChatHuman.mockResolvedValueOnce({ ok: true, status: "human_active" });
    fireEvent.click(requestHumanButton());
    await vi.waitFor(() => expect(requestHumanButton()).not.toBeInTheDocument());

    getPublicChatEvents.mockResolvedValue({
      ok: true, messages: [], responder: humanResponder(), handoff_requested: false,
    });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(headerTitleText()).toBe("Osvaldo"));
    // El botón sigue oculto (regla 10: responder human oculta SIEMPRE,
    // independientemente de handoffRequested) y el texto de espera también.
    expect(requestHumanButton()).not.toBeInTheDocument();
    expect(handoffStatusText()).not.toBeInTheDocument();
  });

  // FASE HANDOFF H4B.1 — reproducción exacta del hallazgo: un /events
  // iniciado ANTES del take-control (todavía sin resolver) puede terminar
  // DESPUÉS de que POST /request-human ya devolvió human_active, con un
  // snapshot stale (responder="aira" + handoff_requested=false). Sin el
  // guard humanActivePendingConfirmation, aplicar ese snapshot tal cual
  // reactivaría el botón "Hablar con una persona" por unos segundos.
  it("H4B.1) un /events viejo que resuelve tarde con snapshot stale (aira + false) tras human_active nunca reactiva el botón", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "session-1");

    // 1 — el primer /events queda deliberadamente EN VUELO (nunca resuelto
    // todavía) -- simula la request que ya estaba viajando cuando ocurrió
    // el takeover.
    let resolveStaleEvents;
    getPublicChatEvents.mockReturnValueOnce(new Promise((resolve) => { resolveStaleEvents = resolve; }));

    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));
    // El botón ya es visible por el estado inicial por defecto (AIRA, sin
    // requested) -- el /events en vuelo todavía no aportó nada.
    expect(requestHumanButton()).toBeInTheDocument();

    // 2 — POST /request-human devuelve human_active.
    requestPublicChatHuman.mockResolvedValueOnce({ ok: true, status: "human_active" });
    fireEvent.click(requestHumanButton());
    // 3 — el botón queda oculto de inmediato (guard transitorio).
    await vi.waitFor(() => expect(requestHumanButton()).not.toBeInTheDocument());

    // 4 — el /events viejo resuelve TARDE con el snapshot stale exacto del
    // hallazgo. mockResolvedValue (persistente) queda listo para el
    // PRÓXIMO poll con el mismo snapshot, por si el efecto ya reprogramó
    // uno antes de que este assert corra.
    const staleSnapshot = { ok: true, messages: [], handoff_requested: false, responder: AIRA_RESPONDER };
    getPublicChatEvents.mockResolvedValue(staleSnapshot);
    resolveStaleEvents(staleSnapshot);
    await vi.advanceTimersByTimeAsync(0);

    // 5 — PRUEBA NEGATIVA: sin el guard, este snapshot stale (aira+false)
    // reactivaría el botón acá mismo. Con el guard, sigue oculto, y nunca
    // se muestra el copy de waiting_agent (ese "true" nunca fue
    // handoffRequested).
    expect(requestHumanButton()).not.toBeInTheDocument();
    expect(handoffStatusText()).not.toBeInTheDocument();

    // 6/7 — el siguiente poll confirma el take-control real -> responder
    // humano. El botón sigue oculto, el guard ya no hace falta (la regla
    // "responder human oculta siempre" toma el control), y la identidad
    // humana de H3B se ve normalmente.
    getPublicChatEvents.mockResolvedValue({
      ok: true, messages: [], responder: humanResponder(), handoff_requested: false,
    });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(headerTitleText()).toBe("Osvaldo"));
    expect(requestHumanButton()).not.toBeInTheDocument();
    expect(handoffStatusText()).not.toBeInTheDocument();
  });

  // 20/21/22/23/24 — errores
  it("20) 404 en request-human expira la sesión (mismo flujo que /message y /events)", async () => {
    await primeSessionAndOpenWidget();
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());

    const notFound = new Error("Sesión no encontrada. Inicia una nueva conversación.");
    notFound.status = 404;
    requestPublicChatHuman.mockRejectedValueOnce(notFound);
    fireEvent.click(requestHumanButton());
    await vi.waitFor(() => expect(screen.getByRole("heading", { name: /antes de comenzar/i })).toBeInTheDocument());
  });

  it("21) 429 no destruye la sesión, no marca requested, y re-habilita el botón", async () => {
    await primeSessionAndOpenWidget();
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());

    const tooMany = new Error("Demasiadas solicitudes. Intenta de nuevo más tarde.");
    tooMany.status = 429;
    requestPublicChatHuman.mockRejectedValueOnce(tooMany);
    fireEvent.click(requestHumanButton());
    await vi.waitFor(() => expect(screen.getByText(/has solicitado atención varias veces/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/escribe tu mensaje/i)).toBeInTheDocument(); // sigue en "chat", sesión viva
    expect(requestHumanButton()).not.toBeDisabled(); // 24 — re-habilitado
    expect(handoffStatusText()).not.toBeInTheDocument(); // nunca se marcó requested
  });

  it("22) 503/error de red no destruye la sesión y re-habilita el botón", async () => {
    await primeSessionAndOpenWidget();
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());

    // Error de red puro (sin .status) — mismo texto/rama que un 503 (ver
    // el catch de handleRequestHuman: ambos caen al mismo "else").
    requestPublicChatHuman.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    fireEvent.click(requestHumanButton());
    await vi.waitFor(() =>
      expect(screen.getByText(/no pude solicitar atención en este momento/i)).toBeInTheDocument()
    );
    expect(screen.getByLabelText(/escribe tu mensaje/i)).toBeInTheDocument();
    expect(requestHumanButton()).not.toBeDisabled(); // 24 — re-habilitado
  });

  it("23) 409 no marca requested localmente (conversación ya no elegible)", async () => {
    await primeSessionAndOpenWidget();
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());

    const conflict = new Error("Esta conversación ya no puede solicitar atención de una persona.");
    conflict.status = 409;
    requestPublicChatHuman.mockRejectedValueOnce(conflict);
    fireEvent.click(requestHumanButton());
    await vi.waitFor(() =>
      expect(screen.getByText(/esta conversación ya no puede solicitar atención/i)).toBeInTheDocument()
    );
    // Nunca se trata como si hubiera quedado en waiting_agent.
    expect(requestHumanButton()).toBeInTheDocument();
    expect(requestHumanButton()).not.toBeDisabled();
    expect(handoffStatusText()).not.toBeInTheDocument();
  });

  // 25/26/27 — protección de sesión A->B (mismo patrón que H3B.2 #6)
  it("25) una respuesta EXITOSA tardía del POST de la sesión A (ya reemplazada por B) se ignora por completo", async () => {
    await primeSessionAndOpenWidget("session-a");
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());

    let resolveA;
    requestPublicChatHuman.mockReturnValueOnce(new Promise((resolve) => { resolveA = resolve; }));
    fireEvent.click(requestHumanButton());
    await vi.waitFor(() => expect(requestPublicChatHuman).toHaveBeenCalledTimes(1));

    // La sesión A expira (404 de /events) mientras el POST de A sigue en vuelo.
    const notFound = new Error("Sesión no encontrada.");
    notFound.status = 404;
    getPublicChatEvents.mockRejectedValueOnce(notFound);
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(screen.getByRole("heading", { name: /antes de comenzar/i })).toBeInTheDocument());

    // El visitante completa el pre-chat de nuevo y obtiene la sesión B.
    startPublicChat.mockResolvedValueOnce({
      session_id: "session-b", visitor_id: "visitor-b", greeting: "hola de nuevo", responder: AIRA_RESPONDER,
    });
    await fillPrechatForm();
    fireEvent.click(screen.getByRole("button", { name: /comenzar conversación/i }));
    await vi.waitFor(() => expect(startPublicChat).toHaveBeenCalled());
    await vi.waitFor(() => expect(screen.getByText("hola de nuevo")).toBeInTheDocument());
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());

    // El POST de A resuelve TARDE, con éxito -- nunca debe tocar B.
    resolveA({ ok: true, status: "waiting_agent" });
    await vi.advanceTimersByTimeAsync(3000);

    expect(requestHumanButton()).toBeInTheDocument(); // B nunca quedó marcada como requested
    expect(handoffStatusText()).not.toBeInTheDocument();
    expect(sessionStorage.getItem("aira_public_chat_handoff_v1")).toBeNull();
  });

  it("26) un ERROR tardío del POST de la sesión A (ya reemplazada por B) se ignora por completo", async () => {
    await primeSessionAndOpenWidget("session-a");
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());

    let rejectA;
    requestPublicChatHuman.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectA = reject; }));
    fireEvent.click(requestHumanButton());
    await vi.waitFor(() => expect(requestPublicChatHuman).toHaveBeenCalledTimes(1));

    const notFound = new Error("Sesión no encontrada.");
    notFound.status = 404;
    getPublicChatEvents.mockRejectedValueOnce(notFound);
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(screen.getByRole("heading", { name: /antes de comenzar/i })).toBeInTheDocument());

    startPublicChat.mockResolvedValueOnce({
      session_id: "session-b", visitor_id: "visitor-b", greeting: "hola de nuevo", responder: AIRA_RESPONDER,
    });
    await fillPrechatForm();
    fireEvent.click(screen.getByRole("button", { name: /comenzar conversación/i }));
    await vi.waitFor(() => expect(startPublicChat).toHaveBeenCalled());
    await vi.waitFor(() => expect(screen.getByText("hola de nuevo")).toBeInTheDocument());
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());

    // El POST de A resuelve TARDE, con un 409 -- nunca debe mostrarse en B.
    const conflictA = new Error("mensaje viejo de A, nunca debe verse en B");
    conflictA.status = 409;
    rejectA(conflictA);
    await vi.advanceTimersByTimeAsync(3000);

    expect(screen.queryByText(/mensaje viejo de a/i)).not.toBeInTheDocument();
    expect(requestHumanButton()).toBeInTheDocument();
    expect(requestHumanButton()).not.toBeDisabled();
  });

  it("27) el finally tardío del POST de la sesión A nunca reactiva/toca el loading de B", async () => {
    await primeSessionAndOpenWidget("session-a");
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());

    let resolveA;
    requestPublicChatHuman.mockReturnValueOnce(new Promise((resolve) => { resolveA = resolve; }));
    fireEvent.click(requestHumanButton());
    await vi.waitFor(() => expect(requestPublicChatHuman).toHaveBeenCalledTimes(1));

    const notFound = new Error("Sesión no encontrada.");
    notFound.status = 404;
    getPublicChatEvents.mockRejectedValueOnce(notFound);
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(screen.getByRole("heading", { name: /antes de comenzar/i })).toBeInTheDocument());

    startPublicChat.mockResolvedValueOnce({
      session_id: "session-b", visitor_id: "visitor-b", greeting: "hola de nuevo", responder: AIRA_RESPONDER,
    });
    await fillPrechatForm();
    fireEvent.click(screen.getByRole("button", { name: /comenzar conversación/i }));
    await vi.waitFor(() => expect(startPublicChat).toHaveBeenCalled());
    await vi.waitFor(() => expect(screen.getByText("hola de nuevo")).toBeInTheDocument());
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());

    // B nunca clickeó su propio botón -- su loading siempre fue false. El
    // finally tardío de A (guardado tras su propio sentForSessionId) nunca
    // debe dejar el botón de B deshabilitado.
    resolveA({ ok: true, status: "waiting_agent" });
    await vi.advanceTimersByTimeAsync(3000);
    expect(requestHumanButton()).not.toBeDisabled();
  });

  // 28/29 — carrera /events vs. POST request-human en vuelo
  it("28) un /events con handoff_requested=true mientras el POST sigue pendiente converge correctamente", async () => {
    await primeSessionAndOpenWidget();
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());

    let resolveClick;
    requestPublicChatHuman.mockReturnValueOnce(new Promise((resolve) => { resolveClick = resolve; }));
    fireEvent.click(requestHumanButton());
    await vi.waitFor(() => expect(requestPublicChatHuman).toHaveBeenCalledTimes(1));

    // /events (server-authoritative) ya confirma waiting_agent ANTES de
    // que el POST resuelva del lado del navegador.
    getPublicChatEvents.mockResolvedValue({ ok: true, messages: [], handoff_requested: true });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => {
      expect(requestHumanButton()).not.toBeInTheDocument();
      expect(handoffStatusText()).toBeInTheDocument();
    });

    // El POST resuelve después -- no debe "reactivar" el botón ni romper nada.
    resolveClick({ ok: true, status: "waiting_agent" });
    await vi.advanceTimersByTimeAsync(0);
    expect(requestHumanButton()).not.toBeInTheDocument();
  });

  it("29) un /events con responder human mientras el POST sigue pendiente nunca reactiva el botón", async () => {
    await primeSessionAndOpenWidget();
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());

    let resolveClick;
    requestPublicChatHuman.mockReturnValueOnce(new Promise((resolve) => { resolveClick = resolve; }));
    fireEvent.click(requestHumanButton());
    await vi.waitFor(() => expect(requestPublicChatHuman).toHaveBeenCalledTimes(1));

    // Un agente ya tomó control real (take-control desde el CRM) mientras
    // el POST de request-human sigue en vuelo -- /events ya refleja
    // responder human.
    getPublicChatEvents.mockResolvedValue({
      ok: true, messages: [], responder: humanResponder(), handoff_requested: false,
    });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(headerTitleText()).toBe("Osvaldo"));
    expect(requestHumanButton()).not.toBeInTheDocument(); // oculto por responder human (regla 10)

    // El POST de request-human resuelve DESPUÉS con human_active -- nunca
    // debe reactivar el botón (responder sigue siendo human).
    resolveClick({ ok: true, status: "human_active" });
    await vi.advanceTimersByTimeAsync(0);
    expect(requestHumanButton()).not.toBeInTheDocument();
  });

  // 30/31/32 — regresión H3B (agent messages, CTA, duplicados/carreras)
  // ya cubiertos íntegramente por los describe "PublicChatWidget — H3B:
  // polling de /events", "H3B.1", "H3B.2", "H3B.3" y "H3B.4" de este mismo
  // archivo -- se re-ejecutan tal cual (sin cambios) como parte de la
  // regresión completa de este mismo run, ver el reporte de validación.
});

// ── FASE HANDOFF H4B.2 — waiting_agent vs. /events y /status stale ──────
// Hallazgo de revisión del PR #116, análogo al de H4B.1 pero en la
// dirección opuesta: un GET /events o GET /status que ya estaba en vuelo
// ANTES del click puede resolver DESPUÉS de un POST /request-human exitoso
// con status="waiting_agent", trayendo su propio snapshot viejo
// (handoff_requested=false + responder AIRA) capturado antes de que la
// mutación local ocurriera. Sin protección, ese snapshot pisaba el
// handoffRequested=true recién establecido, reapareciendo el botón y
// permitiendo un segundo POST. handoffMutationEpochRef (ver el widget)
// resuelve esto distinguiendo, por ORDEN DE INICIO respecto a la última
// mutación local, una lectura stale de una realmente posterior -- nunca
// "true para siempre": una lectura que arranca DESPUÉS de la mutación
// sigue pudiendo aplicar un false real si el backend lo devuelve.
describe("PublicChatWidget — H4B.2: protección de waiting_agent contra lecturas stale", () => {
  // 1 — /events viejo (ya en vuelo) resuelve tarde con snapshot stale:
  // NUNCA debe deshacer el waiting_agent recién establecido.
  it("1) un /events viejo que resuelve tarde con handoff_requested=false + AIRA tras waiting_agent NO reaparece el botón", async () => {
    let resolveStaleEvents;
    getPublicChatEvents.mockReturnValueOnce(new Promise((resolve) => { resolveStaleEvents = resolve; }));

    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "session-1");
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));
    // El primer /events sigue EN VUELO a propósito (mockReturnValueOnce sin
    // resolver todavía) -- el botón es visible por el estado inicial.
    expect(requestHumanButton()).toBeInTheDocument();

    fireEvent.click(requestHumanButton());
    await vi.waitFor(() => {
      expect(requestHumanButton()).not.toBeInTheDocument();
      expect(handoffStatusText()).toBeInTheDocument();
    });
    expect(sessionStorage.getItem("aira_public_chat_handoff_v1")).toContain('"requested":true');

    // El /events viejo resuelve TARDE con el snapshot stale exacto del
    // hallazgo -- capturado ANTES de que el POST mutara nada.
    resolveStaleEvents({ ok: true, messages: [], handoff_requested: false, responder: AIRA_RESPONDER });
    await vi.advanceTimersByTimeAsync(0);

    // PRUEBA CLAVE: el botón sigue oculto, el texto sigue visible, y el
    // storage sigue en true -- el snapshot stale nunca lo tocó.
    await vi.waitFor(() => {
      expect(requestHumanButton()).not.toBeInTheDocument();
      expect(handoffStatusText()).toBeInTheDocument();
    });
    expect(sessionStorage.getItem("aira_public_chat_handoff_v1")).toContain('"requested":true');
  });

  // 2 — el siguiente /events (iniciado DESPUÉS de la mutación) confirma
  // true: el estado permanece estable, sin ningún parpadeo.
  it("2) el siguiente /events iniciado después de la mutación con handoff_requested=true mantiene el estado estable", async () => {
    let resolveStaleEvents;
    getPublicChatEvents.mockReturnValueOnce(new Promise((resolve) => { resolveStaleEvents = resolve; }));

    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "session-1");
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));

    fireEvent.click(requestHumanButton());
    await vi.waitFor(() => expect(requestHumanButton()).not.toBeInTheDocument());

    resolveStaleEvents({ ok: true, messages: [], handoff_requested: false, responder: AIRA_RESPONDER });
    await vi.advanceTimersByTimeAsync(0);
    await vi.waitFor(() => expect(requestHumanButton()).not.toBeInTheDocument()); // ver test 1

    // Poll siguiente (encadenado, arranca DESPUÉS de la mutación local) —
    // confirma true, mismo dato que ya se mostraba.
    getPublicChatEvents.mockResolvedValue({ ok: true, messages: [], handoff_requested: true, responder: AIRA_RESPONDER });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => {
      expect(getPublicChatEvents).toHaveBeenCalledTimes(2);
      expect(requestHumanButton()).not.toBeInTheDocument();
      expect(handoffStatusText()).toBeInTheDocument();
    });
  });

  // 3 — BLOQUEANTE: una lectura REALMENTE posterior (iniciada después de
  // la mutación local) SÍ puede devolver false y el estado debe revertir
  // de verdad -- nunca "true sticky" para siempre.
  it("3) una lectura /events genuinamente posterior a la mutación con handoff_requested=false SÍ revierte el estado", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "session-1");
    render(<PublicChatWidget />);
    openWidget();
    await vi.waitFor(() => expect(getPublicChatEvents).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(0); // el primer poll ya resolvió (sin stale en juego en este test)

    fireEvent.click(requestHumanButton());
    await vi.waitFor(() => expect(requestHumanButton()).not.toBeInTheDocument());
    expect(sessionStorage.getItem("aira_public_chat_handoff_v1")).toContain('"requested":true');

    // El backend real, en un poll que arranca DESPUÉS del POST, confirma
    // que ya no hace falta esperar (p. ej. staff resolvió la conversación
    // sin tomar control humano) -- este false es legítimo y debe aplicarse.
    getPublicChatEvents.mockResolvedValue({ ok: true, messages: [], handoff_requested: false, responder: AIRA_RESPONDER });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(requestHumanButton()).toBeInTheDocument());
    expect(handoffStatusText()).not.toBeInTheDocument();
    expect(sessionStorage.getItem("aira_public_chat_handoff_v1")).toBeNull();
  });

  // 4 — reproducción equivalente con GET /status stale (el finding señala
  // explícitamente que /status tiene el mismo problema).
  it("4) un /status viejo que resuelve tarde con handoff_requested=false + AIRA tras waiting_agent NO reaparece el botón", async () => {
    let resolveStaleStatus;
    getPublicChatStatus.mockReturnValueOnce(new Promise((resolve) => { resolveStaleStatus = resolve; }));

    vi.useFakeTimers();
    sessionStorage.setItem("aira_public_chat_session_v1", "session-1");
    render(<PublicChatWidget />);
    // openWidget() sobre una sesión restaurada dispara refreshStatus() (LEVEL2)
    // -- esa es la llamada que queda deliberadamente en vuelo acá.
    openWidget();
    await vi.waitFor(() => expect(getPublicChatStatus).toHaveBeenCalledTimes(1));

    fireEvent.click(requestHumanButton());
    await vi.waitFor(() => expect(requestHumanButton()).not.toBeInTheDocument());
    expect(sessionStorage.getItem("aira_public_chat_handoff_v1")).toContain('"requested":true');

    // El /status viejo (comenzó ANTES del POST) resuelve TARDE con su
    // propio snapshot stale.
    resolveStaleStatus({ ok: true, responder: AIRA_RESPONDER, handoff_requested: false });
    await vi.advanceTimersByTimeAsync(0);

    await vi.waitFor(() => {
      expect(requestHumanButton()).not.toBeInTheDocument();
      expect(handoffStatusText()).toBeInTheDocument();
    });
    expect(sessionStorage.getItem("aira_public_chat_handoff_v1")).toContain('"requested":true');
  });
});

// Real-browser evidence (2026-08-28): GET /public/chat/avatar returns 200
// with profile/variant/default_pose="neutral"/poses.neutral (url present,
// mime_type image/png, width 1024, height 1536) — an exact shape of the
// real backend payload, not the trimmed test fixture — yet the stage kept
// showing the placeholder bubble instead of the pose image. No existing
// test asserted on the actual DOM <img> vs. placeholder for the very first
// pose shown (only later transitions, which always have a previous good
// frame to fall back to, were covered) — this closes that gap.
describe("PublicChatWidget — stage muestra la imagen real del payload de avatar (no placeholder)", () => {
  function realAvatarRuntimePayload(overrides = {}) {
    const expiresAt = new Date(Date.now() + 300_000).toISOString();
    return {
      profile: "aira",
      variant: "default",
      version: 1,
      default_pose: "neutral",
      expires_at: expiresAt,
      poses: {
        neutral: {
          url: "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/sign/ai-avatar-public/neutral.png?token=real-signed-token",
          expires_at: expiresAt,
          mime_type: "image/png",
          width: 1024,
          height: 1536,
        },
      },
      rules: [],
      ...overrides,
    };
  }

  it("renderiza el <img> de la pose neutral (no el placeholder) con el payload real del backend", async () => {
    getPublicAvatarRuntime.mockResolvedValueOnce(realAvatarRuntimePayload());
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);

    openWidget();
    const image = await screen.findByRole("img", { name: /AIRA:/i });
    expect(image).toHaveAttribute(
      "src",
      "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/sign/ai-avatar-public/neutral.png?token=real-signed-token"
    );
    expect(document.querySelector(".public-chat-widget__stage-fallback")).not.toBeInTheDocument();
  });

  it("si la primera pose (sin frame previo) falla al cargar, refresca el runtime y recupera la imagen en vez de quedar en placeholder", async () => {
    getPublicAvatarRuntime.mockResolvedValueOnce(realAvatarRuntimePayload());
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");
    render(<PublicChatWidget />);

    openWidget();
    const firstImage = await screen.findByRole("img", { name: /AIRA:/i });
    expect(firstImage).toHaveAttribute("src", expect.stringContaining("token=real-signed-token"));
    expect(getPublicAvatarRuntime).toHaveBeenCalledTimes(1);

    // First-ever pose fails to load — there is no previousFrame to recover
    // to (this is the exact gap: without a forced refresh, the stage would
    // otherwise sit on the placeholder until the next scheduled refresh,
    // up to 5 minutes later).
    getPublicAvatarRuntime.mockResolvedValueOnce(
      realAvatarRuntimePayload({
        poses: {
          neutral: {
            url: "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/sign/ai-avatar-public/neutral.png?token=fresh-signed-token",
            expires_at: new Date(Date.now() + 300_000).toISOString(),
            mime_type: "image/png",
            width: 1024,
            height: 1536,
          },
        },
      })
    );
    fireEvent.error(firstImage);

    // The forced refresh was triggered immediately (not waiting on the
    // scheduled expiry-based refresh timer).
    await waitFor(() => expect(getPublicAvatarRuntime).toHaveBeenCalledTimes(2));

    // A fresh signed URL is a different string, so the image retries and
    // recovers — never gets stuck on the placeholder.
    const recoveredImage = await screen.findByRole("img", { name: /AIRA:/i });
    expect(recoveredImage).toHaveAttribute("src", expect.stringContaining("token=fresh-signed-token"));
    expect(document.querySelector(".public-chat-widget__stage-fallback")).not.toBeInTheDocument();
  });

  // Real-browser evidence, round 2: DEFAULT_POSE/NEUTRAL_URL/DIRECT_IMAGE_LOAD
  // all confirmed working, yet AVATAR_IMG_ELEMENTS was 0 in Chrome — the
  // widget itself never created the <img>. Reproduced by wrapping in
  // <StrictMode> (the app's real src/main.jsx always does — none of the
  // tests above did, which is exactly why they never caught this).
  //
  // Root cause: the widget's runtime-loading effect's cleanup increments
  // airaRuntimeRequestSeqRef (correctly marking the in-flight request's
  // eventual .then()/.catch()/.finally() as stale once it resolves) but
  // never reset airaRuntimeRequestRef.current. StrictMode mounts this
  // effect, cleans it up, then mounts it again on the same instance —
  // refs survive that cycle — so loadAiraAvatarRuntime()'s reuse guard
  // (`if (airaRuntimeRequestRef.current && !force) return ...`) on the
  // second (real) mount just handed back that same now-permanently-stale
  // promise instead of issuing a fresh request. airaAvatarRuntime was
  // never set — even though the network request itself succeeded — so
  // pose stayed null and the stage was stuck on the placeholder forever.
  it("bajo StrictMode (como corre la app real), la carga inicial del runtime crea el <img> real — no se queda en placeholder", async () => {
    getPublicAvatarRuntime.mockResolvedValue(
      realAvatarRuntimePayload({
        poses: {
          neutral: {
            url: "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/sign/ai-avatar-public/neutral.png?token=strictmode-token",
            expires_at: new Date(Date.now() + 300_000).toISOString(),
            mime_type: "image/png",
            width: 1024,
            height: 1536,
          },
        },
      })
    );
    sessionStorage.setItem("aira_public_chat_session_v1", "existing-session");

    render(
      <StrictMode>
        <PublicChatWidget />
      </StrictMode>
    );

    openWidget();
    const image = await screen.findByRole("img", { name: /AIRA:/i });
    expect(image).toHaveAttribute("src", expect.stringContaining("token=strictmode-token"));
    expect(document.querySelector(".public-chat-widget__stage-fallback")).not.toBeInTheDocument();
  });
});
