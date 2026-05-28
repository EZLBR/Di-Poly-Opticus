import React, { createContext, useContext, useState, useEffect } from "react";
import { useTranslation } from "./LanguageContext";

const CreatorContext = createContext();

export function CreatorProvider({ children }) {
  const { t } = useTranslation();

  const [activeStep, setActiveStep] = useState(1);
  const [model, setModel] = useState("aviator"); // aviator, wayfarer, cateye, round, square, hexagon
  const [color, setColor] = useState("#111827");
  const [isSunglasses, setIsSunglasses] = useState(false);
  const [antiReflective, setAntiReflective] = useState(true);
  const [prescriptionFileName, setPrescriptionFileName] = useState("");
  const [templeStyle, setTempleStyle] = useState("classic"); // classic, straight, sport
  const [topBar, setTopBar] = useState(false);
  const [bridgeStyle, setBridgeStyle] = useState("soft"); // soft, keyhole, flat
  const [frameProfile, setFrameProfile] = useState("medium"); // thin, medium, bold
  const [templeOpen, setTempleOpen] = useState(0.22); // leg fold: -0.05 to 0.65
  
  const [tryOnMode, setTryOnMode] = useState(false);
  const [loadingLandmarker, setLoadingLandmarker] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [draftStatus, setDraftStatus] = useState("No local draft");
  
  const [designName, setDesignName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState("factory-rayban");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [createdOrderNumber, setCreatedOrderNumber] = useState("");
  
  const [faceDetected, setFaceDetected] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [autoRotate, setAutoRotate] = useState(true);
  const [environment, setEnvironment] = useState("studio");

  // Helper functions that manipulate multiple states
  const showToast = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage("");
    }, 3000);
  };

  const resetDraft = () => {
    setModel("aviator");
    setColor("#111827");
    setIsSunglasses(false);
    setAntiReflective(true);
    setPrescriptionFileName("");
    setTempleStyle("classic");
    setTopBar(false);
    setBridgeStyle("soft");
    setFrameProfile("medium");
    setTempleOpen(0.22);
    setEnvironment("studio");
    setAutoRotate(true);
    setActiveStep(1);
    setDraftStatus(t("draft-cleared") || "Draft cleared");
  };

  return (
    <CreatorContext.Provider value={{
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
    }}>
      {children}
    </CreatorContext.Provider>
  );
}

export function useCreator() {
  return useContext(CreatorContext);
}
