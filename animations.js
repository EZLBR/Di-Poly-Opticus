(function initOpticusAnimations() {
  const body = document.body;
  if (!body) return;

  body.classList.add("js-ready");

  const revealSelectors = [
    ".navbar > *",
    ".hero-copy > *",
    ".hero-panel",
    ".hero-card",
    ".hero-stats > *",
    ".filters",
    ".filter-group",
    ".catalog-toolbar > *",
    ".product-card",
    ".controls > *",
    ".preview-head > *",
    ".preview",
    ".portal-page > *",
    ".portal-card",
    ".login-card > *",
    ".summary-card",
    ".table-card",
    ".design-row",
    ".modal-card"
  ];

  const revealSet = new WeakSet();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.14,
    rootMargin: "0px 0px -8% 0px"
  });

  function applyReveal(root = document) {
    const selectors = revealSelectors.join(",");
    const nodes = [];
    if (root instanceof Element && root.matches(selectors)) nodes.push(root);
    nodes.push(...root.querySelectorAll(selectors));
    nodes.forEach((el, index) => {
      if (revealSet.has(el)) return;
      revealSet.add(el);
      el.classList.add("reveal-item");
      el.style.setProperty("--reveal-delay", `${Math.min(index * 50, 420)}ms`);
      observer.observe(el);
    });
  }

  function applyInteractive(root = document) {
    const clickableSelector = ".btn, .save-btn, .dark-toggle, .model-buttons button, .vbtn, .favorite-btn, .modal-close";
    const tiltSelector = ".product-card, .hero-card, .portal-card, .login-card, .summary-card, .table-card, .modal-card";
    const clickable = [];
    const tiltNodes = [];
    if (root instanceof Element && root.matches(clickableSelector)) clickable.push(root);
    if (root instanceof Element && root.matches(tiltSelector)) tiltNodes.push(root);
    clickable.push(...root.querySelectorAll(clickableSelector));
    tiltNodes.push(...root.querySelectorAll(tiltSelector));
    clickable.forEach((el) => {
      if (el.dataset.rippleBound === "true") return;
      el.dataset.rippleBound = "true";
      el.classList.add("has-ripple");
      el.addEventListener("pointerdown", (event) => {
        const rect = el.getBoundingClientRect();
        const ripple = document.createElement("span");
        ripple.className = "ripple-dot";
        ripple.style.left = `${event.clientX - rect.left}px`;
        ripple.style.top = `${event.clientY - rect.top}px`;
        el.appendChild(ripple);
        window.setTimeout(() => ripple.remove(), 650);
      });
    });

    tiltNodes.forEach((card) => {
      if (card.dataset.tiltBound === "true") return;
      card.dataset.tiltBound = "true";
      card.classList.add("tilt-card");
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        card.style.setProperty("--rx", `${(0.5 - py) * 8}deg`);
        card.style.setProperty("--ry", `${(px - 0.5) * 10}deg`);
        card.style.setProperty("--mx", `${px * 100}%`);
        card.style.setProperty("--my", `${py * 100}%`);
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }

  function initHeroParallax() {
    document.querySelectorAll(".hero").forEach((hero) => {
      hero.addEventListener("pointermove", (event) => {
        const rect = hero.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        hero.style.setProperty("--hero-shift-x", `${x * 14}px`);
        hero.style.setProperty("--hero-shift-y", `${y * 10}px`);
      });
      hero.addEventListener("pointerleave", () => {
        hero.style.setProperty("--hero-shift-x", "0px");
        hero.style.setProperty("--hero-shift-y", "0px");
      });
    });
  }

  function updateScrollProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
    document.documentElement.style.setProperty("--scroll-progress", progress.toFixed(4));
  }

  applyReveal();
  applyInteractive();
  initHeroParallax();
  updateScrollProgress();

  const mo = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        applyReveal(node);
        applyInteractive(node);
        if (node.matches?.(".product-card, .design-row, .summary-card, .table-card")) {
          node.classList.add("is-visible");
        }
      });
    }
  });

  mo.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  window.addEventListener("resize", updateScrollProgress);
})();
