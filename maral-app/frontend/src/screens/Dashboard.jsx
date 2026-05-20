import { useState, useEffect } from "react";

export default function Dashboard({ fetchAPI, usuario }) {
  const [data, setData] = useState(null);

  useEffect(() => { fetchAPI("/dashboard").then(setData); }, []);

  if (!data) return <div style={{ padding: 24, color: "#4a7a4a" }}>Cargando...</div>;

  const recria = data.resumen.find(r => r.etapa === "Recría");
  const feedlot = data.resumen.find(r => r.etapa === "Feedlot");

  return (
    <div style={{ padding: "20px 16px" }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: "#4a7a4a", fontSize: 12, margin: 0 }}>Buenos días,</p>
        <h1 style={{ color: "#81c784", fontSize: 22, fontWeight: 700, margin: "2px 0 0" }}>{usuario?.nombre}</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Recría", value: recria?.animales || 0, sub: `${recria?.lotes || 0} lotes`, icon: "🌾" },
          { label: "Feedlot", value: feedlot?.animales || 0, sub: `${feedlot?.lotes || 0} lotes`, icon: "🏗" },
          { label: "Ventas", value: data.kpis?.ventas_acumuladas ? `$${(data.kpis.ventas_acumuladas/1000000).toFixed(1)}M` : "—", sub: "acumulado", icon: "💰" },
          { label: "Precio ref.", value: data.kpis?.precio_mercado ? `$${Number(data.kpis.precio_mercado).toLocaleString()}` : "—", sub: "por kg", icon: "📈" },
        ].map(item => (
          <div key={item.label} style={{ background: "#1a2e1a", borderRadius: 14, padding: "14px 16px", border: "1px solid #2d4a2d" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#e8f5e9" }}>{item.value}</div>
            <div style={{ fontSize: 11, color: "#4a7a4a" }}>{item.label} · {item.sub}</div>
          </div>
        ))}
      </div>

      {data.alertas?.length > 0 && (
        <>
          <h2 style={{ fontSize: 13, color: "#4a7a4a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Alertas</h2>
          {data.alertas.map(a => (
            <div key={a.codigo} style={{ background: "#2a1a0a", border: "1px solid #5a3a0a", borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#ffcc80" }}>{a.codigo} — sin pesada</div>
                <div style={{ fontSize: 11, color: "#8a6a4a" }}>{a.dias_sin_pesada ? `${a.dias_sin_pesada} días sin pesar` : "Nunca registrada"} · {a.etapa}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
