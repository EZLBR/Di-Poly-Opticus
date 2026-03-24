const opticusStore = window.__OPTICUS__ || {};

function getActiveDesignIndex() {
  const raw = localStorage.getItem("opticus_active_design");
  const index = Number.parseInt(raw || "-1", 10);
  return Number.isInteger(index) ? index : -1;
}

function clearActiveSelection() {
  localStorage.removeItem("opticus_active_design");
  localStorage.removeItem("opticus_active_product");
}

function formatDesignSummary(design) {
  const width = Number(design.frameWidth || 0).toFixed(2);
  const lens = Number(design.lensSize || 0).toFixed(2);
  const leg = Number(design.legLength || 0).toFixed(2);
  return `${design.model || "custom"} | width: ${width} | lens: ${lens} | leg: ${leg}`;
}

function removeDesignAt(index) {
  const next = (opticusStore.getDesigns?.() || []).filter((_, currentIndex) => currentIndex !== index);
  opticusStore.setDesigns?.(next);

  const activeIndex = getActiveDesignIndex();
  if (activeIndex === index) {
    clearActiveSelection();
  } else if (activeIndex > index) {
    opticusStore.setActiveDesign?.(activeIndex - 1);
  }
}

function togglePublished(index) {
  const next = opticusStore.getDesigns?.() || [];
  if (!next[index]) return;

  next[index].published = !next[index].published;
  opticusStore.setDesigns?.(next);
}

function renderDesignsList() {
  const list = document.getElementById("designsList");
  if (!list || typeof opticusStore.getDesigns !== "function") return;

  const designs = opticusStore.getDesigns();
  const activeIndex = getActiveDesignIndex();

  if (designs.length === 0) {
    list.innerHTML = `<p class="hint">No saved designs yet. Create one and click "SAVE NEW DESIGN".</p>`;
    return;
  }

  list.innerHTML = "";

  designs.forEach((design, index) => {
    const row = document.createElement("div");
    row.className = "design-row";

    const meta = document.createElement("div");
    meta.className = "meta";

    const title = document.createElement("strong");
    title.textContent = design.name || `Design #${index + 1}`;

    const summary = document.createElement("div");
    summary.className = "design-summary";
    summary.textContent = formatDesignSummary(design);

    const status = document.createElement("div");
    status.className = "design-status";
    status.textContent = `${design.published ? "Published" : "Private"}${activeIndex === index ? " | Active" : ""}`;

    meta.append(title, summary, status);

    const actions = document.createElement("div");
    actions.className = "actions";

    const openBtn = document.createElement("button");
    openBtn.className = "btn primary";
    openBtn.type = "button";
    openBtn.textContent = "OPEN";
    openBtn.onclick = () => {
      opticusStore.setActiveDesign?.(index);
      localStorage.removeItem("opticus_active_product");
      window.location.href = "create.html";
    };

    const publishBtn = document.createElement("button");
    publishBtn.className = "btn";
    publishBtn.type = "button";
    publishBtn.textContent = design.published ? "UNPUBLISH" : "PUBLISH";
    publishBtn.onclick = () => {
      togglePublished(index);
      renderDesignsList();
      window.refreshMarketplace?.();
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn";
    deleteBtn.type = "button";
    deleteBtn.textContent = "DELETE";
    deleteBtn.onclick = () => {
      removeDesignAt(index);
      renderDesignsList();
      window.refreshMarketplace?.();
    };

    actions.append(openBtn, publishBtn, deleteBtn);
    row.append(meta, actions);
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

document.addEventListener("click", (event) => {
  const modal = document.getElementById("designsModal");
  if (!modal || !modal.classList.contains("open")) return;
  if (event.target === modal) closeDesignsModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDesignsModal();
});

window.viewSavedDesigns = viewSavedDesigns;
window.closeDesignsModal = closeDesignsModal;
