import FormFieldsRenderer from "../FormFieldsRenderer.jsx";
import FormMediaPanel from "./FormMediaPanel.jsx";

export default function FormTemplateMinimalWarm({
  formConfig,
  placementId,
  onSuccess,
}) {
  return (
    <section className="relative overflow-hidden rounded-[30px] bg-[#f3b54c] p-4 md:p-7">
      <div className="mx-auto overflow-hidden rounded-[26px] border border-orange-100 bg-[#fbfaf7] shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="p-5 md:p-6">
            <div className="overflow-hidden rounded-[20px] border border-orange-100 shadow-sm">
              <FormMediaPanel
                formConfig={formConfig}
                className="min-h-[220px] bg-orange-100"
                placeholderClassName="bg-orange-100"
                imageClassName="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="p-6 md:p-8">
            {formConfig?.headline ? (
              <h2 className="text-3xl font-semibold text-slate-900">
                {formConfig.headline}
              </h2>
            ) : null}
            {formConfig?.subheadline ? (
              <p className="mt-2 text-sm text-slate-600">{formConfig.subheadline}</p>
            ) : null}

            <div className="mt-6 rounded-2xl border border-orange-100 bg-white/80 p-4">
              <FormFieldsRenderer
                formConfig={formConfig}
                placementId={placementId}
                onSuccess={onSuccess}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
