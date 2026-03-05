const container = document.getElementById("threeContainer");

if (container && typeof THREE !== "undefined") {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const W = container.clientWidth || 800;
  const H = container.clientHeight || 480;

  const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000);
  camera.position.set(0, 0.6, 9);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.querySelector("canvas")?.remove();
  container.appendChild(renderer.domElement);

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(6, 8, 6);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.9);
  fill.position.set(-6, 3, 5);
  scene.add(fill);

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.06 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.3;
  scene.add(floor);

  const group = new THREE.Group();
  scene.add(group);

  const config = {
    model: "round",
    frameWidth: 2.2,
    lensSize: 1.2,
    legLength: 2.8,
    thickness: 0.12,
    color: "#111827"
  };

  let autoRotate = true;
  let camRadius = 9;
  let camYaw = 0.0;
  let camPitch = 0.08;

  function $(id) { return document.getElementById(id); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function updateCamera() {
    const target = new THREE.Vector3(0, 0.2, 0);
    const x = target.x + camRadius * Math.sin(camYaw) * Math.cos(camPitch);
    const y = target.y + camRadius * Math.sin(camPitch);
    const z = target.z + camRadius * Math.cos(camYaw) * Math.cos(camPitch);
    camera.position.set(x, y, z);
    camera.lookAt(target);
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

  function makeRoundFrame(frameR, holeR, depth) {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, frameR, 0, Math.PI * 2, false);

    const hole = new THREE.Path();
    hole.absarc(0, 0, holeR, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: depth * 0.25,
      bevelSize: depth * 0.25,
      bevelSegments: 2,
      curveSegments: 48
    });

    geo.translate(0, 0, -depth / 2);
    return geo;
  }

  function makeSquareFrame(frameHalf, holeHalf, depth) {
    const r = Math.max(0.12, frameHalf * 0.18);

    const shape = new THREE.Shape();
    roundedRect(shape, -frameHalf, -frameHalf, frameHalf * 2, frameHalf * 2, r);

    const hole = new THREE.Path();
    roundedRect(hole, -holeHalf, -holeHalf, holeHalf * 2, holeHalf * 2, r * 0.8);
    shape.holes.push(hole);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: depth * 0.25,
      bevelSize: depth * 0.25,
      bevelSegments: 2,
      curveSegments: 24
    });

    geo.translate(0, 0, -depth / 2);
    return geo;
  }

  function clearGroup() {
    while (group.children.length) {
      const obj = group.children[0];
      group.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }
  }

  function buildGlasses() {
    clearGroup();

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.color),
      metalness: 0.25,
      roughness: 0.45
    });

    const lensMaterial = new THREE.MeshStandardMaterial({
      color: 0x88ccee,
      transparent: true,
      opacity: 0.38,
      metalness: 0,
      roughness: 0.08
    });

    const lensDepth = 0.10;
    const frameDepth = 0.22;
    const holeR = config.lensSize * 0.98;
    const frameR = config.lensSize + config.thickness;

    let lensGeoL, lensGeoR;
    if (config.model === "round") {
      lensGeoL = new THREE.CylinderGeometry(config.lensSize, config.lensSize, lensDepth, 72);
      lensGeoR = lensGeoL.clone();
    } else {
      const s = config.lensSize * 2;
      lensGeoL = new THREE.BoxGeometry(s, s, lensDepth);
      lensGeoR = lensGeoL.clone();
    }

    const leftLens = new THREE.Mesh(lensGeoL, lensMaterial);
    const rightLens = new THREE.Mesh(lensGeoR, lensMaterial);

    if (config.model === "round") {
      leftLens.rotation.x = Math.PI / 2;
      rightLens.rotation.x = Math.PI / 2;
    }

    leftLens.position.set(-config.frameWidth, 0, frameDepth * 0.25);
    rightLens.position.set(config.frameWidth, 0, frameDepth * 0.25);

    group.add(leftLens);
    group.add(rightLens);

    let frameGeo;
    if (config.model === "round") {
      frameGeo = makeRoundFrame(frameR, holeR, frameDepth);
    } else {
      const half = config.lensSize + config.thickness;
      const holeHalf = config.lensSize * 0.98;
      frameGeo = makeSquareFrame(half, holeHalf, frameDepth);
    }

    const leftFrame = new THREE.Mesh(frameGeo, frameMaterial);
    const rightFrame = new THREE.Mesh(frameGeo.clone(), frameMaterial);

    leftFrame.position.set(-config.frameWidth, 0, 0);
    rightFrame.position.set(config.frameWidth, 0, 0);

    group.add(leftFrame);
    group.add(rightFrame);

    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, config.thickness * 0.8, config.thickness * 0.8),
      frameMaterial
    );
    bridge.position.set(0, 0.05, 0.05);
    group.add(bridge);

    const legLen = clamp(config.legLength, 1.2, 5.5);
    const legCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.05, 0),
      new THREE.Vector3(0, 0.05, -legLen * 0.55),
      new THREE.Vector3(0, -0.25, -legLen),
    ]);

    const tubeRadius = Math.max(0.06, config.thickness * 0.55);
    const legGeo = new THREE.TubeGeometry(legCurve, 26, tubeRadius, 10, false);

    const leftLeg = new THREE.Mesh(legGeo, frameMaterial);
    const rightLeg = new THREE.Mesh(legGeo, frameMaterial);

    leftLeg.position.x = -config.frameWidth - config.lensSize * 1.05;
    rightLeg.position.x = config.frameWidth + config.lensSize * 1.05;

    group.add(leftLeg);
    group.add(rightLeg);

    group.rotation.set(0, 0.25, 0);
  }

  function syncUI() {
    $("btnRound")?.classList.toggle("active", config.model === "round");
    $("btnSquare")?.classList.toggle("active", config.model === "square");

    if ($("valFrameWidth")) $("valFrameWidth").textContent = $("frameWidth")?.value ?? "220";
    if ($("valLensHeight")) $("valLensHeight").textContent = $("lensHeight")?.value ?? "80";
    if ($("valLegLength")) $("valLegLength").textContent = $("legLength")?.value ?? "120";
    if ($("valThickness")) $("valThickness").textContent = $("thickness")?.value ?? "6";
    if ($("valColor")) $("valColor").textContent = $("frameColor")?.value ?? "#111827";
  }

  window.setModel = (type) => {
    config.model = type;
    syncUI();
    buildGlasses();
  };

  window.saveDesign = () => {
    const key = "opticus_designs";
    const designs = JSON.parse(localStorage.getItem(key) || "[]");
    designs.push({ ...config });
    localStorage.setItem(key, JSON.stringify(designs));
    alert("Design saved!");
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

  function zoom(step) {
    camRadius = clamp(camRadius + step, 5.5, 14);
    updateCamera();
  }

  function rotate(dx, dy) {
    camYaw += dx * 0.12;
    camPitch = clamp(camPitch + dy * 0.08, -0.8, 0.8);
    updateCamera();
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

  // Mouse / touchpad drag
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

    camYaw += dx * 0.01;
    camPitch = clamp(camPitch - dy * 0.008, -0.8, 0.8);
    updateCamera();
  });

  renderer.domElement.addEventListener("pointerup", () => {
    isDragging = false;
  });

  renderer.domElement.addEventListener("wheel", (e) => {
    e.preventDefault();
    camRadius = clamp(camRadius + e.deltaY * 0.01, 5.5, 14);
    updateCamera();
  }, { passive: false });

  window.addEventListener("resize", () => {
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 480;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });

  syncUI();
  buildGlasses();
  updateCamera();

  function animate() {
    requestAnimationFrame(animate);

    if (autoRotate) {
      camYaw += 0.006;
      updateCamera();
    }

    renderer.render(scene, camera);
  }

  animate();
}