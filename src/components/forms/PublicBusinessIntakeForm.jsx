import { useEffect, useMemo, useRef, useState } from "react";
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

const WIZARD_TEMPLATES = [
  {
    id: "basic",
    title: "Información básica",
    description: "Tus datos de contacto y el contexto inicial del negocio.",
    sectionKeys: ["section_personal"],
  },
  {
    id: "profile",
    title: "Perfil del negocio",
    description: "Qué hace tu negocio, qué necesita hoy y hacia dónde quiere moverse.",
    sectionKeys: ["section_business", "section_needs"],
  },
  {
    id: "digital",
    title: "Presencia digital",
    description: "Cómo está posicionada tu marca actualmente en digital.",
    sectionKeys: ["section_digital"],
  },
  {
    id: "budget",
    title: "Presupuesto y urgencia",
    description: "Alcance, prioridad y autorización para dar seguimiento.",
    sectionKeys: ["section_budget", "section_consent"],
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
    if (!field || field.visible === false || ["hidden", "section"].includes(field.type)) continue;
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
    if (!field || ["hidden", "section"].includes(field.type)) continue;
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
      button_label: formConfig?.button_label || "Enviar formulario",
      success_message:
        formConfig?.success_message ||
        "Gracias. Recibimos la información de tu negocio. Pronto nos comunicaremos contigo.",
    }),
    [formConfig],
  );
}

function groupFieldsBySection(fields) {
  const sections = [];
  let currentSection = null;

  fields.forEach((field) => {
    if (!field || field.visible === false) return;

    if (field.type === "section") {
      currentSection = {
        key: field.name || field.id || `section-${sections.length + 1}`,
        label: field.label || `Sección ${sections.length + 1}`,
        help_text: field.help_text || "",
        fields: [field],
      };
      sections.push(currentSection);
      return;
    }

    if (!currentSection) {
      currentSection = {
        key: "general",
        label: "Información general",
        help_text: "",
        fields: [],
      };
      sections.push(currentSection);
    }

    currentSection.fields.push(field);
  });

  return sections.filter((section) =>
    section.fields.some((field) => field.type !== "section" && field.visible !== false),
  );
}

function buildWizardSteps(fields) {
  const sections = groupFieldsBySection(fields);
  const sectionMap = Object.fromEntries(sections.map((section) => [section.key, section]));

  const knownSteps = WIZARD_TEMPLATES.map((template) => ({
    ...template,
    fields: template.sectionKeys.flatMap((key) => sectionMap[key]?.fields || []),
  })).filter((step) => step.fields.length > 0);

  if (knownSteps.length >= 3) return knownSteps;

  return sections.map((section, index) => ({
    id: section.key || `step-${index + 1}`,
    title: section.label || `Paso ${index + 1}`,
    description: section.help_text || "",
    fields: section.fields,
  }));
}

function getVisibleStepFields(step) {
  return (step?.fields || []).filter(
    (field) => field && field.visible !== false && !["hidden", "section"].includes(field.type),
  );
}

function getStepForFieldName(steps, fieldName) {
  return steps.findIndex((step) => getVisibleStepFields(step).some((field) => field.name === fieldName));
}

function scrollToCard(ref) {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

export default function PublicBusinessIntakeForm({
  formConfig,
  slug = "conoce-tu-negocio",
  title = "Conozcamos tu negocio",
  description = "Completa este formulario para entender mejor tu negocio, tus metas y tus necesidades.",
  eyebrow = "Ideas Estudio",
  loadError = "",
}) {
  const submitTimestampRef = useRef(Date.now());
  const cardRef = useRef(null);
  const resolvedForm = useResolvedFormConfig(formConfig);
  const fields = resolvedForm.fields_schema || [];
  const steps = useMemo(() => buildWizardSteps(fields), [fields]);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [serverError, setServerError] = useState("");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    setCurrentStepIndex(0);
  }, [slug, fields]);

  const currentStep = steps[currentStepIndex] || steps[0] || { title: "", description: "", fields: [] };
  const isLastStep = steps.length <= 1 || currentStepIndex === steps.length - 1;
  const progress = steps.length ? Math.round(((currentStepIndex + 1) / steps.length) * 100) : 100;

  function handleChange(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setServerError("");
    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: "" }));
    }
  }

  function validateStep(index) {
    const step = steps[index];
    if (!step) return {};
    const stepFields = getVisibleStepFields(step);
    const validationErrors = validateFields(stepFields, values);
    const fieldNames = stepFields.map((field) => field.name).filter(Boolean);

    setErrors((current) => {
      const next = { ...current };
      fieldNames.forEach((name) => {
        delete next[name];
      });
      Object.entries(validationErrors).forEach(([name, message]) => {
        next[name] = message;
      });
      return next;
    });

    return validationErrors;
  }

  function handleBack() {
    setCurrentStepIndex((current) => Math.max(0, current - 1));
    scrollToCard(cardRef);
  }

  function handleNext() {
    const validationErrors = validateStep(currentStepIndex);
    if (Object.keys(validationErrors).length > 0) return;

    setCurrentStepIndex((current) => Math.min(steps.length - 1, current + 1));
    scrollToCard(cardRef);
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
      const firstFieldName = Object.keys(validationErrors)[0];
      const invalidStepIndex = getStepForFieldName(steps, firstFieldName);
      if (invalidStepIndex >= 0) {
        setCurrentStepIndex(invalidStepIndex);
        scrollToCard(cardRef);
      }
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
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-[0_25px_80px_rgba(15,47,47,0.08)] md:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl text-[#102a2a]">
          ✓
        </div>
        <h3 className="mt-5 text-3xl font-semibold tracking-tight text-[#102a2a]">
          {resolvedForm.success_message}
        </h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Tu información fue enviada correctamente. Revisaremos tus respuestas y daremos seguimiento.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button href="/contacto">Contactar a Ideas Estudio</Button>
          <Button href="/servicios" variant="secondary">Ver servicios</Button>
        </div>
      </div>
    );
  }

  return (
    <form ref={cardRef} id="business-intake-form" onSubmit={handleSubmit} noValidate className="space-y-6">
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

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_25px_80px_rgba(15,47,47,0.08)] md:p-8 lg:p-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {eyebrow}
          </div>
          <h2 className="mt-5 text-4xl font-semibold tracking-tight text-[#102a2a] md:text-5xl">
            {title}
          </h2>
          {description ? (
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              {description}
            </p>
          ) : null}
        </div>

        <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Paso {currentStepIndex + 1} de {steps.length}
              </div>
              <h3 className="mt-2 text-2xl font-semibold text-[#102a2a]">
                {currentStep.title}
              </h3>
              {currentStep.description ? (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  {currentStep.description}
                </p>
              ) : null}
            </div>
            <div className="text-sm font-medium text-slate-500">{progress}% completado</div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[#102a2a] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {loadError ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {loadError}
          </div>
        ) : null}

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {currentStep.fields.map((field) => (
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
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            Los campos marcados con <span className="font-semibold text-amber-500">*</span> son obligatorios.
          </p>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-end">
            {currentStepIndex > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex min-w-[132px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Atrás
              </button>
            ) : null}

            {!isLastStep ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex min-w-[160px] items-center justify-center rounded-xl bg-[#102a2a] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0b2222]"
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="submit"
                disabled={status === "submitting"}
                className="inline-flex min-w-[190px] items-center justify-center rounded-xl bg-[#102a2a] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0b2222] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "submitting" ? "Enviando…" : resolvedForm.button_label}
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
