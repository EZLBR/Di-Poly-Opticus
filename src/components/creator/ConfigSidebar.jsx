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
${step1JSX}
    </div>
  );
}
