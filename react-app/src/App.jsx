import { useEffect, useMemo, useState } from "react";
import Navbar from "./components/Navbar";
import FiltersSidebar from "./components/FiltersSidebar";
import ProductGrid from "./components/ProductGrid";
import DesignsModal from "./components/DesignsModal";
import CreatorPage from "./components/CreatorPage";
import { baseProducts } from "./data/baseProducts";
import {
  clearSession,
  getActiveDesignIndex,
  getCurrentRoute,
  getDesigns,
  getFavorites,
  getPublishedDesigns,
  getSession,
  getTheme,
  goToRoute,
  openReactCreateForProduct,
  setActiveDesign,
  setDesigns,
  setFavorites,
  setTheme
} from "./lib/storage";

function toggleInList(items, value) {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

export default function App() {
  const [darkMode, setDarkMode] = useState(getTheme() === "dark");
  const [session, setSession] = useState(() => getSession());
  const [selectedShapes, setSelectedShapes] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const [favorites, setFavoriteState] = useState(() => getFavorites());
  const [designs, setDesignState] = useState(() => getDesigns());
  const [modalOpen, setModalOpen] = useState(false);
  const [route, setRoute] = useState(() => getCurrentRoute());
  const [creatorVisited, setCreatorVisited] = useState(() => getCurrentRoute() === "create");

  function refreshLocalState() {
    setSession(getSession());
    setFavoriteState(getFavorites());
    setDesignState(getDesigns());
  }

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
    setTheme(darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") setModalOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const nextRoute = getCurrentRoute();
      setRoute(nextRoute);
      if (nextRoute === "create") setCreatorVisited(true);
      refreshLocalState();
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const onStorage = () => refreshLocalState();
    const onFocus = () => refreshLocalState();

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const allProducts = useMemo(
    () => [...baseProducts.map((product) => ({ ...product, type: "base" })), ...getPublishedDesigns()],
    [designs]
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const visible = allProducts.filter((product) => {
      const shapeMatch = selectedShapes.length === 0 || selectedShapes.includes(product.shape);
      const materialMatch = selectedMaterials.length === 0 || selectedMaterials.includes(product.material);
      const searchMatch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.shape.toLowerCase().includes(normalizedSearch) ||
        product.material.toLowerCase().includes(normalizedSearch);

      return shapeMatch && materialMatch && searchMatch;
    });

    const sorted = [...visible];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    else if (sort === "name-asc") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)));

    return sorted;
  }, [allProducts, favorites, search, selectedMaterials, selectedShapes, sort]);

  function syncDesigns(nextDesigns) {
    setDesignState(nextDesigns);
    setDesigns(nextDesigns);
  }

  function handleToggleFavorite(productId) {
    const nextFavorites = toggleInList(favorites, productId);
    setFavoriteState(nextFavorites);
    setFavorites(nextFavorites);
  }

  function handleOpenDesign(savedIndex) {
    setActiveDesign(savedIndex);
    goToRoute("create");
    setModalOpen(false);
  }

  function handleTogglePublish(index) {
    const next = [...designs];
    if (!next[index]) return;

    next[index] = { ...next[index], published: !next[index].published };
    syncDesigns(next);
  }

  function handleDeleteDesign(index) {
    const next = designs.filter((_, currentIndex) => currentIndex !== index);
    syncDesigns(next);
    setModalOpen(false);
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    window.location.href = "../login.html";
  }

  return (
    <div className={`app-shell ${darkMode ? "dark" : ""}`}>
      <div className="page-wrapper">
        <Navbar
          session={session}
          darkMode={darkMode}
          route={route}
          onNavigate={goToRoute}
          onOpenDesigns={() => setModalOpen(true)}
          onToggleTheme={() => setDarkMode((current) => !current)}
          onLogout={handleLogout}
        />

        <div className={route === "marketplace" ? "" : "page-hidden"} aria-hidden={route !== "marketplace"}>
          <section className="hero">
            <h1>EXPLORE THOUSANDS OF UNIQUE DESIGNS</h1>
            <p>Browse base models, search community designs, favorite what stands out, and jump straight into customization.</p>
          </section>

          <main className="marketplace">
            <FiltersSidebar
              selectedShapes={selectedShapes}
              selectedMaterials={selectedMaterials}
              onShapeToggle={(shape) => setSelectedShapes((current) => toggleInList(current, shape))}
              onMaterialToggle={(material) => setSelectedMaterials((current) => toggleInList(current, material))}
              onClear={() => {
                setSelectedShapes([]);
                setSelectedMaterials([]);
                setSearch("");
                setSort("featured");
              }}
            />

            <section className="catalog">
              <div className="catalog-toolbar">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search designs..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />

                <select className="sort-select" value={sort} onChange={(event) => setSort(event.target.value)}>
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                </select>
              </div>

              <ProductGrid
                products={filteredProducts}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                onView={openReactCreateForProduct}
                onCustomize={openReactCreateForProduct}
              />
            </section>
          </main>
        </div>

        {(creatorVisited || route === "create") && (
          <CreatorPage hidden={route !== "create"} onOpenDesigns={() => setModalOpen(true)} />
        )}
      </div>

      <DesignsModal
        open={modalOpen}
        designs={designs}
        activeIndex={getActiveDesignIndex()}
        onClose={() => setModalOpen(false)}
        onOpenDesign={handleOpenDesign}
        onTogglePublish={handleTogglePublish}
        onDeleteDesign={handleDeleteDesign}
      />
    </div>
  );
}
