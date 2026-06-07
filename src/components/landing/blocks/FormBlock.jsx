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
  const canRenderFallbackWizard = formSlug === "conoce-tu-negocio";

  return (
    <div id="business-intake-form" className="mx-auto max-w-4xl">
      {isLoading ? (
        <div className="rounded-3xl border border-neutral-200 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
          Cargando formulario…
        </div>
      ) : resolvedError && !canRenderFallbackWizard ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
          {resolvedError}
        </div>
      ) : !resolvedFormConfig && !canRenderFallbackWizard ? (
        <div className="rounded-3xl border border-neutral-200 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
          No se encontró la configuración del formulario <strong>{formSlug}</strong>.
        </div>
      ) : (
        <PublicBusinessIntakeForm
          formConfig={resolvedFormConfig || formConfig || null}
          slug={formSlug}
          title={title || "Conozcamos tu negocio"}
          description={
            description ||
            "Completa este formulario paso a paso para entender mejor tu negocio, tus metas y tus necesidades."
          }
          loadError={canRenderFallbackWizard ? resolvedError : ""}
        />
      )}
    </div>
  );
}
