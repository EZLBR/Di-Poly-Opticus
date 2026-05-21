import React, { createContext, useContext, useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const LS_USERS = "opticus_users";
const LS_SESSION = "opticus_session";
const LS_ORDERS = "opticus_orders";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [session, setSession] = useState(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
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

  // Initialize and load session/data
  useEffect(() => {
    async function initSession() {
      const token = localStorage.getItem("opticus_token");
      if (token) {
        try {
          const res = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setSession(data.user);
            setIsBackendConnected(true);
            // Fetch backend data
            fetchBackendOrders(token);
            fetchBackendDesigns(token);
            fetchBackendUsers(token);
            return;
          }
        } catch (e) {
          console.log("[Opticus] Backend server offline. Using local session fallback.");
        }
      }

      const localSession = localStorage.getItem(LS_SESSION);
      if (localSession) {
        setSession(JSON.parse(localSession));
      }
      const localOrders = localStorage.getItem(LS_ORDERS) || "[]";
      setOrders(JSON.parse(localOrders));
      const localDesigns = localStorage.getItem("opticus_designs") || "[]";
      setDesigns(JSON.parse(localDesigns));
      const localUsersData = localStorage.getItem(LS_USERS) || "[]";
      setUsers(JSON.parse(localUsersData));
    }
    
    // Seed default frontend mock users just in case they are offline
    let localUsers = localStorage.getItem(LS_USERS);
    if (!localUsers) {
      const demoUsers = [
        { id: "client-1", name: "Client Demo", email: "client@opticus.com", password: "123456", role: "client" },
        { id: "factory-demo", name: "Factory Demo", email: "factory@opticus.com", password: "123456", role: "factory", factoryName: "Demo Factory" },
        { id: "staff-1", name: "Opticus Staff", email: "staff@opticus.com", password: "123456", role: "staff" }
      ];
      localStorage.setItem(LS_USERS, JSON.stringify(demoUsers));
    }

    initSession();
  }, []);

  const fetchBackendUsers = async (token) => {
    try {
      const res = await fetch(`${API_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error("Failed to load backend users:", e);
    }
  };

  // Fetch backend orders helper
  const fetchBackendOrders = async (token) => {
    try {
      const res = await fetch(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrders(data.orders);
      }
    } catch (e) {
      console.error("Failed to load backend orders:", e);
    }
  };

  const fetchBackendDesigns = async (token) => {
    try {
      const res = await fetch(`${API_URL}/designs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDesigns(data.designs);
        localStorage.setItem("opticus_designs", JSON.stringify(data.designs));
      }
    } catch (e) {
      console.error("Failed to load backend designs:", e);
    }
  };

  const login = async (email, password) => {
    try {
      // 1. Try to login via backend Express
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("opticus_token", data.token);
        setSession(data.user);
        setIsBackendConnected(true);
        fetchBackendOrders(data.token);
        fetchBackendDesigns(data.token);
        return { ok: true, role: data.user.role };
      } else {
        return { ok: false, message: data.error || "Login failed." };
      }
    } catch (err) {
      console.log("[Opticus] Backend offline. Falling back to local authentication.");
      // 2. Fallback to localStorage simulation
      const localUsers = JSON.parse(localStorage.getItem(LS_USERS)) || [];
      const foundUser = localUsers.find(
        (u) =>
          u.email.toLowerCase() === String(email).trim().toLowerCase() &&
          u.password === password
      );

      if (!foundUser) {
        return { ok: false, message: "Invalid email or password." };
      }

      const sessionData = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        factoryName: foundUser.factoryName || null
      };

      localStorage.setItem(LS_SESSION, JSON.stringify(sessionData));
      setSession(sessionData);
      setIsBackendConnected(false);

      const localOrders = JSON.parse(localStorage.getItem(LS_ORDERS)) || [];
      setOrders(localOrders);
      const localDesigns = JSON.parse(localStorage.getItem("opticus_designs")) || [];
      setDesigns(localDesigns);

      return { ok: true, role: foundUser.role };
    }
  };

  const signup = async ({ name, email, password, role, factoryName }) => {
    try {
      // 1. Try to register via backend Express
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, factoryName })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("opticus_token", data.token);
        setSession(data.user);
        setIsBackendConnected(true);
        fetchBackendOrders(data.token);
        return { ok: true, role: data.user.role };
      } else {
        return { ok: false, message: data.error || "Signup failed." };
      }
    } catch (err) {
      console.log("[Opticus] Backend offline. Falling back to local signup registration.");
      // 2. Fallback to localStorage simulation
      const localUsers = JSON.parse(localStorage.getItem(LS_USERS)) || [];
      const normalizedEmail = String(email).trim().toLowerCase();

      if (localUsers.some((u) => u.email.toLowerCase() === normalizedEmail)) {
        return { ok: false, message: "An account with this email already exists." };
      }

      const newUser = {
        id: `${role}-${Date.now()}`,
        name: String(name).trim(),
        email: normalizedEmail,
        password,
        role,
        factoryName: role === "factory" ? (factoryName || name).trim() : null
      };

      localUsers.push(newUser);
      localStorage.setItem(LS_USERS, JSON.stringify(localUsers));

      const sessionData = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        factoryName: newUser.factoryName
      };
      localStorage.setItem(LS_SESSION, JSON.stringify(sessionData));
      setSession(sessionData);
      setIsBackendConnected(false);

      return { ok: true, role: newUser.role };
    }
  };

  const logout = () => {
    localStorage.removeItem("opticus_token");
    localStorage.removeItem(LS_SESSION);
    setSession(null);
    setOrders([]);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    const token = localStorage.getItem("opticus_token");
    if (isBackendConnected && token) {
      try {
        const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          fetchBackendOrders(token);
          return;
        }
      } catch (e) {
        console.error("Backend status update failed, shifting to local cache:", e);
      }
    }

    // Fallback simulation
    const nextOrders = orders.map((o) => {
      if (o.id === orderId) {
        return { ...o, status: newStatus };
      }
      return o;
    });
    localStorage.setItem(LS_ORDERS, JSON.stringify(nextOrders));
    setOrders(nextOrders);
  };

  const placeOrder = async (order) => {
    const token = localStorage.getItem("opticus_token");
    if (isBackendConnected && token) {
      try {
        const res = await fetch(`${API_URL}/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(order)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          fetchBackendOrders(token);
          return data.order;
        }
      } catch (e) {
        console.error("Backend order dispatch failed, shifting to local cache:", e);
      }
    }

    // Fallback simulation
    const newOrder = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString().split("T")[0],
      ...order
    };
    const nextOrders = [...orders, newOrder];
    localStorage.setItem(LS_ORDERS, JSON.stringify(nextOrders));
    setOrders(nextOrders);
    return newOrder;
  };

  const createPaymentBilling = async (orderId) => {
    const token = localStorage.getItem("opticus_token");
    if (isBackendConnected && token) {
      try {
        const res = await fetch(`${API_URL}/payments/create-billing`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ orderId })
        });
        const data = await res.json();
        return data;
      } catch (e) {
        console.error("AbacatePay billing setup failed:", e);
        return { success: false, error: "Backend payment service is currently offline." };
      }
    }
    return { success: false, error: "Backend offline. Simulated checkout is unavailable." };
  };

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
    const nextOrders = [...orders];

    const localCreatedOrders = [];

    for (const item of cartItems) {
      const simulatedOrder = {
        id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
        customerName: session?.name || "Client Demo",
        customerEmail: session?.email || "client@opticus.com",
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

    localStorage.setItem(LS_ORDERS, JSON.stringify(nextOrders));
    setOrders(nextOrders);
    clearCart();

    return {
      success: true,
      isSimulated: true,
      isOffline: true,
      checkoutUrl: `/?payment=success`
    };
  };

  const saveBackendDesign = async (designData) => {
    const token = localStorage.getItem("opticus_token");
    if (isBackendConnected && token) {
      try {
        const res = await fetch(`${API_URL}/designs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(designData)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          fetchBackendDesigns(token);
          return true;
        }
      } catch (e) {
        console.error("Backend save design failed:", e);
      }
    }
    return false;
  };

  const deleteBackendDesign = async (designId) => {
    const token = localStorage.getItem("opticus_token");
    if (isBackendConnected && token) {
      try {
        const res = await fetch(`${API_URL}/designs/${designId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          fetchBackendDesigns(token);
          return true;
        }
      } catch (e) {
        console.error("Backend delete design failed:", e);
      }
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        orders,
        designs,
        users,
        session,
        isBackendConnected,
        login,
        signup,
        logout,
        updateOrderStatus,
        placeOrder,
        createPaymentBilling,
        saveBackendDesign,
        deleteBackendDesign,
        cart,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        checkoutCart
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
