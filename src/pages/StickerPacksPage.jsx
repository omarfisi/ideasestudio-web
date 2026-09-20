import { Link } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead.jsx";
import "./StickerCatalogPages.css";

const collections = [
  { slug: "frases-y-humor", asset: "collection-01-frases-y-humor.png", name: "Frases y humor" },
  { slug: "food-and-drinks", asset: "collection-02-food-and-drinks.png", name: "Food & Drinks" },
  { slug: "animales", asset: "collection-03-animales.png", name: "Animales" },
  { slug: "cultura", asset: "collection-04-cultura.png", name: "Cultura" },
  { slug: "cute-jj-pega-characters", asset: "collection-05-cute-characters.png", name: "Cute JJ Pega Characters" },
  { slug: "fe-y-esperanza", asset: "collection-07-fe-y-esperanza.png", name: "Fe y Esperanza" },
  { slug: "personalizados", asset: "collection-06-personalizados.png", name: "Personalizados" },
];

export default function StickerPacksPage() {
  return (
    <main className="jj-catalog-page jj-packs-page">
      <SEOHead title="Packs por colección | JJ Pega" description="Descubre los packs de stickers JJ Pega organizados por colección." />
      <header className="jj-catalog-banner jj-packs-banner">
        <img src="/assets/jj-high-quality/packs-colecciones-banner.png" alt="Packs por colección de JJ Pega" />
      </header>
      <section className="jj-collection-intro-banner">
        <img src="/assets/jj-high-quality/packs-collections-intro.png" alt="Escoge tu colección" />
      </section>
      <section className="jj-collection-image-grid" aria-label="Colecciones de stickers">
        {collections.map((collection) => (
          <Link className="jj-collection-image-card" to="/stickers-individuales" key={collection.slug} aria-label={`Ver colección ${collection.name}`}>
            <img src={`/assets/jj-high-quality/${collection.asset}`} alt={collection.name} loading="lazy" />
          </Link>
        ))}
      </section>
    </main>
  );
}
