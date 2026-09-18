import { CRM_PUBLIC_API_BASE_URL } from "@/lib/constants.js";
import { PUBLIC_WORKSPACE_ID } from "@/lib/workspace.js";

export async function submitLeadForm({
  full_name = "",
  email = "",
  phone = "",
  business_name = "",
  service_interest = "",
  message = "",
  source = "website_contact",
  segment = "pagina_contacto",
  segments = ["pagina_contacto"],
  submission_kind = "lead_capture",
  meta = {},
}) {
  const CRM_BASE = String(CRM_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");

  if (!CRM_BASE) {
    throw new Error(
      "Falta VITE_CRM_BASE_URL. Define la URL del backend CRM antes de enviar el formulario.",
    );
  }

  if (!PUBLIC_WORKSPACE_ID) {
    throw new Error("Falta VITE_PUBLIC_WORKSPACE_ID para enviar el formulario.");
  }

  const normalizedName = String(full_name || "").trim();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPhone = String(phone || "").trim();
  const normalizedBusinessName = String(business_name || "").trim();
  const normalizedServiceInterest = String(service_interest || "").trim();

  const fallbackMessage =
    String(message || "").trim() || `Lead desde ${source}`;

  const payload = {
    full_name: normalizedName || "Interesado web",
    email: normalizedEmail,
    phone: normalizedPhone || null,
    business_name: normalizedBusinessName || null,
    service_interest: normalizedServiceInterest || null,
    message: fallbackMessage,
    source,
    segment,
    segments,
    meta: {
      ...meta,
      submission_kind,
      submitted_from_frontend: true,
      submitted_at_iso: new Date().toISOString(),
      page_title: typeof document !== "undefined" ? document.title : "",
      referrer:
        typeof document !== "undefined" ? document.referrer || "" : "",
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent || "" : "",
    },
  };

  // Public submissions must always be tenant-scoped. Fail closed instead of
  // allowing the backend to resolve an unrelated/default workspace.
  const endpoint = `${CRM_BASE}/api/public/contact-submit`;
  const url = PUBLIC_WORKSPACE_ID
    ? `${endpoint}?workspace_id=${encodeURIComponent(PUBLIC_WORKSPACE_ID)}`
    : endpoint;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const detail =
      data?.detail ||
      data?.message ||
      "No se pudo enviar la información. Inténtalo nuevamente.";
    throw new Error(detail);
  }

  return data;
}

// Alias de compatibilidad con el nombre anterior
export async function submitPublicLead({
  full_name,
  email,
  source = "website",
  segment = "general",
  segments = [],
  meta = {},
}) {
  return submitLeadForm({
    full_name,
    email,
    source,
    segment,
    segments: segments.length ? segments : [segment],
    meta,
  });
}
