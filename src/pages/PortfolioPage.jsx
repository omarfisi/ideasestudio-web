import Button from "@/components/shared/Button.jsx";
import PageHero from "@/components/shared/PageHero.jsx";

export default function PortfolioPage() {
  return (
    <>
      <PageHero
        eyebrow="Portafolio"
        title="Espacio para trabajos, casos y fotografia"
        subtitle="Esta pagina queda lista para conectar galerias, categorias, proyectos destacados y piezas visuales reales."
        primaryAction={
          <Button to="/contacto">Solicitar propuesta</Button>
        }
      />

      <section className="section">
        <div className="container">
          <div className="mosaic-grid mosaic-grid--portfolio">
            <article className="mosaic-card mosaic-card--tall">Proyecto 01</article>
            <article className="mosaic-card">Proyecto 02</article>
            <article className="mosaic-card">Proyecto 03</article>
            <article className="mosaic-card">Proyecto 04</article>
            <article className="mosaic-card mosaic-card--wide">Proyecto 05</article>
          </div>
        </div>
      </section>
    </>
  );
}
