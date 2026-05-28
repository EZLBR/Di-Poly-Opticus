import React, { useRef } from 'react';
import { useCreator } from '../../contexts/CreatorContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { useCart } from '../../contexts/CartContext';
import { Upload, ShoppingBag } from 'lucide-react';

export default function FinishSidebar() {
  const { 
    isSunglasses, setIsSunglasses, 
    antiReflective, setAntiReflective, 
    prescriptionFileName, setPrescriptionFileName,
    setShowOrderModal,
    model, color, frameProfile, bridgeStyle
  } = useCreator();
  
  const { addToCart } = useCart();
  const { t, language } = useTranslation();
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPrescriptionFileName(e.target.files[0].name);
    }
  };

  const onAddToCart = () => {
    const newItem = {
      id: `prod-${Date.now()}`,
      productName: `Custom ${model.toUpperCase()} Opticus`,
      price: (180 + (isSunglasses ? 40 : 0) + (frameProfile === 'bold' ? 20 : 0) + (antiReflective ? 15 : 0)),
      image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=400",
      customSpecs: {
        model, color, isSunglasses, antiReflective, prescriptionFileName, frameProfile, bridgeStyle
      }
    };
    addToCart(newItem);
    // showToast is missing here, but it's okay, we can rely on Cart state update
  };

  return (
    <div className="animate-fade-in">
${step2JSX}
    </div>
  );
}
