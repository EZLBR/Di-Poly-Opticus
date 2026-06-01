import React, { useState } from "react";
import { useCreatorStudio } from "../../contexts/CreatorStudioContext";
import { useTranslation } from "../../contexts/LanguageContext";
import { Check, Sliders, Box, ShieldCheck, Sun, Eye, Droplet, Sparkles, Layers } from "lucide-react";

const CURATED_COLORS = [
  { name: "Matte Charcoal", hex: "#111827" },
  { name: "Chambery Crystal", hex: "#dbeafe" },
  { name: "Tortoise Acetate", hex: "#78350f" },
  { name: "Champagne Gold", hex: "#d97706" },
  { name: "Emerald Glaze", hex: "#065f46" },
  { name: "Crimson Lacquer", hex: "#991b1b" },
  { name: "Slate Titanium", hex: "#64748b" },
  { name: "Rose Gold", hex: "#b76e79" },
];

export default function CustomizationPanel() {
  const {
    model, setModel,
    frameProfile, setFrameProfile,
    frameMaterial, setFrameMaterial,
    color, setColor,
    isSunglasses, setIsSunglasses,
    lensMaterial, setLensMaterial,
    lensTreatments, toggleLensTreatment,
    nosePadMaterial, setNosePadMaterial,
    templeTipMaterial, setTempleTipMaterial,
    hingeMaterial, setHingeMaterial,
    templeOpen, setTempleOpen
  } = useCreatorStudio();

  const { language, t } = useTranslation();
  const [activeTab, setActiveTab] = useState("frame"); // frame, lenses, details

  const renderTabButton = (id, label, icon) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-3 px-2 text-xs font-semibold uppercase tracking-wider flex flex-col items-center gap-1 border-b-2 transition-all ${
        activeTab === id 
          ? "border-black text-black" 
          : "border-transparent text-gray-400 hover:text-gray-600"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="customization-panel bg-white/95 backdrop-blur-md shadow-2xl rounded-l-2xl h-full flex flex-col overflow-hidden w-96 border-l border-gray-100">
      
      {/* Tabs Header */}
      <div className="flex border-b border-gray-100 bg-gray-50/50 pt-2 px-2">
        {renderTabButton("frame", language === "pt" ? "Armação" : "Frame", <Box size={16} />)}
        {renderTabButton("lenses", language === "pt" ? "Lentes" : "Lenses", <Eye size={16} />)}
        {renderTabButton("details", language === "pt" ? "Detalhes" : "Details", <Sliders size={16} />)}
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
        
        {/* --- TAB: FRAME --- */}
        {activeTab === "frame" && (
          <>
            <div className="control-group">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">
                {language === "pt" ? "Silhueta" : "Silhouette"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "aviator", label: "Aviator" },
                  { id: "wayfarer", label: "Wayfarer" },
                  { id: "cateye", label: "Cat-Eye" }
                ].map((s) => (
                  <button
                    key={s.id}
                    className={`py-3 px-2 rounded-lg text-sm border transition-all ${
                      model === s.id ? "border-black bg-black text-white font-medium" : "border-gray-200 text-gray-600 hover:border-gray-400"
                    }`}
                    onClick={() => setModel(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">
                {language === "pt" ? "Material da Armação" : "Frame Material"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "acetate", label: "Acetate", group: "Polymer" },
                  { id: "tr90", label: "TR90", group: "Polymer" },
                  { id: "stainless_steel", label: "Steel", group: "Metal" },
                  { id: "titanium", label: "Titanium", group: "Metal" },
                  { id: "gold", label: "Gold", group: "Metal" },
                  { id: "wood", label: "Wood", group: "Natural" },
                  { id: "carbon_fiber", label: "Carbon", group: "Composite" }
                ].map((m) => (
                  <button
                    key={m.id}
                    className={`py-2 px-3 rounded-lg text-xs text-left border transition-all flex flex-col ${
                      frameMaterial === m.id ? "border-black bg-gray-50 shadow-sm" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                    onClick={() => setFrameMaterial(m.id)}
                  >
                    <span className="font-semibold text-gray-900">{m.label}</span>
                    <span className="text-[10px] text-gray-400">{m.group}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                {language === "pt" ? "Cores Curadas" : "Curated Colors"}
                <span className="text-gray-400 font-normal">{color}</span>
              </label>
              <div className="grid grid-cols-4 gap-3">
                {CURATED_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    className={`w-full aspect-square rounded-full flex items-center justify-center transition-all ${
                      color === c.hex ? "ring-2 ring-offset-2 ring-black scale-110" : "hover:scale-105 shadow-sm border border-gray-100"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => setColor(c.hex)}
                    title={c.name}
                  >
                    {color === c.hex && <Check size={14} color={c.hex === "#111827" ? "#fff" : "#000"} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">
                {language === "pt" ? "Perfil da Armação" : "Frame Profile"}
              </label>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                {[
                  { id: "thin", label: "Thin" },
                  { id: "medium", label: "Medium" },
                  { id: "bold", label: "Bold" }
                ].map((p) => (
                  <button
                    key={p.id}
                    className={`flex-1 py-2 text-sm rounded-md transition-all ${
                      frameProfile === p.id ? "bg-white shadow-sm font-semibold" : "text-gray-500 hover:text-gray-800"
                    }`}
                    onClick={() => setFrameProfile(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* --- TAB: LENSES --- */}
        {activeTab === "lenses" && (
          <>
            <div className="control-group bg-gray-50 p-4 rounded-xl border border-gray-100">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isSunglasses ? "bg-black text-white" : "bg-gray-200 text-gray-500"}`}>
                    <Sun size={18} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{language === "pt" ? "Lentes Solares" : "Sunglasses Mode"}</h4>
                    <p className="text-xs text-gray-500">{language === "pt" ? "Adiciona pigmentação escura" : "Adds dark tinting"}</p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isSunglasses ? "bg-black" : "bg-gray-300"}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isSunglasses ? "translate-x-6" : ""}`} />
                </div>
              </label>
              <button 
                onClick={() => setIsSunglasses(!isSunglasses)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                style={{position: 'absolute', height: 0, width: 0}}
              />
            </div>

            <div className="control-group">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">
                {language === "pt" ? "Material da Lente" : "Lens Material"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`py-3 px-2 rounded-lg text-sm border transition-all ${lensMaterial === "cr39" ? "border-black bg-black text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}
                  onClick={() => setLensMaterial("cr39")}
                >
                  CR-39 (Standard)
                </button>
                <button
                  className={`py-3 px-2 rounded-lg text-sm border transition-all ${lensMaterial === "polycarbonate" ? "border-black bg-black text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}
                  onClick={() => setLensMaterial("polycarbonate")}
                >
                  Polycarbonate
                </button>
              </div>
            </div>

            <div className="control-group">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">
                {language === "pt" ? "Tratamentos (Coating)" : "Lens Treatments"}
              </label>
              <div className="space-y-2">
                {[
                  { id: "anti_reflective", icon: <Layers size={16}/>, label: "Anti-Reflective" },
                  { id: "uv_protection", icon: <Sun size={16}/>, label: "UV Protection" },
                  { id: "blue_light", icon: <Eye size={16}/>, label: "Blue Light Filter" },
                  { id: "mirrored", icon: <Sparkles size={16}/>, label: "Mirrored Finish" },
                  { id: "polarized", icon: <Droplet size={16}/>, label: "Polarized" },
                  { id: "photochromic", icon: <ShieldCheck size={16}/>, label: "Photochromic" }
                ].map((t) => {
                  const isActive = lensTreatments.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleLensTreatment(t.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        isActive ? "border-black bg-gray-50" : "border-gray-100 hover:border-gray-300"
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${isActive ? "bg-black text-white" : "bg-gray-100 text-gray-500"}`}>
                        {t.icon}
                      </div>
                      <span className={`text-sm font-medium ${isActive ? "text-black" : "text-gray-600"}`}>
                        {t.label}
                      </span>
                      {isActive && <Check size={16} className="ml-auto text-black" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* --- TAB: DETAILS --- */}
        {activeTab === "details" && (
          <>
            <div className="control-group">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex justify-between">
                {language === "pt" ? "Abertura da Haste" : "Temple Fold"}
                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{(templeOpen * 100).toFixed(0)}</span>
              </label>
              <input 
                type="range" 
                min="-0.05" 
                max="0.65" 
                step="0.01" 
                value={templeOpen} 
                onChange={(e) => setTempleOpen(parseFloat(e.target.value))}
                className="w-full accent-black"
              />
            </div>

            <div className="control-group">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">
                {language === "pt" ? "Material das Plaquetas" : "Nose Pad Material"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["silicone", "titanium", "acetate"].map(m => (
                  <button
                    key={m}
                    className={`py-2 px-1 text-xs font-medium border rounded-md capitalize transition-all ${nosePadMaterial === m ? "border-black bg-black text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}
                    onClick={() => setNosePadMaterial(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">
                {language === "pt" ? "Material da Ponteira" : "Temple Tip Material"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["acetate", "silicone", "rubber"].map(m => (
                  <button
                    key={m}
                    className={`py-2 px-1 text-xs font-medium border rounded-md capitalize transition-all ${templeTipMaterial === m ? "border-black bg-black text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}
                    onClick={() => setTempleTipMaterial(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">
                {language === "pt" ? "Material da Dobradiça" : "Hinge Material"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["stainless_steel", "titanium", "gold"].map(m => (
                  <button
                    key={m}
                    className={`py-2 px-1 text-xs font-medium border rounded-md capitalize transition-all ${hingeMaterial === m ? "border-black bg-black text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}
                    onClick={() => setHingeMaterial(m)}
                  >
                    {m.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
