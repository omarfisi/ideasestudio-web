import FormShell from "./FormShell.jsx";
import PresetMediaPanel from "./PresetMediaPanel.jsx";
import FormFieldsRenderer from "../FormFieldsRenderer.jsx";

// Welcome-offer popup layout: large split modal with form copy at left and media at right.
export default function PopupOfferSplitPreset({ config, formConfig, placementId, onSuccess }) {
  const { colors, content, media } = config;
  const showMedia = media.enabled && media.type !== "none";
  const mediaRatio = Number(media.width_ratio) || 45;
  const formRatio = Math.max(100 - mediaRatio, 40);
  const align = content.alignment === "left" ? "left" : "center";
  const mediaAtRight = media.position !== "left";

  const formColumn = (
    <div
      style={{ flex: `0 0 ${showMedia ? formRatio : 100}%`, minWidth: 0 }}
      className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 lg:px-12"
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
          className="text-3xl font-semibold leading-tight sm:text-4xl"
          style={{ color: colors.text, textAlign: align }}
        >
          {formConfig.headline}
        </h2>
      ) : null}

      {content.show_description && formConfig?.subheadline ? (
        <p
          className="mt-3 text-sm sm:text-base"
          style={{ color: colors.muted_text, textAlign: align }}
        >
          {formConfig.subheadline}
        </p>
      ) : null}

      <div className="mt-6">
        <FormFieldsRenderer
          formConfig={formConfig}
          placementId={placementId}
          onSuccess={onSuccess}
          className="[&_input]:h-12 [&_input]:rounded-2xl [&_input]:text-base [&_textarea]:rounded-2xl [&_button]:h-12 [&_button]:rounded-2xl [&_button]:text-base [&_button]:font-semibold"
        />
      </div>

      {content.show_disclaimer && formConfig?.description ? (
        <label
          className="mt-4 flex items-start gap-2 text-xs"
          style={{ color: colors.muted_text, justifyContent: align === "center" ? "center" : "flex-start" }}
        >
          <input type="checkbox" disabled className="mt-0.5" />
          <span>{formConfig.description}</span>
        </label>
      ) : null}
    </div>
  );

  const mediaColumn = showMedia ? (
    <div
      style={{ flex: `0 0 ${mediaRatio}%`, minHeight: "280px" }}
      className="relative min-h-[280px] lg:min-h-[560px]"
    >
      <PresetMediaPanel
        config={config}
        formConfig={formConfig}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  ) : null;

  return (
    <FormShell config={config}>
      <div className="flex flex-col lg:flex-row" style={{ minHeight: "560px" }}>
        {mediaAtRight ? (
          <>
            {formColumn}
            {mediaColumn}
          </>
        ) : (
          <>
            {mediaColumn}
            {formColumn}
          </>
        )}
      </div>
    </FormShell>
  );
}
