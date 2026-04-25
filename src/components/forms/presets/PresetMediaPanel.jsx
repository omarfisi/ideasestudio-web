function extractYoutubeId(url) {
  if (!url) return null;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = String(url).match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Reads media config from visual_config.media (not directly from formConfig).
// Fallback: if image_url/youtube_url are empty in media config, resolveVisualConfig
// already copies them from formConfig's top-level fields before this component is called.
export default function PresetMediaPanel({ config, formConfig, className = "" }) {
  const { media } = config;

  if (!media.enabled || media.type === "none") return null;

  const imageUrl = media.image_url || "";
  const youtubeId = media.type === "youtube" ? extractYoutubeId(media.youtube_url || "") : null;
  const showImage = media.type === "image" && !!imageUrl;

  if (!showImage && !youtubeId) {
    return (
      <div className={`h-full w-full bg-slate-100 ${className}`} />
    );
  }

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{ borderRadius: media.radius || "0" }}
    >
      {youtubeId ? (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          title={formConfig?.headline || "Video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full"
        />
      ) : showImage ? (
        <img
          src={imageUrl}
          alt={formConfig?.headline || ""}
          className="absolute inset-0 h-full w-full"
          style={{ objectFit: media.object_fit || "cover" }}
        />
      ) : null}

      {media.overlay && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: `rgba(0,0,0,${media.overlay_opacity ?? 0.3})` }}
        />
      )}
    </div>
  );
}
