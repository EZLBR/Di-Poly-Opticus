import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../contexts/LanguageContext";
import { Heart, Search, X, Edit, Eye, FolderHeart, Sparkles } from "lucide-react";

// Sub-component for real-time 3D preview in cards
function ThreePreview({ shape, material }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = 240;
    const height = 150;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 0.15, 4.4);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height);

    containerRef.current.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xffffff, 0xd6deea, 1.8);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 4, 5);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xe8f0ff, 0.8);
    fill.position.set(-4, 2, -3);
    scene.add(fill);

    // Create Glasses Model
    const group = new THREE.Group();

    const getPreviewColor = (mat) => {
      return mat === "metal" ? 0x8b949e : 0x111827;
    };

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: getPreviewColor(material),
      roughness: material === "metal" ? 0.35 : 0.55,
      metalness: material === "metal" ? 0.85 : 0.15
    });

    const lensMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x9fb3c8,
      transmission: 0.65,
      transparent: true,
      opacity: 0.45,
      roughness: 0.08,
      metalness: 0,
      thickness: 0.04
    });

    const createLensShape = (sh, rx, ry) => {
      const s = new THREE.Shape();
      if (sh === "round") {
        s.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0);
        return s;
      }
      // Hexagon or Square
      if (sh === "hexagon") {
        const points = [
          new THREE.Vector2(-rx * 0.55, -ry),
          new THREE.Vector2(rx * 0.55, -ry),
          new THREE.Vector2(rx, -ry * 0.15),
          new THREE.Vector2(rx * 0.72, ry),
          new THREE.Vector2(-rx * 0.72, ry),
          new THREE.Vector2(-rx, -ry * 0.15)
        ];
        s.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          s.lineTo(points[i].x, points[i].y);
        }
        s.closePath();
        return s;
      }
      
      const r = Math.min(rx, ry) * 0.22;
      s.moveTo(-rx + r, -ry);
      s.lineTo(rx - r, -ry);
      s.quadraticCurveTo(rx, -ry, rx, -ry + r);
      s.lineTo(rx, ry - r);
      s.quadraticCurveTo(rx, ry, rx - r, ry);
      s.lineTo(-rx + r, ry);
      s.quadraticCurveTo(-rx, ry, -rx, ry - r);
      s.lineTo(-rx, -ry + r);
      s.quadraticCurveTo(-rx, -ry, -rx + r, -ry);
      return s;
    };

    const createRim = (sh, rx, ry, thickness, depth, mat) => {
      const outer = createLensShape(sh, rx, ry);
      const inner = createLensShape(sh, rx - thickness, ry - thickness);
      outer.holes.push(inner);

      const geo = new THREE.ExtrudeGeometry(outer, {
        depth,
        bevelEnabled: true,
        bevelThickness: depth * 0.12,
        bevelSize: depth * 0.08,
        bevelSegments: 2,
        curveSegments: sh === "round" ? 36 : 20
      });

      geo.center();
      return new THREE.Mesh(geo, mat);
    };

    const rx = shape === "round" ? 0.42 : 0.48;
    const ry = shape === "round" ? 0.42 : 0.34;
    const rimThickness = shape === "round" ? 0.08 : 0.07;
    const depth = 0.08;
    const gap = 0.62;

    const leftRim = createRim(shape, rx, ry, rimThickness, depth, frameMaterial);
    const rightRim = createRim(shape, rx, ry, rimThickness, depth, frameMaterial);
    leftRim.position.x = -gap;
    rightRim.position.x = gap;

    const lensGeo = new THREE.ExtrudeGeometry(createLensShape(shape, rx - 0.06, ry - 0.06), {
      depth: 0.03,
      bevelEnabled: false,
      curveSegments: shape === "round" ? 28 : 16
    });
    lensGeo.center();

    const leftLens = new THREE.Mesh(lensGeo, lensMaterial);
    const rightLens = new THREE.Mesh(lensGeo, lensMaterial);
    leftLens.position.set(-gap, 0, 0.018);
    rightLens.position.set(gap, 0, 0.018);

    const bridge = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.03, 0.22, 4, 8),
      frameMaterial
    );
    bridge.rotation.z = Math.PI / 2;
    bridge.position.y = shape === "round" ? 0.02 : 0.01;

    const leftTemple = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.05, 0.05),
      frameMaterial
    );
    leftTemple.position.set(-(gap + rx + 0.34), 0.02, -0.18);
    leftTemple.rotation.y = -0.55;

    const rightTemple = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.05, 0.05),
      frameMaterial
    );
    rightTemple.position.set(gap + rx + 0.34, 0.02, -0.18);
    rightTemple.rotation.y = 0.55;

    group.add(leftRim, rightRim, leftLens, rightLens, bridge, leftTemple, rightTemple);
    group.rotation.x = -0.18;
    group.rotation.y = 0.55;

    scene.add(group);

    let animationFrameId;
    let isHovered = false;

    const animate = () => {
      group.rotation.y += isHovered ? 0.02 : 0.006;
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    const handleMouseEnter = () => { isHovered = true; };
    const handleMouseLeave = () => { isHovered = false; };

    const container = containerRef.current;
    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
      renderer.dispose();
      group.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [shape, material]);

  return <div ref={containerRef} className="card-preview three-preview" style={{ height: "150px" }} />;
}

export default function Marketplace({ setView, showDesignsModal, onCloseDesignsModal }) {
  const { session, addToCart, cart } = useAuth();
  const { t, language } = useTranslation();
  const [toastMessage, setToastMessage] = useState("");

  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("opticus_favorites")) || [];
    } catch {
      return [];
    }
  });

  const [savedDesigns, setSavedDesigns] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("opticus_designs"));
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (showDesignsModal) {
      try {
        const list = JSON.parse(localStorage.getItem("opticus_designs"));
        setSavedDesigns(Array.isArray(list) ? list.filter(Boolean) : []);
      } catch (e) {
        console.error("Failed to load saved designs:", e);
      }
    }
  }, [showDesignsModal]);

  // Base Products
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

  // Filters State
  const [filterShapes, setFilterShapes] = useState([]);
  const [filterMaterials, setFilterMaterials] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("featured");

  useEffect(() => {
    localStorage.setItem("opticus_favorites", JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (id) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getPublishedDesigns = () => {
    return savedDesigns
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
  };

  const getAllProducts = () => {
    const base = baseProducts.map((p) => ({ ...p, type: "base" }));
    const saved = getPublishedDesigns();
    return [...base, ...saved];
  };

  const handleClearFilters = () => {
    setFilterShapes([]);
    setFilterMaterials([]);
    setSearchQuery("");
    setSortBy("featured");
  };

  const handleShapeFilterChange = (val) => {
    setFilterShapes((prev) =>
      prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val]
    );
  };

  const handleMaterialFilterChange = (val) => {
    setFilterMaterials((prev) =>
      prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val]
    );
  };

  const getFilteredProducts = () => {
    let list = getAllProducts();

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.shape.toLowerCase().includes(q) ||
          p.material.toLowerCase().includes(q)
      );
    }

    // 2. Shape Filter
    if (filterShapes.length > 0) {
      list = list.filter((p) => filterShapes.includes(p.shape));
    }

    // 3. Material Filter
    if (filterMaterials.length > 0) {
      list = list.filter((p) => filterMaterials.includes(p.material));
    }

    // 4. Sort
    if (sortBy === "price-asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === "name-asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Featured: favorites first
      list.sort((a, b) => {
        const aFav = favorites.includes(a.id) ? 1 : 0;
        const bFav = favorites.includes(b.id) ? 1 : 0;
        return bFav - aFav;
      });
    }

    return list;
  };

  const handleProductAction = (id, type) => {
    const product = getAllProducts().find((p) => p.id === id);
    if (!product) return;

    if (product.type === "saved") {
      localStorage.setItem("opticus_active_design", String(product.savedIndex));
      localStorage.removeItem("opticus_active_product");
    } else {
      localStorage.setItem("opticus_active_product", product.id);
      localStorage.removeItem("opticus_active_design");
    }

    setView("create");
  };

  const handleOpenSavedDesign = (index) => {
    localStorage.setItem("opticus_active_design", String(index));
    localStorage.removeItem("opticus_active_product");
    onCloseDesignsModal();
    setView("create");
  };

  const handleDeleteSavedDesign = (index) => {
    const next = savedDesigns.filter((_, idx) => idx !== index);
    localStorage.setItem("opticus_designs", JSON.stringify(next));
    setSavedDesigns(next);

    const activeIndex = localStorage.getItem("opticus_active_design");
    if (activeIndex !== null && Number(activeIndex) === index) {
      localStorage.removeItem("opticus_active_design");
    }
  };

  const handleTogglePublishDesign = (index) => {
    const next = savedDesigns.map((d, idx) => {
      if (idx === index) {
        return { ...d, published: !d.published };
      }
      return d;
    });
    localStorage.setItem("opticus_designs", JSON.stringify(next));
    setSavedDesigns(next);
  };

  const handleAddToCart = (index) => {
    const design = savedDesigns[index];
    if (!design) return;

    // Calculate premium price matching CreatorStudio logic
    let price = 180;
    if (design.isSunglasses) price += 40;
    if (design.frameProfile === "bold") price += 20;
    if (design.antiReflective) price += 15;

    const cartItem = {
      id: design.id || `design-${index}-${Date.now()}`,
      productName: design.name || `Design #${index + 1}`,
      factoryId: "factory-demo",
      factoryName: "Demo Factory",
      total: price,
      customSpecs: {
        model: design.model || "round",
        color: design.color || "#000000",
        profile: design.frameProfile || "standard",
        templeStyle: design.templeStyle || "standard",
        bridgeStyle: design.bridgeStyle || "standard",
        isSunglasses: !!design.isSunglasses,
        antiReflective: !!design.antiReflective,
        prescriptionUploaded: !!design.prescriptionFileName
      }
    };

    addToCart(cartItem);
    
    // Show toast message
    setToastMessage(t("cart-item-added"));
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  const filteredList = getFilteredProducts();

  return (
    <div className="page-marketplace">
      <div className="page-wrapper">
        <section className="hero hero-marketplace">
          <div className="hero-copy">
            <span className="eyebrow">{t("hero-eyebrow-marketplace")}</span>
            <h1>{t("hero-title-marketplace").toUpperCase()}</h1>
            <p>{t("hero-desc-marketplace")}</p>
            <div className="hero-actions">
              <button className="btn primary hero-btn" onClick={() => setView("create")}>
                <Sparkles size={16} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                {t("btn-start-studio")}
              </button>
              <button className="btn hero-btn" onClick={() => {
                const modal = document.getElementById("designsModal");
                if (modal) modal.classList.add("open");
              }}>
                <FolderHeart size={16} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                {t("btn-open-saved")}
              </button>
            </div>
          </div>

          <div className="hero-panel">
            <div className="hero-card">
              <span className="hero-card-label">{t("hero-card-label")}</span>
              <strong>{t("hero-card-title")}</strong>
              <p>{t("hero-card-desc")}</p>
            </div>
            <div className="hero-stats">
              <div>
                <strong>3+</strong>
                <span>base models</span>
              </div>
              <div>
                <strong>Live</strong>
                <span>community designs</span>
              </div>
              <div>
                <strong>3D</strong>
                <span>preview workflow</span>
              </div>
            </div>
          </div>
        </section>

        <main className="marketplace" style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "30px", marginTop: "40px" }}>
          <aside className="filters">
            <div className="panel-kicker">{t("filter-refine")}</div>
            <h3>{t("filter-by")}</h3>

            <div className="filter-group" style={{ margin: "20px 0" }}>
              <p style={{ fontWeight: "600", marginBottom: "10px", fontSize: "12px", textTransform: "uppercase" }}>{t("filter-shape")}</p>
              <label style={{ display: "block", marginBottom: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  value="round"
                  style={{ marginRight: "8px" }}
                  checked={filterShapes.includes("round")}
                  onChange={() => handleShapeFilterChange("round")}
                />{" "}
                Round
              </label>
              <label style={{ display: "block", marginBottom: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  value="square"
                  style={{ marginRight: "8px" }}
                  checked={filterShapes.includes("square")}
                  onChange={() => handleShapeFilterChange("square")}
                />{" "}
                Square
              </label>
            </div>

            <div className="filter-group" style={{ margin: "20px 0" }}>
              <p style={{ fontWeight: "600", marginBottom: "10px", fontSize: "12px", textTransform: "uppercase" }}>{t("filter-material")}</p>
              <label style={{ display: "block", marginBottom: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  value="metal"
                  style={{ marginRight: "8px" }}
                  checked={filterMaterials.includes("metal")}
                  onChange={() => handleMaterialFilterChange("metal")}
                />{" "}
                Metal
              </label>
              <label style={{ display: "block", marginBottom: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  value="acetate"
                  style={{ marginRight: "8px" }}
                  checked={filterMaterials.includes("acetate")}
                  onChange={() => handleMaterialFilterChange("acetate")}
                />{" "}
                Acetate
              </label>
            </div>

            <button id="clearFilters" className="btn" style={{ width: "100%", marginTop: "10px" }} onClick={handleClearFilters}>
              CLEAR FILTERS
            </button>
          </aside>

          <section className="catalog">
            <div className="catalog-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "20px" }}>
              <div className="toolbar-copy">
                <span className="panel-kicker">Catalog</span>
                <h2>Discover standout shapes and materials</h2>
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "13px", color: "var(--color-hint)" }} />
                  <input
                    type="text"
                    id="searchInput"
                    className="search-input"
                    placeholder="Search designs..."
                    style={{ paddingLeft: "30px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: "6px", height: "38px" }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <select
                  id="sortSelect"
                  className="sort-select"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: "6px", height: "38px", padding: "0 10px" }}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                </select>
              </div>
            </div>

            <section className="products" id="productGrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }}>
              {filteredList.length === 0 ? (
                <div className="empty-state" style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 0" }}>
                  <h3>No designs found</h3>
                  <p>Try changing the filters or search term.</p>
                </div>
              ) : (
                filteredList.map((p) => {
                  const isFav = favorites.includes(p.id);
                  return (
                    <article key={p.id} className="product-card" style={{ position: "relative" }}>
                      <button
                        className={`favorite-btn ${isFav ? "active" : ""}`}
                        style={{ position: "absolute", top: "12px", right: "12px", background: "none", border: "none", cursor: "pointer", zIndex: "5" }}
                        onClick={() => toggleFavorite(p.id)}
                        aria-label="Favorite"
                      >
                        <Heart size={18} fill={isFav ? "var(--primary-accent)" : "none"} color={isFav ? "var(--primary-accent)" : "#fff"} />
                      </button>

                      <div className="product-badge">{p.badge}</div>

                      <ThreePreview shape={p.shape} material={p.material} />

                      <div className="product-meta" style={{ padding: "16px" }}>
                        <div className="product-topline" style={{ display: "flex", gap: "10px", fontSize: "11px", textTransform: "uppercase", color: "var(--color-hint)", marginBottom: "6px" }}>
                          <span>{p.shape}</span>
                          <span>{p.material}</span>
                        </div>

                        <h3 style={{ fontSize: "16px", margin: "0 0 8px 0" }}>{p.name}</h3>
                        <p className="product-price" style={{ fontWeight: "600", fontSize: "15px", margin: "0 0 16px 0" }}>${Number(p.price).toFixed(2)}</p>

                        <div className="product-actions" style={{ display: "flex", gap: "10px" }}>
                          <button className="btn" style={{ flex: 1 }} onClick={() => handleProductAction(p.id, "view")}>
                            <Eye size={14} style={{ marginRight: "4px", verticalAlign: "middle" }} /> VIEW
                          </button>
                          <button className="btn primary" style={{ flex: 1 }} onClick={() => handleProductAction(p.id, "customize")}>
                            <Edit size={14} style={{ marginRight: "4px", verticalAlign: "middle" }} /> CUSTOMIZE
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </section>
          </section>
        </main>

        {/* Premium Footer */}
        <footer className="marketplace-footer" style={{
          marginTop: "100px",
          padding: "80px 40px 40px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "40px",
          background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)"
        }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", marginBottom: "20px" }}>OPTICUS</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: "1.6" }}>
              Redefining luxury eyewear through cutting-edge 3D customization and premium materials.
            </p>
          </div>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: "20px", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.1em" }}>Collections</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
              <li><a href="#" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "14px" }}>Titanium Series</a></li>
              <li><a href="#" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "14px" }}>Classic Acetate</a></li>
              <li><a href="#" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "14px" }}>Polarized Sun</a></li>
              <li><a href="#" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "14px" }}>Limited Editions</a></li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: "20px", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.1em" }}>Support</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
              <li><a href="#" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "14px" }}>Care Guide</a></li>
              <li><a href="#" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "14px" }}>Warranty</a></li>
              <li><a href="#" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "14px" }}>Shipping</a></li>
              <li><a href="#" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "14px" }}>Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: "20px", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.1em" }}>Newsletter</h4>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "16px" }}>Subscribe for exclusive designs and early access.</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="email" placeholder="Your email" style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }} />
              <button className="btn primary" style={{ padding: "0 16px" }}>Join</button>
            </div>
          </div>
          <div style={{ gridColumn: "1/-1", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "30px", marginTop: "20px", display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "12px", flexWrap: "wrap", gap: "10px" }}>
            <span>&copy; {new Date().getFullYear()} OPTICUS LUXURY EYEWEAR. All rights reserved.</span>
            <div style={{ display: "flex", gap: "20px" }}>
              <a href="#" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Privacy Policy</a>
              <a href="#" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Terms of Service</a>
            </div>
          </div>
        </footer>
      </div>

      {/* Designs Modal */}
      <div className={`modal ${showDesignsModal ? "open" : ""}`} id="designsModal" aria-hidden={!showDesignsModal}>
        <div className="modal-card">
          <div className="modal-head">
            <h3>MY DESIGNS</h3>
            <button className="modal-close" onClick={onCloseDesignsModal} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="modal-body" id="designsList">
            {savedDesigns.length === 0 ? (
              <p className="hint">No saved designs yet. Create one in the STUDIO.</p>
            ) : (
              savedDesigns.map((design, index) => (
                <div key={index} className="design-row" style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", alignItems: "center" }}>
                  <div className="meta">
                    <strong>{design.name || `Design #${index + 1}`}</strong>
                    <div className="design-summary" style={{ fontSize: "12px", color: "var(--color-hint)", marginTop: "4px" }}>
                      {design.model || "custom"} | color: {design.color} | Sunglasses: {design.isSunglasses ? "Yes" : "No"}
                    </div>
                    <div className="design-status" style={{ fontSize: "11px", color: "var(--primary-accent)", marginTop: "2px" }}>
                      {design.published ? "Published" : "Private"}
                    </div>
                  </div>
                  <div className="actions" style={{ display: "flex", gap: "6px" }}>
                    <button
                      className="btn primary"
                      style={{ backgroundColor: "var(--primary-accent)", borderColor: "var(--primary-accent)", color: "#fff" }}
                      onClick={() => handleAddToCart(index)}
                    >
                      {t("btn-add-to-cart")}
                    </button>
                    <button className="btn primary" onClick={() => handleOpenSavedDesign(index)}>
                      OPEN
                    </button>
                    <button className="btn" onClick={() => handleTogglePublishDesign(index)}>
                      {design.published ? "UNPUBLISH" : "PUBLISH"}
                    </button>
                    <button className="btn" onClick={() => handleDeleteSavedDesign(index)}>
                      DELETE
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {toastMessage && (
        <div style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          background: "rgba(22, 27, 34, 0.95)",
          border: "1px solid var(--primary-accent)",
          boxShadow: "0 0 20px var(--primary-accent)",
          padding: "16px 24px",
          borderRadius: "8px",
          color: "#fff",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          backdropFilter: "blur(10px)",
          fontSize: "14px",
          fontWeight: "600"
        }}>
          <Sparkles size={16} color="var(--primary-accent)" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
