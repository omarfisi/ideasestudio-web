import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check, Copy, Send, X, MessageCircleQuestion, BookOpen, UserRound,
  ArrowLeft, Star, WifiOff,
} from "lucide-react";
import { getPublicChatEvents, ratePublicChat, sendPublicChatMessage, startPublicChat } from "@/services/publicChatApi.js";
import "./PublicChatWidget.css";

const SESSION_STORAGE_KEY = "aira_public_chat_session_v1";
const HISTORY_STORAGE_KEY = "aira_public_chat_history_v1";
const RATED_STORAGE_KEY = "aira_public_chat_rated_v1";
const MAX_MESSAGE_CHARS = 800;
// Centro de Conversaciones: mientras el widget está abierto, se sondea
// periódicamente por si un agente humano respondió (AIRA no envía nada por
// su cuenta mientras un agente tiene el control — ver
// app/routers/public_chat.py). Intervalo modesto para no generar carga
// innecesaria en un chat que normalmente está inactivo entre mensajes.
const EVENTS_POLL_INTERVAL_MS = 5000;

// Mismo logo real de marca ya usado en el resto del sitio (ver
// src/pages/AccountLoginPage.jsx) — nunca un ícono genérico inventado para
// este widget.
const BRAND_LOGO = "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/logos/favicon_ideasestudio.webp";

// Categorías rápidas del encargo — cada una solo prellena/envía un primer
// mensaje real a AIRA (nunca abre un flujo separado que no exista).
const CATEGORIES = [
  "Cotización", "Fotografía", "Video", "Branding",
  "Página web", "CRM", "Facturación", "Soporte técnico",
];

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

function loadRatedFlag() {
  try {
    return sessionStorage.getItem(RATED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function formatTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
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
    <button type="button" className="public-chat-widget__copy-btn" onClick={handleCopy} aria-label="Copiar respuesta">
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function StarRating({ value, onChange, disabled }) {
  return (
    <div className="public-chat-widget__stars" role="radiogroup" aria-label="Valoración de 1 a 5 estrellas">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          disabled={disabled}
          onClick={() => onChange(n)}
          className={`public-chat-widget__star-btn ${n <= value ? "public-chat-widget__star-btn--filled" : ""}`}
          aria-label={`${n} de 5 estrellas`}
        >
          <Star size={22} fill={n <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

function ResolvedRatingCard({ sessionId, onRated, alreadyRated }) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(!!alreadyRated);

  async function handleSubmit() {
    if (!score) return;
    setSubmitting(true);
    try {
      await ratePublicChat(sessionId, score, comment.trim() || undefined);
      setDone(true);
      onRated?.();
    } catch {
      // Si ya se valoró antes (already_rated) o falla la red, no bloqueamos
      // al visitante — igual se le agradece y se le ofrece iniciar de nuevo.
      setDone(true);
      onRated?.();
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="public-chat-widget__resolved-card">
        <p className="public-chat-widget__resolved-thanks">¡Gracias por tu valoración!</p>
      </div>
    );
  }

  return (
    <div className="public-chat-widget__resolved-card">
      <h3>La conversación fue marcada como resuelta</h3>
      <p>¿Cómo calificarías la atención?</p>
      <StarRating value={score} onChange={setScore} disabled={submitting} />
      <textarea
        className="public-chat-widget__rating-comment"
        placeholder="Comentario (opcional)"
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 1000))}
        disabled={submitting}
      />
      <button
        type="button"
        className="public-chat-widget__action-btn public-chat-widget__action-btn--primary"
        onClick={handleSubmit}
        disabled={submitting || !score}
        style={{ width: "100%", justifyContent: "center" }}
      >
        Enviar valoración
      </button>
    </div>
  );
}

export default function PublicChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [screen, setScreen] = useState("home"); // home | thread
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState(() => loadStoredHistory());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [controlMode, setControlMode] = useState("ai");
  const [agentName, setAgentName] = useState(null);
  const [supportStatus, setSupportStatus] = useState(null);
  const [rated, setRated] = useState(loadRatedFlag);

  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const pollCursorRef = useRef(null);
  const seenServerIdsRef = useRef(new Set());
  const prevControlModeRef = useRef("ai");

  useEffect(() => {
    persistHistory(messages);
  }, [messages]);

  // Estado de conexión del propio navegador — nunca inferido del backend.
  useEffect(() => {
    function goOnline() { setIsOnline(true); }
    function goOffline() { setIsOnline(false); }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Polling con cursor: mientras el widget está abierto y hay una sesión,
  // pregunta por mensajes nuevos que no llegaron como respuesta directa a
  // /message — el caso real es la respuesta de un agente humano, que puede
  // llegar minutos después de que el visitante escribió. Filtra los
  // mensajes propios del visitante (role "user") — esos ya se muestran de
  // forma optimista al enviarlos, nunca se duplican acá. También trae el
  // control_mode/agent_name real para las franjas de estado.
  useEffect(() => {
    if (!isOpen || !sessionId || !isOnline) return undefined;
    const interval = setInterval(async () => {
      try {
        const data = await getPublicChatEvents(sessionId, pollCursorRef.current);
        if (data?.control_mode) setControlMode(data.control_mode);
        if (data?.agent_name !== undefined) setAgentName(data.agent_name);
        if (data?.support_status) setSupportStatus(data.support_status);
        const events = data?.events || [];
        if (events.length === 0) return;
        pollCursorRef.current = events[events.length - 1].created_at || pollCursorRef.current;
        const newOnes = events.filter((e) => e.role !== "user" && !seenServerIdsRef.current.has(e.id));
        if (newOnes.length === 0) return;
        newOnes.forEach((e) => seenServerIdsRef.current.add(e.id));
        setMessages((prev) => [...prev, ...newOnes.map((e) => ({ role: e.role === "agent" ? "agent" : e.role, content: e.content, citations: [], created_at: e.created_at }))]);
      } catch {
        // Poll silencioso — un fallo transitorio no debe interrumpir la sesión del visitante.
      }
    }, EVENTS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isOpen, sessionId, isOnline]);

  // Narra en el hilo, como un evento del sistema, cuando un agente toma o
  // devuelve la conversación — nunca se inventa el nombre, solo se usa si
  // el backend lo mandó.
  useEffect(() => {
    if (prevControlModeRef.current === controlMode) return;
    const prev = prevControlModeRef.current;
    prevControlModeRef.current = controlMode;
    if (prev === "ai" && (controlMode === "human" || controlMode === "hybrid")) {
      setMessages((m) => [...m, { role: "system", content: `${agentName || "Un agente"} se unió a la conversación.` }]);
    } else if (prev !== "ai" && controlMode === "ai") {
      setMessages((m) => [...m, { role: "system", content: "La conversación volvió a AIRA." }]);
    }
  }, [controlMode, agentName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, screen]);

  useEffect(() => {
    if (isOpen && screen === "thread") {
      inputRef.current?.focus();
    }
  }, [isOpen, screen]);

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

  async function sendText(text) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const currentSessionId = sessionId || (await ensureSession());
    if (!currentSessionId) return;

    setScreen("thread");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const data = await sendPublicChatMessage(currentSessionId, trimmed);
      if (data.control_mode) setControlMode(data.control_mode);
      if (data.agent_name !== undefined) setAgentName(data.agent_name);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response_text, citations: data.citations || [] },
      ]);
      pollCursorRef.current = new Date().toISOString();
    } catch (err) {
      if (err.status === 404) {
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

  function handleSend(event) {
    event.preventDefault();
    sendText(input);
  }

  function handleStartConversation() {
    setScreen("thread");
    if (!sessionId) ensureSession();
  }

  function handleAskQuestion() {
    handleStartConversation();
  }

  function handleSearchDocs() {
    sendText("Quiero buscar información en la documentación.");
  }

  function handleTalkToHuman() {
    sendText("Quiero hablar con una persona, por favor.");
  }

  function handleCategory(category) {
    sendText(`Tengo una consulta sobre: ${category}.`);
  }

  function handleNewConversation() {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(HISTORY_STORAGE_KEY);
    sessionStorage.removeItem(RATED_STORAGE_KEY);
    setSessionId(null);
    setMessages([]);
    setControlMode("ai");
    setAgentName(null);
    setSupportStatus(null);
    setRated(false);
    setScreen("home");
    seenServerIdsRef.current = new Set();
    pollCursorRef.current = null;
  }

  function handleRated() {
    setRated(true);
    try {
      sessionStorage.setItem(RATED_STORAGE_KEY, "1");
    } catch {
      // no-op — solo evita volver a mostrar la tarjeta de valoración en esta sesión.
    }
  }

  const statusLabel = useMemo(() => {
    if (!isOnline) return { text: "Sin conexión", dot: "offline" };
    if (controlMode === "human" || controlMode === "hybrid") return { text: agentName ? `${agentName} disponible` : "Agente disponible", dot: "busy" };
    return { text: "AIRA disponible", dot: "online" };
  }, [controlMode, agentName, isOnline]);

  const showResolvedCard = supportStatus === "resolved";
  const waitingForAgent = (controlMode === "human" || controlMode === "hybrid") && supportStatus !== "resolved";

  return (
    <div className="public-chat-widget">
      <button
        type="button"
        className="public-chat-widget__toggle"
        onClick={handleToggle}
        aria-label={isOpen ? "Cerrar chat de soporte" : "Abrir Soporte Técnico"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <span className="public-chat-widget__toggle-close"><X size={16} /></span>
        ) : (
          <span className="public-chat-widget__toggle-icon">
            <img src={BRAND_LOGO} alt="" />
            <span className="public-chat-widget__toggle-dot" />
          </span>
        )}
        Soporte Técnico
      </button>

      {isOpen && (
        <div className="public-chat-widget__panel" role="dialog" aria-modal="true" aria-label="Soporte Técnico de Ideas Estudio">
          <header className="public-chat-widget__header">
            <div className="public-chat-widget__header-left">
              {screen === "thread" && (
                <button type="button" className="public-chat-widget__back" onClick={() => setScreen("home")} aria-label="Volver al inicio">
                  <ArrowLeft size={16} />
                </button>
              )}
              <span className="public-chat-widget__header-avatar"><img src={BRAND_LOGO} alt="" /></span>
              <div>
                <p className="public-chat-widget__title">Ideas Estudio</p>
                <p className="public-chat-widget__subtitle">
                  <span className={`public-chat-widget__status-dot public-chat-widget__status-dot--${statusLabel.dot}`} />
                  {statusLabel.text}
                </p>
              </div>
            </div>
            <button type="button" className="public-chat-widget__close" onClick={() => setIsOpen(false)} aria-label="Cerrar chat">
              <X size={18} />
            </button>
          </header>

          {!isOnline && (
            <div className="public-chat-widget__banner public-chat-widget__banner--offline">
              <WifiOff size={13} /> Sin conexión — reconectando cuando vuelva internet…
            </div>
          )}

          {screen === "home" ? (
            <div className="public-chat-widget__home">
              <div className="public-chat-widget__greeting">
                <h2>¡Hola! 👋</h2>
                <p>Soy el asistente virtual de Ideas Estudio. ¿En qué podemos ayudarte?</p>
              </div>

              <div>
                <p className="public-chat-widget__section-label">Categorías rápidas</p>
                <div className="public-chat-widget__categories">
                  {CATEGORIES.map((c) => (
                    <button key={c} type="button" className="public-chat-widget__category-btn" onClick={() => handleCategory(c)}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="public-chat-widget__actions">
                <button type="button" className="public-chat-widget__action-btn public-chat-widget__action-btn--primary" onClick={handleAskQuestion}>
                  Hacer una pregunta
                  <MessageCircleQuestion size={16} />
                </button>
                <button type="button" className="public-chat-widget__action-btn" onClick={handleSearchDocs}>
                  <BookOpen size={16} /> Buscar en la documentación
                </button>
                <button type="button" className="public-chat-widget__action-btn" onClick={handleTalkToHuman}>
                  <UserRound size={16} /> Hablar con una persona
                </button>
              </div>
            </div>
          ) : (
            <>
              {waitingForAgent && (
                <div className="public-chat-widget__banner public-chat-widget__banner--human">
                  {agentName ? `${agentName} tomó tu conversación.` : "Esperando a que un agente tome tu conversación…"}
                </div>
              )}

              <div className="public-chat-widget__messages" ref={scrollRef} aria-live="polite">
                {isStarting && messages.length === 0 && (
                  <p className="public-chat-widget__hint">Conectando…</p>
                )}
                {messages.map((message, index) => {
                  if (message.role === "system") {
                    return <p key={index} className="public-chat-widget__system-message">{message.content}</p>;
                  }
                  return (
                    <div key={index} className={`public-chat-widget__bubble-row public-chat-widget__bubble-row--${message.role}`}>
                      {message.created_at && <span className="public-chat-widget__bubble-meta">{formatTime(message.created_at)}</span>}
                      <div className="public-chat-widget__bubble">
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
                    </div>
                  );
                })}
                {isLoading && controlMode === "ai" && (
                  <div className="public-chat-widget__typing">
                    <div className="public-chat-widget__typing-bubble"><span /><span /><span /></div>
                  </div>
                )}
                {error && <p className="public-chat-widget__error">{error}</p>}

                {showResolvedCard && (
                  <ResolvedRatingCard sessionId={sessionId} onRated={handleRated} alreadyRated={rated} />
                )}
                {supportStatus === "resolved" && rated && (
                  <button type="button" className="public-chat-widget__new-conversation-btn" onClick={handleNewConversation}>
                    Crear nueva conversación
                  </button>
                )}
              </div>

              <form className="public-chat-widget__form" onSubmit={handleSend}>
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(event) => setInput(event.target.value.slice(0, MAX_MESSAGE_CHARS))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendText(input);
                    }
                  }}
                  placeholder="Escribe tu pregunta…"
                  maxLength={MAX_MESSAGE_CHARS}
                  disabled={isLoading || !isOnline || supportStatus === "resolved"}
                  aria-label="Escribe tu mensaje"
                />
                <button
                  type="submit"
                  className="public-chat-widget__send"
                  disabled={isLoading || !input.trim() || !isOnline || supportStatus === "resolved"}
                  aria-label="Enviar mensaje"
                >
                  <Send size={18} />
                </button>
              </form>
            </>
          )}

          <p className="public-chat-widget__powered-by">Powered by AIRA · Ideas Estudio</p>
        </div>
      )}
    </div>
  );
}
