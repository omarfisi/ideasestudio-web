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

export async function startPublicChat(prechatToken) {
  return publicChatFetch("/start", {
    method: "POST",
    body: JSON.stringify({ prechat_token: prechatToken || null }),
  });
}

export async function sendPublicChatMessage(sessionId, message) {
  return publicChatFetch("/message", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, message }),
  });
}

// LEVEL2: consulta read-only del responder actual de una sesión existente
// (AIRA o el agente humano que tomó control), sin generar mensaje. Nunca
// envía workspace_id/assigned_user_id/control_mode — el backend los resuelve
// server-side a partir de session_id. Ver GET /public/chat/status.
export async function getPublicChatStatus(sessionId) {
  return publicChatFetch(`/status?session_id=${encodeURIComponent(sessionId)}`, {
    method: "GET",
  });
}

// Gate de pre-chat: se llama justo después de un envío exitoso del
// formulario "aira-prechat" (ver @/lib/publicFormsApi.js::submitPublicForm),
// nunca antes. El backend revalida server-side que el submission_id sea
// real, pertenezca a ese formulario y tenga consentimiento — el widget
// nunca decide por sí solo que el pre-chat fue válido, solo reenvía el
// submission_id y guarda el token opaco de un solo uso que resulte.
export async function verifyPrechat(submissionId) {
  return publicChatFetch("/prechat", {
    method: "POST",
    body: JSON.stringify({ submission_id: submissionId }),
  });
}
