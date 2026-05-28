import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useCreator } from '../../contexts/CreatorContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { Camera, RotateCw, ZoomIn, ZoomOut, HelpCircle } from 'lucide-react';

export default function CreatorCanvas() {
  const { 
    model, color, isSunglasses, antiReflective, frameProfile, bridgeStyle, topBar, templeStyle, templeOpen, 
    environment, setEnvironment, autoRotate, setAutoRotate, 
    tryOnMode, setTryOnMode, loadingLandmarker, setLoadingLandmarker, faceDetected, setFaceDetected,
    setStatusMessage
  } = useCreator();
  const { t, language } = useTranslation();

  // Helper dims mapping
  const dimensionsMap = {
    "aviator": { w: 1.8, h: 1.45, bridge: 0.35 },
    "wayfarer": { w: 1.7, h: 1.25, bridge: 0.4 },
    "cateye": { w: 1.65, h: 1.3, bridge: 0.35 }
  };
  const currentDims = dimensionsMap[model] || dimensionsMap["aviator"];
  const safeModel = dimensionsMap[model] ? model : "aviator";

  // --- 2. Initialize Three.js WebGL Engine ---
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

  // Basic Three.js setup
  useEffect(() => {
    if (!containerRef.current) return;

    sceneRef.current = new THREE.Scene();
    
    // Add realistic subtle fog for depth
    sceneRef.current.fog = new THREE.FogExp2(0xffffff, 0.015);

    cameraRef.current = new THREE.PerspectiveCamera(45, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 100);
    // Initial camera position will be overwritten by animation loop
    cameraRef.current.position.set(4, 1.5, 4);

    rendererRef.current = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // High-end tone mapping for cinematic rendering
    rendererRef.current.toneMapping = THREE.ACESFilmicToneMapping;
    rendererRef.current.toneMappingExposure = 1.1;
    rendererRef.current.shadowMap.enabled = true;
    rendererRef.current.shadowMap.type = THREE.PCFSoftShadowMap;

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(rendererRef.current.domElement);

    // Advanced Lighting Setup
    // 1. Soft Ambient Fill
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    sceneRef.current.add(ambientLight);

    // 2. Main Key Light (Warm, casting soft shadows)
    const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.5);
    keyLight.position.set(5, 8, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.bias = -0.001;
    sceneRef.current.add(keyLight);

    // 3. Cool Rim Light for Edge Highlighting
    const rimLight = new THREE.DirectionalLight(0xe6f0ff, 1.2);
    rimLight.position.set(-5, 5, -5);
    sceneRef.current.add(rimLight);

    // 4. Subtle Bottom Bounce Light
    const bounceLight = new THREE.DirectionalLight(0xffffff, 0.4);
    bounceLight.position.set(0, -5, 0);
    sceneRef.current.add(bounceLight);

    // Glasses Group Setup
    glassesGroupRef.current = new THREE.Group();
    sceneRef.current.add(glassesGroupRef.current);

    frontGroupRef.current = new THREE.Group();
    glassesGroupRef.current.add(frontGroupRef.current);

    leftTemplePivotRef.current = new THREE.Group();
    rightTemplePivotRef.current = new THREE.Group();
    glassesGroupRef.current.add(leftTemplePivotRef.current);
    glassesGroupRef.current.add(rightTemplePivotRef.current);

    // Force a resize check periodically just in case CSS transitions delay the initial paint
    const forceResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      if (width > 0 && height > 0) {
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
      }
    };
    
    // Handle Container Resize dynamically using ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (!rendererRef.current || !cameraRef.current) return;
        const width = entry.contentRect.width || entry.target.clientWidth;
        const height = entry.contentRect.height || entry.target.clientHeight;
        if (width > 0 && height > 0) {
          cameraRef.current.aspect = width / height;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(width, height);
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
      setTimeout(forceResize, 100);
      setTimeout(forceResize, 500);
      setTimeout(forceResize, 1500);
    }

    return () => {
      resizeObserver.disconnect();
      if (rendererRef.current) rendererRef.current.dispose();
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (trackingFrameIdRef.current) cancelAnimationFrame(trackingFrameIdRef.current);
    };
  }, []);

  // Set up the Environment (Studio, Wood, Marble)
  useEffect(() => {
    if (!sceneRef.current) return;

    // Clean up old environment
    if (floorRef.current) sceneRef.current.remove(floorRef.current);
    if (stagePlateRef.current) sceneRef.current.remove(stagePlateRef.current);
    if (stageBaseRef.current) sceneRef.current.remove(stageBaseRef.current);

    // Common Texture loader
    const textureLoader = new THREE.TextureLoader();

    // 1. The Floor Plane
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    let floorMat;

    // 2. The Pedestal / Stage
    const stageGeo = new THREE.CylinderGeometry(2, 2.2, 0.1, 64);
    let stageMat;
    
    // 3. The Stage Base
    const baseGeo = new THREE.CylinderGeometry(2.4, 3, 0.4, 64);
    let baseMat;

    if (environment === "wood") {
      sceneRef.current.background = new THREE.Color("#f4ede4");
      sceneRef.current.fog.color.set("#f4ede4");
      
      floorMat = new THREE.MeshStandardMaterial({ 
        color: "#d8c4b6",
        roughness: 0.8,
        metalness: 0.1
      });

      stageMat = new THREE.MeshStandardMaterial({
        color: "#8b5a2b", // Rich wood tone
        roughness: 0.3,
        metalness: 0.1
      });

      baseMat = new THREE.MeshStandardMaterial({
        color: "#111",
        roughness: 0.6
      });

    } else if (environment === "marble") {
      sceneRef.current.background = new THREE.Color("#e9ecef");
      sceneRef.current.fog.color.set("#e9ecef");
      
      floorMat = new THREE.MeshStandardMaterial({ 
        color: "#ffffff",
        roughness: 0.1, // Highly reflective
        metalness: 0.2
      });

      stageMat = new THREE.MeshStandardMaterial({
        color: "#f8f9fa",
        roughness: 0.05,
        metalness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
      });

      baseMat = new THREE.MeshStandardMaterial({
        color: "#ced4da",
        roughness: 0.4
      });

    } else {
      // Default Studio
      sceneRef.current.background = new THREE.Color("#f8fafc");
      sceneRef.current.fog.color.set("#f8fafc");
      
      floorMat = new THREE.MeshStandardMaterial({ 
        color: "#f1f5f9", 
        roughness: 0.4, 
        metalness: 0.1 
      });

      stageMat = new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 0.2,
        metalness: 0.1
      });

      baseMat = new THREE.MeshStandardMaterial({
        color: "#e2e8f0",
        roughness: 0.5
      });
    }

    // Add Floor
    floorRef.current = new THREE.Mesh(floorGeo, floorMat);
    floorRef.current.rotation.x = -Math.PI / 2;
    floorRef.current.position.y = -1.2;
    floorRef.current.receiveShadow = true;
    sceneRef.current.add(floorRef.current);

    // Add Stage Plate
    stagePlateRef.current = new THREE.Mesh(stageGeo, stageMat);
    stagePlateRef.current.position.y = -1.15;
    stagePlateRef.current.receiveShadow = true;
    stagePlateRef.current.castShadow = true;
    sceneRef.current.add(stagePlateRef.current);

    // Add Stage Base
    stageBaseRef.current = new THREE.Mesh(baseGeo, baseMat);
    stageBaseRef.current.position.y = -1.4;
    stageBaseRef.current.receiveShadow = true;
    stageBaseRef.current.castShadow = true;
    sceneRef.current.add(stageBaseRef.current);

  }, [environment]);

  // Main Geometry Generation Logic
  useEffect(() => {
    if (!frontGroupRef.current) return;

    // Clear previous geometry
    while (frontGroupRef.current.children.length > 0) {
      frontGroupRef.current.remove(frontGroupRef.current.children[0]);
    }
    while (leftTemplePivotRef.current.children.length > 0) {
      leftTemplePivotRef.current.remove(leftTemplePivotRef.current.children[0]);
    }
    while (rightTemplePivotRef.current.children.length > 0) {
      rightTemplePivotRef.current.remove(rightTemplePivotRef.current.children[0]);
    }
    if (haloRingRef.current) {
      sceneRef.current.remove(haloRingRef.current);
    }

    const { w, h, bridge } = currentDims;
    const thickness = frameProfile === "thin" ? 0.05 : frameProfile === "bold" ? 0.18 : 0.1;

    // Materials Configuration
    const frameMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      metalness: (color.includes('#6') || color.includes('#9')) ? 0.9 : 0.1,
      roughness: (color.includes('#6') || color.includes('#9')) ? 0.2 : 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transmission: color === '#dbeafe' ? 0.6 : 0.0, // Crystal transparency
      thickness: 0.5
    });

    const lensMaterial = new THREE.MeshPhysicalMaterial({
      color: isSunglasses ? 0x111111 : 0xffffff,
      transmission: isSunglasses ? 0.4 : 0.98,
      opacity: 1,
      transparent: true,
      roughness: 0.0,
      metalness: 0.1,
      ior: 1.5,
      thickness: 0.02,
      clearcoat: antiReflective ? 1.0 : 0.0,
      clearcoatRoughness: 0.0
    });

    if (antiReflective) {
      lensMaterial.iridescence = 0.5;
      lensMaterial.iridescenceIOR = 1.3;
    }

    // Helper: Create a smooth, rounded lens shape based on model
    const createLensShape = (modelType, width, height) => {
      const shape = new THREE.Shape();
      if (modelType === "aviator") {
        shape.moveTo(0, height/2);
        shape.quadraticCurveTo(width/2, height/2, width/2, 0);
        shape.quadraticCurveTo(width/2, -height/2, 0, -height/2);
        shape.quadraticCurveTo(-width/2, -height/2, -width/2, 0);
        shape.quadraticCurveTo(-width/2, height/2, 0, height/2);
      } else if (modelType === "wayfarer") {
        shape.moveTo(-width/2, height/2);
        shape.lineTo(width/2, height/2);
        shape.quadraticCurveTo(width/2, -height/2, width/3, -height/2);
        shape.lineTo(-width/3, -height/2);
        shape.quadraticCurveTo(-width/2, -height/2, -width/2, height/2);
      } else if (modelType === "cateye") {
        shape.moveTo(-width/2 + 0.2, height/2);
        shape.lineTo(width/2, height/2 + 0.3); // High peak
        shape.quadraticCurveTo(width/2, -height/2, 0, -height/2);
        shape.quadraticCurveTo(-width/2, -height/2, -width/2 + 0.2, height/2);
      }
      return shape;
    };

    const generateProceduralGlasses = () => {
      const lensShape = createLensShape(safeModel, w, h);

      // Helper: Extrude settings for the rim
      const extrudeSettings = {
        steps: 1, depth: thickness, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4
      };

      const hollowRimGeo = new THREE.ExtrudeGeometry(lensShape, extrudeSettings);
      const holePath = createLensShape(safeModel, w - thickness, h - thickness);
      lensShape.holes.push(holePath);

      const leftRim = new THREE.Mesh(hollowRimGeo, frameMaterial);
      leftRim.position.x = -(w / 2 + bridge / 2);
      leftRim.castShadow = true;
      frontGroupRef.current.add(leftRim);

      const rightRim = new THREE.Mesh(hollowRimGeo, frameMaterial);
      rightRim.position.x = (w / 2 + bridge / 2);
      if (safeModel !== 'aviator') rightRim.scale.x = -1;
      rightRim.castShadow = true;
      frontGroupRef.current.add(rightRim);

      const lensGeo = new THREE.ShapeGeometry(holePath);
      const leftLens = new THREE.Mesh(lensGeo, lensMaterial);
      leftLens.position.x = leftRim.position.x;
      leftLens.position.z = thickness / 2;
      frontGroupRef.current.add(leftLens);

      const rightLens = new THREE.Mesh(lensGeo, lensMaterial);
      rightLens.position.x = rightRim.position.x;
      rightLens.position.z = thickness / 2;
      if (safeModel !== 'aviator') rightLens.scale.x = -1;
      frontGroupRef.current.add(rightLens);

      const bridgeGeo = new THREE.CylinderGeometry(thickness/2, thickness/2, bridge + 0.1, 16);
      const bridgeMesh = new THREE.Mesh(bridgeGeo, frameMaterial);
      bridgeMesh.rotation.z = Math.PI / 2;
      
      if (bridgeStyle === 'keyhole') {
        bridgeMesh.position.y = h / 4;
        bridgeMesh.scale.set(1.5, 1, 1);
      } else if (bridgeStyle === 'flat') {
        bridgeMesh.position.y = 0;
        bridgeGeo.scale(1, 1, 0.5);
      } else {
        bridgeMesh.position.y = h / 6;
      }
      bridgeMesh.castShadow = true;
      frontGroupRef.current.add(bridgeMesh);

      if (topBar) {
        const topBarGeo = new THREE.CylinderGeometry(thickness/3, thickness/3, bridge + w, 16);
        const topBarMesh = new THREE.Mesh(topBarGeo, frameMaterial);
        topBarMesh.rotation.z = Math.PI / 2;
        topBarMesh.position.y = h / 2;
        topBarMesh.position.z = thickness / 2;
        topBarMesh.castShadow = true;
        frontGroupRef.current.add(topBarMesh);
      }

      const templeLength = 2.5;
      const createTemple = () => {
        if (templeStyle === 'straight') {
          const geo = new THREE.BoxGeometry(thickness, thickness * 1.5, templeLength);
          geo.translate(0, 0, -templeLength/2);
          return new THREE.Mesh(geo, frameMaterial);
        } else if (templeStyle === 'sport') {
          const shape = new THREE.Shape();
          shape.moveTo(0, 0); shape.lineTo(thickness, 0); shape.lineTo(thickness, -templeLength);
          shape.quadraticCurveTo(thickness, -templeLength - 0.5, thickness * 2, -templeLength - 0.8);
          shape.lineTo(0, -templeLength - 0.8); shape.lineTo(0, 0);
          const extrude = new THREE.ExtrudeGeometry(shape, { depth: thickness/2, bevelEnabled: true, bevelThickness: 0.01 });
          const mesh = new THREE.Mesh(extrude, frameMaterial);
          mesh.rotation.x = Math.PI / 2;
          return mesh;
        } else {
          const geo = new THREE.CylinderGeometry(thickness/1.5, thickness/2, templeLength, 16);
          geo.rotateX(Math.PI / 2);
          geo.translate(0, 0, -templeLength/2);
          return new THREE.Mesh(geo, frameMaterial);
        }
      };

      const leftTemple = createTemple();
      leftTemple.castShadow = true;
      leftTemplePivotRef.current.position.set(-(w + bridge)/2 - thickness, h/4, thickness/2);
      leftTemplePivotRef.current.add(leftTemple);

      const rightTemple = createTemple();
      rightTemple.castShadow = true;
      rightTemplePivotRef.current.position.set((w + bridge)/2 + thickness, h/4, thickness/2);
      rightTemplePivotRef.current.add(rightTemple);

      leftTemplePivotRef.current.rotation.y = templeOpen;
      rightTemplePivotRef.current.rotation.y = -templeOpen;
    };

    // --- HYBRID GLB LOADER ---
    const loader = new GLTFLoader();
    const modelPath = `/models/${safeModel}.glb`;
    
    loader.load(
      modelPath,
      (gltf) => {
        console.log(`[Opticus] ${modelPath} carregado com sucesso!`);
        
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            const name = child.name.toLowerCase();
            if (name.includes('lens') || name.includes('lente') || name.includes('vidro')) {
              child.material = lensMaterial;
            } else {
              child.material = frameMaterial;
            }
          }
        });

        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Protect against corrupted bounding boxes causing Infinity scaling
        const targetWidth = (w * 2 + bridge) || 3.95;
        let scaleFactor = 1;
        if (size.x > 0.001) {
          scaleFactor = targetWidth / size.x;
        } else {
          console.warn("[Opticus] Aviso: Bounding Box do modelo 3D é muito pequena ou inválida. Aplicando escala padrão.");
          scaleFactor = 10;
        }
        
        // Prevent catastrophic scales
        if (isNaN(scaleFactor) || !isFinite(scaleFactor)) {
          scaleFactor = 1;
        }
        scaleFactor = Math.min(Math.max(scaleFactor, 0.001), 1000);
        
        // Apply Scale FIRST
        gltf.scene.scale.setScalar(scaleFactor);
        
        // THEN Apply Position Translation so the exact center lands on (0,0,0)
        // Formula: P = -C * S
        gltf.scene.position.x = -center.x * scaleFactor;
        gltf.scene.position.y = -center.y * scaleFactor;
        gltf.scene.position.z = -center.z * scaleFactor;

        frontGroupRef.current.add(gltf.scene);
      },
      undefined,
      (error) => {
        // Fallback para matemática procedural se o arquivo não existir
        generateProceduralGlasses();
      }
    );
    // Optional: Add a subtle glowing halo on the stage
    const haloGeo = new THREE.RingGeometry(2.3, 2.35, 64);
    const haloMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    haloRingRef.current = new THREE.Mesh(haloGeo, haloMat);
    haloRingRef.current.rotation.x = -Math.PI / 2;
    haloRingRef.current.position.y = -1.14;
    sceneRef.current.add(haloRingRef.current);

  }, [model, color, isSunglasses, antiReflective, frameProfile, bridgeStyle, topBar, templeStyle, templeOpen]);

  // Handle custom mouse dragging for smooth orbit
  useEffect(() => {
    if (!rendererRef.current) return;
    const domElement = rendererRef.current.domElement;

    const onMouseDown = (e) => {
      cameraAngleRef.current.isDragging = true;
      cameraAngleRef.current.lastX = e.clientX;
      cameraAngleRef.current.lastY = e.clientY;
      setAutoRotate(false); // Stop auto-rotate if user interacts
    };

    const onMouseMove = (e) => {
      if (!cameraAngleRef.current.isDragging) return;
      const deltaX = e.clientX - cameraAngleRef.current.lastX;
      const deltaY = e.clientY - cameraAngleRef.current.lastY;
      
      cameraAngleRef.current.targetYaw -= deltaX * 0.01;
      cameraAngleRef.current.targetPitch -= deltaY * 0.01;
      
      // Clamp pitch to avoid going under the floor or too high
      cameraAngleRef.current.targetPitch = Math.max(-0.2, Math.min(Math.PI / 2.5, cameraAngleRef.current.targetPitch));
      
      cameraAngleRef.current.lastX = e.clientX;
      cameraAngleRef.current.lastY = e.clientY;
    };

    const onMouseUp = () => {
      cameraAngleRef.current.isDragging = false;
    };

    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Touch support
    domElement.addEventListener('touchstart', (e) => {
      if(e.touches.length > 0) {
        onMouseDown(e.touches[0]);
      }
    });
    window.addEventListener('touchmove', (e) => {
      if(e.touches.length > 0) {
        onMouseMove(e.touches[0]);
      }
    });
    window.addEventListener('touchend', onMouseUp);

    return () => {
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('touchstart', onMouseDown);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [setAutoRotate]);

  // Main Render Loop with Smooth Interpolation
  useEffect(() => {
    const renderLoop = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

      // Auto-rotation logic
      if (autoRotate && !cameraAngleRef.current.isDragging && !tryOnMode) {
        cameraAngleRef.current.targetYaw += 0.003;
      }

      // Smoothly interpolate current angles towards target angles
      cameraAngleRef.current.currentYaw += (cameraAngleRef.current.targetYaw - cameraAngleRef.current.currentYaw) * 0.1;
      cameraAngleRef.current.currentPitch += (cameraAngleRef.current.targetPitch - cameraAngleRef.current.currentPitch) * 0.1;
      cameraAngleRef.current.currentRadius += (cameraAngleRef.current.targetRadius - cameraAngleRef.current.currentRadius) * 0.1;

      // Calculate camera position using spherical coordinates
      const r = cameraAngleRef.current.currentRadius;
      const phi = Math.PI / 2 - cameraAngleRef.current.currentPitch;
      const theta = cameraAngleRef.current.currentYaw;

      cameraRef.current.position.x = r * Math.sin(phi) * Math.sin(theta);
      cameraRef.current.position.y = r * Math.cos(phi);
      cameraRef.current.position.z = r * Math.sin(phi) * Math.cos(theta);
      
      // Look at the center of the glasses
      cameraRef.current.lookAt(0, 0, 0);

      // Add gentle floating animation to glasses group
      if (glassesGroupRef.current && !tryOnMode) {
        const time = Date.now() * 0.001;
        glassesGroupRef.current.position.y = Math.sin(time) * 0.05;
        // The stage ring pulses
        if (haloRingRef.current) {
          haloRingRef.current.scale.setScalar(1 + Math.sin(time * 2) * 0.02);
          haloRingRef.current.material.opacity = 0.2 + Math.sin(time * 2) * 0.05;
        }
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animFrameIdRef.current);
  }, [autoRotate, tryOnMode]);

  // --- 5. MediaPipe Live Try-On Mode ---
  const startTryOn = async () => {
    setLoadingLandmarker(true);
    setTryOnMode(true);
    setAutoRotate(false); // Disable auto-rotate during try-on

    try {
      // Lazy load MediaPipe dynamically to reduce initial bundle
      const { FilesetResolver, FaceLandmarker } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.js");
      
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );

      faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1
      });

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720, facingMode: "user" } 
      });
      
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setLoadingLandmarker(false);
      trackFaceLoop();
      setStatusMessage(language === "pt" ? "Câmera conectada com sucesso!" : "Webcam connected successfully!");

    } catch (err) {
      console.error("Try-on init error:", err);
      setLoadingLandmarker(false);
      setTryOnMode(false);
      setStatusMessage(language === "pt" ? "Erro ao acessar webcam." : "Webcam access denied.");
    }
  };

  const stopTryOn = () => {
    setTryOnMode(false);
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (trackingFrameIdRef.current) {
      cancelAnimationFrame(trackingFrameIdRef.current);
    }
    setFaceDetected(false);
  };

  const trackFaceLoop = () => {
    if (!tryOnMode || !videoRef.current || !canvasRef.current || !faceLandmarkerRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (video.currentTime > 0) {
      // Ensure canvas matches video size
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Draw the mirrored webcam feed
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Detect face
      const results = faceLandmarkerRef.current.detectForVideo(video, performance.now());
      
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        if (!faceDetected) setFaceDetected(true);
        const landmarks = results.faceLandmarks[0];

        // Key landmarks for glasses placement
        // 33: Left eye outer corner, 263: Right eye outer corner
        // 168: Bridge of nose
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const noseBridge = landmarks[168];

        // Convert normalized coordinates to canvas pixels (mirrored)
        const toPx = (point) => ({
          x: (1 - point.x) * canvas.width,
          y: point.y * canvas.height
        });

        const pLeft = toPx(leftEye);
        const pRight = toPx(rightEye);
        const pNose = toPx(noseBridge);

        // Calculate size and rotation based on face scale
        const faceWidthPx = Math.hypot(pRight.x - pLeft.x, pRight.y - pLeft.y);
        const angle = Math.atan2(pRight.y - pLeft.y, pRight.x - pLeft.x);

        // Target geometry values
        const targetCx = pNose.x;
        const targetCy = pNose.y - (faceWidthPx * 0.1); // Shift slightly up
        
        // Glasses width multiplier
        const widthMult = frameProfile === "bold" ? 1.4 : 1.3;
        const targetLensW = faceWidthPx * widthMult;
        // Height ratio depends on model
        const heightRatio = currentDims.h / currentDims.w;
        const targetLensH = targetLensW * heightRatio;

        // Smooth Interpolation
        if (!smoothTryOnRef.current.initialized) {
          smoothTryOnRef.current = {
            cx: targetCx, cy: targetCy, lensW: targetLensW, lensH: targetLensH, angle, initialized: true
          };
        } else {
          const s = smoothTryOnRef.current;
          s.cx += (targetCx - s.cx) * 0.3;
          s.cy += (targetCy - s.cy) * 0.3;
          s.lensW += (targetLensW - s.lensW) * 0.3;
          s.lensH += (targetLensH - s.lensH) * 0.3;
          s.angle += (angle - s.angle) * 0.3;
        }

        const s = smoothTryOnRef.current;

        // Render AR overlay glasses over the 2D canvas
        ctx.save();
        ctx.translate(s.cx, s.cy);
        ctx.rotate(s.angle);

        // Draw Left Lens (using exact dimensions of current design)
        ctx.fillStyle = isSunglasses ? 'rgba(20,20,20,0.85)' : 'rgba(255,255,255,0.1)';
        ctx.strokeStyle = color;
        ctx.lineWidth = frameProfile === "thin" ? 2 : frameProfile === "bold" ? 8 : 4;
        
        const drawARLens = (xOffset) => {
          ctx.beginPath();
          if (safeModel === "aviator") {
            // AR Ellipse approximation
            ctx.ellipse(xOffset, 0, s.lensW/4, s.lensH/2, 0, 0, Math.PI * 2);
          } else if (safeModel === "wayfarer") {
            ctx.roundRect(xOffset - s.lensW/4, -s.lensH/2, s.lensW/2, s.lensH, 10);
          } else {
            // Cateye approximation
            ctx.moveTo(xOffset - s.lensW/4, 0);
            ctx.quadraticCurveTo(xOffset, -s.lensH, xOffset + s.lensW/4, -s.lensH/2);
            ctx.quadraticCurveTo(xOffset + s.lensW/8, s.lensH/2, xOffset - s.lensW/4, 0);
          }
          ctx.fill();
          ctx.stroke();
        };

        const bridgeW = s.lensW * 0.2;
        drawARLens(- (s.lensW/4 + bridgeW/2)); // Left
        drawARLens((s.lensW/4 + bridgeW/2)); // Right

        // Draw bridge
        ctx.beginPath();
        ctx.moveTo(-bridgeW/2, -s.lensH/4);
        if (bridgeStyle === "keyhole") {
          ctx.quadraticCurveTo(0, -s.lensH/2, bridgeW/2, -s.lensH/4);
        } else {
          ctx.lineTo(bridgeW/2, -s.lensH/4);
        }
        ctx.stroke();

        // Draw Top Bar if enabled
        if (topBar) {
          ctx.beginPath();
          ctx.moveTo(-s.lensW/2, -s.lensH/2);
          ctx.lineTo(s.lensW/2, -s.lensH/2);
          ctx.stroke();
        }

        ctx.restore();
      } else {
        if (faceDetected) setFaceDetected(false);
      }
    }

    trackingFrameIdRef.current = requestAnimationFrame(trackFaceLoop);
  };

  return (
    <div className="relative w-full h-full flex-1 min-h-[500px]">
      {/* 3D WebGL Canvas Container */}
      <div id="threeContainer" ref={containerRef} className="absolute inset-0 w-full h-full" style={{ background: "white", zIndex: 1 }} />
      
      {/* MediaPipe AR Elements */}
      <video ref={videoRef} className="hidden" playsInline />
      <canvas 
        ref={canvasRef} 
        className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-500 ${tryOnMode ? 'opacity-100' : 'opacity-0'}`} 
      />
    </div>
  );
}
