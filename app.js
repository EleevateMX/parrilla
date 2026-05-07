/* =====================================================
   GTAHUB · Centro de Aprobación Creativa · App
   ===================================================== */

const CFG = window.GTAHUB_CONFIG || {};
const DEMO_MODE = !CFG.API_URL;

const STATE = {
  session: null,
  items: [],
  filtered: [],
  filters: { state: '', cat: '', channel: '', priority: '', week: '' },
  search: '',
  view: 'grid',
  selected: null,
};

/* =====================================================
   PARTICLES — leve y elegante (no spammy)
   ===================================================== */
(function particles() {
  const c = document.getElementById('particles');
  if (!c) return;
  const ctx = c.getContext('2d');
  let w, h, ps = [];
  function resize() {
    w = c.width = window.innerWidth * devicePixelRatio;
    h = c.height = window.innerHeight * devicePixelRatio;
    c.style.width = window.innerWidth + 'px';
    c.style.height = window.innerHeight + 'px';
  }
  function init() {
    resize();
    const N = Math.min(80, Math.floor(window.innerWidth / 18));
    ps = [];
    for (let i = 0; i < N; i++) {
      ps.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: (Math.random() * 1.5 + 0.4) * devicePixelRatio,
        vx: (Math.random() - 0.5) * 0.18 * devicePixelRatio,
        vy: (Math.random() - 0.5) * 0.18 * devicePixelRatio,
        a: Math.random() * 0.4 + 0.15,
        hue: Math.random() < 0.5 ? 'red' : 'blue',
      });
    }
  }
  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const p of ps) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.hue === 'red'
        ? `rgba(229,31,31,${p.a})`
        : `rgba(96,165,250,${p.a})`;
      ctx.fill();
    }
    // line connections
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const dx = ps[i].x - ps[j].x;
        const dy = ps[i].y - ps[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const max = 130 * devicePixelRatio;
        if (d < max) {
          ctx.beginPath();
          ctx.moveTo(ps[i].x, ps[i].y);
          ctx.lineTo(ps[j].x, ps[j].y);
          ctx.strokeStyle = `rgba(255,255,255,${0.06 * (1 - d / max)})`;
          ctx.lineWidth = 0.5 * devicePixelRatio;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(tick);
  }
  init();
  window.addEventListener('resize', init);
  tick();
})();

/* =====================================================
   LOGIN
   ===================================================== */
function bindLogin() {
  const form = document.getElementById('loginForm');
  const card = document.querySelector('.login-card');
  const errEl = document.getElementById('loginError');
  const userInput = document.getElementById('loginUser');
  const passInput = document.getElementById('loginPass');
  let role = 'staff';

  // role pills
  document.querySelectorAll('.role-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.role-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      role = pill.dataset.role;
      // hint del campo usuario
      userInput.placeholder = role === 'staff' ? 'staff' : 'eleevate';
    });
  });

  // mouse-follow glow
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.textContent = '';
    const user = userInput.value.trim();
    const pass = passInput.value;
    if (!user || !pass) { errEl.textContent = 'Completa usuario y contraseña.'; return; }

    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.querySelector('.btn-primary-label').textContent = 'Verificando…';

    try {
      const res = await apiLogin(user, pass);
      if (res.ok) {
        // verificar que el rol declarado coincida con el real
        if (res.session.rol !== role && res.session.rol !== 'admin') {
          errEl.textContent = `Tu cuenta es de tipo "${res.session.rol.toUpperCase()}", cambia la pestaña arriba.`;
          btn.disabled = false;
          btn.querySelector('.btn-primary-label').textContent = 'Ingresar';
          return;
        }
        STATE.session = res.session;
        sessionStorage.setItem('gtahub_session', JSON.stringify(res.session));
        enterApp();
      } else {
        errEl.textContent = friendlyError(res.error);
        btn.disabled = false;
        btn.querySelector('.btn-primary-label').textContent = 'Ingresar';
      }
    } catch (err) {
      errEl.textContent = 'Error de conexión. Intenta de nuevo.';
      btn.disabled = false;
      btn.querySelector('.btn-primary-label').textContent = 'Ingresar';
    }
  });
}

function friendlyError(code) {
  const map = {
    'user_not_found': 'Usuario no registrado.',
    'wrong_password': 'Contraseña incorrecta.',
    'missing_credentials': 'Faltan datos.',
    'no_users_sheet': 'Sistema no inicializado. Contacta al admin.',
  };
  return map[code] || 'No se pudo iniciar sesión.';
}

/* =====================================================
   API · login + items (Apps Script o demo CSV)
   ===================================================== */
async function apiLogin(user, pass) {
  if (DEMO_MODE) {
    // Demo accounts (solo para preview local sin Apps Script)
    const demo = {
      staff: { pass: 'staff2026', rol: 'staff', nombre: 'Equipo STAFF GTAHUB' },
      eleevate: { pass: 'eleevate2026', rol: 'eleevate', nombre: 'Eleevate Marketing' },
    };
    const u = demo[user.toLowerCase()];
    if (!u) return { ok: false, error: 'user_not_found' };
    if (u.pass !== pass) return { ok: false, error: 'wrong_password' };
    return { ok: true, session: { user, nombre: u.nombre, rol: u.rol, token: 'demo', ts: Date.now() } };
  }
  const url = `${CFG.API_URL}?action=login&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}`;
  const res = await fetch(url);
  return res.json();
}

async function apiList() {
  if (DEMO_MODE) {
    const res = await fetch(CFG.DEMO_CSV, { cache: 'no-store' });
    const text = await res.text();
    return { ok: true, items: parseCSV(text) };
  }
  const res = await fetch(`${CFG.API_URL}?action=list`);
  return res.json();
}

async function apiUpdate(id, estado, comentario) {
  if (DEMO_MODE) {
    // override local
    const ovKey = 'gtahub_demo_overrides';
    const ov = JSON.parse(localStorage.getItem(ovKey) || '{}');
    ov[id] = { estado, comentario, fecha: new Date().toLocaleString('es-MX', { hour12: false }) };
    localStorage.setItem(ovKey, JSON.stringify(ov));
    return { ok: true, demo: true };
  }
  const res = await fetch(CFG.API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'update', id, estado, comentario, session: STATE.session }),
  });
  return res.json();
}

async function apiCreate(payload) {
  if (DEMO_MODE) {
    return { ok: false, error: 'demo_no_create' };
  }
  const res = await fetch(CFG.API_URL, {
    method: 'POST',
    body: JSON.stringify(Object.assign({ action: 'create', session: STATE.session }, payload)),
  });
  return res.json();
}

/* =====================================================
   CSV PARSER (tolerante a comas dentro de comillas)
   ===================================================== */
function parseCSV(text) {
  const rows = [];
  let cur = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
      else if (c === '\r') {}
      else field += c;
    }
  }
  if (field || cur.length) { cur.push(field); rows.push(cur); }
  if (!rows.length) return [];
  const heads = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.some(v => v.trim() !== ''))
    .map(r => {
      const o = {};
      heads.forEach((h, i) => { o[h] = (r[i] || '').trim(); });
      if (!o.estado) o.estado = 'Pendiente';
      return o;
    });
}

/* =====================================================
   ENTER APP
   ===================================================== */
async function enterApp() {
  document.getElementById('loginView').hidden = true;
  document.getElementById('appView').hidden = false;

  // user chip
  const u = STATE.session;
  const av = document.getElementById('userAvatar');
  const ch = document.getElementById('userChip');
  document.getElementById('userName').textContent = u.nombre || u.user;
  document.getElementById('userRole').textContent = u.rol.toUpperCase();
  av.textContent = (u.nombre || u.user).charAt(0).toUpperCase();
  ch.dataset.role = u.rol;

  // botón Nueva sólo para Eleevate
  const btnNew = document.getElementById('btnNew');
  btnNew.hidden = !(u.rol === 'eleevate' || u.rol === 'admin');

  // demo overrides para preview sin AppsScript
  await loadAndRender();
}

async function loadAndRender() {
  const r = await apiList();
  if (!r.ok) {
    showToast('Error al cargar propuestas', 'error');
    return;
  }
  let items = r.items;

  // aplicar overrides demo
  if (DEMO_MODE) {
    const ov = JSON.parse(localStorage.getItem('gtahub_demo_overrides') || '{}');
    items.forEach(it => {
      if (ov[it.id]) {
        it.estado = ov[it.id].estado;
        if (ov[it.id].comentario) it.comentarios_staff = ov[it.id].comentario;
        it.fecha_actualizacion = ov[it.id].fecha + ' · (demo)';
      }
    });
  }

  STATE.items = items;
  populateNavCategorias();
  populateNavCanales();
  populateWeekFilter();
  applyFilters();
  document.getElementById('lastSync').textContent =
    'Sincronizado ' + new Date().toLocaleTimeString('es-MX', { hour12: false });
}

/* =====================================================
   FILTERS / NAV
   ===================================================== */
function populateNavCategorias() {
  const el = document.getElementById('navCategorias');
  const counts = {};
  STATE.items.forEach(it => { const k = it.categoria || '—'; counts[k] = (counts[k] || 0) + 1; });
  el.innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `
      <button class="nav-item" data-filter="cat" data-value="${escAttr(k)}">
        <span class="nav-dot"></span>${escHtml(k)}<span class="nav-count">${v}</span>
      </button>
    `).join('');
  bindNavButtons();
}

function populateNavCanales() {
  const el = document.getElementById('navCanales');
  const counts = {};
  STATE.items.forEach(it => { const k = it.canal || '—'; counts[k] = (counts[k] || 0) + 1; });
  el.innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `
      <button class="nav-item" data-filter="channel" data-value="${escAttr(k)}">
        <span class="nav-dot"></span>${escHtml(k)}<span class="nav-count">${v}</span>
      </button>
    `).join('');
  bindNavButtons();
}

function populateWeekFilter() {
  const sel = document.getElementById('filterSemana');
  const set = new Set();
  STATE.items.forEach(it => { if (it.semana) set.add(it.semana); });
  const cur = sel.value;
  sel.innerHTML = '<option value="">Toda semana</option>' +
    [...set].sort().map(s => `<option value="${escAttr(s)}">${escHtml(s)}</option>`).join('');
  sel.value = cur;
}

function bindNavButtons() {
  document.querySelectorAll('.nav-item').forEach(b => {
    b.onclick = () => {
      const f = b.dataset.filter, v = b.dataset.value;
      // toggle
      if (STATE.filters[f] === v) STATE.filters[f] = '';
      else STATE.filters[f] = v;
      // ui
      document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
      // marcar todos los activos según STATE.filters
      ['state','cat','channel'].forEach(k => {
        if (STATE.filters[k]) {
          const sel = `.nav-item[data-filter="${k}"][data-value="${cssEsc(STATE.filters[k])}"]`;
          const el = document.querySelector(sel);
          if (el) el.classList.add('active');
        }
      });
      // si todo vacio, marca el "Todo"
      if (!STATE.filters.state && !STATE.filters.cat && !STATE.filters.channel) {
        const el = document.querySelector('.nav-item[data-filter="state"][data-value=""]');
        if (el) el.classList.add('active');
      }
      applyFilters();
    };
  });
}

function applyFilters() {
  const s = STATE.search.trim().toLowerCase();
  const f = STATE.filters;
  STATE.filtered = STATE.items.filter(it => {
    if (f.state && it.estado !== f.state) return false;
    if (f.cat && it.categoria !== f.cat) return false;
    if (f.channel && it.canal !== f.channel) return false;
    if (f.priority && it.prioridad !== f.priority) return false;
    if (f.week && it.semana !== f.week) return false;
    if (s) {
      const blob = `${it.id} ${it.titulo} ${it.descripcion} ${it.canal} ${it.categoria} ${it.autor||''}`.toLowerCase();
      if (!blob.includes(s)) return false;
    }
    return true;
  });
  renderKPIs();
  renderHeader();
  renderContent();
}

function renderKPIs() {
  const cnts = { Pendiente: 0, Aprobado: 0, Cambios: 0, Rechazado: 0 };
  STATE.items.forEach(it => { cnts[it.estado] = (cnts[it.estado] || 0) + 1; });
  document.getElementById('cntAll').textContent = STATE.items.length;
  document.getElementById('cntPending').textContent = cnts.Pendiente;
  document.getElementById('cntApproved').textContent = cnts.Aprobado;
  document.getElementById('cntChanges').textContent = cnts.Cambios;
  document.getElementById('cntRejected').textContent = cnts.Rechazado;

  const row = document.getElementById('kpiRow');
  const tiles = [
    { n: STATE.items.length, l: 'Total propuestas', c: 'rgba(255,255,255,0.7)', bg: 'rgba(255,255,255,0.07)', i: '◆' },
    { n: cnts.Pendiente, l: 'En cola',        c: 'var(--st-pending)',  bg: 'rgba(255,180,0,0.12)',  i: '◷' },
    { n: cnts.Aprobado,  l: 'Aprobados',      c: 'var(--st-approved)', bg: 'rgba(34,197,94,0.12)', i: '✓' },
    { n: cnts.Cambios,   l: 'Con cambios',    c: 'var(--st-changes)',  bg: 'rgba(96,165,250,0.12)', i: '↻' },
  ];
  row.innerHTML = tiles.map(t => `
    <div class="kpi" style="--kpi-color:${t.c};--kpi-bg:${t.bg};">
      <div class="kpi-icon" style="color:${t.c};background:${t.bg};">${t.i}</div>
      <div class="kpi-text">
        <div class="kpi-num">${t.n}</div>
        <div class="kpi-lbl">${t.l}</div>
      </div>
    </div>
  `).join('');
}

function renderHeader() {
  const f = STATE.filters;
  let title = 'Todas las propuestas';
  let eyebrow = 'Bandeja de aprobación';
  if (f.state) { title = `Propuestas · ${f.state}`; eyebrow = 'Filtrado por estado'; }
  if (f.cat)    { title = f.cat;    eyebrow = 'Categoría'; }
  if (f.channel){ title = f.channel; eyebrow = 'Canal'; }
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageEyebrow').textContent = eyebrow;
  document.getElementById('visibleMeta').textContent = `${STATE.filtered.length} propuesta${STATE.filtered.length !== 1 ? 's' : ''}`;
}

/* =====================================================
   CONTENT — grid / list
   ===================================================== */
function renderContent() {
  const grid = document.getElementById('contentGrid');
  const empty = document.getElementById('emptyBlock');
  grid.classList.toggle('list', STATE.view === 'list');

  if (!STATE.filtered.length) {
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  if (STATE.view === 'grid') {
    grid.innerHTML = STATE.filtered.map((it, idx) => cardHtml(it, idx)).join('');
  } else {
    grid.innerHTML = STATE.filtered.map((it, idx) => rowHtml(it, idx)).join('');
  }

  grid.querySelectorAll('[data-id]').forEach(el => {
    el.onclick = () => openItem(el.dataset.id);
  });
}

function cardHtml(it, idx) {
  const stKey = stateKey(it.estado);
  const thumb = thumbHtml(it);
  return `
    <div class="card" data-id="${escAttr(it.id)}" style="animation-delay:${Math.min(idx * 25, 400)}ms;">
      <div class="card-thumb">
        ${thumb}
        <span class="card-thumb-tag">${escHtml((it.tipo_media || '—').toUpperCase())}</span>
        <span class="card-thumb-channel">${escHtml(it.canal || '—')}</span>
        <div class="card-thumb-overlay"></div>
      </div>
      <div class="card-body">
        <div class="card-row">
          <span class="card-id">${escHtml(it.id)}</span>
          <span class="card-cat">${escHtml(it.categoria || '')}</span>
        </div>
        <div class="card-title">${escHtml(it.titulo)}</div>
        <div class="card-desc">${escHtml(it.descripcion)}</div>
        <div class="card-foot">
          <div class="card-foot-left">
            <span class="badge badge--${stKey}">${escHtml(it.estado)}</span>
            <span class="prio--${escAttr(it.prioridad)}" style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">· ${escHtml(it.prioridad)}</span>
          </div>
          <div class="card-author"><span class="author-dot"></span>${escHtml(it.autor || '—')}</div>
        </div>
      </div>
    </div>
  `;
}

function rowHtml(it, idx) {
  const stKey = stateKey(it.estado);
  return `
    <div class="row" data-id="${escAttr(it.id)}" style="animation-delay:${Math.min(idx * 12, 250)}ms;">
      <div class="row-thumb">${rowThumbHtml(it)}</div>
      <span class="row-id">${escHtml(it.id)}</span>
      <div class="row-mid">
        <div class="row-title">${escHtml(it.titulo)}</div>
        <div class="row-sub">${escHtml(it.categoria)} · ${escHtml(it.semana || '')} ${escHtml(it.dia || '')}</div>
      </div>
      <span class="row-channel">${escHtml(it.canal || '—')}</span>
      <span class="row-week">${escHtml(it.deadline || '')}</span>
      <span class="row-prio prio--${escAttr(it.prioridad)}">${escHtml(it.prioridad)}</span>
      <span class="badge badge--${stKey}">${escHtml(it.estado)}</span>
    </div>
  `;
}

function thumbHtml(it) {
  const mediaInfo = mediaInfoFor(it);
  if (mediaInfo.thumb) {
    return `<img src="${escAttr(mediaInfo.thumb)}" alt="" loading="lazy" onerror="this.parentElement.innerHTML=this.dataset.fb;" data-fb='${placeholderHtml(it).replace(/'/g, "&#39;")}'/>${mediaInfo.isVideo ? '<div class="card-thumb-play"><div class="card-thumb-play-inner"><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div></div>' : ''}`;
  }
  return placeholderHtml(it);
}

function rowThumbHtml(it) {
  const mediaInfo = mediaInfoFor(it);
  if (mediaInfo.thumb) return `<img src="${escAttr(mediaInfo.thumb)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;row-thumb-ph&quot;>${initials(it)}</div>'"/>`;
  return `<div class="row-thumb-ph">${initials(it)}</div>`;
}

function placeholderHtml(it) {
  return `<div class="card-thumb-placeholder">${initials(it)}</div>`;
}

function initials(it) {
  const map = { 'video':'▶', 'imagen':'◧', 'copy':'¶', 'evento':'★', 'documento':'◐' };
  return map[(it.tipo_media || '').toLowerCase()] || (it.id || '·').split('-').pop();
}

function stateKey(estado) {
  return { 'Pendiente':'pending','Aprobado':'approved','Cambios':'changes','Rechazado':'rejected' }[estado] || 'pending';
}

/* =====================================================
   MEDIA PREVIEW · video Drive/YouTube + imagen
   ===================================================== */
function mediaInfoFor(it) {
  const url = (it.preview_url || '').trim();
  const thumbExplicit = (it.thumbnail_url || '').trim();
  const tipo = (it.tipo_media || '').toLowerCase();
  let isVideo = tipo === 'video';
  let embed = '', thumb = thumbExplicit;

  if (!url) return { isVideo, embed: '', thumb };

  // Google Drive
  let m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/) ||
          url.match(/drive\.google\.com\/open\?id=([^&]+)/) ||
          url.match(/[?&]id=([^&]+)/);
  if (m) {
    const id = m[1];
    embed = `https://drive.google.com/file/d/${id}/preview`;
    if (!thumb) thumb = `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
    isVideo = true;
    return { isVideo, embed, thumb, kind: 'drive' };
  }

  // YouTube
  m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (m) {
    const id = m[1];
    embed = `https://www.youtube.com/embed/${id}`;
    if (!thumb) thumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    isVideo = true;
    return { isVideo, embed, thumb, kind: 'yt' };
  }

  // Vimeo
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) {
    const id = m[1];
    embed = `https://player.vimeo.com/video/${id}`;
    isVideo = true;
    return { isVideo, embed, thumb, kind: 'vimeo' };
  }

  // imagen directa
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|#|$)/i.test(url)) {
    return { isVideo: false, embed: '', thumb: thumb || url, image: url, kind: 'img' };
  }

  // archivo de video directo
  if (/\.(mp4|webm|mov)(\?|#|$)/i.test(url)) {
    return { isVideo: true, embed: '', thumb, videoSrc: url, kind: 'mp4' };
  }

  // genérico — solo link
  return { isVideo, embed: '', thumb, link: url, kind: 'link' };
}

/* =====================================================
   MODAL · DETALLE
   ===================================================== */
function openItem(id) {
  const it = STATE.items.find(x => x.id === id);
  if (!it) return;
  STATE.selected = it;

  document.getElementById('modalId').textContent = it.id;
  document.getElementById('modalTitle').textContent = it.titulo;
  document.getElementById('modalDesc').textContent = it.descripcion || '—';
  document.getElementById('modalFuente').textContent = it.fuente || '—';
  document.getElementById('modalCategoria').textContent = it.categoria || '—';
  document.getElementById('modalCanal').textContent = it.canal || '—';
  document.getElementById('modalSemDia').textContent = `${it.semana || '—'} · ${it.dia || '—'}`;
  document.getElementById('modalPrioridad').textContent = it.prioridad || '—';
  document.getElementById('modalDeadline').textContent = it.deadline || '—';
  document.getElementById('modalAutor').textContent = it.autor || '—';
  document.getElementById('modalTipo').textContent = (it.tipo_media || '—').toUpperCase();
  document.getElementById('modalComment').value = it.comentarios_staff || '';
  document.getElementById('modalUpdate').textContent = it.fecha_actualizacion || 'Sin movimientos.';

  const eb = document.getElementById('modalEstadoBadge');
  eb.className = 'badge badge--' + stateKey(it.estado);
  eb.textContent = it.estado;

  // preview
  renderPreview(it);
  // actions por rol
  renderActions();

  document.getElementById('modalBack').hidden = false;
}

function renderPreview(it) {
  const wrap = document.getElementById('modalPreview');
  const m = mediaInfoFor(it);
  if (m.embed) {
    wrap.innerHTML = `<iframe src="${escAttr(m.embed)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    return;
  }
  if (m.videoSrc) {
    wrap.innerHTML = `<video src="${escAttr(m.videoSrc)}" controls preload="metadata"></video>`;
    return;
  }
  if (m.image) {
    wrap.innerHTML = `<img src="${escAttr(m.image)}" alt="${escAttr(it.titulo)}" />`;
    return;
  }
  if (m.link) {
    wrap.innerHTML = `
      <div class="modal-preview-empty">
        <div class="modal-preview-empty-mark">↗</div>
        <div class="modal-preview-empty-text">Recurso externo</div>
        <small><a href="${escAttr(m.link)}" target="_blank" rel="noopener" style="color:var(--gta-red-2);">Abrir en nueva pestaña</a></small>
      </div>`;
    return;
  }
  // sin preview
  const sym = { 'copy':'¶','evento':'★','documento':'◐','imagen':'◧','video':'▶' }[(it.tipo_media || '').toLowerCase()] || '◇';
  wrap.innerHTML = `
    <div class="modal-preview-empty">
      <div class="modal-preview-empty-mark">${sym}</div>
      <div class="modal-preview-empty-text">${escHtml((it.tipo_media || 'PROPUESTA').toUpperCase())}</div>
      <small>Esta propuesta no tiene archivo adjunto. Eleevate puede agregarlo editando la idea.</small>
    </div>`;
}

function renderActions() {
  const wrap = document.getElementById('modalActions');
  const rol = STATE.session.rol;
  if (rol === 'staff' || rol === 'admin') {
    wrap.className = 'modal-actions';
    wrap.innerHTML = `
      <button class="act-btn act-btn--approve" data-act="Aprobado">✓ Aprobar</button>
      <button class="act-btn act-btn--changes" data-act="Cambios">↻ Cambios</button>
      <button class="act-btn act-btn--reject" data-act="Rechazado">✕ Rechazar</button>
      <button class="act-btn act-btn--pending" data-act="Pendiente">◷ Pendiente</button>
    `;
    wrap.querySelectorAll('.act-btn').forEach(b => {
      b.onclick = () => doAction(b.dataset.act);
    });
  } else {
    wrap.className = 'modal-actions modal-actions--readonly';
    wrap.innerHTML = `Como Eleevate puedes proponer y editar tus ideas, pero la aprobación corresponde a STAFF.`;
  }
}

async function doAction(estado) {
  const it = STATE.selected;
  if (!it) return;
  const comentario = document.getElementById('modalComment').value.trim();
  const buttons = document.querySelectorAll('.act-btn');
  buttons.forEach(b => b.disabled = true);

  const r = await apiUpdate(it.id, estado, comentario);
  if (r && r.ok) {
    it.estado = estado;
    it.comentarios_staff = comentario;
    it.fecha_actualizacion = new Date().toLocaleString('es-MX', { hour12: false }) + ' · ' + (STATE.session.nombre || STATE.session.user);
    closeModal();
    applyFilters();
    showToast(`Propuesta marcada como ${estado}`, 'success');
  } else {
    showToast('No se pudo actualizar', 'error');
    buttons.forEach(b => b.disabled = false);
  }
}

function closeModal() {
  document.getElementById('modalBack').hidden = true;
  document.getElementById('modalPreview').innerHTML = '';
  STATE.selected = null;
}

/* =====================================================
   NUEVA IDEA
   ===================================================== */
function bindNewIdea() {
  document.getElementById('btnNew').onclick = () => {
    document.getElementById('newBack').hidden = false;
  };
  document.getElementById('newClose').onclick = () => {
    document.getElementById('newBack').hidden = true;
  };
  document.getElementById('newForm').onsubmit = async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('newErr');
    errEl.textContent = '';
    const payload = {
      titulo: document.getElementById('newTitulo').value.trim(),
      descripcion: document.getElementById('newDesc').value.trim(),
      categoria: document.getElementById('newCategoria').value,
      canal: document.getElementById('newCanal').value,
      prioridad: document.getElementById('newPrioridad').value,
      deadline: document.getElementById('newDeadline').value.trim(),
      tipo_media: document.getElementById('newTipo').value,
      preview_url: document.getElementById('newPreview').value.trim(),
      thumbnail_url: document.getElementById('newThumb').value.trim(),
      fuente: 'Idea Nueva',
      semana: '-',
      dia: '-',
    };
    if (!payload.titulo || !payload.descripcion) {
      errEl.textContent = 'Falta título o descripción.';
      return;
    }
    if (DEMO_MODE) {
      errEl.textContent = 'Modo demo: conecta el motor para guardar ideas reales.';
      return;
    }
    const r = await apiCreate(payload);
    if (r.ok) {
      document.getElementById('newBack').hidden = true;
      document.getElementById('newForm').reset();
      showToast('Propuesta enviada · ' + r.id, 'success');
      loadAndRender();
    } else {
      errEl.textContent = 'Error: ' + (r.error || 'no se pudo crear');
    }
  };
}

/* =====================================================
   GLOBAL BINDINGS
   ===================================================== */
function bindApp() {
  // search
  document.getElementById('searchInput').addEventListener('input', e => {
    STATE.search = e.target.value;
    applyFilters();
  });
  // ⌘K / Ctrl+K
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      document.getElementById('searchInput').focus();
    }
    if (e.key === 'Escape') {
      closeModal();
      document.getElementById('newBack').hidden = true;
    }
  });
  // filtros
  document.getElementById('filterPrioridad').addEventListener('change', e => {
    STATE.filters.priority = e.target.value; applyFilters();
  });
  document.getElementById('filterSemana').addEventListener('change', e => {
    STATE.filters.week = e.target.value; applyFilters();
  });
  // view
  document.querySelectorAll('.view-btn').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.view-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      STATE.view = b.dataset.view;
      renderContent();
    };
  });
  // refresh
  document.getElementById('btnRefresh').onclick = () => loadAndRender();
  // logout
  document.getElementById('btnLogout').onclick = logout;
  // modal close
  document.getElementById('modalClose').onclick = closeModal;
  document.getElementById('modalBack').onclick = e => {
    if (e.target.id === 'modalBack') closeModal();
  };
  // new idea
  bindNewIdea();
}

function logout() {
  sessionStorage.removeItem('gtahub_session');
  STATE.session = null;
  document.getElementById('appView').hidden = true;
  document.getElementById('loginView').hidden = false;
  document.getElementById('loginForm').reset();
}

/* =====================================================
   HELPERS
   ===================================================== */
function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escAttr(s) { return escHtml(s); }
function cssEsc(s) { return String(s).replace(/"/g, '\\"'); }

let toastTimer = null;
function showToast(msg, kind) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (kind ? ' toast--' + kind : '');
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}

/* =====================================================
   INIT
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  bindLogin();
  bindApp();
  // restaurar sesión
  const stored = sessionStorage.getItem('gtahub_session');
  if (stored) {
    try {
      STATE.session = JSON.parse(stored);
      enterApp();
    } catch (e) { sessionStorage.removeItem('gtahub_session'); }
  }
});
