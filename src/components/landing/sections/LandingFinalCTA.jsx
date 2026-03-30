import { Link } from "react-router-dom";

export default function LandingFinalCTA() {
  return (
    <section className="px-6 py-14 md:px-10 md:py-20">
      <div className="mx-auto max-w-6xl rounded-[2rem] bg-[#f1d146] p-8 md:p-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black/60">
            Siguiente paso
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-black md:text-5xl">
            Cuéntanos qué necesitas y te guiamos al servicio correcto.
          </h2>
          <p className="mt-4 text-base leading-7 text-black/75">
            Si todavía no sabes exactamente qué solución te conviene, podemos ayudarte
            a identificarla.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/contacto?mode=proposal"
              className="inline-flex items-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
            >
              Solicitar propuesta
            </Link>
            <Link
              to="/servicios"
              className="inline-flex items-center rounded-full border border-black/15 px-6 py-3 text-sm font-semibold text-black"
            >
              Ver servicios
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
