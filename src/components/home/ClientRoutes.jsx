import SectionTitle from "@/components/shared/SectionTitle.jsx";
import RouteCard from "@/components/shared/RouteCard.jsx";
import { clientRoutes } from "@/data/routes.js";

export default function ClientRoutes() {
  return (
    <section className="section section-sand">
      <div className="container">
        <SectionTitle
          eyebrow="Rutas principales"
          title="Cuatro caminos claros para orientar al visitante"
          subtitle="En vez de mezclar todos los servicios desde el primer scroll, la home distribuye la experiencia por perfil de cliente."
        />

        <div className="route-card-grid">
          {clientRoutes.map((route, index) => (
            <RouteCard key={route.key} route={route} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
