import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

const CartContext = createContext();

export function CartProvider({ children }) {
  const { isBackendConnected } = useAuth();
  let API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  if (API_URL.endsWith('/')) API_URL = API_URL.slice(0, -1);
  if (!API_URL.endsWith('/api')) API_URL = `${API_URL}/api`;

  const [cart, setCart] = useState(() => {
    try {
      const localCart = localStorage.getItem("opticus_cart");
      return localCart ? JSON.parse(localCart) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("opticus_cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item) => {
    setCart((prevCart) => {
      const existing = prevCart.find((i) => i.id === item.id);
      if (existing) {
        return prevCart.map((i) => i.id === item.id ? { ...i, quantity: (i.quantity || 1) + 1 } : i);
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart((prevCart) => prevCart.filter((i) => i.id !== itemId));
  };

  const updateCartQty = (itemId, qty) => {
    if (qty < 1) return;
    setCart((prevCart) => prevCart.map((i) => i.id === itemId ? { ...i, quantity: qty } : i));
  };

  const clearCart = () => {
    setCart([]);
  };

  const checkoutCart = async (cartItems) => {
    const token = localStorage.getItem("opticus_token");
    if (isBackendConnected && token) {
      try {
        const res = await fetch(`${API_URL}/orders/checkout-cart`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ cartItems })
        });
        const data = await res.json();
        return data;
      } catch (e) {
        console.error("Consolidated backend checkout failed, shifting to local cache simulation:", e);
      }
    }

    // Fallback simulation
    const simulatedBillingId = `bill-sim-${Math.floor(100000 + Math.random() * 900000)}`;
    const localOrdersRaw = localStorage.getItem("opticus_orders");
    const nextOrders = localOrdersRaw ? JSON.parse(localOrdersRaw) : [];

    const localCreatedOrders = [];

    // Pegamos a sessão diretamente do localStorage para o fallback
    const session = JSON.parse(localStorage.getItem("opticus_session")) || {};

    for (const item of cartItems) {
      const simulatedOrder = {
        id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
        customerName: session.name || "Client Demo",
        customerEmail: session.email || "client@opticus.com",
        productName: item.productName,
        factoryId: item.factoryId || "factory-demo",
        factoryName: item.factoryName || "Demo Factory",
        status: "Queued",
        total: Number(item.total) * (item.quantity || 1),
        customSpecs: { ...item.customSpecs, quantity: item.quantity || 1 },
        abacateBillingId: simulatedBillingId,
        createdAt: new Date().toISOString().split("T")[0]
      };
      nextOrders.unshift(simulatedOrder);
      localCreatedOrders.push(simulatedOrder);
    }

    localStorage.setItem("opticus_orders", JSON.stringify(nextOrders));

    return { success: true, isOffline: true, createdOrders: localCreatedOrders };
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateCartQty, clearCart, checkoutCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
