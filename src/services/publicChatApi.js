import { CRM_PUBLIC_API_BASE_URL } from "@/lib/constants.js";

// Cliente del widget de chat público (PR11). Nunca manda workspace_id ni
// role_slug — el backend resuelve el workspace desde su propia configuración
// de servidor (AIRA_WEBCHAT_PUBLIC_WORKSPACE_ID), nunca confía en un valor
// del cliente. 100% público, sin auth, sin token de Supabase.
function getPublicChatBaseUrl() {
  const base = (CRM_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
  if (!base) {
    throw new Error(
      "Falta VITE_CRM_BASE_URL. Define la URL del backend en tu .env."
    );
  }
  return `${base}/public/chat`;
}

async function publicChatFetch(path, options = {}) {
  const url = `${getPublicChatBaseUrl()}${path}`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.detail || data?.message || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function startPublicChat() {
  return publicChatFetch("/start", { method: "POST" });
}

export async function sendPublicChatMessage(sessionId, message) {
  return publicChatFetch("/message", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, message }),
  });
}

// Centro de Conversaciones: mientras un agente humano tiene el control de
// la conversación, AIRA no responde automáticamente — el widget debe
// enterarse de la respuesta del agente sin que el visitante tenga que
// escribir otro mensaje. Polling con cursor (after=ISO timestamp del
// último evento visto), nunca WebSocket/SSE — ver
// app/routers/public_chat.py::get_events para el porqué.
export async function getPublicChatEvents(sessionId, after) {
  const params = new URLSearchParams({ session_id: sessionId });
  if (after) params.set("after", after);
  return publicChatFetch(`/events?${params.toString()}`, { method: "GET" });
}

// Valoración 1-5 al resolverse la conversación — el backend solo la acepta
// una vez support_status es resolved/closed (ver
// support_conversations.py::submit_satisfaction_rating).
export async function ratePublicChat(sessionId, score, comment) {
  return publicChatFetch("/rate", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, score, comment: comment || null }),
  });
}
