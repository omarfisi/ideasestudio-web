import ServiceCard from "@/components/shared/ServiceCard.jsx";

export default function ServicesGrid({
  services = [],
  className = "",
  showPrimaryAction = true,
  showViewAction = true,
  clientType = null,
}) {
  const classes = ["service-grid", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {services.map((service) => (
        <ServiceCard
          key={service.id || service.slug}
          service={service}
          showPrimaryAction={showPrimaryAction}
          showViewAction={showViewAction}
          clientType={clientType}
        />
      ))}
    </div>
  );
}
