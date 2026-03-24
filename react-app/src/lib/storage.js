const LS_THEME = "opticus_theme";
const LS_DESIGNS = "opticus_designs";
const LS_ACTIVE = "opticus_active_design";
const LS_ACTIVE_PRODUCT = "opticus_active_product";
const LS_FAVORITES = "opticus_favorites";
const LS_SESSION = "opticus_session";

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getTheme() {
  return localStorage.getItem(LS_THEME) || "light";
}

export function setTheme(theme) {
  localStorage.setItem(LS_THEME, theme);
}

export function getSession() {
  return readJson(LS_SESSION, null);
}

export function clearSession() {
  localStorage.removeItem(LS_SESSION);
}

export function getFavorites() {
  return readJson(LS_FAVORITES, []);
}

export function setFavorites(items) {
  writeJson(LS_FAVORITES, items);
}

export function getDesigns() {
  return readJson(LS_DESIGNS, []);
}

export function setDesigns(designs) {
  writeJson(LS_DESIGNS, designs);
}

export function getPublishedDesigns() {
  return getDesigns()
    .map((design, savedIndex) => ({ ...design, savedIndex }))
    .filter((design) => design.published)
    .map((design) => ({
      id: `design-${design.savedIndex}`,
      type: "saved",
      savedIndex: design.savedIndex,
      name: design.name || `Design #${design.savedIndex + 1}`,
      shape: design.model === "square" ? "square" : "round",
      material: design.isSunglasses ? "metal" : "acetate",
      price: design.isSunglasses ? 220 : 180,
      badge: "Community"
    }));
}

export function setActiveDesign(savedIndex) {
  localStorage.setItem(LS_ACTIVE, String(savedIndex));
  localStorage.removeItem(LS_ACTIVE_PRODUCT);
}

export function setActiveProduct(productId) {
  localStorage.setItem(LS_ACTIVE_PRODUCT, productId);
  localStorage.removeItem(LS_ACTIVE);
}

export function openReactCreateForProduct(product) {
  if (product.type === "saved") {
    setActiveDesign(product.savedIndex);
  } else {
    setActiveProduct(product.id);
  }

  window.location.hash = "#/create";
}

export function getActiveDesignIndex() {
  const raw = localStorage.getItem(LS_ACTIVE);
  const index = Number.parseInt(raw || "-1", 10);
  return Number.isInteger(index) ? index : -1;
}

export function getCurrentRoute() {
  return window.location.hash === "#/create" ? "create" : "marketplace";
}

export function goToRoute(route) {
  window.location.hash = route === "create" ? "#/create" : "#/";
}

export function ensureLegacyOpticusStore() {
  window.__OPTICUS__ = {
    LS_THEME,
    LS_DESIGNS,
    LS_ACTIVE,
    getDesigns,
    setDesigns,
    setActiveDesign
  };
}

export { LS_THEME };
