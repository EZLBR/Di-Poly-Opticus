import { useEffect, useState } from "react";
import { ensureLegacyOpticusStore } from "../lib/storage";

const creatorScriptUrl = new URL("../../../creator.js", import.meta.url).href;

const creatorScripts = [
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/exporters/STLExporter.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/exporters/OBJExporter.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/exporters/GLTFExporter.js",
  creatorScriptUrl
];

const defaultControls = {
  model: "round",
  frameWidth: "220",
  lensHeight: "80",
  legLength: "120",
  thickness: "6",
  frameColor: "#111827",
  templeOpen: "22",
  templeStyle: "classic",
  topBar: true,
  bridgeStyle: "soft",
  frameProfile: "medium",
  isSunglasses: false,
  antiReflective: true,
  prescriptionName: "No file uploaded"
};

function ensureScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-opticus-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.opticusSrc = src;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.body.appendChild(script);
  });
}

function readInputValue(id, fallback) {
  return document.getElementById(id)?.value ?? fallback;
}

function readCheckedValue(id, fallback) {
  const element = document.getElementById(id);
  return typeof element?.checked === "boolean" ? element.checked : fallback;
}

function readTextValue(id, fallback) {
  return document.getElementById(id)?.textContent ?? fallback;
}

export default function CreatorPage({ hidden, onOpenDesigns }) {
  const [status, setStatus] = useState("Loading 3D tools...");
  const [controls, setControls] = useState(defaultControls);

  function syncFromDom() {
    setControls({
      model:
        document.getElementById("btnHexagon")?.classList.contains("active")
          ? "hexagon"
          : document.getElementById("btnSquare")?.classList.contains("active")
            ? "square"
            : "round",
      frameWidth: readInputValue("frameWidth", defaultControls.frameWidth),
      lensHeight: readInputValue("lensHeight", defaultControls.lensHeight),
      legLength: readInputValue("legLength", defaultControls.legLength),
      thickness: readInputValue("thickness", defaultControls.thickness),
      frameColor: readInputValue("frameColor", defaultControls.frameColor),
      templeOpen: readInputValue("templeOpen", defaultControls.templeOpen),
      templeStyle: readInputValue("templeStyle", defaultControls.templeStyle),
      topBar: readCheckedValue("topBar", defaultControls.topBar),
      bridgeStyle: readInputValue("bridgeStyle", defaultControls.bridgeStyle),
      frameProfile: readInputValue("frameProfile", defaultControls.frameProfile),
      isSunglasses: readCheckedValue("isSunglasses", defaultControls.isSunglasses),
      antiReflective: readCheckedValue("antiReflective", defaultControls.antiReflective),
      prescriptionName: readTextValue("prescriptionName", defaultControls.prescriptionName)
    });
  }

  function runLegacyAction(action) {
    action?.();
    window.setTimeout(syncFromDom, 0);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootCreator() {
      try {
        ensureLegacyOpticusStore();
        for (const src of creatorScripts) {
          await ensureScript(src);
        }

        if (!cancelled) {
          syncFromDom();
          setStatus(readTextValue("draftStatus", "Creator ready"));
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) setStatus("Creator failed to load");
      }
    }

    bootCreator();

    const draftStatusObserver = new MutationObserver(() => {
      setStatus(readTextValue("draftStatus", "Creator ready"));
    });

    const intervalId = window.setInterval(() => {
      if (!cancelled) syncFromDom();
    }, 600);

    window.addEventListener("focus", syncFromDom);

    const draftNode = document.getElementById("draftStatus");
    if (draftNode) {
      draftStatusObserver.observe(draftNode, { childList: true, subtree: true, characterData: true });
    }

    return () => {
      cancelled = true;
      draftStatusObserver.disconnect();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", syncFromDom);
    };
  }, []);

  return (
    <div className={`creator-page ${hidden ? "page-hidden" : ""}`} aria-hidden={hidden}>
      <section className="hero">
        <h1>CREATE YOUR OWN GLASSES</h1>
        <p>React now owns the creator controls while the existing 3D engine still powers the live preview underneath.</p>
      </section>

      <main className="creator-layout">
        <div className="controls">
          <h3>MODEL</h3>
          <div className="model-buttons">
            <button
              type="button"
              id="btnRound"
              className={controls.model === "round" ? "active" : ""}
              onClick={() => runLegacyAction(() => window.setModel?.("round"))}
            >
              ROUND
            </button>
            <button
              type="button"
              id="btnSquare"
              className={controls.model === "square" ? "active" : ""}
              onClick={() => runLegacyAction(() => window.setModel?.("square"))}
            >
              SQUARE
            </button>
            <button
              type="button"
              id="btnHexagon"
              className={controls.model === "hexagon" ? "active" : ""}
              onClick={() => runLegacyAction(() => window.setModel?.("hexagon"))}
            >
              HEXAGON
            </button>
          </div>

          <div className="control-row">
            <span>FRAME WIDTH</span>
            <span className="value" id="valFrameWidth">
              {controls.frameWidth}
            </span>
          </div>
          <input
            type="range"
            id="frameWidth"
            min="150"
            max="350"
            value={controls.frameWidth}
            onChange={(event) => setControls((current) => ({ ...current, frameWidth: event.target.value }))}
          />

          <div className="control-row">
            <span>LENS SIZE</span>
            <span className="value" id="valLensHeight">
              {controls.lensHeight}
            </span>
          </div>
          <input
            type="range"
            id="lensHeight"
            min="50"
            max="150"
            value={controls.lensHeight}
            onChange={(event) => setControls((current) => ({ ...current, lensHeight: event.target.value }))}
          />

          <div className="control-row">
            <span>LEG LENGTH</span>
            <span className="value" id="valLegLength">
              {controls.legLength}
            </span>
          </div>
          <input
            type="range"
            id="legLength"
            min="50"
            max="200"
            value={controls.legLength}
            onChange={(event) => setControls((current) => ({ ...current, legLength: event.target.value }))}
          />

          <div className="control-row">
            <span>THICKNESS</span>
            <span className="value" id="valThickness">
              {controls.thickness}
            </span>
          </div>
          <input
            type="range"
            id="thickness"
            min="2"
            max="15"
            value={controls.thickness}
            onChange={(event) => setControls((current) => ({ ...current, thickness: event.target.value }))}
          />

          <div className="control-row">
            <span>FRAME COLOR</span>
            <span className="value" id="valColor">
              {controls.frameColor}
            </span>
          </div>
          <input
            type="color"
            id="frameColor"
            value={controls.frameColor}
            onChange={(event) => setControls((current) => ({ ...current, frameColor: event.target.value }))}
          />

          <h3>TEMPLE SETTINGS</h3>
          <div className="control-row">
            <span>TEMPLE OPENING</span>
            <span className="value" id="valTempleOpen">
              {controls.templeOpen}
            </span>
          </div>
          <input
            id="templeOpen"
            type="range"
            min="-5"
            max="65"
            value={controls.templeOpen}
            onChange={(event) => setControls((current) => ({ ...current, templeOpen: event.target.value }))}
          />

          <div className="control-row">
            <span>TEMPLE STYLE</span>
          </div>
          <select
            id="templeStyle"
            className="control-select"
            value={controls.templeStyle}
            onChange={(event) => setControls((current) => ({ ...current, templeStyle: event.target.value }))}
          >
            <option value="classic">CLASSIC</option>
            <option value="straight">STRAIGHT</option>
            <option value="sport">SPORT</option>
          </select>

          <h3>FRAME DETAILS</h3>
          <div className="option-block">
            <label className="check-option">
              <input
                type="checkbox"
                id="topBar"
                checked={controls.topBar}
                onChange={(event) => setControls((current) => ({ ...current, topBar: event.target.checked }))}
              />
              <span>TOP BAR</span>
            </label>
          </div>

          <div className="control-row">
            <span>BRIDGE STYLE</span>
          </div>
          <select
            id="bridgeStyle"
            className="control-select"
            value={controls.bridgeStyle}
            onChange={(event) => setControls((current) => ({ ...current, bridgeStyle: event.target.value }))}
          >
            <option value="soft">SOFT</option>
            <option value="flat">FLAT</option>
            <option value="keyhole">KEYHOLE</option>
          </select>

          <div className="control-row">
            <span>FRAME PROFILE</span>
          </div>
          <select
            id="frameProfile"
            className="control-select"
            value={controls.frameProfile}
            onChange={(event) => setControls((current) => ({ ...current, frameProfile: event.target.value }))}
          >
            <option value="thin">THIN</option>
            <option value="medium">MEDIUM</option>
            <option value="bold">BOLD</option>
          </select>

          <h3>OPTIONS</h3>
          <div className="option-block">
            <label className="check-option">
              <input
                type="checkbox"
                id="isSunglasses"
                checked={controls.isSunglasses}
                onChange={(event) => setControls((current) => ({ ...current, isSunglasses: event.target.checked }))}
              />
              <span>SUNGLASSES</span>
            </label>
          </div>

          <div className="option-block">
            <label className="check-option">
              <input
                type="checkbox"
                id="antiReflective"
                checked={controls.antiReflective}
                onChange={(event) => setControls((current) => ({ ...current, antiReflective: event.target.checked }))}
              />
              <span>ANTI-REFLECTIVE</span>
            </label>
          </div>

          <div className="option-block">
            <label className="field-label" htmlFor="prescriptionFile">
              PRESCRIPTION / RECIPE
            </label>
            <input type="file" id="prescriptionFile" accept=".pdf,.jpg,.jpeg,.png" onChange={() => window.setTimeout(syncFromDom, 0)} />
            <small id="prescriptionName" className="hint">
              {controls.prescriptionName}
            </small>
          </div>

          <button type="button" className="save-btn" onClick={() => runLegacyAction(window.saveDesign)}>
            SAVE NEW DESIGN
          </button>
          <button type="button" className="save-btn secondary-btn" onClick={() => runLegacyAction(window.updateCurrentDesign)}>
            UPDATE CURRENT DESIGN
          </button>
          <button type="button" className="save-btn secondary-btn" onClick={() => runLegacyAction(window.resetCurrentDesign)}>
            RESET CURRENT VIEW
          </button>
          <button type="button" className="save-btn secondary-btn" onClick={onOpenDesigns}>
            MY DESIGNS
          </button>
          <p className="hint" id="draftStatus">
            {status}
          </p>

          <div className="export-actions">
            <button type="button" className="save-btn export-btn" onClick={() => window.exportModel?.("stl")}>
              EXPORT STL
            </button>
            <button type="button" className="save-btn export-btn" onClick={() => window.exportModel?.("obj")}>
              EXPORT OBJ
            </button>
            <button type="button" className="save-btn export-btn" onClick={() => window.exportModel?.("glb")}>
              EXPORT GLB
            </button>
            <button type="button" className="save-btn export-btn" onClick={() => window.exportModel?.("gltf")}>
              EXPORT GLTF
            </button>
          </div>
        </div>

        <div className="preview">
          <div id="threeContainer">
            <div className="viewer-ui">
              <button id="btnAuto" className="vbtn primary" type="button">
                Auto: ON
              </button>

              <div className="vpad">
                <button id="rotUp" className="vbtn" type="button">
                  UP
                </button>
                <div className="vrow">
                  <button id="rotLeft" className="vbtn" type="button">
                    LEFT
                  </button>
                  <button id="rotRight" className="vbtn" type="button">
                    RIGHT
                  </button>
                </div>
                <button id="rotDown" className="vbtn" type="button">
                  DOWN
                </button>
              </div>

              <div className="vzoom">
                <button id="zoomIn" className="vbtn" type="button">
                  +
                </button>
                <button id="zoomOut" className="vbtn" type="button">
                  -
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
