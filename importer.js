import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OBJLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/STLLoader.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

const container = document.getElementById("threeContainer");
const uploadInput = document.getElementById("modelUpload");
const clearBtn = document.getElementById("clearBtn");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf3f6fb);

const camera = new THREE.PerspectiveCamera(
  45,
  (container.clientWidth || 800) / (container.clientHeight || 480),
  0.1,
  2000
);
camera.position.set(0, 1.2, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth || 800, container.clientHeight || 480);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
container.innerHTML = "";
container.appendChild(renderer.domElement);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.6);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
fillLight.position.set(-5, 4, 5);
scene.add(fillLight);

let currentModel = null;

function animate() {
  requestAnimationFrame(animate);

  if (currentModel) {
    currentModel.rotation.y += 0.003;
  }

  renderer.render(scene, camera);
}
animate();

function clearCurrentModel() {
  if (!currentModel) return;
  scene.remove(currentModel);
  currentModel = null;
}

function fitModelToView(model) {
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
  camera.position.set(0, Math.max(0.8, fittedSize.y * 0.25 + 0.5), distance);
  camera.lookAt(0, 0, 0);
}

function normalizeImportedModel(model) {
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
}

function addModel(model) {
  clearCurrentModel();

  currentModel = new THREE.Group();
  currentModel.add(model);

  normalizeImportedModel(currentModel);
  fitModelToView(currentModel);

  scene.add(currentModel);
  console.log("Modelo importado com sucesso.");
}

function loadOBJ(file) {
  const reader = new FileReader();

  reader.onload = (event) => {
    try {
      const text = event.target.result;
      const loader = new OBJLoader();
      const obj = loader.parse(text);
      addModel(obj);
    } catch (error) {
      console.error("Erro ao importar OBJ:", error);
      alert("Falha ao importar o OBJ.");
    }
  };

  reader.readAsText(file);
}

function loadSTL(file) {
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
      console.error("Erro ao importar STL:", error);
      alert("Falha ao importar o STL.");
    }
  };

  reader.readAsArrayBuffer(file);
}

function loadGLTF(file) {
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
          console.error("Erro ao importar GLTF/GLB:", error);
          alert("Falha ao importar GLB/GLTF.");
        }
      );
    } catch (error) {
      console.error("Erro ao importar GLTF/GLB:", error);
      alert("Falha ao importar GLB/GLTF.");
    }
  };

  reader.readAsArrayBuffer(file);
}

function loadModel(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  console.log("Arquivo selecionado:", file.name, "| extensão:", ext);

  if (ext === "obj") {
    loadOBJ(file);
    return;
  }

  if (ext === "stl") {
    loadSTL(file);
    return;
  }

  if (ext === "glb" || ext === "gltf") {
    loadGLTF(file);
    return;
  }

  alert("Formato não suportado.");
}

uploadInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) {
    loadModel(file);
  }
});

clearBtn.addEventListener("click", () => {
  clearCurrentModel();
});

window.addEventListener("resize", () => {
  const w = container.clientWidth || 800;
  const h = container.clientHeight || 480;

  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});