import { useState, useEffect } from "react";

export default function Lotes({ fetchAPI }) {
  const [lotes, setLotes] = useState([]);
  const [filtro, setFiltro] = useState("Activo");

  useEffect(() => { fetchAPI(`/lotes?estado=${filtro}`).then(setLotes); }, [filtro]);

  const recria = lotes.filter(l => l.etapa === "Recría");
  const feedlot = lotes.filter(l => l.etapa === "Feedlot");

  return (
    <div style={{ padding: "20px 16px" }}>
      <h1 style={{ color: "#81c784", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Lotes activos</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["Activo", "Cerrado", "Vendido"].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid #2d4a2d", background: filtro === f ? "#2d5a1b" : "transparent", color: filtro === f ? "#e8f5e9" : "#4a7a4a", fontSize: 12, cursor: "pointer" }}>
            {f}
          </button>
        ))}
      </div>

      {recria.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: "#4a7a4a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>🌾 Recría — {recria.reduce((s,l) => s + l.cantidad, 0)} animales</div>
          {recria.map(l => <LoteCard key={l.id} lote={l} />)}
        </>
      )}
      {feedlot.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: "#4a7a4a", textTransform: "uppercase", letterSpacing: "0.05em", margin: "16px 0 8px" }}>🏗 Feedlot — {feedlot.reduce((s,l) => s + l.cantidad, 0)} animales</div>
          {feedlot.map(l => <LoteCard key={l.id} lote={l} />)}
        </>
      )}
    </div>
  );
}

function LoteCard({ lote }) {
  const dias = Math.floor((Date.now() - new Date(lote.fecha_ingreso)) / 86400000);
  const pct = Math.min((lote.peso_prom_entrada / 340) * 100, 100);
  return (
    <div style={{ background: "#1a2e1a", borderRadius: 14, padding: "14px 16px", marginBottom: 10, border: "1px solid #2d4a2d" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#e8f5e9" }}>{lote.codigo}</span>
        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#0d2a0d", color: "#66bb6a" }}>{dias} días</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 10 }}>
        {[["Animales", lote.cantidad], ["Kg entrada", lote.peso_prom_entrada ? `${lote.peso_prom_entrada}kg/an` : "—"], ["Costo", lote.costo_compra ? `$${(lote.costo_compra/1000000).toFixed(2)}M` : "—"]].map(([k,v]) => (
          <div key={k}>
            <div style={{ fontSize: 10, color: "#4a7a4a" }}>{k}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e8f5e9" }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ height: 4, background: "#0d2a0d", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#66bb6a", borderRadius: 2 }} />
      </div>
    </div>
  );
}
