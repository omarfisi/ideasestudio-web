import { Link } from "react-router-dom";
import "./CategorySection.css";

const categories = [
  {
    id: "frases-humor",
    title: "Frases y humor",
    description: "Relatable, trabajo y buenas vibras",
    subcategories: "Frases · Trabajo · Relatable · Humor",
    image: "/assets/categories/frases-humor.webp",
    theme: "yellow",
  },
  {
    id: "food-drinks",
    title: "Food & Drinks",
    description: "Café, comida, snacks y antojos",
    subcategories: "Café · Bebidas · Comida · Postres",
    image: "/assets/categories/food-drinks.webp",
    theme: "pink",
  },
  {
    id: "animales",
    title: "Animales",
    description: "Mascotas y animales con personalidad",
    subcategories: "Perros · Gatos · Mascotas · Animales graciosos",
    image: "/assets/categories/animales.webp",
    theme: "cyan",
  },
  {
    id: "cultura",
    title: "Cultura",
    description: "Identidad, tradiciones y cultura local",
    subcategories: "Boricua · Tradiciones · Comida local · Frases locales",
    image: "/assets/categories/cultura.webp",
    theme: "green",
  },
  {
    id: "cute-jj-pega",
    title: "Cute / JJ Pega Characters",
    description: "Personajes originales de la marca",
    subcategories: "Cafecito · Coquí · Guineo · Corazones",
    image: "/assets/categories/cute-jj-pega.webp",
    theme: "purple",
  },
  {
    id: "custom-personalizados",
    title: "Custom / personalizados",
    description: "Nombres, mascotas, parejas y más",
    subcategories: "Nombres · Apodos · Parejas · Familias · Profesiones",
    image: "/assets/categories/custom-personalizados.webp",
    theme: "orange",
  },
];

export default function CategorySection({ searchDraft, setSearchDraft, getCategoryHref }) {
  return (
    <section className="jj-category-section" aria-labelledby="jj-category-title">
      <div className="jj-category-container">
        <header className="jj-category-header">
          <img
            className="jj-category-title-image"
            id="jj-category-title"
            src="/assets/categories-section-title.webp"
            alt="Explora por categoría"
          />
        </header>

        <label className="jj-category-search jj-category-search--large">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={searchDraft}
            placeholder="Buscar stickers..."
            onChange={(event) => setSearchDraft(event.target.value)}
          />
        </label>

        <div className="jj-category-grid">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={getCategoryHref(category.title)}
              className={`jj-category-card jj-category-card--${category.theme}`}
              aria-label={`Ver ${category.title}`}
            >
              <div className="jj-category-image">
                <img src={category.image} alt={category.title} loading="lazy" decoding="async" />
              </div>
              <div className="jj-category-card-footer">
                <div className="jj-category-copy">
                  <h3>{category.title}</h3>
                  <p>{category.description}</p>
                  <small>{category.subcategories}</small>
                </div>
                <span className="jj-category-arrow" aria-hidden="true">→</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="jj-seasonal-banner">
          <img
            src="/assets/seasonal-collection-banner.webp"
            alt="Colección del momento: stickers que celebran cada temporada"
            loading="lazy"
            decoding="async"
          />
          <Link className="jj-seasonal-button" to={getCategoryHref("Temporadas")}>
            Ver temporada <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
