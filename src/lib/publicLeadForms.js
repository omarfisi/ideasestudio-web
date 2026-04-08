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
  const CRM_BASE =
    import.meta.env.VITE_CRM_BASE_URL || "https://ideasestudio-api.onrender.com";

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

  const res = await fetch(`${CRM_BASE}/api/public/contact-submit`, {
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
