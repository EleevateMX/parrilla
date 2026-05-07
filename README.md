# GTAHUB · Centro de Aprobación Creativa

Plataforma profesional para que **STAFF de GTAHUB** y la agencia **Eleevate** colaboren en la aprobación de contenido del servidor: ideas, copys, videos, eventos y activaciones.

> Diseñada como una herramienta tipo Notion / Figma para flujo creativo, con login por roles, previews de video y foto, y motor en Google Sheets + Apps Script.

---

## 🎬 Flujo del producto

1. **Eleevate** ingresa, sube ideas con descripción, link de video/imagen y los datos clave.
2. La idea entra automáticamente como **Pendiente** en la bandeja de STAFF.
3. **STAFF** abre la propuesta, ve el preview embebido (Drive / YouTube / imagen), lee la descripción, escribe comentarios y decide:
   - ✓ **Aprobar** → lista para producir
   - ↻ **Pedir cambios** → vuelve a Eleevate con notas
   - ✕ **Rechazar** → no se hace
   - ◷ **Pendiente** → vuelve a la cola
4. Todo queda registrado en una hoja de **historial** con fecha, usuario y rol.

---

## 👥 Usuarios y contraseñas (default)

> ⚠️ Cambia las contraseñas después del primer login. Se guardan hasheadas con SHA-256 en la hoja `usuarios`.

| Usuario | Contraseña | Rol | Permisos |
|---|---|---|---|
| `staff` | `staff2026` | STAFF | Ver todo, aprobar / rechazar / pedir cambios, comentar |
| `eleevate` | `eleevate2026` | ELEEVATE | Ver todo, **subir nuevas ideas**, editar las propias |
| `admin` | `admin2026` | Admin | Todo lo anterior |

---

## 🚀 Despliegue paso a paso

### 1. Subir el CSV semilla a Google Sheets

1. Abre [sheets.google.com](https://sheets.google.com) → nueva hoja en blanco.
2. Renombra el libro como **GTAHUB · Aprobación**.
3. Renombra la primera pestaña como **`items`**.
4. Archivo → Importar → Subir → arrastra `data/items.csv`.
5. Importar como: **Reemplazar hoja actual** · Separador: **Coma**.
6. Listo: tienes 70 propuestas iniciales cargadas.

### 2. Pegar el Apps Script

1. En el mismo Sheets: **Extensiones → Apps Script**.
2. Pega el contenido del archivo `apps-script/Code.gs` reemplazando todo lo que hay.
3. Guarda (💾).
4. En el editor de Apps Script, en la lista de funciones de arriba, selecciona **`setupUsuarios`** y dale **Ejecutar** ▶.
5. Acepta los permisos cuando Google los pida (es tu propio script, sin riesgo).
6. Esto crea la pestaña `usuarios` con las 3 cuentas default.

### 3. Publicar el Apps Script como API

1. En Apps Script: arriba a la derecha → **Implementar** → **Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Configuración:
   - Descripción: `GTAHUB API`
   - Ejecutar como: **Yo** (tu cuenta)
   - Quién tiene acceso: **Cualquiera** (la URL es pública pero sin auth no se devuelve nada útil)
4. Implementar → autoriza si pide permisos → copia la **URL del web app** (termina en `/exec`).

### 4. Configurar el frontend

Abre `config.js` y pega la URL en `API_URL`:

```js
window.GTAHUB_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbXX.../exec",
  ...
};
```

> Si dejas `API_URL` vacío, la app corre en **MODO DEMO** con `data/items.csv`. Útil para probar la interfaz sin el backend.

### 5. Subir a GitHub Pages

1. Crea un repo nuevo (ej: `gtahub-aprobacion`) en GitHub.
2. Sube todos los archivos del proyecto.
3. **Settings → Pages → Source: `main` / root → Save**.
4. En 1–2 minutos tendrás la app en `https://tu-usuario.github.io/gtahub-aprobacion/`.

---

## 🔐 Cambiar contraseñas

**Opción A — desde el Apps Script (recomendado):**
1. En el editor Apps Script ejecuta la función `genHash` con la nueva contraseña:
   ```js
   function genHash(plainPassword) {
     Logger.log(sha256_(plainPassword));
   }
   ```
   Edita el parámetro y ejecuta. En el log aparece el hash.
2. Pega ese hash en la columna `password_hash` de la hoja `usuarios`.

**Opción B — desde la hoja:**
1. Reemplaza el valor de `password_hash` por la contraseña en texto plano (legacy compatible).
2. La próxima vez que ese usuario entre, conviértela a hash con la opción A.

---

## ✏️ Cómo funciona el motor (resumen técnico)

- **Hoja `items`** — cada fila es una propuesta. Columnas: id, fuente, categoría, semana, día, canal, título, descripción, prioridad, deadline, **estado**, autor, tipo_media, **preview_url**, thumbnail_url, comentarios_staff, fecha_actualizacion.
- **Hoja `usuarios`** — usuario, password_hash, rol (`staff` / `eleevate` / `admin`), nombre.
- **Hoja `historial`** — log automático de todos los cambios de estado (fecha, item, estado, comentario, usuario, rol).
- **Apps Script** — expone una API JSON con endpoints:
  - `GET ?action=login` — verifica credenciales
  - `GET ?action=list` — devuelve todos los items
  - `POST {action:'update'}` — STAFF cambia estado y comentario
  - `POST {action:'create'}` — Eleevate sube idea nueva

---

## 📺 Previews de video e imagen

Eleevate solo necesita pegar el **link de Google Drive, YouTube, Vimeo o una URL de imagen** en `preview_url`. La app detecta el tipo y embebe el reproductor adecuado:

- **Google Drive** (cualquier video) → embed de `drive.google.com/file/d/.../preview`
- **YouTube** (`youtube.com/watch?v=` o `youtu.be/`) → embed con thumbnail HD automático
- **Vimeo** → player oficial
- **Imagen directa** (`.jpg`, `.png`, `.webp`) → vista grande
- **Archivo `.mp4` / `.webm`** → reproductor HTML5 nativo

La portada de la card se autocompleta con el thumbnail del video. Si quieres una imagen custom, llena `thumbnail_url`.

---

## 📋 Estructura del repo

```
gtahub-aprobacion/
├── index.html          ← Login + dashboard
├── styles.css          ← Estilo premium
├── app.js              ← Toda la lógica
├── config.js           ← API_URL ← EDITAR
├── data/
│   └── items.csv       ← Semilla de 70 propuestas
└── apps-script/
    └── Code.gs         ← Backend (pegar en Apps Script)
```

---

## ⌨️ Atajos de teclado

- `⌘K` / `Ctrl+K` — enfocar la búsqueda
- `Esc` — cerrar modal abierto

---

## 🎨 Branding

- **Rojo GTAHUB** — `#E51F1F` (acción, urgencia, estado activo)
- **Azul Eleevate** — `#3B82F6` (creatividad, propuestas)
- Tipografía: **Anton** para titulares dramáticos, **Inter** para UI, **DM Mono** para IDs

---

**v 2.0 · GTAHUB × Eleevate · 2026**
