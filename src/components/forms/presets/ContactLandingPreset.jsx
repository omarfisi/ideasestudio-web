import FormShell from "./FormShell.jsx";
import FormContentPanel from "./FormContentPanel.jsx";
import FormFieldsRenderer from "../FormFieldsRenderer.jsx";

// Editorial landing layout: large media panel (60 % by default) + form on the side.
// Overlay is enabled by default to let text read over the image.
export default function ContactLandingPreset({ config, formConfig, placementId, onSuccess }) {
  const { media } = config;
  const isLeft = media.position !== "right";
  const mediaRatio = Number(media.width_ratio) || 60;
  const contentRatio = 100 - mediaRatio;

  const imageUrl = media.image_url || formConfig?.image_url || "";
  const showImage = media.enabled && media.type === "image" && !!imageUrl;

  const overlayColor = media.overlay
    ? `rgba(0,0,0,${media.overlay_opacity ?? 0.3})`
    : null;

  const mediaCol = showImage ? (
    <div
      className="min-h-[260px] lg:min-h-[420px]"
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
      <div className="flex flex-col lg:flex-row min-h-[380px] lg:min-h-[480px]">
        {isLeft ? <>{mediaCol}{formCol}</> : <>{formCol}{mediaCol}</>}
      </div>
    </FormShell>
  );
}
