import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import SEOHead from "@/components/seo/SEOHead.jsx";
import PublicBusinessIntakeForm from "@/components/forms/PublicBusinessIntakeForm.jsx";
import PublicLandingBlocks from "@/components/landing/blocks/PublicLandingBlocks.jsx";
import { getPublicForm, getPublicFormLanding } from "@/lib/publicFormsApi.js";

const DEFAULT_BENEFITS = [
  "Entendemos mejor tu negocio",
  "Identificamos tus necesidades principales",
  "Te recomendamos servicios adecuados",
  "Organizamos tu información dentro del CRM",
  "Podemos darte seguimiento de forma más efectiva",
];

const DEFAULT_LANDING = {
  hero_badge: "Ideas Estudio",
  hero_title: "Conozcamos tu negocio",
  hero_subtitle:
    "Completa este formulario para entender mejor tu negocio, tus metas, tus retos y las áreas donde Ideas Estudio puede ayudarte a crecer.",
  hero_media_kind: "none",
  hero_media_url: "",
  hero_media_alt: "",
  primary_cta_label: "Completar formulario",
  secondary_cta_label: "Hablar directamente",
  secondary_cta_url: "/contacto",
  benefits: DEFAULT_BENEFITS,
  trust_points: [],
  seo: {
    seo_title: "Conoce tu negocio | Ideas Estudio",
    seo_description:
      "Completa el formulario de Ideas Estudio para ayudarnos a conocer tu negocio, tus metas y tus necesidades de marketing, diseño, fotografía, video y web.",
    og_title: "Conoce tu negocio | Ideas Estudio",
    og_description:
      "Cuéntanos sobre tu negocio y descubre cómo Ideas Estudio puede ayudarte a crecer.",
  },
};

function normalizeList(value, fallback = []) {
  if (!Array.isArray(value)) return fallback;
  const items = value.map((item) => String(item || "").trim()).filter(Boolean);
  return items.length ? items : fallback;
}

function normalizeAssets(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item?.image_url && item?.is_active !== false);
}

function getVideoEmbedConfig(url) {
  const raw = String(url || "").trim();
  if (!raw) return null;

  const youtubeMatch =
    raw.match(/youtube\.com\/watch\?v=([^&]+)/i) ||
    raw.match(/youtu\.be\/([^?&/]+)/i) ||
    raw.match(/youtube\.com\/embed\/([^?&/]+)/i);
  if (youtubeMatch?.[1]) {
    return { type: "iframe", src: `https://www.youtube.com/embed/${youtubeMatch[1]}` };
  }

  const vimeoMatch = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch?.[1]) {
    return { type: "iframe", src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(raw)) {
    return { type: "video", src: raw };
  }

  return { type: "link", src: raw };
}

function normalizeBlocks(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((b) => b?.block_type && b?.is_active !== false);
}

function getFormSlug(form) {
  return form?.slug || form?.form_slug || "";
}

function isNotFoundError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.status === 404 ||
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("no existe")
  );
}

function normalizeLandingPayload(payload, fallbackForm = null) {
  const landing = payload?.landing || {};
  const seo = landing?.seo || {};
  return {
    landing: {
      ...DEFAULT_LANDING,
      ...landing,
      benefits: normalizeList(landing?.benefits, DEFAULT_BENEFITS),
      trust_points: normalizeList(landing?.trust_points, []),
      seo: {
        ...DEFAULT_LANDING.seo,
        ...seo,
      },
    },
    form: payload?.form || fallbackForm,
    assets: normalizeAssets(payload?.assets),
    blocks: normalizeBlocks(payload?.blocks),
  };
}

function LogoStrip({ assets }) {
  if (!assets.length) return null;

  return (
    <div className="mt-8 rounded-[1.75rem] border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
        Logos / clientes
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {assets.map((asset) => {
          const previewFit = ["client_logo", "brand_mark"].includes(asset.asset_type) ? "object-contain" : "object-cover";
          const content = (
            <div className="flex min-h-[90px] items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white">
                <img
                  src={asset.image_url}
                  alt={asset.alt_text || asset.company_name || asset.title || "Asset landing"}
                  className={`h-full w-full ${previewFit}`}
                  loading="lazy"
                />
              </div>
              <div>
                <div className="text-sm font-semibold text-neutral-950">
                  {asset.company_name || asset.title || "Cliente"}
                </div>
                {asset.title && asset.company_name ? (
                  <div className="mt-1 text-xs text-neutral-500">{asset.title}</div>
                ) : null}
              </div>
            </div>
          );

          if (asset.website_url) {
            return (
              <a
                key={asset.id || asset.image_url}
                href={asset.website_url}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                {content}
              </a>
            );
          }

          return (
            <div key={asset.id || asset.image_url}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LandingMediaBlock({ landing }) {
  const mediaKind = landing?.hero_media_kind || "none";
  const mediaUrl = landing?.hero_media_url || "";
  if (mediaKind === "none" || !mediaUrl) return null;

  if (mediaKind === "image") {
    return (
      <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-neutral-200 bg-white shadow-sm">
        <img
          src={mediaUrl}
          alt={landing?.hero_media_alt || landing?.hero_title || "Imagen principal de la landing"}
          className="h-full max-h-[420px] w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  const video = getVideoEmbedConfig(mediaUrl);
  if (!video) return null;

  return (
    <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-neutral-200 bg-white shadow-sm">
      {video.type === "iframe" ? (
        <div className="aspect-video">
          <iframe
            src={video.src}
            title={landing?.hero_media_alt || landing?.hero_title || "Video principal de la landing"}
            className="h-full w-full"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : video.type === "video" ? (
        <video
          src={video.src}
          className="h-full max-h-[420px] w-full bg-black object-cover"
          controls
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Video principal</div>
          <a href={video.src} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-medium text-neutral-950 underline underline-offset-4">
            Abrir video
          </a>
        </div>
      )}
    </div>
  );
}

export default function BusinessIntakeLanding() {
  const { slug: routeSlug } = useParams();
  const landingSlug = String(routeSlug || "conoce-tu-negocio").trim() || "conoce-tu-negocio";
  const usesDynamicRoute = Boolean(routeSlug);
  const canonicalPath = usesDynamicRoute ? `/landing/${landingSlug}` : "/conoce-tu-negocio";
  const [pageData, setPageData] = useState(() => normalizeLandingPayload(null, null));
  const [formConfigsBySlug, setFormConfigsBySlug] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [pendingFormSlugs, setPendingFormSlugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      setNotFound(false);
      let landingError = null;

      try {
        const landingPayload = await getPublicFormLanding(landingSlug);
        if (!cancelled) {
          setPageData(normalizeLandingPayload(landingPayload));
        }
        return;
      } catch (err) {
        landingError = err;
        if (usesDynamicRoute && isNotFoundError(err)) {
          if (!cancelled) {
            setError(err?.message || "Esta landing no existe o no está publicada todavía.");
            setNotFound(true);
          }
          return;
        }
      }

      const canFallbackToForm = !usesDynamicRoute || landingSlug === "conoce-tu-negocio";

      if (!canFallbackToForm) {
        if (!cancelled) {
          setError(landingError?.message || "No se pudo cargar esta landing. Intenta nuevamente.");
        }
        return;
      }

      try {
        const fallbackForm = await getPublicForm("conoce-tu-negocio");
        if (!cancelled) {
          setPageData(normalizeLandingPayload(null, fallbackForm));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "No se pudo cargar el formulario. Intenta nuevamente.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [landingSlug, usesDynamicRoute]);

  const landing = pageData?.landing || DEFAULT_LANDING;
  const formConfig = pageData?.form || null;
  const assets = pageData?.assets || [];
  const blocks = pageData?.blocks || [];
  const primaryFormSlug = landing?.form_slug || getFormSlug(formConfig) || "conoce-tu-negocio";
  const hasBlocks = blocks.length > 0;
  const hasFormBlock = blocks.some((block) => block.block_type === "form" && block.is_active !== false);
  const benefits = normalizeList(landing?.benefits, DEFAULT_BENEFITS);
  const trustPoints = normalizeList(landing?.trust_points, []);

  useEffect(() => {
    const slug = primaryFormSlug;
    if (!slug || !formConfig) return;
    setFormConfigsBySlug((current) => ({ ...current, [slug]: formConfig }));
    setFormErrors((current) => {
      if (!current[slug]) return current;
      const next = { ...current };
      delete next[slug];
      return next;
    });
  }, [formConfig, primaryFormSlug]);

  const activeFormSlugs = useMemo(
    () =>
      Array.from(
        new Set(
          blocks
            .filter((block) => block?.block_type === "form" && block?.is_active !== false)
            .map((block) => block?.settings?.form_slug || primaryFormSlug)
            .filter(Boolean),
        ),
      ),
    [blocks, primaryFormSlug],
  );

  const missingFormSlugs = useMemo(
    () => activeFormSlugs.filter((slug) => !formConfigsBySlug[slug] && !formErrors[slug]),
    [activeFormSlugs, formConfigsBySlug, formErrors],
  );

  useEffect(() => {
    if (!missingFormSlugs.length) return undefined;
    let cancelled = false;

    setPendingFormSlugs((current) => Array.from(new Set([...current, ...missingFormSlugs])));

    Promise.allSettled(
      missingFormSlugs.map(async (slug) => ({
        slug,
        form: await getPublicForm(slug),
      })),
    )
      .then((results) => {
        if (cancelled) return;

        const loaded = {};
        const nextErrors = {};

        results.forEach((result, index) => {
          const slug = missingFormSlugs[index];
          if (result.status === "fulfilled") {
            loaded[slug] = result.value.form;
          } else {
            nextErrors[slug] = result.reason?.message || `No se pudo cargar el formulario ${slug}.`;
          }
        });

        if (Object.keys(loaded).length) {
          setFormConfigsBySlug((current) => ({ ...current, ...loaded }));
        }
        if (Object.keys(nextErrors).length) {
          setFormErrors((current) => ({ ...current, ...nextErrors }));
        }
      })
      .finally(() => {
        if (cancelled) return;
        setPendingFormSlugs((current) => current.filter((slug) => !missingFormSlugs.includes(slug)));
      });

    return () => {
      cancelled = true;
    };
  }, [missingFormSlugs]);

  const seo = useMemo(
    () => ({
      title: landing?.seo?.seo_title || DEFAULT_LANDING.seo.seo_title,
      description: landing?.seo?.seo_description || DEFAULT_LANDING.seo.seo_description,
      ogTitle: landing?.seo?.og_title || DEFAULT_LANDING.seo.og_title,
      ogDescription: landing?.seo?.og_description || DEFAULT_LANDING.seo.og_description,
    }),
    [landing],
  );

  if (notFound) {
    return (
      <main className="bg-white px-4 py-20 text-neutral-950 md:px-6">
        <SEOHead
          title="Landing no disponible | Ideas Estudio"
          description="La landing solicitada no existe o no está publicada."
          canonical={`https://www.ideasestudio.com${canonicalPath}`}
          ogTitle="Landing no disponible | Ideas Estudio"
          ogDescription="La landing solicitada no existe o no está publicada."
        />
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-neutral-200 bg-white p-8 shadow-sm md:p-12">
          <div className="inline-flex rounded-full border border-neutral-300 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-600">
            Ideas Estudio
          </div>
          <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-5xl">
            Esta landing no está disponible
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-700">
            La URL `/landing/{landingSlug}` no existe o todavía no está publicada. Verifica el slug o vuelve más tarde.
          </p>
          <div className="mt-8">
            <Button href="/">Volver al inicio</Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-slate-50 text-neutral-950">
      <SEOHead
        title={seo.title}
        description={seo.description}
        canonical={`https://www.ideasestudio.com${canonicalPath}`}
        ogTitle={seo.ogTitle}
        ogDescription={seo.ogDescription}
      />

      <section className="px-4 pb-16 pt-14 md:px-6 md:pb-24 md:pt-20">
        <div className="mx-auto max-w-5xl space-y-10">
          {hasBlocks ? (
            <>
              <PublicLandingBlocks
                blocks={blocks}
                assets={assets}
                formConfig={formConfig}
                formConfigMap={formConfigsBySlug}
                formErrors={formErrors}
                pendingFormSlugs={pendingFormSlugs}
                loading={loading}
                error={error}
                defaultFormSlug={primaryFormSlug}
              />

              {!hasFormBlock ? (
                <div className="mx-auto max-w-4xl">
                  {loading ? (
                    <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-sm">
                      Cargando formulario…
                    </div>
                  ) : (
                    <PublicBusinessIntakeForm
                      formConfig={formConfig}
                      slug={primaryFormSlug}
                      title={landing.hero_title || DEFAULT_LANDING.hero_title}
                      description={landing.hero_subtitle || landing.subtitle || DEFAULT_LANDING.hero_subtitle}
                      eyebrow={landing.hero_badge || landing.eyebrow || DEFAULT_LANDING.hero_badge}
                      loadError={error}
                    />
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="mx-auto max-w-4xl">
                {loading ? (
                  <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-sm">
                    Cargando formulario…
                  </div>
                ) : (
                  <PublicBusinessIntakeForm
                    formConfig={formConfig}
                    slug={primaryFormSlug}
                    title={landing.hero_title || DEFAULT_LANDING.hero_title}
                    description={landing.hero_subtitle || landing.subtitle || DEFAULT_LANDING.hero_subtitle}
                    eyebrow={landing.hero_badge || landing.eyebrow || DEFAULT_LANDING.hero_badge}
                    loadError={error}
                  />
                )}
              </div>

              <LandingMediaBlock landing={landing} />

              {benefits.length ? (
                <div className="space-y-5">
                  <div className="mx-auto max-w-2xl text-center">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      ¿Por qué completar este formulario?
                    </div>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#102a2a]">
                      Recibimos mejor el contexto de tu negocio
                    </h2>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {benefits.map((item, index) => (
                      <article
                        key={`${item}-${index}`}
                        className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-[#102a2a]">
                          {index + 1}
                        </div>
                        <p className="text-sm leading-6 text-slate-600">{item}</p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              {trustPoints.length ? (
                <div className="flex flex-wrap justify-center gap-3">
                  {trustPoints.map((item) => (
                    <div
                      key={item}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ) : null}

              <LogoStrip assets={assets} />
            </>
          )}
        </div>
      </section>
    </main>
  );
}
