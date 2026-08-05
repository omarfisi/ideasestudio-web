import { useEffect, useRef, useState } from "react";
import { Check, Copy, MessageCircle, Send, X } from "lucide-react";
import { getPublicChatEvents, sendPublicChatMessage, startPublicChat } from "@/services/publicChatApi.js";
import "./PublicChatWidget.css";

const SESSION_STORAGE_KEY = "aira_public_chat_session_v1";
const HISTORY_STORAGE_KEY = "aira_public_chat_history_v1";
const MAX_MESSAGE_CHARS = 800;
// Centro de Conversaciones: mientras el widget está abierto, se sondea
// periódicamente por si un agente humano respondió (AIRA no envía nada por
// su cuenta mientras un agente tiene el control — ver
// app/routers/public_chat.py). Intervalo modesto para no generar carga
// innecesaria en un chat que normalmente está inactivo entre mensajes.
const EVENTS_POLL_INTERVAL_MS = 5000;

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
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState(() => loadStoredHistory());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState(null);

  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const pollCursorRef = useRef(null);
  const seenServerIdsRef = useRef(new Set());

  useEffect(() => {
    persistHistory(messages);
  }, [messages]);

  // Polling con cursor: mientras el widget está abierto y hay una sesión,
  // pregunta por mensajes nuevos que no llegaron como respuesta directa a
  // /message — el caso real es la respuesta de un agente humano, que puede
  // llegar minutos después de que el visitante escribió. Filtra los
  // mensajes propios del visitante (role "user") — esos ya se muestran de
  // forma optimista al enviarlos, nunca se duplican acá.
  useEffect(() => {
    if (!isOpen || !sessionId) return undefined;
    const interval = setInterval(async () => {
      try {
        const data = await getPublicChatEvents(sessionId, pollCursorRef.current);
        const events = data?.events || [];
        if (events.length === 0) return;
        pollCursorRef.current = events[events.length - 1].created_at || pollCursorRef.current;
        const newOnes = events.filter((e) => e.role !== "user" && !seenServerIdsRef.current.has(e.id));
        if (newOnes.length === 0) return;
        newOnes.forEach((e) => seenServerIdsRef.current.add(e.id));
        setMessages((prev) => [...prev, ...newOnes.map((e) => ({ role: e.role === "agent" ? "assistant" : e.role, content: e.content, citations: [] }))]);
      } catch {
        // Poll silencioso — un fallo transitorio no debe interrumpir la sesión del visitante.
      }
    }, EVENTS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isOpen, sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  async function ensureSession() {
    const existing = loadStoredSession();
    if (existing) {
      setSessionId(existing);
      return existing;
    }
    setIsStarting(true);
    setError(null);
    try {
      const data = await startPublicChat();
      sessionStorage.setItem(SESSION_STORAGE_KEY, data.session_id);
      setSessionId(data.session_id);
      setMessages((prev) =>
        prev.length > 0 ? prev : [{ role: "assistant", content: data.greeting, citations: [] }]
      );
      return data.session_id;
    } catch {
      setError("No se pudo iniciar el chat. Intenta de nuevo en un momento.");
      return null;
    } finally {
      setIsStarting(false);
    }
  }

  function handleToggle() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && !sessionId) {
      ensureSession();
    }
  }

  async function handleSend(event) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const currentSessionId = sessionId || (await ensureSession());
    if (!currentSessionId) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const data = await sendPublicChatMessage(currentSessionId, trimmed);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response_text, citations: data.citations || [] },
      ]);
      // La respuesta directa ya se mostró — el polling solo debe traer lo
      // que llegue DESPUÉS de este momento (ej. un agente respondiendo más
      // tarde), nunca reprocesar/duplicar esta misma respuesta.
      pollCursorRef.current = new Date().toISOString();
    } catch (err) {
      if (err.status === 404) {
        // La sesión ya no existe del lado del servidor (reinicio, TTL, etc.)
        // — se limpia y se reintenta transparentemente una sola vez.
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        setSessionId(null);
        const newSessionId = await ensureSession();
        if (newSessionId) {
          try {
            const retryData = await sendPublicChatMessage(newSessionId, trimmed);
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: retryData.response_text, citations: retryData.citations || [] },
            ]);
            pollCursorRef.current = new Date().toISOString();
          } catch {
            setError("No pude procesar tu mensaje. Intenta de nuevo.");
          }
        }
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
        className="public-chat-widget__toggle"
        onClick={handleToggle}
        aria-label={isOpen ? "Cerrar chat" : "Abrir chat de asistencia"}
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {isOpen && (
        <div
          className="public-chat-widget__panel"
          role="dialog"
          aria-modal="true"
          aria-label="Chat de asistencia de Ideas Estudio"
        >
          <header className="public-chat-widget__header">
            <div>
              <p className="public-chat-widget__title">Ideas Estudio</p>
              <p className="public-chat-widget__subtitle">Asistente virtual</p>
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
                  <ul className="public-chat-widget__citations">
                    {message.citations.map((citation) => (
                      <li key={citation.citation_id} className="public-chat-widget__citation">
                        {citation.label || citation.document_title || "Fuente"}
                      </li>
                    ))}
                  </ul>
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
        </div>
      )}
    </div>
  );
}
