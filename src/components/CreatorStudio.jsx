import React, { useState } from "react";
import { useTranslation } from "../contexts/LanguageContext";
import { CreatorStudioProvider, useCreatorStudio } from "../contexts/CreatorStudioContext";

import ThreePreview from "./creator/ThreePreview";
import TryOnViewport from "./creator/TryOnViewport";
import CustomizationPanel from "./creator/CustomizationPanel";
import { SaveDesignModal, OrderModal } from "./creator/CreatorModals";

import { ArrowLeft, Sparkles, Box, Camera, Download } from "lucide-react";

function CreatorStudioInner({ setView, onOpenDesigns }) {
  const {
    activeStep, setActiveStep,
    tryOnMode, setTryOnMode,
    statusMessage,
    environment, setEnvironment
  } = useCreatorStudio();

  const { language, t } = useTranslation();

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);

  return (
    <div className="page-create h-screen flex flex-col overflow-hidden bg-gray-50">
      
      {/* Toast Notifier */}
      {statusMessage && (
        <div className="fixed bottom-8 right-8 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl text-white z-50 flex items-center gap-3 shadow-2xl animate-slide-up">
          <Sparkles size={18} className="text-blue-400" />
          <span className="font-semibold text-sm">{statusMessage}</span>
        </div>
      )}

      {/* Header NavBar */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 z-40">
        <div className="flex items-center gap-6">
          <button 
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-black transition-colors"
            onClick={() => setView("marketplace")}
          >
            <ArrowLeft size={16} />
            {t("nav-explore")}
          </button>
          
          <div className="h-6 w-px bg-gray-200"></div>
          
          <h1 className="text-sm font-bold tracking-widest uppercase">
            {language === "pt" ? "Estúdio 3D Avançado" : "Advanced 3D Studio"}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button 
            className="text-xs font-semibold uppercase tracking-wider px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => {
              localStorage.setItem("opticus_show_designs_modal", "true");
              setView("marketplace");
            }}
          >
            {t("btn-open-saved")}
          </button>
          
          <button 
            className="text-xs font-semibold uppercase tracking-wider px-5 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-lg shadow-black/10 flex items-center gap-2"
            onClick={() => setShowSaveModal(true)}
          >
            <Download size={14} />
            {language === "pt" ? "Salvar" : "Save"}
          </button>
          
          <button 
            className="text-xs font-semibold uppercase tracking-wider px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-2"
            onClick={() => setShowOrderModal(true)}
          >
            <Sparkles size={14} />
            {language === "pt" ? "Produzir" : "Produce"}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: 3D / AR Viewport */}
        <div className="flex-1 relative flex flex-col">
          {/* Top Toolbar overlay */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-gray-100">
            <button
              className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                !tryOnMode ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-gray-900"
              }`}
              onClick={() => setTryOnMode(false)}
            >
              <Box size={14} />
              {language === "pt" ? "Renderização 3D" : "3D Render"}
            </button>
            <button
              className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                tryOnMode ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-gray-900"
              }`}
              onClick={() => setTryOnMode(true)}
            >
              <Camera size={14} />
              {language === "pt" ? "Live Try-On" : "Live Try-On"}
            </button>
          </div>

          {/* Environment Switcher (only for 3D) */}
          {!tryOnMode && (
            <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2 bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 pt-1">
                {language === "pt" ? "Cenário" : "Environment"}
              </span>
              <div className="flex gap-1">
                <button
                  className={`w-8 h-8 rounded-xl transition-all ${environment === "studio" ? "ring-2 ring-black" : "hover:bg-gray-200"}`}
                  style={{ backgroundColor: "#f8fbff" }}
                  onClick={() => setEnvironment("studio")}
                  title="Studio Lighting"
                />
                <button
                  className={`w-8 h-8 rounded-xl transition-all ${environment === "wood" ? "ring-2 ring-black" : "hover:bg-gray-200"}`}
                  style={{ backgroundColor: "#3d2713" }}
                  onClick={() => setEnvironment("wood")}
                  title="Dark Wood"
                />
              </div>
            </div>
          )}

          {/* Viewport Layer */}
          <div className="flex-1 relative w-full h-full">
            <div className={`absolute inset-0 transition-opacity duration-500 ${tryOnMode ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
              <ThreePreview />
            </div>
            
            <div className={`absolute inset-0 transition-opacity duration-500 ${!tryOnMode ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
              {tryOnMode && <TryOnViewport />}
            </div>
          </div>
        </div>

        {/* Right Side: Customization Panel */}
        <aside className="w-[400px] h-full shrink-0 relative z-30">
          <CustomizationPanel />
        </aside>

      </main>

      {/* Modals */}
      <SaveDesignModal 
        isOpen={showSaveModal} 
        onClose={() => setShowSaveModal(false)} 
        onOpenDesigns={onOpenDesigns}
      />
      <OrderModal 
        isOpen={showOrderModal} 
        onClose={() => setShowOrderModal(false)}
        onGoToDashboard={() => setView("factory-dashboard")}
      />
    </div>
  );
}

// Wrapper to provide the Customization State Context
export default function CreatorStudio(props) {
  return (
    <CreatorStudioProvider>
      <CreatorStudioInner {...props} />
    </CreatorStudioProvider>
  );
}
