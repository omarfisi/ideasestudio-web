import PublicBusinessIntakeForm from "@/components/forms/PublicBusinessIntakeForm.jsx";

export default function FormBlock({
  settings = {},
  formConfig,
  formConfigMap = {},
  formErrors = {},
  pendingFormSlugs = [],
  loading,
  error,
  defaultFormSlug = "conoce-tu-negocio",
}) {
  const { title, description, form_slug: configuredFormSlug } = settings;
  const formSlug = configuredFormSlug || defaultFormSlug || "conoce-tu-negocio";
  const resolvedFormConfig = formConfigMap?.[formSlug] || (formSlug === defaultFormSlug ? formConfig : null);
  const resolvedError = formErrors?.[formSlug] || (formSlug === defaultFormSlug ? error : "");
  const isLoading = Boolean(loading) || pendingFormSlugs.includes(formSlug);

  return (
    <div
      id="business-intake-form"
      className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-[0_25px_80px_rgba(0,0,0,0.08)] md:p-8"
    >
      {(title || description) ? (
        <div className="mb-6 rounded-[1.75rem] border border-neutral-200 bg-neutral-950 px-5 py-5 text-white">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
            Diagnóstico inicial
          </div>
          {title ? (
            <h2 className="mt-3 text-2xl font-semibold">{title}</h2>
          ) : null}
          {description ? (
            <p className="mt-3 text-sm leading-6 text-neutral-300">{description}</p>
          ) : null}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-3xl border border-neutral-200 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
          Cargando formulario…
        </div>
      ) : resolvedError ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
          {resolvedError}
        </div>
      ) : !resolvedFormConfig ? (
        <div className="rounded-3xl border border-neutral-200 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
          No se encontró la configuración del formulario <strong>{formSlug}</strong>.
        </div>
      ) : (
        <PublicBusinessIntakeForm formConfig={resolvedFormConfig} slug={formSlug} />
      )}
    </div>
  );
}
