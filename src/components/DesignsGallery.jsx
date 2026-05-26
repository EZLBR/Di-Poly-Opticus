import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../contexts/LanguageContext";
import { Sparkles, Trash2, Edit, ShoppingCart } from "lucide-react";
import * as THREE from "three";

// Reusing the robust ThreePreview logic from Marketplace
function ThreePreview({ shape, material }) {
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const width = 280;
    const height = 180;

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

  return <div ref={containerRef} className="card-preview three-preview" style={{ height: "180px", display: "flex", justifyContent: "center" }} />;
}

export default function DesignsGallery({ setView }) {
  const { session, designs, deleteBackendDesign, addToCart, isBackendConnected } = useAuth();
  const { t, language } = useTranslation();

  const handleOpenDesign = (index) => {
    localStorage.setItem("opticus_active_design", String(index));
    localStorage.removeItem("opticus_active_product");
    setView("create");
  };

  const handleDelete = async (index) => {
    const design = designs[index];
    if (isBackendConnected && design.id) {
      await deleteBackendDesign(design.id);
    } else {
      // Fallback local delete
      const next = designs.filter((_, idx) => idx !== index);
      localStorage.setItem("opticus_designs", JSON.stringify(next));
      window.location.reload(); // Quick refresh for fallback state
    }
    
    // Clear active design if it was the one deleted
    const activeIndex = localStorage.getItem("opticus_active_design");
    if (activeIndex !== null && Number(activeIndex) === index) {
      localStorage.removeItem("opticus_active_design");
    }
  };

  const handleAddToCart = (design) => {
    let price = 180;
    if (design.isSunglasses) price += 40;
    if (design.frameProfile === "bold") price += 20;
    if (design.antiReflective) price += 15;

    const cartItem = {
      id: design.id || `design-${Date.now()}`,
      productName: design.name || "Custom Design",
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
    alert(t("cart-item-added") || "Added to cart!");
  };

  if (!session) {
    return (
      <div className="page-wrapper" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <div className="empty-state" style={{ textAlign: "center" }}>
          <h2>Authentication Required</h2>
          <p>Please log in to view your saved designs.</p>
          <button className="btn primary" onClick={() => setView("login")} style={{ marginTop: "20px" }}>Log In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-marketplace">
      <div className="page-wrapper">
        <section className="hero hero-marketplace" style={{ minHeight: "30vh", paddingBottom: "40px" }}>
          <div className="hero-copy">
            <span className="eyebrow">My Collection</span>
            <h1>YOUR DESIGNS</h1>
            <p>Access, edit, and order the custom eyewear you have crafted in the Opticus Studio.</p>
            <div className="hero-actions">
              <button className="btn primary hero-btn" onClick={() => setView("create")}>
                <Sparkles size={16} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                CREATE NEW
              </button>
            </div>
          </div>
        </section>

        <section className="products" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "30px", marginTop: "40px" }}>
          {designs.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: "1/-1", textAlign: "center", padding: "100px 0", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.1)" }}>
              <h3 style={{ marginBottom: "10px" }}>No designs saved yet</h3>
              <p style={{ color: "var(--color-hint)" }}>Open the Studio to start crafting your perfect frame.</p>
            </div>
          ) : (
            designs.map((design, index) => {
              const shape = design.model || "round";
              const material = design.isSunglasses ? "metal" : "acetate";
              const dateObj = design.created_at ? new Date(design.created_at) : new Date();

              return (
                <article key={design.id || index} className="product-card" style={{ display: "flex", flexDirection: "column" }}>
                  <div className="product-badge" style={{ left: "12px", right: "auto", background: "var(--primary-accent)", color: "#fff" }}>
                    {design.published ? "Published" : "Private"}
                  </div>
                  
                  <button 
                    onClick={() => handleDelete(index)}
                    style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(255,0,0,0.2)", color: "#ff4444", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10 }}
                    title="Delete Design"
                  >
                    <Trash2 size={14} />
                  </button>

                  <ThreePreview shape={shape} material={material} />

                  <div className="product-meta" style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <div className="product-topline" style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", textTransform: "uppercase", color: "var(--color-hint)", marginBottom: "8px" }}>
                      <span>{dateObj.toLocaleDateString()}</span>
                      <span>{shape} / {material}</span>
                    </div>

                    <h3 style={{ fontSize: "18px", margin: "0 0 16px 0" }}>{design.name || `Custom Design #${index + 1}`}</h3>

                    <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <button className="btn" style={{ width: "100%", justifyContent: "center" }} onClick={() => handleOpenDesign(index)}>
                        <Edit size={14} style={{ marginRight: "6px" }} /> EDIT IN STUDIO
                      </button>
                      <button className="btn primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => handleAddToCart(design)}>
                        <ShoppingCart size={14} style={{ marginRight: "6px" }} /> ADD TO CART
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
