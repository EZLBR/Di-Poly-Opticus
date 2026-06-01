import React, { useEffect, useRef, useState } from "react";
import { useCreatorStudio } from "../../contexts/CreatorStudioContext";
import { useTranslation } from "../../contexts/LanguageContext";

export default function TryOnViewport() {
  const {
    model,
    color,
    isSunglasses,
    frameProfile,
    tryOnMode,
    setTryOnMode,
    showToast
  } = useCreatorStudio();

  const { language } = useTranslation();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const trackingFrameIdRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const [loadingLandmarker, setLoadingLandmarker] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  const smoothTryOnRef = useRef({
    cx: 0, cy: 0,
    lensW: 0, lensH: 0, bridgeW: 0,
    angle: 0, initialized: false
  });

  useEffect(() => {
    if (tryOnMode) {
      startTryOn();
    } else {
      stopTryOn();
    }
    return () => {
      stopTryOn();
    };
  }, [tryOnMode]);

  async function startTryOn() {
    setLoadingLandmarker(true);
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const { FaceLandmarker, FilesetResolver } = vision;

      if (!faceLandmarkerRef.current) {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
        );

        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false
        });
      }

      setLoadingLandmarker(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });

      cameraStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        trackingFrameIdRef.current = requestAnimationFrame(renderTrackingFrame);
      }
    } catch (err) {
      console.error("Camera tryon failed:", err);
      setLoadingLandmarker(false);
      showToast(language === "pt" ? "Erro ao acessar a câmera: " + err.message : "Error accessing camera: " + err.message);
      setTryOnMode(false);
    }
  }

  function stopTryOn() {
    setFaceDetected(false);
    if (trackingFrameIdRef.current) {
      cancelAnimationFrame(trackingFrameIdRef.current);
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    smoothTryOnRef.current.initialized = false;
  }

  function updateAISuggestions(landmarks, eyeDistance) {
    const list = [];
    if (eyeDistance < 130) {
      list.push(language === "pt" 
        ? "Proporção facial compacta: o perfil mais fino (Thin) ficará mais leve e proporcional."
        : "Compact facial proportion: the Thin profile option will feel lighter and better balanced.");
    } else {
      list.push(language === "pt" 
        ? "Estrutura facial ampla: o perfil bold (Bold) dará um destaque elegante e premium."
        : "Wide facial structure: the Bold profile option will create a premium presence.");
    }

    if (model === "cateye") {
      list.push(language === "pt" 
        ? "Armações Cat-eye suavizam maxilares marcados e levantam a expressão facial."
        : "Cat-eye frames beautifully soften strong jawlines and lift the facial expression.");
    } else if (model === "wayfarer") {
      list.push(language === "pt" 
        ? "Armações Square/Wayfarer adicionam definição a rostos mais arredondados."
        : "Square/Wayfarer frames add outstanding definition to rounder facial features.");
    } else {
      list.push(language === "pt" 
        ? "A silhueta Aviator equilibra proporções e adiciona um toque clássico atemporal."
        : "The Aviator shape balances proportions and adds a timeless classic touch.");
    }

    setAiSuggestions(list);
  }

  function drawStylizedFrameOverlay(ctx, cx, cy, lensW, lensH, bridgeW, angle) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const frameColor = color || "#111827";
    const line = Math.max(4, lensW * (frameProfile === "bold" ? 0.09 : frameProfile === "thin" ? 0.038 : 0.055));

    ctx.lineWidth = line;
    ctx.strokeStyle = frameColor;
    ctx.fillStyle = isSunglasses ? "rgba(21, 27, 38, 0.88)" : "rgba(220, 235, 255, 0.25)";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const leftX = -(bridgeW / 2 + lensW);
    const rightX = bridgeW / 2;

    const roundRectPath = (x, y, w, h, r) => {
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
    };

    const drawLens = (x, y, w, h) => {
      if (model === "cateye") {
        ctx.beginPath();
        ctx.moveTo(x, y - h / 2);
        ctx.bezierCurveTo(x + w / 2, y - h * 0.6, x + w * 0.7, y - h / 2, x + w / 2, y + h / 2);
        ctx.bezierCurveTo(x + w * 0.2, y + h * 0.6, x - w / 2, y + h / 2, x - w / 2, y);
        ctx.bezierCurveTo(x - w / 2, y - h / 2, x - w * 0.2, y - h / 2, x, y - h / 2);
        ctx.fill();
        ctx.stroke();
      } else if (model === "wayfarer") {
        const r = Math.min(w, h) * 0.16;
        roundRectPath(x - w / 2, y - h / 2, w, h, r);
        ctx.fill();
        ctx.stroke();
      } else { // aviator
        ctx.beginPath();
        ctx.ellipse(x, y + h*0.1, w / 2, h / 2 * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    };

    drawLens(leftX + lensW / 2, 0, lensW, lensH);
    drawLens(rightX + lensW / 2, 0, lensW, lensH);

    ctx.beginPath();
    ctx.moveTo(-bridgeW / 2, 0);
    ctx.quadraticCurveTo(0, -lensH * 0.14, bridgeW / 2, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(leftX, -lensH * 0.08);
    ctx.lineTo(leftX - lensW * 0.42, -lensH * 0.22);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rightX + lensW, -lensH * 0.08);
    ctx.lineTo(rightX + lensW + lensW * 0.42, -lensH * 0.22);
    ctx.stroke();

    ctx.restore();
  }

  function renderTrackingFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.srcObject) return;

    if (video.readyState < 2) {
      trackingFrameIdRef.current = requestAnimationFrame(renderTrackingFrame);
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    let landmarker = faceLandmarkerRef.current;
    if (!landmarker) {
      drawStylizedFrameOverlay(ctx, canvas.width * 0.5, canvas.height * 0.43, canvas.width * 0.17, canvas.width * 0.12, canvas.width * 0.07, 0);
      setFaceDetected(false);
      trackingFrameIdRef.current = requestAnimationFrame(renderTrackingFrame);
      return;
    }

    const result = landmarker.detectForVideo(video, performance.now());

    if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
      const landmarks = result.faceLandmarks[0];
      setFaceDetected(true);

      const getPixel = (idx) => {
        const lm = landmarks[idx];
        return {
          x: (1 - lm.x) * canvas.width,
          y: lm.y * canvas.height,
          z: lm.z
        };
      };

      const leftOuter = getPixel(33);
      const rightOuter = getPixel(263);
      const leftInner = getPixel(133);
      const rightInner = getPixel(362);
      const noseTip = getPixel(1);

      const eyeCenter = {
        x: (leftOuter.x + rightOuter.x) / 2,
        y: (leftOuter.y + rightOuter.y) / 2
      };

      const eyeDistance = Math.hypot(rightOuter.x - leftOuter.x, rightOuter.y - leftOuter.y);
      const frameWidth = eyeDistance * 2.05;
      const angle = Math.atan2(rightOuter.y - leftOuter.y, rightOuter.x - leftOuter.x);
      const bridgeWidth = Math.hypot(rightInner.x - leftInner.x, rightInner.y - leftInner.y) * 0.95;
      const lensWidth = frameWidth * 0.36;

      let lensHeight;
      if (model === "aviator") {
        lensHeight = lensWidth * 0.82;
      } else if (model === "wayfarer") {
        lensHeight = lensWidth * 0.72;
      } else {
        lensHeight = lensWidth * 0.76;
      }

      const centerX = eyeCenter.x;
      const centerY = noseTip.y - lensHeight * 0.28;

      const smooth = smoothTryOnRef.current;
      if (!smooth.initialized) {
        smooth.cx = centerX; smooth.cy = centerY;
        smooth.lensW = lensWidth; smooth.lensH = lensHeight;
        smooth.bridgeW = bridgeWidth; smooth.angle = angle;
        smooth.initialized = true;
      } else {
        const factor = 0.22;
        smooth.cx += (centerX - smooth.cx) * factor;
        smooth.cy += (centerY - smooth.cy) * factor;
        smooth.lensW += (lensWidth - smooth.lensW) * factor;
        smooth.lensH += (lensHeight - smooth.lensH) * factor;
        smooth.bridgeW += (bridgeWidth - smooth.bridgeW) * factor;
        smooth.angle += (angle - smooth.angle) * 0.16;
      }

      drawStylizedFrameOverlay(ctx, smooth.cx, smooth.cy, smooth.lensW, smooth.lensH, smooth.bridgeW, smooth.angle);
      updateAISuggestions(landmarks, eyeDistance);
    } else {
      drawStylizedFrameOverlay(ctx, canvas.width * 0.5, canvas.height * 0.43, canvas.width * 0.17, canvas.width * 0.12, canvas.width * 0.07, 0);
      setFaceDetected(false);
    }

    trackingFrameIdRef.current = requestAnimationFrame(renderTrackingFrame);
  }

  if (!tryOnMode) return null;

  return (
    <div className="tryon-container absolute inset-0 z-10 bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ display: "none" }}
      />
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover transform"
        style={{ filter: "contrast(1.05) saturate(1.1)" }}
      />
      
      {loadingLandmarker && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white font-medium text-sm tracking-wide uppercase">
              {language === "pt" ? "Carregando Face Tracker..." : "Loading Face Tracker..."}
            </p>
          </div>
        </div>
      )}

      {/* AI Suggestions Overlay */}
      {faceDetected && aiSuggestions.length > 0 && !loadingLandmarker && (
        <div className="absolute top-6 left-6 z-30 max-w-sm">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl">
            <h4 className="text-white/90 text-xs uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              {language === "pt" ? "Análise Facial Ativa" : "Live Face Analysis"}
            </h4>
            <div className="flex flex-col gap-2">
              {aiSuggestions.map((sug, i) => (
                <p key={i} className="text-sm text-white/80 leading-relaxed border-l-2 border-white/20 pl-3">
                  {sug}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {!faceDetected && !loadingLandmarker && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-white text-black px-6 py-3 rounded-full shadow-xl font-medium text-sm flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            {language === "pt" ? "Posicione seu rosto na câmera" : "Position your face in the camera"}
          </div>
        </div>
      )}
    </div>
  );
}
