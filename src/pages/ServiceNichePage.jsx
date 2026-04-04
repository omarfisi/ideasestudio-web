import { useLoaderData } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import ServiceNicheTemplate from "@/components/services/ServiceNicheTemplate.jsx";

export default function ServiceNichePage() {
  const { niche } = useLoaderData();

  if (!niche) {
    return (
      <section className="section">
        <div className="container">
          <div className="empty-state">
            <h1>Nicho no encontrado</h1>
            <p>No encontramos la página especializada que intentas abrir.</p>
            <div className="empty-state__actions">
              <Button to="/servicios">Volver a servicios</Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return <ServiceNicheTemplate niche={niche} />;
}
