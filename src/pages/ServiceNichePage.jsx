import { useLoaderData, useLocation } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import ServiceNicheTemplate from "@/components/services/ServiceNicheTemplate.jsx";
import SEOHead from "@/components/seo/SEOHead.jsx";

export default function ServiceNichePage() {
  const { niche, segment, services } = useLoaderData();
  const { pathname } = useLocation();

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

  return (
    <>
      <SEOHead
        title={`${niche.title} | Ideas Estudio`}
        description={niche.description || niche.hero?.description || undefined}
        canonical={`https://ideasestudio.com${pathname}`}
      />
      <ServiceNicheTemplate niche={niche} segment={segment} apiServices={services} />
    </>
  );
}
