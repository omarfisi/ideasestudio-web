import PresetMediaPanel from "./PresetMediaPanel.jsx";
import FormContentPanel from "./FormContentPanel.jsx";
import FormFieldsRenderer from "../FormFieldsRenderer.jsx";

// Card layout with colored outer wrapper, image thumbnail, and form side.
// Reads all visual from config.colors / config.container / config.media.
export default function MinimalCardPreset({ config, formConfig, placementId, onSuccess }) {
  const { colors, container, media } = config;
  const outerPadding =
    container.padding && container.padding !== "0" ? container.padding : "28px";
  const innerRadius = `calc(${container.radius} - 6px)`;

  return (
    <div
      className="w-full mx-auto overflow-hidden"
      style={{
        maxWidth: container.max_width,
        borderRadius: container.radius,
        backgroundColor: colors.page_background,
        padding: outerPadding,
      }}
    >
      <div
        className="overflow-hidden"
        style={{
          backgroundColor: colors.card_background,
          borderRadius: innerRadius,
          boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {media.enabled && (
            <div className="p-5 lg:p-6">
              <div
                className="overflow-hidden"
                style={{ borderRadius: media.radius || "20px", minHeight: "220px" }}
              >
                <PresetMediaPanel
                  config={config}
                  formConfig={formConfig}
                  className="h-full min-h-[220px]"
                />
              </div>
            </div>
          )}

          <div>
            <FormContentPanel config={config} formConfig={formConfig}>
              <div
                className="rounded-2xl p-4"
                style={{
                  border: `1px solid ${colors.input_border}`,
                  backgroundColor: colors.input_bg,
                }}
              >
                <FormFieldsRenderer
                  formConfig={formConfig}
                  placementId={placementId}
                  onSuccess={onSuccess}
                />
              </div>
            </FormContentPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
