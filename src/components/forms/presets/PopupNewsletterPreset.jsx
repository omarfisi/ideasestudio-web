import FormShell from "./FormShell.jsx";
import FormContentPanel from "./FormContentPanel.jsx";
import FormFieldsRenderer from "../FormFieldsRenderer.jsx";

// Compact centered layout — optimized for newsletter / quick capture.
// No split, no media panel. Designed to be used inside FormPopupShell.
// When display_mode is "embedded", renders as a centered card.
export default function PopupNewsletterPreset({ config, formConfig, placementId, onSuccess }) {
  const { colors, content } = config;

  return (
    <FormShell config={config} className="w-full">
      <FormContentPanel config={config} formConfig={formConfig}>
        <FormFieldsRenderer
          formConfig={formConfig}
          placementId={placementId}
          onSuccess={onSuccess}
        />
        {content.show_disclaimer && formConfig?.description ? (
          <p
            className="mt-4 text-xs"
            style={{ color: colors.muted_text, textAlign: content.alignment }}
          >
            {formConfig.description}
          </p>
        ) : null}
      </FormContentPanel>
    </FormShell>
  );
}
