import { useState, useEffect } from "react";

export default function KPIs({ fetchAPI }) {
  const [kpis, setKpis] = useState(null);

  useEffect(() => { fetchAPI("/kpis").then(setKpis); }, []);

  if (!kpis) return <div style={{ padding: 24, color: "#4a7a4a" }}>Cargando...</div>;

  const margen = kpis.ventas_acumuladas && kpis.gastos_operativos ? kpis.ventas_acumuladas - kpis.gastos_operativos : null;

  const items = [
    { cat: "Productivo", rows: [
      ["Animales en recría", kpis.animales_recria || "—"],
      ["Animales en feedlot", kpis.animales_feedlot || "—"],
      ["Costo/kg ganado feedlot", kpis.costo_kg_feedlot ? `$${Number(kpis.costo_kg_feedlot).toLocaleString()}` : "—"],
      ["Costo/kg ganado recría", kpis.costo_kg_recria ? `$${Number(kpis.costo_kg_recria).toLocaleString()} ~est.` : "—"],
    ]},
    { cat: "Económico", rows: [
      ["Ventas acumuladas", kpis.ventas_acumuladas ? `$${(kpis.ventas_acumuladas/1000000).toFixed(2)}M` : "—"],
      ["Gastos operativos", kpis.gastos_operativos ? `$${(kpis.gastos_operativos/1000000).toFixed(2)}M` : "—"],
      ["Margen bruto estimado", margen ? `$${(margen/1000000).toFixed(2)}M` : "—"],
      ["Precio mercado ref.", kpis.precio_mercado ? `$${Number(kpis.precio_mercado).toLocaleString()}/kg` : "Sin cargar"],
    ]},
  ];

  return (
    <div style={{ padding: "20px 16px" }}>
      <h1 style={{ color: "#81c784", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>KPIs del sistema</h1>
      {items.map(({ cat, rows }) => (
        <div key={cat} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#4a7a4a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{cat}</div>
          <div style={{ background: "#1a2e1a", borderRadius: 14, border: "1px solid #2d4a2d", overflow: "hidden" }}>
            {rows.map(([k,v], i) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "11px 16px", borderBottom: i < rows.length-1 ? "1px solid #2d4a2d" : "none" }}>
                <span style={{ fontSize: 13, color: "#6a9a6a" }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#e8f5e9" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
