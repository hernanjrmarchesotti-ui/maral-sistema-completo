-- ============================================================
-- MARAL AGROPECUARIA — Base de datos PostgreSQL
-- Sistema de gestión recría + feedlot
-- ============================================================

-- EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLAS MAESTRAS
-- ============================================================

CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'operativo')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE config_sistema (
  clave VARCHAR(100) PRIMARY KEY,
  valor TEXT NOT NULL,
  descripcion TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES usuarios(id)
);

-- ============================================================
-- ANIMALES Y LOTES
-- ============================================================

CREATE TABLE lotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(50) UNIQUE NOT NULL,          -- RC-2605-01, FT-ACTUAL-01
  lote_origen_id UUID REFERENCES lotes(id),    -- para trazabilidad de divisiones
  fecha_ingreso DATE NOT NULL,
  etapa VARCHAR(20) NOT NULL CHECK (etapa IN ('Adaptación', 'Recría', 'Feedlot')),
  estado VARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Cerrado', 'Vendido', 'Baja')),
  ubicacion VARCHAR(100),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  machos INTEGER DEFAULT 0,
  hembras INTEGER DEFAULT 0,
  kg_entrada_total DECIMAL(10,2),
  peso_prom_entrada DECIMAL(8,2),
  precio_compra_kg DECIMAL(10,2),
  costo_compra DECIMAL(15,2),
  gastos_compra DECIMAL(15,2) DEFAULT 0,       -- flete, comisión, sanidad entrada
  observacion TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id)
);

-- ============================================================
-- MOVIMIENTOS
-- ============================================================

CREATE TABLE movimientos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
    'Compra/Ingreso', 'Pase a recría', 'Pase a feedlot',
    'Cambio parcela', 'División de lote', 'Venta', 'Baja'
  )),
  lote_id UUID NOT NULL REFERENCES lotes(id),
  desde VARCHAR(100),
  hacia VARCHAR(100),
  cantidad INTEGER,
  kg_estimados DECIMAL(10,2),
  observacion TEXT,
  registrado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- PESADAS
-- ============================================================

CREATE TABLE pesadas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  lote_id UUID NOT NULL REFERENCES lotes(id),
  cantidad INTEGER NOT NULL,
  peso_prom_kg DECIMAL(8,2) NOT NULL,
  kg_total DECIMAL(10,2) GENERATED ALWAYS AS (cantidad * peso_prom_kg) STORED,
  es_estimado BOOLEAN DEFAULT false,
  validado BOOLEAN DEFAULT false,
  observacion TEXT,
  registrado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vista de ADPV calculado
CREATE VIEW pesadas_con_adpv AS
SELECT
  p.*,
  p.kg_total - LAG(p.kg_total) OVER (PARTITION BY p.lote_id ORDER BY p.fecha) AS kg_ganados,
  p.fecha - LAG(p.fecha) OVER (PARTITION BY p.lote_id ORDER BY p.fecha) AS dias_desde_anterior,
  CASE
    WHEN LAG(p.peso_prom_kg) OVER (PARTITION BY p.lote_id ORDER BY p.fecha) IS NOT NULL
    THEN (p.peso_prom_kg - LAG(p.peso_prom_kg) OVER (PARTITION BY p.lote_id ORDER BY p.fecha))
         / NULLIF((p.fecha - LAG(p.fecha) OVER (PARTITION BY p.lote_id ORDER BY p.fecha)), 0)
    ELSE NULL
  END AS adpv
FROM pesadas p;

-- ============================================================
-- PARCELAS (rotación recría)
-- ============================================================

CREATE TABLE parcelas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero INTEGER UNIQUE NOT NULL,              -- 1 al 8
  nombre VARCHAR(50),                          -- "Parcela 1", "Adaptación"
  superficie_ha DECIMAL(5,2) DEFAULT 1.0,
  tipo VARCHAR(30) DEFAULT 'Recría' CHECK (tipo IN ('Recría', 'Adaptación', 'Feedlot')),
  estado_avena VARCHAR(30) DEFAULT 'Libre' CHECK (estado_avena IN (
    'Libre', 'Ocupada', 'Creciendo', 'Excelente', 'Buena', 'Regular', 'Agotada'
  )),
  lote_actual_id UUID REFERENCES lotes(id),
  fecha_entrada DATE,
  observacion TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE historial_parcelas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcela_id UUID NOT NULL REFERENCES parcelas(id),
  lote_id UUID NOT NULL REFERENCES lotes(id),
  fecha_entrada DATE NOT NULL,
  fecha_salida DATE,
  dias_ocupacion INTEGER GENERATED ALWAYS AS (
    CASE WHEN fecha_salida IS NOT NULL THEN (fecha_salida - fecha_entrada) ELSE NULL END
  ) STORED,
  observacion TEXT
);

-- ============================================================
-- FEEDLOT
-- ============================================================

CREATE TABLE consumo_feedlot (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  lote_id UUID NOT NULL REFERENCES lotes(id),
  tipo_alimento VARCHAR(50) NOT NULL,
  kg_cargados DECIMAL(10,2) NOT NULL,
  kg_sobrante DECIMAL(10,2) DEFAULT 0,
  kg_consumidos DECIMAL(10,2) GENERATED ALWAYS AS (kg_cargados - kg_sobrante) STORED,
  observacion TEXT,
  registrado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- ALIMENTOS (stock e inventario)
-- ============================================================

CREATE TABLE alimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  tipo_alimento VARCHAR(50) NOT NULL CHECK (tipo_alimento IN (
    'Balanceado granel', 'Maíz', 'Rollo', 'Fardo', 'Soja', 'Avena', 'Otro'
  )),
  movimiento VARCHAR(20) NOT NULL CHECK (movimiento IN ('Compra', 'Canje', 'Consumo', 'Stock inicial')),
  kg DECIMAL(10,2),
  precio_total DECIMAL(15,2),
  costo_kg DECIMAL(10,2),
  destino VARCHAR(30) CHECK (destino IN ('Recría', 'Feedlot', 'General')),
  lote_id UUID REFERENCES lotes(id),
  origen VARCHAR(100),                         -- Durán Miguel, Crincoli, tolva propia
  inversor VARCHAR(30),
  observacion TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- AGRICULTURA (cultivos)
-- ============================================================

CREATE TABLE cultivos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  temporada VARCHAR(20) NOT NULL,              -- "2025/26"
  cultivo VARCHAR(50) NOT NULL,                -- Avena, Soja, Maíz, Trigo
  superficie_ha DECIMAL(6,2) NOT NULL,
  fecha_siembra DATE,
  fecha_cosecha DATE,
  rendimiento_kg_ha DECIMAL(8,2),
  kg_total DECIMAL(12,2),
  destino VARCHAR(30) CHECK (destino IN ('Autoconsumo', 'Venta', 'Canje', 'Mixto')),
  precio_venta_kg DECIMAL(10,2),
  ingreso_total DECIMAL(15,2),
  observacion TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE gastos_cultivos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cultivo_id UUID REFERENCES cultivos(id),
  fecha DATE NOT NULL,
  tipo VARCHAR(50) NOT NULL,                   -- Siembra, Fertilización, Fumigación, Cosecha
  descripcion TEXT,
  monto DECIMAL(15,2) NOT NULL,
  pagado_por VARCHAR(30),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- VENTAS
-- ============================================================

CREATE TABLE ventas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  lote_id UUID NOT NULL REFERENCES lotes(id),
  cantidad INTEGER NOT NULL,
  kg_brutos DECIMAL(10,2),
  desbaste_pct DECIMAL(5,3) DEFAULT 0.08,
  kg_netos DECIMAL(10,2),
  precio_kg DECIMAL(10,2) NOT NULL,
  total_bruto DECIMAL(15,2),
  tipo VARCHAR(20) DEFAULT 'Venta' CHECK (tipo IN ('Venta', 'Baja', 'Canje')),
  comprador VARCHAR(100),
  observacion TEXT,
  registrado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- GASTOS Y COSTOS
-- ============================================================

CREATE TABLE gastos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  tipo_gasto VARCHAR(50) NOT NULL CHECK (tipo_gasto IN (
    'Alimento', 'Sanidad', 'Flete', 'Mano de obra',
    'Infraestructura', 'Agricultura', 'Combustible',
    'Administrativo', 'Otro'
  )),
  categoria VARCHAR(30) NOT NULL CHECK (categoria IN (
    'INFRAESTRUCTURA', 'AGRICOLA', 'OPERATIVO GANADERO',
    'ALIMENTOS FEEDLOT', 'SANIDAD', 'CAMPO GENERAL', 'EXCLUIR'
  )),
  descripcion TEXT NOT NULL,
  monto DECIMAL(15,2) NOT NULL,
  destino_costo VARCHAR(30),
  lote_id UUID REFERENCES lotes(id),
  medio_pago VARCHAR(30),
  pagado_por VARCHAR(30),
  inversor VARCHAR(30) CHECK (inversor IN ('Paco', 'Hernán', 'Ambos')),
  es_inversion BOOLEAN DEFAULT false,          -- infraestructura no impacta costo/kg
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SANIDAD
-- ============================================================

CREATE TABLE sanidad (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  lote_id UUID REFERENCES lotes(id),
  tipo VARCHAR(50) NOT NULL,                   -- Vacunación, Antiparasitario, Vitamina, Otro
  producto VARCHAR(100),
  dosis VARCHAR(50),
  cantidad_animales INTEGER,
  costo_total DECIMAL(15,2),
  veterinario VARCHAR(100),
  observacion TEXT,
  registrado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SALDOS INVERSORES
-- ============================================================

CREATE TABLE saldos_inversores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  inversor VARCHAR(30) NOT NULL CHECK (inversor IN ('Paco', 'Hernán')),
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('Aporte', 'Retiro', 'Distribución')),
  monto DECIMAL(15,2) NOT NULL,
  descripcion TEXT,
  referencia_gasto_id UUID REFERENCES gastos(id),
  referencia_venta_id UUID REFERENCES ventas(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- VISTAS KPI
-- ============================================================

CREATE VIEW kpi_lotes_activos AS
SELECT
  l.codigo,
  l.etapa,
  l.cantidad,
  l.kg_entrada_total,
  l.costo_compra,
  l.gastos_compra,
  l.costo_compra + COALESCE(l.gastos_compra, 0) AS costo_total_entrada,
  p.peso_prom_kg AS peso_actual,
  p.kg_total AS kg_actuales,
  p.es_estimado,
  CURRENT_DATE - l.fecha_ingreso AS dias_en_sistema,
  CURRENT_DATE - MAX(p2.fecha) AS dias_sin_pesada
FROM lotes l
LEFT JOIN LATERAL (
  SELECT * FROM pesadas WHERE lote_id = l.id ORDER BY fecha DESC LIMIT 1
) p ON true
LEFT JOIN pesadas p2 ON p2.lote_id = l.id
WHERE l.estado = 'Activo'
GROUP BY l.id, l.codigo, l.etapa, l.cantidad, l.kg_entrada_total,
         l.costo_compra, l.gastos_compra, l.fecha_ingreso,
         p.peso_prom_kg, p.kg_total, p.es_estimado;

CREATE VIEW margen_por_venta AS
SELECT
  v.fecha,
  v.lote_id,
  l.codigo AS lote_codigo,
  v.cantidad,
  v.kg_netos,
  v.precio_kg,
  v.total_bruto AS ingreso,
  l.costo_compra AS costo_compra_lote,
  v.total_bruto - l.costo_compra AS margen_bruto,
  ROUND(((v.total_bruto - l.costo_compra) / NULLIF(l.costo_compra, 0)) * 100, 2) AS rentabilidad_pct
FROM ventas v
JOIN lotes l ON l.id = v.lote_id
WHERE v.tipo = 'Venta';

-- ============================================================
-- DATOS INICIALES (CONFIG)
-- ============================================================

INSERT INTO config_sistema (clave, valor, descripcion) VALUES
  ('precio_mercado_kg', '5000', 'Precio referencia $/kg — actualizar mensualmente'),
  ('objetivo_peso_venta_kg', '340', 'Peso objetivo venta feedlot en kg'),
  ('adpv_objetivo_recria', '0.7', 'ADPV objetivo recría kg/día'),
  ('adpv_objetivo_feedlot', '1.1', 'ADPV objetivo feedlot kg/día'),
  ('costo_kg_ganado_feedlot', '2720', 'Costo histórico $/kg ganado feedlot'),
  ('costo_kg_ganado_recria', '1750', 'Costo estimado $/kg ganado recría'),
  ('dias_alerta_pesada', '20', 'Días sin pesada para disparar alerta'),
  ('desbaste_compra_pct', '3', 'Desbaste estándar en compra %'),
  ('desbaste_venta_pct', '8', 'Desbaste estándar en venta %'),
  ('comision_remate_pct', '3', 'Comisión remate %'),
  ('sanidad_costo_animal', '1987', 'Costo sanidad por animal $/animal'),
  ('flete_entrada_animal', '2857', 'Costo flete entrada por animal $');

INSERT INTO parcelas (numero, nombre, superficie_ha, tipo) VALUES
  (1, 'Parcela 1', 1.0, 'Recría'),
  (2, 'Parcela 2', 1.0, 'Recría'),
  (3, 'Parcela 3', 1.0, 'Recría'),
  (4, 'Parcela 4', 1.0, 'Recría'),
  (5, 'Parcela 5', 1.0, 'Recría'),
  (6, 'Parcela 6', 1.0, 'Recría'),
  (7, 'Parcela 7', 1.0, 'Recría'),
  (8, 'Parcela 8', 1.0, 'Recría'),
  (9, 'Adaptación', 1.0, 'Adaptación');

