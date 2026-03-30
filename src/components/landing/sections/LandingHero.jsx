import { Link } from "react-router-dom";

export default function LandingHero() {
  return (
    <section className="px-6 py-16 md:px-10 md:py-24">
      <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-black/5 md:p-14">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full bg-black px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
            Ideas Estudio
          </span>

          <h1 className="mt-6 text-4xl font-semibold leading-tight text-black md:text-6xl">
            Convertimos ideas en experiencias visuales que conectan.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-black/70 md:text-lg">
            Diseño, fotografía, video y soluciones creativas para marcas, negocios,
            empresas y momentos especiales.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/contacto?mode=proposal"
              className="inline-flex items-center rounded-full bg-[#f1d146] px-6 py-3 text-sm font-semibold text-black"
            >
              Solicitar propuesta
            </Link>

            <Link
              to="/portafolio"
              className="inline-flex items-center rounded-full border border-black/10 px-6 py-3 text-sm font-semibold text-black"
            >
              Ver portafolio
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
