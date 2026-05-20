import { useState, useEffect } from "react";
import Dashboard from "./screens/Dashboard";
import Lotes from "./screens/Lotes";
import CargaRapida from "./screens/CargaRapida";
import KPIs from "./screens/KPIs";
import Evaluador from "./screens/Evaluador";

const API = import.meta.env.VITE_API_URL || "https://maral-api.onrender.com";

export default function App() {
  const [screen, setScreen] = useState("dashboard");
  const [token, setToken] = useState(localStorage.getItem("maral_token"));
  const [usuario, setUsuario] = useState(JSON.parse(localStorage.getItem("maral_user") || "null"));

  const login = async (email, password) => {
    const r = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = await r.json();
    if (data.token) {
      localStorage.setItem("maral_token", data.token);
      localStorage.setItem("maral_user", JSON.stringify(data.usuario));
      setToken(data.token);
      setUsuario(data.usuario);
    }
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setUsuario(null);
  };

  const fetchAPI = (path, opts = {}) =>
    fetch(`${API}${path}`, { ...opts, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...opts.headers } }).then(r => r.json());

  if (!token) return <Login onLogin={login} />;

  const screens = { dashboard: Dashboard, lotes: Lotes, carga: CargaRapida, kpis: KPIs, evaluador: Evaluador };
  const Screen = screens[screen] || Dashboard;

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: "#0f1a0f", color: "#e8f5e9", fontFamily: "'DM Sans', sans-serif", position: "relative", paddingBottom: 80 }}>
      <Screen fetchAPI={fetchAPI} usuario={usuario} />
      <Nav screen={screen} onNav={setScreen} onLogout={logout} />
    </div>
  );
}

function Nav({ screen, onNav, onLogout }) {
  const items = [
    { id: "dashboard", icon: "🏠", label: "Inicio" },
    { id: "lotes", icon: "🐄", label: "Lotes" },
    { id: "carga", icon: "➕", label: "Cargar" },
    { id: "kpis", icon: "📊", label: "KPIs" },
    { id: "evaluador", icon: "🧮", label: "Feria" },
  ];
  return (
    <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, background: "#1a2e1a", borderTop: "1px solid #2d4a2d", display: "flex", zIndex: 100 }}>
      {items.map(item => (
        <button key={item.id} onClick={() => onNav(item.id)}
          style={{ flex: 1, padding: "10px 0 8px", border: "none", background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, opacity: screen === item.id ? 1 : 0.5 }}>
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span style={{ fontSize: 10, color: screen === item.id ? "#81c784" : "#666" }}>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  return (
    <div style={{ minHeight: "100vh", background: "#0f1a0f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>🐄</div>
      <h1 style={{ color: "#81c784", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>MARAL</h1>
      <p style={{ color: "#4a7a4a", fontSize: 14, marginBottom: 32 }}>Sistema ganadero</p>
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
        style={{ width: "100%", maxWidth: 320, padding: "12px 16px", borderRadius: 12, border: "1px solid #2d4a2d", background: "#1a2e1a", color: "#e8f5e9", fontSize: 16, marginBottom: 12 }} />
      <input type="password" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)}
        style={{ width: "100%", maxWidth: 320, padding: "12px 16px", borderRadius: 12, border: "1px solid #2d4a2d", background: "#1a2e1a", color: "#e8f5e9", fontSize: 16, marginBottom: 20 }} />
      <button onClick={() => onLogin(email, pass)}
        style={{ width: "100%", maxWidth: 320, padding: "14px", borderRadius: 12, border: "none", background: "#2d5a1b", color: "#e8f5e9", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
        Ingresar
      </button>
    </div>
  );
}
