let videoEl = null;
let canvasEl = null;
let ctx = null;
let cameraStream = null;
let tryOnRunning = false;
let faceLandmarker = null;
let lastVideoTime = -1;

const fallbackConfig = {
  model: "round",
  color: "#111827"
};

function getTryonConfig() {
  return window.config || fallbackConfig;
}

async function setupFaceLandmarker() {
  if (faceLandmarker) return faceLandmarker;

  try {
    const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm");
    const { FaceLandmarker, FilesetResolver } = vision;

    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false
    });

    return faceLandmarker;
  } catch (error) {
    console.error("MediaPipe failed:", error);
    return null;
  }
}

async function startTryOnTracking() {
  videoEl = document.getElementById("tryonVideo");
  canvasEl = document.getElementById("tryonCanvas");

  if (!videoEl || !canvasEl) {
    alert("Try-on video/canvas not found.");
    return;
  }

  ctx = canvasEl.getContext("2d");

  const statusEl = document.getElementById("tryOnStatus");
  if (statusEl) statusEl.textContent = "Loading face tracking...";

  await setupFaceLandmarker();

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    videoEl.srcObject = cameraStream;
    await videoEl.play();

    resizeTryOnCanvas();

    tryOnRunning = true;
    lastVideoTime = -1;

    if (statusEl) {
      statusEl.textContent = faceLandmarker
        ? "Camera active · tracking enabled"
        : "Camera active · tracking failed";
    }

    requestAnimationFrame(renderTryOnFrame);
  } catch (error) {
    console.error("Camera error:", error);
    if (statusEl) statusEl.textContent = "Camera error: " + error.message;
  }
}

function stopTryOnTracking() {
  tryOnRunning = false;

  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }

  if (ctx && canvasEl) {
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  }

  const statusEl = document.getElementById("tryOnStatus");
  if (statusEl) statusEl.textContent = "Camera idle";
}

function resizeTryOnCanvas() {
  if (!videoEl || !canvasEl) return;

  canvasEl.width = videoEl.videoWidth || 1280;
  canvasEl.height = videoEl.videoHeight || 720;
}

function renderTryOnFrame() {
  if (!tryOnRunning || !videoEl || !canvasEl || !ctx) return;

  if (videoEl.readyState < 2) {
    requestAnimationFrame(renderTryOnFrame);
    return;
  }

  if (
    canvasEl.width !== videoEl.videoWidth ||
    canvasEl.height !== videoEl.videoHeight
  ) {
    resizeTryOnCanvas();
  }

  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  if (!faceLandmarker) {
    drawManualDemoGlasses();
    requestAnimationFrame(renderTryOnFrame);
    return;
  }

  let result = null;

  if (videoEl.currentTime !== lastVideoTime) {
    lastVideoTime = videoEl.currentTime;
    result = faceLandmarker.detectForVideo(videoEl, performance.now());
  }

  if (result?.faceLandmarks?.length) {
    drawTrackedGlasses(result.faceLandmarks[0], canvasEl.width, canvasEl.height);
    updateAISuggestionsFromLandmarks(result.faceLandmarks[0]);

    const statusEl = document.getElementById("tryOnStatus");
    if (statusEl) statusEl.textContent = "Face detected";
  } else {
    drawManualDemoGlasses();

    const statusEl = document.getElementById("tryOnStatus");
    if (statusEl) statusEl.textContent = "No face detected";
  }

  requestAnimationFrame(renderTryOnFrame);
}

function landmarkToPixel(lm, width, height) {
  return {
    x: lm.x * width,
    y: lm.y * height,
    z: lm.z || 0
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  };
}

let smoothTryOn = {
  cx: 0,
  cy: 0,
  lensW: 0,
  lensH: 0,
  bridgeW: 0,
  angle: 0,
  initialized: false
};

function smoothValue(current, target, amount = 0.22) {
  return current + (target - current) * amount;
}

function drawTrackedGlasses(landmarks, width, height) {
  const leftOuter = landmarkToPixel(landmarks[33], width, height);
  const rightOuter = landmarkToPixel(landmarks[263], width, height);
  const leftInner = landmarkToPixel(landmarks[133], width, height);
  const rightInner = landmarkToPixel(landmarks[362], width, height);
  const noseTip = landmarkToPixel(landmarks[1], width, height);

  const eyeCenter = midpoint(leftOuter, rightOuter);
  const eyeDistance = distance(leftOuter, rightOuter);
  const frameWidth = eyeDistance * 2.05;

  const angle = Math.atan2(
    rightOuter.y - leftOuter.y,
    rightOuter.x - leftOuter.x
  );

  const bridgeWidth = distance(leftInner, rightInner) * 0.95;
  const lensWidth = frameWidth * 0.36;

  const config = getTryonConfig();

  let lensHeight;
  if (config.model === "round") {
    lensHeight = lensWidth * 0.82;
  } else if (config.model === "hexagon") {
    lensHeight = lensWidth * 0.76;
  } else {
    lensHeight = lensWidth * 0.72;
  }

  const centerX = eyeCenter.x;
  const centerY = noseTip.y - lensHeight * 0.28;

  if (!smoothTryOn.initialized) {
    smoothTryOn = {
      cx: centerX,
      cy: centerY,
      lensW: lensWidth,
      lensH: lensHeight,
      bridgeW: bridgeWidth,
      angle,
      initialized: true
    };
  } else {
    smoothTryOn.cx = smoothValue(smoothTryOn.cx, centerX);
    smoothTryOn.cy = smoothValue(smoothTryOn.cy, centerY);
    smoothTryOn.lensW = smoothValue(smoothTryOn.lensW, lensWidth);
    smoothTryOn.lensH = smoothValue(smoothTryOn.lensH, lensHeight);
    smoothTryOn.bridgeW = smoothValue(smoothTryOn.bridgeW, bridgeWidth);
    smoothTryOn.angle = smoothValue(smoothTryOn.angle, angle, 0.16);
  }

  drawStylizedFrame(
    smoothTryOn.cx,
    smoothTryOn.cy,
    smoothTryOn.lensW,
    smoothTryOn.lensH,
    smoothTryOn.bridgeW,
    smoothTryOn.angle
  );
}

function drawManualDemoGlasses() {
  const w = canvasEl.width;
  const h = canvasEl.height;

  drawStylizedFrame(
    w * 0.5,
    h * 0.43,
    w * 0.17,
    w * 0.12,
    w * 0.07,
    0
  );
}

function drawStylizedFrame(cx, cy, lensW, lensH, bridgeW, angle) {
  const config = getTryonConfig();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const frameColor = config.color || "#111827";
  const line = Math.max(4, lensW * 0.055);

  ctx.lineWidth = line;
  ctx.strokeStyle = frameColor;
  ctx.fillStyle = "rgba(160, 190, 220, 0.18)";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const leftX = -(bridgeW / 2 + lensW);
  const rightX = bridgeW / 2;

  if (config.model === "round") {
    drawRoundLens(leftX + lensW / 2, 0, lensW, lensH);
    drawRoundLens(rightX + lensW / 2, 0, lensW, lensH);
  } else if (config.model === "hexagon") {
    drawHexLens(leftX + lensW / 2, 0, lensW, lensH);
    drawHexLens(rightX + lensW / 2, 0, lensW, lensH);
  } else {
    drawSquareLens(leftX + lensW / 2, 0, lensW, lensH);
    drawSquareLens(rightX + lensW / 2, 0, lensW, lensH);
  }

  ctx.beginPath();
  ctx.moveTo(-bridgeW / 2, 0);
  ctx.quadraticCurveTo(0, -lensH * 0.18, bridgeW / 2, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(leftX, -lensH * 0.08);
  ctx.lineTo(leftX - lensW * 0.45, -lensH * 0.22);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rightX + lensW, -lensH * 0.08);
  ctx.lineTo(rightX + lensW + lensW * 0.45, -lensH * 0.22);
  ctx.stroke();

  ctx.restore();
}

function drawRoundLens(x, y, w, h) {
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawSquareLens(x, y, w, h) {
  const r = Math.min(w, h) * 0.16;
  roundRectPath(x - w / 2, y - h / 2, w, h, r);
  ctx.fill();
  ctx.stroke();
}

function drawHexLens(x, y, w, h) {
  const rx = w / 2;
  const ry = h / 2;

  ctx.beginPath();
  ctx.moveTo(x - rx * 0.55, y - ry);
  ctx.lineTo(x + rx * 0.55, y - ry);
  ctx.lineTo(x + rx, y - ry * 0.15);
  ctx.lineTo(x + rx * 0.72, y + ry);
  ctx.lineTo(x - rx * 0.72, y + ry);
  ctx.lineTo(x - rx, y - ry * 0.15);
  ctx.closePath();

  ctx.fill();
  ctx.stroke();
}

function roundRectPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function updateAISuggestionsFromLandmarks(landmarks) {
  const el = document.getElementById("aiSuggestions");
  if (!el) return;

  const leftOuter = landmarkToPixel(landmarks[33], canvasEl.width, canvasEl.height);
  const rightOuter = landmarkToPixel(landmarks[263], canvasEl.width, canvasEl.height);
  const noseTip = landmarkToPixel(landmarks[1], canvasEl.width, canvasEl.height);

  const faceWidth = distance(leftOuter, rightOuter);
  const config = getTryonConfig();

  const suggestions = [];

  if (faceWidth < canvasEl.width * 0.18) {
    suggestions.push("Try thinner frames for a lighter look.");
  } else {
    suggestions.push("Bolder frames may suit your proportions.");
  }

  if (noseTip.y / canvasEl.height > 0.5) {
    suggestions.push("Rounder lenses can balance your facial proportions.");
  } else {
    suggestions.push("Square frames can sharpen the overall look.");
  }

  if (config.model === "round") {
    suggestions.push("Recommended: try Square for stronger contrast.");
  } else if (config.model === "square") {
    suggestions.push("Recommended: try Round to soften the expression.");
  } else {
    suggestions.push("Hexagon gives a more futuristic style.");
  }

  el.innerHTML = suggestions
    .map((s) => `<div class="suggestion">${s}</div>`)
    .join("");
}

window.startTryOnTracking = startTryOnTracking;
window.stopTryOnTracking = stopTryOnTracking;