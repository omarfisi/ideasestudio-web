import { valueProps } from "@/data/landing/valueProps.js";

export default function LandingWhyUs() {
  return (
    <section className="px-6 py-10 md:px-10 md:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black/50">
            Por qué Ideas Estudio
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-black md:text-4xl">
            Creatividad con intención, no solo con estilo
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {valueProps.map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm"
            >
              <h3 className="text-xl font-semibold text-black">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-black/70">{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
