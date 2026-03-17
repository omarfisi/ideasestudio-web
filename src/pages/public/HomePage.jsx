import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Clapperboard,
  Globe,
  Megaphone,
  Palette,
  ShoppingBag,
} from "lucide-react";
import { APP_CRM_URL } from "@/lib/constants.js";

const services = [
  {
    title: "Fotografia profesional",
    description:
      "Sesiones y coberturas visuales para marcas, productos, eventos y proyectos que necesitan imagen cuidada.",
    icon: Camera,
    href: "/servicios",
  },
  {
    title: "Produccion de video",
    description:
      "Videos promocionales, contenido para redes y piezas audiovisuales para presentar tu negocio con impacto.",
    icon: Clapperboard,
    href: "/servicios",
  },
  {
    title: "Diseno grafico",
    description:
      "Piezas visuales, identidad grafica y materiales promocionales alineados con la esencia de tu marca.",
    icon: Palette,
    href: "/servicios",
  },
  {
    title: "Diseno web",
    description:
      "Paginas para marcas y negocios que necesitan una presencia clara, moderna y funcional.",
    icon: Globe,
    href: "/servicios",
  },
  {
    title: "Marketing digital",
    description:
      "Estrategia, posicionamiento y contenido orientado a resultados para crecer de forma consistente.",
    icon: Megaphone,
    href: "/servicios",
  },
  {
    title: "Soluciones ecommerce",
    description:
      "Contenido y activos para catalogos y tiendas que buscan vender mejor con una experiencia coherente.",
    icon: ShoppingBag,
    href: "/servicios",
  },
];

const process = [
  {
    title: "Diagnostico",
    description: "Entendemos tu negocio, tus objetivos y tus oportunidades reales.",
  },
  {
    title: "Produccion",
    description: "Ejecutamos creativo, contenido y piezas clave con proceso claro.",
  },
  {
    title: "Activacion",
    description: "Publicamos, medimos y optimizamos para sostener resultados.",
  },
];

export default function HomePage() {
  return (
      <main>
        <section className="border-b border-zinc-200 bg-gradient-to-b from-zinc-50 to-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28 lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Ideas Estudio
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-6xl">
                Creatividad, estrategia y ejecucion para marcas que quieren crecer.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-zinc-600">
                Construimos imagen, contenido y presencia digital con foco en negocio.
                Desde la idea hasta la activacion.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  to="/servicios"
                  className="inline-flex items-center justify-center rounded-2xl bg-zinc-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Ver servicios
                </Link>
                <Link
                  to="/contacto"
                  className="inline-flex items-center justify-center rounded-2xl border border-zinc-300 bg-white px-6 py-3.5 text-sm font-semibold text-zinc-900 transition hover:border-zinc-900"
                >
                  Solicitar informacion
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-950">Propuesta de valor</h2>
              <div className="mt-5 space-y-4">
                {[
                  "Direccion visual y contenido con enfoque comercial.",
                  "Produccion de piezas listas para uso real.",
                  "Operacion centralizada desde el CRM.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                    <p className="text-sm leading-7 text-zinc-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Servicios</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
              Soluciones creativas y digitales en un solo equipo
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <Link
                  key={service.title}
                  to={service.href}
                  className="group rounded-2xl border border-zinc-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-zinc-950"
                >
                  <div className="inline-flex rounded-xl bg-zinc-100 p-2.5">
                    <Icon className="h-5 w-5 text-zinc-700" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-zinc-950">{service.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-zinc-600">{service.description}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
                    Ver detalle
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="border-y border-zinc-200 bg-zinc-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Metodo</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">Como trabajamos</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {process.map((item, i) => (
                <article key={item.title} className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Paso {i + 1}</p>
                  <h3 className="mt-2 text-lg font-semibold text-zinc-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-zinc-600">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-zinc-200 bg-zinc-950 p-8 text-white sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">App CRM</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Gestiona clientes, pipeline, contenido y operaciones desde un mismo lugar.
            </h2>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={APP_CRM_URL}
                className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
              >
                Entrar al CRM
              </a>
              <Link
                to="/contacto"
                className="inline-flex items-center justify-center rounded-2xl border border-zinc-700 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-zinc-500"
              >
                Hablar con nosotros
              </Link>
            </div>
          </div>
        </section>
      </main>
  );
}
