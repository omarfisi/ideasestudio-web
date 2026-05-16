import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLoaderData, useLocation } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import {
  getCardEyebrow,
  getCardTitle,
  getCategoryLabel,
  getItemDescription,
  getSubcategoryLabel,
  getYoutubeEmbedUrl,
  getYoutubeThumbnail,
} from "@/lib/portfolioPresentation.js";
import SEOHead from "@/components/seo/SEOHead.jsx";
import { buildCreativeWorkSchema, buildBreadcrumbSchema } from "@/components/seo/schema.js";
import { usePageSeo } from "@/hooks/usePageSeo.js";

function uniqueUrls(urls) {
  return Array.from(new Set(urls.filter(Boolean)));
}

function getProjectImages(project) {
  if (!project) return [];
  if (project.mediaUrls?.length > 0) return uniqueUrls(project.mediaUrls);
  return uniqueUrls([project.coverUrl]);
}

function getHeroImage(project) {
  if (!project) return "";
  return (
    project.homeCoverUrl ||
    project.portfolioCoverUrl ||
    project.coverUrl ||
    project.mediaUrls?.[0] ||
    getYoutubeThumbnail(project.videoUrl)
  );
}

function getProjectPath(project) {
  return project?.slug ? `/portafolio/${project.slug}` : "/portafolio";
}

function getDetailItems(project, imageCount) {
  return [
    getCategoryLabel(project.category),
    getSubcategoryLabel(project.subcategory),
    project.clientName ? `Cliente: ${project.clientName}` : "",
    imageCount ? `${imageCount} ${imageCount === 1 ? "imagen" : "imágenes"}` : "",
  ].filter(Boolean);
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

function ProjectImageTile({
  src,
  alt,
  onClick,
  eager = false,
  fit = "cover",
  aspect = "aspect-[4/3]",
  roundClass = "rounded-[28px]",
}) {
  const [portrait, setPortrait] = useState(false);
  const fitClass =
    fit === "contain"
      ? "object-contain object-center"
      : `object-cover ${portrait ? "object-top" : "object-center"}`;
  const hoverClass = fit === "contain" ? "" : "group-hover:scale-105";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full overflow-hidden bg-white text-left shadow-[0_12px_30px_rgba(0,0,0,0.06)] focus:outline-none focus-visible:outline-none ${roundClass}`}
    >
      <div className={`relative overflow-hidden bg-neutral-100 ${aspect}`}>
        <img
          src={src}
          alt={alt}
          className={`h-full w-full transition duration-500 ${hoverClass} ${fitClass}`}
          loading={eager ? "eager" : "lazy"}
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            setPortrait(naturalHeight > naturalWidth);
          }}
        />
      </div>
    </button>
  );
}

function ImageLightbox({ images, index, onClose, onPrev, onNext, title }) {
  if (index === null || !images.length) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/92 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="relative w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-xl text-white transition hover:bg-black"
          aria-label="Cerrar"
        >
          ×
        </button>

        <div className="overflow-hidden rounded-2xl bg-black">
          <img
            src={images[index]}
            alt={`${title} ${index + 1}`}
            className="max-h-[80vh] w-full object-contain"
          />
        </div>

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={onPrev}
              className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black"
              aria-label="Imagen anterior"
            >
              <ArrowLeftIcon />
            </button>
            <button
              type="button"
              onClick={onNext}
              className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black"
              aria-label="Imagen siguiente"
            >
              <ArrowRightIcon />
            </button>
          </>
        ) : null}

        <div className="mt-3 text-center text-sm text-white/75">
          {index + 1} / {images.length}
        </div>
      </div>
    </div>
  );
}

export default function PortfolioProjectPage() {
  const location = useLocation();
  const pageSeo = usePageSeo();
  const { project, related = [] } = useLoaderData();
  const [activeImageIndex, setActiveImageIndex] = useState(null);
  const relatedCarouselRef = useRef(null);
  const portfolioReturn = location.state?.portfolioReturn || null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [project?.slug]);

  const images = useMemo(() => getProjectImages(project), [project]);
  const heroImage = getHeroImage(project);
  const description = project ? getItemDescription(project) : "";
  const isVideo = Boolean(project?.mediaKind === "video" && project?.videoUrl);
  const videoEmbedUrl = isVideo
    ? getYoutubeEmbedUrl(project.videoUrl).replace("autoplay=1", "autoplay=0")
    : "";
  const detailItems = project ? getDetailItems(project, images.length) : [];
  const galleryGridImages = images.length > 1 ? images.slice(1) : [];
  const hasRelatedCarousel = related.length > 3;
  const modalImages = useMemo(() => {
    if (!heroImage) return images;
    const base = images.includes(heroImage) ? images : [heroImage, ...images];
    return uniqueUrls(base);
  }, [heroImage, images]);
  const heroImageIndex = useMemo(
    () => modalImages.findIndex((src) => src === heroImage),
    [modalImages, heroImage]
  );
  const projectNavigationSlugs = portfolioReturn?.projectNavigationSlugs || [];
  const navigationIndex = project ? projectNavigationSlugs.indexOf(project.slug) : -1;
  const prevProjectSlug =
    navigationIndex > 0 ? projectNavigationSlugs[navigationIndex - 1] : null;
  const nextProjectSlug =
    navigationIndex >= 0 && navigationIndex < projectNavigationSlugs.length - 1
      ? projectNavigationSlugs[navigationIndex + 1]
      : null;
  const returnState = portfolioReturn ? { portfolioReturn } : undefined;
  const relatedTitleClampStyle = {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };

  useEffect(() => {
    if (activeImageIndex === null || !modalImages.length) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveImageIndex(null);
      } else if (event.key === "ArrowLeft") {
        setActiveImageIndex((prev) => (prev - 1 + modalImages.length) % modalImages.length);
      } else if (event.key === "ArrowRight") {
        setActiveImageIndex((prev) => (prev + 1) % modalImages.length);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeImageIndex, modalImages.length]);

  const scrollRelated = (direction) => {
    if (!relatedCarouselRef.current) return;
    relatedCarouselRef.current.scrollBy({
      left: direction === "left" ? -380 : 380,
      behavior: "smooth",
    });
  };

  if (!project) {
    return (
      <main className="bg-[#f5f5f3] text-neutral-950">
        <section className="section">
          <div className="container">
            <div className="empty-state">
              <h1>Proyecto no encontrado</h1>
              <p>El proyecto solicitado no existe o aún no está publicado.</p>
              <div className="empty-state__actions">
                <Button to="/portafolio">Volver al portafolio</Button>
                <Button to="/contacto" variant="secondary">
                  Contactar
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const projectCanonical = `https://ideasestudio.com/portafolio/${project.slug}`;

  return (
    <>
      <SEOHead
        title={`${project.title} | Portafolio`}
        description={description || `Proyecto creativo realizado por Ideas Estudio en Puerto Rico.`}
        canonical={projectCanonical}
        ogImage={heroImage || undefined}
        ogType="article"
        jsonLd={[
          buildCreativeWorkSchema(project),
          buildBreadcrumbSchema([
            { name: "Inicio", url: "https://ideasestudio.com" },
            { name: "Portafolio", url: "https://ideasestudio.com/portafolio" },
            { name: project.title, url: projectCanonical },
          ]),
        ].filter(Boolean)}
        seoEntry={pageSeo}
      />
    <main className="bg-[#f5f5f3] text-neutral-950">
      <section className="pb-12 pt-10 md:pb-16 md:pt-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/portafolio"
              state={returnState}
              className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:border-black hover:bg-black hover:text-white"
            >
              ← Volver al portafolio
            </Link>

            {prevProjectSlug || nextProjectSlug ? (
              <div className="flex items-center gap-2">
                {prevProjectSlug ? (
                  <Link
                    to={`/portafolio/${prevProjectSlug}`}
                    state={returnState}
                    className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:border-black hover:bg-black hover:text-white"
                  >
                    <ArrowLeftIcon />
                    <span className="ml-2">Anterior</span>
                  </Link>
                ) : null}
                {nextProjectSlug ? (
                  <Link
                    to={`/portafolio/${nextProjectSlug}`}
                    state={returnState}
                    className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:border-black hover:bg-black hover:text-white"
                  >
                    <span className="mr-2">Siguiente</span>
                    <ArrowRightIcon />
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-none bg-black text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
          <div className="grid items-stretch lg:grid-cols-[1.05fr_0.95fr]">
            <button
              type="button"
              className="group relative min-h-[380px] overflow-hidden text-left lg:min-h-[620px]"
              onClick={() => setActiveImageIndex(heroImageIndex >= 0 ? heroImageIndex : 0)}
              aria-label="Abrir imagen del proyecto"
            >
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={project.title}
                  className="absolute inset-0 h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-neutral-800" />
              )}
              <div className="absolute inset-0 bg-black/35" />
            </button>

            <div className="flex flex-col justify-center p-8 md:p-12 lg:p-14">
              <span className="inline-flex w-fit rounded-full bg-[#f2cc3d] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-black">
                {getCardEyebrow(project)}
              </span>
              <h1 className="mt-6 text-4xl font-semibold leading-tight text-white md:text-6xl">
                {getCardTitle(project)}
              </h1>
              <p className="mt-6 text-base leading-8 text-white/75 md:text-lg">
                {description}
              </p>

              {detailItems.length ? (
                <div className="mt-7 flex flex-wrap gap-2">
                  {detailItems.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white/80"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/contacto?mode=proposal&cta=portfolio-project"
                  className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#f2cc3d]"
                >
                  Quiero algo así
                </Link>
                <Link
                  to="/portafolio"
                  state={returnState}
                  className="inline-flex items-center rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white hover:text-black"
                >
                  Ver más proyectos
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {videoEmbedUrl ? (
        <section className="section-split px-4 pb-12 md:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Video
              </p>
              <h2 className="mt-2 text-3xl font-semibold md:text-4xl">
                Reproduce el proyecto completo.
              </h2>
            </div>
            <div className="overflow-hidden rounded-[28px] bg-black shadow-[0_18px_50px_rgba(0,0,0,0.14)]">
              <div className="aspect-video w-full">
                <iframe
                  src={videoEmbedUrl}
                  title={project.title}
                  className="h-full w-full border-0"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {images.length ? (
        <section className="section-split px-4 pb-12 md:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 grid gap-6 border-b border-neutral-200 pb-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">
                  Galería
                </p>
                <h2 className="mt-2 text-3xl font-semibold leading-tight md:text-5xl">
                  Imágenes del proyecto.
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-600">
                  Recorre la selección principal y abre cualquier imagen para verla en tamaño completo.
                </p>
              </div>
              <div className="flex flex-col gap-4 lg:items-end">
                <p className="max-w-xl text-base leading-7 text-neutral-600 lg:text-right">
                  Una selección de la galería subida para este proyecto, usando las mismas imágenes publicadas en el portafolio.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-700">
                    {modalImages.length} {modalImages.length === 1 ? "foto" : "fotos"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex(0)}
                    className="inline-flex items-center rounded-full border border-black bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus-visible:outline-none"
                  >
                    Abrir galería
                  </button>
                </div>
              </div>
            </div>

            {images[0] ? (
              <div
                className={
                  galleryGridImages.length
                    ? "grid gap-6 lg:grid-cols-[minmax(320px,0.86fr)_minmax(0,1.14fr)] lg:items-start"
                    : "max-w-[460px]"
                }
              >
                <div className="lg:sticky lg:top-24">
                  <div className="overflow-hidden rounded-[36px] border border-neutral-200 bg-neutral-100 shadow-[0_12px_30px_rgba(0,0,0,0.06)]">
                    <ProjectImageTile
                      src={images[0]}
                      alt={`${project.title} destacada`}
                      eager
                      fit="cover"
                      aspect="aspect-[3/4]"
                      roundClass="rounded-none"
                      onClick={() =>
                        setActiveImageIndex(
                          modalImages.findIndex((itemSrc) => itemSrc === images[0])
                        )
                      }
                    />
                  </div>
                </div>

                {galleryGridImages.length ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    {galleryGridImages.map((src, index) => (
                      <div key={src}>
                        <ProjectImageTile
                          src={src}
                          alt={`${project.title} ${index + 2}`}
                          onClick={() =>
                            setActiveImageIndex(
                              modalImages.findIndex((itemSrc) => itemSrc === src)
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {related.length ? (
        <section className="section-split px-4 pb-12 md:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-3xl font-semibold md:text-4xl">
                  Otros proyectos relacionados.
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-600">
                  Más trabajos del mismo tipo para comparar estilo, cobertura y resultado.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/portafolio"
                  className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 transition hover:border-black hover:bg-black hover:text-white"
                >
                  Seleccionar otros trabajos
                </Link>
                {hasRelatedCarousel ? (
                  <>
                    <button
                      type="button"
                      onClick={() => scrollRelated("left")}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-300 bg-white text-black transition hover:border-black"
                      aria-label="Proyecto anterior"
                    >
                      <ArrowLeftIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollRelated("right")}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-300 bg-white text-black transition hover:border-black"
                      aria-label="Proyecto siguiente"
                    >
                      <ArrowRightIcon />
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            {hasRelatedCarousel ? (
              <div
                ref={relatedCarouselRef}
                className="flex gap-6 overflow-x-auto scroll-smooth pb-3 [scroll-snap-type:x_mandatory] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {related.map((item) => {
                  const image = getHeroImage(item);
                  return (
                    <Link
                      key={item.id}
                      to={getProjectPath(item)}
                      state={returnState}
                      className="group flex min-w-[86%] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-1 md:min-w-[48%] xl:min-w-[31.7%] [scroll-snap-align:start]"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        {image ? (
                          <img
                            src={image}
                            alt={item.title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full bg-neutral-200" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                          {getCardEyebrow(item)}
                        </p>
                        <h3
                          className="mt-2 text-lg font-semibold leading-7 text-neutral-950"
                          style={relatedTitleClampStyle}
                        >
                          {getCardTitle(item)}
                        </h3>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                {related.map((item) => {
                  const image = getHeroImage(item);
                  return (
                    <Link
                      key={item.id}
                      to={getProjectPath(item)}
                      state={returnState}
                      className="group flex h-full flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-1"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        {image ? (
                          <img
                            src={image}
                            alt={item.title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full bg-neutral-200" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                          {getCardEyebrow(item)}
                        </p>
                        <h3
                          className="mt-2 text-lg font-semibold leading-7 text-neutral-950"
                          style={relatedTitleClampStyle}
                        >
                          {getCardTitle(item)}
                        </h3>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className="section section-split">
        <div className="container">
          <div className="service-route-cta">
            <div className="service-route-cta__copy">
              <h2>
                <span className="highlight-box-glow">¿Quieres</span>{" "}
                una galería con este nivel de intención?
              </h2>
              <p>
                Cuéntanos el tipo de proyecto, fecha o idea que tienes en mente y preparamos una propuesta clara.
              </p>
            </div>
            <div className="service-route-cta__actions">
              <Button to="/contacto?mode=proposal&cta=portfolio-project-final">
                Solicitar propuesta
              </Button>
              <Button to="/portafolio" state={returnState} variant="secondary">
                Volver al portafolio
              </Button>
            </div>
          </div>
        </div>
      </section>

      <ImageLightbox
        images={modalImages}
        index={activeImageIndex}
        onClose={() => setActiveImageIndex(null)}
        onPrev={() =>
          setActiveImageIndex((prev) => (prev - 1 + modalImages.length) % modalImages.length)
        }
        onNext={() =>
          setActiveImageIndex((prev) => (prev + 1) % modalImages.length)
        }
        title={project.title}
      />
    </main>
    </>
  );
}
