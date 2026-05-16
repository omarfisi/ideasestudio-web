import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const SEGMENT_ITEMS = [
  {
    id: "impulso-inicial",
    badge: "01. Impulso inicial",
    title: "Impulso inicial",
    description:
      "Para marcas o negocios que necesitan comenzar con una base visual clara, profesional y lista para vender mejor.",
    image:
      "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/cfdd0b5a-3468-4d5a-86da-50e1f4f324a6/Diseno%20de%20Marca%20Personal.png",
    imagePosition: "object-top",
    heroTitle: "Arranca con una identidad visual lista para vender",
    heroHighlight: "identidad",
    href: "/servicios/marca-o-negocio",
    ctaLabel: "Ver opción",
  },
  {
    id: "presencia-profesional",
    badge: "02. Presencia profesional",
    title: "Presencia profesional",
    heroTitle: "Fortalece la imagen y el valor que proyectas",
    heroHighlight: "valor",
    description:
      "Para negocios y profesionales que quieren fortalecer su imagen, su contenido y la percepción de valor en web, redes y materiales comerciales.",
    image:
      "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/covers/2026/04/1776851142698-sesion-de-fotografia-de-estudio-para-isaac-esquilin.webp",
    imagePosition: "object-top",
    href: "/servicios/presencia-visual-profesional",
    ctaLabel: "Ver opción",
  },
  {
    id: "momento-especial",
    badge: "03. Momento especial",
    title: "Momento especial",
    heroTitle: "Captura cada momento con calidad y cuidado",
    heroHighlight: "momento",
    description:
      "Para sesiones o eventos sociales que merecen una propuesta visual cuidada, con intención, calidad y una experiencia organizada.",
    image:
      "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/covers/2026/04/Collage.png",
    href: "/servicios/momento-especial",
    ctaLabel: "Ver opción",
  },
  {
    id: "solucion-a-medida",
    badge: "04. Solución a medida",
    title: "Solución a medida",
    heroTitle: "Un proyecto único, una propuesta a tu medida",
    heroHighlight: "único,",
    description:
      "Para proyectos híbridos que combinan fotografía, video, branding, web o marketing y necesitan una estrategia personalizada.",
    image:
      "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/portfolio/covers/2026/04/Impulso%20inicial.png",
    href: "/servicios/solucion-creativa",
    ctaLabel: "Solicitar propuesta",
  },
];

function HighlightedTitle({ title, highlight }) {
  if (!highlight) return title;
  const idx = title.indexOf(highlight);
  if (idx === -1) return title;
  return (
    <>
      {title.slice(0, idx)}
      <span className="highlight-box-glow">{highlight}</span>
      {title.slice(idx + highlight.length)}
    </>
  );
}

export default function SegmentHeroSection() {
  const [activeId, setActiveId] = useState(SEGMENT_ITEMS[0].id);

  const activeSegment = useMemo(
    () => SEGMENT_ITEMS.find((item) => item.id === activeId) || SEGMENT_ITEMS[0],
    [activeId]
  );

  return (
    <section id="caminos" className="section-split">
      <div className="mx-auto max-w-[1220px] space-y-8 px-4 md:px-6">
        <h2
          className="font-semibold tracking-[-0.05em] leading-none text-slate-900"
          style={{ fontSize: "clamp(2rem, 3vw, 3.8rem)" }}
        >
          Descubre la propuesta adecuada para{" "}
          <span className="highlight-box-glow">tu marca,</span>{" "}
          negocio o evento social.
        </h2>
        <p className="mt-4 text-base leading-7 text-slate-500 md:text-lg">
          Elige el camino que mejor describe lo que necesitas y descubre cómo podemos ayudarte a construir una presencia visual que comunique, conecte y convierta.
        </p>
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1fr_1.05fr]">
            <div className="p-8 md:p-10 lg:p-12 xl:pr-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Servicios para marcas y negocios
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-[1.06] text-slate-900 md:text-5xl">
                <HighlightedTitle title={activeSegment.heroTitle} highlight={activeSegment.heroHighlight} />
              </h2>
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 border-l-4 border-l-yellow-400">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {activeSegment.badge}
                </p>
                <h3 className="mt-2 text-xl font-semibold leading-tight text-slate-900 md:text-2xl">
                  {activeSegment.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 md:text-base">
                  {activeSegment.description}
                </p>
                <Link
                  to={activeSegment.href}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  {activeSegment.ctaLabel} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            <div className="hidden lg:block lg:relative lg:min-h-full">
              <img
                src={activeSegment.image}
                alt={activeSegment.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-transparent" />
            </div>
          </div>
        </div>

        <div className="hidden lg:grid lg:gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {SEGMENT_ITEMS.map((item) => {
            const isActive = item.id === activeId;
            return (
              <article
                key={item.id}
                className={`flex flex-col overflow-hidden rounded-2xl border bg-white transition ${
                  isActive
                    ? "border-slate-900 shadow-[0_14px_34px_rgba(15,23,42,0.16)]"
                    : "border-slate-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.12)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className="block w-full text-left"
                  aria-label={`Seleccionar ${item.title}`}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className={`h-40 w-full object-cover ${item.imagePosition ?? ""}`}
                    loading="lazy"
                  />
                  <div className="space-y-2 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {item.badge}
                    </p>
                    <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                    <p className="text-sm leading-6 text-slate-600">{item.description}</p>
                  </div>
                </button>
                <div className="mt-auto border-t border-slate-200 p-4">
                  <Link
                    to={item.href}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    {item.ctaLabel} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
