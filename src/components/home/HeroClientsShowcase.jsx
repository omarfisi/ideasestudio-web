import { Link } from "react-router-dom";
import heroPhoto from "@/assets/osvaldo-marfisi.jpg";

const cards = [
  {
    title: "Pequenos Negocios",
    description:
      "Soluciones visuales para fortalecer tu presencia y atraer mas clientes.",
    to: "/pequenos-negocios",
  },
  {
    title: "Emprendedores",
    description:
      "Imagen, contenido y presencia digital para impulsar tu marca o negocio.",
    to: "/emprendedores",
  },
  {
    title: "Empresas",
    description:
      "Contenido profesional para proyectar una imagen solida y de alto nivel.",
    to: "/empresas-emergentes",
  },
  {
    title: "Eventos Sociales",
    description:
      "Fotografia y video para capturar momentos especiales con calidad y emocion.",
    to: "/bodas-eventos-sesiones",
  },
];

function ClientCard({ title, description, to }) {
  return (
    <Link to={to} className="home-clients-card">
      <div className="home-clients-card__line" />
      <h3>{title}</h3>
      <p>{description}</p>
      <span className="home-clients-card__link">Explorar</span>
    </Link>
  );
}

export default function HeroClientsShowcase() {
  return (
    <section id="rutas" className="home-clients-hero">
      <div className="container home-clients-hero__inner">
        <div className="home-clients-hero__heading">
          <h1>Ideas Estudio</h1>
          <p>
            Imagen, contenido y experiencias visuales para cada tipo de cliente.
          </p>
        </div>

        <div className="home-clients-hero__desktop">
          <div className="home-clients-hero__column">
            <ClientCard {...cards[0]} />
            <ClientCard {...cards[1]} />
          </div>

          <div className="home-clients-hero__photo">
            <div className="home-clients-hero__glow" />
            <div className="home-clients-hero__frame">
              <img src={heroPhoto} alt="Osvaldo Marfisi" />
            </div>
          </div>

          <div className="home-clients-hero__column">
            <ClientCard {...cards[2]} />
            <ClientCard {...cards[3]} />
          </div>
        </div>

        <div className="home-clients-hero__mobile">
          <div className="home-clients-hero__photo home-clients-hero__photo--mobile">
            <div className="home-clients-hero__glow" />
            <div className="home-clients-hero__frame">
              <img src={heroPhoto} alt="Osvaldo Marfisi" />
            </div>
          </div>

          <div className="home-clients-hero__mobile-grid">
            {cards.map((card) => (
              <ClientCard key={card.title} {...card} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
