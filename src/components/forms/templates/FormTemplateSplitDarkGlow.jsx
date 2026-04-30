import FormFieldsRenderer from "../FormFieldsRenderer.jsx";
import FormMediaPanel from "./FormMediaPanel.jsx";

export default function FormTemplateSplitDarkGlow({
  formConfig,
  placementId,
  onSuccess,
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#070b14] text-white shadow-2xl">
      <div className="grid min-h-[420px] grid-cols-1 lg:grid-cols-2">
        <div className="px-8 py-10 lg:px-10">
          {formConfig?.title ? (
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
              {formConfig.title}
            </p>
          ) : null}
          {formConfig?.headline ? (
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-white lg:text-4xl">
              {formConfig.headline}
            </h2>
          ) : null}
          {formConfig?.subheadline ? (
            <p className="mt-3 max-w-xl text-sm text-white/70">
              {formConfig.subheadline}
            </p>
          ) : null}

          <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <FormFieldsRenderer
              formConfig={formConfig}
              placementId={placementId}
              onSuccess={onSuccess}
              className="text-white"
            />
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.45),transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.35),transparent_42%)]" />
          <FormMediaPanel
            formConfig={formConfig}
            placeholderClassName="bg-[#0b1020]"
            imageClassName="h-full w-full object-cover opacity-90"
            className="relative h-full"
          />
          <div className="absolute inset-0 bg-black/30" />
          {formConfig?.description ? (
            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white/85 backdrop-blur-sm">
                {formConfig.description}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
