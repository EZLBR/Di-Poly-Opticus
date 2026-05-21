import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../contexts/LanguageContext";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Info, AlertCircle } from "lucide-react";

// Spinning 3D Preview specialized for Cart items: shows the exact custom color and lens type
function ThreePreview({ shape, color, isSunglasses }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = 160;
    const height = 120;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 0.1, 4.0);

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

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color || "#111827"),
      roughness: 0.35,
      metalness: 0.25
    });

    const lensMaterial = new THREE.MeshPhysicalMaterial({
      color: isSunglasses ? 0x111111 : 0x9fb3c8,
      transmission: isSunglasses ? 0.1 : 0.75,
      transparent: true,
      opacity: isSunglasses ? 0.9 : 0.45,
      roughness: 0.08,
      metalness: 0.1,
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
      // Square default
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
    group.rotation.x = -0.15;
    group.rotation.y = 0.45;

    scene.add(group);

    let animationFrameId;
    let isHovered = false;

    const animate = () => {
      group.rotation.y += isHovered ? 0.025 : 0.007;
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
      if (container) {
        container.removeEventListener("mouseenter", handleMouseEnter);
        container.removeEventListener("mouseleave", handleMouseLeave);
      }
      renderer.dispose();
      group.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      if (container && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [shape, color, isSunglasses]);

  return <div ref={containerRef} style={{ width: "160px", height: "120px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden" }} />;
}

export default function Cart({ setView }) {
  const { cart, removeFromCart, updateCartQty, clearCart, checkoutCart, session } = useAuth();
  const { t, language } = useTranslation();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 4500);
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + Number(item.total) * (item.quantity || 1), 0);
  };

  const handleQtyChange = (itemId, currentQty, delta) => {
    const nextQty = currentQty + delta;
    if (nextQty >= 1) {
      updateCartQty(itemId, nextQty);
    }
  };

  const handleCheckout = async () => {
    if (!session) {
      alert(
        language === "pt"
          ? "Você precisa estar conectado para finalizar uma compra."
          : "You need to log in to complete your checkout."
      );
      setView("login");
      return;
    }

    setCheckoutLoading(true);

    try {
      const result = await checkoutCart(cart);

      if (result && result.success) {
        if (result.isOffline) {
          showToast(t("toast-offline-checkout"));
          setTimeout(() => {
            setView("marketplace");
          }, 2000);
        } else if (result.checkoutUrl) {
          // Redirect the browser window to AbacatePay checkout page (real or simulated)
          window.location.href = result.checkoutUrl;
        }
      } else {
        alert(
          language === "pt"
            ? "Ocorreu um erro ao finalizar o pagamento."
            : "An error occurred during checkout initialization."
        );
      }
    } catch (err) {
      console.error("Checkout process failed:", err);
      alert(
        language === "pt"
          ? "Não foi possível conectar ao servidor de pagamentos."
          : "Could not connect to the payment server."
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto" }}>
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
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          backdropFilter: "blur(10px)",
          fontSize: "14px",
          fontWeight: "600",
          animation: "slideIn 0.3s ease"
        }}>
          <Info size={16} color="var(--primary-accent)" />
          {toastMessage}
        </div>
      )}

      <div className="cart-header" style={{ marginBottom: "32px" }}>
        <span className="eyebrow" style={{ color: "var(--primary-accent)", fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase" }}>
          {t("hero-eyebrow-marketplace")}
        </span>
        <h1 style={{ fontSize: "36px", fontWeight: "700", marginTop: "8px" }}>
          {t("cart-title").toUpperCase()}
        </h1>
      </div>

      {cart.length === 0 ? (
        <div className="premium-glass-card" style={{
          padding: "80px 40px",
          textAlign: "center",
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.06)"
        }}>
          <div style={{
            background: "rgba(255, 255, 255, 0.03)",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px auto",
            border: "1px solid rgba(255,255,255,0.08)"
          }}>
            <ShoppingBag size={36} color="var(--color-hint)" />
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: "600", marginBottom: "12px" }}>
            {t("cart-empty")}
          </h2>
          <p style={{ color: "var(--color-hint)", fontSize: "14px", maxWidth: "400px", margin: "0 auto 32px auto", lineHeight: "1.6" }}>
            {language === "pt"
              ? "Navegue pelo nosso catálogo ou abra o estúdio 3D para criar um modelo personalizado exclusivo para você!"
              : "Browse our catalog or open the 3D studio to create an exclusive customized model built just for you!"}
          </p>
          <button className="btn primary" onClick={() => setView("marketplace")} style={{ padding: "12px 32px", fontSize: "14px", fontWeight: "600" }}>
            {language === "pt" ? "VOLTAR PARA O CATÁLOGO" : "GO TO MARKETPLACE"}
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "30px", alignItems: "start" }}>
          
          {/* Cart Items List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {cart.map((item) => {
              const specs = item.customSpecs || {};
              const shape = specs.model || "round";
              const color = specs.color || "#000000";
              const isSun = !!specs.isSunglasses;

              return (
                <div 
                  key={item.id} 
                  className="premium-glass-card" 
                  style={{
                    display: "flex",
                    padding: "20px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.06)",
                    alignItems: "center",
                    gap: "24px"
                  }}
                >
                  <ThreePreview shape={shape} color={color} isSunglasses={isSun} />
                  
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 6px 0" }}>
                      {item.productName}
                    </h3>
                    <p style={{ color: "var(--color-hint)", fontSize: "12px", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "1px" }}>
                      {t("journey-03-title")} &bull; {item.factoryName || "Opticus Partner"}
                    </p>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        fontSize: "11px",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        color: "var(--text-light)"
                      }}>
                        {language === "pt" ? "Forma: " : "Shape: "}{shape.toUpperCase()}
                      </span>
                      <span style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        fontSize: "11px",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}>
                        {language === "pt" ? "Cor: " : "Color: "}
                        <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: color, border: "1px solid rgba(255,255,255,0.2)" }} />
                        {color}
                      </span>
                      <span style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        fontSize: "11px",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        color: isSun ? "#f59e0b" : "var(--color-hint)"
                      }}>
                        {isSun ? (language === "pt" ? "Óculos de Sol" : "Sunglasses") : (language === "pt" ? "Grau/Claro" : "Clear Lens")}
                      </span>
                      {specs.antiReflective && (
                        <span style={{
                          background: "rgba(34,197,94,0.08)",
                          border: "1px solid rgba(34,197,94,0.15)",
                          fontSize: "11px",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          color: "#22c55e"
                        }}>
                          Anti-Reflexo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      border: "1px solid rgba(255,255,255,0.08)", 
                      background: "rgba(255,255,255,0.02)", 
                      borderRadius: "6px",
                      padding: "4px"
                    }}>
                      <button 
                        onClick={() => handleQtyChange(item.id, item.quantity || 1, -1)}
                        style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", padding: "6px" }}
                        disabled={(item.quantity || 1) <= 1}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{ padding: "0 12px", fontWeight: "600", fontSize: "14px", minWidth: "20px", textAlign: "center" }}>
                        {item.quantity || 1}
                      </span>
                      <button 
                        onClick={() => handleQtyChange(item.id, item.quantity || 1, 1)}
                        style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", padding: "6px" }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div style={{ fontSize: "16px", fontWeight: "700", minWidth: "80px", textAlign: "right" }}>
                      R$ {(Number(item.total) * (item.quantity || 1)).toFixed(2)}
                    </div>

                    <button 
                      className="btn" 
                      onClick={() => {
                        removeFromCart(item.id);
                        showToast(t("cart-item-removed"));
                      }}
                      style={{ 
                        background: "rgba(239, 68, 68, 0.08)", 
                        border: "1px solid rgba(239, 68, 68, 0.15)",
                        padding: "10px", 
                        borderRadius: "6px", 
                        cursor: "pointer", 
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ef4444"
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
              <button 
                className="btn" 
                onClick={() => setView("marketplace")}
                style={{ padding: "10px 20px", fontSize: "13px", fontWeight: "600" }}
              >
                {language === "pt" ? "CONTINUAR COMPRANDO" : "CONTINUE SHOPPING"}
              </button>
              <button 
                className="btn" 
                onClick={() => {
                  clearCart();
                  showToast(t("cart-empty"));
                }}
                style={{ padding: "10px 20px", fontSize: "13px", color: "#ef4444", background: "none", border: "none" }}
              >
                {t("cart-clear").toUpperCase()}
              </button>
            </div>
          </div>

          {/* Cart Summary & Checkout Panel */}
          <aside className="premium-glass-card" style={{
            padding: "24px",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(22, 27, 34, 0.4)",
            backdropFilter: "blur(16px)"
          }}>
            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "12px" }}>
              {language === "pt" ? "RESUMO DO PEDIDO" : "ORDER SUMMARY"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "var(--color-hint)" }}>
                <span>{language === "pt" ? "Total de itens:" : "Total items:"}</span>
                <span>{cart.reduce((sum, item) => sum + (item.quantity || 1), 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "var(--color-hint)" }}>
                <span>{language === "pt" ? "Envio:" : "Shipping:"}</span>
                <span style={{ color: "#22c55e", fontWeight: "600" }}>{language === "pt" ? "GRÁTIS (SEDEX)" : "FREE EXPRESS"}</span>
              </div>
              
              <div style={{ borderTop: "1px dashed rgba(255,255,255,0.08)", margin: "8px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "16px", fontWeight: "600" }}>{t("cart-subtotal")}</span>
                <span style={{ fontSize: "24px", fontWeight: "700", color: "#22c55e" }}>
                  R$ {getSubtotal().toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment security info */}
            <div style={{
              display: "flex",
              gap: "10px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "24px",
              fontSize: "12px",
              lineHeight: "1.4",
              color: "var(--color-hint)"
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, color: "var(--primary-accent)", marginTop: "2px" }} />
              <div>
                {language === "pt" 
                  ? "Pagamento seguro Pix processado através da AbacatePay. O pedido é enviado diretamente para a fábrica após a aprovação do Pix."
                  : "Secure Pix payment processed through AbacatePay. Orders are forwarded directly to production upon Pix validation."}
              </div>
            </div>

            <button 
              className="btn primary" 
              onClick={handleCheckout}
              disabled={checkoutLoading}
              style={{
                width: "100%",
                padding: "16px",
                fontSize: "14px",
                fontWeight: "700",
                letterSpacing: "1px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                borderColor: "#22c55e",
                color: "#fff",
                borderRadius: "8px",
                boxShadow: "0 0 20px rgba(34, 197, 94, 0.35)",
                cursor: "pointer"
              }}
            >
              {checkoutLoading ? (
                language === "pt" ? "PROCESSANDO..." : "PROCESSING..."
              ) : (
                <>
                  {t("cart-checkout")}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
