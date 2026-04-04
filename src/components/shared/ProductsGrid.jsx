import ProductCard from "@/components/shared/ProductCard.jsx";

export default function ProductsGrid({
  products = [],
  onAddToCart,
  addingProductSlug = null,
}) {
  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard
          key={product.id || product.slug}
          product={product}
          onAddToCart={onAddToCart}
          addState={addingProductSlug === product.slug ? "loading" : "idle"}
        />
      ))}
    </div>
  );
}
