const container = document.getElementById("threeContainer");

if (container && typeof THREE !== "undefined") {
  const LS_ACTIVE = "opticus_active_design";
const LS_ACTIVE_PRODUCT = "opticus_active_product";
const LS_DESIGNS = "opticus_designs";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3f6fb);
  scene.fog = new THREE.Fog(0xeaf0f7, 12, 24);

  const W = container.clientWidth || 800;
  const H = container.clientHeight || 480;

  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
  const cameraTarget = new THREE.Vector3(0, 0.12, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });

  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else if ("outputEncoding" in renderer && THREE.sRGBEncoding) {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.querySelector("canvas")?.remove();
  container.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xf8fbff, 0xcdd7e5, 1.8);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(5.5, 7.5, 7.5);
  key.castShadow = true;
  key.shadow.mapSize.width = 2048;
  key.shadow.mapSize.height = 2048;
  key.shadow.camera.left = -10;
  key.shadow.camera.right = 10;
  key.shadow.camera.top = 10;
  key.shadow.camera.bottom = -10;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xe8f0ff, 1.2);
  rim.position.set(-8, 2, -7);
  scene.add(rim);

  const fill = new THREE.PointLight(0xffffff, 25, 30, 2);
  fill.position.set(0, 2.5, 4);
  scene.add(fill);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(7.5, 72),
    new THREE.ShadowMaterial({ opacity: 0.14 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.45;
  floor.receiveShadow = true;
  scene.add(floor);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(2.15, 2.4, 0.18, 48),
    new THREE.MeshStandardMaterial({
      color: 0xfafcff,
      roughness: 0.92,
      metalness: 0.04,
      transparent: true,
      opacity: 0.96
    })
  );
  pedestal.position.y = -1.38;
  pedestal.receiveShadow = true;
  scene.add(pedestal);

  const group = new THREE.Group();
  scene.add(group);

let glassesRoot = null;
let frontGroup = null;
let leftTemplePivot = null;
let rightTemplePivot = null;

let targetTempleOpen = 0.22;
let currentTempleOpen = 0.22;

  const config = {
  model: "round",
  frameWidth: 2.2,
  lensSize: 1.2,
  legLength: 2.8,
  thickness: 0.12,
  bridgeWidth: 0.5,
  color: "#111827",
  isSunglasses: false,
  antiReflective: true,
  prescriptionFileName: "",
  templeOpen: 0.22,
  templeStyle: "classic",
  topBar: true,
  bridgeStyle: "soft",
  frameProfile: "medium"
};

  const baseProductsMap = {
  "base-round-metal": {
    model: "round",
    frameWidth: 2.2,
    lensSize: 1.2,
    legLength: 2.8,
    thickness: 0.12,
    bridgeWidth: 0.5,
    color: "#6b7280",
    isSunglasses: false,
    antiReflective: true,
    templeOpen: 0.22,
    templeStyle: "classic",
    topBar: false,
    bridgeStyle: "soft",
    frameProfile: "medium"
  },
  "base-square-acetate": {
    model: "square",
    frameWidth: 2.35,
    lensSize: 1.18,
    legLength: 2.9,
    thickness: 0.14,
    bridgeWidth: 0.5,
    color: "#111827",
    isSunglasses: false,
    antiReflective: true,
    templeOpen: 0.22,
    templeStyle: "classic",
    topBar: true,
    bridgeStyle: "soft",
    frameProfile: "medium"
  },
  "base-round-acetate": {
    model: "round",
    frameWidth: 2.1,
    lensSize: 1.1,
    legLength: 2.75,
    thickness: 0.14,
    bridgeWidth: 0.48,
    color: "#1f2937",
    isSunglasses: false,
    antiReflective: false,
    templeOpen: 0.22,
    templeStyle: "classic",
    topBar: false,
    bridgeStyle: "soft",
    frameProfile: "medium"
  },
  "base-square-metal": {
    model: "square",
    frameWidth: 2.4,
    lensSize: 1.22,
    legLength: 3.0,
    thickness: 0.11,
    bridgeWidth: 0.52,
    color: "#9ca3af",
    isSunglasses: true,
    antiReflective: false,
    templeOpen: 0.22,
    templeStyle: "classic",
    topBar: true,
    bridgeStyle: "soft",
    frameProfile: "medium"
  }
};

function getSavedDesigns() {
  try {
    return JSON.parse(localStorage.getItem(LS_DESIGNS)) || [];
  } catch {
    return [];
  }
}

function applyConfigValues(source) {
  if (!source) return;

  config.model = source.model ?? config.model;
  config.frameWidth = source.frameWidth ?? config.frameWidth;
  config.lensSize = source.lensSize ?? config.lensSize;
  config.legLength = source.legLength ?? config.legLength;
  config.thickness = source.thickness ?? config.thickness;
  config.bridgeWidth = source.bridgeWidth ?? config.bridgeWidth;
  config.color = source.color ?? config.color;
  config.isSunglasses = source.isSunglasses ?? config.isSunglasses;
  config.antiReflective = source.antiReflective ?? config.antiReflective;
  config.prescriptionFileName = source.prescriptionFileName ?? config.prescriptionFileName;
  config.templeOpen = source.templeOpen ?? config.templeOpen;
  config.templeStyle = source.templeStyle ?? config.templeStyle;
  config.topBar = source.topBar ?? config.topBar;
  config.bridgeStyle = source.bridgeStyle ?? config.bridgeStyle;
  config.frameProfile = source.frameProfile ?? config.frameProfile;
}

function loadInitialSelection() {
  const activeDesignIndex = localStorage.getItem(LS_ACTIVE);
  const activeProductId = localStorage.getItem(LS_ACTIVE_PRODUCT);

  if (activeDesignIndex !== null) {
    const designs = getSavedDesigns();
    const design = designs[parseInt(activeDesignIndex, 10)];

    if (design) {
      applyConfigValues(design);
      return;
    }
  }

  if (activeProductId && baseProductsMap[activeProductId]) {
    applyConfigValues(baseProductsMap[activeProductId]);
  }
}

loadInitialSelection();
targetTempleOpen = config.templeOpen;
currentTempleOpen = config.templeOpen;

  let autoRotate = true;
  let targetRadius = 7.8;
  let currentRadius = 7.8;
  let targetYaw = 0.45;
  let currentYaw = 0.45;
  let targetPitch = 0.08;
  let currentPitch = 0.08;

  function $(id) {
    return document.getElementById(id);
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function updateCamera(immediate = false) {
    const smoothing = immediate ? 1 : 0.12;

    currentRadius = lerp(currentRadius, targetRadius, smoothing);
    currentYaw = lerp(currentYaw, targetYaw, smoothing);
    currentPitch = lerp(currentPitch, targetPitch, smoothing);

    const x = cameraTarget.x + currentRadius * Math.sin(currentYaw) * Math.cos(currentPitch);
    const y = cameraTarget.y + currentRadius * Math.sin(currentPitch);
    const z = cameraTarget.z + currentRadius * Math.cos(currentYaw) * Math.cos(currentPitch);

    camera.position.set(x, y, z);
    camera.lookAt(cameraTarget);
  }

  function roundedRect(path, x, y, w, h, r) {
    path.moveTo(x + r, y);
    path.lineTo(x + w - r, y);
    path.quadraticCurveTo(x + w, y, x + w, y + r);
    path.lineTo(x + w, y + h - r);
    path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    path.lineTo(x + r, y + h);
    path.quadraticCurveTo(x, y + h, x, y + h - r);
    path.lineTo(x, y + r);
    path.quadraticCurveTo(x, y, x + r, y);
  }

  function createLensShape(type, sizeX, sizeY) {
  const shape = new THREE.Shape();

  if (type === "round") {
    shape.absellipse(0, 0, sizeX, sizeY, 0, Math.PI * 2, false, 0);
    return shape;
  }

  if (type === "hexagon") {
    const rx = sizeX;
    const ry = sizeY;

    const points = [
      new THREE.Vector2(-rx * 0.55, -ry),
      new THREE.Vector2( rx * 0.55, -ry),
      new THREE.Vector2( rx,         -ry * 0.15),
      new THREE.Vector2( rx * 0.72,   ry),
      new THREE.Vector2(-rx * 0.72,   ry),
      new THREE.Vector2(-rx,         -ry * 0.15)
    ];

    shape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].y);
    }
    shape.closePath();

    return shape;
  }

  const r = Math.min(sizeX, sizeY) * 0.28;
  roundedRect(shape, -sizeX, -sizeY, sizeX * 2, sizeY * 2, r);
  return shape;
}

  function createRimGeometry(type, outerX, outerY, innerX, innerY, depth) {
    const shape = createLensShape(type, outerX, outerY);
    const hole = createLensShape(type, innerX, innerY);
    shape.holes.push(hole);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: depth * 0.18,
      bevelSize: depth * 0.18,
      bevelSegments: 3,
      curveSegments: type === "round" ? 56 : 28
    });

    geo.center();
    return geo;
  }

  function createLensGeometry(type, sizeX, sizeY, depth) {
    const shape = createLensShape(type, sizeX, sizeY);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: depth * 0.08,
      bevelSize: depth * 0.08,
      bevelSegments: 2,
      curveSegments: type === "round" ? 56 : 28
    });

    geo.center();
    return geo;
  }

  function makeTempleCurve(length, side = 1, style = "classic") {
  if (style === "straight") {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.005 * side, 0.0, -length * 0.25),
      new THREE.Vector3(0.01 * side, -0.005, -length * 0.55),
      new THREE.Vector3(0.008 * side, -0.03, -length * 0.82),
      new THREE.Vector3(0.0, -0.10, -length)
    ]);
  }

  if (style === "sport") {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.015 * side, 0.01, -length * 0.18),
      new THREE.Vector3(0.03 * side, 0.0, -length * 0.40),
      new THREE.Vector3(0.035 * side, -0.08, -length * 0.72),
      new THREE.Vector3(0.015 * side, -0.24, -length)
    ]);
  }

  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.01 * side, 0.0, -length * 0.18),
    new THREE.Vector3(0.02 * side, -0.005, -length * 0.42),
    new THREE.Vector3(0.025 * side, -0.05, -length * 0.74),
    new THREE.Vector3(0.01 * side, -0.18, -length)
  ]);
}

  function addMeshTo(parent, geometry, material, options = {}) {
    const mesh = new THREE.Mesh(geometry, material);

    Object.assign(mesh.position, options.position || {});
    Object.assign(mesh.rotation, options.rotation || {});
    Object.assign(mesh.scale, options.scale || {});

    mesh.castShadow = options.castShadow ?? true;
    mesh.receiveShadow = options.receiveShadow ?? false;

    parent.add(mesh);
    return mesh;
  }

  function disposeObject(obj) {
    obj.traverse((child) => {
      if (child.geometry) child.geometry.dispose();

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  function clearGroup() {
    while (group.children.length) {
      const obj = group.children[0];
      group.remove(obj);
      disposeObject(obj);
    }
  }

  function getMaterials() {
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.color),
      roughness: 0.42,
      metalness: 0.18
    });

    const lensMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.isSunglasses ? "#637487" : "#c8ddf2"),
      transparent: true,
      opacity: config.isSunglasses ? 0.72 : 0.35,
      roughness: config.antiReflective ? 0.04 : 0.1,
      metalness: 0
    });

    const padMaterial = new THREE.MeshStandardMaterial({
      color: 0xf3f5fa,
      roughness: 0.5,
      metalness: 0.05,
      transparent: true,
      opacity: 0.95
    });

    const hingeMaterial = new THREE.MeshStandardMaterial({
      color: 0xb9c1cd,
      roughness: 0.32,
      metalness: 0.72
    });

    return { frameMaterial, lensMaterial, padMaterial, hingeMaterial };
  }

  function buildFront(frontGroup, materials, metrics) {
  const { frameMaterial, lensMaterial, padMaterial, hingeMaterial } = materials;
  const {
    frameDepth,
    lensDepth,
    lensX,
    lensY,
    outerX,
    outerY,
    lensOffsetX,
    hingeX
  } = metrics;

  const profile = getFrameProfileSettings();

  const adjustedOuterX = lensX + config.thickness * profile.thicknessMul;
  const adjustedOuterY = lensY + config.thickness * 0.9 * profile.thicknessMul;
  const adjustedFrameDepth = clamp(frameDepth * profile.thicknessMul, 0.1, 0.34);

  const lensGeo = createLensGeometry(config.model, lensX, lensY, lensDepth);
  const rimGeo = createRimGeometry(
    config.model,
    adjustedOuterX,
    adjustedOuterY,
    lensX,
    lensY,
    adjustedFrameDepth
  );

  addMeshTo(frontGroup, lensGeo, lensMaterial, {
    position: { x: -lensOffsetX, y: 0, z: adjustedFrameDepth * 0.12 }
  });

  addMeshTo(frontGroup, lensGeo.clone(), lensMaterial, {
    position: { x: lensOffsetX, y: 0, z: adjustedFrameDepth * 0.12 }
  });

  addMeshTo(frontGroup, rimGeo, frameMaterial, {
    position: { x: -lensOffsetX, y: 0, z: 0 }
  });

  addMeshTo(frontGroup, rimGeo.clone(), frameMaterial, {
    position: { x: lensOffsetX, y: 0, z: 0 }
  });

  if (config.topBar) {
    const topBarWidth = lensOffsetX * 2 + lensX * 0.22;
    const topBar = new THREE.CapsuleGeometry(
      config.thickness * 0.42 * profile.topBarMul,
      topBarWidth * 0.5,
      5,
      18
    );

    addMeshTo(frontGroup, topBar, frameMaterial, {
      position: {
        x: 0,
        y: lensY + config.thickness * 0.62,
        z: adjustedFrameDepth * 0.03
      },
      rotation: { z: Math.PI / 2 }
    });
  }

  let bridgeCurve;

  if (config.bridgeStyle === "flat") {
    bridgeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-config.bridgeWidth * 0.5, 0.02, 0),
      new THREE.Vector3(-config.bridgeWidth * 0.2, -0.01, 0.01),
      new THREE.Vector3(config.bridgeWidth * 0.2, -0.01, 0.01),
      new THREE.Vector3(config.bridgeWidth * 0.5, 0.02, 0)
    ]);
  } else if (config.bridgeStyle === "keyhole") {
    bridgeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-config.bridgeWidth * 0.5, 0.08, 0),
      new THREE.Vector3(-config.bridgeWidth * 0.22, -0.12, 0.03),
      new THREE.Vector3(config.bridgeWidth * 0.22, -0.12, 0.03),
      new THREE.Vector3(config.bridgeWidth * 0.5, 0.08, 0)
    ]);
  } else {
    bridgeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-config.bridgeWidth * 0.5, 0.10, 0),
      new THREE.Vector3(-config.bridgeWidth * 0.18, -0.06, 0.03),
      new THREE.Vector3(config.bridgeWidth * 0.18, -0.06, 0.03),
      new THREE.Vector3(config.bridgeWidth * 0.5, 0.10, 0)
    ]);
  }

  const bridgeGeo = new THREE.TubeGeometry(
    bridgeCurve,
    28,
    Math.max(0.04, config.thickness * 0.3 * profile.bridgeMul),
    12,
    false
  );

  addMeshTo(frontGroup, bridgeGeo, frameMaterial, {
    position: { x: 0, y: -0.03, z: adjustedFrameDepth * 0.02 }
  });

  const hingeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.16);

  addMeshTo(frontGroup, hingeGeo, hingeMaterial, {
    position: { x: -hingeX, y: 0.04, z: -0.03 }
  });

  addMeshTo(frontGroup, hingeGeo.clone(), hingeMaterial, {
    position: { x: hingeX, y: 0.04, z: -0.03 }
  });

  const padGeo = new THREE.SphereGeometry(0.11, 18, 18);

  addMeshTo(frontGroup, padGeo, padMaterial, {
    position: { x: -config.bridgeWidth * 0.16, y: -0.18, z: 0.15 },
    scale: { x: 0.7, y: 1, z: 1.2 },
    rotation: { z: 0.3 }
  });

  addMeshTo(frontGroup, padGeo.clone(), padMaterial, {
    position: { x: config.bridgeWidth * 0.16, y: -0.18, z: 0.15 },
    scale: { x: 0.7, y: 1, z: 1.2 },
    rotation: { z: -0.3 }
  });
}

 function buildTemple(pivot, materials, side, metrics) {
  const { frameMaterial } = materials;
  const { hingeX } = metrics;

  const templeLength = clamp(config.legLength, 1.5, 6.2);
  const templeRadius = Math.max(0.045, config.thickness * 0.42);

  pivot.position.set(side * hingeX, 0.02, -0.06);
  pivot.rotation.set(0, 0, 0);

  const templeGeo = new THREE.TubeGeometry(
    makeTempleCurve(templeLength, side, config.templeStyle),
    48,
    templeRadius,
    14,
    false
  );

  addMeshTo(pivot, templeGeo, frameMaterial);
}

  function getFrameProfileSettings() {
  if (config.frameProfile === "thin") {
    return {
      thicknessMul: 0.78,
      topBarMul: 0.78,
      bridgeMul: 0.82
    };
  }

  if (config.frameProfile === "bold") {
    return {
      thicknessMul: 1.35,
      topBarMul: 1.22,
      bridgeMul: 1.18
    };
  }

  return {
    thicknessMul: 1,
    topBarMul: 1,
    bridgeMul: 1
  };
}

  function buildGlasses() {
  clearGroup();

  const materials = getMaterials();

  const frameDepth = clamp(config.thickness * 1.9, 0.12, 0.28);
  const lensDepth = 0.06;

  const widthScale = clamp(config.frameWidth / 2.2, 0.72, 1.45);
  let lensX;
  let lensY;

  if (config.model === "round") {
    lensX = config.lensSize * 1.0 * widthScale;
    lensY = config.lensSize * 0.92;
  }   else if (config.model === "hexagon") {
    lensX = config.lensSize * 1.02 * widthScale;
    lensY = config.lensSize * 0.88;
  } else {
    lensX = config.lensSize * 1.06 * widthScale;
    lensY = config.lensSize * 0.86;
  }

  const profile = getFrameProfileSettings();

const outerX = lensX + config.thickness * profile.thicknessMul;
const outerY = lensY + config.thickness * 0.9 * profile.thicknessMul;

  const lensOffsetX = lensX + config.bridgeWidth * 0.5 + config.thickness * 0.55;
  const hingeX = lensOffsetX + outerX - config.thickness * 0.35;

  const metrics = {
    frameDepth,
    lensDepth,
    lensX,
    lensY,
    outerX,
    outerY,
    lensOffsetX,
    hingeX
  };

  glassesRoot = new THREE.Group();
  group.add(glassesRoot);

  frontGroup = new THREE.Group();
  glassesRoot.add(frontGroup);

  buildFront(frontGroup, materials, metrics);

  leftTemplePivot = new THREE.Group();
  rightTemplePivot = new THREE.Group();

  glassesRoot.add(leftTemplePivot);
  glassesRoot.add(rightTemplePivot);

  buildTemple(leftTemplePivot, materials, -1, metrics);
  buildTemple(rightTemplePivot, materials, 1, metrics);

  glassesRoot.rotation.set(-0.06, 0.42, 0.03);
  glassesRoot.position.y = -0.02;

  targetTempleOpen = config.templeOpen;
  currentTempleOpen = config.templeOpen;
  updateTemplePivots(true);
}

  function syncUI() {
  $("btnRound")?.classList.toggle("active", config.model === "round");
  $("btnSquare")?.classList.toggle("active", config.model === "square");
  $("btnHexagon")?.classList.toggle("active", config.model === "hexagon");

  if ($("frameWidth")) $("frameWidth").value = String(Math.round(config.frameWidth * 100));
  if ($("lensHeight")) $("lensHeight").value = String(Math.round(config.lensSize * 60));
  if ($("legLength")) $("legLength").value = String(Math.round(config.legLength * 40));
  if ($("thickness")) $("thickness").value = String(Math.round(config.thickness * 60));
  if ($("frameColor")) $("frameColor").value = config.color;

  if ($("isSunglasses")) $("isSunglasses").checked = config.isSunglasses;
  if ($("antiReflective")) $("antiReflective").checked = config.antiReflective;
  if ($("prescriptionName")) $("prescriptionName").textContent = config.prescriptionFileName || "No file uploaded";

  if ($("valFrameWidth")) $("valFrameWidth").textContent = $("frameWidth")?.value ?? "220";
  if ($("valLensHeight")) $("valLensHeight").textContent = $("lensHeight")?.value ?? "80";
  if ($("valLegLength")) $("valLegLength").textContent = $("legLength")?.value ?? "120";
  if ($("valThickness")) $("valThickness").textContent = $("thickness")?.value ?? "6";
  if ($("valColor")) $("valColor").textContent = config.color;

  if ($("templeOpen")) $("templeOpen").value = String(Math.round(config.templeOpen * 100));
  if ($("valTempleOpen")) $("valTempleOpen").textContent = String(Math.round(config.templeOpen * 100));
  if ($("templeStyle")) $("templeStyle").value = config.templeStyle;

  if ($("topBar")) $("topBar").checked = config.topBar;
if ($("bridgeStyle")) $("bridgeStyle").value = config.bridgeStyle;
if ($("frameProfile")) $("frameProfile").value = config.frameProfile;
}

  function getDesigns() {
    try {
      return JSON.parse(localStorage.getItem(LS_DESIGNS) || "[]");
    } catch {
      return [];
    }
  }

  function setDesigns(designs) {
    localStorage.setItem(LS_DESIGNS, JSON.stringify(designs));
  }

  function loadActiveDesign() {
    const activeIndex = parseInt(localStorage.getItem(LS_ACTIVE) || "-1", 10);
    const designs = getDesigns();

    if (!Number.isInteger(activeIndex) || activeIndex < 0 || activeIndex >= designs.length) {
      return;
    }

    const saved = designs[activeIndex];
    if (!saved) return;

    Object.assign(config, {
      model: saved.model ?? config.model,
      frameWidth: saved.frameWidth ?? config.frameWidth,
      lensSize: saved.lensSize ?? config.lensSize,
      legLength: saved.legLength ?? config.legLength,
      thickness: saved.thickness ?? config.thickness,
      bridgeWidth: saved.bridgeWidth ?? config.bridgeWidth,
      color: saved.color ?? config.color,
      isSunglasses: saved.isSunglasses ?? config.isSunglasses,
      antiReflective: saved.antiReflective ?? config.antiReflective,
      prescriptionFileName: saved.prescriptionFileName ?? config.prescriptionFileName,
      templeOpen: saved.templeOpen ?? config.templeOpen,
      templeStyle: saved.templeStyle ?? config.templeStyle,
      topBar: saved.topBar ?? config.topBar,
      bridgeStyle: saved.bridgeStyle ?? config.bridgeStyle,
      frameProfile: saved.frameProfile ?? config.frameProfile,
    });
  }

  function buildPayload(name, existing = null) {
    return {
      id: existing?.id ?? `design-${Date.now()}`,
      name,
      model: config.model,
      frameWidth: config.frameWidth,
      lensSize: config.lensSize,
      legLength: config.legLength,
      thickness: config.thickness,
      bridgeWidth: config.bridgeWidth,
      color: config.color,
      isSunglasses: config.isSunglasses,
      antiReflective: config.antiReflective,
      prescriptionFileName: config.prescriptionFileName,
      templeOpen: config.templeOpen,
      templeStyle: config.templeStyle,
      published: existing?.published ?? false,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      topBar: config.topBar,
      bridgeStyle: config.bridgeStyle,
      frameProfile: config.frameProfile,
    };
  }

  window.setModel = (type) => {
    config.model = type;
    syncUI();
    buildGlasses();
  };

  window.setTempleStyle = (style) => {
  config.templeStyle = style;
  syncUI();
  buildGlasses();
};

window.setTempleOpen = (value) => {
  config.templeOpen = clamp(value, -0.05, 0.65);
  targetTempleOpen = config.templeOpen;
  syncUI();
};

  window.saveDesign = () => {
    const designName = window.prompt("Give your new design a name:", "My New Design");
    if (designName === null) return;

    const cleanName = designName.trim();
    if (!cleanName) {
      alert("Please enter a name for your design.");
      return;
    }

    const designs = getDesigns();
    const payload = buildPayload(cleanName);

    designs.push(payload);
    setDesigns(designs);
    localStorage.setItem(LS_ACTIVE, String(designs.length - 1));

    alert(`Design "${cleanName}" saved successfully!`);
  };

  window.updateCurrentDesign = () => {
    const activeIndex = parseInt(localStorage.getItem(LS_ACTIVE) || "-1", 10);
    const designs = getDesigns();

    if (!Number.isInteger(activeIndex) || activeIndex < 0 || activeIndex >= designs.length) {
      alert("Open a saved design first, or use SAVE NEW DESIGN.");
      return;
    }

    const current = designs[activeIndex];
    const newName = window.prompt("Update design name:", current.name || "My Design");
    if (newName === null) return;

    const cleanName = newName.trim();
    if (!cleanName) {
      alert("Please enter a name for your design.");
      return;
    }

    designs[activeIndex] = buildPayload(cleanName, current);
    setDesigns(designs);

    alert(`Design "${cleanName}" updated successfully!`);
  };

  $("frameWidth")?.addEventListener("input", (e) => {
    config.frameWidth = parseInt(e.target.value, 10) / 100;
    syncUI();
    buildGlasses();
  });

  $("lensHeight")?.addEventListener("input", (e) => {
    config.lensSize = parseInt(e.target.value, 10) / 60;
    syncUI();
    buildGlasses();
  });

  $("legLength")?.addEventListener("input", (e) => {
    config.legLength = parseInt(e.target.value, 10) / 40;
    syncUI();
    buildGlasses();
  });

  $("thickness")?.addEventListener("input", (e) => {
    config.thickness = Math.max(0.06, parseInt(e.target.value, 10) / 60);
    syncUI();
    buildGlasses();
  });

  $("frameColor")?.addEventListener("input", (e) => {
    config.color = e.target.value;
    syncUI();
    buildGlasses();
  });

  $("isSunglasses")?.addEventListener("change", (e) => {
    config.isSunglasses = e.target.checked;
    syncUI();
    buildGlasses();
  });

  $("antiReflective")?.addEventListener("change", (e) => {
    config.antiReflective = e.target.checked;
    syncUI();
    buildGlasses();
  });

  $("prescriptionFile")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    config.prescriptionFileName = file ? file.name : "";
    syncUI();
  });

  $("templeOpen")?.addEventListener("input", (e) => {
  config.templeOpen = clamp(parseInt(e.target.value, 10) / 100, -0.05, 0.65);
  targetTempleOpen = config.templeOpen;

  if ($("valTempleOpen")) {
    $("valTempleOpen").textContent = String(parseInt(e.target.value, 10));
  }
});

$("templeStyle")?.addEventListener("change", (e) => {
  config.templeStyle = e.target.value;
  buildGlasses();
});

$("topBar")?.addEventListener("change", (e) => {
  config.topBar = e.target.checked;
  buildGlasses();
});

$("bridgeStyle")?.addEventListener("change", (e) => {
  config.bridgeStyle = e.target.value;
  buildGlasses();
});

$("frameProfile")?.addEventListener("change", (e) => {
  config.frameProfile = e.target.value;
  buildGlasses();
});

  function zoom(step) {
    targetRadius = clamp(targetRadius + step, 5.1, 14);
  }

  function rotate(dx, dy) {
    targetYaw += dx * 0.15;
    targetPitch = clamp(targetPitch + dy * 0.1, -0.78, 0.78);
  }

  $("zoomIn")?.addEventListener("click", () => zoom(-0.8));
  $("zoomOut")?.addEventListener("click", () => zoom(+0.8));
  $("rotLeft")?.addEventListener("click", () => rotate(-1, 0));
  $("rotRight")?.addEventListener("click", () => rotate(+1, 0));
  $("rotUp")?.addEventListener("click", () => rotate(0, -1));
  $("rotDown")?.addEventListener("click", () => rotate(0, +1));

  $("btnAuto")?.addEventListener("click", () => {
    autoRotate = !autoRotate;
    $("btnAuto").textContent = autoRotate ? "Auto: ON" : "Auto: OFF";
    $("btnAuto").classList.toggle("primary", autoRotate);
  });

  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  renderer.domElement.addEventListener("pointerdown", (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    renderer.domElement.setPointerCapture(e.pointerId);
  });

  renderer.domElement.addEventListener("pointermove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    targetYaw += dx * 0.012;
    targetPitch = clamp(targetPitch - dy * 0.008, -0.78, 0.78);
  });

  const stopDragging = () => {
    isDragging = false;
  };

  renderer.domElement.addEventListener("pointerup", stopDragging);
  renderer.domElement.addEventListener("pointercancel", stopDragging);
  renderer.domElement.addEventListener("pointerleave", stopDragging);

  renderer.domElement.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      targetRadius = clamp(targetRadius + e.deltaY * 0.01, 5.1, 14);
    },
    { passive: false }
  );

  window.addEventListener("resize", () => {
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 480;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });

  function getExportFileBaseName() {
  const activeIndex = parseInt(localStorage.getItem(LS_ACTIVE) || "-1", 10);
  const designs = getDesigns();

  if (Number.isInteger(activeIndex) && activeIndex >= 0 && activeIndex < designs.length) {
    const name = designs[activeIndex]?.name || "opticus-glasses";
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "opticus-glasses";
  }

  return "opticus-glasses";
}

function downloadTextFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function downloadArrayBuffer(buffer, filename, mimeType) {
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function cloneForExport() {
  if (!glassesRoot) return null;

  const exportRoot = glassesRoot.clone(true);

  exportRoot.updateMatrixWorld(true);

  return exportRoot;
}

window.exportModel = (format) => {
  const exportRoot = cloneForExport();

  if (!exportRoot) {
    alert("Nothing to export yet.");
    return;
  }

  const baseName = getExportFileBaseName();

  try {
    if (format === "stl") {
      const exporter = new THREE.STLExporter();
      const result = exporter.parse(exportRoot);
      downloadTextFile(result, `${baseName}.stl`, "model/stl");
      return;
    }

    if (format === "obj") {
      const exporter = new THREE.OBJExporter();
      const result = exporter.parse(exportRoot);
      downloadTextFile(result, `${baseName}.obj`, "text/plain");
      return;
    }

    if (format === "glb") {
      const exporter = new THREE.GLTFExporter();
      exporter.parse(
        exportRoot,
        (result) => {
          downloadArrayBuffer(result, `${baseName}.glb`, "model/gltf-binary");
        },
        (error) => {
          console.error(error);
          alert("Failed to export GLB.");
        },
        { binary: true }
      );
      return;
    }

    if (format === "gltf") {
      const exporter = new THREE.GLTFExporter();
      exporter.parse(
        exportRoot,
        (result) => {
          const json = JSON.stringify(result, null, 2);
          downloadTextFile(json, `${baseName}.gltf`, "model/gltf+json");
        },
        (error) => {
          console.error(error);
          alert("Failed to export GLTF.");
        },
        { binary: false }
      );
      return;
    }

    alert("Unsupported export format.");
  } catch (error) {
    console.error(error);
    alert(`Export failed: ${format.toUpperCase()}`);
  }
};

  loadActiveDesign();
  syncUI();
  buildGlasses();
  updateCamera(true);

  function animate() {
  requestAnimationFrame(animate);

  if (autoRotate && !isDragging) {
    targetYaw += 0.0035;
  }

  updateCamera();
  updateTemplePivots();
  renderer.render(scene, camera);
}

  animate();

  function updateTemplePivots(immediate = false) {
  if (!leftTemplePivot || !rightTemplePivot) return;

  const t = immediate ? 1 : 0.14;
  currentTempleOpen = lerp(currentTempleOpen, targetTempleOpen, t);

  leftTemplePivot.rotation.y = -currentTempleOpen;
  rightTemplePivot.rotation.y = currentTempleOpen;
}

}