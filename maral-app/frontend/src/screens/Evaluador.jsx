import { useState } from "react";

export default function Evaluador({ fetchAPI }) {
  const [form, setForm] = useState({ cant: "", peso: "", pesoVenta: "", precio: "", pventa: "", destino: "feedlot" });
  const [res, setRes] = useState(null);
  const set = (k,v) => setForm(f => ({...f, [k]: v}));

  const evaluar = async () => {
    const body = { cant: Number(form.cant), peso: Number(form.peso), pesoVenta: Number(form.pesoVenta), precio: Number(form.precio), pventa: Number(form.pventa), destino: form.destino };
    if (!body.cant || !body.peso || !body.pesoVenta || !body.precio || !body.pventa) return;
    const data = await fetchAPI("/evaluador", { method: "POST", body: JSON.stringify(body) });
    setRes(data);
  };

  const fmt = n => n ? `$${Math.round(n).toLocaleString("es-AR")}` : "—";
  const fmtkg = n => n ? `${Math.round(n).toLocaleString("es-AR")} kg` : "—";

  const color = res ? (res.rentabilidad >= 15 ? "#66bb6a" : res.rentabilidad >= 5 ? "#ffb74d" : "#ef5350") : null;
  const emoji = res ? (res.rentabilidad >= 15 ? "✓" : res.rentabilidad >= 5 ? "⚠" : "✗") : null;

  const Input = ({ label, field, placeholder }) => (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: 11, color: "#4a7a4a", display: "block", marginBottom: 3 }}>{label}</label>
      <input type="number" placeholder={placeholder} value={form[field]} onChange={e => set(field, e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #2d4a2d", background: "#1a2e1a", color: "#e8f5e9", fontSize: 15 }} />
    </div>
  );

  return (
    <div style={{ padding: "20px 16px" }}>
      <h1 style={{ color: "#81c784", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Evaluador — feria</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["recria","🌾 Recría"],["feedlot","🏗 Feedlot"]].map(([id,label]) => (
          <button key={id} onClick={() => set("destino", id)}
            style={{ flex:1, padding:"10px", borderRadius:12, border:"1px solid #2d4a2d", background: form.destino===id?"#2d5a1b":"transparent", color: form.destino===id?"#e8f5e9":"#4a7a4a", fontSize:13, cursor:"pointer" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:12 }}>
        <Input label="Cantidad" field="cant" placeholder="10" />
        <Input label="Precio ofrecido ($/kg)" field="precio" placeholder="5000" />
      </div>
      <div style={{ display:"flex", gap:10, marginBottom:12 }}>
        <Input label="Peso entrada (kg)" field="peso" placeholder="220" />
        <Input label="Peso objetivo venta (kg)" field="pesoVenta" placeholder="330" />
      </div>
      <div style={{ marginBottom:16 }}>
        <Input label="Precio venta estimado ($/kg)" field="pventa" placeholder="5500" />
      </div>

      <button onClick={evaluar}
        style={{ width:"100%", padding:14, borderRadius:12, border:"none", background:"#2d5a1b", color:"#e8f5e9", fontSize:16, fontWeight:600, cursor:"pointer", marginBottom:16 }}>
        Evaluar ↗
      </button>

      {res && (
        <>
          <div style={{ background: color+"22", border: `1px solid ${color}55`, borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color, marginBottom: 4 }}>{emoji} {res.rentabilidad >= 15 ? "Buen negocio — conviene comprar" : res.rentabilidad >= 5 ? "Margen justo — negociá el precio" : "No conviene — perdés plata"}</div>
            <div style={{ fontSize: 13, color: "#6a9a6a" }}>Rentabilidad: {res.rentabilidad?.toFixed(1)}% · Margen/animal: {fmt(res.margen/form.cant)}</div>
          </div>

          <div style={{ background:"#0a2a14", border:"1px solid #1a5a24", borderRadius:14, padding:"12px 16px", marginBottom:14 }}>
            <div style={{ fontSize:11, color:"#4a7a4a", marginBottom:6 }}>PRECIO MÁXIMO QUE PODÉS PAGAR</div>
            <div style={{ fontSize:24, fontWeight:700, color:"#66bb6a" }}>{fmt(res.precioMax)}/kg</div>
          </div>

          <div style={{ background:"#1a2e1a", borderRadius:14, border:"1px solid #2d4a2d", overflow:"hidden" }}>
            {[
              ["Kg a ganar por animal", fmtkg(res.kgGanar)],
              ["Días estimados en sistema", `${res.dias} días`],
              ["Costo producción", fmt(res.costoProduccion)],
              ["Costo total", fmt(res.costoTotal)],
              ["Ingreso estimado", fmt(res.ingreso)],
              ["Margen total", fmt(res.margen)],
            ].map(([k,v],i,arr) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"10px 16px", borderBottom: i<arr.length-1?"1px solid #2d4a2d":"none" }}>
                <span style={{ fontSize:13, color:"#6a9a6a" }}>{k}</span>
                <span style={{ fontSize:13, fontWeight:600, color:"#e8f5e9" }}>{v}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
