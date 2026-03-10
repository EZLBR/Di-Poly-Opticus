const LS_THEME = "opticus_theme";
const LS_DESIGNS = "opticus_designs";
const LS_ACTIVE = "opticus_active_design";

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

function getDesigns() {
  try {
    return JSON.parse(localStorage.getItem(LS_DESIGNS)) || [];
  } catch {
    return [];
  }
}

function setDesigns(designs) {
  localStorage.setItem(LS_DESIGNS, JSON.stringify(designs));
}

function setActiveDesign(index) {
  localStorage.setItem(LS_ACTIVE, String(index));
}

window.__OPTICUS__ = {
  LS_THEME,
  LS_DESIGNS,
  LS_ACTIVE,
  getDesigns,
  setDesigns,
  setActiveDesign
};