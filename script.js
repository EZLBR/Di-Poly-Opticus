// =============================
// SAFE GLOBAL SCRIPT
// =============================

// =============================
// MARKETPLACE
// =============================

const grid = document.getElementById('productGrid');

if (grid) {

  const products = [
    { id: 1, shape: 'round', material: 'metal', price: 180 },
    { id: 2, shape: 'square', material: 'acetate', price: 190 },
    { id: 3, shape: 'round', material: 'acetate', price: 150 },
    { id: 4, shape: 'square', material: 'metal', price: 200 }
  ];

  renderProducts(products);

  document.querySelectorAll('.filter-shape, .filter-material')
    .forEach(cb => cb.addEventListener('change', filterProducts));

  function renderProducts(items) {
    grid.innerHTML = '';
    items.forEach(p => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h4>${p.shape.toUpperCase()} - ${p.material}</h4>
        <p>$${p.price}</p>
      `;
      card.onclick = () => window.location.href = 'create.html';
      grid.appendChild(card);
    });
  }

  function filterProducts() {
    const shapes = [...document.querySelectorAll('.filter-shape:checked')].map(cb => cb.value);
    const materials = [...document.querySelectorAll('.filter-material:checked')].map(cb => cb.value);

    const filtered = products.filter(p =>
      (shapes.length === 0 || shapes.includes(p.shape)) &&
      (materials.length === 0 || materials.includes(p.material))
    );

    renderProducts(filtered);
  }
}

// =============================
// THREE CONFIGURATOR (SAFE)
// =============================

const container = document.getElementById("threeContainer");

if (container && typeof THREE !== "undefined") {

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f5f5);

  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / 400,
    0.1,
    1000
  );
  camera.position.z = 8;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, 400);
  container.appendChild(renderer.domElement);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 5, 5);
  scene.add(light);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const material = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.3,
    roughness: 0.6
  });

  const group = new THREE.Group();
  scene.add(group);

  const lensGeo = new THREE.BoxGeometry(2, 1.5, 0.2);
  const leftLens = new THREE.Mesh(lensGeo, material);
  const rightLens = new THREE.Mesh(lensGeo, material);

  leftLens.position.x = -2.2;
  rightLens.position.x = 2.2;

  group.add(leftLens);
  group.add(rightLens);

  function animate() {
    requestAnimationFrame(animate);
    group.rotation.y += 0.01;
    renderer.render(scene, camera);
  }

  animate();
}

// =============================
// DARK MODE
// =============================

const darkToggle = document.getElementById('darkToggle');

if (darkToggle) {
  darkToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
  });
}