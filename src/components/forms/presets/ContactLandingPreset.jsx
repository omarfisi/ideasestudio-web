import FormShell from "./FormShell.jsx";
import PresetMediaPanel from "./PresetMediaPanel.jsx";
import FormContentPanel from "./FormContentPanel.jsx";
import FormFieldsRenderer from "../FormFieldsRenderer.jsx";

// Editorial landing layout: large media panel (60 % by default) + form on the side.
// Overlay is enabled by default to let text read over the image.
export default function ContactLandingPreset({ config, formConfig, placementId, onSuccess }) {
  const { media } = config;
  const isLeft = media.position !== "right";
  const mediaRatio = Number(media.width_ratio) || 60;
  const contentRatio = 100 - mediaRatio;

  const mediaCol = media.enabled ? (
    <div
      className="relative overflow-hidden"
      style={{ flex: `0 0 ${mediaRatio}%`, minHeight: "480px" }}
    >
      <PresetMediaPanel
        config={config}
        formConfig={formConfig}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  ) : null;

  const formCol = (
    <div style={{ flex: `0 0 ${contentRatio}%`, minWidth: 0 }}>
      <FormContentPanel config={config} formConfig={formConfig}>
        <FormFieldsRenderer
          formConfig={formConfig}
          placementId={placementId}
          onSuccess={onSuccess}
        />
      </FormContentPanel>
    </div>
  );

  return (
    <FormShell config={config}>
      <div className="flex flex-col lg:flex-row" style={{ minHeight: "480px" }}>
        {isLeft ? <>{mediaCol}{formCol}</> : <>{formCol}{mediaCol}</>}
      </div>
    </FormShell>
  );
}
