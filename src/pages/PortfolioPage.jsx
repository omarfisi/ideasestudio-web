import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import SplitLeadBlock from "@/components/forms/SplitLeadBlock.jsx";
import { getPublicPortfolioItems } from "@/lib/api.js";

// ─── Categorías de filtro — valor = slug de la API ───────────
const CATEGORY_FILTERS = [
  { value: "Todos",           label: "Todos" },
  { value: "fotografia",      label: "Fotografía" },
  { value: "video",           label: "Video" },
  { value: "branding_diseno", label: "Branding" },
  { value: "web",             label: "Web" },
  { value: "marketing_digital", label: "Marketing" },
];

// ─── Helpers YouTube ─────────────────────────────────────────
function getYoutubeId(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    let id = "";
    if (parsed.hostname.includes("youtu.be")) {
      id = parsed.pathname.split("/").filter(Boolean)[0] || "";
    } else if (parsed.pathname.startsWith("/watch")) {
      id = parsed.searchParams.get("v") || "";
    } else if (parsed.pathname.includes("/shorts/")) {
      id = parsed.pathname.split("/shorts/")[1]?.split("/")[0] || "";
    } else if (parsed.pathname.includes("/embed/")) {
      id = parsed.pathname.split("/embed/")[1]?.split("/")[0] || "";
    }
    return id.split("?")[0].split("&")[0];
  } catch {
    return "";
  }
}

function getYoutubeEmbedUrl(url) {
  const id = getYoutubeId(url);
  if (!id) return url || "";
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
}

function getYoutubeThumbnail(url) {
  const id = getYoutubeId(url);
  if (!id) return "";
  return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
}

// ─── Iconos ──────────────────────────────────────────────────
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M8 5.14v13.72c0 .77.83 1.25 1.5.86l10-6.86a1 1 0 0 0 0-1.72l-10-6.86A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
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
          <p className="mt-2 text-sm text-neutral-600">{video.description}</p>
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

// ─── VideoCard — portada tarjeta 16:10 ───────────────────────
// Usa portfolioCoverUrl (portfolio_cover_url || cover_url)
// con fallback a miniatura de YouTube si no hay portada propia.
function VideoCard({ item, onOpen }) {
  const thumb = item.portfolioCoverUrl || getYoutubeThumbnail(item.videoUrl);

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
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
          {item.category}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-lg">
            <PlayIcon />
          </span>
        </div>
      </div>

      <div className="p-5">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">{item.clientName}</p>
        <h3 className="mt-2 text-xl font-semibold text-neutral-950">{item.title}</h3>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{item.description}</p>
      </div>
    </button>
  );
}

// ─── MasonryCard — portada general, altura variable ──────────
// Usa coverUrl (cover_url). Las alturas varían según sectionKey
// para crear el efecto masonry natural.
function MasonryCard({ item }) {
  const heightClass =
    item.sectionKey === "featured" || item.isFeatured
      ? "h-[480px]"
      : item.sectionKey === "videos"
        ? "h-[280px]"
        : "h-[360px]";

  return (
    <article className="mb-6 break-inside-avoid overflow-hidden rounded-[28px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.06)]">
      <div className={`overflow-hidden ${heightClass}`}>
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt={item.title}
            className="h-full w-full object-cover transition duration-500 hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-neutral-200" />
        )}
      </div>
      <div className="p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">{item.category}</p>
        <h3 className="mt-2 text-lg font-semibold text-neutral-950">{item.title}</h3>
      </div>
    </article>
  );
}

// ─── GridCard — portada tarjeta 4:3 ──────────────────────────
// Usa portfolioCoverUrl (portfolio_cover_url || cover_url).
function GridCard({ item, onOpenVideo }) {
  const isVideo = item.mediaKind === "video" && Boolean(item.videoUrl);
  const thumb = item.portfolioCoverUrl || (isVideo ? getYoutubeThumbnail(item.videoUrl) : "");

  return (
    <article className="group overflow-hidden rounded-[28px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.06)]">
      {/* aspect-[4/3] — ratio real del componente */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {thumb ? (
          <img
            src={thumb}
            alt={item.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-neutral-200" />
        )}

        {isVideo && onOpenVideo ? (
          <button
            type="button"
            onClick={() => onOpenVideo(item)}
            className="absolute inset-0 flex items-center justify-center bg-black/20"
            aria-label={`Abrir video ${item.title}`}
          >
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg">
              <PlayIcon />
            </span>
          </button>
        ) : null}
      </div>

      <div className="p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">{item.category}</p>
        <h3 className="mt-2 text-lg font-semibold text-neutral-950">{item.title}</h3>
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

// ─── Página principal ─────────────────────────────────────────
export default function PortfolioPage() {
  const [filtroActivo, setFiltroActivo] = useState("Todos");
  const [videoAbierto, setVideoAbierto] = useState(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef(null);

  // Carga inicial
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPublicPortfolioItems().then((data) => {
      if (!cancelled) {
        setItems(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // ── Derivar colecciones a partir de los datos ──────────────
  const destacados = useMemo(
    () => items.filter((i) => i.isFeatured || i.placements.includes("home_portfolio")),
    [items]
  );

  const videos = useMemo(
    () => items.filter((i) => i.mediaKind === "video"),
    [items]
  );

  const fotos = useMemo(
    () => items.filter((i) => i.category === "fotografia"),
    [items]
  );

  const grid = useMemo(
    () => items.filter((i) => i.mediaKind !== "video" || !i.videoUrl),
    [items]
  );

  // ── Filtrado por categoría ─────────────────────────────────
  const fotosFiltradas = useMemo(() => {
    if (filtroActivo === "Todos") return fotos;
    return items.filter((i) => i.category === filtroActivo && i.mediaKind !== "video");
  }, [filtroActivo, fotos, items]);

  const videosFiltrados = useMemo(() => {
    if (filtroActivo === "Todos" || filtroActivo === "video") return videos;
    return [];
  }, [filtroActivo, videos]);

  const gridFiltrado = useMemo(() => {
    if (filtroActivo === "Todos") return grid;
    return grid.filter((i) => i.category === filtroActivo);
  }, [filtroActivo, grid]);

  // ── Slider de destacados ───────────────────────────────────
  const slideItems = destacados.length > 0 ? destacados : items.slice(0, 5);
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
        <section className="section-split px-4 pb-12 md:px-6">
          <div className="mx-auto max-w-7xl">
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

            {loading ? (
              <div className="overflow-hidden rounded-[36px] bg-neutral-200 animate-pulse min-h-[380px] lg:min-h-[520px]" />
            ) : slideActual ? (
              <div className="overflow-hidden rounded-[36px] bg-black text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                <div className="grid items-stretch lg:grid-cols-[1.05fr_0.95fr]">
                  {/* Imagen: homeCoverUrl — portada optimizada para home/slider */}
                  <div className="relative min-h-[380px] lg:min-h-[520px]">
                    {slideActual.homeCoverUrl ? (
                      <img
                        key={slideActual.id}
                        src={slideActual.homeCoverUrl}
                        alt={slideActual.title}
                        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-neutral-800" />
                    )}
                    <div className="absolute inset-0 bg-black/35" />
                  </div>

                  <div className="flex flex-col justify-center p-8 md:p-12 lg:p-14">
                    <span className="inline-flex w-fit rounded-full bg-[#f2cc3d] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-black">
                      {slideActual.category}
                    </span>
                    <h3 className="mt-6 text-3xl font-semibold leading-tight text-white md:text-5xl">
                      {slideActual.title}
                    </h3>
                    <p className="mt-6 text-base leading-8 text-white/75 md:text-lg">
                      {slideActual.description}
                    </p>
                    <div className="mt-8 flex items-center gap-4">
                      <Link
                        to="/contacto?mode=proposal&cta=portfolio-destacado"
                        className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#f2cc3d]"
                      >
                        Ver proyecto
                      </Link>
                      {totalSlides > 1 ? (
                        <div className="flex items-center gap-2">
                          {slideItems.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => irAlSlide(i)}
                              aria-label={`Ir al slide ${i + 1}`}
                              className={`h-2 rounded-full transition-all ${
                                i === slideIndex
                                  ? "w-6 bg-[#f2cc3d]"
                                  : "w-2 bg-white/30 hover:bg-white/60"
                              }`}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ── CATEGORÍAS ── */}
      <section className="section-split px-4 pb-10 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold md:text-4xl">
              Explora cada <span className="highlight-box-glow">categoría.</span>
            </h2>
            <p className="mt-3 text-base leading-7 text-neutral-500">
              Encuentra propuestas alineadas con tu objetivo, tu estilo y el tipo de proyecto que tienes en mente.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
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
                    activo
                      ? "bg-white/20 text-white"
                      : "bg-neutral-100 text-neutral-500 group-hover:bg-white/20 group-hover:text-white"
                  }`}>
                    {loading ? "…" : count}
                  </span>
                </button>
              );
            })}
          </div>
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
                : videosFiltrados.map((item) => (
                    <VideoCard key={item.id} item={item} onOpen={setVideoAbierto} />
                  ))}
            </div>
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
                : fotosFiltradas.map((item) => (
                    <MasonryCard key={item.id} item={item} />
                  ))}
            </div>
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
                : gridFiltrado.map((item) => (
                    <GridCard key={item.id} item={item} onOpenVideo={setVideoAbierto} />
                  ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── CTA LEAD ── */}
      <section className="px-4 pb-12 md:px-6">
        <div className="mx-auto max-w-[1220px]">
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
    </main>
  );
}
