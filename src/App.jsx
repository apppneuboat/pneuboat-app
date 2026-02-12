import React, { useEffect, useState } from "react";
import MainApp from "./MainApp.jsx";

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || "";

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setIsUnlocked(localStorage.getItem("pb_unlock") === "1");
  }, []);

  const handleLogin = () => {
    setError("");
    if (!APP_PASSWORD) return setError("VITE_APP_PASSWORD est manquant dans Vercel.");
    if (password !== APP_PASSWORD) return setError("Mot de passe incorrect.");
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
            padding: 22,
            boxShadow: "0 2px 10px rgba(15,23,42,.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                background: "#1e3a8a",
                color: "white",
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              P
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>PNEUBOAT</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>Accès sécurisé</div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#475569", marginBottom: 6 }}>
              Mot de passe
            </div>
            <input
              type="password"
              placeholder="••••••••"
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
            <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 800, fontSize: 13 }}>
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
              background: "#dc2626",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Ouvrir l’application
          </button>

          <div style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>
            Astuce iPad : si tu vois une page blanche, efface “Données des sites” (Safari).
          </div>
        </div>
      </div>
    );
  }

  return <MainApp onLogout={handleLogout} />;
}