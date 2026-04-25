import { useEffect, useRef, useState } from "react";
import DynamicField from "./DynamicField.jsx";
import { submitForm } from "@/lib/publicFormsApi.js";

function validateFields(fields, values) {
  const errors = {};
  for (const field of fields) {
    if (!field.visible || field.type === "hidden") continue;
    const val = values[field.name];
    if (field.required && !val && val !== false) {
      errors[field.name] = `${field.label || field.name} es requerido.`;
      continue;
    }
    if (field.type === "email" && val) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errors[field.name] = "Ingresa un correo electrónico válido.";
      }
    }
  }
  return errors;
}

function buildPayload(fields, values, formConfig, placementId) {
  const payload = {
    form_id: formConfig.form_id,
    placement_id: placementId || formConfig.placement_id || null,
    source: formConfig.source || "website_form",
    segments: formConfig.segments || [],
  };

  for (const field of fields) {
    if (field.type === "hidden") continue;
    const target = field.map_to || field.name;
    const val = values[field.name];
    if (val !== undefined && val !== "") {
      payload[target] = val;
    }
  }

  return payload;
}

export default function DynamicPublicForm({
  formConfig,
  placementId,
  onSuccess,
  className = "",
}) {
  const submitTimestampRef = useRef(Date.now());
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    submitTimestampRef.current = Date.now();
  }, []);

  const fields = (formConfig?.fields_schema || []).filter((f) => f.visible !== false);

  function handleChange(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");

    const validationErrors = validateFields(fields, values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setStatus("loading");
    try {
      const payload = buildPayload(fields, values, formConfig, placementId);
      payload.submit_timestamp = submitTimestampRef.current;
      const result = await submitForm(payload);
      setStatus("success");
      onSuccess?.(result);
    } catch (err) {
      setServerError(err?.message || "No se pudo enviar el formulario. Inténtalo nuevamente.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className={`rounded-2xl p-8 text-center ${className}`}>
        <div className="text-3xl mb-3">✓</div>
        <p className="font-semibold text-slate-900">
          {formConfig?.success_message || "Gracias. Hemos recibido tu información."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={className}>
      {/* Honeypot anti-spam */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={values._honeypot || ""}
          onChange={(e) => setValues((prev) => ({ ...prev, _honeypot: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {fields.map((field) => (
          <DynamicField
            key={field.id || field.name}
            field={field}
            value={values[field.name] ?? field.default_value ?? ""}
            onChange={handleChange}
            error={errors[field.name]}
          />
        ))}
      </div>

      {serverError && status === "error" && (
        <p className="mt-3 text-sm text-red-600">{serverError}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60 transition-colors"
      >
        {status === "loading" ? "Enviando…" : (formConfig?.button_label || "Enviar")}
      </button>
    </form>
  );
}
