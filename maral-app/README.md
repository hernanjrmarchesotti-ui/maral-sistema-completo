# MARAL Agropecuaria — Sistema de Gestión Ganadero
## Guía para el desarrollador

### Stack tecnológico
- **Base de datos**: PostgreSQL 15+
- **Backend**: Node.js 20+ con Express
- **Frontend/App**: React + Tailwind CSS (PWA — funciona en celular como app)
- **Hosting recomendado**: Railway.app (~$10-20 USD/mes todo incluido)
- **Autenticación**: JWT (2 usuarios: Paco y Hernán)

---

### Estructura del proyecto

```
maral-app/
├── schema.sql          ← Base de datos completa (este archivo)
├── seed.sql            ← Datos iniciales (lotes, pesadas, ventas históricas)
├── backend/
│   ├── index.js        ← Servidor Express
│   ├── routes/
│   │   ├── lotes.js
│   │   ├── pesadas.js
│   │   ├── movimientos.js
│   │   ├── alimentos.js
│   │   ├── ventas.js
│   │   ├── gastos.js
│   │   ├── parcelas.js
│   │   └── kpis.js
│   └── db.js           ← Conexión PostgreSQL
└── frontend/
    ├── src/
    │   ├── screens/
    │   │   ├── Dashboard.jsx
    │   │   ├── Lotes.jsx
    │   │   ├── CargaRapida.jsx
    │   │   ├── KPIs.jsx
    │   │   ├── Saldos.jsx
    │   │   ├── Parcelas.jsx
    │   │   └── Evaluador.jsx
    │   └── App.jsx
    └── public/
        └── manifest.json   ← PWA config

```

---

### Módulos del sistema

| Módulo | Descripción |
|--------|-------------|
| **Lotes** | Trazabilidad completa por lote. Alta, baja, división, pase entre etapas |
| **Pesadas** | Registro con cálculo automático de ADPV. Alerta si supera N días |
| **Parcelas** | 8 parcelas rotativas + 1 adaptación. Estado avena, días ocupación |
| **Feedlot** | Consumo diario, conversión alimenticia, días al objetivo |
| **Alimentos** | Stock de balanceado, maíz, rollos. Compras, canjes, consumo |
| **Agricultura** | Cultivos (avena, soja, maíz). Costos, rendimiento, destino |
| **Ventas** | Registro con margen automático por lote |
| **Gastos** | Clasificados por categoría. Separados inversión vs operativo |
| **Sanidad** | Registro por lote. Vacunas, antiparasitarios, veterinario |
| **KPIs** | ADPV, costo/kg, margen, rentabilidad — todo automático |
| **Evaluador** | Calculadora de compra en feria con datos reales del campo |
| **Saldos** | Balance Paco vs Hernán en tiempo real |

---

### KPIs automáticos calculados

- ADPV por lote (kg/día)
- Costo por kg producido (alimento + gastos / kg ganados)
- Conversión alimenticia feedlot (kg alimento / kg ganado)
- Margen bruto por lote (venta - costo total)
- Rentabilidad % por lote y global
- Días estimados al objetivo de venta
- Valor stock vivo (kg actuales × precio mercado)
- Saldo por inversor (aportes - retiros)

---

### Parámetros configurables (tabla config_sistema)

Todos editables desde la app sin tocar código:
- Precio mercado referencia/kg
- Objetivo peso venta feedlot
- ADPV objetivo recría y feedlot
- Costo/kg ganado (se actualiza con datos reales)
- Días alerta pesada
- Desbastes y comisiones estándar

---

### Reglas de negocio importantes

1. **División de lote**: cuando un lote se divide, el original queda como `lote_origen_id` en los nuevos
2. **Pesadas estimadas**: marcadas con `es_estimado = true` — no cuentan como pesada real para la alerta
3. **Gastos de infraestructura**: `es_inversion = true` — no impactan el costo/kg producido
4. **Ventas LEGADO**: lotes históricos pre-sistema con código LEG-COMP-XXX
5. **Baja sin ingreso**: tipo = 'Baja', precio_kg = 0, monto = 0

---

### Deploy en Railway

1. Crear proyecto en railway.app
2. Agregar servicio PostgreSQL
3. Agregar servicio Node.js (conectar repo GitHub)
4. Variables de entorno:
   - DATABASE_URL (la da Railway automáticamente)
   - JWT_SECRET (generar con `openssl rand -hex 32`)
   - PORT=3000
5. Correr `schema.sql` en la base de datos
6. Correr `seed.sql` para los datos iniciales

---

### Datos del negocio (contexto para el desarrollador)

- **Inversores**: Paco y Hernán (socios)
- **Propiedad**: 10 ha totales
  - 8 ha: recría rotativa en 8 parcelas de 1 ha (avena)
  - 1 ha: adaptación
  - 1 ha: feedlot (corral 40×20 + triángulo 40×5 + toril)
- **Flujo productivo**: Compra → Adaptación → Recría → Feedlot → Venta
- **Objetivo venta**: 330-350 kg
- **Stock actual**: 23 recría + 10 feedlot = 33 animales
- **Cultivos actuales**: avena (autoconsumo recría)
- **A futuro**: soja, maíz, trigo (autoconsumo + venta)

