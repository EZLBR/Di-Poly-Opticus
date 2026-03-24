function ProductPreview({ shape, material }) {
  return (
    <div className={`card-preview preview-${shape}`}>
      <div className={`glasses-icon ${material}`}>
        <span className="lens left" />
        <span className="lens right" />
        <span className="bridge" />
      </div>
    </div>
  );
}

export default function ProductCard({
  product,
  favorite,
  onToggleFavorite,
  onView,
  onCustomize
}) {
  return (
    <article className="product-card">
      <button
        type="button"
        className={`favorite-btn ${favorite ? "active" : ""}`}
        onClick={() => onToggleFavorite(product.id)}
        aria-label="Favorite"
      >
        {favorite ? "♥" : "♡"}
      </button>

      <div className="product-badge">{product.badge}</div>
      <ProductPreview shape={product.shape} material={product.material} />

      <div className="product-meta">
        <div className="product-topline">
          <span>{product.shape}</span>
          <span>{product.material}</span>
        </div>

        <h3>{product.name}</h3>
        <p className="product-price">${Number(product.price).toFixed(2)}</p>

        <div className="product-actions">
          <button type="button" className="btn" onClick={() => onView(product)}>
            VIEW
          </button>
          <button type="button" className="btn primary" onClick={() => onCustomize(product)}>
            CUSTOMIZE
          </button>
        </div>
      </div>
    </article>
  );
}
