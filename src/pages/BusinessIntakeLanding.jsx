import { useEffect, useMemo, useState } from "react";
import Button from "@/components/shared/Button.jsx";
import SEOHead from "@/components/seo/SEOHead.jsx";
import PublicBusinessIntakeForm from "@/components/forms/PublicBusinessIntakeForm.jsx";
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
          const content = (
            <div className="flex min-h-[90px] items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white">
                <img
                  src={asset.image_url}
                  alt={asset.alt_text || asset.company_name || asset.title || "Asset landing"}
                  className="h-full w-full object-cover"
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

export default function BusinessIntakeLanding() {
  const [pageData, setPageData] = useState(() => normalizeLandingPayload(null, null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const landingPayload = await getPublicFormLanding("conoce-tu-negocio");
        if (!cancelled) {
          setPageData(normalizeLandingPayload(landingPayload));
        }
        return;
      } catch {
        // fallback seguro al endpoint de formularios
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
  }, []);

  const landing = pageData?.landing || DEFAULT_LANDING;
  const formConfig = pageData?.form || null;
  const assets = pageData?.assets || [];
  const benefits = normalizeList(landing?.benefits, DEFAULT_BENEFITS);
  const trustPoints = normalizeList(landing?.trust_points, []);

  const seo = useMemo(
    () => ({
      title: landing?.seo?.seo_title || DEFAULT_LANDING.seo.seo_title,
      description: landing?.seo?.seo_description || DEFAULT_LANDING.seo.seo_description,
      ogTitle: landing?.seo?.og_title || DEFAULT_LANDING.seo.og_title,
      ogDescription: landing?.seo?.og_description || DEFAULT_LANDING.seo.og_description,
    }),
    [landing],
  );

  return (
    <main className="bg-[linear-gradient(180deg,#fffdf8_0%,#fff6d8_32%,#ffffff_100%)] text-neutral-950">
      <SEOHead
        title={seo.title}
        description={seo.description}
        canonical="https://www.ideasestudio.com/conoce-tu-negocio"
        ogTitle={seo.ogTitle}
        ogDescription={seo.ogDescription}
      />

      <section className="px-4 pb-16 pt-16 md:px-6 md:pb-24 md:pt-24">
        <div className="mx-auto grid max-w-[1220px] gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
          <div>
            <div className="inline-flex rounded-full border border-neutral-300 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-600">
              {landing.hero_badge || landing.eyebrow || DEFAULT_LANDING.hero_badge}
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-6xl">
              {landing.hero_title || DEFAULT_LANDING.hero_title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-700 md:text-lg">
              {landing.hero_subtitle || landing.subtitle || DEFAULT_LANDING.hero_subtitle}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="#business-intake-form">
                {landing.primary_cta_label || DEFAULT_LANDING.primary_cta_label}
              </Button>
              {landing.secondary_cta_label && landing.secondary_cta_url ? (
                <Button href={landing.secondary_cta_url} variant="secondary">
                  {landing.secondary_cta_label}
                </Button>
              ) : (
                <Button href={DEFAULT_LANDING.secondary_cta_url} variant="secondary">
                  {DEFAULT_LANDING.secondary_cta_label}
                </Button>
              )}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {benefits.map((item, index) => (
                <article
                  key={`${item}-${index}`}
                  className="rounded-[1.75rem] border border-neutral-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-neutral-950">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-neutral-700">{item}</p>
                </article>
              ))}
            </div>

            {trustPoints.length ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {trustPoints.map((item) => (
                  <div
                    key={item}
                    className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 shadow-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>
            ) : null}

            <LogoStrip assets={assets} />
          </div>

          <div
            id="business-intake-form"
            className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-[0_25px_80px_rgba(0,0,0,0.08)] md:p-8"
          >
            <div className="mb-6 rounded-[1.75rem] border border-neutral-200 bg-neutral-950 px-5 py-5 text-white">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                Diagnóstico inicial
              </div>
              <h2 className="mt-3 text-2xl font-semibold">
                {landing.title || "Cuéntanos sobre tu negocio"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-300">
                {landing.description ||
                  "La información entra al CRM con respuestas estructuradas, score, lead asociado y contacto asociado."}
              </p>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-neutral-200 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
                Cargando formulario…
              </div>
            ) : error ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
                {error || "No se pudo cargar el formulario. Intenta nuevamente."}
              </div>
            ) : (
              <PublicBusinessIntakeForm formConfig={formConfig} slug="conoce-tu-negocio" />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
