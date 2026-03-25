import SectionTitle from "@/components/shared/SectionTitle.jsx";
import Button from "@/components/shared/Button.jsx";
import ServicesGrid from "@/components/shared/ServicesGrid.jsx";

export default function ServicesOverview({
  services = [],
  eyebrow = "Servicios",
  title = "Catalogo listo para ecommerce, propuestas o reservas",
  subtitle = "La home ya consume servicios reales del CRM y mantiene inferencias temporales solo donde el backend aun no expone campos publicos completos.",
  className = "",
  id,
}) {
  const sectionClasses = ["section", className].filter(Boolean).join(" ");

  return (
    <section id={id} className={sectionClasses}>
      <div className="container">
        <SectionTitle
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
        />

        {services.length ? (
          <ServicesGrid services={services} showPrimaryAction={false} />
        ) : null}

        <div className="services-overview__actions">
          <Button to="/servicios">Ver catalogo completo</Button>
        </div>
      </div>
    </section>
  );
}
