import React, { useState, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import Marketplace from "./components/Marketplace";
import CreatorStudio from "./components/CreatorStudio";
import Importer from "./components/Importer";
import AuthPage from "./components/AuthPage";
import { FactoryDashboard, StaffDashboard } from "./components/Dashboards";
import Cart from "./components/Cart";
import { useTranslation } from "./contexts/LanguageContext";
import { Check, X } from "lucide-react";

function App() {
  const [view, setView] = useState("marketplace");
  const [showDesignsModal, setShowDesignsModal] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const { session } = useAuth();
  const { language } = useTranslation();

  // Check for successful payment return redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setShowPaymentSuccess(true);
      // Clean query parameter from URL without page reload
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: newUrl }, "", newUrl);
    }
  }, []);

  // If role changes, or user logs out, redirect to safe view
  useEffect(() => {
    if (!session) {
      // If logged out and on a dashboard, go back to marketplace
      if (view === "factory-dashboard" || view === "staff-dashboard") {
        setView("marketplace");
      }
    } else {
      // If logged in as factory, force dashboard redirection
      if (session.role === "factory" && view !== "factory-dashboard") {
        setView("factory-dashboard");
      }
      // If logged in as staff, direct to staff-dashboard by default if they try to access factory
      if (session.role === "staff" && view === "factory-dashboard") {
        setView("staff-dashboard");
      }
    }
  }, [session, view]);

  // Synchronize body classes for premium background styling
  useEffect(() => {
    document.body.classList.remove("page-marketplace", "page-create");
    if (view === "marketplace" || view === "login" || view === "factory-dashboard" || view === "staff-dashboard" || view === "cart") {
      document.body.classList.add("page-marketplace");
    } else if (view === "create" || view === "import") {
      document.body.classList.add("page-create");
    }
  }, [view]);

  const handleOpenDesigns = () => {
    setView("marketplace");
    // Small timeout to ensure view transitions to marketplace before modal toggles
    setTimeout(() => {
      setShowDesignsModal(true);
    }, 50);
  };

  const renderContent = () => {
    switch (view) {
      case "marketplace":
        return (
          <Marketplace
            setView={setView}
            showDesignsModal={showDesignsModal}
            onCloseDesignsModal={() => setShowDesignsModal(false)}
          />
        );
      case "create":
        return <CreatorStudio setView={setView} onOpenDesigns={handleOpenDesigns} />;
      case "import":
        return <Importer />;
      case "cart":
        return <Cart setView={setView} />;
      case "login":
        return <AuthPage setView={setView} />;
      case "factory-dashboard":
        return <FactoryDashboard />;
      case "staff-dashboard":
        return <StaffDashboard />;
      default:
        return (
          <Marketplace
            setView={setView}
            showDesignsModal={showDesignsModal}
            onCloseDesignsModal={() => setShowDesignsModal(false)}
          />
        );
    }
  };

  return (
    <div className="app-container">
      <Navbar
        currentView={view}
        setView={setView}
        onOpenDesigns={handleOpenDesigns}
      />
      <main className="main-content">
        {renderContent()}
      </main>

      {/* Payment Success Glassmorphic Modal */}
      {showPaymentSuccess && (
        <div className="modal open" style={{ zIndex: 9999, background: "rgba(10, 15, 26, 0.75)", backdropFilter: "blur(12px)" }}>
          <div className="modal-card" style={{ maxWidth: "480px", background: "rgba(22, 27, 34, 0.95)", border: "1px solid rgba(240, 246, 252, 0.1)", borderRadius: "16px" }}>
            <div className="modal-head" style={{ borderBottom: "1px solid rgba(240, 246, 252, 0.08)" }}>
              <h3 style={{ textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: "700", color: "#22c55e" }}>
                {language === "pt" ? "PAGAMENTO VERIFICADO" : "PAYMENT CONFIRMED"}
              </h3>
              <button 
                className="modal-close" 
                onClick={() => setShowPaymentSuccess(false)}
                style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{
                background: "rgba(34, 197, 94, 0.15)",
                color: "#22c55e",
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px auto",
                boxShadow: "0 0 25px rgba(34, 197, 94, 0.2)",
                border: "1px solid rgba(34, 197, 94, 0.3)"
              }}>
                <Check size={36} />
              </div>
              <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "12px", letterSpacing: "-0.5px" }}>
                {language === "pt" ? "Pedido em Produção!" : "Order in Production!"}
              </h2>
              <p style={{ color: "#8b949e", fontSize: "14px", lineHeight: "1.6", marginBottom: "32px" }}>
                {language === "pt" 
                  ? "Excelente! Seu pagamento via Pix foi validado com sucesso através do AbacatePay. O pedido foi recebido e encaminhado para a fila de produção da Fábrica!"
                  : "Excellent! Your Pix payment was validated successfully through AbacatePay. The order has been received and forwarded to the Factory production queue!"}
              </p>
              <button 
                className="btn primary" 
                style={{ width: "100%", padding: "14px", fontWeight: "600", fontSize: "14px", textTransform: "uppercase", background: "#22c55e", borderColor: "#22c55e", color: "#fff" }} 
                onClick={() => setShowPaymentSuccess(false)}
              >
                {language === "pt" ? "CONFIRMAR" : "DISMISS"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

