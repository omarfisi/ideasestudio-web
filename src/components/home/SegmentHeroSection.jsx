import { useMemo, useState } from "react";

const SEGMENT_ITEMS = [
  {
    id: "impulso-inicial",
    badge: "01. Impulso inicial",
    title: "Impulso inicial",
    description:
      "Para marcas o negocios que necesitan comenzar con una base visual clara, profesional y lista para vender mejor.",
    image:
      "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/public-web/marca-negocio.webp",
    href: "/servicios",
    ctaLabel: "Ver opción",
  },
  {
    id: "presencia-profesional",
    badge: "02. Presencia profesional",
    title: "Presencia profesional",
    description:
      "Para negocios que quieren fortalecer su imagen, su contenido y la percepción de valor en web, redes y materiales comerciales.",
    image:
      "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/public-web/presencia-visual.webp",
    href: "/servicios",
    ctaLabel: "Ver opción",
  },
  {
    id: "momento-especial",
    badge: "03. Momento especial",
    title: "Momento especial",
    description:
      "Para sesiones o eventos sociales que merecen una propuesta visual cuidada, con intención, calidad y una experiencia organizada.",
    image:
      "https://aijczfwbnmumcvygqxkv.supabase.co/storage/v1/object/public/public-web/solucion-social.webp",
    href: "/servicios",
    ctaLabel: "Ver opción",
  },
  {
    id: "solucion-a-medida",
    badge: "04. Solución a medida",
    title: "Solución a medida",
    description:
      "Para proyectos híbridos que combinan fotografía, video, branding, web o marketing y necesitan una estrategia personalizada.",
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=80",
    href: "/contacto?mode=proposal&cta=segmentos-home",
    ctaLabel: "Solicitar propuesta",
  },
];

export default function SegmentHeroSection() {
  const [activeId, setActiveId] = useState(SEGMENT_ITEMS[0].id);

  const activeSegment = useMemo(
    () => SEGMENT_ITEMS.find((item) => item.id === activeId) || SEGMENT_ITEMS[0],
    [activeId]
  );

  return (
    <section id="caminos" className="section-split px-4 md:px-6">
      <div className="mx-auto max-w-[1220px] space-y-8">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1fr_1.05fr]">
            <div className="p-8 md:p-10 lg:p-12 xl:pr-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Servicios para marcas y negocios
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-[1.06] text-slate-900 md:text-5xl">
                Descubre la propuesta adecuada para{" "}
                <span className="highlight-box-glow">tu marca,</span> negocio o evento social.
              </h2>
              <h3 className="mt-4 text-2xl font-semibold leading-tight text-slate-900 md:text-3xl">
                {activeSegment.title}
              </h3>
              <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">
                {activeSegment.description}
              </p>

            </div>

            <div className="relative min-h-[320px] lg:min-h-full">
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SEGMENT_ITEMS.map((item) => {
            const isActive = item.id === activeId;
            return (
              <article
                key={item.id}
                className={`overflow-hidden rounded-2xl border bg-white transition ${
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
                    className="h-40 w-full object-cover"
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
                <div className="border-t border-slate-200 p-4">
                  <a
                    href={item.href}
                    className="inline-flex items-center text-sm font-semibold text-slate-900 hover:text-slate-600"
                  >
                    {item.ctaLabel} <span aria-hidden="true" className="ml-1">→</span>
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
