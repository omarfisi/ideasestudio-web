import Button from "@/components/shared/Button.jsx";
import SectionTitle from "@/components/shared/SectionTitle.jsx";

export default function PortfolioPreview() {
  return (
    <section className="section">
      <div className="container">
        <div className="split-heading">
          <SectionTitle
            eyebrow="Portafolio"
            title="La home tambien debe vender por imagen"
            subtitle="Esta seccion deja un bloque editorial listo para conectar trabajos, sesiones, branding y piezas web reales."
          />
          <Button to="/portafolio" variant="secondary">
            Ver portafolio
          </Button>
        </div>

        <div className="mosaic-grid">
          <article className="mosaic-card mosaic-card--tall">Branding</article>
          <article className="mosaic-card">Fotografia</article>
          <article className="mosaic-card">Web</article>
          <article className="mosaic-card">Contenido</article>
          <article className="mosaic-card mosaic-card--wide">
            Bodas, eventos y sesiones
          </article>
        </div>
      </div>
    </section>
  );
}
