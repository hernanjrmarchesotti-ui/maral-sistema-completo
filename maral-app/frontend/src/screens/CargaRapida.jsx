import { useState, useEffect } from "react";

export default function CargaRapida({ fetchAPI }) {
  const [tipo, setTipo] = useState("pesada");
  const [lotes, setLotes] = useState([]);
  const [form, setForm] = useState({});
  const [ok, setOk] = useState(false);

  useEffect(() => { fetchAPI("/lotes?estado=Activo").then(setLotes); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const guardar = async () => {
    const fecha = form.fecha || new Date().toISOString().split("T")[0];
    const endpoints = {
      pesada: { path: "/pesadas", body: { fecha, lote_id: form.lote_id, cantidad: Number(form.cantidad), peso_prom_kg: Number(form.peso), es_estimado: form.estimado === "si", observacion: form.obs } },
      alimento: { path: "/alimentos", body: { fecha, tipo_alimento: form.tipo_alim || "Balanceado granel", movimiento: "Compra", kg: Number(form.kg), precio_total: Number(form.precio_total), destino: "Feedlot", lote_id: form.lote_id, origen: form.origen, observacion: form.obs } },
      gasto: { path: "/gastos", body: { fecha, tipo_gasto: form.tipo_gasto || "Otro", categoria: "OPERATIVO GANADERO", descripcion: form.desc, monto: Number(form.monto), lote_id: form.lote_id, inversor: form.inversor, observacion: form.obs } },
      movimiento: { path: "/movimientos", body: { fecha, tipo: form.tipo_mov || "Cambio parcela", lote_id: form.lote_id, desde: form.desde, hacia: form.hacia, cantidad: Number(form.cantidad), observacion: form.obs } },
    };
    const ep = endpoints[tipo];
    if (!ep) return;
    await fetchAPI(ep.path, { method: "POST", body: JSON.stringify(ep.body) });
    setOk(true);
    setForm({});
    setTimeout(() => setOk(false), 2000);
  };

  const Input = ({ label, field, type="text", placeholder="" }) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, color: "#4a7a4a", display: "block", marginBottom: 4 }}>{label}</label>
      <input type={type} placeholder={placeholder} value={form[field] || ""} onChange={e => set(field, e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #2d4a2d", background: "#1a2e1a", color: "#e8f5e9", fontSize: 15 }} />
    </div>
  );

  const Select = ({ label, field, options }) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, color: "#4a7a4a", display: "block", marginBottom: 4 }}>{label}</label>
      <select value={form[field] || ""} onChange={e => set(field, e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #2d4a2d", background: "#1a2e1a", color: "#e8f5e9", fontSize: 15 }}>
        <option value="">Seleccionar...</option>
        {options.map(o => <option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ padding: "20px 16px" }}>
      <h1 style={{ color: "#81c784", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Carga rápida</h1>
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {[["pesada","⚖️ Pesada"],["alimento","🌽 Alimento"],["gasto","💸 Gasto"],["movimiento","🔄 Movimiento"]].map(([id,label]) => (
          <button key={id} onClick={() => setTipo(id)}
            style={{ padding: "8px 14px", borderRadius: 20, border: "1px solid #2d4a2d", background: tipo===id ? "#2d5a1b" : "transparent", color: tipo===id ? "#e8f5e9" : "#4a7a4a", fontSize: 12, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      <Select label="Lote" field="lote_id" options={lotes.map(l => ({ value: l.id, label: `${l.codigo} (${l.cantidad} an.)` }))} />
      <Input label="Fecha" field="fecha" type="date" />

      {tipo === "pesada" && <>
        <Input label="Peso prom. (kg/animal)" field="peso" type="number" placeholder="300" />
        <Input label="Cantidad animales" field="cantidad" type="number" />
        <Select label="¿Es estimado?" field="estimado" options={[{value:"si",label:"Sí — estimado visual"},{value:"no",label:"No — pesada real"}]} />
        <Input label="Observación" field="obs" placeholder="Opcional" />
      </>}

      {tipo === "alimento" && <>
        <Select label="Tipo alimento" field="tipo_alim" options={["Balanceado granel","Maíz","Rollo","Fardo","Soja","Otro"]} />
        <Input label="Kg cargados" field="kg" type="number" />
        <Input label="Precio total ($)" field="precio_total" type="number" />
        <Input label="Origen / Proveedor" field="origen" placeholder="Durán, Crincoli, tolva propia..." />
        <Input label="Observación" field="obs" />
      </>}

      {tipo === "gasto" && <>
        <Select label="Tipo gasto" field="tipo_gasto" options={["Alimento","Sanidad","Flete","Mano de obra","Infraestructura","Agricultura","Combustible","Otro"]} />
        <Input label="Descripción" field="desc" />
        <Input label="Monto ($)" field="monto" type="number" />
        <Select label="Pagado por" field="inversor" options={["Paco","Hernán","Ambos"]} />
      </>}

      {tipo === "movimiento" && <>
        <Select label="Tipo movimiento" field="tipo_mov" options={["Cambio parcela","Pase a feedlot","Pase a recría","División de lote"]} />
        <Input label="Desde" field="desde" placeholder="Parcela 1, Recría..." />
        <Input label="Hacia" field="hacia" placeholder="Parcela 2, Feedlot..." />
        <Input label="Cantidad animales" field="cantidad" type="number" />
        <Input label="Observación" field="obs" />
      </>}

      <button onClick={guardar}
        style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: ok ? "#1b5e20" : "#2d5a1b", color: "#e8f5e9", fontSize: 16, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>
        {ok ? "✓ Guardado" : "Guardar registro"}
      </button>
    </div>
  );
}
