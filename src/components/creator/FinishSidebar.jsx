import React from 'react';
import { useCreator } from '../../contexts/CreatorContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { Check, Upload, Trash2 } from 'lucide-react';

const CURATED_COLORS = [
  { name: "Matte Charcoal", hex: "#111827" },
  { name: "Chambery Crystal", hex: "#dbeafe" },
  { name: "Tortoise Acetate", hex: "#78350f" },
  { name: "Champagne Gold", hex: "#d97706" },
  { name: "Emerald Glaze", hex: "#065f46" },
  { name: "Crimson Lacquer", hex: "#991b1b" },
];

export default function FinishSidebar() {
  const { 
    color, setColor, 
    isSunglasses, setIsSunglasses, 
    antiReflective, setAntiReflective, 
    prescriptionFileName, setPrescriptionFileName, 
    templeStyle, setTempleStyle, 
    templeOpen, setTempleOpen,
    showToast
  } = useCreator();
  const { t, language } = useTranslation();

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "24px" }}>
        <span className="panel-kicker">{t("finish-kicker")}</span>
        <h2>{t("finish-title")}</h2>
        <p style={{ fontSize: "13px", color: "var(--color-hint)", marginTop: "4px" }}>
          {t("finish-desc")}
        </p>
      </div>

      {/* Frame Colors: curated bubbles + Hex selection */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--color-hint)", marginBottom: "12px", textTransform: "uppercase" }}>
          {language === "pt" ? "Armação - Escolha de Cor" : "Frame Acetate/Metal Color"}
        </label>
        
        {/* Curated color palette dots */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
          {CURATED_COLORS.map((item) => {
            const isSelected = color.toLowerCase() === item.hex.toLowerCase();
            return (
              <button
                key={item.hex}
                onClick={() => setColor(item.hex)}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: item.hex,
                  border: isSelected ? "2px solid var(--text-dark)" : "1px solid var(--input-border)",
                  boxShadow: isSelected ? "0 0 10px var(--primary-accent)" : "none",
                  cursor: "pointer",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "transform 0.2s"
                }}
                title={item.name}
                className="color-bubble-hover"
              >
                {isSelected && (
                  <Check size={14} color={item.hex === "#dbeafe" ? "#111" : "#fff"} />
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Hex Color Picker */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)}
            style={{
              border: "none",
              background: "none",
              width: "38px",
              height: "38px",
              cursor: "pointer",
              padding: 0
            }}
          />
          <input 
            type="text" 
            value={color.toUpperCase()} 
            onChange={(e) => {
              const val = e.target.value;
              if (val.startsWith("#") && val.length <= 7) setColor(val);
            }}
            className="premium-input"
            style={{
              padding: "8px 12px",
              fontSize: "13px",
              width: "90px",
              textAlign: "center"
            }}
          />
          <span style={{ fontSize: "11px", color: "var(--color-hint)" }}>Custom hex shade</span>
        </div>
      </div>

      {/* Temple Leg Styles */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--color-hint)", marginBottom: "8px", textTransform: "uppercase" }}>
          Temple Style
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
          {[
            { id: "classic", label: "Classic Curve" },
            { id: "straight", label: "Straight Line" },
            { id: "sport", label: "Sport Grip" }
          ].map((opt) => (
            <button
              key={opt.id}
              className={`btn ${templeStyle === opt.id ? "primary" : ""}`}
              style={{ height: "34px", padding: 0, fontSize: "12px", textTransform: "uppercase" }}
              onClick={() => setTempleStyle(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lenses specs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
        {/* Sunglasses Lens Toggle */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--input-bg)", padding: "12px 16px", borderRadius: "8px", border: "1px solid var(--input-border)", boxShadow: "var(--shadow)" }}>
          <div>
            <strong style={{ display: "block", fontSize: "13px" }}>Sunglasses Tint Lenses</strong>
            <span style={{ fontSize: "11px", color: "var(--color-hint)" }}>Polychromatic UV400 dark filter</span>
          </div>
          <label className="switch" style={{ position: "relative", display: "inline-block", width: "40px", height: "20px" }}>
            <input 
              type="checkbox" 
              checked={isSunglasses} 
              onChange={(e) => setIsSunglasses(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span 
              style={{
                position: "absolute",
                cursor: "pointer",
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: isSunglasses ? "var(--primary-accent)" : "var(--input-border)",
                transition: "0.2s",
                borderRadius: "20px"
              }}
            >
              <span 
                style={{
                  position: "absolute",
                  content: '""',
                  height: "14px", width: "14px",
                  left: isSunglasses ? "22px" : "3px",
                  bottom: "3px",
                  borderRadius: "50%",
                  transition: "0.2s",
                  background: "#fff"
                }}
              />
            </span>
          </label>
        </div>

        {/* Anti reflective toggle */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--input-bg)", padding: "12px 16px", borderRadius: "8px", border: "1px solid var(--input-border)", boxShadow: "var(--shadow)" }}>
          <div>
            <strong style={{ display: "block", fontSize: "13px" }}>Anti-Reflective Coating</strong>
            <span style={{ fontSize: "11px", color: "var(--color-hint)" }}>Removes glare and camera blue flare</span>
          </div>
          <label className="switch" style={{ position: "relative", display: "inline-block", width: "40px", height: "20px" }}>
            <input 
              type="checkbox" 
              checked={antiReflective} 
              onChange={(e) => setAntiReflective(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span 
              style={{
                position: "absolute",
                cursor: "pointer",
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: antiReflective ? "var(--primary-accent)" : "var(--input-border)",
                transition: "0.2s",
                borderRadius: "20px"
              }}
            >
              <span 
                style={{
                  position: "absolute",
                  content: '""',
                  height: "14px", width: "14px",
                  left: antiReflective ? "22px" : "3px",
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

      {/* Prescription file Upload */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--color-hint)", marginBottom: "8px", textTransform: "uppercase" }}>
          Upload Prescription File (Optional)
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label 
            className="btn"
            style={{
              height: "36px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer"
            }}
          >
            <Upload size={14} /> 
            <span>{prescriptionFileName ? "Change File" : "Choose File"}</span>
            <input 
              type="file" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPrescriptionFileName(file.name);
                  showToast(language === "pt" ? "Receita anexada!" : "Prescription file loaded.");
                }
              }}
              accept=".pdf,.png,.jpg,.jpeg"
              style={{ display: "none" }}
            />
          </label>
          
          {prescriptionFileName ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                {prescriptionFileName}
              </span>
              <button 
                type="button" 
                style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}
                onClick={() => setPrescriptionFileName("")}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : (
            <span style={{ fontSize: "11px", color: "var(--color-hint)" }}>No file attached</span>
          )}
        </div>
      </div>

      {/* Temple leg folding (Viewer leg control) */}
      <div style={{ borderTop: "1px solid var(--input-border)", paddingTop: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--color-hint)", textTransform: "uppercase" }}>
            Fold Hinge Temples
          </label>
          <span style={{ fontSize: "12px", fontWeight: "600" }}>{Math.round(templeOpen * 100)}%</span>
        </div>
        <input 
          type="range"
          min="-0.05"
          max="0.65"
          step="0.01"
          value={templeOpen}
          onChange={(e) => setTempleOpen(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: "var(--primary-accent)" }}
        />
      </div>
    </div>
  );
}
