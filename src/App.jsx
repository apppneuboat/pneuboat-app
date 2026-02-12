import React, { useEffect, useState } from "react";
import MainApp from "./MainApp.jsx";

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || "";

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("pb_unlock");
    if (saved === "1") {
      setIsUnlocked(true);
    }
  }, []);

  const handleLogin = () => {
    setError("");

    if (!APP_PASSWORD) {
      setError("Mot de passe non configuré sur Vercel (VITE_APP_PASSWORD).");
      return;
    }

    if (password !== APP_PASSWORD) {
      setError("Mot de passe incorrect.");
      return;
    }

    localStorage.setItem("pb_unlock", "1");
    setIsUnlocked(true);
    setPassword("");
  };

  const handleLogout = () => {
    localStorage.removeItem("pb_unlock");
    setIsUnlocked(false);
  };

  if (!isUnlocked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily: "system-ui, -apple-system, Arial",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 2px 6px rgba(15,23,42,.08)",
          }}
        >
          <h2 style={{ margin: 0, fontWeight: 900 }}>PNEUBOAT</h2>
          <p style={{ color: "#64748b", marginTop: 6 }}>
            Accès sécurisé – Compte unique
          </p>

          <div style={{ marginTop: 16 }}>
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                outline: "none",
                fontSize: 14,
              }}
            />
          </div>

          {error && (
            <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 600 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            style={{
              marginTop: 14,
              width: "100%",
              padding: "12px",
              borderRadius: 14,
              border: "none",
              background: "#1e3a8a",
              color: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return <MainApp onLogout={handleLogout} />;
}