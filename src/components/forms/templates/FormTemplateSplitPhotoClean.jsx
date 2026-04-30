import FormFieldsRenderer from "../FormFieldsRenderer.jsx";
import FormMediaPanel from "./FormMediaPanel.jsx";

export default function FormTemplateSplitPhotoClean({
  formConfig,
  placementId,
  onSuccess,
  imagePosition = "left",
}) {
  const layout = formConfig?.layout_variant || "split-right";
  const media = (
    <div className="relative min-h-[320px] overflow-hidden bg-slate-100 lg:min-h-[420px]">
      <FormMediaPanel
        formConfig={formConfig}
        className="h-full"
        placeholderClassName="bg-slate-100"
        imageClassName="h-full w-full object-cover"
      />
      {formConfig?.description ? (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-6">
          <p className="text-sm text-white/90">{formConfig.description}</p>
        </div>
      ) : null}
    </div>
  );

  const form = (
    <div className="bg-white px-7 py-8 lg:px-10 lg:py-10">
      {formConfig?.title ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          {formConfig.title}
        </p>
      ) : null}
      {formConfig?.headline ? (
        <h2 className="mt-2 text-2xl font-semibold text-slate-900 lg:text-3xl">
          {formConfig.headline}
        </h2>
      ) : null}
      {formConfig?.subheadline ? (
        <p className="mt-3 text-sm text-slate-500">{formConfig.subheadline}</p>
      ) : null}
      <div className="mt-7">
        <FormFieldsRenderer
          formConfig={formConfig}
          placementId={placementId}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  );

  if (layout === "stacked") {
    return (
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
        {media}
        {form}
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {imagePosition === "left" ? (
          <>
            {media}
            {form}
          </>
        ) : (
          <>
            {form}
            {media}
          </>
        )}
      </div>
    </section>
  );
}
