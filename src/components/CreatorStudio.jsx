import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import CreatorCanvas from "./creator/CreatorCanvas";
import { useCreator } from "../contexts/CreatorContext";
import { useTranslation } from "../contexts/LanguageContext";
import ConfigSidebar from "./creator/ConfigSidebar";
import FinishSidebar from "./creator/FinishSidebar";
import { 
  Camera, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  ArrowLeft, 
  ArrowRight, 
  Download, 
  Check, 
  Upload, 
  Sparkles, 
  Trash2, 
  Sliders, 
  Box, 
  ShieldCheck,
  ShoppingBag,
  HelpCircle,
  X
} from "lucide-react";

// Curated colors for a high-end designer look
const CURATED_COLORS = [
  { name: "Matte Charcoal", hex: "#111827" },
  { name: "Chambery Crystal", hex: "#dbeafe" },
  { name: "Tortoise Acetate", hex: "#78350f" },
  { name: "Champagne Gold", hex: "#d97706" },
  { name: "Emerald Glaze", hex: "#065f46" },
  { name: "Crimson Lacquer", hex: "#991b1b" },
];

export default function CreatorStudio({ setView, onOpenDesigns }) {
  const { session, designs, saveDesign, isBackendConnected } = useAuth();
  const { addToCart } = useCart();
  const { t, language } = useTranslation();

  const {
    activeStep, setActiveStep,
    model, setModel,
    color, setColor,
    isSunglasses, setIsSunglasses,
    antiReflective, setAntiReflective,
    prescriptionFileName, setPrescriptionFileName,
    templeStyle, setTempleStyle,
    topBar, setTopBar,
    bridgeStyle, setBridgeStyle,
    frameProfile, setFrameProfile,
    templeOpen, setTempleOpen,
    tryOnMode, setTryOnMode,
    loadingLandmarker, setLoadingLandmarker,
    statusMessage, setStatusMessage,
    draftStatus, setDraftStatus,
    designName, setDesignName,
    showSaveModal, setShowSaveModal,
    showOrderModal, setShowOrderModal,
    selectedFactory, setSelectedFactory,
    orderSuccess, setOrderSuccess,
    createdOrderNumber, setCreatedOrderNumber,
    faceDetected, setFaceDetected,
    aiSuggestions, setAiSuggestions,
    autoRotate, setAutoRotate,
    environment, setEnvironment,
    showToast,
    resetDraft
  } = useCreator();

  // --- Three.js & Try-on Viewport References ---
  const handleOrderSubmission = () => {
    const factoryMap = {
      "factory-rayban": "Ray-Ban Factory",
      "factory-oakley": "Oakley Factory",
      "factory-demo": "Demo Factory"
    };

    // Calculate premium price
    let basePrice = 180;
    if (isSunglasses) basePrice += 40;
    if (frameProfile === "bold") basePrice += 20;
    if (antiReflective) basePrice += 15;

    const orderData = {
      customerName: session ? session.name : "Custom Client",
      productName: `Customized ${model.toUpperCase()} Opticus`,
      factoryId: selectedFactory,
      factoryName: factoryMap[selectedFactory],
      status: "Queued",
      total: basePrice,
      customSpecs: {
        model,
        color,
        profile: frameProfile,
        templeStyle,
        bridgeStyle,
        isSunglasses,
        antiReflective,
        prescriptionUploaded: !!prescriptionFileName
      }
    };

    const result = placeOrder(orderData);
    if (result && result.id) {
      setCreatedOrderNumber(result.id);
      setOrderSuccess(true);
      showToast(language === "pt" ? "Pedido encaminhado à fábrica!" : "Order dispatched to factory!");
    }
  };

  return (
    <div className="page-create">
      {/* Toast Notifier */}
      {statusMessage && (
        <div 
          style={{
            position: "fixed",
            bottom: "30px",
            right: "30px",
            background: "rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            padding: "16px 24px",
            borderRadius: "8px",
            color: "#fff",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            animation: "slideInUp 0.3s ease-out"
          }}
        >
          <Sparkles size={18} style={{ color: "var(--primary-accent)" }} />
          <span style={{ fontSize: "14px", fontWeight: "600" }}>{statusMessage}</span>
        </div>
      )}

      <div className="page-wrapper">
        {/* Header Hero Section */}
        <section className="hero hero-studio" style={{ padding: "40px 0" }}>
          <div className="hero-copy">
            <span className="eyebrow">{t("hero-eyebrow-studio")}</span>
            <h1>{language === "pt" ? "ESTÚDIO DE DESIGN 3D" : "3D DESIGN STUDIO"}</h1>
            <p>
              {language === "pt" 
                ? "Escolha a silhueta, defina materiais e visualize instantaneamente pelo simulador 3D ou câmera."
                : "Select the silhouette, configure materials and inspect live via 3D or webcam try-on."}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button className="btn" onClick={() => setView("marketplace")}>
              <ArrowLeft size={16} style={{ marginRight: "6px" }} /> {t("nav-explore")}
            </button>
            <button 
              className="btn" 
              onClick={() => {
                localStorage.setItem("opticus_show_designs_modal", "true");
                setView("marketplace");
              }}
            >
              {t("btn-open-saved")}
            </button>
          </div>
        </section>

        {/* 2-Step simplified Progress Tracker */}
        <div 
          className="step-progress-container premium-glass-card" 
          style={{
            borderRadius: "8px",
            padding: "16px 30px",
            marginBottom: "30px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", gap: "24px" }}>
            <div 
              onClick={() => setActiveStep(1)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                opacity: activeStep === 1 ? 1 : 0.4,
                transition: "opacity 0.2s"
              }}
            >
              <span 
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: activeStep === 1 ? "var(--primary-accent)" : "var(--input-border)",
                  color: activeStep === 1 ? "#fff" : "var(--text-gray)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: "700"
                }}
              >
                1
              </span>
              <strong style={{ fontSize: "14px", letterSpacing: "1px" }}>{t("step-shape").toUpperCase()}</strong>
            </div>

            <div 
              onClick={() => setActiveStep(2)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                opacity: activeStep === 2 ? 1 : 0.4,
                transition: "opacity 0.2s"
              }}
            >
              <span 
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: activeStep === 2 ? "var(--primary-accent)" : "var(--input-border)",
                  color: activeStep === 2 ? "#fff" : "var(--text-gray)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: "700"
                }}
              >
                2
              </span>
              <strong style={{ fontSize: "14px", letterSpacing: "1px" }}>{t("step-finish").toUpperCase()}</strong>
            </div>
          </div>

          <div style={{ fontSize: "11px", color: "var(--color-hint)", display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={14} style={{ color: "var(--primary-accent)" }} />
            <span>{draftStatus}</span>
          </div>
        </div>

        {/* Main interactive grid */}
        <main 
          className="creator-workspace-grid" 
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr",
            gap: "30px",
            alignItems: "start"
          }}
        >
          {/* LEFT COLUMN: 3D Viewport & Webcam */}
          <div className="viewport premium-glass-card" style={{ display: "flex", flexDirection: "column", height: "600px", padding: 0, overflow: "hidden", position: "relative" }}>
            
            {/* Animated Cinematic Background Orbs */}
            {!tryOnMode && (
              <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
                <div style={{
                  position: "absolute",
                  top: "-20%", left: "-10%",
                  width: "70vw", height: "70vw",
                  background: "radial-gradient(circle, rgba(162, 194, 225, 0.12) 0%, transparent 60%)",
                  borderRadius: "50%",
                  filter: "blur(80px)",
                  animation: "floatOrb 20s ease-in-out infinite alternate"
                }} />
                <div style={{
                  position: "absolute",
                  bottom: "-30%", right: "-10%",
                  width: "60vw", height: "60vw",
                  background: "radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 60%)",
                  borderRadius: "50%",
                  filter: "blur(60px)",
                  animation: "floatOrb 15s ease-in-out infinite alternate-reverse"
                }} />
                <style>{`
                  @keyframes floatOrb {
                    0% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(3%, 5%) scale(1.05); }
                    100% { transform: translate(-2%, 2%) scale(0.95); }
                  }
                `}</style>
              </div>
            )}

            {/* Subtle Corner Watermark Typography */}
            {!tryOnMode && (
              <div 
                className="studio-watermark"
                style={{
                  position: "absolute",
                  bottom: "3vw",
                  right: "2vw",
                  fontSize: "10vw",
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 900,
                  color: "var(--text-dark)",
                  opacity: 0.04,
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                  zIndex: 0,
                  userSelect: "none",
                  letterSpacing: "-0.02em"
                }}
              >
                {model.toUpperCase()}
              </div>
            )}

            {/* Scenario / Environment Toggle */}
            {!tryOnMode && (
              <div 
                style={{
                  position: "absolute",
                  top: "20px",
                  left: "20px",
                  background: "var(--glass-card-bg)",
                  backdropFilter: "blur(24px) saturate(180%)",
                  WebkitBackdropFilter: "blur(24px) saturate(180%)",
                  border: "1px solid var(--glass-card-border)",
                  borderRadius: "12px",
                  padding: "8px 12px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  zIndex: 10,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
                }}
              >
                <span className="panel-kicker" style={{ margin: 0, color: "var(--text-dark)", fontSize: "10px" }}>SCENARIO</span>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button 
                    className={`btn ${environment === "studio" ? "primary" : ""}`}
                    style={{ height: "24px", padding: "0 8px", fontSize: "11px" }}
                    onClick={() => setEnvironment("studio")}
                  >Studio</button>
                  <button 
                    className={`btn ${environment === "wood" ? "primary" : ""}`}
                    style={{ height: "24px", padding: "0 8px", fontSize: "11px" }}
                    onClick={() => setEnvironment("wood")}
                  >Wood</button>
                  <button 
                    className={`btn ${environment === "marble" ? "primary" : ""}`}
                    style={{ height: "24px", padding: "0 8px", fontSize: "11px" }}
                    onClick={() => setEnvironment("marble")}
                  >Marble</button>
                </div>
              </div>
            )}

            {/* Floating Technical Specs Panel */}
            {!tryOnMode && (
              <div
                className="studio-specs-panel"
                style={{
                  position: "absolute",
                  top: "25%",
                  left: "20px",
                  background: "var(--glass-card-bg)",
                  backdropFilter: "blur(24px) saturate(180%)",
                  WebkitBackdropFilter: "blur(24px) saturate(180%)",
                  border: "1px solid var(--glass-card-border)",
                  borderRadius: "16px",
                  padding: "20px",
                  width: "220px",
                  zIndex: 10,
                  boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                  animation: "slideInLeftStudio 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.8s both"
                }}
              >
                <span style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-gray)", marginBottom: "16px", display: "block", fontWeight: 600 }}>Technical Specs</span>
                
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-gray)", marginBottom: "2px" }}>Base Material</div>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-dark)", textTransform: "capitalize" }}>
                    {color.includes('#6') || color.includes('#9') ? "Metal Alloy" : "Premium Acetate"}
                  </div>
                </div>
                
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-gray)", marginBottom: "2px" }}>Total Weight</div>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-dark)" }}>
                    {color.includes('#6') || color.includes('#9') ? "16.8g (Ultra-light)" : "22.4g (Balanced)"}
                  </div>
                </div>
                
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-gray)", marginBottom: "2px" }}>Lenses</div>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-dark)" }}>{isSunglasses ? "UV400 Polarized" : "Clear CR-39"}</div>
                </div>
                
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-gray)", marginBottom: "2px" }}>Est. Price</div>
                  <div style={{ fontSize: "20px", fontWeight: 600, color: "var(--primary-accent)", fontFamily: "'Playfair Display', serif" }}>
                    ${(180 + (isSunglasses ? 40 : 0) + (frameProfile === 'bold' ? 20 : 0) + (antiReflective ? 15 : 0)).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            <CreatorCanvas />
            
            {/* Viewport footer actions & Smart Face Recognition Advice */}
            <div className="studio-left-panel" style={{ zIndex: 10, position: "absolute", bottom: 0, left: 0, right: 0 }}>
              <div 
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", gap: "6px" }}>
                  <button 
                    className="btn primary"
                    onClick={() => setShowSaveModal(true)}
                  >
                    <Check size={14} style={{ marginRight: "4px" }} />
                    {language === "pt" ? "SALVAR PROJETO" : "SAVE DESIGN"}
                  </button>
                </div>
              </div>

              {tryOnMode && aiSuggestions.length > 0 && (
                <div 
                  style={{
                    background: "rgba(24, 59, 86, 0.08)",
                    borderTop: "1px solid var(--glass-card-border)",
                    padding: "16px 20px"
                  }}
                >
                  <span className="panel-kicker" style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--primary-accent)" }}>
                    <Sparkles size={12} /> AI Styling Assistant
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px", marginTop: "8px" }}>
                    {aiSuggestions.map((s, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          fontSize: "12px", 
                          color: "var(--text-dark)", 
                          opacity: 0.85,
                          lineHeight: "1.4",
                          display: "flex",
                          gap: "6px"
                        }}
                      >
                        <span style={{ color: "var(--primary-accent)" }}>•</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Control Panel (Step 1 or Step 2) */}
          <div 
            className="controls-container premium-glass-card" 
            style={{
              borderRadius: "12px",
              padding: "30px",
              minHeight: "500px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}
          >
            <div>
              {/* STEP 1: Silhouette Shape Configuration */}
                  {activeStep === 1 && <ConfigSidebar />}

              {/* STEP 2: Finish & Material Configuration */}
                  {activeStep === 2 && <FinishSidebar />}
            </div>

            {/* Stepper Navigation Buttons */}
            <div 
              style={{
                borderTop: "1px solid var(--input-border)",
                paddingTop: "24px",
                marginTop: "30px",
                display: "flex",
                justifyContent: "space-between"
              }}
            >
              <button 
                className="btn"
                onClick={() => { if (activeStep > 1) setActiveStep(activeStep - 1); }}
                disabled={activeStep === 1}
              >
                <ArrowLeft size={16} style={{ marginRight: "4px" }} /> BACK
              </button>

              {activeStep === 2 ? (
                <button 
                  className="btn primary"
                  onClick={() => setShowSaveModal(true)}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Sparkles size={16} /> {language === "pt" ? "SALVAR DESIGN" : "SAVE DESIGN"}
                </button>
              ) : (
                <button 
                  className="btn primary"
                  onClick={() => { if (activeStep < 2) setActiveStep(activeStep + 1); }}
                  disabled={activeStep === 2}
                >
                  NEXT STEP <ArrowRight size={16} style={{ marginLeft: "4px" }} />
                </button>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* --- SAVE MODAL --- */}
      {showSaveModal && (
        <div className="modal open" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-card" style={{ maxWidth: "420px" }}>
            <div className="modal-head" style={{ borderBottom: "1px solid var(--glass-card-border)", paddingBottom: "12px" }}>
              <h3>{language === "pt" ? "SALVAR PROJETO" : "SAVE TO MY DESIGNS"}</h3>
              <button className="modal-close" onClick={() => setShowSaveModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveDesignPayload} style={{ marginTop: "20px" }}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--color-hint)", marginBottom: "8px", textTransform: "uppercase" }}>
                  Design Name
                </label>
                <input 
                  type="text" 
                  value={designName} 
                  onChange={(e) => setDesignName(e.target.value)}
                  placeholder="e.g. Amber Hexagon, Summer Edition"
                  required
                  className="premium-input"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: "14px"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setShowSaveModal(false)}>
                  CANCEL
                </button>
                <button type="submit" className="btn primary" style={{ flex: 1 }}>
                  CONFIRM SAVE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- FACTORY DISPATCH ORDER MODAL --- */}
      {showOrderModal && (
        <div className="modal open" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-card" style={{ maxWidth: "480px" }}>
            <div className="modal-head" style={{ borderBottom: "1px solid var(--glass-card-border)", paddingBottom: "12px" }}>
              <h3>{language === "pt" ? "ENCOMENDA ENVIADA!" : "DISPATCH FACTORY ORDER"}</h3>
              <button className="modal-close" onClick={() => { setShowOrderModal(false); setOrderSuccess(false); }}>
                <X size={18} />
              </button>
            </div>

            {!orderSuccess ? (
              <div style={{ marginTop: "20px" }}>
                <p style={{ fontSize: "13px", color: "var(--color-hint)", marginBottom: "16px" }}>
                  {language === "pt"
                    ? "Transmita as especificações geométricas exatas deste óculos diretamente para as máquinas da fábrica de sua escolha."
                    : "Transmit the exact geometric specifications of this frame directly into the fabrication queues of your choice."}
                </p>

                {/* Specs list */}
                <div style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", padding: "14px", borderRadius: "8px", marginBottom: "20px", boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                    <div><span style={{ color: "var(--color-hint)" }}>Silhouette:</span> <strong style={{ color: "var(--text-dark)" }}>{model.toUpperCase()}</strong></div>
                    <div><span style={{ color: "var(--color-hint)" }}>Color code:</span> <strong style={{ color: "var(--text-dark)" }}>{color.toUpperCase()}</strong></div>
                    <div><span style={{ color: "var(--color-hint)" }}>Profile:</span> <strong style={{ color: "var(--text-dark)" }}>{frameProfile.toUpperCase()}</strong></div>
                    <div><span style={{ color: "var(--color-hint)" }}>Bridge:</span> <strong style={{ color: "var(--text-dark)" }}>{bridgeStyle.toUpperCase()}</strong></div>
                    <div><span style={{ color: "var(--color-hint)" }}>Lenses:</span> <strong style={{ color: "var(--text-dark)" }}>{isSunglasses ? "Sunglasses Tint" : "Clear Lenses"}</strong></div>
                    <div><span style={{ color: "var(--color-hint)" }}>Prescription:</span> <strong style={{ color: "var(--text-dark)" }}>{prescriptionFileName ? "Attached" : "None"}</strong></div>
                  </div>
                </div>

                {/* Factory choice */}
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--color-hint)", marginBottom: "8px", textTransform: "uppercase" }}>
                    Fabrication Partner
                  </label>
                  <select 
                    value={selectedFactory}
                    onChange={(e) => setSelectedFactory(e.target.value)}
                    className="premium-select"
                    style={{
                      width: "100%",
                      padding: "10px",
                      fontSize: "13px"
                    }}
                  >
                    <option value="factory-rayban">Ray-Ban Premium Production (S.P. Facility)</option>
                    <option value="factory-oakley">Oakley Advanced Sports Extrusion</option>
                    <option value="factory-demo">Demo Manufacturing Lab (Fast SLA)</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setShowOrderModal(false)}>
                    CANCEL
                  </button>
                  <button type="button" className="btn primary animate-pulse" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }} onClick={handleOrderSubmission}>
                    <ShoppingBag size={14} /> PLACE ORDER
                  </button>
                </div>
              </div>
            ) : (
              // Order Success Screen
              <div style={{ marginTop: "24px", textAlign: "center", padding: "10px 0" }}>
                <div 
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "2px solid #10b981",
                    color: "#10b981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px"
                  }}
                >
                  <Check size={28} />
                </div>

                <h3 style={{ fontSize: "18px", color: "var(--text-dark)", marginBottom: "8px" }}>
                  {language === "pt" ? "ENCOMENDA ENVIADA!" : "ORDER TRANSMITTED"}
                </h3>
                <p style={{ fontSize: "13px", color: "var(--color-hint)", marginBottom: "20px" }}>
                  {language === "pt"
                    ? `Seu pedido foi enfileirado com sucesso com o ID ${createdOrderNumber}. O andamento pode ser verificado nos painéis.`
                    : `Your customized frame specs are queued successfully under order ID ${createdOrderNumber}. Keep track of progress in dashboards.`}
                </p>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button 
                    type="button" 
                    className="btn" 
                    style={{ flex: 1 }} 
                    onClick={() => { setShowOrderModal(false); setOrderSuccess(false); }}
                  >
                    STAY IN STUDIO
                  </button>
                  <button 
                    type="button" 
                    className="btn primary" 
                    style={{ flex: 1 }} 
                    onClick={() => {
                      setShowOrderModal(false);
                      setOrderSuccess(false);
                      setView("factory-dashboard"); // Redirect to orders
                    }}
                  >
                    GO TO DASHBOARD
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
