import { useEffect, useRef, useState } from "react";
import { Check, Copy, MessageCircle, Send, User, X } from "lucide-react";
import {
  getPublicChatStatus,
  sendPublicChatMessage,
  startPublicChat,
} from "@/services/publicChatApi.js";
import PrechatForm from "./PrechatForm.jsx";
import "./PublicChatWidget.css";

const SESSION_STORAGE_KEY = "aira_public_chat_session_v1";
const HISTORY_STORAGE_KEY = "aira_public_chat_history_v1";
const MAX_MESSAGE_CHARS = 800;

// Identidad pública por defecto — segura mientras no se conozca el estado
// real de control de la conversación (antes de /start, o si /status nunca
// llegó a resolver nada distinto). Nunca se construye un responder con IDs
// internos en el cliente: siempre viene tal cual del backend (PR #259/#260).
const AIRA_RESPONDER = Object.freeze({
  type: "aira",
  display_name: "AIRA",
  avatar_url: null,
  status_label: "Asistente virtual",
});

// Mismo texto exacto que app/ai/public_responder.py::HUMAN_FALLBACK_DISPLAY_NAME
// — permite distinguir "humano real con nombre" de "humano sin identidad
// pública configurada todavía" para no mostrar iniciales sin sentido (p. ej.
// "UA") derivadas del texto genérico.
const GENERIC_HUMAN_DISPLAY_NAME = "Un agente te está atendiendo";

// Whitelist estricta: cualquier campo extra que el backend (o un mock/proxy
// comprometido) agregue al objeto responder — assigned_user_id, control_mode,
// full_name, email, lo que sea — nunca llega a construirse en el objeto que
// termina en el estado de React, porque este helper nunca hace spread del
// objeto crudo, solo lee los 4 campos del contrato público.
function sanitizeResponder(raw) {
  if (!raw || typeof raw !== "object") return null;
  const type = raw.type === "human" ? "human" : "aira";
  const rawName = typeof raw.display_name === "string" ? raw.display_name.trim() : "";
  const display_name = rawName || (type === "human" ? GENERIC_HUMAN_DISPLAY_NAME : "AIRA");
  const rawAvatar = typeof raw.avatar_url === "string" ? raw.avatar_url.trim() : "";
  const avatar_url = rawAvatar || null;
  const rawStatus = typeof raw.status_label === "string" ? raw.status_label.trim() : "";
  const status_label = rawStatus || (type === "human" ? "Agente humano" : "Asistente virtual");
  return { type, display_name, avatar_url, status_label };
}

function ResponderAvatar({ responder, size = 36 }) {
  // Sin useEffect para resetear el fallback de imagen rota: el caller le
  // pasa key={type:avatar_url} (ver usos abajo), así React remonta este
  // componente — con imgFailed limpio — cada vez que cambia la identidad,
  // en vez de sincronizar estado derivado desde un efecto.
  const [imgFailed, setImgFailed] = useState(false);

  if (responder.avatar_url && !imgFailed) {
    return (
      <img
        src={responder.avatar_url}
        alt={responder.display_name}
        className="public-chat-widget__avatar public-chat-widget__avatar-image"
        style={{ width: size, height: size }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  if (responder.type === "human" && responder.display_name !== GENERIC_HUMAN_DISPLAY_NAME) {
    const initials = responder.display_name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
    if (initials) {
      return (
        <div
          className="public-chat-widget__avatar public-chat-widget__avatar-placeholder"
          style={{ width: size, height: size }}
          aria-hidden="true"
        >
          {initials}
        </div>
      );
    }
  }

  return (
    <div
      className={`public-chat-widget__avatar public-chat-widget__avatar-placeholder${
        responder.type === "aira" ? " public-chat-widget__avatar-placeholder--aira" : ""
      }`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {responder.type === "human" ? (
        <User size={Math.round(size * 0.5)} />
      ) : (
        <MessageCircle size={Math.round(size * 0.5)} />
      )}
    </div>
  );
}

function loadStoredSession() {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function loadStoredHistory() {
  try {
    const raw = sessionStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistHistory(history) {
  try {
    sessionStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Almacenamiento no disponible (modo privado, cuota excedida, etc.) —
    // el chat sigue funcionando, solo no persiste entre recargas.
  }
}

// FASE 2 (AIRA Public RAG Presentation Cleanup) — formatea el label de una
// fuente citada para el visitante público. El backend ya envía "label"
// (app/ai/knowledge/rag/citations.py::citation_label()) — pero ese label
// hereda el document_title crudo tal como se subió el documento (ej.
// "Politica_Reembolsos_v3_FINAL, página 2"), que puede sonar técnico para
// un visitante comercial. Es una transformación PURA de presentación sobre
// un dato que el backend ya decidió que es seguro mostrar (citations ya
// pasó por el allowlist server-side, ver PublicChatCitation) — nunca
// cambia QUÉ se muestra, solo CÓMO. No es una categorización semántica
// real (eso requeriría un nombre amigable curado en el backend, fuera de
// alcance de esta fase): es una heurística de limpieza de string.
const _FILE_EXTENSION_RE = /\.(pdf|docx?|xlsx?|pptx?|txt|md)\b/gi;
const _VERSION_OR_STATUS_WORD_RE = /\b(v\d+|final|borrador|draft)\b/gi;

function formatSourceLabel(citation) {
  const raw = (citation?.label || citation?.document_title || "").trim();
  if (!raw) return "Fuente";
  let cleaned = raw.replace(_FILE_EXTENSION_RE, "");
  cleaned = cleaned.replace(/[_-]+/g, " ");
  cleaned = cleaned.replace(_VERSION_OR_STATUS_WORD_RE, "");
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  cleaned = cleaned.replace(/\s+,/g, ",").trim();
  return cleaned || "Fuente";
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard no disponible — falla silenciosamente, no es crítico.
    }
  }

  return (
    <button
      type="button"
      className="public-chat-widget__copy-btn"
      onClick={handleCopy}
      aria-label="Copiar respuesta"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

export default function PublicChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  // "prechat" pide nombre/email/consentimiento antes de poder chatear;
  // "chat" es la conversación en sí. Si ya existe una sesión en
  // sessionStorage, el pre-chat de esa visita ya ocurrió — se salta
  // directo a "chat" sin volver a pedir el formulario.
  const [screen, setScreen] = useState(() => (loadStoredSession() ? "chat" : "prechat"));
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState(() => loadStoredHistory());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState(null);
  const [responder, setResponder] = useState(AIRA_RESPONDER);

  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    persistHistory(messages);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && screen === "chat") {
      inputRef.current?.focus();
    }
  }, [isOpen, screen]);

  // LEVEL2: consulta puntual (nunca en intervalo) del responder actual de
  // una sesión existente. Se llama exactamente en dos momentos: al abrir el
  // widget con una sesión ya guardada (restore), y una vez después de un 409
  // de /message (ver handleSend). Nunca reintenta sola ni entra en loop —
  // eso es LEVEL3 y queda explícitamente fuera de este PR.
  async function refreshStatus(targetSessionId) {
    const sid = targetSessionId || sessionId;
    if (!sid) return;
    try {
      const data = await getPublicChatStatus(sid);
      const sanitized = sanitizeResponder(data?.responder);
      if (sanitized) setResponder(sanitized);
    } catch (err) {
      if (err.status === 404) {
        // Mismo comportamiento que /message ante sesión expirada: /status
        // es auxiliar de identidad visual, pero una sesión inexistente en
        // Redis es la misma señal de "hay que volver a pasar por pre-chat".
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        setSessionId(null);
        setScreen("prechat");
        setError("Tu sesión anterior expiró. Completa el formulario de nuevo para continuar.");
        return;
      }
      // 503/429/cualquier otro fallo: /status es auxiliar, nunca crítico —
      // se conserva el último responder conocido, sin inventar datos y sin
      // reintentar automáticamente. La conversación sigue funcionando igual.
    }
  }

  // prechatToken es opcional: solo se usa cuando viene de un pre-chat recién
  // verificado (ver handlePrechatVerified). Si ya hay sesión guardada, ni
  // siquiera se llama al backend — esa es la razón de que el gate de
  // /public/chat/start solo se ejercite una vez por visita.
  async function ensureSession(prechatToken) {
    const existing = loadStoredSession();
    if (existing) {
      setSessionId(existing);
      setScreen("chat");
      refreshStatus(existing);
      return existing;
    }
    setIsStarting(true);
    setError(null);
    try {
      const data = await startPublicChat(prechatToken);
      sessionStorage.setItem(SESSION_STORAGE_KEY, data.session_id);
      setSessionId(data.session_id);
      setMessages((prev) =>
        prev.length > 0 ? prev : [{ role: "assistant", content: data.greeting, citations: [] }]
      );
      setScreen("chat");
      const sanitized = sanitizeResponder(data.responder);
      if (sanitized) setResponder(sanitized);
      return data.session_id;
    } catch (err) {
      if (err.status === 401) {
        // El prechat_token no era válido (expiró, ya se usó o falló la
        // verificación) — se pide el formulario de nuevo en vez de mostrar
        // un error genérico de chat.
        setScreen("prechat");
        setError("No pudimos verificar tu información. Completa el formulario de nuevo.");
      } else {
        setError("No se pudo iniciar el chat. Intenta de nuevo en un momento.");
      }
      return null;
    } finally {
      setIsStarting(false);
    }
  }

  function handleToggle() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (!nextOpen || sessionId) return;
    if (loadStoredSession()) {
      ensureSession();
    } else {
      setScreen("prechat");
    }
  }

  async function handlePrechatVerified(prechatToken) {
    await ensureSession(prechatToken);
  }

  async function handleSend(event) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading || !sessionId) return;

    // FASE 1AA.1 — se genera UNA vez por intento lógico de envío (acá, fuera
    // del fetch), nunca dentro de sendPublicChatMessage. Hoy este widget no
    // reintenta automáticamente esta llamada, así que un único valor por
    // invocación de handleSend ya satisface el contrato: si en el futuro se
    // agrega un retry sobre esta misma operación (misma trimmed, mismo
    // intento), debe reutilizar esta MISMA variable — nunca generar otra —
    // y un mensaje nuevo (nueva invocación de handleSend) siempre obtiene un
    // UUID distinto.
    const clientMessageId = crypto.randomUUID();

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const data = await sendPublicChatMessage(sessionId, trimmed, clientMessageId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response_text, citations: data.citations || [] },
      ]);
      const sanitized = sanitizeResponder(data.responder);
      if (sanitized) setResponder(sanitized);
    } catch (err) {
      if (err.status === 404) {
        // La sesión ya no existe del lado del servidor (reinicio, TTL,
        // etc.). El prechat_token original ya se consumió al crearla, así
        // que no se puede reabrir sola: se pide el formulario de nuevo en
        // vez de reintentar en silencio.
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        setSessionId(null);
        setScreen("prechat");
        setError("Tu sesión anterior expiró. Completa el formulario de nuevo para continuar.");
      } else if (err.status === 409) {
        // Un agente ya tomó control — nunca se reintenta el mensaje ni se
        // inventa una respuesta de AIRA. Se reutiliza el detail exacto que
        // ya envía el backend (CONTROL_BLOCKED_TEXT) y se consulta /status
        // UNA vez para reflejar la identidad humana real en la UI.
        setError(err.message || "La conversación está siendo atendida por un agente.");
        await refreshStatus(sessionId);
      } else if (err.status === 429) {
        setError("Estás enviando mensajes muy rápido. Espera un momento e intenta de nuevo.");
      } else {
        setError("No pude procesar tu mensaje. Intenta de nuevo en un momento.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="public-chat-widget">
      <button
        type="button"
        className={`public-chat-widget__toggle${isOpen ? "" : " public-chat-widget__toggle--pill"}`}
        onClick={handleToggle}
        aria-label={isOpen ? "Cerrar chat" : `Abrir chat con ${responder.display_name}`}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X size={22} />
        ) : (
          <span className="public-chat-widget__pill">
            <ResponderAvatar key={`${responder.type}:${responder.avatar_url || ""}`} responder={responder} size={36} />
            <span className="public-chat-widget__pill-text">
              <span className="public-chat-widget__pill-name">{responder.display_name}</span>
              <span className="public-chat-widget__pill-status">{responder.status_label}</span>
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="public-chat-widget__panel"
          role="dialog"
          aria-modal="true"
          aria-label="Chat de asistencia de Ideas Estudio"
        >
          <header className="public-chat-widget__header">
            <div className="public-chat-widget__header-identity">
              <ResponderAvatar key={`${responder.type}:${responder.avatar_url || ""}`} responder={responder} size={40} />
              <div>
                <p className="public-chat-widget__title">{responder.display_name}</p>
                <p className="public-chat-widget__subtitle">{responder.status_label}</p>
              </div>
            </div>
            <button
              type="button"
              className="public-chat-widget__close"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar chat"
            >
              <X size={18} />
            </button>
          </header>

          {screen === "prechat" ? (
            <div className="public-chat-widget__messages public-chat-widget__messages--prechat">
              <PrechatForm onVerified={handlePrechatVerified} />
              {error && (
                <p className="public-chat-widget__error" role="alert" aria-live="assertive">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="public-chat-widget__messages" ref={scrollRef} aria-live="polite">
                {isStarting && messages.length === 0 && (
                  <p className="public-chat-widget__hint">Conectando…</p>
                )}
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`public-chat-widget__bubble public-chat-widget__bubble--${message.role}`}
                  >
                    <p>{message.content}</p>
                    {message.role === "assistant" && message.content && (
                      <div className="public-chat-widget__bubble-actions">
                        <CopyButton text={message.content} />
                      </div>
                    )}
                    {message.citations && message.citations.length > 0 && (
                      <div className="public-chat-widget__sources">
                        <p className="public-chat-widget__sources-heading">Fuentes consultadas:</p>
                        <ul className="public-chat-widget__citations">
                          {message.citations.map((citation) => (
                            <li key={citation.citation_id} className="public-chat-widget__citation">
                              {formatSourceLabel(citation)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="public-chat-widget__bubble public-chat-widget__bubble--assistant public-chat-widget__typing">
                    <span />
                    <span />
                    <span />
                  </div>
                )}
                {error && <p className="public-chat-widget__error">{error}</p>}
              </div>

              <form className="public-chat-widget__form" onSubmit={handleSend}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value.slice(0, MAX_MESSAGE_CHARS))}
                  placeholder="Escribe tu pregunta…"
                  maxLength={MAX_MESSAGE_CHARS}
                  disabled={isLoading}
                  aria-label="Escribe tu mensaje"
                />
                <button
                  type="submit"
                  className="public-chat-widget__send"
                  disabled={isLoading || !input.trim()}
                  aria-label="Enviar mensaje"
                >
                  <Send size={18} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
