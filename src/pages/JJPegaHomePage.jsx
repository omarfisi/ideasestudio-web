import { Link } from "react-router-dom";
import "@/components/store/HomeProductCards.css";

const categories = [
  { title: "Stickers individuales", tone: "pink", asset: "category-individual.webp", to: "/stickers-individuales" },
  { title: "Packs", tone: "yellow", asset: "category-packs.webp", to: "/packs" },
  { title: "Personalizados", tone: "cyan", asset: "category-custom.webp", to: "/personaliza" },
  { title: "Diseños con IA", tone: "lime", asset: "category-ai.webp", to: "/personaliza" },
];

const products = [
  ["Good Vibes", "$2.00", "sticker-good-vibes.webp"], ["Corazón Rosa", "$2.00", "sticker-corazon-rosa.webp"], ["Corona JJ", "$3.50", "sticker-corona-jj.webp"], ["Margarita", "$2.00", "sticker-margarita.webp"],
  ["Arcoíris", "$5.00", "sticker-arcoiris.webp"], ["Good Vibes", "$2.00", "sticker-good-vibes-text.webp"], ["Aguacate Feliz", "$3.50", "sticker-aguacate-feliz.webp"], ["Shaka", "$2.00", "sticker-shaka.webp"],
];

function Scribble({ color = "pink", className = "" }) { return <span className={`jj-scribble jj-scribble--${color} ${className}`} aria-hidden="true" />; }

export default function JJPegaHomePage() {
  return <main className="jj-home jj-paper">
    <div className="jj-deco jj-deco--top" aria-hidden="true"><Scribble color="pink" /><Scribble color="cyan" /><Scribble color="lime" /></div>
    <section className="jj-hero"><div className="jj-hero__copy"><img className="jj-hero-title-art" src="/assets/jj-high-quality/trimmed/hero-title.webp" alt="Tu idea merece convertirse en sticker" /><img className="jj-hero-subtitle-art" src="/assets/jj-high-quality/trimmed/hero-subtitle.webp" alt="Más que stickers, es tu historia en todas partes" /><div className="jj-actions"><Link className="jj-image-button" to="/servicios"><img src="/assets/jj-high-quality/trimmed/button-ver-stickers.webp" alt="Ver stickers" /></Link><Link className="jj-image-button" to="/personaliza"><img src="/assets/jj-high-quality/trimmed/button-crear-el-mio.webp" alt="Crear el mío" /></Link></div></div><div className="jj-hero__art"><img className="jj-hero-characters" src="/assets/jj-high-quality/trimmed/hero-characters.webp" alt="Personajes JJ Pega con stickers" /><img className="jj-hero-graphic jj-hero-graphic--one" src="/assets/jj-high-quality/trimmed/hero-graphic-1.webp" alt="Pega crea sonríe repite" /><img className="jj-hero-graphic jj-hero-graphic--two" src="/assets/jj-high-quality/trimmed/hero-graphic-2.webp" alt="Pequeños stickers, grandes ideas" /></div></section>
    <section className="jj-section jj-section--cream" aria-labelledby="jj-categories-title"><div className="jj-section-title"><img className="jj-category-title-art" id="jj-categories-title" src="/assets/jj-high-quality/trimmed/category-title.webp" alt="Encuentra tu vibe" /></div><div className="jj-category-grid">{categories.map((category, index) => <Link className={`jj-category-card jj-category-card--${category.tone}`} to={category.to} key={category.title}><img src={`/assets/jj-high-quality/trimmed/category-card-transparent-${index + 1}.webp`} alt={category.title} /></Link>)}</div><img className="jj-category-corner-art" src="/assets/jj-high-quality/trimmed/category-kicker.webp" alt="Todo lo que puedes pegar" /></section>
    <section className="jj-section jj-feature-section" aria-labelledby="jj-products-title"><div className="jj-section-title"><img className="jj-products-banner" id="jj-products-title" src="/assets/products-section-banner.webp" alt="Nuestra tienda de stickers" /></div><div className="jj-product-grid">{products.map(([name, price, asset], index) => <article className={`product-card product-card--${index % 5}`} key={`${name}-${index}`}>{index === 0 && <div className="product-badge"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.7 5.47 6.03.88-4.36 4.25 1.03 6-5.4-2.84-5.4 2.84 1.03-6-4.36-4.25 6.03-.88L12 2.8z" /></svg><span>Más popular</span></div>}<button className="favorite-button" type="button" aria-label={`Añadir ${name} a favoritos`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg></button><div className="product-card__image"><img src={`/assets/jj-high-quality/${asset}`} alt={`Sticker ${name}`} /></div><div className="product-card__content"><div className="product-card__info"><h3 className="product-card__title">{name}</h3><p className="product-card__price"><strong>{price}</strong></p></div><Link className="product-card__add" to="/servicios" aria-label={`Ver ${name}`}><span>Ver producto →</span></Link></div></article>)}</div><div className="jj-centered"><Link className="jj-stickers-cta" to="/servicios"><img src="/assets/jj-high-quality/trimmed/products-cta.webp" alt="Ver todos los stickers" /></Link></div></section>
    <section className="jj-idea-banner" aria-labelledby="jj-custom-title">
      <div className="jj-idea-copy">
        <img className="jj-idea-title" src="/assets/jj-high-quality/tienes-idea/title-final.webp" alt="Hazla sticker" />
        <p>Sube tu foto o cuéntanos tu idea.<br />Nosotros la convertimos en algo que quieras<br />pegar en todas partes.</p>
        <Link className="jj-idea-create" to="/personaliza"><img src="/assets/jj-high-quality/tienes-idea/create-button.webp" alt="Crear mi diseño" /></Link>
        <div className="jj-idea-benefits"><img src="/assets/jj-high-quality/tienes-idea/quality.webp" alt="Alta calidad, colores que duran" /><img src="/assets/jj-high-quality/tienes-idea/shipping-world.webp" alt="Envío a todo el mundo, tu idea donde estés" /><img src="/assets/jj-high-quality/tienes-idea/happy.webp" alt="Stickers que hacen feliz" /></div>
      </div>
      <div className="jj-idea-stage jj-idea-stage--final" aria-hidden="true"><img src="/assets/jj-high-quality/tienes-idea/idea-scene-latest.webp" alt="" /></div>
    </section>
    <section className="jj-section jj-faq-section" id="ayuda" aria-labelledby="jj-faq-title"><div className="jj-faq-grid"><div className="jj-section-title"><span className="jj-kicker">Estamos aquí para ayudarte</span><h2 id="jj-faq-title">Centro de ayuda <span className="jj-sun">☀</span></h2><p>Respuestas sobre tamaños, materiales, pedidos y envíos. El chat de JJ Pega llegará próximamente.</p></div><div className="jj-faq-list"><details><summary>¿Qué tamaño debo escoger?</summary><p>Tenemos opciones desde Mini hasta 4–5 pulgadas.</p></details><details><summary>¿Cómo funcionan los envíos?</summary><p>Preparamos cada pedido y te mostramos el costo antes de confirmar.</p></details><details><summary>¿Puedo crear un diseño personalizado?</summary><p>Sí, puedes subir una foto o explicar tu idea para revisarla.</p></details><details><summary>¿De qué material son los stickers?</summary><p>Te confirmaremos el acabado disponible para tu pedido.</p></details></div></div></section>
  </main>;
}
