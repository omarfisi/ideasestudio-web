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
    // FASE 4 — necesario para que el navegador envíe/reciba la cookie
    // HttpOnly aira_visitor_token (/start la emite, /recognize y /forget
    // la leen). El widget nunca lee ni maneja el token en sí.
    credentials: "include",
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

export async function startPublicChat(prechatToken, rememberMe = false) {
  return publicChatFetch("/start", {
    method: "POST",
    body: JSON.stringify({ prechat_token: prechatToken || null, remember_me: Boolean(rememberMe) }),
  });
}

// FASE 1AA.1 — clientMessageId es la identidad lógica estable de este envío:
// lo genera el caller (ver PublicChatWidget.jsx::handleSend) UNA vez por
// intento lógico de mensaje y lo reutiliza si esa misma operación se
// reintenta. Esta función nunca lo genera ni lo reemplaza — solo lo
// transporta tal cual al backend, que lo usará (próximo slice) para
// garantizar idempotencia en public.ai_messages.
export async function sendPublicChatMessage(sessionId, message, clientMessageId) {
  return publicChatFetch("/message", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      message,
      client_message_id: clientMessageId,
    }),
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

// FASE 4 — reconocimiento de visitante recurrente. Nunca envía ni lee un
// token: el navegador reenvía la cookie HttpOnly aira_visitor_token por su
// cuenta (ver credentials:"include" arriba). Devuelve siempre
// {recognized, full_name, email, phone} — recognized:false ante cualquier
// condición no ideal (flag apagado, sin cookie, cookie inválida/expirada,
// contacto ya no existe), nunca un error.
export async function recognizeVisitor() {
  return publicChatFetch("/recognize", { method: "POST" });
}

// FASE 4 — "olvidar" al visitante en este navegador. Siempre responde éxito
// y limpia la cookie server-side, exista o no exista reconocimiento activo.
export async function forgetVisitor() {
  return publicChatFetch("/forget", { method: "POST" });
}
