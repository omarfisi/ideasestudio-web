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

// Renders the media panel for a form preset.
// For images: uses background-image so it works regardless of parent height source
// (min-height from flex items resolves correctly for background, not for absolute children).
// For youtube: keeps iframe with aspect-ratio wrapper.
// className is applied directly to the root element — callers control sizing.
export default function PresetMediaPanel({ config, formConfig, className = "" }) {
  const { media } = config;

  if (!media.enabled || media.type === "none") return null;

  const imageUrl = media.image_url || "";
  const youtubeId = media.type === "youtube" ? extractYoutubeId(media.youtube_url || "") : null;
  const showImage = media.type === "image" && !!imageUrl;

  if (!showImage && !youtubeId) {
    return <div className={`bg-slate-100 ${className}`} />;
  }

  if (youtubeId) {
    return (
      <div
        className={`relative overflow-hidden ${className}`}
        style={{ borderRadius: media.radius || "0" }}
      >
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          title={formConfig?.headline || "Video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full"
        />
        {media.overlay && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundColor: `rgba(0,0,0,${media.overlay_opacity ?? 0.3})` }}
          />
        )}
      </div>
    );
  }

  const overlayColor = media.overlay
    ? `rgba(0,0,0,${media.overlay_opacity ?? 0.3})`
    : null;

  return (
    <div
      className={className}
      style={{
        borderRadius: media.radius || "0",
        backgroundImage: overlayColor
          ? `linear-gradient(${overlayColor},${overlayColor}),url("${imageUrl}")`
          : `url("${imageUrl}")`,
        backgroundSize: media.object_fit === "contain" ? "contain" : "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
