import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Upload, Trash2, Box } from "lucide-react";

export default function Importer() {
  const containerRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [modelLoaded, setModelLoaded] = useState(false);

  // References for Three.js instance
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const currentModelRef = useRef(null);
  const animationFrameIdRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Initialize Scene, Camera, and Renderer
    const container = containerRef.current;
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3f6fb);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
    camera.position.set(0, 1.2, 6);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    
    // Clear initial container contents and append canvas
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Setup Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.6);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-5, 4, 5);
    scene.add(fillLight);

    // 3. Render loop
    const animate = () => {
      if (currentModelRef.current) {
        currentModelRef.current.rotation.y += 0.003;
      }
      renderer.render(scene, camera);
      animationFrameIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const width = containerRef.current.clientWidth || 800;
      const height = containerRef.current.clientHeight || 480;

      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (currentModelRef.current) {
        scene.remove(currentModelRef.current);
      }
      // Dispose materials/geometries
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, []);

  const clearCurrentModel = () => {
    if (currentModelRef.current && sceneRef.current) {
      sceneRef.current.remove(currentModelRef.current);
      currentModelRef.current = null;
    }
    setFileName("");
    setModelLoaded(false);
  };

  const fitModelToView = (model) => {
    if (!cameraRef.current) return;
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    model.position.x -= center.x;
    model.position.y -= center.y;
    model.position.z -= center.z;

    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const targetSize = 3.2;
      const scale = targetSize / maxDim;
      model.scale.setScalar(scale);
    }

    model.updateMatrixWorld(true);

    const fittedBox = new THREE.Box3().setFromObject(model);
    const fittedSize = new THREE.Vector3();
    const fittedCenter = new THREE.Vector3();

    fittedBox.getSize(fittedSize);
    fittedBox.getCenter(fittedCenter);

    model.position.x -= fittedCenter.x;
    model.position.y -= fittedCenter.y;
    model.position.z -= fittedCenter.z;

    const distance = Math.max(4.5, fittedSize.length() * 1.2);
    cameraRef.current.position.set(0, Math.max(0.8, fittedSize.y * 0.25 + 0.5), distance);
    cameraRef.current.lookAt(0, 0, 0);
  };

  const normalizeImportedModel = (model) => {
    model.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) {
          if (!child.geometry.attributes.normal) {
            child.geometry.computeVertexNormals();
          }
          child.geometry.computeBoundingBox();
          child.geometry.computeBoundingSphere();
        }

        child.material = new THREE.MeshStandardMaterial({
          color: 0x8a8f99,
          metalness: 0.2,
          roughness: 0.55,
          side: THREE.DoubleSide
        });
      }
    });
  };

  const addModel = (model) => {
    clearCurrentModel();

    const group = new THREE.Group();
    group.add(model);

    normalizeImportedModel(group);
    fitModelToView(group);

    if (sceneRef.current) {
      sceneRef.current.add(group);
    }
    currentModelRef.current = group;
    setModelLoaded(true);
  };

  const loadOBJ = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const loader = new OBJLoader();
        const obj = loader.parse(text);
        addModel(obj);
      } catch (error) {
        console.error("Error importing OBJ:", error);
        alert("Failed to parse the OBJ file.");
      }
    };
    reader.readAsText(file);
  };

  const loadSTL = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target.result;
        const loader = new STLLoader();
        const geometry = loader.parse(arrayBuffer);
        const mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({
            color: 0x8a8f99,
            metalness: 0.2,
            roughness: 0.55,
            side: THREE.DoubleSide
          })
        );
        addModel(mesh);
      } catch (error) {
        console.error("Error importing STL:", error);
        alert("Failed to parse the STL file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const loadGLTF = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target.result;
        const loader = new GLTFLoader();
        loader.parse(
          arrayBuffer,
          "",
          (gltf) => {
            addModel(gltf.scene);
          },
          (error) => {
            console.error("Error parsing GLTF/GLB:", error);
            alert("Failed to parse GLB/GLTF file.");
          }
        );
      } catch (error) {
        console.error("Error importing GLTF/GLB:", error);
        alert("Failed to read GLB/GLTF file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "obj") {
      loadOBJ(file);
    } else if (ext === "stl") {
      loadSTL(file);
    } else if (ext === "glb" || ext === "gltf") {
      loadGLTF(file);
    } else {
      alert("Unsupported file format. Please upload GLB, GLTF, OBJ, or STL.");
      setFileName("");
    }
  };

  return (
    <div className="page-create page-import">
      <div className="page-wrapper">
        <section className="hero hero-import" style={{ padding: "40px 0" }}>
          <div className="hero-copy">
            <span className="eyebrow">Import Lab</span>
            <h1>IMPORT 3D MODELS INTO THE OPTICUS WORKFLOW</h1>
            <p>Upload external eyewear files, preview them in motion, and clear the stage in one streamlined workspace.</p>
          </div>
        </section>

        <main className="creator creator-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "30px", marginTop: "20px" }}>
          <div className="controls premium-glass-card" style={{ padding: "30px", borderRadius: "10px" }}>
            <h3>UPLOAD 3D MODEL</h3>
            
            <div style={{ margin: "24px 0" }}>
              <label
                htmlFor="modelUpload"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px 20px",
                  border: "2px dashed var(--input-border)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  textAlign: "center",
                  background: "var(--input-bg)",
                  color: "var(--text-dark)",
                  transition: "border-color 0.2s"
                }}
                className="upload-label-hover"
              >
                <Upload size={32} style={{ marginBottom: "12px", color: "var(--primary-accent)" }} />
                <span style={{ fontWeight: "600", fontSize: "14px" }}>Click to upload file</span>
                <span style={{ fontSize: "12px", color: "var(--color-hint)", marginTop: "6px" }}>GLB, GLTF, OBJ, STL</span>
              </label>
              <input
                type="file"
                id="modelUpload"
                accept=".glb,.gltf,.obj,.stl"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </div>

            {fileName && (
              <div
                style={{
                  background: "var(--input-bg)",
                  border: "1px solid var(--input-border)",
                  color: "var(--text-dark)",
                  padding: "12px",
                  borderRadius: "6px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                  <Box size={18} style={{ color: "var(--primary-accent)", flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {fileName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearCurrentModel}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            <button
              className="save-btn"
              type="button"
              id="clearBtn"
              onClick={clearCurrentModel}
              disabled={!modelLoaded}
              style={{
                width: "100%",
                background: !modelLoaded ? "var(--border-thin)" : "var(--primary-accent)",
                color: !modelLoaded ? "var(--color-hint)" : "var(--text-light)",
                border: "1px solid var(--input-border)",
                cursor: modelLoaded ? "pointer" : "default"
              }}
            >
              CLEAR MODEL
            </button>
          </div>

          <div className="preview premium-glass-card" style={{ padding: "20px", borderRadius: "10px", display: "flex", flexDirection: "column" }}>
            <div className="preview-head" style={{ marginBottom: "20px" }}>
              <span className="panel-kicker">3D inspection</span>
              <h2>Preview imported geometry before the next step</h2>
              <p>Use the animated viewer to inspect scale, silhouette, and orientation.</p>
            </div>
            
            <div
              id="threeContainer"
              ref={containerRef}
              style={{
                width: "100%",
                height: "480px",
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: "inset 0 0 10px rgba(0,0,0,0.2)",
                background: "#f3f6fb"
              }}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
