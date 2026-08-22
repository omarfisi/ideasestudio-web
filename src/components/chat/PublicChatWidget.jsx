import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Copy, MessageCircle, Send, User, X } from "lucide-react";
import {
  forgetVisitor,
  getPublicChatEvents,
  getPublicChatStatus,
  recognizeVisitor,
  sendPublicChatMessage,
  startPublicChat,
} from "@/services/publicChatApi.js";
import PrechatForm from "./PrechatForm.jsx";
import "./PublicChatWidget.css";

const SESSION_STORAGE_KEY = "aira_public_chat_session_v1";
const HISTORY_STORAGE_KEY = "aira_public_chat_history_v1";
const MAX_MESSAGE_CHARS = 800;

// FASE HANDOFF H3B — polling de GET /public/chat/events. Encadenado
// (nunca setInterval): cada corrida programa la siguiente recién cuando
// termina, así nunca hay dos /events en vuelo. 3s es el ritmo normal
// (~20 req/min, bien por debajo del límite de sesión de 30/min del
// backend); tras un 429 se aplica backoff (Retry-After real del backend
// si el cliente lo expuso, si no un fallback fijo); tras un 503/error de
// red, un backoff más corto porque puede ser un blip transitorio. Un poll
// exitoso siempre vuelve al ritmo normal.
const EVENTS_POLL_NORMAL_MS = 3000;
const EVENTS_POLL_RATE_LIMITED_FALLBACK_MS = 10000;
const EVENTS_POLL_ERROR_BACKOFF_MS = 5000;

// FASE HANDOFF H3B.7 — el backend expone role customer/assistant/agent
// (ver PublicChatEventMessage); el widget siempre pensó en términos de
// user/assistant. Se normaliza acá, en un único punto, para que el resto
// del componente (CSS, matching de reconciliación) nunca tenga que
// conocer el vocabulario del backend.
const SERVER_ROLE_TO_VISUAL_ROLE = { customer: "user", assistant: "assistant", agent: "agent" };

function normalizeServerMessage(row) {
  return {
    id: row.id,
    role: SERVER_ROLE_TO_VISUAL_ROLE[row.role] || row.role,
    content: row.content,
    citations: row.citations || [],
    created_at: row.created_at,
    source: "server",
  };
}

// FASE HANDOFF H3B.6/H3B.8/H3B.1 — reconcilia el snapshot server-
// authoritative de /events con el estado local actual, SIN duplicar
// mensajes y SIN perder nada que el snapshot todavía no conozca:
//
//  - el saludo inicial (source:"greeting") nunca viene en /events (no se
//    persiste server-side — ver POST /start) y nunca se toca acá, se
//    conserva siempre primero.
//  - los mensajes ya confirmados por el servidor (source:"server" de una
//    reconciliación anterior) se REEMPLAZAN por completo por el snapshot
//    fresco -- /events siempre manda la verdad completa y vigente, nunca
//    un delta -- así que no hace falta "mergear" fila por fila.
//  - los mensajes locales todavía no confirmados (source:"local": el eco
//    optimista del visitante en handleSend, o la respuesta de AIRA que
//    ese mismo handleSend ya mostró desde el POST) se emparejan 1:1,
//    EN ORDEN, contra las filas server NUEVAS (ver knownServerIds abajo)
//    del mismo rol visual y mismo contenido -- nunca con un Set(content),
//    que fallaría con mensajes idénticos repetidos.
//  - un mensaje local confirmado que llevaba `cta` (FASE 3B.2, que
//    /events no expone en absoluto) transmite esa cta a la fila server
//    con la que se emparejó, para no perderla al reconciliar.
//
// FASE HANDOFF H3B.1 (P2, revisión de H3B) — knownServerIds es el set de
// ids server ya vistos en un poll ANTERIOR (o restaurados de sessionStorage
// al montar, ver su inicialización en el efecto de polling). Una fila
// server cuyo id ya está en ese set NUNCA participa del matching como
// candidata -- se renderiza tal cual, no se le "roba" un pending nuevo.
// Sin esto, un pending recién creado con el MISMO rol+contenido que un
// mensaje histórico ya renderizado (p. ej. el visitante vuelve a escribir
// "hola") podía emparejarse contra ESE mensaje viejo mientras el snapshot
// todavía no incluye la fila NUEVA real -- el pending desaparecía
// prematuramente (o, para assistant, la cta terminaba pegada a una
// respuesta histórica en vez de a la nueva).
//
// FASE HANDOFF H3B.3 (P2, revisión de H3B.2) — claimByServerId es
// Map<serverId, {sendAttemptId, cta}>: registra, de forma PERMANENTE
// (sobrevive a todos los polls siguientes), qué intento de envío
// (sendAttemptId, identidad estable generada en handleSend ANTES del
// POST) quedó asociado a cada fila server, y con qué cta. Dos problemas
// que esto resuelve:
//   1) /events nunca expone cta -- sin este mapa persistente, una fila ya
//      conocida (knownServerIds) volvía a mapearse "en limpio" en CADA
//      poll siguiente (normalizeServerMessage nunca trae cta), perdiendo
//      la cta que se le había asociado apenas un poll antes.
//   2) permite a handleSend() (ver H3B.3 ahí) distinguir con certeza "una
//      fila que YA le pertenece a otro intento de envío" de "una fila
//      libre que recién apareció durante MI propio envío" -- el criterio
//      knownIdsAtSendStart por sí solo no alcanza cuando dos envíos con
//      contenido idéntico se solapan en el tiempo.
function reconcileMessages(localMessages, serverRows, knownServerIds, claimByServerId) {
  const serverMessages = serverRows.map(normalizeServerMessage);
  const greeting = localMessages.find((m) => m.source === "greeting") || null;

  const pendingByRole = { user: [], assistant: [] };
  for (const message of localMessages) {
    if (message.source === "local" && pendingByRole[message.role]) {
      pendingByRole[message.role].push(message);
    }
  }
  const consumedCount = { user: 0, assistant: 0 };
  const newClaims = [];

  const enrichedServer = serverMessages.map((serverMessage) => {
    const existingClaim = claimByServerId?.get(serverMessage.id);
    if (knownServerIds?.has(serverMessage.id)) {
      // Ya visto -- nunca vuelve a ser candidato de matching, pero SÍ
      // conserva la cta ya reclamada en un poll (o envío) anterior.
      return existingClaim?.cta ? { ...serverMessage, cta: existingClaim.cta } : serverMessage;
    }
    const bucket = pendingByRole[serverMessage.role];
    if (!bucket) return serverMessage;
    const candidate = bucket[consumedCount[serverMessage.role]];
    if (candidate && candidate.content === serverMessage.content) {
      consumedCount[serverMessage.role] += 1;
      const cta = candidate.cta || null;
      newClaims.push({ serverId: serverMessage.id, sendAttemptId: candidate.sendAttemptId, cta });
      return cta ? { ...serverMessage, cta } : serverMessage;
    }
    return serverMessage;
  });

  const stillPending = [
    ...pendingByRole.user.slice(consumedCount.user),
    ...pendingByRole.assistant.slice(consumedCount.assistant),
  ];

  const result = [];
  if (greeting) result.push(greeting);
  result.push(...enrichedServer);
  result.push(...stillPending);
  return { messages: result, newClaims };
}

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
  // FASE HANDOFF H3B.12 — hidratado de forma EAGER desde sessionStorage
  // (antes null, solo se llenaba al abrir el panel por primera vez): el
  // polling de /events debe poder arrancar en cuanto exista una sesión
  // restaurada, sin esperar a que el visitante abra el widget (ver el
  // efecto de polling más abajo, que depende de sessionId).
  const [sessionId, setSessionId] = useState(() => loadStoredSession());
  const [messages, setMessages] = useState(() => loadStoredHistory());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState(null);
  const [responder, setResponder] = useState(AIRA_RESPONDER);
  // FASE 4 — {full_name, email, phone} si POST /recognize reconoció al
  // visitante (cookie válida), o null. Solo se usa para precargar
  // PrechatForm — nunca decide nada por sí solo, el usuario siempre ve y
  // puede editar/confirmar estos datos antes de enviarlos.
  const [recognizedVisitor, setRecognizedVisitor] = useState(null);

  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  // FASE HANDOFF H3B.12 — con sessionId ahora hidratado de forma eager
  // (ver su useState arriba), handleToggle() ya no puede usar "sessionId
  // está vacío" como señal de "todavía no gestioné la primera apertura".
  // Este ref reemplaza esa señal: se marca true la primera vez que el
  // panel se abre, independientemente de si había o no sesión restaurada.
  const hasHandledFirstOpenRef = useRef(false);

  // FASE HANDOFF H3B.2/H3B.14 — estado del poller de /events, en refs
  // (nunca en state: no debe disparar re-render por sí solo). generationRef
  // es el guard contra respuestas stale: se incrementa cada vez que el
  // efecto de polling se limpia (cambio de sessionId/screen, unmount, o un
  // 404 que termina la sesión desde ADENTRO del propio poll) — cualquier
  // callback en vuelo que pertenezca a una generación anterior se descarta
  // sin tocar estado (cubre A: sesión A->B, y B: unmount).
  const pollGenerationRef = useRef(0);
  const pollTimeoutRef = useRef(null);
  const pollAbortRef = useRef(null);
  const pollDelayRef = useRef(EVENTS_POLL_NORMAL_MS);
  // FASE HANDOFF H3B.1 — ids server ya vistos por esta pestaña (de un poll
  // anterior en esta misma sesión, o restaurados de sessionStorage al
  // montar). Ver reconcileMessages() para por qué es necesario: nunca deja
  // que un pending nuevo se empareje contra un mensaje histórico idéntico
  // ya renderizado. Reasignado (nunca mutado in-place) desde el poller —
  // ver ese efecto para el porqué de evitar la mutación en el sitio.
  const knownServerIdsRef = useRef(new Set());
  // FASE HANDOFF H3B.3 — Map<serverId, {sendAttemptId, cta}>: quién
  // reclamó cada fila server y con qué cta, de forma permanente (nunca se
  // "olvida" en el siguiente poll). Ver el docstring de reconcileMessages()
  // para el porqué completo. Reasignado (nunca mutado in-place), mismo
  // criterio que knownServerIdsRef.
  const claimByServerIdRef = useRef(new Map());
  // Última `messages` conocida, actualizada en CADA render (sin efecto
  // de por medio, mismo patrón que activeConversationIdRef en el H2B del
  // CRM): el poller necesita poder sembrar knownServerIdsRef con el
  // estado YA renderizado (incluida la historia restaurada de
  // sessionStorage) en el momento exacto en que arranca su cadena, sin
  // que esto dispare un re-render del propio efecto de polling cada vez
  // que `messages` cambia.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  // FASE HANDOFF H3B.2 — última sessionId conocida, actualizada en CADA
  // render (mismo patrón que activeConversationIdRef del H2B del CRM):
  // handleSend() necesita poder comparar, cuando su propio POST resuelve
  // (éxito o error), si la sesión para la que lo envió sigue siendo la
  // activa -- si el visitante ya pasó a la sesión B (expiró y volvió a
  // completar el pre-chat) mientras el POST de A seguía en vuelo, esa
  // respuesta tardía debe ignorarse por completo, nunca tocar el estado
  // de B.
  const currentSessionIdRef = useRef(sessionId);
  currentSessionIdRef.current = sessionId;

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

  // FASE HANDOFF H3B — limpia sesión + historial de forma consistente ante
  // una expiración real (404 de /message, /status o /events): nunca deja
  // que el historial de una sesión vieja sobreviva para mezclarse con el
  // de la próxima (H3B.13).
  const expireSession = useCallback((message) => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(HISTORY_STORAGE_KEY);
    setSessionId(null);
    setMessages([]);
    setScreen("prechat");
    setResponder(AIRA_RESPONDER);
    setError(message);
    // FASE HANDOFF H3B.2 — reset explícito, independiente de si handleSend()
    // decide o no tocar isLoading en su propio finally (que se salta a
    // propósito cuando detecta que su POST quedó stale, ver más abajo):
    // la sesión NUEVA que arranque después de esta expiración siempre debe
    // encontrar el composer habilitado, sin importar qué tan tarde
    // resuelva un POST de la sesión vieja.
    setIsLoading(false);
  }, []);

  // LEVEL2: consulta puntual (nunca en intervalo propio) del responder
  // actual de una sesión existente. Se llama al abrir el widget con una
  // sesión ya guardada (restore) y una vez después de un 409 de /message
  // (ver handleSend) — el polling de /events (más abajo) es hoy el
  // mecanismo continuo real que mantiene actualizado el responder
  // (H3B.11); esta función se conserva por compatibilidad y para el
  // manejo inmediato del 409, nunca crea un segundo intervalo.
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
        expireSession("Tu sesión anterior expiró. Completa el formulario de nuevo para continuar.");
        return;
      }
      // 503/429/cualquier otro fallo: /status es auxiliar, nunca crítico —
      // se conserva el último responder conocido, sin inventar datos y sin
      // reintentar automáticamente. La conversación sigue funcionando igual.
    }
  }

  // FASE HANDOFF H3B.2 — poller de GET /public/chat/events. Condiciones:
  // existe sessionId Y screen==="chat" (ver H3B.2/H3B.7); deliberadamente
  // NUNCA depende de isOpen — debe seguir vivo con el panel cerrado
  // mientras la sesión siga activa en esta pestaña (H3B.2), para que un
  // agente que responde mientras el visitante minimizó el widget ya esté
  // reflejado al reabrir, sin esperar una acción adicional.
  //
  // Encadenado (nunca setInterval): cada corrida programa la siguiente
  // SOLO cuando termina (éxito o error), así nunca hay dos /events en
  // vuelo (H3B.2/H3B.3). El primer poll de cada sesión corre de inmediato
  // (sin esperar 3s) para que un reload/restore recupere el estado actual
  // lo antes posible (H3B.12).
  useEffect(() => {
    if (!sessionId || screen !== "chat") return undefined;

    const myGeneration = ++pollGenerationRef.current;
    pollDelayRef.current = EVENTS_POLL_NORMAL_MS;
    // FASE HANDOFF H3B.1/H3B.3 — semilla con los ids server (y sus cta ya
    // reclamadas) YA presentes en el estado local en este momento (de una
    // reconciliación previa en esta misma cadena, o restaurados de
    // sessionStorage al montar/restaurar — ver H3B.15 item 6). El primer
    // poll de esta cadena nunca debe tratar un mensaje histórico ya
    // renderizado como "nuevo", y una cta ya persistida en un mensaje
    // restaurado no debe perderse en el primer poll tras el reload.
    knownServerIdsRef.current = new Set(
      messagesRef.current.filter((m) => m.source === "server" && m.id).map((m) => m.id)
    );
    claimByServerIdRef.current = new Map(
      messagesRef.current
        .filter((m) => m.source === "server" && m.id && m.cta)
        .map((m) => [m.id, { sendAttemptId: null, cta: m.cta }])
    );

    async function runPoll() {
      if (pollGenerationRef.current !== myGeneration) return; // esta cadena ya no es la vigente
      const controller = new AbortController();
      pollAbortRef.current = controller;
      try {
        const data = await getPublicChatEvents(sessionId, { signal: controller.signal });
        if (pollGenerationRef.current !== myGeneration) return; // stale: la sesión cambió mientras la request estaba en vuelo
        const rows = data?.messages || [];
        // FASE HANDOFF H3B.1/H3B.3 — reconcilia contra el estado DE ANTES
        // de esta corrida (referencias estables, nunca mutadas in-place:
        // si mutáramos las refs directamente acá, el updater de
        // setMessages de abajo -- que React puede invocar en cualquier
        // momento posterior -- vería el estado YA actualizado con lo de
        // ESTE mismo poll, perdiendo la distinción "viejo vs. nuevo" que
        // es todo el punto de ambos fixes). Recién después de reconciliar
        // se arma el PRÓXIMO estado (con esto ya incluido) y se reasignan
        // las refs.
        const knownBeforeThisPoll = knownServerIdsRef.current;
        // FASE HANDOFF H3B.3 — la reasignación de knownServerIdsRef/
        // claimByServerIdRef ocurre DENTRO del propio updater, no
        // después de llamar a setMessages(): fuera de un handler de
        // evento de React (como acá, dentro de una cadena async), no hay
        // garantía de que React invoque el updater de forma síncrona —
        // leer producedClaims/producedRows justo después de setMessages()
        // podía ejecutarse ANTES de que el updater realmente corriera,
        // dejando las refs sin actualizar.
        //
        // knownBeforeThisPoll (snapshot congelado) se usa SOLO para
        // decidir qué fila es "vieja vs. nueva" en esta reconciliación en
        // particular -- nada más escribe knownServerIdsRef, así que esa
        // distinción temporal es segura tal cual.
        //
        // claimByServerIdRef, en cambio, se lee SIEMPRE en vivo
        // (claimByServerIdRef.current, nunca un snapshot congelado de
        // "antes"): handleSend() puede escribir su propio reclamo ahí de
        // forma concurrente (ver H3B.3 ahí) mientras este updater seguía
        // en cola -- tanto para decidir qué cta mostrar en una fila ya
        // conocida (lectura) como para construir el próximo mapa
        // (escritura), partir de un snapshot viejo descartaría ese
        // reclamo ajeno en cualquiera de los dos sentidos.
        setMessages((prev) => {
          const { messages: reconciled, newClaims } = reconcileMessages(
            prev, rows, knownBeforeThisPoll, claimByServerIdRef.current
          );
          const nextKnownIds = new Set(knownServerIdsRef.current);
          for (const row of rows) if (row?.id) nextKnownIds.add(row.id);
          knownServerIdsRef.current = nextKnownIds;
          if (newClaims.length) {
            const nextClaims = new Map(claimByServerIdRef.current);
            for (const claim of newClaims) {
              nextClaims.set(claim.serverId, { sendAttemptId: claim.sendAttemptId, cta: claim.cta });
            }
            claimByServerIdRef.current = nextClaims;
          }
          return reconciled;
        });
        const sanitized = sanitizeResponder(data?.responder);
        if (sanitized) setResponder(sanitized);
        pollDelayRef.current = EVENTS_POLL_NORMAL_MS;
      } catch (err) {
        // Cleanup (cambio de sesión/unmount) aborta el fetch en vuelo —
        // nunca es un error real, nunca se muestra al visitante (H3B.5).
        if (err?.name === "AbortError") return;
        if (pollGenerationRef.current !== myGeneration) return; // stale
        if (err?.status === 404) {
          // Invalida esta cadena ANTES de expireSession(): expireSession
          // pone sessionId en null, pero el efecto de limpieza que
          // reacciona a ese cambio corre recién en el próximo commit —
          // sin este incremento acá, el finally de abajo alcanzaría a
          // reprogramar un poll para una sesión que ya se está cerrando.
          pollGenerationRef.current += 1;
          expireSession("Tu sesión anterior expiró. Completa el formulario de nuevo para continuar.");
          return;
        }
        if (err?.status === 429) {
          // MVP: usa el Retry-After real del backend si publicChatApi.js
          // lo expuso (ver H3B.3); si no, un fallback fijo. Nunca borra la
          // sesión, nunca reintenta de inmediato, nunca es un error fatal.
          pollDelayRef.current = err.retryAfterSeconds
            ? err.retryAfterSeconds * 1000
            : EVENTS_POLL_RATE_LIMITED_FALLBACK_MS;
        } else {
          // 503 / error de red / cualquier otro — nunca destruye la sesión
          // ni el historial (H3B.5): se conserva el último snapshot y
          // responder conocidos, se reintenta en el próximo ciclo con un
          // backoff prudente.
          pollDelayRef.current = EVENTS_POLL_ERROR_BACKOFF_MS;
        }
      } finally {
        if (pollGenerationRef.current === myGeneration) {
          pollTimeoutRef.current = setTimeout(runPoll, pollDelayRef.current);
        }
      }
    }

    runPoll();

    return () => {
      pollGenerationRef.current += 1;
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
      pollAbortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- expireSession es estable (useCallback []), incluirla no cambia el comportamiento
  }, [sessionId, screen]);

  // prechatToken es opcional: solo se usa cuando viene de un pre-chat recién
  // verificado (ver handlePrechatVerified). Si ya hay sesión guardada, ni
  // siquiera se llama al backend — esa es la razón de que el gate de
  // /public/chat/start solo se ejercite una vez por visita. rememberMe
  // (FASE 4) solo importa la primera vez (cuando sí se llama a /start) —
  // nunca se reenvía en el camino de sesión ya existente.
  async function ensureSession(prechatToken, rememberMe = false) {
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
      const data = await startPublicChat(prechatToken, rememberMe);
      sessionStorage.setItem(SESSION_STORAGE_KEY, data.session_id);
      setSessionId(data.session_id);
      // FASE HANDOFF H3B.13 — una sesión NUEVA (por definición, este es el
      // único camino que llega hasta acá: ensureSession() ya devolvió antes
      // si había una sesión existente) nunca debe arrastrar mensajes de una
      // sesión anterior ya expirada — se reemplaza el historial por
      // completo, nunca se preserva `prev`. El saludo es puramente local:
      // POST /start no lo persiste server-side, así que /events jamás lo
      // devolverá — se marca source:"greeting" para que la reconciliación
      // (ver reconcileMessages) lo conserve siempre, sin intentar
      // emparejarlo contra nada del snapshot.
      setMessages([{ sendAttemptId: "greeting", source: "greeting", role: "assistant", content: data.greeting, citations: [] }]);
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
    if (!nextOpen || hasHandledFirstOpenRef.current) return;
    hasHandledFirstOpenRef.current = true;
    if (sessionId) {
      // FASE HANDOFF H3B.12 — sessionId ya viene hidratado de forma eager
      // desde sessionStorage (ver su useState arriba): el polling de
      // /events ya arrancó en cuanto montó el componente, sin esperar
      // esta primera apertura. Se conserva esta consulta puntual de
      // /status al abrir por primera vez -- comportamiento existente
      // (LEVEL2), nunca un segundo intervalo (H3B.11).
      refreshStatus(sessionId);
    } else {
      // FASE 4 — el pre-chat se muestra de inmediato, sin esperar a
      // recognizeVisitor() (nunca se agrega latencia a abrir el widget).
      // El reconocimiento llega en paralelo y PrechatForm se autocompleta
      // cuando resuelve (ver su useEffect) — si el usuario ya empezó a
      // escribir, nunca se le pisan sus propios datos. Ante cualquier
      // fallo (red, backend caído, flag apagado), recognizeVisitor() ya
      // responde {recognized: false} — nunca lanza.
      setScreen("prechat");
      recognizeVisitor()
        .then((data) => setRecognizedVisitor(data?.recognized ? data : null))
        .catch(() => setRecognizedVisitor(null));
    }
  }

  async function handlePrechatVerified(prechatToken, rememberMe) {
    await ensureSession(prechatToken, rememberMe);
  }

  // FASE 4 — "olvidar" al visitante en este navegador. Best-effort desde la
  // perspectiva de la UI: si falla, igualmente se limpia el estado local
  // precargado, para que el usuario nunca vea datos que ya pidió borrar.
  async function handleForgetVisitor() {
    try {
      await forgetVisitor();
    } finally {
      setRecognizedVisitor(null);
    }
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
    // FASE HANDOFF H3B.8/H3B.3 — identidad puramente local del eco
    // optimista del visitante. NUNCA se envía al backend (H1.5 ya tiene su
    // propio client_message_id — mismo valor, reutilizado, no dos
    // identidades distintas): sirve solo para que reconcileMessages()
    // pueda emparejarlo 1:1 contra la fila server correspondiente una vez
    // que /events la confirme, y para darle a React una key estable
    // mientras tanto.
    const userSendAttemptId = clientMessageId;
    // FASE HANDOFF H3B.3 — identidad estable de la respuesta assistant de
    // ESTE intento, generada YA (antes de saber si gana el POST o un poll
    // concurrente) para poder registrar el reclamo con ella sin importar
    // quién gane la carrera (ver claimByServerIdRef más abajo).
    const assistantSendAttemptId = crypto.randomUUID();

    // FASE HANDOFF H3B.2 — la sesión de ESTE envío queda fija en el
    // momento del submit; toda continuación después de un await se
    // compara contra currentSessionIdRef antes de tocar cualquier
    // estado/ref compartido. Si el visitante ya pasó a otra sesión
    // mientras este POST seguía en vuelo, la respuesta se ignora por
    // completo (nunca se cancela el envío en sí, solo sus efectos de UI).
    const sentForSessionId = sessionId;
    // FASE HANDOFF H3B.2/H3B.3 — snapshot de los ids server ya conocidos
    // ANTES de este envío. El POST /message y el poller de /events corren
    // en paralelo: si un poll gana la carrera y ya incorpora la fila
    // assistant real ANTES de que este POST resuelva del lado del
    // navegador, esa fila queda marcada "conocida" (ver knownServerIdsRef)
    // sin que exista todavía un pending local que la reclame. Necesario
    // pero NO suficiente por sí solo (ver claimByServerIdRef abajo): con
    // dos envíos de contenido idéntico solapados, una fila que apareció
    // "durante MI envío" puede en realidad pertenecer al OTRO envío.
    const knownIdsAtSendStart = new Set(knownServerIdsRef.current);

    setMessages((prev) => [
      ...prev,
      { sendAttemptId: userSendAttemptId, role: "user", content: trimmed, pending: true, source: "local" },
    ]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const data = await sendPublicChatMessage(sessionId, trimmed, clientMessageId);
      if (currentSessionIdRef.current !== sentForSessionId) return; // stale — ya estamos en otra sesión
      setMessages((prev) => {
        // FASE HANDOFF H3B.2/H3B.3 — ¿un poll ya ganó la carrera y esta
        // respuesta ya está en pantalla como fila server? Se reconoce por
        // mismo rol/contenido exacto Y (a) un id que NO era conocido al
        // empezar este envío (nunca se compara contra historia vieja —
        // ver H3B.1) Y (b) que NADIE la haya reclamado todavía
        // (claimByServerIdRef — ver H3B.3). La condición (a) sola NO
        // alcanza: con dos envíos de contenido idéntico solapados, una
        // fila "no conocida al empezar MI envío" puede haber sido
        // reclamada por OTRO envío mientras el mío seguía en vuelo — (b)
        // es la que impide confundir esa fila ajena con la propia.
        const alreadyPolled = prev.find(
          (m) =>
            m.source === "server" &&
            m.role === "assistant" &&
            m.content === data.response_text &&
            !knownIdsAtSendStart.has(m.id) &&
            !claimByServerIdRef.current.has(m.id)
        );
        if (alreadyPolled) {
          const cta = data.cta || null;
          // Reasignación, nunca mutación in-place del Map anterior (mismo
          // criterio que knownServerIdsRef/claimByServerIdRef en el poller).
          const nextClaims = new Map(claimByServerIdRef.current);
          nextClaims.set(alreadyPolled.id, { sendAttemptId: assistantSendAttemptId, cta });
          claimByServerIdRef.current = nextClaims;
          if (!cta) return prev;
          return prev.map((m) => (m === alreadyPolled ? { ...m, cta } : m));
        }
        // Camino normal: el POST ganó la carrera (o no hay carrera en
        // absoluto) — se agrega como pending local, igual que siempre.
        // FASE 3B.2 — cta ya viene armado y decidido 100% por el backend
        // (nunca generado por este componente): solo se guarda tal cual
        // para renderizar, o null si no hay ninguno. FASE HANDOFF H3B.9 —
        // se muestra de inmediato (Opción A: no se dispara un /events
        // extra acá) y queda como source:"local" hasta que el próximo
        // poll normal de /events la reconcilie 1:1 contra la fila server
        // — reconcileMessages() traslada la cta a esa fila (y la registra
        // en claimByServerIdRef, ver H3B.3) para no perderla (el contrato
        // de /events no expone cta en absoluto).
        return [
          ...prev,
          {
            sendAttemptId: assistantSendAttemptId,
            role: "assistant",
            content: data.response_text,
            citations: data.citations || [],
            cta: data.cta || null,
            pending: true,
            source: "local",
          },
        ];
      });
      const sanitized = sanitizeResponder(data.responder);
      if (sanitized) setResponder(sanitized);
    } catch (err) {
      if (currentSessionIdRef.current !== sentForSessionId) return; // stale — idem para error/red/409/429
      if (err.status === 404) {
        // La sesión ya no existe del lado del servidor (reinicio, TTL,
        // etc.). El prechat_token original ya se consumió al crearla, así
        // que no se puede reabrir sola: se pide el formulario de nuevo en
        // vez de reintentar en silencio.
        expireSession("Tu sesión anterior expiró. Completa el formulario de nuevo para continuar.");
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
      // Mismo guard: si ya estamos en otra sesión, isLoading de ESTA vista
      // ya fue reseteado (o reactivado por un envío propio de la sesión
      // nueva) por expireSession()/su propio flujo — la finalización
      // tardía de un envío ajeno nunca debe pisarlo.
      if (currentSessionIdRef.current === sentForSessionId) setIsLoading(false);
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
              <PrechatForm
                onVerified={handlePrechatVerified}
                recognized={recognizedVisitor}
                onForget={handleForgetVisitor}
              />
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
                  // FASE HANDOFF H3B.7/H3B.8 — key estable (id server, o
                  // sendAttemptId del eco optimista/saludo) en vez del
                  // índice: el array se reconstruye en cada poll (un
                  // mensaje puede pasar de "local pendiente" a
                  // "confirmado por el servidor" en una posición
                  // distinta), un key por índice perdería el estado local
                  // de sub-componentes (p. ej. CopyButton) o produciría
                  // parpadeos.
                  <div
                    key={message.id || message.sendAttemptId || index}
                    className={`public-chat-widget__bubble public-chat-widget__bubble--${message.role}`}
                  >
                    {/* FASE HANDOFF H3B.10 — un mensaje role="agent" es una
                        persona real, nunca AIRA: nunca se confunde con
                        "assistant" (ni visualmente ni en el copy button). */}
                    {message.role === "agent" && (
                      <p className="public-chat-widget__bubble-label">Agente</p>
                    )}
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
                    {/* FASE 3B.2 — botón de acción comercial. Sin lógica
                        propia: solo renderiza lo que el backend ya decidió
                        (type/label/href), nunca decide cuándo mostrarlo ni
                        construye el link. */}
                    {message.cta && (
                      <Link to={message.cta.href} className="public-chat-widget__cta">
                        {message.cta.label}
                        <ArrowRight size={14} />
                      </Link>
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
