import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useTranslation } from "../contexts/LanguageContext";
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

  // --- Step navigation ---
  const [activeStep, setActiveStep] = useState(1); // 1 = Shape, 2 = Finish

  // --- Eyewear Customization State ---
  const [model, setModel] = useState("aviator"); // aviator, wayfarer, cateye
  const [color, setColor] = useState("#111827");
  const [isSunglasses, setIsSunglasses] = useState(false);
  const [antiReflective, setAntiReflective] = useState(true);
  const [prescriptionFileName, setPrescriptionFileName] = useState("");
  const [templeStyle, setTempleStyle] = useState("classic"); // classic, straight, sport
  const [topBar, setTopBar] = useState(false);
  const [bridgeStyle, setBridgeStyle] = useState("soft"); // soft, keyhole, flat
  const [frameProfile, setFrameProfile] = useState("medium"); // thin, medium, bold
  const [templeOpen, setTempleOpen] = useState(0.22); // leg fold: -0.05 to 0.65

  // --- UI & Helper States ---
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

  // --- Three.js & Try-on Viewport References ---
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const trackingFrameIdRef = useRef(null);
  
  // Three.js instances stored in refs to allow mutations without rebuilding scene
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const glassesGroupRef = useRef(null);
  const frontGroupRef = useRef(null);
  const leftTemplePivotRef = useRef(null);
  const rightTemplePivotRef = useRef(null);
  const haloRingRef = useRef(null);
  const animFrameIdRef = useRef(null);
  
  // MediaPipe tracking refs
  const faceLandmarkerRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const smoothTryOnRef = useRef({
    cx: 0,
    cy: 0,
    lensW: 0,
    lensH: 0,
    bridgeW: 0,
    angle: 0,
    initialized: false
  });

  // State to track if face is currently detected in Try-On
  const [faceDetected, setFaceDetected] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  // Auto-rotation toggle
  const [autoRotate, setAutoRotate] = useState(true);

  // Environment / Scenario toggle
  const [environment, setEnvironment] = useState("studio"); // studio, wood, marble
  const floorRef = useRef(null);
  const stagePlateRef = useRef(null);
  const stageBaseRef = useRef(null);

  // Camera yaw/pitch target variables for smooth rotation interpolation
  const cameraAngleRef = useRef({
    targetRadius: 5.5,
    currentRadius: 5.5,
    targetYaw: 0.45,
    currentYaw: 0.45,
    targetPitch: 0.08,
    currentPitch: 0.08,
    isDragging: false,
    lastX: 0,
    lastY: 0
  });

  // --- Dimension presets per silhouette shape (Width, Lens size, Leg length, Thickness) ---
  // No longer customizable via sliders to honor user instructions
  const dimensionsMap = {
    aviator: { frameWidth: 2.35, lensSize: 1.35, legLength: 2.8, thickness: 0.10, bridgeWidth: 0.45 },
    wayfarer: { frameWidth: 2.25, lensSize: 1.20, legLength: 2.9, thickness: 0.16, bridgeWidth: 0.5 },
    cateye: { frameWidth: 2.15, lensSize: 1.15, legLength: 2.75, thickness: 0.14, bridgeWidth: 0.48 }
  };

  // Fallback to aviator if the model from localStorage is an old shape (round, square, etc)
  const currentDims = dimensionsMap[model] || dimensionsMap["aviator"];
  const safeModel = dimensionsMap[model] ? model : "aviator";

  // Helper function for status toaster
  const showToast = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(""), 3000);
  };

  // --- 1. Load active selections from LocalStorage ---
  useEffect(() => {
    const activeDesignIndex = localStorage.getItem("opticus_active_design");
    const activeProductId = localStorage.getItem("opticus_active_product");
    const savedDesignsRaw = localStorage.getItem("opticus_designs");
    const draftRaw = localStorage.getItem("opticus_creator_draft");

    let loadedConfig = null;

    if (activeDesignIndex !== null && savedDesignsRaw) {
      try {
        const designs = JSON.parse(savedDesignsRaw);
        const design = designs[parseInt(activeDesignIndex, 10)];
        if (design) {
          loadedConfig = design;
          setDesignName(design.name || "");
        }
      } catch (e) {
        console.error("Failed to load active design", e);
      }
    } else if (activeProductId) {
      const baseProductsMap = {
        "base-round-metal": { model: "aviator", color: "#6b7280", isSunglasses: true, templeStyle: "straight", topBar: true, bridgeStyle: "soft", frameProfile: "thin" },
        "base-square-acetate": { model: "wayfarer", color: "#111827", isSunglasses: false, templeStyle: "classic", topBar: false, bridgeStyle: "soft", frameProfile: "medium" },
        "base-round-acetate": { model: "cateye", color: "#1f2937", isSunglasses: false, templeStyle: "classic", topBar: false, bridgeStyle: "soft", frameProfile: "medium" },
        "base-square-metal": { model: "wayfarer", color: "#9ca3af", isSunglasses: true, templeStyle: "classic", topBar: false, bridgeStyle: "soft", frameProfile: "medium" }
      };
      if (baseProductsMap[activeProductId]) {
        loadedConfig = baseProductsMap[activeProductId];
      }
    } else if (draftRaw) {
      try {
        const draft = JSON.parse(draftRaw);
        if (draft && draft.config) {
          loadedConfig = draft.config;
          setDraftStatus("Draft restored");
        }
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    }

    if (loadedConfig) {
      if (loadedConfig.model) setModel(loadedConfig.model);
      if (loadedConfig.color) setColor(loadedConfig.color);
      if (loadedConfig.isSunglasses !== undefined) setIsSunglasses(loadedConfig.isSunglasses);
      if (loadedConfig.antiReflective !== undefined) setAntiReflective(loadedConfig.antiReflective);
      if (loadedConfig.prescriptionFileName) setPrescriptionFileName(loadedConfig.prescriptionFileName);
      if (loadedConfig.templeStyle) setTempleStyle(loadedConfig.templeStyle);
      if (loadedConfig.topBar !== undefined) setTopBar(loadedConfig.topBar);
      if (loadedConfig.bridgeStyle) setBridgeStyle(loadedConfig.bridgeStyle);
      if (loadedConfig.frameProfile) setFrameProfile(loadedConfig.frameProfile);
      if (loadedConfig.templeOpen !== undefined) setTempleOpen(loadedConfig.templeOpen);
    }
  }, []);

  // --- 2. Autosave drafts on config change ---
  useEffect(() => {
    const configState = {
      model,
      color,
      isSunglasses,
      antiReflective,
      prescriptionFileName,
      templeStyle,
      topBar,
      bridgeStyle,
      frameProfile,
      templeOpen
    };
    
    const draftPayload = {
      updatedAt: new Date().toISOString(),
      config: configState
    };
    localStorage.setItem("opticus_creator_draft", JSON.stringify(draftPayload));
    setDraftStatus("Autosaved locally");
  }, [model, color, isSunglasses, antiReflective, prescriptionFileName, templeStyle, topBar, bridgeStyle, frameProfile, templeOpen]);

  // --- 3. Three.js Scene Setup & Loop ---
  useEffect(() => {
    if (tryOnMode || !containerRef.current) return;

    const container = containerRef.current;
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 480;

    // A. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf6f8fc);
    scene.fog = new THREE.Fog(0xf3f6fb, 11, 22);
    sceneRef.current = scene;

    // B. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    cameraRef.current = camera;

    // C. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // D. Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.22);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xf8fbff, 0x7a8697, 1.55);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.6);
    keyLight.position.set(12, 16, 18);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.00018;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.45);
    fillLight.position.set(-12, 7, 10);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.8);
    rimLight.position.set(-14, 10, -16);
    scene.add(rimLight);

    // E. Stage Components
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(8.8, 64),
      new THREE.ShadowMaterial({ opacity: 0.18 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.52;
    floor.receiveShadow = true;
    scene.add(floor);
    floorRef.current = floor;

    const stageBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.55, 2.85, 0.22, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0xf8fbff,
        roughness: 0.72,
        metalness: 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.18
      })
    );
    stageBase.position.y = -1.42;
    stageBase.receiveShadow = true;
    scene.add(stageBase);
    stageBaseRef.current = stageBase;

    const stagePlate = new THREE.Mesh(
      new THREE.CylinderGeometry(2.12, 2.26, 0.08, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.28,
        metalness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.05
      })
    );
    stagePlate.position.y = -1.28;
    stagePlate.receiveShadow = true;
    scene.add(stagePlate);
    stagePlateRef.current = stagePlate;

    const haloRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.05, 0.035, 12, 60),
      new THREE.MeshBasicMaterial({
        color: 0xdbeafe,
        transparent: true,
        opacity: 0.42
      })
    );
    haloRing.rotation.x = Math.PI / 2;
    haloRing.position.y = -1.235;
    scene.add(haloRing);
    haloRingRef.current = haloRing;

    // F. Dynamic Eyewear Assembly Root Group
    const glassesGroup = new THREE.Group();
    scene.add(glassesGroup);
    glassesGroupRef.current = glassesGroup;

    // G. Drag & Drop camera interaction variables
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (e) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      cameraAngleRef.current.targetYaw += dx * 0.012;
      cameraAngleRef.current.targetPitch = Math.max(-0.78, Math.min(0.78, cameraAngleRef.current.targetPitch - dy * 0.008));
    };

    const onPointerUp = () => { isDragging = false; };

    const onWheel = (e) => {
      e.preventDefault();
      cameraAngleRef.current.targetRadius = Math.max(4.6, Math.min(13.2, cameraAngleRef.current.targetRadius + e.deltaY * 0.008));
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    // H. Build first frame mesh
    buildGlassesMesh();

    // I. Smooth camera and rotation animation loop
    const animate = () => {
      const t = performance.now() * 0.001;

      // Rotate model smoothly
      if (autoRotate && !isDragging) {
        cameraAngleRef.current.targetYaw += 0.0032;
      }

      // Smooth camera motion
      const angles = cameraAngleRef.current;
      angles.currentRadius += (angles.targetRadius - angles.currentRadius) * 0.12;
      angles.currentYaw += (angles.targetYaw - angles.currentYaw) * 0.12;
      angles.currentPitch += (angles.targetPitch - angles.currentPitch) * 0.12;

      const targetX = 0, targetY = 0.12, targetZ = 0;
      const camX = targetX + angles.currentRadius * Math.sin(angles.currentYaw) * Math.cos(angles.currentPitch);
      const camY = targetY + angles.currentRadius * Math.sin(angles.currentPitch);
      const camZ = targetZ + angles.currentRadius * Math.cos(angles.currentYaw) * Math.cos(angles.currentPitch);

      camera.position.set(camX, camY, camZ);
      camera.lookAt(targetX, targetY, targetZ);

      // Glasses hovering motion
      if (glassesGroupRef.current) {
        glassesGroupRef.current.position.y = 0.02 + Math.sin(t * 1.4) * 0.035;
      }

      // Pulse Stage Ring
      if (haloRingRef.current) {
        haloRingRef.current.material.opacity = 0.28 + (Math.sin(t * 1.8) + 1) * 0.06;
      }

      // Smooth temple hinges
      if (leftTemplePivotRef.current && rightTemplePivotRef.current) {
        // Interpolate temple open state
        const targetOpen = templeOpen;
        const currentOpen = leftTemplePivotRef.current.rotation.y;
        const nextOpen = currentOpen + (-targetOpen - currentOpen) * 0.14;
        leftTemplePivotRef.current.rotation.y = nextOpen;
        rightTemplePivotRef.current.rotation.y = -nextOpen;
      }

      renderer.render(scene, camera);
      animFrameIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    // J. Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    // K. Cleanup on unmount/re-init
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      
      if (rendererRef.current) {
        rendererRef.current.domElement.removeEventListener("pointerdown", onPointerDown);
        rendererRef.current.domElement.removeEventListener("pointermove", onPointerMove);
        rendererRef.current.domElement.removeEventListener("pointerup", onPointerUp);
        rendererRef.current.domElement.removeEventListener("wheel", onWheel);
        rendererRef.current.dispose();
      }

      // Clean up meshes
      scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
    };
  }, [tryOnMode]);

  // --- 4. Rebuild glasses assembly when configuration changes ---
  useEffect(() => {
    if (!tryOnMode && glassesGroupRef.current) {
      buildGlassesMesh();
    }
  }, [model, color, isSunglasses, antiReflective, templeStyle, topBar, bridgeStyle, frameProfile, tryOnMode]);

  // Update temple pivot immediately without fully rebuilding the mesh
  useEffect(() => {
    if (!tryOnMode && leftTemplePivotRef.current && rightTemplePivotRef.current) {
      // Direct assignment for immediate UI preview, while loop smoothly completes it
      leftTemplePivotRef.current.rotation.y = -templeOpen;
      rightTemplePivotRef.current.rotation.y = templeOpen;
    }
  }, [templeOpen]);

  // --- Dynamic Environment Updates ---
  useEffect(() => {
    if (!stagePlateRef.current || !stageBaseRef.current || !floorRef.current || !sceneRef.current) return;
    
    if (environment === "wood") {
      // Wood table style
      floorRef.current.material = new THREE.MeshPhysicalMaterial({ color: 0x2a1c15, roughness: 0.9, metalness: 0 });
      stagePlateRef.current.material = new THREE.MeshPhysicalMaterial({ color: 0x4a3219, roughness: 0.8, metalness: 0, clearcoat: 0.2 });
      stageBaseRef.current.material = new THREE.MeshPhysicalMaterial({ color: 0x3d2713, roughness: 0.9, metalness: 0 });
      sceneRef.current.background = new THREE.Color(0x1a120b);
      sceneRef.current.fog = new THREE.Fog(0x1a120b, 10, 20);
    } else if (environment === "marble") {
      // Marble floor style
      floorRef.current.material = new THREE.MeshPhysicalMaterial({ color: 0xe0e5ec, roughness: 0.1, metalness: 0.1, clearcoat: 1.0 });
      stagePlateRef.current.material = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.05, clearcoat: 1.0 });
      stageBaseRef.current.material = new THREE.MeshPhysicalMaterial({ color: 0xd0d5dc, roughness: 0.2, metalness: 0.1 });
      sceneRef.current.background = new THREE.Color(0xeef2f7);
      sceneRef.current.fog = new THREE.Fog(0xeef2f7, 10, 20);
    } else {
      // Default Studio
      floorRef.current.material = new THREE.ShadowMaterial({ opacity: 0.18 });
      stagePlateRef.current.material = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.28, metalness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });
      stageBaseRef.current.material = new THREE.MeshPhysicalMaterial({ color: 0xf8fbff, roughness: 0.72, metalness: 0.08, clearcoat: 1, clearcoatRoughness: 0.18 });
      sceneRef.current.background = new THREE.Color(0xf6f8fc);
      sceneRef.current.fog = new THREE.Fog(0xf3f6fb, 11, 22);
    }
  }, [environment]);

  // --- 5. Three.js Procedural Eyewear Modeling Engine ---
  function buildGlassesMesh() {
    const rootGroup = glassesGroupRef.current;
    if (!rootGroup) return;

    // Clear previous children
    while (rootGroup.children.length > 0) {
      const obj = rootGroup.children[0];
      rootGroup.remove(obj);
      obj.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
    }

    // Material Definitions
    const frameMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      metalness: isSunglasses ? 0.8 : 0.15,
      roughness: isSunglasses ? 0.12 : 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 1.0,
      envMapIntensity: 2.0,
      sheen: 0.3,
      sheenRoughness: 0.2,
      emissive: new THREE.Color(color).multiplyScalar(0.02),
    });

    const lensMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(isSunglasses ? "#0a0a0a" : "#e6f2ff"),
      metalness: isSunglasses ? 0.2 : 0.0,
      roughness: antiReflective ? 0.0 : 0.05,
      transmission: isSunglasses ? 0.2 : 0.98,
      thickness: isSunglasses ? 0.4 : 0.7,
      ior: 1.6, // High index lens distortion
      dispersion: 2.5, // Chromatic aberration on edges
      transparent: true,
      opacity: 1.0, // Let transmission handle visibility
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      attenuationDistance: isSunglasses ? 0.5 : 2.5,
      attenuationColor: new THREE.Color(isSunglasses ? "#000000" : "#ffffff"),
      envMapIntensity: 3.0 // Stronger reflections on the glass
    });

    const padMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.045,
      transmission: 0.85,
      thickness: 0.45,
      ior: 1.38,
      transparent: true,
      opacity: 0.86,
      clearcoat: 1,
      clearcoatRoughness: 0.015,
      envMapIntensity: 0.9
    });

    const metalHingeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xc7d0dc,
      roughness: 0.18,
      metalness: 0.92,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.8
    });

    const screwMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe5e7eb,
      roughness: 0.16,
      metalness: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 2
    });

    // Helper functions for drawing frame curves
    const roundedRect = (path, x, y, w, h, r) => {
      path.moveTo(x + r, y);
      path.lineTo(x + w - r, y);
      path.quadraticCurveTo(x + w, y, x + w, y + r);
      path.lineTo(x + w, y + h - r);
      path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      path.lineTo(x + r, y + h);
      path.quadraticCurveTo(x, y + h, x, y + h - r);
      path.lineTo(x, y + r);
      path.quadraticCurveTo(x, y, x + r, y);
    };

    const getLensShape = (type, sizeX, sizeY, isLeft = false) => {
      const shape = new THREE.Shape();
      
      if (type === "aviator") {
        shape.moveTo(0, sizeY * 0.8);
        shape.bezierCurveTo(sizeX * 0.4, sizeY * 0.85, sizeX * 0.95, sizeY * 0.4, sizeX * 0.95, -sizeY * 0.1);
        shape.bezierCurveTo(sizeX * 0.95, -sizeY * 0.7, sizeX * 0.4, -sizeY, 0, -sizeY);
        shape.bezierCurveTo(-sizeX * 0.4, -sizeY, -sizeX * 0.8, -sizeY * 0.6, -sizeX * 0.8, 0);
        shape.bezierCurveTo(-sizeX * 0.8, sizeY * 0.5, -sizeX * 0.4, sizeY * 0.75, 0, sizeY * 0.8);
      } 
      else if (type === "wayfarer") {
        shape.moveTo(-sizeX * 0.8, sizeY * 0.7);
        shape.lineTo(sizeX * 0.7, sizeY * 0.85); 
        shape.bezierCurveTo(sizeX * 0.95, sizeY * 0.9, sizeX, sizeY * 0.6, sizeX * 0.95, sizeY * 0.3);
        shape.lineTo(sizeX * 0.7, -sizeY * 0.7);
        shape.bezierCurveTo(sizeX * 0.65, -sizeY * 0.95, sizeX * 0.3, -sizeY, 0, -sizeY);
        shape.bezierCurveTo(-sizeX * 0.4, -sizeY, -sizeX * 0.65, -sizeY * 0.85, -sizeX * 0.7, -sizeY * 0.6);
        shape.lineTo(-sizeX * 0.9, sizeY * 0.3);
        shape.bezierCurveTo(-sizeX * 0.95, sizeY * 0.5, -sizeX * 0.9, sizeY * 0.65, -sizeX * 0.8, sizeY * 0.7);
      } 
      else if (type === "cateye") {
        shape.moveTo(-sizeX * 0.7, sizeY * 0.5);
        shape.bezierCurveTo(-sizeX * 0.3, sizeY * 0.6, sizeX * 0.2, sizeY * 0.7, sizeX * 1.05, sizeY * 1.05); 
        shape.bezierCurveTo(sizeX, sizeY * 0.8, sizeX * 0.9, sizeY * 0.3, sizeX * 0.8, 0);
        shape.bezierCurveTo(sizeX * 0.6, -sizeY * 0.8, sizeX * 0.3, -sizeY, -sizeX * 0.2, -sizeY);
        shape.bezierCurveTo(-sizeX * 0.6, -sizeY, -sizeX * 0.8, -sizeY * 0.6, -sizeX * 0.8, 0);
        shape.bezierCurveTo(-sizeX * 0.8, sizeY * 0.3, -sizeX * 0.75, sizeY * 0.4, -sizeX * 0.7, sizeY * 0.5);
      }

      if (isLeft) {
        const points = shape.getPoints(24);
        const mirroredShape = new THREE.Shape();
        const mirroredPoints = points.map(p => new THREE.Vector2(-p.x, p.y)).reverse();
        
        mirroredShape.moveTo(mirroredPoints[0].x, mirroredPoints[0].y);
        for (let i = 1; i < mirroredPoints.length; i++) {
          mirroredShape.lineTo(mirroredPoints[i].x, mirroredPoints[i].y);
        }
        return mirroredShape;
      }

      return shape;
    };

    // Calculate dimensions
    const frameDepth = Math.max(0.12, Math.min(0.28, currentDims.thickness * 1.9));
    const lensDepth = 0.06;
    const widthScale = Math.max(0.72, Math.min(1.45, currentDims.frameWidth / 2.2));

    let lensX = currentDims.lensSize * widthScale;
    let lensY = currentDims.lensSize * 0.90;

    // Dynamic frame multiplier (Thin, Medium, Bold)
    let thicknessMul = 1.0, topBarMul = 1.0, bridgeMul = 1.0;
    if (frameProfile === "thin") {
      thicknessMul = 0.78;
      topBarMul = 0.78;
      bridgeMul = 0.82;
    } else if (frameProfile === "bold") {
      thicknessMul = 1.35;
      topBarMul = 1.22;
      bridgeMul = 1.18;
    }

    const outerX = lensX + currentDims.thickness * thicknessMul;
    const outerY = lensY + currentDims.thickness * 0.9 * thicknessMul;
    const adjustedFrameDepth = Math.max(0.1, Math.min(0.34, frameDepth * thicknessMul));

    const lensOffsetX = lensX + currentDims.bridgeWidth * 0.5 + currentDims.thickness * 0.55;
    const hingeX = lensOffsetX + outerX - currentDims.thickness * 0.35;

    // --- Build Front Assembly ---
    const frontGroup = new THREE.Group();
    rootGroup.add(frontGroup);
    frontGroupRef.current = frontGroup;

    // Geometries Right
    const outerShapeRight = getLensShape(safeModel, outerX, outerY, false);
    const innerShapeRight = getLensShape(safeModel, lensX, lensY, false);
    outerShapeRight.holes.push(innerShapeRight);

    const rimGeoRight = new THREE.ExtrudeGeometry(outerShapeRight, {
      depth: adjustedFrameDepth,
      bevelEnabled: true,
      bevelThickness: adjustedFrameDepth * 0.18,
      bevelSize: adjustedFrameDepth * 0.18,
      bevelSegments: 3,
      curveSegments: 24
    });
    rimGeoRight.center();

    const lensShapeRight = getLensShape(safeModel, lensX, lensY, false);
    const lensGeoRight = new THREE.ExtrudeGeometry(lensShapeRight, {
      depth: lensDepth,
      bevelEnabled: true,
      bevelThickness: lensDepth * 0.08,
      bevelSize: lensDepth * 0.08,
      bevelSegments: 2,
      curveSegments: 24
    });
    lensGeoRight.center();

    // Geometries Left
    const outerShapeLeft = getLensShape(safeModel, outerX, outerY, true);
    const innerShapeLeft = getLensShape(safeModel, lensX, lensY, true);
    outerShapeLeft.holes.push(innerShapeLeft);

    const rimGeoLeft = new THREE.ExtrudeGeometry(outerShapeLeft, {
      depth: adjustedFrameDepth,
      bevelEnabled: true,
      bevelThickness: adjustedFrameDepth * 0.18,
      bevelSize: adjustedFrameDepth * 0.18,
      bevelSegments: 3,
      curveSegments: 24
    });
    rimGeoLeft.center();

    const lensShapeLeft = getLensShape(safeModel, lensX, lensY, true);
    const lensGeoLeft = new THREE.ExtrudeGeometry(lensShapeLeft, {
      depth: lensDepth,
      bevelEnabled: true,
      bevelThickness: lensDepth * 0.08,
      bevelSize: lensDepth * 0.08,
      bevelSegments: 2,
      curveSegments: 24
    });
    lensGeoLeft.center();

    // Add Rims & Lenses
    const rightRimMesh = new THREE.Mesh(rimGeoRight, frameMaterial);
    rightRimMesh.position.set(lensOffsetX, 0, 0);
    rightRimMesh.castShadow = true;
    frontGroup.add(rightRimMesh);

    const leftRimMesh = new THREE.Mesh(rimGeoLeft, frameMaterial);
    leftRimMesh.position.set(-lensOffsetX, 0, 0);
    leftRimMesh.castShadow = true;
    frontGroup.add(leftRimMesh);

    const rightLensMesh = new THREE.Mesh(lensGeoRight, lensMaterial);
    rightLensMesh.position.set(lensOffsetX, 0, adjustedFrameDepth * 0.12);
    rightLensMesh.castShadow = true;
    frontGroup.add(rightLensMesh);

    const leftLensMesh = new THREE.Mesh(lensGeoLeft, lensMaterial);
    leftLensMesh.position.set(-lensOffsetX, 0, adjustedFrameDepth * 0.12);
    leftLensMesh.castShadow = true;
    frontGroup.add(leftLensMesh);

    // Top Bar (Double bridge design)
    if (topBar) {
      const topBarWidth = lensOffsetX * 2 + lensX * 0.22;
      const topBarGeo = new THREE.CapsuleGeometry(
        currentDims.thickness * 0.42 * topBarMul,
        topBarWidth * 0.5,
        5,
        18
      );
      const topBarMesh = new THREE.Mesh(topBarGeo, frameMaterial);
      topBarMesh.position.set(0, lensY + currentDims.thickness * 0.62, adjustedFrameDepth * 0.03);
      topBarMesh.rotation.z = Math.PI / 2;
      topBarMesh.castShadow = true;
      frontGroup.add(topBarMesh);
    }

    // Bridge Curve
    let bridgeCurve;
    const bw = currentDims.bridgeWidth;
    if (bridgeStyle === "flat") {
      bridgeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-bw * 0.5, 0.02, 0),
        new THREE.Vector3(-bw * 0.2, -0.01, 0.01),
        new THREE.Vector3(bw * 0.2, -0.01, 0.01),
        new THREE.Vector3(bw * 0.5, 0.02, 0)
      ]);
    } else if (bridgeStyle === "keyhole") {
      bridgeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-bw * 0.5, 0.08, 0),
        new THREE.Vector3(-bw * 0.22, -0.12, 0.03),
        new THREE.Vector3(bw * 0.22, -0.12, 0.03),
        new THREE.Vector3(bw * 0.5, 0.08, 0)
      ]);
    } else { // soft arch
      bridgeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-bw * 0.5, 0.10, 0),
        new THREE.Vector3(-bw * 0.18, -0.06, 0.03),
        new THREE.Vector3(bw * 0.18, -0.06, 0.03),
        new THREE.Vector3(bw * 0.5, 0.10, 0)
      ]);
    }

    const bridgeGeo = new THREE.TubeGeometry(
      bridgeCurve,
      28,
      Math.max(0.04, currentDims.thickness * 0.3 * bridgeMul),
      12,
      false
    );
    const bridgeMesh = new THREE.Mesh(bridgeGeo, frameMaterial);
    bridgeMesh.position.set(0, -0.03, adjustedFrameDepth * 0.02);
    bridgeMesh.castShadow = true;
    frontGroup.add(bridgeMesh);

    // Hinge cylinders
    const hingeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.18, 24);
    const screwGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.018, 24);

    [-1, 1].forEach((side) => {
      const hingeMesh = new THREE.Mesh(hingeGeo, metalHingeMaterial);
      hingeMesh.position.set(side * hingeX, 0.04, -0.03);
      frontGroup.add(hingeMesh);

      // Accent screws
      const screw1 = new THREE.Mesh(screwGeo, screwMaterial);
      screw1.position.set(side * hingeX, 0.075, 0.065);
      screw1.rotation.x = Math.PI / 2;
      frontGroup.add(screw1);

      const screw2 = new THREE.Mesh(screwGeo, screwMaterial);
      screw2.position.set(side * hingeX, 0.005, 0.065);
      screw2.rotation.x = Math.PI / 2;
      frontGroup.add(screw2);
    });

    // Soft nose pads
    const padGeo = new THREE.SphereGeometry(0.11, 18, 18);
    const rightPad = new THREE.Mesh(padGeo, padMaterial);
    rightPad.position.set(bw * 0.16, -0.18, 0.15);
    rightPad.scale.set(0.7, 1, 1.2);
    rightPad.rotation.z = -0.3;
    frontGroup.add(rightPad);

    const leftPad = new THREE.Mesh(padGeo.clone(), padMaterial);
    leftPad.position.set(-bw * 0.16, -0.18, 0.15);
    leftPad.scale.set(0.7, 1, 1.2);
    leftPad.rotation.z = 0.3;
    frontGroup.add(leftPad);

    // --- Build Temples (Pivoted Groups for folding animation) ---
    const leftTemplePivot = new THREE.Group();
    const rightTemplePivot = new THREE.Group();
    
    leftTemplePivot.position.set(-hingeX, 0.02, -0.06);
    rightTemplePivot.position.set(hingeX, 0.02, -0.06);

    rootGroup.add(leftTemplePivot);
    rootGroup.add(rightTemplePivot);

    leftTemplePivotRef.current = leftTemplePivot;
    rightTemplePivotRef.current = rightTemplePivot;

    // Generate temple curves based on style
    const getTempleCurve = (side) => {
      const len = currentDims.legLength;
      if (templeStyle === "straight") {
        return new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0.005 * side, 0.0, -len * 0.25),
          new THREE.Vector3(0.01 * side, -0.005, -len * 0.55),
          new THREE.Vector3(0.008 * side, -0.03, -len * 0.82),
          new THREE.Vector3(0.0, -0.10, -len)
        ]);
      }
      if (templeStyle === "sport") {
        return new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0.015 * side, 0.01, -len * 0.18),
          new THREE.Vector3(0.03 * side, 0.0, -len * 0.40),
          new THREE.Vector3(0.035 * side, -0.08, -len * 0.72),
          new THREE.Vector3(0.015 * side, -0.24, -len)
        ]);
      }
      // classic curve
      return new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.01 * side, 0.0, -len * 0.18),
        new THREE.Vector3(0.02 * side, -0.005, -len * 0.42),
        new THREE.Vector3(0.025 * side, -0.05, -len * 0.74),
        new THREE.Vector3(0.01 * side, -0.18, -len)
      ]);
    };

    const templeRadius = Math.max(0.045, currentDims.thickness * 0.42);

    const leftCurve = getTempleCurve(-1);
    const leftTempleGeo = new THREE.TubeGeometry(leftCurve, 64, templeRadius, 12, false);
    const leftTempleMesh = new THREE.Mesh(leftTempleGeo, frameMaterial);
    leftTempleMesh.rotation.z = Math.PI * 0.08;
    leftTempleMesh.rotation.y = Math.PI * 0.05;
    leftTempleMesh.castShadow = true;
    leftTemplePivot.add(leftTempleMesh);

    const rightCurve = getTempleCurve(1);
    const rightTempleGeo = new THREE.TubeGeometry(rightCurve, 64, templeRadius, 12, false);
    const rightTempleMesh = new THREE.Mesh(rightTempleGeo, frameMaterial);
    rightTempleMesh.rotation.z = -Math.PI * 0.08;
    rightTempleMesh.rotation.y = -Math.PI * 0.05;
    rightTempleMesh.castShadow = true;
    rightTemplePivot.add(rightTempleMesh);

    // Apply folding rotation immediately
    leftTemplePivot.rotation.y = -templeOpen;
    rightTemplePivot.rotation.y = templeOpen;

    // Angle glasses slightly on the stage for premium isometric showcase
    rootGroup.rotation.set(-0.08, 0.58, 0.02);
    rootGroup.position.set(0, 0.02, 0);
  }

  // --- 6. MediaPipe Webcam Face Tracking & 2D Overlay Engine ---
  async function startTryOn() {
    setLoadingLandmarker(true);
    setTryOnMode(true);

    try {
      // Dynamically load landmarker from direct ESM build in the installed package
      const vision = await import("@mediapipe/tasks-vision");
      const { FaceLandmarker, FilesetResolver } = vision;

      if (!faceLandmarkerRef.current) {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
        );

        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false
        });
      }

      setLoadingLandmarker(false);

      // Access Webcam
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      cameraStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // Start WebCam loop
        trackingFrameIdRef.current = requestAnimationFrame(renderTrackingFrame);
      }
    } catch (err) {
      console.error("Camera tryon failed:", err);
      setLoadingLandmarker(false);
      showToast(language === "pt" ? "Erro ao acessar a c├ómera: " + err.message : "Error accessing camera: " + err.message);
      setTryOnMode(false);
    }
  }

  function stopTryOn() {
    setTryOnMode(false);
    setFaceDetected(false);

    if (trackingFrameIdRef.current) {
      cancelAnimationFrame(trackingFrameIdRef.current);
    }

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    smoothTryOnRef.current.initialized = false;
  }

  // Double check cleanup when switching components
  useEffect(() => {
    return () => {
      if (trackingFrameIdRef.current) cancelAnimationFrame(trackingFrameIdRef.current);
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // WebCam loop function
  function renderTrackingFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.srcObject) return;

    if (video.readyState < 2) {
      trackingFrameIdRef.current = requestAnimationFrame(renderTrackingFrame);
      return;
    }

    // Sync canvas and video sizes
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video feed mirrored for natural camera interaction
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    let landmarker = faceLandmarkerRef.current;
    if (!landmarker) {
      // Drawing manual demo overlay centered
      drawStylizedFrameOverlay(ctx, canvas.width * 0.5, canvas.height * 0.43, canvas.width * 0.17, canvas.width * 0.12, canvas.width * 0.07, 0);
      setFaceDetected(false);
      trackingFrameIdRef.current = requestAnimationFrame(renderTrackingFrame);
      return;
    }

    const result = landmarker.detectForVideo(video, performance.now());

    if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
      const landmarks = result.faceLandmarks[0];
      setFaceDetected(true);

      // Translate landmarks (0-1) to pixel space and mirror X coordinates to match the mirrored camera feed
      const getPixel = (idx) => {
        const lm = landmarks[idx];
        return {
          x: (1 - lm.x) * canvas.width, // Mirror X
          y: lm.y * canvas.height,
          z: lm.z
        };
      };

      // Primary facial references
      const leftOuter = getPixel(33);
      const rightOuter = getPixel(263);
      const leftInner = getPixel(133);
      const rightInner = getPixel(362);
      const noseTip = getPixel(1);

      const eyeCenter = {
        x: (leftOuter.x + rightOuter.x) / 2,
        y: (leftOuter.y + rightOuter.y) / 2
      };

      const eyeDistance = Math.hypot(rightOuter.x - leftOuter.x, rightOuter.y - leftOuter.y);
      const frameWidth = eyeDistance * 2.05;

      const angle = Math.atan2(rightOuter.y - leftOuter.y, rightOuter.x - leftOuter.x);

      const bridgeWidth = Math.hypot(rightInner.x - leftInner.x, rightInner.y - leftInner.y) * 0.95;
      const lensWidth = frameWidth * 0.36;

      let lensHeight;
      if (model === "round") {
        lensHeight = lensWidth * 0.82;
      } else if (model === "hexagon") {
        lensHeight = lensWidth * 0.76;
      } else {
        lensHeight = lensWidth * 0.72;
      }

      const centerX = eyeCenter.x;
      const centerY = noseTip.y - lensHeight * 0.28;

      // Temporal smoothing to prevent jittering
      const smooth = smoothTryOnRef.current;
      if (!smooth.initialized) {
        smooth.cx = centerX;
        smooth.cy = centerY;
        smooth.lensW = lensWidth;
        smooth.lensH = lensHeight;
        smooth.bridgeW = bridgeWidth;
        smooth.angle = angle;
        smooth.initialized = true;
      } else {
        const factor = 0.22;
        smooth.cx += (centerX - smooth.cx) * factor;
        smooth.cy += (centerY - smooth.cy) * factor;
        smooth.lensW += (lensWidth - smooth.lensW) * factor;
        smooth.lensH += (lensHeight - smooth.lensH) * factor;
        smooth.bridgeW += (bridgeWidth - smooth.bridgeW) * factor;
        smooth.angle += (angle - smooth.angle) * 0.16;
      }

      // Draw standard 2D vector glasses onto canvas
      drawStylizedFrameOverlay(
        ctx,
        smooth.cx,
        smooth.cy,
        smooth.lensW,
        smooth.lensH,
        smooth.bridgeW,
        smooth.angle
      );

      // Update interactive recommendations dynamically
      updateAISuggestions(landmarks, eyeDistance);
    } else {
      // Manual fallback overlay
      drawStylizedFrameOverlay(ctx, canvas.width * 0.5, canvas.height * 0.43, canvas.width * 0.17, canvas.width * 0.12, canvas.width * 0.07, 0);
      setFaceDetected(false);
    }

    trackingFrameIdRef.current = requestAnimationFrame(renderTrackingFrame);
  }

  // Draws Vector representation of active design variables on top of 2D Webcam canvas
  function drawStylizedFrameOverlay(ctx, cx, cy, lensW, lensH, bridgeW, angle) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const frameColor = color || "#111827";
    const line = Math.max(4, lensW * (frameProfile === "bold" ? 0.09 : frameProfile === "thin" ? 0.038 : 0.055));

    ctx.lineWidth = line;
    ctx.strokeStyle = frameColor;
    ctx.fillStyle = isSunglasses ? "rgba(21, 27, 38, 0.88)" : "rgba(220, 235, 255, 0.25)";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const leftX = -(bridgeW / 2 + lensW);
    const rightX = bridgeW / 2;

    const roundRectPath = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    const drawLens = (x, y, w, h) => {
      if (model === "round") {
        ctx.beginPath();
        ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (model === "hexagon") {
        const rx = w / 2;
        const ry = h / 2;
        ctx.beginPath();
        ctx.moveTo(x - rx * 0.55, y - ry);
        ctx.lineTo(x + rx * 0.55, y - ry);
        ctx.lineTo(x + rx, y - ry * 0.15);
        ctx.lineTo(x + rx * 0.72, y + ry);
        ctx.lineTo(x - rx * 0.72, y + ry);
        ctx.lineTo(x - rx, y - ry * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        const r = Math.min(w, h) * 0.16;
        roundRectPath(x - w / 2, y - h / 2, w, h, r);
        ctx.fill();
        ctx.stroke();
      }
    };

    // 1. Draw lenses and rims
    drawLens(leftX + lensW / 2, 0, lensW, lensH);
    drawLens(rightX + lensW / 2, 0, lensW, lensH);

    // 2. Draw bridge style
    ctx.beginPath();
    ctx.moveTo(-bridgeW / 2, 0);
    if (bridgeStyle === "keyhole") {
      ctx.quadraticCurveTo(0, -lensH * 0.28, bridgeW / 2, 0);
    } else if (bridgeStyle === "flat") {
      ctx.lineTo(bridgeW / 2, 0);
    } else { // soft
      ctx.quadraticCurveTo(0, -lensH * 0.14, bridgeW / 2, 0);
    }
    ctx.stroke();

    // 3. Draw top bar (double bridge)
    if (topBar) {
      ctx.beginPath();
      ctx.moveTo(leftX + lensW * 0.6, -lensH * 0.52);
      ctx.lineTo(rightX + lensW * 0.4, -lensH * 0.52);
      ctx.stroke();
    }

    // 4. Draw temple starts
    ctx.beginPath();
    ctx.moveTo(leftX, -lensH * 0.08);
    ctx.lineTo(leftX - lensW * 0.42, -lensH * 0.22);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rightX + lensW, -lensH * 0.08);
    ctx.lineTo(rightX + lensW + lensW * 0.42, -lensH * 0.22);
    ctx.stroke();

    ctx.restore();
  }

  // --- 7. Face Analysis AI Recommendations ---
  function updateAISuggestions(landmarks, eyeDistance) {
    const list = [];
    const configDesc = language === "pt" ? "Ajuste Fino Recomendado: " : "Recommended Settings: ";

    if (eyeDistance < 130) {
      list.push(language === "pt" 
        ? "Propor├º├úo facial compacta: o perfil mais fino (Thin) ficar├í mais leve e proporcional."
        : "Compact facial proportion: the Thin profile option will feel lighter and better balanced.");
    } else {
      list.push(language === "pt" 
        ? "Estrutura facial ampla: o perfil bold (Bold) dar├í um destaque elegante e premium."
        : "Wide facial structure: the Bold profile option will create a premium presence.");
    }

    // Silhouette matches based on model
    if (model === "round") {
      list.push(language === "pt" 
        ? "Arma├º├Áes Redondas suavizam tra├ºos marcados e mand├¡bulas quadradas."
        : "Round frames beautifully soften strong lines and square jaw structures.");
    } else if (model === "square") {
      list.push(language === "pt" 
        ? "Arma├º├Áes Quadradas adicionam defini├º├úo e harmonia a rostos arredondados."
        : "Square frames add outstanding definition to rounder, softer facial features.");
    } else {
      list.push(language === "pt" 
        ? "A forma Hexagonal equilibra rostos ovais com uma express├úo futurista e arrojada."
        : "The Hexagonal shape balances oval face shapes with a futuristic and bold mood.");
    }

    if (topBar) {
      list.push(language === "pt" 
        ? "A barra dupla (Top Bar) adiciona estilo aviador cl├íssico, ideal para pontes nasais baixas."
        : "The Top Bar adds retro aviator character, ideal for lower nose bridge profiles.");
    }

    setAiSuggestions(list);
  }

  // Exporter Actions removed.

  // --- 9. LocalStorage Custom Design Storage ---
  const saveDesignPayload = async (e) => {
    e.preventDefault();
    const cleanName = designName.trim();
    if (!cleanName) {
      showToast(language === "pt" ? "Por favor forne├ºa um nome" : "Please provide a design name.");
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
        antiReflective,
        prescriptionFileName,
        templeStyle,
        topBar,
        bridgeStyle,
        frameProfile,
        templeOpen,
        published: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (isBackendConnected) {
        const isLocalStringId = typeof finalId === "string" && finalId.startsWith("design-");
        
        const backendRes = await saveBackendDesign({
          id: isLocalStringId ? null : finalId,
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

        // Catch the real integer ID assigned by PostgreSQL
        if (backendRes && backendRes.id) {
          finalId = backendRes.id;
          newDesign.id = finalId;
        }
      }

      if (isNew) {
        designs.push(newDesign);
        localStorage.setItem("opticus_active_design", String(designs.length - 1));
      } else {
        designs[parseInt(activeIndex, 10)] = newDesign;
      }

      localStorage.setItem("opticus_designs", JSON.stringify(designs));
      localStorage.removeItem("opticus_creator_draft"); // Draft is promoted
      setDraftStatus("No local draft");
      setShowSaveModal(false);
      showToast(language === "pt" ? "Design salvo com sucesso!" : "Design saved successfully!");
      if (onOpenDesigns) {
        onOpenDesigns();
      } else {
        setView("designs");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to save design.");
    }
  };

  // Order submission
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
      showToast(language === "pt" ? "Pedido encaminhado ├á f├íbrica!" : "Order dispatched to factory!");
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
            <h1>{language === "pt" ? "EST├ÜDIO DE DESIGN 3D" : "3D DESIGN STUDIO"}</h1>
            <p>
              {language === "pt" 
                ? "Escolha a silhueta, defina materiais e visualize instantaneamente pelo simulador 3D ou c├ómera."
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
          <div className="viewport premium-glass-card" style={{ display: 'none' }}>
            {/* The old viewport card is hidden because we moved the canvas and headers to absolute positioning */}
          </div>

          {/* Floating Top-Left Header for Canvas Mode toggle */}
          <div className="studio-top-left" style={{ position: "absolute", top: "100px", left: "40px", zIndex: 40 }}>
            <div 
              style={{
                background: "var(--glass-card-bg)",
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                border: "1px solid var(--glass-card-border)",
                borderRadius: "16px",
                padding: "12px 16px",
                display: "flex",
                gap: "12px",
                alignItems: "center",
                boxShadow: "0 20px 40px rgba(0,0,0,0.15)"
              }}
            >
              <span className="panel-kicker" style={{ margin: 0, color: "var(--text-dark)" }}>
                {tryOnMode ? "WEBCAM TRACKER" : "3D PREVIEW ROOM"}
              </span>

              <div style={{ display: "flex", gap: "6px" }}>
                <button 
                  className={`btn ${!tryOnMode ? "primary" : ""}`}
                  style={{ height: "30px", padding: "0 12px", fontSize: "12px" }}
                  onClick={() => { if (tryOnMode) stopTryOn(); }}
                >
                  3D View
                </button>
                <button 
                  className={`btn ${tryOnMode ? "primary" : ""}`}
                  style={{ height: "30px", padding: "0 12px", fontSize: "12px" }}
                  onClick={() => { if (!tryOnMode) startTryOn(); }}
                  disabled={loadingLandmarker}
                >
                  {loadingLandmarker ? (
                    <span>Initializing...</span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Camera size={13} /> Live Try-On
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Scenario / Environment Toggle */}
            {!tryOnMode && (
              <div 
                style={{
                  background: "var(--glass-card-bg)",
                  backdropFilter: "blur(24px) saturate(180%)",
                  WebkitBackdropFilter: "blur(24px) saturate(180%)",
                  border: "1px solid var(--glass-card-border)",
                  borderRadius: "16px",
                  padding: "12px 16px",
                  marginTop: "10px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.15)"
                }}
              >
                <span className="panel-kicker" style={{ margin: 0, color: "var(--text-dark)" }}>
                  SCENARIO
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button 
                    className={`btn ${environment === "studio" ? "primary" : ""}`}
                    style={{ height: "30px", padding: "0 12px", fontSize: "12px" }}
                    onClick={() => setEnvironment("studio")}
                  >
                    Studio
                  </button>
                  <button 
                    className={`btn ${environment === "wood" ? "primary" : ""}`}
                    style={{ height: "30px", padding: "0 12px", fontSize: "12px" }}
                    onClick={() => setEnvironment("wood")}
                  >
                    Wood
                  </button>
                  <button 
                    className={`btn ${environment === "marble" ? "primary" : ""}`}
                    style={{ height: "30px", padding: "0 12px", fontSize: "12px" }}
                    onClick={() => setEnvironment("marble")}
                  >
                    Marble
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Rendering Canvas wrapper - Now absolute and full screen */}
          <div 
            id="threeContainer"
            style={{
              width: "100vw",
              height: "100vh",
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 1,
              background: tryOnMode ? "#000" : "transparent"
            }}
          >
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
              )}              {/* Subtle Corner Watermark Typography */}
              {!tryOnMode && (
                <div 
                  className="studio-watermark"
                  style={{
                    position: "absolute",
                    bottom: "-2vw",
                    right: "2vw",
                    fontSize: "12vw",
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 900,
                    color: "var(--text-strong)",
                    opacity: 0.04,
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    zIndex: 0,
                    userSelect: "none",
                    letterSpacing: "-0.02em"
                  }}
                >
                  {safeModel.toUpperCase()}
                </div>
              )}

              {/* Floating Technical Specs Panel */}
              {!tryOnMode && (
                <div
                  className="studio-specs-panel"
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "120px",
                    transform: "translateY(-50%)",
                    background: "var(--glass-card-bg)",
                    backdropFilter: "blur(24px) saturate(180%)",
                    WebkitBackdropFilter: "blur(24px) saturate(180%)",
                    border: "1px solid var(--glass-card-border)",
                    borderRadius: "16px",
                    padding: "24px",
                    width: "240px",
                    zIndex: 10,
                    boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                    animation: "slideInLeftStudio 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.8s both"
                  }}
                >
                  <span style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "16px", display: "block", fontWeight: 600 }}>Technical Specs</span>
                  
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>Base Material</div>
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-strong)", textTransform: "capitalize" }}>
                      {color.includes('#6') || color.includes('#9') ? "Metal Alloy" : "Premium Acetate"}
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>Total Weight</div>
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-strong)" }}>
                      {color.includes('#6') || color.includes('#9') ? "16.8g (Ultra-light)" : "22.4g (Balanced)"}
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>Lenses</div>
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-strong)" }}>{isSunglasses ? "UV400 Polarized" : "Clear CR-39"}</div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>Est. Price</div>
                    <div style={{ fontSize: "20px", fontWeight: 600, color: "var(--primary-accent)", fontFamily: "'Playfair Display', serif" }}>
                      ${(180 + (isSunglasses ? 40 : 0) + (frameProfile === 'bold' ? 20 : 0) + (antiReflective ? 15 : 0)).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {/* Webcam Tracking Mode */}
              {tryOnMode && (
                <div style={{ width: "100%", height: "100%", position: "relative" }}>
                  <video 
                    ref={videoRef}
                    style={{ display: "none" }}
                    playsInline
                    muted
                  />
                  <canvas 
                    ref={canvasRef}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover"
                    }}
                  />
                  {!faceDetected && (
                    <div 
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        background: "rgba(0,0,0,0.72)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        padding: "16px 24px",
                        borderRadius: "8px",
                        color: "#fff",
                        textAlign: "center",
                        maxWidth: "80%"
                      }}
                    >
                      <HelpCircle size={32} style={{ margin: "0 auto 10px", color: "var(--primary-accent)" }} />
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: "600" }}>
                        {language === "pt"
                          ? "Procurando rosto... Por favor posicione-se em frente ├á c├ómera."
                          : "Searching for face... Please look directly at your webcam."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Three.js 3D Mode */}
              {!tryOnMode && (
                <div 
                  ref={containerRef}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                />
              )}

              {/* Floating Camera controls (Only in 3D Mode) */}
              {!tryOnMode && (
                <div 
                  style={{
                    position: "absolute",
                    bottom: "40px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    gap: "6px",
                    background: "var(--glass-card-bg)",
                    backdropFilter: "blur(24px) saturate(180%)",
                    WebkitBackdropFilter: "blur(24px) saturate(180%)",
                    padding: "10px",
                    borderRadius: "16px",
                    border: "1px solid var(--glass-card-border)",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                    zIndex: 40
                  }}
                >
                  <button 
                    onClick={() => setAutoRotate(!autoRotate)}
                    className={`btn ${autoRotate ? "primary" : ""}`}
                    style={{ width: "40px", height: "40px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px" }}
                    title="Toggle auto-rotation"
                  >
                    <RotateCw size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      cameraAngleRef.current.targetRadius = Math.max(4.6, cameraAngleRef.current.targetRadius - 0.8);
                    }}
                    className="btn"
                    style={{ width: "40px", height: "40px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px" }}
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      cameraAngleRef.current.targetRadius = Math.min(13.2, cameraAngleRef.current.targetRadius + 0.8);
                    }}
                    className="btn"
                    style={{ width: "40px", height: "40px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px" }}
                  >
                    <ZoomOut size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Viewport footer actions & Smart Face Recognition Advice */}
            <div className="studio-left-panel">
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
                        <span style={{ color: "var(--primary-accent)" }}>ÔÇó</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              {activeStep === 1 && (
                <div>
                  <div style={{ marginBottom: "24px" }}>
                    <span className="panel-kicker">{t("silhouette-kicker")}</span>
                    <h2>{t("silhouette-title")}</h2>
                    <p style={{ fontSize: "13px", color: "var(--color-hint)", marginTop: "4px" }}>
                      {language === "pt"
                        ? "Escolha a silhueta principal. As dimens├Áes s├úo calibradas automaticamente para manter as propor├º├Áes est├®ticas ideais."
                        : "Select the base silhouette style. Physical dimensions are pre-configured automatically to preserve ideal aesthetic proportions."}
                    </p>
                  </div>

                  {/* Glassmorphic buttons for silhouettes */}
                  <div 
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr",
                      gap: "12px",
                      marginBottom: "30px"
                    }}
                  >
                    {[
                      { id: "aviator", title: "Aviator", desc: "The legendary pilot silhouette", svg: (
                        <svg viewBox="0 0 100 100" style={{ width: "38px", height: "38px", fill: "none", stroke: "currentColor", strokeWidth: "4", strokeLinecap: "round" }}>
                          <path d="M 50 15 C 80 15, 90 40, 90 65 C 90 85, 75 90, 50 90 C 25 90, 10 85, 10 65 C 10 40, 20 15, 50 15 Z" />
                        </svg>
                      )},
                      { id: "wayfarer", title: "Wayfarer", desc: "Bold cinematic structure", svg: (
                        <svg viewBox="0 0 100 100" style={{ width: "38px", height: "38px", fill: "none", stroke: "currentColor", strokeWidth: "4", strokeLinejoin: "round" }}>
                          <path d="M 15 25 L 85 25 C 90 25, 95 30, 95 40 L 80 85 C 75 90, 60 90, 50 90 C 40 90, 25 90, 20 85 L 5 40 C 5 30, 10 25, 15 25 Z" />
                        </svg>
                      )},
                      { id: "cateye", title: "Cat-Eye", desc: "Elegant feminine swoop", svg: (
                        <svg viewBox="0 0 100 100" style={{ width: "38px", height: "38px", fill: "none", stroke: "currentColor", strokeWidth: "4", strokeLinejoin: "round" }}>
                          <path d="M 25 35 C 40 25, 60 25, 75 35 C 85 40, 95 20, 95 20 C 95 20, 95 60, 85 80 C 75 90, 50 95, 50 95 C 50 95, 25 90, 15 80 C 5 60, 5 20, 5 20 C 5 20, 15 40, 25 35 Z" />
                        </svg>
                      )}
                    ].map((item) => {
                      const isActive = model === item.id;
                      return (
                        <div 
                          key={item.id}
                          onClick={() => setModel(item.id)}
                          style={{
                            background: isActive ? "var(--input-bg)" : "transparent",
                            border: isActive ? "2px solid var(--primary-accent)" : "1px solid var(--input-border)",
                            borderRadius: "10px",
                            padding: "16px 20px",
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            color: "var(--text-dark)",
                            boxShadow: isActive ? "var(--shadow-hover)" : "none"
                          }}
                          className="silhouette-card-hover"
                        >
                          <div style={{ color: isActive ? "var(--primary-accent)" : "var(--color-hint)" }}>
                            {item.svg}
                          </div>
                          <div>
                            <strong style={{ display: "block", fontSize: "14px", letterSpacing: "1px" }}>{item.title}</strong>
                            <span style={{ fontSize: "12px", color: "var(--color-hint)", marginTop: "2px", display: "block" }}>{item.desc}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Aesthetic Frame profile & options */}
                  <div style={{ borderTop: "1px solid var(--input-border)", paddingTop: "24px" }}>
                    <h3 style={{ fontSize: "14px", letterSpacing: "1px", marginBottom: "16px", textTransform: "uppercase" }}>
                      {language === "pt" ? "ESTILO E PERFIL" : "FRAME PROFILE & STRUCTURE"}
                    </h3>

                    {/* Frame Profile */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--color-hint)", marginBottom: "8px", textTransform: "uppercase" }}>
                        Frame Profile
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                        {[
                          { id: "thin", label: "Thin" },
                          { id: "medium", label: "Medium" },
                          { id: "bold", label: "Bold" }
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            className={`btn ${frameProfile === opt.id ? "primary" : ""}`}
                            style={{ height: "34px", padding: 0, fontSize: "12px", textTransform: "uppercase" }}
                            onClick={() => setFrameProfile(opt.id)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bridge Style */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--color-hint)", marginBottom: "8px", textTransform: "uppercase" }}>
                        Bridge Style
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                        {[
                          { id: "soft", label: "Soft Arch" },
                          { id: "keyhole", label: "Keyhole" },
                          { id: "flat", label: "Flat" }
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            className={`btn ${bridgeStyle === opt.id ? "primary" : ""}`}
                            style={{ height: "34px", padding: 0, fontSize: "12px", textTransform: "uppercase" }}
                            onClick={() => setBridgeStyle(opt.id)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Top Bar Accent (Double bridge) */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--input-bg)", padding: "12px 16px", borderRadius: "8px", border: "1px solid var(--input-border)", boxShadow: "var(--shadow)" }}>
                      <div>
                        <strong style={{ display: "block", fontSize: "13px" }}>Double Bridge (Top Bar)</strong>
                        <span style={{ fontSize: "11px", color: "var(--color-hint)" }}>Adds secondary upper support bar</span>
                      </div>
                      <label className="switch" style={{ position: "relative", display: "inline-block", width: "40px", height: "20px" }}>
                        <input 
                          type="checkbox" 
                          checked={topBar} 
                          onChange={(e) => setTopBar(e.target.checked)}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span 
                          style={{
                            position: "absolute",
                            cursor: "pointer",
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: topBar ? "var(--primary-accent)" : "var(--input-border)",
                            transition: "0.2s",
                            borderRadius: "20px"
                          }}
                        >
                          <span 
                            style={{
                              position: "absolute",
                              content: '""',
                              height: "14px", width: "14px",
                              left: topBar ? "22px" : "3px",
                              bottom: "3px",
                              borderRadius: "50%",
                              transition: "0.2s",
                              background: "#fff"
                            }}
                          />
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Finish & Material Configuration */}
              {activeStep === 2 && (
                <div>
                  <div style={{ marginBottom: "24px" }}>
                    <span className="panel-kicker">{t("finish-kicker")}</span>
                    <h2>{t("finish-title")}</h2>
                    <p style={{ fontSize: "13px", color: "var(--color-hint)", marginTop: "4px" }}>
                      {t("finish-desc")}
                    </p>
                  </div>

                  {/* Frame Colors: curated bubbles + Hex selection */}
                  <div style={{ marginBottom: "24px" }}>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--color-hint)", marginBottom: "12px", textTransform: "uppercase" }}>
                      {language === "pt" ? "Arma├º├úo - Escolha de Cor" : "Frame Acetate/Metal Color"}
                    </label>
                    
                    {/* Curated color palette dots */}
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                      {CURATED_COLORS.map((item) => {
                        const isSelected = color.toLowerCase() === item.hex.toLowerCase();
                        return (
                          <button
                            key={item.hex}
                            onClick={() => setColor(item.hex)}
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background: item.hex,
                              border: isSelected ? "2px solid var(--text-dark)" : "1px solid var(--input-border)",
                              boxShadow: isSelected ? "0 0 10px var(--primary-accent)" : "none",
                              cursor: "pointer",
                              position: "relative",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "transform 0.2s"
                            }}
                            title={item.name}
                            className="color-bubble-hover"
                          >
                            {isSelected && (
                              <Check size={14} color={item.hex === "#dbeafe" ? "#111" : "#fff"} />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Hex Color Picker */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input 
                        type="color" 
                        value={color} 
                        onChange={(e) => setColor(e.target.value)}
                        style={{
                          border: "none",
                          background: "none",
                          width: "38px",
                          height: "38px",
                          cursor: "pointer",
                          padding: 0
                        }}
                      />
                      <input 
                        type="text" 
                        value={color.toUpperCase()} 
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.startsWith("#") && val.length <= 7) setColor(val);
                        }}
                        className="premium-input"
                        style={{
                          padding: "8px 12px",
                          fontSize: "13px",
                          width: "90px",
                          textAlign: "center"
                        }}
                      />
                      <span style={{ fontSize: "11px", color: "var(--color-hint)" }}>Custom hex shade</span>
                    </div>
                  </div>

                  {/* Temple Leg Styles */}
                  <div style={{ marginBottom: "24px" }}>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--color-hint)", marginBottom: "8px", textTransform: "uppercase" }}>
                      Temple Style
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                      {[
                        { id: "classic", label: "Classic Curve" },
                        { id: "straight", label: "Straight Line" },
                        { id: "sport", label: "Sport Grip" }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          className={`btn ${templeStyle === opt.id ? "primary" : ""}`}
                          style={{ height: "34px", padding: 0, fontSize: "12px", textTransform: "uppercase" }}
                          onClick={() => setTempleStyle(opt.id)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lenses specs */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                    {/* Sunglasses Lens Toggle */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--input-bg)", padding: "12px 16px", borderRadius: "8px", border: "1px solid var(--input-border)", boxShadow: "var(--shadow)" }}>
                      <div>
                        <strong style={{ display: "block", fontSize: "13px" }}>Sunglasses Tint Lenses</strong>
                        <span style={{ fontSize: "11px", color: "var(--color-hint)" }}>Polychromatic UV400 dark filter</span>
                      </div>
                      <label className="switch" style={{ position: "relative", display: "inline-block", width: "40px", height: "20px" }}>
                        <input 
                          type="checkbox" 
                          checked={isSunglasses} 
                          onChange={(e) => setIsSunglasses(e.target.checked)}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span 
                          style={{
                            position: "absolute",
                            cursor: "pointer",
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: isSunglasses ? "var(--primary-accent)" : "var(--input-border)",
                            transition: "0.2s",
                            borderRadius: "20px"
                          }}
                        >
                          <span 
                            style={{
                              position: "absolute",
                              content: '""',
                              height: "14px", width: "14px",
                              left: isSunglasses ? "22px" : "3px",
                              bottom: "3px",
                              borderRadius: "50%",
                              transition: "0.2s",
                              background: "#fff"
                            }}
                          />
                        </span>
                      </label>
                    </div>

                    {/* Anti reflective toggle */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--input-bg)", padding: "12px 16px", borderRadius: "8px", border: "1px solid var(--input-border)", boxShadow: "var(--shadow)" }}>
                      <div>
                        <strong style={{ display: "block", fontSize: "13px" }}>Anti-Reflective Coating</strong>
                        <span style={{ fontSize: "11px", color: "var(--color-hint)" }}>Removes glare and camera blue flare</span>
                      </div>
                      <label className="switch" style={{ position: "relative", display: "inline-block", width: "40px", height: "20px" }}>
                        <input 
                          type="checkbox" 
                          checked={antiReflective} 
                          onChange={(e) => setAntiReflective(e.target.checked)}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span 
                          style={{
                            position: "absolute",
                            cursor: "pointer",
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: antiReflective ? "var(--primary-accent)" : "var(--input-border)",
                            transition: "0.2s",
                            borderRadius: "20px"
                          }}
                        >
                          <span 
                            style={{
                              position: "absolute",
                              content: '""',
                              height: "14px", width: "14px",
                              left: antiReflective ? "22px" : "3px",
                              bottom: "3px",
                              borderRadius: "50%",
                              transition: "0.2s",
                              background: "#fff"
                            }}
                          />
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Prescription file Upload */}
                  <div style={{ marginBottom: "24px" }}>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--color-hint)", marginBottom: "8px", textTransform: "uppercase" }}>
                      Upload Prescription File (Optional)
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label 
                        className="btn"
                        style={{
                          height: "36px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          cursor: "pointer"
                        }}
                      >
                        <Upload size={14} /> 
                        <span>{prescriptionFileName ? "Change File" : "Choose File"}</span>
                        <input 
                          type="file" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setPrescriptionFileName(file.name);
                              showToast(language === "pt" ? "Receita anexada!" : "Prescription file loaded.");
                            }
                          }}
                          accept=".pdf,.png,.jpg,.jpeg"
                          style={{ display: "none" }}
                        />
                      </label>
                      
                      {prescriptionFileName ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "12px", color: "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                            {prescriptionFileName}
                          </span>
                          <button 
                            type="button" 
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}
                            onClick={() => setPrescriptionFileName("")}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--color-hint)" }}>No file attached</span>
                      )}
                    </div>
                  </div>

                  {/* Temple leg folding (Viewer leg control) */}
                  <div style={{ borderTop: "1px solid var(--input-border)", paddingTop: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--color-hint)", textTransform: "uppercase" }}>
                        Fold Hinge Temples
                      </label>
                      <span style={{ fontSize: "12px", fontWeight: "600" }}>{Math.round(templeOpen * 100)}%</span>
                    </div>
                    <input 
                      type="range"
                      min="-0.05"
                      max="0.65"
                      step="0.01"
                      value={templeOpen}
                      onChange={(e) => setTempleOpen(parseFloat(e.target.value))}
                      style={{ width: "100%", accentColor: "var(--primary-accent)" }}
                    />
                  </div>
                </div>
              )}
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
                    ? "Transmita as especifica├º├Áes geom├®tricas exatas deste ├│culos diretamente para as m├íquinas da f├íbrica de sua escolha."
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
                    ? `Seu pedido foi enfileirado com sucesso com o ID ${createdOrderNumber}. O andamento pode ser verificado nos pain├®is.`
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
