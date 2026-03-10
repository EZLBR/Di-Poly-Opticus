(function initMarketplace() {
  const grid = document.getElementById("productGrid");
  if (!grid || !window.__OPTICUS__) return;

  const { getDesigns } = window.__OPTICUS__;

  const LS_FAVORITES = "opticus_favorites";
  const LS_ACTIVE_PRODUCT = "opticus_active_product";

  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");
  const clearBtn = document.getElementById("clearFilters");

  const baseProducts = [
    {
      id: "base-round-metal",
      name: "Aero Round",
      shape: "round",
      material: "metal",
      price: 180,
      badge: "Best Seller"
    },
    {
      id: "base-square-acetate",
      name: "Nova Square",
      shape: "square",
      material: "acetate",
      price: 190,
      badge: "New"
    },
    {
      id: "base-round-acetate",
      name: "Luna Frame",
      shape: "round",
      material: "acetate",
      price: 150,
      badge: "Classic"
    },
    {
      id: "base-square-metal",
      name: "Titan Edge",
      shape: "square",
      material: "metal",
      price: 200,
      badge: "Premium"
    }
  ];

  function getFavorites() {
    try {
      return JSON.parse(localStorage.getItem(LS_FAVORITES)) || [];
    } catch {
      return [];
    }
  }

  function setFavorites(items) {
    localStorage.setItem(LS_FAVORITES, JSON.stringify(items));
  }

  function isFavorite(id) {
    return getFavorites().includes(id);
  }

  function toggleFavorite(id) {
    const current = getFavorites();
    const next = current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id];

    setFavorites(next);
    applyFiltersAndSort();
  }

  function getPublishedDesigns() {
    return getDesigns()
      .map((d, i) => ({ ...d, savedIndex: i }))
      .filter((d) => d.published)
      .map((d) => ({
        id: `design-${d.savedIndex}`,
        type: "saved",
        savedIndex: d.savedIndex,
        name: d.name || `Design #${d.savedIndex + 1}`,
        shape: d.model === "square" ? "square" : "round",
        material: d.isSunglasses ? "metal" : "acetate",
        price: d.isSunglasses ? 220 : 180,
        badge: "Community"
      }));
  }

  function getAllProducts() {
    const base = baseProducts.map((p) => ({ ...p, type: "base" }));
    const saved = getPublishedDesigns();
    return [...base, ...saved];
  }

  function getShapeLabel(shape) {
    return shape === "round" ? "Round" : "Square";
  }

  function getMaterialLabel(material) {
    return material === "metal" ? "Metal" : "Acetate";
  }

  function createCardPreview(product) {
  return `
    <div class="card-preview three-preview"
         data-preview="true"
         data-shape="${product.shape}"
         data-material="${product.material}"
         data-product-id="${product.id}">
    </div>
  `;
}

  function render(items) {
    grid.innerHTML = "";

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>No designs found</h3>
          <p>Try changing the filters or search term.</p>
        </div>
      `;
      return;
    }

    items.forEach((p) => {
      const card = document.createElement("article");
      card.className = "product-card";

      const favorite = isFavorite(p.id);

      card.innerHTML = `
        <button class="favorite-btn ${favorite ? "active" : ""}" data-fav="${p.id}" aria-label="Favorite">
          ${favorite ? "♥" : "♡"}
        </button>

        <div class="product-badge">${p.badge}</div>

        ${createCardPreview(p)}

        <div class="product-meta">
          <div class="product-topline">
            <span>${getShapeLabel(p.shape)}</span>
            <span>${getMaterialLabel(p.material)}</span>
          </div>

          <h3>${p.name}</h3>
          <p class="product-price">$${Number(p.price).toFixed(2)}</p>

          <div class="product-actions">
            <button class="btn" data-action="view" data-id="${p.id}">VIEW</button>
            <button class="btn primary" data-action="customize" data-id="${p.id}">CUSTOMIZE</button>
          </div>
        </div>
      `;

      grid.appendChild(card);
    });

    grid.querySelectorAll("[data-fav]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(btn.dataset.fav);
      });
    });

    grid.querySelectorAll("[data-action='view']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const product = items.find((item) => item.id === btn.dataset.id);
        if (!product) return;

        if (product.type === "saved") {
  localStorage.setItem("opticus_active_design", String(product.savedIndex));
  localStorage.removeItem(LS_ACTIVE_PRODUCT);
  window.location.href = "create.html";
  return;
}

        localStorage.setItem(LS_ACTIVE_PRODUCT, product.id);
        localStorage.removeItem("opticus_active_design");
        window.location.href = "create.html";
      });
    });

    grid.querySelectorAll("[data-action='customize']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const product = items.find((item) => item.id === btn.dataset.id);
        if (!product) return;

        if (product.type === "saved") {
  localStorage.setItem("opticus_active_design", String(product.savedIndex));
  localStorage.removeItem(LS_ACTIVE_PRODUCT);
} else {
  localStorage.setItem(LS_ACTIVE_PRODUCT, product.id);
  localStorage.removeItem("opticus_active_design");
}

        window.location.href = "create.html";
      });
    });
  }

  function applyFiltersAndSort() {
    const shapes = [...document.querySelectorAll(".filter-shape:checked")].map((cb) => cb.value);
    const materials = [...document.querySelectorAll(".filter-material:checked")].map((cb) => cb.value);
    const search = (searchInput?.value || "").trim().toLowerCase();
    const sort = sortSelect?.value || "featured";

    let products = getAllProducts();

    products = products.filter((p) => {
      const shapeOk = shapes.length === 0 || shapes.includes(p.shape);
      const materialOk = materials.length === 0 || materials.includes(p.material);
      const searchOk =
        !search ||
        p.name.toLowerCase().includes(search) ||
        p.shape.toLowerCase().includes(search) ||
        p.material.toLowerCase().includes(search);

      return shapeOk && materialOk && searchOk;
    });

    if (sort === "price-asc") {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === "price-desc") {
      products.sort((a, b) => b.price - a.price);
    } else if (sort === "name-asc") {
      products.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      products.sort((a, b) => {
        const aFav = isFavorite(a.id) ? 1 : 0;
        const bFav = isFavorite(b.id) ? 1 : 0;
        return bFav - aFav;
      });
    }

    render(products);
  }

  document.querySelectorAll(".filter-shape, .filter-material").forEach((cb) => {
    cb.addEventListener("change", applyFiltersAndSort);
  });

  searchInput?.addEventListener("input", applyFiltersAndSort);
  sortSelect?.addEventListener("change", applyFiltersAndSort);

  clearBtn?.addEventListener("click", () => {
    document.querySelectorAll(".filter-shape, .filter-material").forEach((cb) => {
      cb.checked = false;
    });

    if (searchInput) searchInput.value = "";
    if (sortSelect) sortSelect.value = "featured";

    applyFiltersAndSort();
  });

  window.__refreshMarketplaceBase__ = applyFiltersAndSort;
window.refreshMarketplace = applyFiltersAndSort;
applyFiltersAndSort();
})();