// Renders headline / subheadline / eyebrow from formConfig, styled by visual_config.
// children = the form fields / FormFieldsRenderer.
export default function FormContentPanel({ config, formConfig, children }) {
  const { colors, content, container } = config;
  const align = content.alignment === "center" ? "center" : "left";
  const padding =
    container.padding && container.padding !== "0" ? container.padding : "2.5rem";

  return (
    <div
      className="flex flex-col justify-center h-full"
      style={{ padding, color: colors.text }}
    >
      {content.show_eyebrow && formConfig?.title ? (
        <p
          className="mb-2 text-xs font-semibold uppercase tracking-[0.16em]"
          style={{ color: colors.muted_text, textAlign: align }}
        >
          {formConfig.title}
        </p>
      ) : null}

      {content.show_headline && formConfig?.headline ? (
        <h2
          className="text-2xl font-semibold leading-tight lg:text-3xl"
          style={{ color: colors.text, textAlign: align }}
        >
          {formConfig.headline}
        </h2>
      ) : null}

      {content.show_description && formConfig?.subheadline ? (
        <p
          className="mt-3 text-sm"
          style={{ color: colors.muted_text, textAlign: align }}
        >
          {formConfig.subheadline}
        </p>
      ) : null}

      <div className="mt-6">{children}</div>
    </div>
  );
}
