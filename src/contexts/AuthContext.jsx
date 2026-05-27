import React, { createContext, useContext, useState, useEffect } from "react";

let API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
if (API_URL.endsWith('/')) API_URL = API_URL.slice(0, -1);
if (!API_URL.endsWith('/api')) API_URL = `${API_URL}/api`;
const LS_USERS = "opticus_users";
const LS_SESSION = "opticus_session";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [designs, setDesigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [session, setSession] = useState(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

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
            fetchBackendDesigns(token);
            fetchBackendUsers(token);
            return;
          }
        } catch (e) {
          console.error(e);
          console.log("[Opticus] Backend server offline. Using local session fallback.");
        }
      }

      const localSession = localStorage.getItem(LS_SESSION);
      if (localSession) {
        setSession(JSON.parse(localSession));
      }
      const localDesigns = localStorage.getItem("opticus_designs") || "[]";
      setDesigns(JSON.parse(localDesigns));
      const localUsersData = localStorage.getItem(LS_USERS) || "[]";
      setUsers(JSON.parse(localUsersData));
    }
    
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

  const login = async (email, password) => {
    try {
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
        fetchBackendDesigns(data.token);
        return { ok: true, role: data.user.role };
      } else {
        return { ok: false, message: data.error || "Login failed." };
      }
    } catch (err) {
      console.error(err);
      console.log("[Opticus] Backend offline. Falling back to local authentication.");
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

      const localDesigns = JSON.parse(localStorage.getItem("opticus_designs")) || [];
      setDesigns(localDesigns);

      return { ok: true, role: foundUser.role };
    }
  };

  const signup = async ({ name, email, password, role, factoryName }) => {
    try {
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
        return { ok: true, role: data.user.role };
      } else {
        return { ok: false, message: data.error || "Signup failed." };
      }
    } catch (err) {
      console.error(err);
      console.log("[Opticus] Backend offline. Falling back to local signup registration.");
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
  };

  const saveDesign = async (designData) => {
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
          return data.design;
        }
      } catch (e) {
        console.error("Backend design save failed, shifting to local cache:", e);
      }
    }

    const newDesign = {
      id: `des-${Date.now()}`,
      ...designData,
      createdAt: new Date().toISOString()
    };
    const updatedDesigns = [...designs, newDesign];
    localStorage.setItem("opticus_designs", JSON.stringify(updatedDesigns));
    setDesigns(updatedDesigns);
    return newDesign;
  };

  const deleteBackendDesign = async (designId) => {
    const token = localStorage.getItem("opticus_token");
    if (isBackendConnected && token) {
      try {
        await fetch(`${API_URL}/designs/${designId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
        fetchBackendDesigns(token);
      } catch (e) {
        console.error("Failed to delete backend design:", e);
      }
    }
  };

  const updateUser = async (userId, dataToUpdate) => {
    const token = localStorage.getItem("opticus_token");
    if (isBackendConnected && token) {
      try {
        const res = await fetch(`${API_URL}/auth/users/${userId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(dataToUpdate)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          fetchBackendUsers(token);
          return { ok: true };
        }
        return { ok: false, message: data.error };
      } catch (e) {
        console.error("User update failed:", e);
      }
    }

    const nextUsers = users.map(u => u.id === userId ? { ...u, ...dataToUpdate } : u);
    setUsers(nextUsers);
    localStorage.setItem(LS_USERS, JSON.stringify(nextUsers));
    return { ok: true };
  };

  const deleteUser = async (userId) => {
    const token = localStorage.getItem("opticus_token");
    if (isBackendConnected && token) {
      try {
        const res = await fetch(`${API_URL}/auth/users/${userId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          fetchBackendUsers(token);
          return { ok: true };
        }
        return { ok: false, message: data.error };
      } catch (e) {
        console.error("User deletion failed:", e);
      }
    }

    const nextUsers = users.filter(u => u.id !== userId);
    setUsers(nextUsers);
    localStorage.setItem(LS_USERS, JSON.stringify(nextUsers));
    return { ok: true };
  };

  return (
    <AuthContext.Provider value={{
      session,
      users,
      designs,
      isBackendConnected,
      login,
      signup,
      logout,
      saveDesign,
      deleteBackendDesign,
      updateUser,
      deleteUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
