export default function LandingServicesPreview() {
  const services = [
    "Fotografía",
    "Video",
    "Diseño gráfico",
    "Branding",
    "Redes sociales",
    "Páginas web",
    "E-commerce",
    "Contenido visual",
  ];

  return (
    <section className="px-6 py-10 md:px-10 md:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black/50">
            Servicios
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-black md:text-4xl">
            Soluciones que se adaptan a distintos tipos de cliente
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <div
              key={service}
              className="rounded-3xl border border-black/10 bg-white p-5 text-base font-medium text-black shadow-sm"
            >
              {service}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
