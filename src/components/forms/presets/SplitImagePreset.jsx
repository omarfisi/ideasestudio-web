import FormShell from "./FormShell.jsx";
import FormContentPanel from "./FormContentPanel.jsx";
import FormFieldsRenderer from "../FormFieldsRenderer.jsx";

// Two-column split: media panel | form content (or reversed).
// media.position controls left vs right. media.width_ratio controls the split.
export default function SplitImagePreset({ config, formConfig, placementId, onSuccess }) {
  const { media } = config;
  const isLeft = media.position !== "right";
  const mediaRatio = Number(media.width_ratio) || 50;
  const contentRatio = 100 - mediaRatio;

  const imageUrl = media.image_url || formConfig?.image_url || "";
  const showMedia = media.enabled && media.type === "image" && !!imageUrl;

  const overlayColor = media.overlay
    ? `rgba(0,0,0,${media.overlay_opacity ?? 0.3})`
    : null;

  const mediaCol = showMedia ? (
    <div
      className="min-h-[320px] lg:min-h-[420px]"
      style={{
        flex: `0 0 ${mediaRatio}%`,
        backgroundImage: overlayColor
          ? `linear-gradient(${overlayColor},${overlayColor}),url("${imageUrl}")`
          : `url("${imageUrl}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    />
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
      <div className="flex flex-col lg:flex-row min-h-[380px]">
        {isLeft ? <>{mediaCol}{formCol}</> : <>{formCol}{mediaCol}</>}
      </div>
    </FormShell>
  );
}
