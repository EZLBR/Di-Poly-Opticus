import ProductCard from "./ProductCard";

export default function ProductGrid({ products, favorites, onToggleFavorite, onView, onCustomize }) {
  if (products.length === 0) {
    return (
      <div className="empty-state">
        <h3>No designs found</h3>
        <p>Try changing the filters or search term.</p>
      </div>
    );
  }

  return (
    <section className="products">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          favorite={favorites.includes(product.id)}
          onToggleFavorite={onToggleFavorite}
          onView={onView}
          onCustomize={onCustomize}
        />
      ))}
    </section>
  );
}
