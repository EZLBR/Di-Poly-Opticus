const LS_THEME = "opticus_theme";
const LS_DESIGNS = "opticus_designs";
const LS_ACTIVE = "opticus_active_design";

// ---------- Dark mode ----------
(function initTheme() {
  const saved = localStorage.getItem(LS_THEME);
  if (saved === "dark") document.body.classList.add("dark");

  const toggle = document.getElementById("darkToggle");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
      LS_THEME,
      document.body.classList.contains("dark") ? "dark" : "light"
    );
  });
})();

// ---------- Marketplace ----------
(function initMarketplace() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  const products = [
    { id: 1, shape: "round", material: "metal", price: 180 },
    { id: 2, shape: "square", material: "acetate", price: 190 },
    { id: 3, shape: "round", material: "acetate", price: 150 },
    { id: 4, shape: "square", material: "metal", price: 200 }
  ];

  function render(items) {
    grid.innerHTML = "";
    items.forEach((p) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="tag">${p.material.toUpperCase()}</div>
        <h4>${p.shape.toUpperCase()} FRAME</h4>
        <p>$${p.price}</p>
      `;
      card.addEventListener("click", () => {
        window.location.href = "create.html";
      });
      grid.appendChild(card);
    });
  }

  function filter() {
    const shapes = [...document.querySelectorAll(".filter-shape:checked")].map(cb => cb.value);
    const mats = [...document.querySelectorAll(".filter-material:checked")].map(cb => cb.value);

    const filtered = products.filter(p =>
      (shapes.length === 0 || shapes.includes(p.shape)) &&
      (mats.length === 0 || mats.includes(p.material))
    );

    render(filtered);
  }

  document.querySelectorAll(".filter-shape, .filter-material").forEach(cb => {
    cb.addEventListener("change", filter);
  });

  render(products);
})();

// ---------- My Designs ----------
function getDesigns() {
  try {
    return JSON.parse(localStorage.getItem(LS_DESIGNS)) || [];
  } catch {
    return [];
  }
}

function setActiveDesign(index) {
  localStorage.setItem(LS_ACTIVE, String(index));
}

function renderDesignsList() {
  const list = document.getElementById("designsList");
  if (!list) return;

  const designs = getDesigns();

  if (designs.length === 0) {
    list.innerHTML = `<p class="hint">No saved designs yet. Create one and click “SAVE DESIGN”.</p>`;
    return;
  }

  list.innerHTML = "";

  designs.forEach((d, i) => {
    const row = document.createElement("div");
    row.className = "design-row";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `#${i + 1} • ${d.model} • width:${d.frameWidth} • lens:${d.lensSize} • leg:${d.legLength} • th:${d.thickness}`;

    const actions = document.createElement("div");
    actions.className = "actions";

    const openBtn = document.createElement("button");
    openBtn.className = "btn primary";
    openBtn.textContent = "OPEN";
    openBtn.onclick = () => {
      setActiveDesign(i);
      window.location.href = "create.html";
    };

    const delBtn = document.createElement("button");
    delBtn.className = "btn";
    delBtn.textContent = "DELETE";
    delBtn.onclick = () => {
      const next = getDesigns().filter((_, idx) => idx !== i);
      localStorage.setItem(LS_DESIGNS, JSON.stringify(next));
      renderDesignsList();
    };

    actions.appendChild(openBtn);
    actions.appendChild(delBtn);

    row.appendChild(meta);
    row.appendChild(actions);
    list.appendChild(row);
  });
}

function viewSavedDesigns() {
  const modal = document.getElementById("designsModal");
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  renderDesignsList();
}

function closeDesignsModal() {
  const modal = document.getElementById("designsModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

document.addEventListener("click", (e) => {
  const modal = document.getElementById("designsModal");
  if (!modal || !modal.classList.contains("open")) return;
  if (e.target === modal) closeDesignsModal();
});

window.viewSavedDesigns = viewSavedDesigns;
window.closeDesignsModal = closeDesignsModal;
window.__OPTICUS__ = { LS_DESIGNS, LS_ACTIVE };