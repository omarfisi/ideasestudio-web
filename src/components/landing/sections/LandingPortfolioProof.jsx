import { Link } from "react-router-dom";

export default function LandingPortfolioProof() {
  return (
    <section className="px-6 py-10 md:px-10 md:py-16">
      <div className="mx-auto max-w-7xl rounded-[2rem] bg-black p-8 text-white md:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
          Prueba visual
        </p>
        <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
          La mejor forma de entender nuestro trabajo es verlo.
        </h2>
        <p className="mt-4 max-w-2xl text-white/70">
          Desde marcas y contenido comercial hasta sesiones y eventos, el portafolio
          valida la calidad visual de Ideas Estudio.
        </p>

        <div className="mt-8">
          <Link
            to="/portafolio"
            className="inline-flex items-center rounded-full bg-[#f1d146] px-6 py-3 text-sm font-semibold text-black"
          >
            Ir al portafolio
          </Link>
        </div>
      </div>
    </section>
  );
}
