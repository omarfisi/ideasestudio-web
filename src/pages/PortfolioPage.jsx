import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import {
  categoriasOuter,
  fotos,
  proyectosDestacados,
  proyectosGrid,
  videos,
} from "@/data/portfolioData.js";

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

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-current"
      aria-hidden="true"
    >
      <path d="M8 5.14v13.72c0 .77.83 1.25 1.5.86l10-6.86a1 1 0 0 0 0-1.72l-10-6.86A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}


function YoutubeModal({ open, onClose, video }) {
  if (!open || !video) return null;

  const embedUrl = getYoutubeEmbedUrl(video.youtubeUrl);

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={video.titulo}
    >
      <div
        className="relative w-full max-w-5xl rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
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
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Video
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-neutral-950">
            {video.titulo}
          </h3>
          <p className="mt-2 text-sm text-neutral-600">{video.descripcion}</p>
        </div>

        <div className="p-4 md:p-6">
          <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
            <iframe
              src={embedUrl}
              title={video.titulo}
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

function VideoCard({ item, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="group relative flex w-[320px] min-w-[320px] shrink-0 flex-col overflow-hidden rounded-[28px] bg-white p-0 text-left shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition duration-300 hover:-translate-y-1 [scroll-snap-align:start]"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={getYoutubeThumbnail(item.youtubeUrl) || item.cover}
          alt={item.titulo}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-neutral-900">
          {item.categoria}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-lg">
            <PlayIcon />
          </span>
        </div>
      </div>

      <div className="p-5">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
          {item.cliente}
        </p>
        <h3 className="mt-2 text-xl font-semibold text-neutral-950">{item.titulo}</h3>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{item.descripcion}</p>
      </div>
    </button>
  );
}

function MasonryCard({ item }) {
  const heightClass =
    item.size === "tall"
      ? "h-[480px]"
      : item.size === "wide"
        ? "h-[280px]"
        : "h-[360px]";

  return (
    <article className="mb-6 break-inside-avoid overflow-hidden rounded-[28px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.06)]">
      <div className={`overflow-hidden ${heightClass}`}>
        <img
          src={item.imagen}
          alt={item.titulo}
          className="h-full w-full object-cover transition duration-500 hover:scale-105"
        />
      </div>
      <div className="p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
          {item.categoria}
        </p>
        <h3 className="mt-2 text-lg font-semibold text-neutral-950">{item.titulo}</h3>
      </div>
    </article>
  );
}

function GridCard({ item, onOpenVideo }) {
  const isVideo = item.categoria === "Video" && Boolean(item.youtubeUrl);

  return (
    <article className="group overflow-hidden rounded-[28px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.06)]">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={item.imagen}
          alt={item.titulo}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />

        {isVideo && onOpenVideo ? (
          <button
            type="button"
            onClick={() => onOpenVideo(item)}
            className="absolute inset-0 flex items-center justify-center bg-black/20"
            aria-label={`Abrir video ${item.titulo}`}
          >
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg">
              <PlayIcon />
            </span>
          </button>
        ) : null}
      </div>

      <div className="p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
          {item.categoria}
        </p>
        <h3 className="mt-2 text-lg font-semibold text-neutral-950">{item.titulo}</h3>
      </div>
    </article>
  );
}

export default function PortfolioPage() {
  const [filtroActivo, setFiltroActivo] = useState("Todos");
  const [videoAbierto, setVideoAbierto] = useState(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const carouselRef = useRef(null);

  const slideActual = proyectosDestacados[slideIndex];
  const totalSlides = proyectosDestacados.length;
  const irAlSlide = (i) => setSlideIndex((i + totalSlides) % totalSlides);

  // Auto-avance cada 15 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % totalSlides);
    }, 15000);
    return () => clearInterval(timer);
  }, [totalSlides]);

  useEffect(() => {
    if (!videoAbierto) return undefined;

    const onEsc = (event) => {
      if (event.key === "Escape") {
        setVideoAbierto(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEsc);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEsc);
    };
  }, [videoAbierto]);

  const abrirVideo = (video) => setVideoAbierto(video);
  const cerrarVideo = () => setVideoAbierto(null);

  // Auto-scroll del carousel de videos cada 15 segundos
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

    const amount = direction === "left" ? -360 : 360;
    carouselRef.current.scrollBy({
      left: amount,
      behavior: "smooth",
    });
  };

  const fotosFiltradas = useMemo(() => {
    if (filtroActivo === "Todos") return fotos;
    return fotos.filter((item) => item.categoria === filtroActivo);
  }, [filtroActivo]);

  const videosFiltrados = useMemo(() => {
    if (filtroActivo === "Todos" || filtroActivo === "Video") return videos;
    return [];
  }, [filtroActivo]);

  const gridFiltrado = useMemo(() => {
    if (filtroActivo === "Todos") return proyectosGrid;
    return proyectosGrid.filter((item) => item.categoria === filtroActivo);
  }, [filtroActivo]);

  return (
    <main className="bg-[#f5f5f3] text-neutral-950">
      <section className="px-4 pb-10 pt-16 md:px-6 md:pb-14 md:pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-5xl text-center">
            <h1 className="text-5xl font-black leading-none tracking-tight text-black md:text-7xl">
              Proyectos que reflejan nuestra visión, detalle y <span className="highlight-box-glow">compromiso.</span>
            </h1>

            <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-neutral-600 md:text-xl">
              Historias reales, proyectos reales y resultados que se construyen con intención. Fotografía, video, branding y web para comunicar mejor y proyectar una presencia más sólida.
            </p>
          </div>
        </div>
      </section>

      <section className="section-split px-4 pb-12 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-semibold md:text-4xl">
                Conoce más sobre nuestros <span className="highlight-box-glow">servicios.</span>
              </h2>
              <p className="mt-3 text-base leading-7 text-neutral-500">
                Explora ejemplos reales y descubre cómo cada servicio puede adaptarse a lo que quieres desarrollar, comunicar o celebrar.
              </p>
            </div>
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
          </div>

          <div className="overflow-hidden rounded-[36px] bg-black text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="grid items-stretch lg:grid-cols-[1.05fr_0.95fr]">
              <div className="relative min-h-[380px] lg:min-h-[520px]">
                <img
                  key={slideActual.id}
                  src={slideActual.imagen}
                  alt={slideActual.titulo}
                  className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
                />
                <div className="absolute inset-0 bg-black/35" />
              </div>

              <div className="flex flex-col justify-center p-8 md:p-12 lg:p-14">
                <span className="inline-flex w-fit rounded-full bg-[#f2cc3d] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-black">
                  {slideActual.categoria}
                </span>

                <h3 className="mt-6 text-3xl font-semibold leading-tight text-white md:text-5xl">
                  {slideActual.titulo}
                </h3>

                <p className="mt-6 text-base leading-8 text-white/75 md:text-lg">
                  {slideActual.descripcion}
                </p>

                <div className="mt-8 flex items-center gap-4">
                  <Link
                    to="/contacto?mode=proposal&cta=portfolio-destacado"
                    className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#f2cc3d]"
                  >
                    Ver proyecto
                  </Link>

                  {/* Dots */}
                  <div className="flex items-center gap-2">
                    {proyectosDestacados.map((_, i) => (
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORÍAS ── */}
      <section className="section-split px-4 pb-10 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold md:text-4xl">Explora cada <span className="highlight-box-glow">categoría.</span></h2>
            <p className="mt-3 text-base leading-7 text-neutral-500">
              Encuentra propuestas alineadas con tu objetivo, tu estilo y el tipo de proyecto que tienes en mente.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {categoriasOuter.map((item) => {
              const activo = filtroActivo === item.titulo;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFiltroActivo(activo ? "Todos" : item.titulo)}
                  className={`group flex items-center gap-3 rounded-full border px-7 py-4 transition ${
                    activo
                      ? "border-black bg-black text-white"
                      : "border-neutral-200 bg-white text-neutral-950 hover:border-black hover:bg-black hover:text-white"
                  }`}
                >
                  <span className="text-lg font-semibold">{item.titulo}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    activo ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500 group-hover:bg-white/20 group-hover:text-white"
                  }`}>
                    {item.cantidad}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {filtroActivo === "Todos" || filtroActivo === "Video" ? (
        <section className="section-split px-4 pb-12 md:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-3xl font-semibold md:text-4xl"><span className="highlight-box-glow">Producciones</span> en video para marcas, negocios y momentos especiales.</h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-600">
                  Producción en video para marcas, negocios y momentos especiales.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => scrollCarousel("left")}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-neutral-300 bg-white text-black transition hover:border-black"
                  aria-label="Mover carousel a la izquierda"
                >
                  <ArrowLeftIcon />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCarousel("right")}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-neutral-300 bg-white text-black transition hover:border-black"
                  aria-label="Mover carousel a la derecha"
                >
                  <ArrowRightIcon />
                </button>
              </div>
            </div>

            <div
              ref={carouselRef}
              className="flex gap-5 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [scroll-snap-type:x_mandatory]"
            >
              {videosFiltrados.map((item) => (
                <VideoCard key={item.id} item={item} onOpen={abrirVideo} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {filtroActivo === "Todos" || filtroActivo === "Fotografía" ? (
        <section className="section-split px-4 pb-12 md:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Fotografía para marcas, <span className="highlight-box-glow">negocios</span> y momentos especiales.</h2>
              <p className="mt-3 text-base leading-7 text-neutral-600">
                Una selección visual pensada para ayudarte a presentar tus momentos, servicios o proyectos de una forma más atractiva, profesional y memorable.
              </p>
            </div>

            <div className="columns-1 gap-6 md:columns-2 xl:columns-3">
              {fotosFiltradas.map((item) => (
                <MasonryCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section-split px-4 pb-12 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Explora <span className="highlight-box-glow">proyectos</span> y otros trabajos destacados.</h2>
            <p className="mt-3 text-base leading-7 text-neutral-600">
              Descubre distintas áreas de nuestro portafolio de forma más clara, desde branding y web hasta fotografía y otras piezas visuales.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {gridFiltrado.map((item) => (
              <GridCard key={item.id} item={item} onOpenVideo={abrirVideo} />
            ))}
          </div>
        </div>
      </section>

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
        onClose={cerrarVideo}
        video={videoAbierto}
      />
    </main>
  );
}
