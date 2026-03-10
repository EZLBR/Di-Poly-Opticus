(function initMarketplaceViewers() {
  if (typeof THREE === "undefined") return;

  const previewElements = () => [...document.querySelectorAll(".three-preview[data-preview='true']")];
  const instances = new Map();
  let animationId = null;

  function getPreviewColor(material) {
    return material === "metal" ? 0x8b949e : 0x111827;
  }

  function createLensShape(shape, rx, ry) {
    const s = new THREE.Shape();

    if (shape === "round") {
      s.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0);
      return s;
    }

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
  }

  function createRim(shape, rx, ry, thickness, depth, material) {
    const outer = createLensShape(shape, rx, ry);
    const inner = createLensShape(shape, rx - thickness, ry - thickness);
    outer.holes.push(inner);

    const geo = new THREE.ExtrudeGeometry(outer, {
      depth,
      bevelEnabled: true,
      bevelThickness: depth * 0.12,
      bevelSize: depth * 0.08,
      bevelSegments: 2,
      curveSegments: shape === "round" ? 36 : 20
    });

    geo.center();
    return new THREE.Mesh(geo, material);
  }

  function createGlasses(shape, materialType) {
    const group = new THREE.Group();

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: getPreviewColor(materialType),
      roughness: materialType === "metal" ? 0.35 : 0.55,
      metalness: materialType === "metal" ? 0.85 : 0.15
    });

    const lensMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x9fb3c8,
      transmission: 0.65,
      transparent: true,
      opacity: 0.45,
      roughness: 0.08,
      metalness: 0,
      thickness: 0.04
    });

    const rx = shape === "round" ? 0.42 : 0.48;
    const ry = shape === "round" ? 0.42 : 0.34;
    const rimThickness = shape === "round" ? 0.08 : 0.07;
    const depth = 0.08;
    const gap = 0.62;

    const leftRim = createRim(shape, rx, ry, rimThickness, depth, frameMaterial);
    const rightRim = createRim(shape, rx, ry, rimThickness, depth, frameMaterial);

    leftRim.position.x = -gap;
    rightRim.position.x = gap;

    const lensGeo = new THREE.ExtrudeGeometry(createLensShape(shape, rx - 0.1, ry - 0.1), {
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
    group.rotation.x = -0.18;
    group.rotation.y = 0.55;

    return group;
  }

  function createInstance(el) {
    const rect = el.getBoundingClientRect();
    const width = Math.max(180, Math.floor(rect.width || el.clientWidth || 240));
    const height = Math.max(120, Math.floor(rect.height || el.clientHeight || 150));

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 0.15, 4.4);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height);

    if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    el.innerHTML = "";
    el.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xffffff, 0xd6deea, 1.8);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 4, 5);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xe8f0ff, 0.8);
    fill.position.set(-4, 2, -3);
    scene.add(fill);

    const glasses = createGlasses(el.dataset.shape || "round", el.dataset.material || "acetate");
    scene.add(glasses);

    const instance = {
      el,
      scene,
      camera,
      renderer,
      glasses,
      active: false,
      hovered: false
    };

    el.addEventListener("mouseenter", () => {
      instance.hovered = true;
    });

    el.addEventListener("mouseleave", () => {
      instance.hovered = false;
    });

    instances.set(el, instance);
  }

  function ensureInstances() {
    previewElements().forEach((el) => {
      if (!instances.has(el)) createInstance(el);
    });
  }

  function renderLoop() {
    let hasActive = false;

    instances.forEach((inst) => {
      if (!document.body.contains(inst.el)) {
        inst.renderer.dispose();
        inst.glasses.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose?.();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
            else obj.material.dispose?.();
          }
        });
        instances.delete(inst.el);
        return;
      }

      if (!inst.active) return;

      hasActive = true;
      inst.glasses.rotation.y += inst.hovered ? 0.02 : 0.006;
      inst.renderer.render(inst.scene, inst.camera);
    });

    if (hasActive) {
      animationId = requestAnimationFrame(renderLoop);
    } else {
      animationId = null;
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      let needsAnimation = false;

      entries.forEach((entry) => {
        const inst = instances.get(entry.target);
        if (!inst) return;
        inst.active = entry.isIntersecting;
        if (entry.isIntersecting) needsAnimation = true;
      });

      if (needsAnimation && !animationId) {
        animationId = requestAnimationFrame(renderLoop);
      }
    },
    { threshold: 0.15 }
  );

  function observeAll() {
    ensureInstances();
    instances.forEach((inst) => observer.observe(inst.el));
    if (!animationId) animationId = requestAnimationFrame(renderLoop);
  }

  function resizeAll() {
    instances.forEach((inst) => {
      const rect = inst.el.getBoundingClientRect();
      const width = Math.max(180, Math.floor(rect.width || inst.el.clientWidth || 240));
      const height = Math.max(120, Math.floor(rect.height || inst.el.clientHeight || 150));

      inst.camera.aspect = width / height;
      inst.camera.updateProjectionMatrix();
      inst.renderer.setSize(width, height);
    });
  }

  const originalRefresh = window.__refreshMarketplaceBase__ || window.refreshMarketplace;
  window.refreshMarketplace = function patchedRefreshMarketplace() {
    if (typeof originalRefresh === "function") originalRefresh();
    setTimeout(() => {
      observeAll();
      resizeAll();
    }, 0);
  };

  observeAll();
  window.addEventListener("resize", resizeAll);
})();