import { Link } from "react-router-dom";

const clientPaths = [
  {
    eyebrow: "Ruta 01",
    category: "Marca y negocio",
    title: "Tengo una marca o negocio",
    text: "Para emprendedores, marcas personales y negocios que necesitan imagen, contenido, web o presencia digital.",
    to: "/servicios",
    cta: "Ver soluciones",
    visual: "Visual de marca",
  },
  {
    eyebrow: "Ruta 02",
    category: "Presencia profesional",
    title: "Necesito presencia visual profesional",
    text: "Para empresas, oficinas, equipos y organizaciones que buscan fotografía, video o contenido institucional.",
    to: "/servicios",
    cta: "Explorar opciones",
    visual: "Imagen corporativa",
  },
  {
    eyebrow: "Ruta 03",
    category: "Eventos y sesiones",
    title: "Quiero capturar un momento especial",
    text: "Para bodas, cumpleaños, sesiones y eventos donde la emoción y el recuerdo visual son prioridad.",
    to: "/servicios",
    cta: "Ver experiencias",
    visual: "Momentos especiales",
  },
  {
    eyebrow: "Ruta 04",
    category: "Proyecto personalizado",
    title: "Busco una solución creativa a mi medida",
    text: "Para campañas, proyectos híbridos y necesidades especiales que requieren una propuesta personalizada.",
    to: "/contacto?mode=proposal",
    cta: "Solicitar propuesta",
    visual: "Solución a medida",
  },
];

export default function ClientPathsSection() {
  return (
    <section className="client-paths">
      <div className="container">
        <div className="client-paths__heading">
          <span className="client-paths__tag">Elige tu camino</span>
          <h2>Encuentra la ruta correcta para tu proyecto</h2>
          <p>
            No todos los clientes buscan lo mismo. Por eso organizamos esta primera
            experiencia para ayudarte a identificar rápidamente la solución que mejor
            encaja contigo.
          </p>
        </div>

        <div className="client-paths__grid">
          {clientPaths.map((item) => (
            <article key={item.title} className="client-path-card">
              <div className="client-path-card__visual">
                <div className="client-path-card__visual-box">
                  <span>{item.visual}</span>
                </div>
              </div>

              <div className="client-path-card__content">
                <span className="client-path-card__eyebrow">{item.eyebrow}</span>
                <p className="client-path-card__category">{item.category}</p>
                <h3>{item.title}</h3>
                <p className="client-path-card__text">{item.text}</p>

                <Link to={item.to} className="client-path-card__cta">
                  <span>{item.cta}</span>
                  <svg viewBox="0 0 7 12" aria-hidden="true">
                    <path
                      d="M1 10.5L4.79289 6.70711C5.12623 6.37377 5.29289 6.20711 5.29289 6C5.29289 5.79289 5.12623 5.62623 4.79289 5.29289L1 1.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
