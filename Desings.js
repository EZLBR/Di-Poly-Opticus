const { getDesigns, setDesigns, setActiveDesign } = window.__OPTICUS__;

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
    meta.innerHTML = `
      <strong>${d.name || `Design #${i + 1}`}</strong><br>
      ${d.model} • width:${d.frameWidth} • lens:${d.lensSize} • leg:${d.legLength}
    `;

    const actions = document.createElement("div");
    actions.className = "actions";

    const openBtn = document.createElement("button");
    openBtn.className = "btn primary";
    openBtn.textContent = "OPEN";
    openBtn.onclick = () => {
      setActiveDesign(i);
      window.location.href = "create.html";
    };

    const publishBtn = document.createElement("button");
    publishBtn.className = "btn";
    publishBtn.textContent = d.published ? "UNPUBLISH" : "PUBLISH";
    publishBtn.onclick = () => {
      const next = getDesigns();
      next[i].published = !next[i].published;
      setDesigns(next);
      renderDesignsList();
      window.refreshMarketplace?.();
    };

    const delBtn = document.createElement("button");
    delBtn.className = "btn";
    delBtn.textContent = "DELETE";
    delBtn.onclick = () => {
      const next = getDesigns().filter((_, idx) => idx !== i);
      setDesigns(next);
      renderDesignsList();
      window.refreshMarketplace?.();
    };

    actions.append(openBtn, publishBtn, delBtn);
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

document.addEventListener("click", (e) => {
  const modal = document.getElementById("designsModal");
  if (!modal || !modal.classList.contains("open")) return;
  if (e.target === modal) closeDesignsModal();
});

window.viewSavedDesigns = viewSavedDesigns;
window.closeDesignsModal = closeDesignsModal;