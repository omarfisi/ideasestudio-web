import { useEffect, useState } from "react";
import Button from "@/components/shared/Button.jsx";
import SEOHead from "@/components/seo/SEOHead.jsx";
import PublicBusinessIntakeForm from "@/components/forms/PublicBusinessIntakeForm.jsx";
import { getPublicForm } from "@/lib/publicFormsApi.js";

const BENEFITS = [
  {
    title: "Entendemos mejor tu negocio",
    text: "Nos das contexto real sobre tu etapa, oferta, presencia digital y prioridades.",
  },
  {
    title: "Identificamos tus necesidades principales",
    text: "Vemos con más claridad dónde hace falta diseño, web, branding, contenido o automatización.",
  },
  {
    title: "Te recomendamos servicios adecuados",
    text: "La información llega organizada para sugerirte la combinación más útil.",
  },
  {
    title: "Organizamos tu información dentro del CRM",
    text: "Tu respuesta crea submission, contacto, lead, score y segmento asociado.",
  },
  {
    title: "Podemos darte seguimiento de forma más efectiva",
    text: "Llegamos a la conversación con contexto suficiente para avanzar más rápido.",
  },
];

export default function BusinessIntakeLanding() {
  const [formConfig, setFormConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    getPublicForm("conoce-tu-negocio")
      .then((data) => {
        if (!cancelled) setFormConfig(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || "No se pudo cargar el formulario. Intenta nuevamente.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="bg-[linear-gradient(180deg,#fffdf8_0%,#fff6d8_32%,#ffffff_100%)] text-neutral-950">
      <SEOHead
        title="Conoce tu negocio | Ideas Estudio"
        description="Completa el formulario de Ideas Estudio para ayudarnos a conocer tu negocio, tus metas y tus necesidades de marketing, diseño, fotografía, video y web."
        canonical="https://www.ideasestudio.com/conoce-tu-negocio"
        ogTitle="Conoce tu negocio | Ideas Estudio"
        ogDescription="Cuéntanos sobre tu negocio y descubre cómo Ideas Estudio puede ayudarte a crecer."
      />

      <section className="px-4 pb-14 pt-16 md:px-6 md:pb-20 md:pt-24">
        <div className="mx-auto grid max-w-[1220px] gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex rounded-full border border-neutral-300 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-600">
              Ideas Estudio
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-6xl">
              Conozcamos tu <span className="text-amber-500">negocio</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-700 md:text-lg">
              Completa este formulario para entender mejor tu negocio, tus metas, tus retos y las áreas donde Ideas Estudio puede ayudarte a crecer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="#business-intake-form">Completar formulario</Button>
              <Button href="/contacto" variant="secondary">Hablar directamente</Button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-neutral-200 bg-neutral-950 p-8 text-white shadow-[0_30px_90px_rgba(0,0,0,0.18)]">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Diagnóstico inicial</div>
            <h2 className="mt-4 text-2xl font-semibold">Un formulario pensado para proyectos reales</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                "Segmento de cliente",
                "Necesidades prioritarias",
                "Presencia digital actual",
                "Presupuesto y urgencia",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-neutral-100">
                  {item}
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm leading-6 text-neutral-300">
              La información llega al CRM con score, lead asociado, contacto asociado y respuestas estructuradas para seguimiento comercial.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 md:px-6 md:pb-20">
        <div className="mx-auto max-w-[1220px]">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              ¿Por qué completar este formulario?
            </div>
            <h2 className="mt-3 text-3xl font-semibold text-neutral-950 md:text-4xl">
              Lo usamos para entender contexto, ordenar información y responder mejor.
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {BENEFITS.map((item) => (
              <article key={item.title} className="rounded-[1.75rem] border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-neutral-950">
                  {item.title.slice(0, 1)}
                </div>
                <h3 className="text-lg font-semibold text-neutral-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-neutral-600">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="business-intake-form" className="px-4 pb-16 md:px-6 md:pb-24">
        <div className="mx-auto grid max-w-[1220px] gap-8 lg:grid-cols-[0.38fr_0.62fr]">
          <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Formulario</div>
            <h2 className="mt-3 text-3xl font-semibold text-neutral-950">Cuéntanos sobre tu negocio</h2>
            <p className="mt-4 text-sm leading-6 text-neutral-600">
              Completa las secciones de información personal, negocio, presencia digital, necesidades, presupuesto y consentimiento.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-neutral-700">
              <li>• Información personal</li>
              <li>• Información del negocio</li>
              <li>• Presencia digital</li>
              <li>• Necesidades y objetivos</li>
              <li>• Presupuesto y urgencia</li>
              <li>• Consentimiento</li>
            </ul>
          </div>

          <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-[0_25px_80px_rgba(0,0,0,0.08)] md:p-8">
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

      <section className="px-4 pb-20 md:px-6">
        <div className="mx-auto max-w-[1220px] rounded-[2rem] border border-neutral-200 bg-neutral-950 px-6 py-8 text-white shadow-[0_30px_90px_rgba(0,0,0,0.18)] md:px-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                CTA secundario
              </div>
              <h2 className="mt-3 text-3xl font-semibold">¿Prefieres hablar directamente con nosotros?</h2>
            </div>
            <Button href="/contacto">Contactar a Ideas Estudio</Button>
          </div>
        </div>
      </section>
    </main>
  );
}
