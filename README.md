# GTAHUB · STAFF Control · Aprobación de Contenido MKT

Dashboard de aprobación para el equipo **STAFF** del servidor GTA HUB.
Centraliza las propuestas de contenido del **plan interno** (videos cortos, eventos, activaciones) y del **plan MKT externo** (calendario rotativo de 4 semanas + copys por canal) para visto bueno antes de salir al aire.

**Arquitectura:**
- 🔧 **Motor** → Google Sheets (edición colaborativa, registro de cambios)
- 🚪 **Puerta** → GitHub Pages (visualización pública para STAFF y MKT)

---

## 📦 Contenido del repo

```
gtahub-dashboard/
├── index.html        ← Dashboard (vista STAFF)
├── app.js            ← Lógica: parsing CSV, filtros, modal, aprobaciones
├── config.js         ← Configuración (URL del Sheets) ← EDITAR ESTE
├── data/
│   └── items.csv     ← CSV semilla con todos los items consolidados
└── README.md
```

---

## 🚀 Despliegue · Quick Start (5 minutos)

### 1. Subir el CSV semilla a Google Sheets

1. Abre [sheets.google.com](https://sheets.google.com) → **Hoja en blanco**.
2. Archivo → **Importar** → Subir → arrastra `data/items.csv`.
3. Tipo de importación: **Reemplazar hoja actual** · Separador: **Coma**.
4. Renombra la hoja como **`items`**.
5. Listo — tienes el motor.

### 2. Publicar el Sheets como CSV

1. En el Sheets: Archivo → **Compartir** → **Publicar en la web**.
2. Selecciona la pestaña `items` y formato **`Valores separados por comas (.csv)`**.
3. Marca **Volver a publicar automáticamente cuando se hagan cambios**.
4. **Publicar** → copia el link (termina en `output=csv`).

### 3. Configurar el dashboard

Edita `config.js`:

```js
window.GTAHUB_CONFIG = {
  SHEETS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/PEGA_AQUÍ.../pub?output=csv",
  SHEETS_EDIT_URL: "https://docs.google.com/spreadsheets/d/PEGA_ID_DEL_SHEETS/edit",
  ...
};
```

- `SHEETS_CSV_URL` → el link CSV del paso 2 (lectura).
- `SHEETS_EDIT_URL` → el link de edición normal del Sheets (lo que abre el botón "MOTOR SHEETS" y las acciones de aprobación).

### 4. Subir a GitHub Pages

1. Crea un repo nuevo (ej: `gtahub-staff-control`).
2. Sube todos los archivos.
3. Repo → **Settings → Pages** → Source: `main` / `(root)` → Save.
4. En 1–2 minutos tendrás el dashboard en `https://TU_USUARIO.github.io/gtahub-staff-control/`.

---

## 📊 Estructura del CSV

Cada fila = 1 item accionable a aprobar.

| Columna | Descripción | Valores |
|---|---|---|
| `id` | Identificador único | `GH-001`, `S1-005`, etc. |
| `fuente` | De qué propuesta viene | `GTAHUB Interno` / `Plan MKT Externo` |
| `categoria` | Tipo de item | `Video Corto`, `Activación`, `Semana Organizaciones`, etc. |
| `semana` | Semana del ciclo | `Sem 1`, `Sem 2`, `Sem 3`, `Sem 4`, `Mensual`, `Fase 1`, `-` |
| `dia` | Día específico | `Lunes`, `Martes`, ... `Sáb-Dom`, `-` |
| `canal` | Plataforma de salida | `Discord`, `Twitter`, `TikTok`, `Email`, `In-game`, `Multi`, `Servidor` |
| `titulo` | Nombre corto del item | — |
| `descripcion` | Detalle de lo que se va a producir | — |
| `prioridad` | Urgencia operativa | `Crítica` / `Alta` / `Media` / `Baja` |
| `deadline` | Fecha o ventana objetivo | Texto libre |
| `estado` | **← lo que STAFF cambia** | `Pendiente` / `Aprobado` / `Cambios` / `Rechazado` |
| `revisor` | Quién aprobó/revisó | Nombre del staff |
| `comentarios_staff` | Notas, ajustes pedidos | Texto libre |
| `fecha_actualizacion` | Timestamp último cambio | Fecha/hora |

---

## 🎮 Flujo de uso para STAFF

1. STAFF entra al dashboard (URL de GitHub Pages).
2. Ve la cola de items por aprobar — filtra por **estado / prioridad / canal / semana** o busca por texto.
3. Click en una fila → abre **modal con detalle completo** del item.
4. Decide:
   - ✓ **Aprobar** → listo para producir
   - ↻ **Pedir cambios** → escribe nota y devuelve a MKT
   - ✕ **Rechazar** → no se hace
   - ◌ **Pendiente** → vuelve a la cola
5. Cualquiera de las acciones **abre el Google Sheets en una pestaña nueva** posicionado en el item, para que STAFF aplique el cambio al motor real.
6. La UI muestra el cambio inmediatamente (override local en `localStorage`) hasta el siguiente `SYNC` que jala datos frescos del Sheets.

---

## 📋 Items consolidados en el CSV semilla

**De la propuesta GTAHUB interna (.docx):**
- 8 videos cortos mensuales (TikTok, formato sketch + orgánico, contenido original)
- 5 activaciones / eventos (Car Show, Boat Show, Noche bélica, Noche de ruta, Evento temático)

**Del Plan MKT externo (calendario rotativo):**
- 6 items de Setup / Fase 1 (canales, segmentación, sistema de códigos, dashboards)
- 13 items de Semana 1 — Organizaciones
- 15 items de Semana 2 — Facciones Legales
- 13 items de Semana 3 — Fin de Semana HUBCoins
- 6 items de Semana 4 — Evento Temático
- 4 roles de equipo

**Total: 70 items en cola.** Edita, agrega o elimina filas en el Sheets — el dashboard se actualiza con `SYNC`.

---

## ⚙️ Modos de configuración

En `config.js`:

```js
APPROVAL_MODE: "sheets"  // recomendado
```
Cada acción de STAFF abre el Sheets en pestaña nueva para aplicar el cambio en el motor.

```js
APPROVAL_MODE: "local"
```
Solo cambia el estado en el navegador (preview, no persiste en el motor). Útil para demos.

```js
AUTO_REFRESH_SECONDS: 0   // o 60, 120, 300...
```
Si lo pones en `60`, el dashboard hace SYNC automático cada minuto.

---

## 🛠️ Mantenimiento

**Agregar item nuevo:** abre el Sheets, agrega fila al final con `id` único (ej: `S1-014`). El dashboard lo verá al siguiente SYNC.

**Cambiar la propuesta semilla:** edita `data/items.csv` y vuelve a importar al Sheets.

**Cambiar estética:** los colores y tipografía están en variables CSS al inicio de `index.html` (sección `:root`). Editar ahí.

---

## 🔐 Notas de seguridad

- El Sheets publicado es **lectura pública** (cualquiera con el link CSV lo lee). No pongas datos sensibles ahí.
- La edición del Sheets sigue restringida a quien tenga permisos. El dashboard solo lee.
- `localStorage` guarda los overrides de cada navegador — si STAFF cambia de equipo, no ve los overrides locales del otro.

---

**v1.0 · GTAHUB Staff Control**
Motor: Google Sheets · Puerta: GitHub Pages
