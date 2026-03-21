import PageHero from "@/components/shared/PageHero.jsx";

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Sobre Nosotros"
        title="Un estudio creativo con una base digital pensada para operar en serio"
        subtitle="Ideas Estudio combina imagen, contenido, fotografia, branding y presencia digital con una capa publica clara y un CRM como motor privado."
      />

      <section className="section">
        <div className="container info-grid info-grid--three">
          <article className="info-card">
            <h2>Quienes somos</h2>
            <p>
              Un estudio orientado a ayudar a negocios, marcas personales,
              proyectos emergentes y clientes finales a verse mejor y vender con
              mas claridad.
            </p>
          </article>

          <article className="info-card">
            <h2>Como trabajamos</h2>
            <p>
              La capa publica comunica, ordena y convierte. El backend gestiona
              leads, propuestas, ordenes, reservas, cobros y automatizacion.
            </p>
          </article>

          <article className="info-card">
            <h2>Que sigue</h2>
            <p>
              Cuando definas el contrato del CRM, la web ya tiene puntos claros
              donde conectar catalogo, detalle, formularios y checkout.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
