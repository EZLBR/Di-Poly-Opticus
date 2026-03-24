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

export default function CreatorPage({ hidden, onOpenDesigns }) {
  const [status, setStatus] = useState("Loading 3D tools...");

  useEffect(() => {
    let cancelled = false;

    async function bootCreator() {
      try {
        ensureLegacyOpticusStore();
        for (const src of creatorScripts) {
          await ensureScript(src);
        }

        if (!cancelled) setStatus("Creator ready");
      } catch (error) {
        console.error(error);
        if (!cancelled) setStatus("Creator failed to load");
      }
    }

    bootCreator();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`creator-page ${hidden ? "page-hidden" : ""}`} aria-hidden={hidden}>
      <section className="hero">
        <h1>CREATE YOUR OWN GLASSES</h1>
        <p>React shell active. The 3D engine below is still powered by the legacy creator while we migrate it.</p>
      </section>

      <main className="creator-layout">
        <div className="controls">
          <h3>MODEL</h3>
          <div className="model-buttons">
            <button type="button" id="btnRound" onClick={() => window.setModel?.("round")}>
              ROUND
            </button>
            <button type="button" id="btnSquare" onClick={() => window.setModel?.("square")}>
              SQUARE
            </button>
            <button type="button" id="btnHexagon" onClick={() => window.setModel?.("hexagon")}>
              HEXAGON
            </button>
          </div>

          <div className="control-row">
            <span>FRAME WIDTH</span>
            <span className="value" id="valFrameWidth">
              220
            </span>
          </div>
          <input type="range" id="frameWidth" min="150" max="350" defaultValue="220" />

          <div className="control-row">
            <span>LENS SIZE</span>
            <span className="value" id="valLensHeight">
              80
            </span>
          </div>
          <input type="range" id="lensHeight" min="50" max="150" defaultValue="80" />

          <div className="control-row">
            <span>LEG LENGTH</span>
            <span className="value" id="valLegLength">
              120
            </span>
          </div>
          <input type="range" id="legLength" min="50" max="200" defaultValue="120" />

          <div className="control-row">
            <span>THICKNESS</span>
            <span className="value" id="valThickness">
              6
            </span>
          </div>
          <input type="range" id="thickness" min="2" max="15" defaultValue="6" />

          <div className="control-row">
            <span>FRAME COLOR</span>
            <span className="value" id="valColor">
              #111827
            </span>
          </div>
          <input type="color" id="frameColor" defaultValue="#111827" />

          <h3>TEMPLE SETTINGS</h3>
          <div className="control-row">
            <span>TEMPLE OPENING</span>
            <span className="value" id="valTempleOpen">
              22
            </span>
          </div>
          <input id="templeOpen" type="range" min="-5" max="65" defaultValue="18" />

          <div className="control-row">
            <span>TEMPLE STYLE</span>
          </div>
          <select id="templeStyle" className="control-select" defaultValue="classic">
            <option value="classic">CLASSIC</option>
            <option value="straight">STRAIGHT</option>
            <option value="sport">SPORT</option>
          </select>

          <h3>FRAME DETAILS</h3>
          <div className="option-block">
            <label className="check-option">
              <input type="checkbox" id="topBar" defaultChecked />
              <span>TOP BAR</span>
            </label>
          </div>

          <div className="control-row">
            <span>BRIDGE STYLE</span>
          </div>
          <select id="bridgeStyle" className="control-select" defaultValue="soft">
            <option value="soft">SOFT</option>
            <option value="flat">FLAT</option>
            <option value="keyhole">KEYHOLE</option>
          </select>

          <div className="control-row">
            <span>FRAME PROFILE</span>
          </div>
          <select id="frameProfile" className="control-select" defaultValue="medium">
            <option value="thin">THIN</option>
            <option value="medium">MEDIUM</option>
            <option value="bold">BOLD</option>
          </select>

          <h3>OPTIONS</h3>
          <div className="option-block">
            <label className="check-option">
              <input type="checkbox" id="isSunglasses" />
              <span>SUNGLASSES</span>
            </label>
          </div>

          <div className="option-block">
            <label className="check-option">
              <input type="checkbox" id="antiReflective" defaultChecked />
              <span>ANTI-REFLECTIVE</span>
            </label>
          </div>

          <div className="option-block">
            <label className="field-label" htmlFor="prescriptionFile">
              PRESCRIPTION / RECIPE
            </label>
            <input type="file" id="prescriptionFile" accept=".pdf,.jpg,.jpeg,.png" />
            <small id="prescriptionName" className="hint">
              No file uploaded
            </small>
          </div>

          <button type="button" className="save-btn" onClick={() => window.saveDesign?.()}>
            SAVE NEW DESIGN
          </button>
          <button type="button" className="save-btn secondary-btn" onClick={() => window.updateCurrentDesign?.()}>
            UPDATE CURRENT DESIGN
          </button>
          <button type="button" className="save-btn secondary-btn" onClick={() => window.resetCurrentDesign?.()}>
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
