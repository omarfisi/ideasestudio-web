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

export default function FormMediaPanel({
  formConfig,
  className = "",
  imageClassName = "h-full w-full object-cover",
  placeholderClassName = "bg-slate-100",
}) {
  const youtubeId = extractYoutubeId(formConfig?.youtube_url);
  const hasImage = !!formConfig?.image_url;

  if (!hasImage && !youtubeId) {
    return <div className={`h-full w-full ${placeholderClassName} ${className}`} />;
  }

  return (
    <div className={`flex h-full w-full flex-col overflow-hidden ${className}`}>
      {youtubeId ? (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          title={formConfig?.title || "Video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full"
        />
      ) : null}

      {hasImage ? (
        <img
          src={formConfig.image_url}
          alt={formConfig?.title || formConfig?.headline || "Formulario"}
          className={imageClassName}
        />
      ) : null}
    </div>
  );
}
