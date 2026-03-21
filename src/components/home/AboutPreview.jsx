import SectionTitle from "@/components/shared/SectionTitle.jsx";

export default function AboutPreview() {
  return (
    <section className="section section-sand">
      <div className="container">
        <SectionTitle
          eyebrow="Sobre Ideas Estudio"
          title="La marca publica comunica. El CRM opera."
          subtitle="La web se enfoca en narrativa, conversion y experiencia. El backend se reserva para clientes, pedidos, propuestas y automatizaciones."
        />

        <div className="info-grid">
          <article className="info-card">
            <h3>Frente publico</h3>
            <p>
              Paginas claras, hero consistente, rutas por cliente y un catalogo
              que se puede navegar sin exponer la complejidad interna del
              negocio.
            </p>
          </article>

          <article className="info-card">
            <h3>Motor privado</h3>
            <p>
              El CRM sigue siendo la capa de verdad para leads, ordenes, pagos,
              reservas, inventario, seguimiento y tareas comerciales.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
