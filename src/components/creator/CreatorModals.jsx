import React, { useState } from "react";
import { useCreatorStudio } from "../../contexts/CreatorStudioContext";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { useTranslation } from "../../contexts/LanguageContext";
import { X, Sparkles, Check, ShoppingBag } from "lucide-react";

export function SaveDesignModal({ isOpen, onClose, onOpenDesigns }) {
  const {
    model, frameProfile, frameMaterial, color,
    isSunglasses, lensMaterial, lensTreatments,
    nosePadMaterial, templeTipMaterial, hingeMaterial,
    templeOpen, prescriptionFileName, showToast
  } = useCreatorStudio();
  
  const { saveDesign } = useAuth();
  const { language } = useTranslation();
  const [designName, setDesignName] = useState("");

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    const cleanName = designName.trim();
    if (!cleanName) {
      showToast(language === "pt" ? "Por favor forneça um nome" : "Please provide a design name.");
      return;
    }

    try {
      const activeIndex = localStorage.getItem("opticus_active_design");
      const isNew = activeIndex === null;

      const savedRaw = localStorage.getItem("opticus_designs") || "[]";
      const designs = JSON.parse(savedRaw);
      const activeDesignId = !isNew && designs[parseInt(activeIndex, 10)] ? designs[parseInt(activeIndex, 10)].id : null;
      let finalId = activeDesignId || `design-${Date.now()}`;

      const newDesign = {
        id: finalId,
        name: cleanName,
        model,
        color,
        isSunglasses,
        antiReflective: lensTreatments.includes("anti_reflective"), // Legacy support
        prescriptionFileName,
        templeStyle: "classic", // Legacy support
        topBar: false, // Legacy support
        bridgeStyle: "soft", // Legacy support
        frameProfile,
        templeOpen,
        
        // New features
        frameMaterial,
        lensMaterial,
        lensTreatments,
        nosePadMaterial,
        templeTipMaterial,
        hingeMaterial,

        published: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Se quiser plugar no backend PostgreSQL:
      // O backend pode não ter colunas pra todos os materiais ainda.
      // O payload mínimo está sendo enviado.
      try {
        const backendRes = await saveDesign({
          id: finalId.startsWith("design-") ? null : finalId,
          name: newDesign.name,
          model: newDesign.model,
          color: newDesign.color,
          is_sunglasses: newDesign.isSunglasses,
          anti_reflective: newDesign.antiReflective,
          temple_style: newDesign.templeStyle,
          top_bar: newDesign.topBar,
          bridge_style: newDesign.bridgeStyle,
          frame_profile: newDesign.frameProfile,
          temple_open: newDesign.templeOpen,
          published: newDesign.published
        });

        if (backendRes && backendRes.id) {
          finalId = backendRes.id;
          newDesign.id = finalId;
        }
      } catch (err) {
         console.warn("Backend save failed, saved locally", err);
      }

      if (isNew) {
        designs.push(newDesign);
        localStorage.setItem("opticus_active_design", String(designs.length - 1));
      } else {
        designs[parseInt(activeIndex, 10)] = newDesign;
      }

      localStorage.setItem("opticus_designs", JSON.stringify(designs));
      localStorage.removeItem("opticus_creator_draft"); 
      
      showToast(language === "pt" ? "Design salvo com sucesso!" : "Design saved successfully!");
      onClose();
      if (onOpenDesigns) onOpenDesigns();
    } catch (err) {
      console.error(err);
      showToast("Failed to save design.");
    }
  };

  return (
    <div className="modal open" style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div className="modal-card" style={{ maxWidth: "420px" }}>
        <div className="modal-head" style={{ borderBottom: "1px solid var(--glass-card-border)", paddingBottom: "12px" }}>
          <h3>{language === "pt" ? "SALVAR PROJETO" : "SAVE TO MY DESIGNS"}</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSave} style={{ marginTop: "20px" }}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--color-hint)", marginBottom: "8px", textTransform: "uppercase" }}>
              {language === "pt" ? "Nome do Design" : "Design Name"}
            </label>
            <input 
              type="text" 
              value={designName} 
              onChange={(e) => setDesignName(e.target.value)}
              placeholder="e.g. Amber Hexagon, Summer Edition"
              required
              className="premium-input"
              style={{ width: "100%", padding: "10px 14px", fontSize: "14px" }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" className="btn" style={{ flex: 1 }} onClick={onClose}>
              {language === "pt" ? "CANCELAR" : "CANCEL"}
            </button>
            <button type="submit" className="btn primary" style={{ flex: 1 }}>
              {language === "pt" ? "CONFIRMAR" : "CONFIRM SAVE"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function OrderModal({ isOpen, onClose, onGoToDashboard }) {
  const {
    model, frameProfile, frameMaterial, color,
    isSunglasses, lensMaterial, lensTreatments,
    nosePadMaterial, templeTipMaterial, hingeMaterial,
    prescriptionFileName, showToast
  } = useCreatorStudio();

  const { session } = useAuth();
  const { checkoutCart } = useCart();
  const { language } = useTranslation();

  const [selectedFactory, setSelectedFactory] = useState("factory-rayban");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [createdOrderNumber, setCreatedOrderNumber] = useState(null);

  if (!isOpen) return null;

  const handleOrderSubmission = async () => {
    const factoryMap = {
      "factory-rayban": "Ray-Ban Premium Production",
      "factory-oakley": "Oakley Advanced Sports Extrusion",
      "factory-demo": "Demo Manufacturing Lab"
    };

    let basePrice = 180;
    if (isSunglasses) basePrice += 40;
    if (frameProfile === "bold") basePrice += 20;
    if (lensTreatments.length > 0) basePrice += (lensTreatments.length * 15);
    if (frameMaterial === "titanium" || frameMaterial === "gold" || frameMaterial === "carbon_fiber") basePrice += 80;
    if (lensMaterial === "polycarbonate") basePrice += 30;

    const orderData = {
      customerName: session ? session.name : "Custom Client",
      productName: `Customized ${frameMaterial.toUpperCase()} ${model.toUpperCase()}`,
      factoryId: selectedFactory,
      factoryName: factoryMap[selectedFactory],
      status: "Queued",
      total: basePrice,
      customSpecs: {
        model, color, profile: frameProfile,
        frameMaterial, lensMaterial, lensTreatments,
        nosePadMaterial, templeTipMaterial, hingeMaterial,
        isSunglasses,
        prescriptionUploaded: !!prescriptionFileName
      }
    };

    const result = await checkoutCart([orderData]);
    if (result && result.success && result.createdOrders && result.createdOrders.length > 0) {
      setCreatedOrderNumber(result.createdOrders[0].id);
      setOrderSuccess(true);
      showToast(language === "pt" ? "Pedido encaminhado à fábrica!" : "Order dispatched to factory!");
    } else {
      showToast(language === "pt" ? "Falha ao criar o pedido." : "Failed to place order.");
    }
  };

  return (
    <div className="modal open" style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div className="modal-card" style={{ maxWidth: "480px" }}>
        <div className="modal-head" style={{ borderBottom: "1px solid var(--glass-card-border)", paddingBottom: "12px" }}>
          <h3>{language === "pt" ? "ENCOMENDA DE FÁBRICA" : "DISPATCH FACTORY ORDER"}</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {!orderSuccess ? (
          <div style={{ marginTop: "20px" }}>
            <p style={{ fontSize: "13px", color: "var(--color-hint)", marginBottom: "16px" }}>
              {language === "pt"
                ? "Transmita as especificações exatas (incluindo materiais e tratamentos) para a máquina CNC ou impressora."
                : "Transmit exact specs directly to the CNC machine or factory."}
            </p>

            <div style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", padding: "14px", borderRadius: "8px", marginBottom: "20px", boxShadow: "var(--shadow)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                <div><span style={{ color: "var(--color-hint)" }}>Silhouette:</span> <strong style={{ color: "var(--text-dark)" }}>{model.toUpperCase()}</strong></div>
                <div><span style={{ color: "var(--color-hint)" }}>Material:</span> <strong style={{ color: "var(--text-dark)" }}>{frameMaterial.toUpperCase()}</strong></div>
                <div><span style={{ color: "var(--color-hint)" }}>Color:</span> <strong style={{ color: "var(--text-dark)" }}>{color.toUpperCase()}</strong></div>
                <div><span style={{ color: "var(--color-hint)" }}>Lenses:</span> <strong style={{ color: "var(--text-dark)" }}>{lensMaterial.toUpperCase()}</strong></div>
                <div><span style={{ color: "var(--color-hint)" }}>Treatments:</span> <strong style={{ color: "var(--text-dark)" }}>{lensTreatments.length} selected</strong></div>
                <div><span style={{ color: "var(--color-hint)" }}>Hinges:</span> <strong style={{ color: "var(--text-dark)" }}>{hingeMaterial.toUpperCase()}</strong></div>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--color-hint)", marginBottom: "8px", textTransform: "uppercase" }}>
                Fabrication Partner
              </label>
              <select 
                value={selectedFactory}
                onChange={(e) => setSelectedFactory(e.target.value)}
                className="premium-select"
                style={{ width: "100%", padding: "10px", fontSize: "13px" }}
              >
                <option value="factory-rayban">Ray-Ban Premium Production (S.P. Facility)</option>
                <option value="factory-oakley">Oakley Advanced Sports Extrusion</option>
                <option value="factory-demo">Demo Manufacturing Lab (Fast SLA)</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" className="btn" style={{ flex: 1 }} onClick={onClose}>
                CANCEL
              </button>
              <button type="button" className="btn primary animate-pulse" style={{ flex: 1, display: "flex", alignItems: "center", justifyCenter: "center", gap: "6px" }} onClick={handleOrderSubmission}>
                <ShoppingBag size={14} /> PLACE ORDER
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: "24px", textAlign: "center", padding: "10px 0" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", border: "2px solid #10b981", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Check size={28} />
            </div>
            <h3 style={{ fontSize: "18px", color: "var(--text-dark)", marginBottom: "8px" }}>
              {language === "pt" ? "ENCOMENDA ENVIADA!" : "ORDER TRANSMITTED"}
            </h3>
            <p style={{ fontSize: "13px", color: "var(--color-hint)", marginBottom: "20px" }}>
              {language === "pt"
                ? `Seu pedido foi enfileirado com sucesso com o ID ${createdOrderNumber}.`
                : `Your customized frame specs are queued successfully under order ID ${createdOrderNumber}.`}
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" className="btn" style={{ flex: 1 }} onClick={onClose}>
                STAY IN STUDIO
              </button>
              <button type="button" className="btn primary" style={{ flex: 1 }} onClick={() => { onClose(); onGoToDashboard(); }}>
                GO TO DASHBOARD
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
