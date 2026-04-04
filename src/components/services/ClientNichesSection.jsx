import SectionTitle from "@/components/shared/SectionTitle.jsx";
import ClientNicheCard from "@/components/services/ClientNicheCard.jsx";
import { clientNiches as defaultNiches } from "@/data/clientNiches.js";

export default function ClientNichesSection({
  id,
  className = "",
  niches = defaultNiches,
  eyebrow = "Por tipo de cliente",
  title = "Soluciones según lo que estás buscando",
  subtitle = "Escoge la opción que mejor se parezca a tu necesidad y descubre el camino ideal para ti, tu marca o tu proyecto.",
}) {
  const classes = ["client-niches-section", className].filter(Boolean).join(" ");

  return (
    <section id={id} className={classes}>
      <SectionTitle eyebrow={eyebrow} title={title} subtitle={subtitle} />

      <div className="client-niches-section__grid">
        {niches.map((niche) => (
          <ClientNicheCard key={niche.id} niche={niche} />
        ))}
      </div>
    </section>
  );
}
