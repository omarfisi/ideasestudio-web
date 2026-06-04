import { useMemo, useRef, useState } from "react";
import Button from "@/components/shared/Button.jsx";
import PublicFormField from "@/components/forms/PublicFormField.jsx";
import { submitPublicForm } from "@/lib/publicFormsApi.js";

const TOP_LEVEL_FIELDS = new Set([
  "form_id",
  "form_slug",
  "placement_id",
  "section_key",
  "first_name",
  "last_name",
  "full_name",
  "email",
  "phone",
  "business_name",
  "customer_segment",
  "service_interest",
  "message",
  "source",
  "segment",
  "segments",
  "page_url",
  "referrer",
  "meta",
  "honeypot",
  "submit_timestamp",
  "consent",
  "answers",
]);

const SEGMENT_OPTIONS = [
  "Emprendedor",
  "Empresa",
  "Organización social",
  "Institución educativa",
  "Restaurante / Gastronomía",
  "Profesional independiente",
  "Creador de contenido",
  "Marca personal",
  "Ecommerce / Tienda online",
  "Otro",
];

const PLATFORM_OPTIONS = [
  "Facebook",
  "Instagram",
  "TikTok",
  "YouTube",
  "WhatsApp Business",
  "Shopify",
  "WooCommerce",
  "Ninguna",
  "Otro",
];

const NEEDS_OPTIONS = [
  "Página web",
  "Branding / logo",
  "Redes sociales",
  "Fotografía",
  "Video",
  "Email marketing",
  "Automatización",
  "CRM",
  "Publicidad digital",
  "Otro",
];

const GOAL_OPTIONS = [
  "Conseguir más clientes",
  "Vender online",
  "Mejorar imagen profesional",
  "Automatizar procesos",
  "Organizar clientes",
  "Crear contenido",
  "Otro",
];

const BUDGET_OPTIONS = [
  "Menos de $500",
  "$500 - $1,000",
  "$1,000 - $3,000",
  "$3,000 - $5,000",
  "Más de $5,000",
  "No estoy seguro",
];

const URGENCY_OPTIONS = [
  "Inmediata",
  "1 a 2 semanas",
  "Este mes",
  "Próximos 3 meses",
  "Solo estoy explorando",
];

const CANONICAL_FIELDS = [
  {
    id: "section_personal",
    name: "section_personal",
    label: "Información personal",
    type: "section",
    width: "full",
    visible: true,
    help_text: "Cuéntanos quién eres y cómo podemos contactarte.",
  },
  { id: "first_name", name: "first_name", label: "Nombre", type: "text", required: true, width: "half", visible: true, placeholder: "Tu nombre" },
  { id: "last_name", name: "last_name", label: "Apellido", type: "text", required: true, width: "half", visible: true, placeholder: "Tu apellido" },
  { id: "email", name: "email", label: "Email", type: "email", required: true, width: "half", visible: true, placeholder: "tu@email.com" },
  { id: "phone", name: "phone", label: "Teléfono", type: "tel", required: true, width: "half", visible: true, placeholder: "+1 787-000-0000" },
  {
    id: "section_business",
    name: "section_business",
    label: "Información del negocio",
    type: "section",
    width: "full",
    visible: true,
    help_text: "Esto nos ayuda a entender tu contexto comercial y etapa actual.",
  },
  { id: "business_name", name: "business_name", label: "Nombre del negocio", type: "text", required: true, width: "full", visible: true, placeholder: "Nombre comercial o marca" },
  {
    id: "customer_segment",
    name: "customer_segment",
    label: "Segmento de cliente",
    type: "radio",
    required: true,
    width: "full",
    visible: true,
    map_to: "customer_segment",
    options: SEGMENT_OPTIONS.map((value) => ({ label: value, value })),
  },
  { id: "business_type", name: "business_type", label: "Tipo de negocio / industria", type: "text", required: true, width: "half", visible: true, map_to: "answers.business_type", placeholder: "Ej. restaurante, servicios profesionales, ecommerce" },
  { id: "years_in_business", name: "years_in_business", label: "Años operando", type: "text", required: true, width: "half", visible: true, map_to: "answers.years_in_business", placeholder: "Ej. menos de 1 año, 3 años, 5+" },
  { id: "products_services", name: "products_services", label: "Qué producto o servicio ofrece", type: "textarea", required: true, width: "full", visible: true, map_to: "answers.products_services", placeholder: "Describe lo que vendes o haces." },
  { id: "main_problem", name: "main_problem", label: "Principal problema o necesidad", type: "textarea", required: true, width: "full", visible: true, map_to: "answers.main_problem", placeholder: "Qué quieres resolver ahora mismo." },
  {
    id: "section_digital",
    name: "section_digital",
    label: "Presencia digital",
    type: "section",
    width: "full",
    visible: true,
    help_text: "Queremos ver qué tan adelantada está hoy tu presencia online.",
  },
  {
    id: "has_website",
    name: "has_website",
    label: "¿Tiene página web?",
    type: "radio",
    required: true,
    width: "full",
    visible: true,
    map_to: "answers.has_website",
    options: [{ label: "Sí", value: "Sí" }, { label: "No", value: "No" }],
  },
  { id: "website_url", name: "website_url", label: "Website URL", type: "url", required: false, width: "full", visible: true, map_to: "answers.website_url", placeholder: "https://tusitio.com" },
  { id: "instagram_url", name: "instagram_url", label: "Instagram", type: "text", required: false, width: "half", visible: true, map_to: "answers.instagram_url", placeholder: "@tuusuario o enlace" },
  { id: "facebook_url", name: "facebook_url", label: "Facebook", type: "text", required: false, width: "half", visible: true, map_to: "answers.facebook_url", placeholder: "Tu página o enlace" },
  {
    id: "has_online_store",
    name: "has_online_store",
    label: "¿Tiene tienda online?",
    type: "radio",
    required: true,
    width: "full",
    visible: true,
    map_to: "answers.has_online_store",
    options: [{ label: "Sí", value: "Sí" }, { label: "No", value: "No" }],
  },
  {
    id: "platforms",
    name: "platforms",
    label: "Plataformas actuales",
    type: "checkbox_group",
    required: false,
    width: "full",
    visible: true,
    map_to: "answers.platforms",
    options: PLATFORM_OPTIONS.map((value) => ({ label: value, value })),
  },
  {
    id: "section_needs",
    name: "section_needs",
    label: "Necesidades y objetivos",
    type: "section",
    width: "full",
    visible: true,
    help_text: "Aquí priorizamos qué necesita tu negocio y hacia dónde quiere moverse.",
  },
  {
    id: "needs",
    name: "needs",
    label: "Áreas donde necesita ayuda",
    type: "checkbox_group",
    required: true,
    width: "full",
    visible: true,
    map_to: "answers.needs",
    options: NEEDS_OPTIONS.map((value) => ({ label: value, value })),
  },
  {
    id: "main_goal",
    name: "main_goal",
    label: "Meta principal",
    type: "radio",
    required: true,
    width: "full",
    visible: true,
    map_to: "answers.main_goal",
    options: GOAL_OPTIONS.map((value) => ({ label: value, value })),
  },
  {
    id: "section_budget",
    name: "section_budget",
    label: "Presupuesto y urgencia",
    type: "section",
    width: "full",
    visible: true,
    help_text: "Nos sirve para evaluar alcance, timing y prioridad del caso.",
  },
  {
    id: "budget",
    name: "budget",
    label: "Presupuesto",
    type: "radio",
    required: true,
    width: "full",
    visible: true,
    map_to: "answers.budget",
    options: BUDGET_OPTIONS.map((value) => ({ label: value, value })),
  },
  {
    id: "urgency",
    name: "urgency",
    label: "Urgencia",
    type: "radio",
    required: true,
    width: "full",
    visible: true,
    map_to: "answers.urgency",
    options: URGENCY_OPTIONS.map((value) => ({ label: value, value })),
  },
  {
    id: "message",
    name: "message",
    label: "Mensaje adicional",
    type: "textarea",
    required: false,
    width: "full",
    visible: true,
    map_to: "message",
    placeholder: "Si quieres, añade contexto adicional sobre tu negocio, tus retos o el proyecto.",
  },
  {
    id: "section_consent",
    name: "section_consent",
    label: "Consentimiento",
    type: "section",
    width: "full",
    visible: true,
    help_text: "Necesitamos tu autorización para dar seguimiento a tus respuestas.",
  },
  {
    id: "consent",
    name: "consent",
    label: "Acepto que Ideas Estudio me contacte sobre mis respuestas y posibles servicios relacionados.",
    type: "checkbox",
    required: true,
    width: "full",
    visible: true,
    map_to: "consent",
  },
];

function isEmptyValue(value, fieldType) {
  if (fieldType === "checkbox") return value !== true;
  if (Array.isArray(value)) return value.length === 0;
  return value === undefined || value === null || value === "";
}

function validateFields(fields, values) {
  const errors = {};
  for (const field of fields) {
    if (!field.visible || ["hidden", "section"].includes(field.type)) continue;
    const value = values[field.name];
    if (field.required && isEmptyValue(value, field.type)) {
      errors[field.name] = `${field.label} es requerido.`;
      continue;
    }
    if (field.type === "email" && value) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors[field.name] = "Escribe un email válido.";
      }
    }
  }
  return errors;
}

function buildPayload(fields, values, formConfig, slug) {
  const payload = {
    form_id: formConfig?.form_id,
    form_slug: slug,
    source: formConfig?.source || "business_intake_form",
    segments: Array.isArray(formConfig?.segments) ? formConfig.segments : [],
    answers: {},
    meta: {
      form_slug: slug,
      submission_kind: "business_intake",
      ui_context: "ideas_web_public",
    },
    honeypot: values._honeypot || "",
  };

  for (const field of fields) {
    if (["hidden", "section"].includes(field.type)) continue;
    const target = field.map_to || field.name;
    const value = values[field.name];
    if (isEmptyValue(value, field.type)) continue;

    if (target.startsWith("answers.")) {
      payload.answers[target.slice("answers.".length)] = value;
      continue;
    }

    if (TOP_LEVEL_FIELDS.has(target)) {
      payload[target] = value;
      continue;
    }

    payload.answers[field.name || target] = value;
  }

  if (Object.keys(payload.answers).length === 0) delete payload.answers;
  return payload;
}

function useResolvedFormConfig(formConfig) {
  return useMemo(
    () => ({
      ...formConfig,
      fields_schema: CANONICAL_FIELDS,
      button_label: formConfig?.button_label || "Enviar información",
      success_message:
        formConfig?.success_message ||
        "Gracias. Recibimos la información de tu negocio. Pronto nos comunicaremos contigo.",
    }),
    [formConfig],
  );
}

export default function PublicBusinessIntakeForm({ formConfig, slug = "conoce-tu-negocio" }) {
  const submitTimestampRef = useRef(Date.now());
  const resolvedForm = useResolvedFormConfig(formConfig);
  const fields = resolvedForm.fields_schema || [];
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [serverError, setServerError] = useState("");

  function handleChange(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: "" }));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setServerError("");

    if (values._honeypot) {
      setStatus("success");
      return;
    }

    const validationErrors = validateFields(fields, values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setStatus("submitting");
    try {
      const payload = buildPayload(fields, values, resolvedForm, slug);
      payload.submit_timestamp = submitTimestampRef.current;
      await submitPublicForm(slug, payload);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setServerError(
        error?.message || "No se pudo enviar el formulario. Verifica los campos e intenta otra vez.",
      );
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-[2rem] border border-neutral-200 bg-white p-8 text-center shadow-[0_20px_70px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl text-neutral-900">
          ✓
        </div>
        <h3 className="mt-5 text-2xl font-semibold text-neutral-950">
          Gracias. Recibimos la información de tu negocio. Pronto nos comunicaremos contigo.
        </h3>
        <p className="mt-3 text-sm text-neutral-600">Tu información fue enviada correctamente.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button href="/contacto">Contactar a Ideas Estudio</Button>
          <Button href="/servicios" variant="secondary">Ver servicios</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div aria-hidden="true" className="hidden">
        <input
          type="text"
          name="website"
          autoComplete="off"
          tabIndex={-1}
          value={values._honeypot || ""}
          onChange={(event) => setValues((current) => ({ ...current, _honeypot: event.target.value }))}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <PublicFormField
            key={field.id || field.name}
            field={field}
            value={
              values[field.name] ??
              field.default_value ??
              (field.type === "checkbox_group" ? [] : field.type === "checkbox" ? false : "")
            }
            onChange={handleChange}
            error={errors[field.name]}
          />
        ))}
      </div>

      {serverError && status === "error" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "Enviando…" : resolvedForm.button_label}
      </button>
    </form>
  );
}
