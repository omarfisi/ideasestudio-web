import { useLoaderData } from "react-router-dom";
import Button from "@/components/shared/Button.jsx";
import CTASection from "@/components/shared/CTASection.jsx";
import PageHero from "@/components/shared/PageHero.jsx";
import SectionTitle from "@/components/shared/SectionTitle.jsx";
import ServiceCard from "@/components/shared/ServiceCard.jsx";

export default function ClientTypePage() {
  const { route, services } = useLoaderData();

  if (!route) {
    return (
      <section className="section">
        <div className="container">
          <div className="empty-state">
            <h1>Ruta no encontrada</h1>
            <p>No encontramos la experiencia solicitada.</p>
            <Button to="/">Volver al inicio</Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <PageHero
        eyebrow={route.label}
        title={route.heroTitle}
        subtitle={route.heroSubtitle}
        primaryAction={
          <Button to={`/contacto?mode=proposal&clientType=${route.key}`}>
            Solicitar propuesta
          </Button>
        }
        secondaryAction={
          <Button to="/servicios" variant="secondary">
            Ver catalogo
          </Button>
        }
      />

      <section className="section">
        <div className="container two-col">
          <article className="info-card">
            <SectionTitle
              eyebrow="Perfil"
              title="Que busca este tipo de cliente"
              subtitle={route.intro}
            />
            <ul className="bullet-list">
              {route.audience.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="info-card">
            <SectionTitle
              eyebrow="Tension"
              title="Problemas que esta ruta ayuda a resolver"
              subtitle="Estos bloques luego pueden convertirse en copy comercial, FAQs o modulos visuales mas densos."
            />
            <ul className="bullet-list">
              {route.painPoints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="section section-sand">
        <div className="container">
          <SectionTitle
            eyebrow="Servicios sugeridos"
            title={`Soluciones para ${route.label}`}
            subtitle="Estas tarjetas ya se alimentan del catalogo real del CRM, con algunas inferencias temporales mientras el backend completa todos los campos publicos."
          />

          <div className="service-grid">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionTitle
            eyebrow="Paquetes"
            title="Ideas de empaquetado para esta ruta"
            subtitle="Sirve como base comercial mientras definimos como llegaran luego los bundles, addons o variaciones desde el CRM."
          />

          <div className="info-grid info-grid--three">
            {route.packageIdeas.map((pkg) => (
              <article key={pkg.name} className="info-card">
                <h3>{pkg.name}</h3>
                <p>{pkg.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        title={`Activa la ruta de ${route.label} con una base lista para crecer`}
        text="La experiencia publica ya esta organizada por perfil de cliente. Despues conectamos formularios, disponibilidad, pagos o propuestas con el backend real."
        primaryLabel="Solicitar propuesta"
        primaryTo={`/contacto?mode=proposal&clientType=${route.key}`}
        secondaryLabel="Ver todo el catalogo"
        secondaryTo="/servicios"
      />
    </>
  );
}
