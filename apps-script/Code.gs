/**
 * GTAHUB · CENTRO DE APROBACIÓN CREATIVA
 * Apps Script — API REST sobre Google Sheets
 * 
 * Endpoints (vía doGet con ?action=...):
 *   ?action=login&user=USR&pass=PWD       → autenticación
 *   ?action=list                          → lista todos los items
 *   ?action=get&id=GH-001                 → un item específico
 * 
 * Endpoint POST (doPost con JSON body):
 *   { action: 'update', id, estado, comentario, revisor }
 *   { action: 'create', titulo, descripcion, ... }   ← solo rol Eleevate
 * 
 * INSTALACIÓN:
 *  1. Abre el Sheets que contiene la pestaña "items".
 *  2. Extensiones → Apps Script → pega este código.
 *  3. Crea otra pestaña "usuarios" con columnas: usuario, password_hash, rol, nombre.
 *  4. Implementar (Deploy) → Aplicación web → Ejecutar como: yo · Acceso: Cualquiera.
 *  5. Copia la URL /exec resultante y pégala en config.js como API_URL.
 */

const SHEET_ITEMS = 'items';
const SHEET_USERS = 'usuarios';
const SHEET_LOG   = 'historial';

const ITEM_HEADERS = [
  'id','fuente','categoria','semana','dia','canal','titulo','descripcion',
  'prioridad','deadline','estado','autor','tipo_media','preview_url',
  'thumbnail_url','comentarios_staff','fecha_actualizacion'
];

/* ============================================================
   ENTRY POINTS
   ============================================================ */

function doGet(e) {
  try {
    const action = (e.parameter.action || 'list').toLowerCase();

    if (action === 'login') {
      return jsonOut(login_(e.parameter.user, e.parameter.pass));
    }
    if (action === 'list') {
      return jsonOut({ ok: true, items: listItems_() });
    }
    if (action === 'get') {
      return jsonOut({ ok: true, item: getItem_(e.parameter.id) });
    }
    if (action === 'ping') {
      return jsonOut({ ok: true, time: new Date().toISOString() });
    }
    return jsonOut({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = (body.action || '').toLowerCase();
    const session = body.session || {};
    if (!verifySession_(session)) {
      return jsonOut({ ok: false, error: 'no_session' });
    }

    if (action === 'update') {
      return jsonOut(updateItem_(body, session));
    }
    if (action === 'create') {
      if (session.rol !== 'eleevate' && session.rol !== 'admin') {
        return jsonOut({ ok: false, error: 'forbidden' });
      }
      return jsonOut(createItem_(body, session));
    }
    return jsonOut({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

/* ============================================================
   AUTH
   ============================================================ */

function login_(user, pass) {
  if (!user || !pass) return { ok: false, error: 'missing_credentials' };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_USERS);
  if (!sh) return { ok: false, error: 'no_users_sheet' };

  const data = sh.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase());
  const iU = headers.indexOf('usuario');
  const iP = headers.indexOf('password_hash');
  const iR = headers.indexOf('rol');
  const iN = headers.indexOf('nombre');

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[iU]).toLowerCase() === user.toLowerCase()) {
      const stored = String(row[iP]);
      const incoming = sha256_(pass);
      if (stored === incoming || stored === pass /* legacy plaintext */) {
        return {
          ok: true,
          session: {
            user: row[iU],
            nombre: row[iN] || row[iU],
            rol: String(row[iR]).toLowerCase(),
            token: sha256_(row[iU] + ':' + Date.now()),
            ts: Date.now()
          }
        };
      }
      return { ok: false, error: 'wrong_password' };
    }
  }
  return { ok: false, error: 'user_not_found' };
}

function verifySession_(session) {
  // Sesión simple: si trae user y rol válidos, OK.
  // Para producción real deberías guardar tokens server-side.
  if (!session || !session.user || !session.rol) return false;
  return ['staff','eleevate','admin'].indexOf(session.rol) !== -1;
}

function sha256_(text) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return raw.map(b => ((b < 0 ? b + 256 : b)).toString(16).padStart(2,'0')).join('');
}

/* ============================================================
   ITEMS · READ
   ============================================================ */

function listItems_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ITEMS);
  if (!sh) return [];
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h).trim());
  return data.slice(1)
    .filter(r => r.some(c => c !== '' && c !== null))
    .map(r => {
      const o = {};
      headers.forEach((h, i) => { o[h] = r[i] === null || r[i] === undefined ? '' : String(r[i]); });
      return o;
    });
}

function getItem_(id) {
  const items = listItems_();
  return items.find(it => it.id === id) || null;
}

/* ============================================================
   ITEMS · WRITE
   ============================================================ */

function updateItem_(body, session) {
  const id = body.id;
  if (!id) return { ok: false, error: 'no_id' };
  const allowed = ['Pendiente','Aprobado','Cambios','Rechazado'];
  if (allowed.indexOf(body.estado) === -1) return { ok: false, error: 'bad_estado' };

  // Solo STAFF/admin pueden cambiar estado
  if (session.rol !== 'staff' && session.rol !== 'admin') {
    return { ok: false, error: 'forbidden_role' };
  }

  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ITEMS);
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const iId = headers.indexOf('id');
  const iEs = headers.indexOf('estado');
  const iCm = headers.indexOf('comentarios_staff');
  const iFa = headers.indexOf('fecha_actualizacion');

  for (let i = 1; i < data.length; i++) {
    if (data[i][iId] === id) {
      sh.getRange(i+1, iEs+1).setValue(body.estado);
      if (typeof body.comentario === 'string') {
        sh.getRange(i+1, iCm+1).setValue(body.comentario);
      }
      const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
      sh.getRange(i+1, iFa+1).setValue(stamp + ' · ' + (session.nombre || session.user));
      logChange_(id, body.estado, body.comentario, session);
      return { ok: true, id, estado: body.estado, fecha: stamp };
    }
  }
  return { ok: false, error: 'not_found' };
}

function createItem_(body, session) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ITEMS);
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());

  // generar ID nuevo: NEW-XXX
  const ids = data.slice(1).map(r => String(r[headers.indexOf('id')] || ''));
  let n = 1;
  while (ids.indexOf('NEW-' + String(n).padStart(3,'0')) !== -1) n++;
  const newId = 'NEW-' + String(n).padStart(3,'0');

  const obj = {
    id: newId,
    fuente: body.fuente || 'Idea Nueva',
    categoria: body.categoria || 'Sin categoría',
    semana: body.semana || '-',
    dia: body.dia || '-',
    canal: body.canal || '-',
    titulo: body.titulo || 'Sin título',
    descripcion: body.descripcion || '',
    prioridad: body.prioridad || 'Media',
    deadline: body.deadline || '',
    estado: 'Pendiente',
    autor: session.nombre || session.user || 'Eleevate',
    tipo_media: body.tipo_media || 'documento',
    preview_url: body.preview_url || '',
    thumbnail_url: body.thumbnail_url || '',
    comentarios_staff: '',
    fecha_actualizacion: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') + ' · creado por ' + (session.nombre || session.user)
  };

  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sh.appendRow(row);
  logChange_(newId, 'Pendiente', 'Idea creada', session);
  return { ok: true, id: newId, item: obj };
}

function logChange_(id, estado, comentario, session) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let log = ss.getSheetByName(SHEET_LOG);
  if (!log) {
    log = ss.insertSheet(SHEET_LOG);
    log.appendRow(['fecha','id_item','estado','comentario','usuario','rol']);
  }
  log.appendRow([
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    id, estado, comentario || '', session.user, session.rol
  ]);
}

/* ============================================================
   HELPERS
   ============================================================ */

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
   SETUP HELPER · ejecuta una vez para crear hoja de usuarios
   ============================================================ */

function setupUsuarios() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_USERS);
  if (!sh) sh = ss.insertSheet(SHEET_USERS);
  sh.clear();
  sh.appendRow(['usuario','password_hash','rol','nombre']);
  // Usuarios por defecto — CAMBIA LAS CONTRASEÑAS EN PRODUCCIÓN
  sh.appendRow(['staff', sha256_('staff2026'), 'staff', 'Equipo STAFF GTAHUB']);
  sh.appendRow(['eleevate', sha256_('eleevate2026'), 'eleevate', 'Eleevate Marketing']);
  sh.appendRow(['admin', sha256_('admin2026'), 'admin', 'Administrador']);
  SpreadsheetApp.getUi().alert('Hoja "usuarios" creada con 3 cuentas. Recuerda cambiar las contraseñas.');
}

/* Cambiar contraseña: cambia el password en la columna password_hash
   por el resultado de SHA256 del nuevo password. Puedes usar:    */
function genHash(plainPassword) {
  Logger.log(sha256_(plainPassword));
}
