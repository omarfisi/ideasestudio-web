import SectionTitle from "@/components/shared/SectionTitle.jsx";

const steps = [
  {
    id: "01",
    title: "Home y rutas",
    text: "La web organiza a cada visitante por perfil antes de llevarlo al catalogo.",
  },
  {
    id: "02",
    title: "Catalogo real",
    text: "Servicios consumidos desde el CRM con normalizacion para la web publica.",
  },
  {
    id: "03",
    title: "CTA segun venta",
    text: "Cada servicio define si debe comprarse, cotizarse o reservarse.",
  },
  {
    id: "04",
    title: "Campos faltantes",
    text: "La UI se mantiene estable mientras el backend completa featured, gallery, client types y sale type reales.",
  },
];

export default function ProcessSection() {
  return (
    <section className="section section-dark">
      <div className="container">
        <SectionTitle
          eyebrow="Como trabajamos"
          title="Una capa publica elegante por fuera y un motor comercial por dentro"
          subtitle="La fundacion del frontend queda desacoplada para que el CRM entre despues como proveedor de datos y flujos."
        />

        <div className="process-grid">
          {steps.map((step) => (
            <article key={step.id} className="process-card">
              <span>{step.id}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
