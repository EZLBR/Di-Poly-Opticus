import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../contexts/LanguageContext";

export default function AuthPage({ setView }) {
  const { login, signup } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("login");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupRole, setSignupRole] = useState("client");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupFactoryName, setSignupFactoryName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState("");

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const result = await login(loginEmail, loginPassword);
      setLoginLoading(false);

      if (result.ok) {
        const redirect = localStorage.getItem("opticus_redirect_after_login");
        if (redirect) {
          localStorage.removeItem("opticus_redirect_after_login");
          setView(redirect);
          return;
        }

        if (result.role === "client") setView("marketplace");
        else if (result.role === "factory") setView("factory-dashboard");
        else if (result.role === "staff") setView("staff-dashboard");
      } else {
        setLoginError(result.message || "Invalid credentials.");
      }
    } catch (err) {
      setLoginLoading(false);
      setLoginError("An unexpected error occurred.");
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError("");
    setSignupSuccess("");

    if (!signupName.trim() || !signupEmail.trim() || signupPassword.length < 6) {
      setSignupError("Fill all required fields. Password must be at least 6 characters.");
      return;
    }

    if (signupPassword !== signupConfirm) {
      setSignupError("Passwords do not match.");
      return;
    }

    if (signupRole === "factory" && !signupFactoryName.trim()) {
      setSignupError("Factory name is required for factory accounts.");
      return;
    }

    try {
      const result = await signup({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        role: signupRole,
        factoryName: signupRole === "factory" ? signupFactoryName : ""
      });

      if (result.ok) {
        setSignupSuccess("Account created. Opening your workspace...");
        setTimeout(() => {
          const redirect = localStorage.getItem("opticus_redirect_after_login");
          if (redirect) {
            localStorage.removeItem("opticus_redirect_after_login");
            setView(redirect);
            return;
          }

          if (result.role === "client") setView("marketplace");
          else if (result.role === "factory") setView("factory-dashboard");
          else if (result.role === "staff") setView("staff-dashboard");
        }, 500);
      } else {
        setSignupError(result.message || "Signup failed.");
      }
    } catch (err) {
      setSignupError("An unexpected error occurred during signup.");
    }
  };

  return (
    <div className="auth-container" style={{ maxWidth: "480px", margin: "80px auto", padding: "20px" }}>
      <section className="auth-card premium-glass-card" style={{ padding: "30px", borderRadius: "12px" }}>
        <div className="auth-header" style={{ marginBottom: "24px", textAlign: "center" }}>
          <span className="eyebrow" style={{ fontSize: "12px", letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--primary-accent)" }}>
            {activeTab === "login" ? "Welcome back" : "Create account"}
          </span>
          <h2 style={{ fontSize: "24px", margin: "8px 0" }}>
            {activeTab === "login" ? "Access your Opticus account" : "Join Opticus"}
          </h2>
          <p style={{ fontSize: "14px", color: "var(--color-hint)", lineHeight: "1.4" }}>
            {activeTab === "login"
              ? "Use your email and password to log in. We'll open the right workspace automatically."
              : "Create a client or factory account and continue into your workspace."}
          </p>
        </div>

        <div className="auth-tabs" style={{ display: "flex", borderBottom: "1px solid var(--border-light)", marginBottom: "20px" }}>
          <button
            type="button"
            className={`auth-tab ${activeTab === "login" ? "is-active" : ""}`}
            style={{ flex: 1, background: "none", border: "none", color: activeTab === "login" ? "var(--text-dark)" : "var(--color-hint)", borderBottom: activeTab === "login" ? "2px solid var(--primary-accent)" : "none", padding: "10px", cursor: "pointer", fontWeight: "600" }}
            onClick={() => setActiveTab("login")}
          >
            LOGIN
          </button>
          <button
            type="button"
            className={`auth-tab ${activeTab === "signup" ? "is-active" : ""}`}
            style={{ flex: 1, background: "none", border: "none", color: activeTab === "signup" ? "var(--text-dark)" : "var(--color-hint)", borderBottom: activeTab === "signup" ? "2px solid var(--primary-accent)" : "none", padding: "10px", cursor: "pointer", fontWeight: "600" }}
            onClick={() => setActiveTab("signup")}
          >
            SIGNUP
          </button>
        </div>

        {activeTab === "login" ? (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label htmlFor="loginEmail" style={{ display: "block", marginBottom: "6px", fontSize: "12px", textTransform: "uppercase", fontWeight: "600" }}>Email Address</label>
              <input
                type="email"
                id="loginEmail"
                className="control-select premium-input"
                style={{ width: "100%", padding: "10px" }}
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label htmlFor="loginPassword" style={{ display: "block", marginBottom: "6px", fontSize: "12px", textTransform: "uppercase", fontWeight: "600" }}>Password</label>
              <input
                type="password"
                id="loginPassword"
                className="control-select premium-input"
                style={{ width: "100%", padding: "10px" }}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            {loginError && <p style={{ color: "#ef4444", fontSize: "14px", margin: "0 0 16px 0" }}>{loginError}</p>}

            <button
              type="submit"
              className="save-btn"
              style={{ width: "100%", padding: "12px", fontSize: "14px", fontWeight: "600" }}
              disabled={loginLoading}
            >
              {loginLoading ? "ENTERING..." : "ENTER OPTICUS"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignupSubmit}>
            <div className="form-group" style={{ marginBottom: "12px" }}>
              <label htmlFor="signupName" style={{ display: "block", marginBottom: "6px", fontSize: "12px", textTransform: "uppercase", fontWeight: "600" }}>Full Name</label>
              <input
                type="text"
                id="signupName"
                className="control-select premium-input"
                style={{ width: "100%", padding: "10px" }}
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: "12px" }}>
              <label htmlFor="signupRole" style={{ display: "block", marginBottom: "6px", fontSize: "12px", textTransform: "uppercase", fontWeight: "600" }}>Account Type</label>
              <select
                id="signupRole"
                className="control-select premium-input"
                style={{ width: "100%", padding: "10px" }}
                value={signupRole}
                onChange={(e) => setSignupRole(e.target.value)}
              >
                <option value="client">Client</option>
                <option value="factory">Partner Factory</option>
                <option value="staff">Opticus Administrator (Staff)</option>
              </select>
            </div>

            {signupRole === "factory" && (
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label htmlFor="signupFactoryName" style={{ display: "block", marginBottom: "6px", fontSize: "12px", textTransform: "uppercase", fontWeight: "600" }}>Factory Brand Name</label>
                <input
                  type="text"
                  id="signupFactoryName"
                  className="control-select premium-input"
                  style={{ width: "100%", padding: "10px" }}
                  value={signupFactoryName}
                  onChange={(e) => setSignupFactoryName(e.target.value)}
                  placeholder="e.g. Ray-Ban, Oakley"
                  required
                />
              </div>
            )}

            <div className="form-group" style={{ marginBottom: "12px" }}>
              <label htmlFor="signupEmail" style={{ display: "block", marginBottom: "6px", fontSize: "12px", textTransform: "uppercase", fontWeight: "600" }}>Email Address</label>
              <input
                type="email"
                id="signupEmail"
                className="control-select premium-input"
                style={{ width: "100%", padding: "10px" }}
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: "12px" }}>
              <label htmlFor="signupPassword" style={{ display: "block", marginBottom: "6px", fontSize: "12px", textTransform: "uppercase", fontWeight: "600" }}>Password (6+ chars)</label>
              <input
                type="password"
                id="signupPassword"
                className="control-select premium-input"
                style={{ width: "100%", padding: "10px" }}
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label htmlFor="signupConfirm" style={{ display: "block", marginBottom: "6px", fontSize: "12px", textTransform: "uppercase", fontWeight: "600" }}>Confirm Password</label>
              <input
                type="password"
                id="signupConfirm"
                className="control-select premium-input"
                style={{ width: "100%", padding: "10px" }}
                value={signupConfirm}
                onChange={(e) => setSignupConfirm(e.target.value)}
                required
              />
            </div>

            {signupError && <p style={{ color: "#ef4444", fontSize: "14px", margin: "0 0 16px 0" }}>{signupError}</p>}
            {signupSuccess && <p style={{ color: "#22c55e", fontSize: "14px", margin: "0 0 16px 0" }}>{signupSuccess}</p>}

            <button
              type="submit"
              className="save-btn"
              style={{ width: "100%", padding: "12px", fontSize: "14px", fontWeight: "600" }}
            >
              CREATE ACCOUNT
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
