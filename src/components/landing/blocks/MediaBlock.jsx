function resolveMediaKind(settings) {
  const kind = settings.media_kind;
  if (kind === "image" || kind === "video") return kind;
  const url = String(settings.media_url || "").trim();
  if (!url) return null;
  if (/youtube\.com|youtu\.be/i.test(url)) return "video";
  if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(url)) return "video";
  return "image";
}

function getEmbedSrc(url) {
  const raw = String(url || "").trim();
  const yt =
    raw.match(/youtube\.com\/watch\?v=([^&]+)/i) ||
    raw.match(/youtu\.be\/([^?&/]+)/i) ||
    raw.match(/youtube\.com\/embed\/([^?&/]+)/i);
  if (yt?.[1]) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo?.[1]) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

export default function MediaBlock({ settings = {} }) {
  const { media_url, media_alt, caption } = settings;
  if (!media_url) return null;

  const kind = resolveMediaKind(settings);
  if (!kind) return null;

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-neutral-200 bg-white shadow-sm">
      {kind === "video" ? (
        (() => {
          const embedSrc = getEmbedSrc(media_url);
          return embedSrc ? (
            <div className="aspect-video">
              <iframe
                src={embedSrc}
                title={media_alt || "Video"}
                className="h-full w-full"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <video
              src={media_url}
              className="h-full max-h-[420px] w-full bg-black object-cover"
              controls
              playsInline
              preload="metadata"
            />
          );
        })()
      ) : (
        <img
          src={media_url}
          alt={media_alt || ""}
          className="h-full max-h-[420px] w-full object-cover"
          loading="lazy"
        />
      )}
      {caption ? (
        <p className="px-5 py-3 text-xs text-neutral-500">{caption}</p>
      ) : null}
    </div>
  );
}
