const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token inválido' }); }
};

// AUTH
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND activo = true', [email]);
  if (!rows[0]) return res.status(401).json({ error: 'Usuario no encontrado' });
  const token = jwt.sign({ id: rows[0].id, nombre: rows[0].nombre, rol: rows[0].rol }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, usuario: { nombre: rows[0].nombre, rol: rows[0].rol } });
});

// DASHBOARD
app.get('/dashboard', auth, async (req, res) => {
  const [resumen, alertas, kpis] = await Promise.all([
    pool.query("SELECT etapa, COUNT(*) as lotes, SUM(cantidad) as animales FROM lotes WHERE estado = 'Activo' GROUP BY etapa"),
    pool.query(`SELECT l.codigo, l.etapa, l.cantidad, CURRENT_DATE - MAX(p.fecha) AS dias_sin_pesada, CURRENT_DATE - l.fecha_ingreso AS dias_en_sistema FROM lotes l LEFT JOIN pesadas p ON p.lote_id = l.id WHERE l.estado = 'Activo' GROUP BY l.id, l.codigo, l.etapa, l.cantidad, l.fecha_ingreso HAVING CURRENT_DATE - MAX(p.fecha) > (SELECT valor::int FROM config_sistema WHERE clave = 'dias_alerta_pesada') OR MAX(p.fecha) IS NULL`),
    pool.query("SELECT (SELECT SUM(total_bruto) FROM ventas WHERE tipo = 'Venta') as ventas_acumuladas, (SELECT SUM(monto) FROM gastos WHERE categoria != 'EXCLUIR') as gastos_acumulados, (SELECT SUM(cantidad) FROM lotes WHERE estado = 'Activo') as animales_activos, (SELECT valor FROM config_sistema WHERE clave = 'precio_mercado_kg') as precio_mercado")
  ]);
  res.json({ resumen: resumen.rows, alertas: alertas.rows, kpis: kpis.rows[0] });
});

// LOTES
app.get('/lotes', auth, async (req, res) => {
  const { estado, etapa } = req.query;
  let q = 'SELECT * FROM lotes WHERE 1=1'; const p = [];
  if (estado) { p.push(estado); q += ` AND estado = $${p.length}`; }
  if (etapa) { p.push(etapa); q += ` AND etapa = $${p.length}`; }
  q += ' ORDER BY fecha_ingreso DESC';
  const { rows } = await pool.query(q, p);
  res.json(rows);
});

app.get('/lotes/:id', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM lotes WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Lote no encontrado' });
  const [pe, mo, ga, ve] = await Promise.all([
    pool.query('SELECT * FROM pesadas WHERE lote_id = $1 ORDER BY fecha DESC LIMIT 10', [req.params.id]),
    pool.query('SELECT * FROM movimientos WHERE lote_id = $1 ORDER BY fecha DESC', [req.params.id]),
    pool.query('SELECT * FROM gastos WHERE lote_id = $1 ORDER BY fecha DESC', [req.params.id]),
    pool.query('SELECT * FROM ventas WHERE lote_id = $1 ORDER BY fecha DESC', [req.params.id]),
  ]);
  res.json({ lote: rows[0], pesadas: pe.rows, movimientos: mo.rows, gastos: ga.rows, ventas: ve.rows });
});

app.post('/lotes', auth, async (req, res) => {
  const { codigo, fecha_ingreso, etapa, cantidad, machos, hembras, kg_entrada_total, precio_compra_kg, costo_compra, observacion } = req.body;
  const peso_prom = kg_entrada_total && cantidad ? kg_entrada_total / cantidad : null;
  const { rows } = await pool.query(
    `INSERT INTO lotes (codigo,fecha_ingreso,etapa,cantidad,machos,hembras,kg_entrada_total,peso_prom_entrada,precio_compra_kg,costo_compra,observacion,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [codigo, fecha_ingreso, etapa, cantidad, machos||0, hembras||0, kg_entrada_total, peso_prom, precio_compra_kg, costo_compra, observacion, req.user.id]
  );
  res.json(rows[0]);
});

app.patch('/lotes/:id', auth, async (req, res) => {
  const fields = ['etapa','estado','ubicacion','cantidad','observacion'];
  const updates = fields.filter(f => req.body[f] !== undefined);
  if (!updates.length) return res.status(400).json({ error: 'Sin campos' });
  const set = updates.map((f,i) => `${f}=$${i+1}`).join(',');
  const vals = [...updates.map(f => req.body[f]), req.params.id];
  const { rows } = await pool.query(`UPDATE lotes SET ${set} WHERE id=$${vals.length} RETURNING *`, vals);
  res.json(rows[0]);
});

// PESADAS
app.get('/pesadas', auth, async (req, res) => {
  const { lote_id } = req.query;
  let q = 'SELECT p.*, l.codigo FROM pesadas p JOIN lotes l ON l.id = p.lote_id';
  const p = [];
  if (lote_id) { p.push(lote_id); q += ' WHERE p.lote_id = $1'; }
  q += ' ORDER BY p.fecha DESC LIMIT 50';
  const { rows } = await pool.query(q, p);
  res.json(rows);
});

app.post('/pesadas', auth, async (req, res) => {
  const { fecha, lote_id, cantidad, peso_prom_kg, es_estimado, observacion } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO pesadas (fecha,lote_id,cantidad,peso_prom_kg,es_estimado,observacion,registrado_por) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [fecha, lote_id, cantidad, peso_prom_kg, es_estimado||false, observacion, req.user.id]
  );
  res.json(rows[0]);
});

// PARCELAS
app.get('/parcelas', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT p.*, l.codigo as lote_codigo FROM parcelas p LEFT JOIN lotes l ON l.id = p.lote_actual_id ORDER BY p.numero');
  res.json(rows);
});

app.patch('/parcelas/:id', auth, async (req, res) => {
  const { estado_avena, lote_actual_id, fecha_entrada, observacion } = req.body;
  const { rows } = await pool.query(
    `UPDATE parcelas SET estado_avena=$1,lote_actual_id=$2,fecha_entrada=$3,observacion=$4,updated_at=NOW() WHERE id=$5 RETURNING *`,
    [estado_avena, lote_actual_id, fecha_entrada, observacion, req.params.id]
  );
  res.json(rows[0]);
});

// MOVIMIENTOS
app.post('/movimientos', auth, async (req, res) => {
  const { fecha, tipo, lote_id, desde, hacia, cantidad, kg_estimados, observacion } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO movimientos (fecha,tipo,lote_id,desde,hacia,cantidad,kg_estimados,observacion,registrado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [fecha, tipo, lote_id, desde, hacia, cantidad, kg_estimados, observacion, req.user.id]
  );
  res.json(rows[0]);
});

// ALIMENTOS
app.get('/alimentos', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM alimentos ORDER BY fecha DESC LIMIT 100');
  res.json(rows);
});

app.post('/alimentos', auth, async (req, res) => {
  const { fecha, tipo_alimento, movimiento, kg, precio_total, destino, lote_id, origen, inversor, observacion } = req.body;
  const costo_kg = precio_total && kg ? precio_total / kg : null;
  const { rows } = await pool.query(
    `INSERT INTO alimentos (fecha,tipo_alimento,movimiento,kg,precio_total,costo_kg,destino,lote_id,origen,inversor,observacion) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [fecha, tipo_alimento, movimiento, kg, precio_total, costo_kg, destino, lote_id, origen, inversor, observacion]
  );
  res.json(rows[0]);
});

// VENTAS
app.get('/ventas', auth, async (req, res) => {
  const { rows } = await pool.query(`SELECT v.*, l.codigo as lote_codigo, l.costo_compra, v.total_bruto - l.costo_compra as margen_bruto FROM ventas v JOIN lotes l ON l.id = v.lote_id ORDER BY v.fecha DESC`);
  res.json(rows);
});

app.post('/ventas', auth, async (req, res) => {
  const { fecha, lote_id, cantidad, kg_brutos, desbaste_pct, precio_kg, tipo, comprador, observacion } = req.body;
  const desb = desbaste_pct || 0.08;
  const kg_netos = kg_brutos ? kg_brutos * (1 - desb) : null;
  const total_bruto = kg_netos ? kg_netos * precio_kg : null;
  const { rows } = await pool.query(
    `INSERT INTO ventas (fecha,lote_id,cantidad,kg_brutos,desbaste_pct,kg_netos,precio_kg,total_bruto,tipo,comprador,observacion,registrado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [fecha, lote_id, cantidad, kg_brutos, desb, kg_netos, precio_kg, total_bruto, tipo||'Venta', comprador, observacion, req.user.id]
  );
  if (tipo !== 'Baja') await pool.query("UPDATE lotes SET estado='Vendido' WHERE id=$1", [lote_id]);
  res.json(rows[0]);
});

// GASTOS
app.get('/gastos', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM gastos ORDER BY fecha DESC LIMIT 200');
  res.json(rows);
});

app.post('/gastos', auth, async (req, res) => {
  const { fecha, tipo_gasto, categoria, descripcion, monto, destino_costo, lote_id, medio_pago, pagado_por, inversor, es_inversion } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO gastos (fecha,tipo_gasto,categoria,descripcion,monto,destino_costo,lote_id,medio_pago,pagado_por,inversor,es_inversion) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [fecha, tipo_gasto, categoria, descripcion, monto, destino_costo, lote_id, medio_pago, pagado_por, inversor, es_inversion||false]
  );
  res.json(rows[0]);
});

// KPIs
app.get('/kpis', auth, async (req, res) => {
  const { rows } = await pool.query(`SELECT (SELECT SUM(total_bruto) FROM ventas WHERE tipo='Venta') as ventas_acumuladas, (SELECT COUNT(*) FROM ventas WHERE tipo='Venta') as total_ventas, (SELECT SUM(monto) FROM gastos WHERE categoria!='EXCLUIR' AND es_inversion=false) as gastos_operativos, (SELECT SUM(cantidad) FROM lotes WHERE estado='Activo' AND etapa='Recría') as animales_recria, (SELECT SUM(cantidad) FROM lotes WHERE estado='Activo' AND etapa='Feedlot') as animales_feedlot, (SELECT valor::numeric FROM config_sistema WHERE clave='precio_mercado_kg') as precio_mercado, (SELECT valor::numeric FROM config_sistema WHERE clave='costo_kg_ganado_feedlot') as costo_kg_feedlot, (SELECT valor::numeric FROM config_sistema WHERE clave='costo_kg_ganado_recria') as costo_kg_recria`);
  res.json(rows[0]);
});

// EVALUADOR
app.post('/evaluador', auth, async (req, res) => {
  const { cant, peso, pesoVenta, precio, pventa, destino, desbC=3, desbV=8, comision=3 } = req.body;
  const cfg = await pool.query("SELECT clave, valor::numeric as valor FROM config_sistema WHERE clave IN ('costo_kg_ganado_feedlot','costo_kg_ganado_recria','adpv_objetivo_feedlot','adpv_objetivo_recria','sanidad_costo_animal','flete_entrada_animal')");
  const c = Object.fromEntries(cfg.rows.map(r => [r.clave, Number(r.valor)]));
  const costoKg = destino==='recria' ? c.costo_kg_ganado_recria : c.costo_kg_ganado_feedlot;
  const adpv = destino==='recria' ? c.adpv_objetivo_recria : c.adpv_objetivo_feedlot;
  const kgNetosC = peso*(1-desbC/100);
  const costoCompra = kgNetosC*precio*cant;
  const comisionMonto = costoCompra*(comision/100);
  const gastosExtra = (c.sanidad_costo_animal+c.flete_entrada_animal)*cant+comisionMonto;
  const kgGanar = pesoVenta-peso;
  const dias = Math.round(kgGanar/adpv);
  const costoProduccion = kgGanar*costoKg*cant;
  const kgNetosV = pesoVenta*(1-desbV/100)*cant;
  const ingreso = kgNetosV*pventa;
  const costoTotal = costoCompra+gastosExtra+costoProduccion;
  const margen = ingreso-costoTotal;
  const rentabilidad = (margen/costoTotal)*100;
  const precioMax = (ingreso/1.10-(c.sanidad_costo_animal+c.flete_entrada_animal)*cant-costoProduccion)/(kgNetosC*cant*(1+comision/100));
  res.json({ costoCompra, gastosExtra, kgGanar, dias, costoProduccion, kgNetosV, ingreso, costoTotal, margen, rentabilidad, precioMax });
});

// CONFIG
app.get('/config', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM config_sistema ORDER BY clave');
  res.json(rows);
});

app.patch('/config/:clave', auth, async (req, res) => {
  const { valor } = req.body;
  const { rows } = await pool.query(`UPDATE config_sistema SET valor=$1,updated_at=NOW(),updated_by=$2 WHERE clave=$3 RETURNING *`, [valor, req.user.id, req.params.clave]);
  res.json(rows[0]);
});

// SALDOS
app.get('/saldos', auth, async (req, res) => {
  const [saldos, gastos] = await Promise.all([
    pool.query("SELECT inversor, SUM(CASE WHEN tipo='Aporte' THEN monto ELSE 0 END) as total_aportes, SUM(CASE WHEN tipo='Retiro' THEN monto ELSE 0 END) as total_retiros, SUM(CASE WHEN tipo='Aporte' THEN monto ELSE -monto END) as saldo_neto FROM saldos_inversores GROUP BY inversor"),
    pool.query("SELECT inversor, SUM(monto) as total FROM gastos WHERE inversor IN ('Paco','Hernán') AND categoria!='EXCLUIR' GROUP BY inversor")
  ]);
  res.json({ saldos: saldos.rows, gastos_por_inversor: gastos.rows });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MARAL API en puerto ${PORT}`));
