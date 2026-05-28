import React from 'react';
import { useCreator } from '../../contexts/CreatorContext';
import { useTranslation } from '../../contexts/LanguageContext';

export default function ConfigSidebar() {
  const { 
    model, setModel, 
    color, setColor, 
    isSunglasses, setIsSunglasses, 
    antiReflective, setAntiReflective, 
    frameProfile, setFrameProfile, 
    templeStyle, setTempleStyle, 
    bridgeStyle, setBridgeStyle, 
    topBar, setTopBar 
  } = useCreator();
  const { t, language } = useTranslation();

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "24px" }}>
        <span className="panel-kicker">{t("silhouette-kicker")}</span>
        <h2>{t("silhouette-title")}</h2>
        <p style={{ fontSize: "13px", color: "var(--color-hint)", marginTop: "4px" }}>
          {language === "pt"
            ? "Escolha a silhueta principal. As dimensões são calibradas automaticamente para manter as proporções estéticas ideais."
            : "Select the base silhouette style. Physical dimensions are pre-configured automatically to preserve ideal aesthetic proportions."}
        </p>
      </div>

      {/* Glassmorphic buttons for silhouettes */}
      <div 
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "12px",
          marginBottom: "30px"
        }}
      >
        {[
          { id: "aviator", title: "Aviator", desc: "The legendary pilot silhouette", svg: (
            <svg viewBox="0 0 100 100" style={{ width: "38px", height: "38px", fill: "none", stroke: "currentColor", strokeWidth: "4", strokeLinecap: "round" }}>
              <path d="M 50 15 C 80 15, 90 40, 90 65 C 90 85, 75 90, 50 90 C 25 90, 10 85, 10 65 C 10 40, 20 15, 50 15 Z" />
            </svg>
          )},
          { id: "wayfarer", title: "Wayfarer", desc: "Bold cinematic structure", svg: (
            <svg viewBox="0 0 100 100" style={{ width: "38px", height: "38px", fill: "none", stroke: "currentColor", strokeWidth: "4", strokeLinejoin: "round" }}>
              <path d="M 15 25 L 85 25 C 90 25, 95 30, 95 40 L 80 85 C 75 90, 60 90, 50 90 C 40 90, 25 90, 20 85 L 5 40 C 5 30, 10 25, 15 25 Z" />
            </svg>
          )},
          { id: "cateye", title: "Cat-Eye", desc: "Elegant feminine swoop", svg: (
            <svg viewBox="0 0 100 100" style={{ width: "38px", height: "38px", fill: "none", stroke: "currentColor", strokeWidth: "4", strokeLinejoin: "round" }}>
              <path d="M 25 35 C 40 25, 60 25, 75 35 C 85 40, 95 20, 95 20 C 95 20, 95 60, 85 80 C 75 90, 50 95, 50 95 C 50 95, 25 90, 15 80 C 5 60, 5 20, 5 20 C 5 20, 15 40, 25 35 Z" />
            </svg>
          )}
        ].map((item) => {
          const isActive = model === item.id;
          return (
            <div 
              key={item.id}
              onClick={() => setModel(item.id)}
              style={{
                background: isActive ? "var(--input-bg)" : "transparent",
                border: isActive ? "2px solid var(--primary-accent)" : "1px solid var(--input-border)",
                borderRadius: "10px",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                cursor: "pointer",
                transition: "all 0.2s",
                color: "var(--text-dark)",
                boxShadow: isActive ? "var(--shadow-hover)" : "none"
              }}
              className="silhouette-card-hover"
            >
              <div style={{ color: isActive ? "var(--primary-accent)" : "var(--color-hint)" }}>
                {item.svg}
              </div>
              <div>
                <strong style={{ display: "block", fontSize: "14px", letterSpacing: "1px" }}>{item.title}</strong>
                <span style={{ fontSize: "12px", color: "var(--color-hint)", marginTop: "2px", display: "block" }}>{item.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Aesthetic Frame profile & options */}
      <div style={{ borderTop: "1px solid var(--input-border)", paddingTop: "24px" }}>
        <h3 style={{ fontSize: "14px", letterSpacing: "1px", marginBottom: "16px", textTransform: "uppercase" }}>
          {language === "pt" ? "ESTILO E PERFIL" : "FRAME PROFILE & STRUCTURE"}
        </h3>

        {/* Frame Profile */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--color-hint)", marginBottom: "8px", textTransform: "uppercase" }}>
            Frame Profile
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
            {[
              { id: "thin", label: "Thin" },
              { id: "medium", label: "Medium" },
              { id: "bold", label: "Bold" }
            ].map((opt) => (
              <button
                key={opt.id}
                className={`btn ${frameProfile === opt.id ? "primary" : ""}`}
                style={{ height: "34px", padding: 0, fontSize: "12px", textTransform: "uppercase" }}
                onClick={() => setFrameProfile(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bridge Style */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--color-hint)", marginBottom: "8px", textTransform: "uppercase" }}>
            Bridge Style
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
            {[
              { id: "soft", label: "Soft Arch" },
              { id: "keyhole", label: "Keyhole" },
              { id: "flat", label: "Flat" }
            ].map((opt) => (
              <button
                key={opt.id}
                className={`btn ${bridgeStyle === opt.id ? "primary" : ""}`}
                style={{ height: "34px", padding: 0, fontSize: "12px", textTransform: "uppercase" }}
                onClick={() => setBridgeStyle(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Top Bar Accent (Double bridge) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--input-bg)", padding: "12px 16px", borderRadius: "8px", border: "1px solid var(--input-border)", boxShadow: "var(--shadow)" }}>
          <div>
            <strong style={{ display: "block", fontSize: "13px" }}>Double Bridge (Top Bar)</strong>
            <span style={{ fontSize: "11px", color: "var(--color-hint)" }}>Adds secondary upper support bar</span>
          </div>
          <label className="switch" style={{ position: "relative", display: "inline-block", width: "40px", height: "20px" }}>
            <input 
              type="checkbox" 
              checked={topBar} 
              onChange={(e) => setTopBar(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span 
              style={{
                position: "absolute",
                cursor: "pointer",
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: topBar ? "var(--primary-accent)" : "var(--input-border)",
                transition: "0.2s",
                borderRadius: "20px"
              }}
            >
              <span 
                style={{
                  position: "absolute",
                  content: '""',
                  height: "14px", width: "14px",
                  left: topBar ? "22px" : "3px",
                  bottom: "3px",
                  borderRadius: "50%",
                  transition: "0.2s",
                  background: "#fff"
                }}
              />
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
