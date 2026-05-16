import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead.jsx";
import { usePageSeo } from "@/hooks/usePageSeo.js";
import Button from "@/components/shared/Button.jsx";
import SplitLeadBlock from "@/components/forms/SplitLeadBlock.jsx";
import FormPlacementRenderer from "@/components/forms/FormPlacementRenderer.jsx";
import { getPublicPortfolioItems } from "@/lib/api.js";
import {
  getCardEyebrow,
  getCardTitle,
  getItemDescription,
  getSubcategoryLabel,
  getYoutubeEmbedUrl,
  getYoutubeThumbnail,
} from "@/lib/portfolioPresentation.js";

// ─── Categorías de filtro — valor = slug de la API ───────────
const CATEGORY_FILTERS = [
  { value: "Todos",           label: "Todos" },
  { value: "fotografia",      label: "Fotografía" },
  { value: "video",           label: "Video" },
  { value: "branding_diseno", label: "Branding" },
  { value: "web",             label: "Web" },
  { value: "marketing_digital", label: "Marketing" },
];

// ─── Iconos ──────────────────────────────────────────────────
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M8 5.14v13.72c0 .77.83 1.25 1.5.86l10-6.86a1 1 0 0 0 0-1.72l-10-6.86A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

function getProjectHref(item) {
  return item?.slug ? `/portafolio/${item.slug}` : "/portafolio";
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

// ─── Modal de video YouTube ───────────────────────────────────
function YoutubeModal({ open, onClose, video }) {
  if (!open || !video) return null;
  const embedUrl = getYoutubeEmbedUrl(video.videoUrl);

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
    >
      <div
        className="relative w-full max-w-5xl rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition hover:opacity-85"
          aria-label="Cerrar modal"
        >
          ×
        </button>

        <div className="border-b border-neutral-200 px-6 py-5 pr-16">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Video</p>
          <h3 className="mt-2 text-2xl font-semibold text-neutral-950">{video.title}</h3>
          <p className="mt-2 text-sm text-neutral-600">{getItemDescription(video)}</p>
        </div>

        <div className="p-4 md:p-6">
          <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
            <iframe
              src={embedUrl}
              title={video.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slideshow automático dentro de tarjeta ──────────────────
// Todas las imágenes en DOM; cross-fade por opacity.
// Si solo hay 1 imagen, renderiza img normal.
function CardSlideshow({ images, alt, className = "" }) {
  const [idx, setIdx] = useState(0);
  // "top" para imágenes portrait detectadas por onLoad
  const [positions, setPositions] = useState({});

  const onImgLoad = (src, e) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    if (h > w) setPositions((p) => ({ ...p, [src]: "object-top" }));
  };

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(
      () => setIdx((i) => (i + 1) % images.length),
      3200,
    );
    return () => clearInterval(t);
  }, [images.length]);

  if (!images.length) return <div className={`h-full w-full bg-neutral-200 ${className}`} />;

  if (images.length === 1) {
    const pos = positions[images[0]] ?? "object-center";
    return (
      <img
        src={images[0]}
        alt={alt}
        onLoad={(e) => onImgLoad(images[0], e)}
        className={`h-full w-full object-cover ${pos} transition duration-500 hover:scale-105 ${className}`}
      />
    );
  }

  const progress = ((idx + 1) / images.length) * 100;

  return (
    <div className={`relative h-full w-full ${className}`}>
      {images.map((src, i) => {
        const pos = positions[src] ?? "object-center";
        return (
          <img
            key={src}
            src={src}
            alt={`${alt} ${i + 1}`}
            onLoad={(e) => onImgLoad(src, e)}
            className={`absolute inset-0 h-full w-full object-cover ${pos} transition-opacity duration-700 ${
              i === idx ? "opacity-100" : "opacity-0"
            }`}
          />
        );
      })}

      {/* ── Barra de progreso — solo si hay varias imágenes ── */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-[7px] backdrop-blur-md">
          <div className="h-[3px] w-20 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] font-medium leading-none tracking-wide text-white/60">
            {idx + 1}&thinsp;/&thinsp;{images.length}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de galería de imágenes ────────────────────────────
function GalleryModal({ open, onClose, item }) {
  const [idx, setIdx] = useState(0);
  const images = item
    ? item.mediaUrls?.length > 0 ? item.mediaUrls : [item.coverUrl].filter(Boolean)
    : [];

  useEffect(() => { if (open) setIdx(0); }, [open, item?.id]);

  useEffect(() => {
    if (!open) return undefined;
    const len = images.length;
    const handle = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")  setIdx((i) => (i - 1 + len) % len);
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % len);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handle);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", handle); };
  }, [open, onClose, images.length]);

  if (!open || !item || images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/92 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white text-xl transition hover:bg-black"
          aria-label="Cerrar"
        >
          ×
        </button>

        <div className="overflow-hidden rounded-2xl bg-black">
          <img
            key={images[idx]}
            src={images[idx]}
            alt={`${item.title} — ${idx + 1}`}
            className="max-h-[78vh] w-full object-contain"
          />
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black"
              aria-label="Imagen anterior"
            >
              <ArrowLeftIcon />
            </button>
            <button
              type="button"
              onClick={() => setIdx((i) => (i + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black"
              aria-label="Imagen siguiente"
            >
              <ArrowRightIcon />
            </button>
            <div className="mt-3 flex justify-center gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`h-2 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-2 bg-white/35 hover:bg-white/65"}`}
                  aria-label={`Ir a imagen ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="mt-3 text-center">
          <p className="text-sm font-semibold text-white">{item.title}</p>
          {images.length > 1 && (
            <p className="mt-1 text-xs text-white/50">{idx + 1} / {images.length}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── VideoCard — portada tarjeta 16:10 ───────────────────────
// Usa portfolioCoverUrl (portfolio_cover_url || cover_url)
// con fallback a miniatura de YouTube si no hay portada propia.
function VideoCard({ item, onOpen, projectLinkState }) {
  const thumb = item.portfolioCoverUrl || getYoutubeThumbnail(item.videoUrl);

  return (
    <article
      className="group relative flex w-[320px] min-w-[320px] shrink-0 flex-col overflow-hidden rounded-[28px] bg-white p-0 text-left shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition duration-300 hover:-translate-y-1 [scroll-snap-align:start]"
    >
      {/* aspect-[16/10] — ratio real del componente */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {thumb ? (
          <img
            src={thumb}
            alt={item.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-neutral-200" />
        )}
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-neutral-900">
          {getCardEyebrow(item)}
        </div>
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="absolute inset-0 flex items-center justify-center bg-black/10"
          aria-label={`Abrir video ${item.title}`}
        >
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-lg">
            <PlayIcon />
          </span>
        </button>
      </div>

      <div className="p-5">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
          {getCardEyebrow(item)}
        </p>
        <h3 className="mt-2 text-xl font-semibold text-neutral-950">{getCardTitle(item)}</h3>
        {item.clientName && (
          <p className="mt-1.5 text-xs text-neutral-400">
            Cliente: <span className="text-neutral-500">{item.clientName}</span>
          </p>
        )}
        <p className="mt-2 text-sm leading-6 text-neutral-600">{getItemDescription(item)}</p>
        <div className="mt-4">
          <Link
            to={getProjectHref(item)}
            state={item.slug ? projectLinkState : undefined}
            className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:border-black hover:bg-black hover:text-white"
          >
            Ver proyecto
          </Link>
        </div>
      </div>
    </article>
  );
}

// ─── MasonryCard — portada general, altura variable ──────────
// Usa coverUrl (cover_url). Las alturas varían según sectionKey
// para crear el efecto masonry natural.
function MasonryCard({ item, onOpenGallery, projectLinkState }) {
  const heightClass =
    item.sectionKey === "featured" || item.isFeatured
      ? "h-[480px]"
      : item.sectionKey === "videos"
        ? "h-[280px]"
        : "h-[360px]";

  const images =
    item.mediaUrls?.length > 0
      ? item.mediaUrls
      : item.coverUrl ? [item.coverUrl] : [];

  return (
    <article
      className={`mb-6 break-inside-avoid overflow-hidden rounded-[28px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.06)] ${onOpenGallery ? "cursor-pointer" : ""}`}
      onClick={onOpenGallery ? () => onOpenGallery(item) : undefined}
    >
      <div className={`relative overflow-hidden ${heightClass}`}>
        <CardSlideshow images={images} alt={item.title} />
        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-xs font-semibold text-white pointer-events-none">
            <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            {images.length}
          </div>
        )}
      </div>
      <div className="p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
          {getCardEyebrow(item)}
        </p>
        <h3 className="mt-2 text-lg font-semibold text-neutral-950">{getCardTitle(item)}</h3>
        {item.clientName && (
          <p className="mt-1.5 text-xs text-neutral-400">
            Cliente: <span className="text-neutral-500">{item.clientName}</span>
          </p>
        )}
        <div className="mt-4">
          <Link
            to={getProjectHref(item)}
            state={item.slug ? projectLinkState : undefined}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:border-black hover:bg-black hover:text-white"
          >
            Ver proyecto
          </Link>
        </div>
      </div>
    </article>
  );
}

// ─── GridCard — portada tarjeta 4:3 ──────────────────────────
// Usa portfolioCoverUrl (portfolio_cover_url || cover_url).
function GridCard({ item, onOpenVideo, onOpenGallery, projectLinkState }) {
  const isVideo = item.mediaKind === "video" && Boolean(item.videoUrl);
  const thumb = item.portfolioCoverUrl || (isVideo ? getYoutubeThumbnail(item.videoUrl) : "");

  const images = !isVideo
    ? item.mediaUrls?.length > 0
      ? item.mediaUrls
      : thumb ? [thumb] : []
    : [];

  return (
    <article
      className={`group overflow-hidden rounded-[28px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.06)] ${!isVideo && onOpenGallery ? "cursor-pointer" : ""}`}
      onClick={!isVideo && onOpenGallery ? () => onOpenGallery(item) : undefined}
    >
      {/* aspect-[4/3] — ratio real del componente */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {isVideo ? (
          thumb ? (
            <img
              src={thumb}
              alt={item.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-neutral-200" />
          )
        ) : (
          <CardSlideshow images={images} alt={item.title} />
        )}

        {isVideo && onOpenVideo ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenVideo(item); }}
            className="absolute inset-0 flex items-center justify-center bg-black/20"
            aria-label={`Abrir video ${item.title}`}
          >
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg">
              <PlayIcon />
            </span>
          </button>
        ) : null}

        {!isVideo && images.length > 1 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-xs font-semibold text-white pointer-events-none">
            <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            {images.length}
          </div>
        )}
      </div>

      <div className="p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
          {getCardEyebrow(item)}
        </p>
        <h3 className="mt-2 text-lg font-semibold text-neutral-950">{getCardTitle(item)}</h3>
        {item.clientName && (
          <p className="mt-1.5 text-xs text-neutral-400">
            Cliente: <span className="text-neutral-500">{item.clientName}</span>
          </p>
        )}
        <div className="mt-4">
          <Link
            to={getProjectHref(item)}
            state={item.slug ? projectLinkState : undefined}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:border-black hover:bg-black hover:text-white"
          >
            Ver proyecto
          </Link>
        </div>
      </div>
    </article>
  );
}

// ─── Skeleton de carga ────────────────────────────────────────
function SkeletonCard({ aspect = "aspect-[16/10]" }) {
  return (
    <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.06)]">
      <div className={`${aspect} animate-pulse bg-neutral-200`} />
      <div className="p-5 space-y-2">
        <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200" />
      </div>
    </div>
  );
}

// ─── Paginación ───────────────────────────────────────────────
function Pagination({ total, pageSize, page, onChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="mt-10 flex items-center justify-center gap-2">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white text-sm text-neutral-700 transition hover:border-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Página anterior"
      >
        ‹
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition ${
            p === page
              ? "border-black bg-black text-white"
              : "border-neutral-300 bg-white text-neutral-700 hover:border-black hover:bg-black hover:text-white"
          }`}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white text-sm text-neutral-700 transition hover:border-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Página siguiente"
      >
        ›
      </button>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────
export default function PortfolioPage() {
  const pageSeo = usePageSeo();
  const location = useLocation();
  const [filtroActivo, setFiltroActivo] = useState("Todos");
  const [subcategoryActivo, setSubcategoryActivo] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [videoAbierto, setVideoAbierto] = useState(null);
  const [galleryItem, setGalleryItem] = useState(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef(null);
  const hasRestoredStateRef = useRef(false);
  const isRestoringStateRef = useRef(false);
  const pendingScrollYRef = useRef(null);

  // ── Paginación por sección ─────────────────────────────────
  const PAGE_SIZE = 6;
  const [fotosPage, setFotosPage] = useState(1);
  const [gridPage, setGridPage] = useState(1);
  const [videosPage, setVideosPage] = useState(1);

  // Restaurar contexto al volver desde /portafolio/:slug
  useEffect(() => {
    const saved = location.state?.portfolioReturn;
    if (!saved || hasRestoredStateRef.current) return;

    hasRestoredStateRef.current = true;
    isRestoringStateRef.current = true;

    if (saved.filtroActivo) setFiltroActivo(saved.filtroActivo);
    if ("subcategoryActivo" in saved) {
      setSubcategoryActivo(saved.subcategoryActivo || null);
    }
    if (Number.isInteger(saved.fotosPage) && saved.fotosPage > 0) {
      setFotosPage(saved.fotosPage);
    }
    if (Number.isInteger(saved.gridPage) && saved.gridPage > 0) {
      setGridPage(saved.gridPage);
    }
    if (Number.isInteger(saved.videosPage) && saved.videosPage > 0) {
      setVideosPage(saved.videosPage);
    }
    if (Number.isFinite(saved.scrollY) && saved.scrollY >= 0) {
      pendingScrollYRef.current = saved.scrollY;
    }

    setTimeout(() => {
      isRestoringStateRef.current = false;
    }, 0);
  }, [location.state]);

  // Carga inicial
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPublicPortfolioItems({ limit: 500 }).then((data) => {
      if (!cancelled) {
        setItems(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (loading || pendingScrollYRef.current === null) return;
    const targetY = pendingScrollYRef.current;
    pendingScrollYRef.current = null;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: targetY, behavior: "auto" });
      });
    });
  }, [loading]);

  // ── Derivar colecciones a partir de los datos ──────────────
  // section_key controls placement explicitly; "general"/null falls back to category.
  function getEffectiveSection(item) {
    const sk = item.sectionKey;
    if (sk === "featured")   return "featured";
    if (sk === "fotografia") return "fotografia";
    if (sk === "videos")     return "videos";
    if (sk === "grid")       return "grid"; // explicit grid override (ignores category)
    // "general" or null/empty → auto from category
    if (item.category === "fotografia") return "fotografia";
    if (item.mediaKind === "video" && item.videoUrl) return "videos";
    return "grid";
  }

  const destacados = useMemo(
    () => items.filter((i) => i.isFeatured || getEffectiveSection(i) === "featured"),
    [items]
  );

  const videos = useMemo(
    () => items.filter((i) => getEffectiveSection(i) === "videos"),
    [items]
  );

  const fotos = useMemo(
    () => items.filter((i) => getEffectiveSection(i) === "fotografia"),
    [items]
  );

  const grid = useMemo(
    () => items.filter((i) => getEffectiveSection(i) === "grid"),
    [items]
  );

  // ── Subcategorías disponibles para la categoría activa ────
  const subcategoriesDisponibles = useMemo(() => {
    const base = filtroActivo === "Todos" ? items : items.filter((i) => i.category === filtroActivo);
    const seen = new Set();
    return base
      .map((i) => i.subcategory)
      .filter((s) => s && !seen.has(s) && seen.add(s));
  }, [filtroActivo, items]);

  // reset subcategory cuando cambia la categoría principal
  useEffect(() => {
    if (isRestoringStateRef.current) return;
    setSubcategoryActivo(null);
  }, [filtroActivo]);

  // reset paginación cuando cambia filtro o subcategoría
  useEffect(() => {
    if (isRestoringStateRef.current) return;
    setFotosPage(1);
    setGridPage(1);
    setVideosPage(1);
  }, [filtroActivo, subcategoryActivo]);

  // ── Filtrado por categoría ─────────────────────────────────
  const fotosFiltradas = useMemo(() => {
    let base;
    if (filtroActivo === "Todos") base = fotos;
    else base = items.filter((i) => i.category === filtroActivo && i.mediaKind !== "video");
    if (subcategoryActivo) base = base.filter((i) => i.subcategory === subcategoryActivo);
    return base;
  }, [filtroActivo, subcategoryActivo, fotos, items]);

  const videosFiltrados = useMemo(() => {
    if (filtroActivo === "Todos" || filtroActivo === "video") return videos;
    return [];
  }, [filtroActivo, videos]);

  const gridFiltrado = useMemo(() => {
    if (filtroActivo === "Todos") return grid;
    return grid.filter((i) => i.category === filtroActivo);
  }, [filtroActivo, grid]);

  const projectNavigationSlugs = useMemo(() => {
    const seen = new Set();
    return [...videosFiltrados, ...fotosFiltradas, ...gridFiltrado]
      .map((item) => item.slug)
      .filter((slug) => slug && !seen.has(slug) && seen.add(slug));
  }, [videosFiltrados, fotosFiltradas, gridFiltrado]);

  const projectLinkState = useMemo(
    () => ({
      portfolioReturn: {
        filtroActivo,
        subcategoryActivo,
        fotosPage,
        gridPage,
        videosPage,
        scrollY: window.scrollY,
        projectNavigationSlugs,
      },
    }),
    [
      filtroActivo,
      subcategoryActivo,
      fotosPage,
      gridPage,
      videosPage,
      projectNavigationSlugs,
    ]
  );

  // ── Slider de destacados — todos los publicados con imagen ──
  const slideItems = items.filter(i => i.homeCoverUrl || i.coverUrl);
  const totalSlides = slideItems.length;
  const slideActual = slideItems[slideIndex] ?? null;
  const irAlSlide = (i) => setSlideIndex((i + totalSlides) % totalSlides);

  useEffect(() => {
    if (totalSlides <= 1) return;
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % totalSlides);
    }, 15000);
    return () => clearInterval(timer);
  }, [totalSlides]);

  // ── Teclado / scroll ───────────────────────────────────────
  useEffect(() => {
    if (!videoAbierto) return undefined;
    const onEsc = (e) => { if (e.key === "Escape") setVideoAbierto(null); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEsc);
    };
  }, [videoAbierto]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!carouselRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      const atEnd = scrollLeft + clientWidth >= scrollWidth - 10;
      if (atEnd) {
        carouselRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        carouselRef.current.scrollBy({ left: 345, behavior: "smooth" });
      }
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const scrollCarousel = (direction) => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: direction === "left" ? -360 : 360, behavior: "smooth" });
  };

  // ── Conteos para botones de categoría ─────────────────────
  const countByCategory = useMemo(() => {
    const map = {};
    items.forEach((i) => {
      map[i.category] = (map[i.category] || 0) + 1;
    });
    return map;
  }, [items]);

  return (
    <main className="bg-[#f5f5f3] text-neutral-950">
      <SEOHead
        title="Portafolio | Ideas Estudio"
        description="Galería de proyectos de fotografía, video y diseño. Trabajos reales para marcas y eventos en Puerto Rico."
        canonical="https://ideasestudio.com/portafolio"
        seoEntry={pageSeo}
      />
      {/* ── HERO ── */}
      <section className="px-4 pb-10 pt-16 md:px-6 md:pb-14 md:pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-5xl text-center">
            <h1 className="text-5xl font-black leading-none tracking-tight text-black md:text-7xl">
              Proyectos que reflejan nuestra visión, detalle y{" "}
              <span className="highlight-box-glow">compromiso.</span>
            </h1>
            <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-neutral-600 md:text-xl">
              Historias reales, proyectos reales y resultados que se construyen con intención. Fotografía, video, branding y web para comunicar mejor y proyectar una presencia más sólida.
            </p>
          </div>
        </div>
      </section>

      {/* ── SLIDER DE DESTACADOS ──
          Imagen: homeCoverUrl = home_cover_url || cover_url
          Contenedor: min-h-[380px] lg:min-h-[520px] sin ratio fijo
      */}
      {(loading || slideActual) ? (
        <section className="section-split pb-12">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-semibold md:text-4xl">
                  Conoce más sobre nuestros{" "}
                  <span className="highlight-box-glow">servicios.</span>
                </h2>
                <p className="mt-3 text-base leading-7 text-neutral-500">
                  Explora ejemplos reales y descubre cómo cada servicio puede adaptarse a lo que quieres desarrollar, comunicar o celebrar.
                </p>
              </div>
              {totalSlides > 1 ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => irAlSlide(slideIndex - 1)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-300 bg-white text-black transition hover:border-black"
                    aria-label="Proyecto anterior"
                  >
                    <ArrowLeftIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => irAlSlide(slideIndex + 1)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-300 bg-white text-black transition hover:border-black"
                    aria-label="Proyecto siguiente"
                  >
                    <ArrowRightIcon />
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="overflow-hidden bg-neutral-200 animate-pulse min-h-[520px] lg:min-h-[760px]" />
          ) : slideActual ? (
            <div className="overflow-hidden bg-black text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
              <div className="grid items-stretch lg:grid-cols-[1.2fr_0.8fr]">
                {/* Imagen: homeCoverUrl — portada optimizada para home/slider */}
                <div className="relative flex items-center justify-center min-h-[520px] lg:min-h-[760px] overflow-hidden">
                  {slideActual.homeCoverUrl ? (
                    <img
                      key={slideActual.id}
                      src={slideActual.homeCoverUrl}
                      alt={slideActual.title}
                      className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
                      style={{ objectPosition: "50% 15%" }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-neutral-800" />
                  )}
                  <div className="absolute inset-0 bg-black/35" />
                  {totalSlides > 1 && (
                    <div className="pointer-events-none absolute bottom-4 left-4 z-10 hidden md:block">
                      <div className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-[7px] backdrop-blur-md">
                        <div className="h-[3px] w-20 overflow-hidden rounded-full bg-white/20">
                          <div
                            className="h-full rounded-full bg-white transition-all duration-500 ease-out"
                            style={{ width: `${((slideIndex + 1) / totalSlides) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium leading-none tracking-wide text-white/60">
                          {slideIndex + 1}&thinsp;/&thinsp;{totalSlides}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-center p-8 md:p-12 lg:p-14">
                  <span className="inline-flex w-fit rounded-full bg-[#f2cc3d] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-black">
                    {getCardEyebrow(slideActual)}
                  </span>
                  <h3 className="mt-6 text-3xl font-semibold leading-tight text-white md:text-5xl">
                    {slideActual.title}
                  </h3>
                  <p className="mt-6 text-base leading-8 text-white/75 md:text-lg">
                    {getItemDescription(slideActual)}
                  </p>
                  <div className="mt-8 flex items-center gap-4">
                    <Link
                      to={slideActual.slug ? `/portafolio/${slideActual.slug}` : "/portafolio"}
                      state={slideActual.slug ? projectLinkState : undefined}
                      className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#f2cc3d]"
                    >
                      Ver proyecto
                    </Link>
                  </div>
                </div>
              </div>

              {totalSlides > 1 && (
                <div className="pointer-events-none px-4 pb-4 md:hidden">
                  <div className="mx-auto flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-[7px] backdrop-blur-md">
                    <div className="h-[3px] w-20 overflow-hidden rounded-full bg-white/20">
                      <div
                        className="h-full rounded-full bg-white transition-all duration-500 ease-out"
                        style={{ width: `${((slideIndex + 1) / totalSlides) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium leading-none tracking-wide text-white/70">
                      {slideIndex + 1}&thinsp;/&thinsp;{totalSlides}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── CATEGORÍAS ── */}
      <section className="section-split px-4 pb-10 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold md:text-4xl">
              Explora proyectos y otros <span className="highlight-box-glow">trabajos destacados.</span>
            </h2>
            <p className="mt-3 text-base leading-7 text-neutral-500">
              Descubre distintas áreas de nuestro portafolio de forma más clara, desde branding y web hasta fotografía de proyectos y momentos especiales.
            </p>
          </div>
          {/* ── Desktop: pills centrados ── */}
          <div className="hidden md:flex flex-wrap justify-center gap-3">
            {CATEGORY_FILTERS.map((cat) => {
              const activo = filtroActivo === cat.value;
              const count = cat.value === "Todos" ? items.length : (countByCategory[cat.value] || 0);
              if (cat.value !== "Todos" && count === 0 && !loading) return null;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFiltroActivo(activo ? "Todos" : cat.value)}
                  className={`group flex items-center gap-3 rounded-full border px-7 py-4 transition ${
                    activo
                      ? "border-black bg-black text-white"
                      : "border-neutral-200 bg-white text-neutral-950 hover:border-black hover:bg-black hover:text-white"
                  }`}
                >
                  <span className="text-lg font-semibold">{cat.label}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    activo ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500 group-hover:bg-white/20 group-hover:text-white"
                  }`}>
                    {loading ? "…" : count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Móvil: Botón Filtrar + Drawer ── */}
          <div className="md:hidden">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-900 shadow-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/></svg>
                Filtrar
                {filtroActivo !== "Todos" && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">1</span>
                )}
              </button>
            </div>
            {filtroActivo !== "Todos" && (
              <p className="mt-2 text-center text-sm text-neutral-500">
                Filtrando por: <strong>{CATEGORY_FILTERS.find(c => c.value === filtroActivo)?.label}</strong>
                {subcategoryActivo && <> · <strong>{getSubcategoryLabel(subcategoryActivo)}</strong></>}
              </p>
            )}
          </div>

          {/* Drawer overlay */}
          {drawerOpen && (
            <div className="fixed inset-0 z-50 md:hidden" onClick={() => setDrawerOpen(false)}>
              <div className="absolute inset-0 bg-black/40" />
              <div
                className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white px-5 pb-10 pt-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-neutral-900">Filtrar por categoría</h3>
                  <button type="button" onClick={() => setDrawerOpen(false)} className="text-neutral-400 hover:text-neutral-900">✕</button>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {CATEGORY_FILTERS.map((cat) => {
                    const activo = filtroActivo === cat.value;
                    const count = cat.value === "Todos" ? items.length : (countByCategory[cat.value] || 0);
                    if (cat.value !== "Todos" && count === 0 && !loading) return null;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => { setFiltroActivo(activo ? "Todos" : cat.value); setSubcategoryActivo(null); setDrawerOpen(false); }}
                        className={`flex items-center justify-between rounded-2xl border px-5 py-3.5 text-left transition ${
                          activo ? "border-black bg-black text-white" : "border-neutral-200 bg-neutral-50 text-neutral-900"
                        }`}
                      >
                        <span className="font-semibold">{cat.label}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          activo ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-500"
                        }`}>{loading ? "…" : count}</span>
                      </button>
                    );
                  })}
                </div>
                {subcategoriesDisponibles.length > 0 && (
                  <>
                    <p className="mt-5 mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">Subcategoría</p>
                    <div className="flex flex-wrap gap-2">
                      {subcategoriesDisponibles.map((sub) => {
                        const activo = subcategoryActivo === sub;
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => { setSubcategoryActivo(activo ? null : sub); setDrawerOpen(false); }}
                            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                              activo ? "border-[#f2cc3d] bg-[#f2cc3d] text-black" : "border-neutral-300 bg-white text-neutral-600"
                            }`}
                          >
                            {getSubcategoryLabel(sub)}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Desktop: Subcategorías ── */}
          {subcategoriesDisponibles.length > 0 && (
            <div className="mt-4 hidden md:flex flex-wrap justify-center gap-2">
              {subcategoriesDisponibles.map((sub) => {
                const activo = subcategoryActivo === sub;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubcategoryActivo(activo ? null : sub)}
                    className={`rounded-full border px-5 py-2 text-sm font-medium transition ${
                      activo ? "border-[#f2cc3d] bg-[#f2cc3d] text-black" : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
                    }`}
                  >
                    {getSubcategoryLabel(sub)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── VIDEOS ──
          Imagen: portfolioCoverUrl = portfolio_cover_url || cover_url
          Ratio: aspect-[16/10]
      */}
      {(filtroActivo === "Todos" || filtroActivo === "video") && (loading || videosFiltrados.length > 0) ? (
        <section className="section-split px-4 pb-12 md:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-3xl font-semibold md:text-4xl">
                  <span className="highlight-box-glow">Producciones</span> en video para marcas, negocios y momentos especiales.
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-600">
                  Producción en video para marcas, negocios y momentos especiales.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => scrollCarousel("left")} className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-neutral-300 bg-white text-black transition hover:border-black" aria-label="Anterior">
                  <ArrowLeftIcon />
                </button>
                <button type="button" onClick={() => scrollCarousel("right")} className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-neutral-300 bg-white text-black transition hover:border-black" aria-label="Siguiente">
                  <ArrowRightIcon />
                </button>
              </div>
            </div>

            <div ref={carouselRef} className="flex gap-5 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [scroll-snap-type:x_mandatory]">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="w-[320px] min-w-[320px] shrink-0">
                      <SkeletonCard aspect="aspect-[16/10]" />
                    </div>
                  ))
                : videosFiltrados.slice((videosPage - 1) * PAGE_SIZE, videosPage * PAGE_SIZE).map((item) => (
                    <VideoCard
                      key={item.id}
                      item={item}
                      onOpen={setVideoAbierto}
                      projectLinkState={projectLinkState}
                    />
                  ))}
            </div>
            {!loading && videosFiltrados.length > PAGE_SIZE && (
              <Pagination total={videosFiltrados.length} pageSize={PAGE_SIZE} page={videosPage} onChange={setVideosPage} />
            )}
          </div>
        </section>
      ) : null}

      {/* ── FOTOGRAFÍA — masonry ──
          Imagen: coverUrl = cover_url
          Altura variable por sectionKey
      */}
      {(filtroActivo === "Todos" || filtroActivo === "fotografia") && (loading || fotosFiltradas.length > 0) ? (
        <section className="section-split px-4 pb-12 md:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <h2 className="mt-2 text-3xl font-semibold md:text-4xl">
                Fotografía para marcas,{" "}
                <span className="highlight-box-glow">negocios</span> y momentos especiales.
              </h2>
              <p className="mt-3 text-base leading-7 text-neutral-600">
                Una selección visual pensada para ayudarte a presentar tus momentos, servicios o proyectos de una forma más atractiva, profesional y memorable.
              </p>
            </div>
            <div className="columns-1 gap-6 md:columns-2 xl:columns-3">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="mb-6 break-inside-avoid">
                      <SkeletonCard aspect={i % 3 === 0 ? "h-[480px]" : "h-[360px]"} />
                    </div>
                  ))
                : fotosFiltradas.slice((fotosPage - 1) * PAGE_SIZE, fotosPage * PAGE_SIZE).map((item) => (
                    <MasonryCard
                      key={item.id}
                      item={item}
                      onOpenGallery={setGalleryItem}
                      projectLinkState={projectLinkState}
                    />
                  ))}
            </div>
            {!loading && fotosFiltradas.length > PAGE_SIZE && (
              <Pagination total={fotosFiltradas.length} pageSize={PAGE_SIZE} page={fotosPage} onChange={setFotosPage} />
            )}
          </div>
        </section>
      ) : null}

      {/* ── GRID GENERAL ──
          Imagen: portfolioCoverUrl = portfolio_cover_url || cover_url
          Ratio: aspect-[4/3]
      */}
      {(loading || gridFiltrado.length > 0) ? (
        <section className="section-split px-4 pb-12 md:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <h2 className="mt-2 text-3xl font-semibold md:text-4xl">
                Explora <span className="highlight-box-glow">proyectos</span> y otros trabajos destacados.
              </h2>
              <p className="mt-3 text-base leading-7 text-neutral-600">
                Descubre distintas áreas de nuestro portafolio de forma más clara, desde branding y web hasta fotografía y otras piezas visuales.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} aspect="aspect-[4/3]" />
                  ))
                : gridFiltrado.slice((gridPage - 1) * PAGE_SIZE, gridPage * PAGE_SIZE).map((item) => (
                    <GridCard
                      key={item.id}
                      item={item}
                      onOpenVideo={setVideoAbierto}
                      onOpenGallery={setGalleryItem}
                      projectLinkState={projectLinkState}
                    />
                  ))}
            </div>
            {!loading && gridFiltrado.length > PAGE_SIZE && (
              <Pagination total={gridFiltrado.length} pageSize={PAGE_SIZE} page={gridPage} onChange={setGridPage} />
            )}
          </div>
        </section>
      ) : null}

      {/* ── CTA LEAD ── */}
      <section className="px-4 pb-12 md:px-6">
        <div className="mx-auto max-w-[1220px]">
          <FormPlacementRenderer
            sectionKey="portfolio_cta_split"
            fallback={
              <SplitLeadBlock
                eyebrow="Portafolio / Ideas Estudio"
                title={<>Si esto te gustó, podemos crear algo igual o mejor para tu <span style={{ color: "#f2cc3d" }}>negocio</span>.</>}
                description="Cuéntanos lo que tienes en mente y te ayudamos a desarrollar una propuesta visual más clara, profesional y estratégica."
                imageSrc="https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=900&q=80"
                imageAlt="Portafolio Ideas Estudio"
                buttonLabel="Quiero algo así"
                successMessage="Perfecto. Hemos recibido tu información y te contactaremos pronto."
                showNameField={true}
                namePlaceholder="Tu nombre"
                emailPlaceholder="Tu email"
                consentLabel="Respondo personalmente lo antes posible."
                source="website_portfolio"
                segment="portfolio_leads"
                segments={["portfolio_leads", "newsletter"]}
                submissionKind="lead_capture"
                defaultMessage="Lead desde Portafolio"
                meta={{ page_url: "/portafolio", form_name: "portfolio_split_lead_block", entry_point: "portfolio_page", ui_context: "ideas_web_public", ab_variant: "portfolio_v1" }}
                theme="dark"
              />
            }
          />
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="section section-split">
        <div className="container">
          <div className="service-route-cta">
            <div className="service-route-cta__copy">
              <h2>
                <span className="highlight-box-glow">Transformemos</span>{" "}
                esta necesidad en una propuesta clara para tu marca o negocio.
              </h2>
              <p>
                Si ya identificaste lo que necesitas, te ayudamos a definir la combinación correcta entre branding, contenido, web y piezas comerciales.
              </p>
            </div>
            <div className="service-route-cta__actions">
              <Button to="/contacto?mode=proposal&cta=portfolio-final">
                Quiero una propuesta clara
              </Button>
              <Button to="/contacto" variant="secondary">
                Hablar sobre mi proyecto
              </Button>
            </div>
          </div>
        </div>
      </section>

      <YoutubeModal
        open={Boolean(videoAbierto)}
        onClose={() => setVideoAbierto(null)}
        video={videoAbierto}
      />
      <GalleryModal
        open={Boolean(galleryItem)}
        onClose={() => setGalleryItem(null)}
        item={galleryItem}
      />
    </main>
  );
}
