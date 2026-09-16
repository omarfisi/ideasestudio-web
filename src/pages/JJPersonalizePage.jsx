import { Link } from "react-router-dom";

export default function JJPersonalizePage() {
  return (
    <main className="jj-personalize-page">
      <section className="jj-section jj-section--ink">
        <div className="container jj-custom__grid">
          <div>
            <span className="jj-kicker jj-kicker--light">Personaliza tu sticker</span>
            <h1>Tu foto. Tu idea. Tu vibe.</h1>
            <p>Cuéntanos qué quieres convertir en sticker y revisa el diseño antes de ordenar.</p>
          </div>
          <div className="jj-upload-panel">
            <label htmlFor="jj-upload">Sube una foto o referencia</label>
            <input id="jj-upload" type="file" accept="image/png,image/jpeg,image/webp" />
            <p>También puedes escribir una idea y nuestro flujo preparará una propuesta para tu aprobación.</p>
          </div>
        </div>
      </section>
      <section className="jj-section jj-section--white">
        <div className="container">
          <span className="jj-kicker">Cómo funciona</span>
          <div className="jj-custom__steps jj-personalize-steps">
            <div><strong>01</strong><span>Subes tu foto o describes tu idea.</span></div>
            <div><strong>02</strong><span>Revisas el diseño antes de producirlo.</span></div>
            <div><strong>03</strong><span>Apruebas, eliges tamaño y confirmas la orden.</span></div>
          </div>
          <Link className="jj-button jj-button--dark" to="/servicios">Ver tamaños y precios</Link>
        </div>
      </section>
    </main>
  );
}
