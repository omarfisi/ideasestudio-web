import SectionTitle from "@/components/shared/SectionTitle.jsx";
import ServiceCard from "@/components/shared/ServiceCard.jsx";

export default function ServicesOverview({ services }) {
  return (
    <section className="section">
      <div className="container">
        <SectionTitle
          eyebrow="Servicios"
          title="Catalogo listo para ecommerce, propuestas o reservas"
          subtitle="La home ya consume servicios reales del CRM y mantiene inferencias temporales solo donde el backend aun no expone campos publicos completos."
        />

        <div className="service-grid">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              showPrimaryAction={false}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
