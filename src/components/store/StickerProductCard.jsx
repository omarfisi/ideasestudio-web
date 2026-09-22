import { Link } from "react-router-dom";
import { formatPrice } from "@/lib/formatPrice.js";

/**
 * Tarjeta visual única para cualquier sticker individual.
 * Mantiene la misma estructura que las tarjetas de la tienda y Home.
 */
export default function StickerProductCard({ product, index = 0, badge = "" }) {
  return (
    <article className={`jj-shop-product jj-shop-product--${index % 5}`}>
      <div className="jj-shop-product__media">
        <img src={product.coverImage} alt={product.name} loading="lazy" />
        {badge ? <span className="jj-shop-product__badge">{badge}</span> : null}
        <button
          className="jj-shop-product__favorite"
          type="button"
          aria-label={`Añadir ${product.name} a favoritos`}
        >
          ♡
        </button>
      </div>
      <div className="jj-shop-product__body">
        <h3>{product.name}</h3>
        <p><strong>{formatPrice(product.price, product.currency)}</strong></p>
        <Link to={`/tienda/${product.slug}`} className="jj-shop-product__add">
          Ver producto <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
