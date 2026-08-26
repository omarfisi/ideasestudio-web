import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Copy, MessageCircle, Send, User, X } from "lucide-react";
import {
  forgetVisitor,
  getPublicChatEvents,
  getPublicChatStatus,
  getPublicAvatarRuntime,
  recognizeVisitor,
  requestPublicChatHuman,
  sendPublicChatMessage,
  startPublicChat,
} from "@/services/publicChatApi.js";
import PrechatForm from "./PrechatForm.jsx";
import "./PublicChatWidget.css";
import airaLauncherAsset from "@/assets/chat/aira-point-viewer.png";
import airaInviteAsset from "@/assets/chat/aira-invite-chat.png";

const SESSION_STORAGE_KEY = "aira_public_chat_session_v1";
const HISTORY_STORAGE_KEY = "aira_public_chat_history_v1";
// FASE HANDOFF H4B — UX optimista/restore inmediato ÚNICAMENTE. La fuente
// de verdad real es siempre el backend (handoff_requested de GET /status y
// GET /events, ver su reconciliación más abajo) -- esta key solo evita que
// el botón "Hablar con una persona" reaparezca por una fracción de segundo
// al recargar la página antes de que llegue el primer poll.
const HANDOFF_STORAGE_KEY = "aira_public_chat_handoff_v1";
const MAX_MESSAGE_CHARS = 800;
const AIRA_RUNTIME_REFRESH_LEAD_MS = 45_000;
const PUBLIC_AVATAR_SEMANTIC_EVENTS = new Set(["intent.services"]);

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
  // FASE HANDOFF H3B.4 (P2, revisión de H3B.3) — identidades
  // (sendAttemptId) de los pending locales que esta reconciliación
  // efectivamente emparejó contra una fila server. Los buckets por rol
  // (pendingByRole) siguen usándose SOLO para encontrar candidatos de
  // matching 1:1 -- nunca para reconstruir el orden final (ver
  // stillPending más abajo).
  const consumedLocalIds = new Set();

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
      consumedLocalIds.add(candidate.sendAttemptId);
      const cta = candidate.cta || null;
      newClaims.push({ serverId: serverMessage.id, sendAttemptId: candidate.sendAttemptId, cta });
      return cta ? { ...serverMessage, cta } : serverMessage;
    }
    return serverMessage;
  });

  // FASE HANDOFF H3B.4 (P2, revisión de H3B.3 — hallazgo real de Codex) —
  // NUNCA reconstruir concatenando "todos los user pendientes restantes"
  // + "todos los assistant pendientes restantes": eso reordena por rol,
  // no por cronología real. Con más de un intercambio local sin
  // confirmar a la vez (p. ej. dos envíos superpuestos: user1+assistant1
  // del primero, user2 del segundo, ninguno confirmado todavía), esa
  // concatenación producía user1, user2, assistant1 -- la primera
  // respuesta parecía contestar la SEGUNDA pregunta. Filtrar
  // directamente sobre localMessages (que ya está en el orden real en
  // que cada mensaje se agregó) conserva ese orden automáticamente, sin
  // necesidad de reconstruirlo.
  const stillPending = localMessages.filter(
    (message) => message.source === "local" && !consumedLocalIds.has(message.sendAttemptId)
  );

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

function isAvatarRuntimeExpired(runtime, now = Date.now()) {
  const expiresAt = Date.parse(runtime?.expires_at || "");
  return Number.isFinite(expiresAt) && expiresAt <= now;
}

function getRuntimePose(runtime, poseKey) {
  if (!runtime || isAvatarRuntimeExpired(runtime)) return null;
  const poses = runtime.poses && typeof runtime.poses === "object" ? runtime.poses : {};
  const requested = poses[poseKey];
  const fallback = poses[runtime.default_pose];
  const pose = requested || fallback;
  if (!pose || typeof pose.url !== "string" || !pose.url.trim()) return null;
  if (isAvatarRuntimeExpired({ expires_at: pose.expires_at || runtime.expires_at })) return null;
  return pose;
}

const AIRA_POSE_LABELS = {
  neutral: "Disponible",
  waving: "Saludando",
  "thinking-left": "Pensando",
  "thinking-right": "Pensando",
  "talk-a": "Respondiendo",
  "talk-o": "Respondiendo",
  presenting: "Presentando",
  "i-dont-know": "Evaluando opciones",
  "hands-clasped": "Conectando con el equipo",
};

function runtimeRule(runtime, eventKey) {
  if (!Array.isArray(runtime?.rules)) return null;
  return runtime.rules.find((candidate) => candidate?.event_key === eventKey) || null;
}

function exactRuntimePose(runtime, poseKey) {
  if (!runtime || typeof poseKey !== "string") return null;
  const pose = runtime.poses?.[poseKey];
  return pose && typeof pose.url === "string" && pose.url.trim() && !isAvatarRuntimeExpired(pose)
    ? pose
    : null;
}

function runtimeRulePayload(runtime, eventKey) {
  const rule = runtimeRule(runtime, eventKey);
  if (!rule) return null;
  const payload = rule.payload && typeof rule.payload === "object" ? rule.payload : {};
  return { rule, payload };
}

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

function ResponderAvatar({ responder, airaAvatarRuntime, airaPoseKey = "neutral", size = 36 }) {
  // Sin useEffect para resetear el fallback de imagen rota: el caller le
  // pasa key={type:avatar_url} (ver usos abajo), así React remonta este
  // componente — con imgFailed limpio — cada vez que cambia la identidad,
  // en vez de sincronizar estado derivado desde un efecto.
  const [imgFailed, setImgFailed] = useState(false);

  const airaPose = responder.type === "aira" ? getRuntimePose(airaAvatarRuntime, airaPoseKey) : null;
  const imageUrl = responder.type === "human" ? responder.avatar_url : airaPose?.url;

  if (imageUrl && !imgFailed) {
    return (
      <img
        src={imageUrl}
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

function AiraStage({ pose, poseKey, visualState, runtimeAvailable }) {
  const [imgFailed, setImgFailed] = useState(false);
  const label = visualState === "thinking" ? "Pensando" : AIRA_POSE_LABELS[poseKey] || "Disponible";

  return (
    <section className="public-chat-widget__stage" aria-label="Vista previa del avatar AIRA">
      {pose && !imgFailed ? (
        <img
          src={pose.url}
          alt={`AIRA: ${label}`}
          className="public-chat-widget__stage-image"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="public-chat-widget__stage-fallback" role="img" aria-label="AIRA no disponible">
          <MessageCircle size={42} aria-hidden="true" />
          <span>{runtimeAvailable ? "Vista previa no disponible" : "AIRA"}</span>
        </div>
      )}
      <div className="public-chat-widget__stage-status" role="status">
        <span aria-hidden="true" />
        {label}
      </div>
    </section>
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

// FASE HANDOFF H4B — solo se usa como valor inicial optimista al montar
// (ver el useState de handoffRequested más abajo). Vinculado a la sesión
// ACTUAL a propósito: una key vieja de una sesión anterior (distinta)
// nunca se aplica -- evita arrastrar una solicitud de una sesión ya
// expirada hacia una nueva.
function loadStoredHandoff(currentSessionId) {
  if (!currentSessionId) return false;
  try {
    const raw = sessionStorage.getItem(HANDOFF_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed && parsed.session_id === currentSessionId && parsed.requested);
  } catch {
    return false;
  }
}

// requested=true persiste {session_id, requested:true}; requested=false
// BORRA la key por completo (nunca escribe requested:false) -- así un
// próximo reload nunca restaura un "true" ya obsoleto una vez que el
// backend confirmó que ya no aplica (ver reconciliación de /events y
// /status más abajo, y expireSession()).
function persistHandoff(sessionIdValue, requested) {
  try {
    if (requested && sessionIdValue) {
      sessionStorage.setItem(
        HANDOFF_STORAGE_KEY,
        JSON.stringify({ session_id: sessionIdValue, requested: true })
      );
    } else {
      sessionStorage.removeItem(HANDOFF_STORAGE_KEY);
    }
  } catch {
    // Almacenamiento no disponible — mismo criterio que persistHistory().
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
  const [airaAvatarRuntime, setAiraAvatarRuntime] = useState(null);
  const [airaPoseKey, setAiraPoseKey] = useState("neutral");
  const [airaVisualState, setAiraVisualState] = useState("neutral");
  // FASE HANDOFF H4B — ¿el visitante ya pidió hablar con una persona?
  // Fuente de verdad real: el backend (handoff_requested de GET /events y
  // GET /status, reconciliado en cada poll/consulta exitosa — ver más
  // abajo). El valor inicial es solo un eco optimista de sessionStorage
  // (ver loadStoredHandoff) para que el botón no "parpadee" visible en un
  // reload mientras llega el primer poll -- nunca un valor que se sostenga
  // indefinidamente por sí solo.
  const [handoffRequested, setHandoffRequested] = useState(() => loadStoredHandoff(loadStoredSession()));
  const [handoffRequestLoading, setHandoffRequestLoading] = useState(false);
  // FASE HANDOFF H4B.1 — guard TRANSITORIO, independiente de
  // handoffRequested, deliberadamente NUNCA persistido en sessionStorage.
  // Cubre una carrera real: un GET /events viejo (iniciado ANTES de que un
  // agente tomara control real) puede resolver DESPUÉS de que POST
  // /request-human ya devolvió "human_active" -- ese snapshot stale trae
  // responder.type="aira" + handoff_requested=false, y si se aplicara tal
  // cual, el botón "Hablar con una persona" reaparecería por unos
  // segundos hasta el siguiente poll. handoffRequested nunca debe
  // "fingir" waiting_agent para tapar este caso (el texto informativo de
  // esa rama es específico de waiting_agent) -- este es un estado propio,
  // solo para ocultar el botón mientras el responder converge de verdad.
  const [humanActivePendingConfirmation, setHumanActivePendingConfirmation] = useState(false);
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
  const airaPoseTransitionTimerRef = useRef(null);
  const airaStreamingTimerRef = useRef(null);
  const airaStreamingIndexRef = useRef(0);
  const airaOpeningRuntimeAppliedRef = useRef(false);
  const airaRuntimeRefreshTimerRef = useRef(null);
  const airaRuntimeRequestSeqRef = useRef(0);
  const airaRuntimeRequestRef = useRef(null);
  const loadAiraAvatarRuntimeRef = useRef(null);

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
  // FASE HANDOFF H4B.2 — frontera local monotónica de mutaciones de
  // handoff. Cubre una carrera DISTINTA de la de H4B.1 (esa era
  // human_active vs. responder stale; esta es waiting_agent vs. una
  // lectura /events o /status que ya estaba en vuelo ANTES del POST
  // exitoso): sin esto, esa lectura vieja podía resolver DESPUÉS con
  // handoff_requested=false (su propio snapshot, capturado antes de que
  // el POST mutara nada) y pisar el handoffRequested=true recién
  // establecido -- el botón reaparecía y permitía un segundo POST.
  //
  // Se incrementa en dos momentos: (1) cada POST /request-human exitoso
  // con status="waiting_agent" (la única mutación LOCAL real de
  // handoffRequested fuera de la reconciliación con el backend), y (2) en
  // cada frontera de sesión (expireSession/nueva sesión) -- defensa
  // adicional, ver el guard de identidad de sesión ya existente
  // (currentSessionIdRef) para la protección A->B real.
  //
  // runPoll()/refreshStatus() capturan el valor VIGENTE justo antes de
  // iniciar su propia request (nunca después): si al resolver el valor
  // sigue siendo el mismo, esa lectura es tan reciente como la última
  // mutación local y puede reconciliar handoffRequested/sessionStorage
  // con total normalidad (incluido aplicar un false real y futuro -- esto
  // NUNCA se convierte en "true para siempre", ver el test de "lectura
  // realmente posterior puede devolver false"). Si cambió mientras la
  // request estaba en vuelo, esa lectura es más vieja que la mutación
  // local y se descarta SOLO para efectos de handoff -- el resto de su
  // contenido (mensajes/responder) sigue aplicándose normalmente si no
  // tiene sus propios guards.
  const handoffMutationEpochRef = useRef(0);
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
  const currentResponderRef = useRef(responder);
  currentResponderRef.current = responder;

  const clearAiraReactionTimers = useCallback(() => {
    if (airaPoseTransitionTimerRef.current) {
      window.clearTimeout(airaPoseTransitionTimerRef.current);
      airaPoseTransitionTimerRef.current = null;
    }
    if (airaStreamingTimerRef.current) {
      window.clearInterval(airaStreamingTimerRef.current);
      airaStreamingTimerRef.current = null;
    }
    airaStreamingIndexRef.current = 0;
  }, []);

  const fallbackAiraPoseKey = useCallback((runtime) => {
    const defaultPose = typeof runtime?.default_pose === "string" ? runtime.default_pose : "neutral";
    if (exactRuntimePose(runtime, defaultPose)) return defaultPose;
    return exactRuntimePose(runtime, "neutral") ? "neutral" : defaultPose;
  }, []);

  const activateAiraEvent = useCallback((eventKey) => {
    clearAiraReactionTimers();
    if (currentResponderRef.current.type !== "aira") return;
    const runtime = airaAvatarRuntime;
    const resolved = runtimeRulePayload(runtime, eventKey);
    const fallbackKey = fallbackAiraPoseKey(runtime);
    const applyFallback = () => {
      setAiraVisualState("neutral");
      setAiraPoseKey(fallbackKey);
    };

    if (!resolved) {
      applyFallback();
      return;
    }

    const { rule, payload } = resolved;
    if (rule.rule_type === "state") {
      const state = typeof payload.state === "string" ? payload.state : "neutral";
      setAiraVisualState(state);
      setAiraPoseKey(fallbackKey);
      return;
    }

    if (rule.rule_type === "pose_sequence") {
      const sequence = Array.isArray(payload.sequence) ? payload.sequence : [];
      if (!sequence.length || sequence.some((poseKey) => !exactRuntimePose(runtime, poseKey))) {
        applyFallback();
        return;
      }
      const interval = Number(payload.interval_ms);
      airaStreamingIndexRef.current = 0;
      const applySequencePose = () => {
        const poseKey = sequence[airaStreamingIndexRef.current % sequence.length];
        setAiraVisualState(poseKey);
        setAiraPoseKey(poseKey);
        airaStreamingIndexRef.current += 1;
      };
      applySequencePose();
      if (Number.isFinite(interval) && interval > 0 && sequence.length > 1) {
        airaStreamingTimerRef.current = window.setInterval(applySequencePose, interval);
      }
      return;
    }

    if (rule.rule_type !== "pose") {
      applyFallback();
      return;
    }

    const poseKey = typeof payload.pose === "string" ? payload.pose : "";
    if (!exactRuntimePose(runtime, poseKey)) {
      applyFallback();
      return;
    }

    const delay = Number(payload.delay_ms);
    const duration = Number(payload.duration_ms);
    const nextPoseKey = typeof payload.next === "string" && exactRuntimePose(runtime, payload.next)
      ? payload.next
      : fallbackKey;
    const transition = () => {
      airaPoseTransitionTimerRef.current = null;
      setAiraVisualState(nextPoseKey === fallbackKey ? "neutral" : nextPoseKey);
      setAiraPoseKey(nextPoseKey);
    };
    const wait = Number.isFinite(delay) && delay > 0 ? delay : Number.isFinite(duration) ? duration : 0;
    if (delay > 0) {
      airaPoseTransitionTimerRef.current = window.setTimeout(transition, delay);
      return;
    }
    setAiraVisualState(poseKey);
    setAiraPoseKey(poseKey);
    if (wait > 0 && (delay > 0 || payload.next)) {
      airaPoseTransitionTimerRef.current = window.setTimeout(transition, wait);
    }
  }, [airaAvatarRuntime, clearAiraReactionTimers, fallbackAiraPoseKey]);

  const applyCompletedAvatarReaction = useCallback((response) => {
    clearAiraReactionTimers();
    const nextResponder = sanitizeResponder(response?.responder);
    if (nextResponder?.type === "human" || currentResponderRef.current.type !== "aira") return;
    const avatarEvents = Array.isArray(response?.avatar_events)
      ? response.avatar_events.filter((event) => PUBLIC_AVATAR_SEMANTIC_EVENTS.has(event))
      : [];
    activateAiraEvent(avatarEvents.includes("intent.services") ? "intent.services" : "message.completed");
  }, [activateAiraEvent, clearAiraReactionTimers]);

  const scheduleAiraRuntimeRefresh = useCallback((runtime) => {
    if (airaRuntimeRefreshTimerRef.current) {
      window.clearTimeout(airaRuntimeRefreshTimerRef.current);
      airaRuntimeRefreshTimerRef.current = null;
    }
    const expiresAt = Date.parse(runtime?.expires_at || "");
    if (!Number.isFinite(expiresAt)) return;
    const delay = Math.max(0, expiresAt - Date.now() - AIRA_RUNTIME_REFRESH_LEAD_MS);
    airaRuntimeRefreshTimerRef.current = window.setTimeout(() => {
      airaRuntimeRefreshTimerRef.current = null;
      void loadAiraAvatarRuntimeRef.current?.(true);
    }, delay);
  }, []);

  const loadAiraAvatarRuntime = useCallback(async (force = false) => {
    if (airaRuntimeRequestRef.current && !force) return airaRuntimeRequestRef.current;
    const requestSeq = ++airaRuntimeRequestSeqRef.current;
    const request = getPublicAvatarRuntime()
      .then((runtime) => {
        if (requestSeq !== airaRuntimeRequestSeqRef.current) return runtime;
        setAiraAvatarRuntime(runtime && typeof runtime === "object" ? runtime : null);
        scheduleAiraRuntimeRefresh(runtime);
        return runtime;
      })
      .catch(() => {
        if (requestSeq === airaRuntimeRequestSeqRef.current) {
          setAiraAvatarRuntime(null);
          scheduleAiraRuntimeRefresh(null);
        }
        return null;
      })
      .finally(() => {
        if (requestSeq === airaRuntimeRequestSeqRef.current) airaRuntimeRequestRef.current = null;
      });
    airaRuntimeRequestRef.current = request;
    return request;
  }, [scheduleAiraRuntimeRefresh]);
  loadAiraAvatarRuntimeRef.current = loadAiraAvatarRuntime;

  useEffect(() => {
    const runtimeRequestSeqRef = airaRuntimeRequestSeqRef;
    void loadAiraAvatarRuntime();
    return () => {
      ++runtimeRequestSeqRef.current;
      if (airaRuntimeRefreshTimerRef.current) window.clearTimeout(airaRuntimeRefreshTimerRef.current);
      airaRuntimeRefreshTimerRef.current = null;
    };
  }, [loadAiraAvatarRuntime]);

  useEffect(() => () => clearAiraReactionTimers(), [clearAiraReactionTimers]);

  useEffect(() => {
    if (responder.type === "human") {
      clearAiraReactionTimers();
      setAiraVisualState("neutral");
      setAiraPoseKey("neutral");
    }
  }, [clearAiraReactionTimers, responder.type]);

  useEffect(() => {
    if (airaAvatarRuntime && isAvatarRuntimeExpired(airaAvatarRuntime)) {
      void loadAiraAvatarRuntime(true);
    }
  }, [airaAvatarRuntime, loadAiraAvatarRuntime]);

  useEffect(() => {
    if (!isOpen) {
      airaOpeningRuntimeAppliedRef.current = false;
      return;
    }
    if (responder.type === "aira" && airaAvatarRuntime && !airaOpeningRuntimeAppliedRef.current) {
      airaOpeningRuntimeAppliedRef.current = true;
      activateAiraEvent("chat.opened");
    }
  }, [activateAiraEvent, airaAvatarRuntime, isOpen, responder.type]);

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
    // FASE HANDOFF H4B — una sesión nueva nunca debe arrastrar la
    // solicitud de handoff de la sesión que acaba de expirar.
    sessionStorage.removeItem(HANDOFF_STORAGE_KEY);
    setSessionId(null);
    setMessages([]);
    setScreen("prechat");
    setResponder(AIRA_RESPONDER);
    setHandoffRequested(false);
    setHandoffRequestLoading(false);
    setHumanActivePendingConfirmation(false);
    // FASE HANDOFF H4B.2 — frontera de sesión: cualquier lectura /events o
    // /status todavía en vuelo de la sesión que expira queda, a partir de
    // acá, más vieja que esta frontera -- defensa adicional junto con el
    // guard de identidad de sesión (currentSessionIdRef) ya existente.
    handoffMutationEpochRef.current += 1;
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
    // FASE HANDOFF H4B.2 — mismo patrón A->B que handleSend/
    // handleRequestHuman: esta función nunca tenía un guard de sesión
    // propio (a diferencia de esas dos) -- necesario ahora para que la
    // frontera de epoch tenga sentido también acá (sin esto, una
    // respuesta tardía de la sesión A podría reconciliar el handoff de la
    // sesión B con epochs que, por coincidencia, podrían volver a
    // alinearse tras una frontera de sesión).
    const handoffEpochAtRequestStart = handoffMutationEpochRef.current;
    try {
      const data = await getPublicChatStatus(sid);
      if (currentSessionIdRef.current !== sid) return; // stale — ya estamos en otra sesión
      const sanitized = sanitizeResponder(data?.responder);
      if (sanitized) setResponder(sanitized);
      // FASE HANDOFF H4B/H4B.2 — mismo criterio que el poller de /events:
      // el backend es la fuente de verdad en cada consulta exitosa (nunca
      // "true para siempre" solo porque sessionStorage lo dijo antes),
      // pero solo si esta lectura no quedó stale respecto a una mutación
      // local de handoff más reciente (ver handoffMutationEpochRef).
      if (handoffEpochAtRequestStart === handoffMutationEpochRef.current) {
        const handoff = Boolean(data?.handoff_requested);
        setHandoffRequested(handoff);
        persistHandoff(sid, handoff);
      }
      // FASE HANDOFF H4B.1 — mismo criterio que runPoll(): el guard
      // transitorio de human_active solo se libera con una confirmación
      // REAL de responder.type==="human", nunca por handoff_requested.
      if (sanitized?.type === "human") setHumanActivePendingConfirmation(false);
    } catch (err) {
      if (currentSessionIdRef.current !== sid) return; // stale — idem para error
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
      // FASE HANDOFF H4B.2 — capturado ANTES de iniciar la request (nunca
      // después): si al resolver el valor vigente cambió, esta lectura
      // empezó antes de la última mutación local de handoff y no puede
      // reconciliar handoffRequested/sessionStorage (ver el ref).
      const handoffEpochAtRequestStart = handoffMutationEpochRef.current;
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
        // FASE HANDOFF H4B/H4B.2 — mismo criterio server-authoritative que
        // el resto de esta reconciliación (nunca "true para siempre" por
        // un valor optimista viejo de sessionStorage), PERO solo si esta
        // lectura no quedó stale respecto a una mutación local de handoff
        // más reciente (ver handoffMutationEpochRef) -- una lectura
        // realmente posterior a esa mutación SÍ puede aplicar un false
        // real, esto nunca se vuelve "true sticky".
        if (handoffEpochAtRequestStart === handoffMutationEpochRef.current) {
          const handoff = Boolean(data?.handoff_requested);
          setHandoffRequested(handoff);
          persistHandoff(sessionId, handoff);
        }
        // FASE HANDOFF H4B.1 — el guard transitorio de human_active SOLO
        // se libera cuando ESTE poll confirma responder.type==="human" --
        // nunca por handoff_requested (que en este caso puede legítimamente
        // seguir en false: control_mode ya es human, pero support_status
        // puede nunca haber llegado a "waiting_agent"). Un snapshot viejo
        // con responder="aira" (stale, iniciado antes del takeover) nunca
        // lo toca -- deliberadamente no hay rama "else" que lo apague.
        if (sanitized?.type === "human") setHumanActivePendingConfirmation(false);
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
      // FASE HANDOFF H4B/H4B.1 — nunca arrastra una solicitud de handoff
      // (ni el guard transitorio de human_active) de una sesión anterior:
      // esta es, por construcción de esta rama, una sesión
      // public_session_id NUEVA emitida por el backend.
      setHandoffRequested(false);
      setHumanActivePendingConfirmation(false);
      // FASE HANDOFF H4B.2 — misma frontera de sesión que expireSession().
      handoffMutationEpochRef.current += 1;
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
    if (nextOpen) {
      activateAiraEvent("chat.opened");
    } else {
      clearAiraReactionTimers();
      setAiraVisualState("neutral");
      setAiraPoseKey("neutral");
    }
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

  // FASE HANDOFF H4B — click en "Hablar con una persona". Mismo patrón de
  // protección de sesión A->B que handleSend (H3B.2): sentForSessionId se
  // fija ANTES del await, y toda continuación (éxito, error o finally) se
  // compara contra currentSessionIdRef antes de tocar cualquier estado —
  // una respuesta tardía de una sesión ya reemplazada nunca debe mutar el
  // estado de la sesión nueva.
  async function handleRequestHuman() {
    if (handoffRequestLoading || handoffRequested || humanActivePendingConfirmation || !sessionId) return;
    const sentForSessionId = sessionId;
    setHandoffRequestLoading(true);
    setError(null);

    try {
      const data = await requestPublicChatHuman(sentForSessionId);
      if (currentSessionIdRef.current !== sentForSessionId) return; // stale

      if (data?.status === "waiting_agent") {
        // FASE HANDOFF H4B.2 — marca la frontera ANTES/junto con la
        // mutación local: cualquier /events o /status que ya estaba en
        // vuelo (capturó el epoch ANTERIOR antes de este POST) queda
        // clasificado como stale para efectos de handoff en cuanto
        // resuelva, sin importar qué booleano traiga.
        handoffMutationEpochRef.current += 1;
        setHandoffRequested(true);
        persistHandoff(sentForSessionId, true);
        if (responder.type === "aira") activateAiraEvent("handoff.created");
      } else if (data?.status === "human_active") {
        // FASE HANDOFF H4B.1 — un take-control real ya está en curso
        // (control_mode ya es human/hybrid del lado del backend). NUNCA
        // reutiliza handoffRequested (ese "true" fingiría waiting_agent y
        // mostraría el copy equivocado) -- usa su propio guard transitorio,
        // en memoria ÚNICAMENTE (nunca persistido), que además sobrevive
        // a un /events viejo que resuelva tarde con un snapshot stale
        // (responder="aira" + handoff_requested=false) -- ver su
        // reconciliación más abajo, que SOLO libera este guard cuando el
        // responder confirmado es realmente "human", nunca por el valor
        // de handoff_requested. Se limpia solo cuando el próximo poll
        // confirma responder.type==="human" (ver más abajo) -- regla que
        // ya oculta el botón de forma incondicional una vez ahí.
        setHumanActivePendingConfirmation(true);
        if (responder.type === "aira") activateAiraEvent("handoff.created");
      }
    } catch (err) {
      if (currentSessionIdRef.current !== sentForSessionId) return; // stale
      if (err.status === 404) {
        expireSession("Tu sesión anterior expiró. Completa el formulario de nuevo para continuar.");
      } else if (err.status === 429) {
        setError("Has solicitado atención varias veces. Intenta de nuevo en un momento.");
      } else if (err.status === 409) {
        // Conversación en un estado terminal (resolved/archived/spam/...) —
        // nunca se marca localmente como si hubiera quedado en
        // waiting_agent, y nunca se destruye la sesión por esto solo.
        setError(err.message || "Esta conversación ya no puede solicitar atención de una persona.");
      } else {
        setError("No pude solicitar atención en este momento. Intenta de nuevo.");
      }
    } finally {
      if (currentSessionIdRef.current === sentForSessionId) setHandoffRequestLoading(false);
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
    if (currentResponderRef.current.type === "aira") {
      activateAiraEvent("message.submitted");
      if (runtimeRule(airaAvatarRuntime, "message.streaming")) {
        activateAiraEvent("message.streaming");
      }
    }

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
      applyCompletedAvatarReaction(data);
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
      if (currentResponderRef.current.type === "aira") activateAiraEvent("message.completed");
    } finally {
      // Mismo guard: si ya estamos en otra sesión, isLoading de ESTA vista
      // ya fue reseteado (o reactivado por un envío propio de la sesión
      // nueva) por expireSession()/su propio flujo — la finalización
      // tardía de un envío ajeno nunca debe pisarlo.
      if (currentSessionIdRef.current === sentForSessionId) setIsLoading(false);
    }
  }

  const activeAiraPose = responder.type === "aira"
    ? getRuntimePose(airaAvatarRuntime, airaPoseKey)
    : null;
  const responderAvatarKey = `${responder.type}:${responder.avatar_url || ""}:${activeAiraPose?.url || ""}`;
  const isAiraResponder = responder.type === "aira";
  const launcherAsset = screen === "prechat" ? airaInviteAsset : airaLauncherAsset;

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
            {isAiraResponder ? (
              <img className="public-chat-widget__launcher-image" src={launcherAsset} alt="" aria-hidden="true" />
            ) : (
              <ResponderAvatar
                key={responderAvatarKey}
                responder={responder}
                airaAvatarRuntime={airaAvatarRuntime}
                airaPoseKey={airaPoseKey}
                size={36}
              />
            )}
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
              {isAiraResponder ? (
                <span className="public-chat-widget__header-icon" aria-hidden="true"><MessageCircle size={20} /></span>
              ) : (
                <ResponderAvatar
                  key={responderAvatarKey}
                  responder={responder}
                  airaAvatarRuntime={airaAvatarRuntime}
                  airaPoseKey={airaPoseKey}
                  size={40}
                />
              )}
              <div>
                <p className="public-chat-widget__title">{responder.display_name}</p>
                <p className="public-chat-widget__subtitle">{responder.status_label}</p>
              </div>
            </div>
            <button
              type="button"
              className="public-chat-widget__close"
              onClick={() => {
                setIsOpen(false);
                clearAiraReactionTimers();
                setAiraVisualState("neutral");
                setAiraPoseKey("neutral");
              }}
              aria-label="Cerrar chat"
            >
              <X size={18} />
            </button>
          </header>

          {isAiraResponder && screen === "chat" && (
            <>
              <div className="public-chat-widget__assistant-switcher" role="group" aria-label="Escoge con quién hablar">
                <button type="button" className="public-chat-widget__assistant-choice public-chat-widget__assistant-choice--active" aria-pressed="true">
                  <span className="public-chat-widget__assistant-choice-icon" aria-hidden="true"><MessageCircle size={16} /></span>
                  <span><strong>AIRA</strong><small>Seleccionada</small></span>
                  <Check size={15} aria-hidden="true" />
                </button>
                <button type="button" className="public-chat-widget__assistant-choice" disabled aria-pressed="false" title="IVOX no está disponible todavía">
                  <span className="public-chat-widget__assistant-choice-icon" aria-hidden="true"><User size={16} /></span>
                  <span><strong>IVOX</strong><small>No disponible</small></span>
                </button>
              </div>
              <AiraStage
                key={`${airaPoseKey}:${activeAiraPose?.url || ""}`}
                pose={activeAiraPose}
                poseKey={airaPoseKey}
                visualState={airaVisualState}
                runtimeAvailable={Boolean(airaAvatarRuntime)}
              />
            </>
          )}

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

              {isAiraResponder && !handoffRequested && (
                <div className="public-chat-widget__quick-actions" aria-label="Acciones rápidas">
                  {["Servicios", "Cotizar proyecto", "Hablar con el equipo"].map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => {
                        setInput(action);
                      }}
                      disabled={isLoading}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}

              {/* FASE HANDOFF H4B/H4B.1 — acción secundaria, deliberadamente
                  fuera del área de burbujas de mensaje (nunca se confunde
                  con un CTA server-driven de FASE 3B.2). Oculto SIEMPRE
                  que responder.type==="human" (identidad humana real de
                  H3B ya cubre ese caso) y también mientras
                  humanActivePendingConfirmation -- ver ese estado para la
                  carrera de /events stale que cubre. */}
              {sessionId && responder.type === "aira" && !handoffRequested && !humanActivePendingConfirmation && (
                <div className="public-chat-widget__handoff-bar">
                  <button
                    type="button"
                    className="public-chat-widget__handoff-btn"
                    onClick={handleRequestHuman}
                    disabled={handoffRequestLoading}
                  >
                    {handoffRequestLoading ? "Solicitando…" : "Hablar con una persona"}
                  </button>
                </div>
              )}
              {sessionId && responder.type === "aira" && handoffRequested && (
                <p className="public-chat-widget__handoff-status" role="status">
                  Solicitaste atención de una persona. AIRA puede seguir ayudándote mientras un agente se conecta.
                </p>
              )}

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
