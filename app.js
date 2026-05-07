/* =====================================================
   GTAHUB · STAFF CONTROL · APP LOGIC
   ===================================================== */

const CFG = window.GTAHUB_CONFIG || {};
const STATE = {
  items: [],
  filtered: [],
  activeTab: "ALL",
  search: "",
  filters: { estado: "", prioridad: "", canal: "", semana: "" },
  selected: null,
  // overrides locales (si APPROVAL_MODE = "local" y no quieres ir al Sheets)
  localOverrides: JSON.parse(localStorage.getItem("gtahub_overrides") || "{}"),
};

/* ---------- CSV PARSER (robusto, soporta comillas y comas) ---------- */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else { field += c; }
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.some(v => v.trim() !== ""))
    .map(r => {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = (r[idx] || "").trim(); });
      return obj;
    });
}

/* ---------- LOAD DATA ---------- */
async function loadData() {
  const url = (CFG.SHEETS_CSV_URL && CFG.SHEETS_CSV_URL.trim()) || CFG.LOCAL_CSV_PATH;
  const isRemote = url.startsWith("http");
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    const items = parseCSV(text);

    // aplicar overrides locales si existen
    items.forEach(it => {
      const ov = STATE.localOverrides[it.id];
      if (ov) {
        if (ov.estado) it.estado = ov.estado;
        if (ov.comentarios_staff) it.comentarios_staff = ov.comentarios_staff;
        if (ov.fecha_actualizacion) it.fecha_actualizacion = ov.fecha_actualizacion;
      }
      // default
      if (!it.estado) it.estado = "Pendiente";
    });

    STATE.items = items;
    document.getElementById("connStatus").textContent =
      isRemote ? "CONN: SHEETS LIVE" : "CONN: LOCAL CSV";
    document.getElementById("configNotice").classList.toggle("active", !isRemote);
    document.getElementById("lastUpdate").textContent =
      "SYNC: " + new Date().toLocaleTimeString("es-MX", { hour12: false });
    populateChannelFilter();
    populateWeekFilter();
    renderTabs();
    applyFilters();
    renderKPIs();
  } catch (err) {
    console.error("Load error:", err);
    document.getElementById("itemsBody").innerHTML = `
      <tr><td colspan="8" class="empty-state">
        <div class="ascii">!!</div>
        ERROR DE CARGA · ${err.message}<br/>
        Verifica config.js o el archivo data/items.csv
      </td></tr>`;
  }
}

/* ---------- KPIS ---------- */
function renderKPIs() {
  const total = STATE.items.length;
  const cnt = { Pendiente: 0, Aprobado: 0, Cambios: 0, Rechazado: 0 };
  STATE.items.forEach(it => { cnt[it.estado] = (cnt[it.estado] || 0) + 1; });

  document.getElementById("kpiTotal").textContent = total;
  document.getElementById("kpiPending").textContent = cnt.Pendiente;
  document.getElementById("kpiApproved").textContent = cnt.Aprobado;
  document.getElementById("kpiChanges").textContent = cnt.Cambios;
  document.getElementById("kpiRejected").textContent = cnt.Rechazado;
  document.getElementById("totalCount").textContent = String(total).padStart(3, "0");

  const pct = (n) => total ? (n / total * 100) : 0;
  document.getElementById("barPending").style.width = pct(cnt.Pendiente) + "%";
  document.getElementById("barApproved").style.width = pct(cnt.Aprobado) + "%";
  document.getElementById("barChanges").style.width = pct(cnt.Cambios) + "%";
  document.getElementById("barRejected").style.width = pct(cnt.Rechazado) + "%";
}

/* ---------- TABS ---------- */
function renderTabs() {
  const cats = {};
  STATE.items.forEach(it => {
    const k = it.fuente || "Otros";
    cats[k] = (cats[k] || 0) + 1;
  });

  const tabs = [
    { id: "ALL", label: "TODOS", count: STATE.items.length },
    ...Object.entries(cats).map(([k, v]) => ({ id: k, label: k, count: v })),
  ];

  const el = document.getElementById("tabs");
  el.innerHTML = tabs.map(t => `
    <button class="tab ${STATE.activeTab === t.id ? "active" : ""}" data-tab="${escapeAttr(t.id)}">
      ${escapeHtml(t.label)}
      <span class="tab-count">${t.count}</span>
    </button>
  `).join("");

  el.querySelectorAll(".tab").forEach(b => {
    b.addEventListener("click", () => {
      STATE.activeTab = b.dataset.tab;
      renderTabs();
      applyFilters();
    });
  });
}

/* ---------- FILTERS ---------- */
function populateChannelFilter() {
  const set = new Set();
  STATE.items.forEach(it => { if (it.canal) set.add(it.canal); });
  const sel = document.getElementById("filterCanal");
  const current = sel.value;
  sel.innerHTML = '<option value="">CANAL · TODOS</option>' +
    [...set].sort().map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c.toUpperCase())}</option>`).join("");
  sel.value = current;
}

function populateWeekFilter() {
  const set = new Set();
  STATE.items.forEach(it => { if (it.semana) set.add(it.semana); });
  const sel = document.getElementById("filterSemana");
  const current = sel.value;
  // ordenamos: Mensual / Fase 1 / Sem 1..4 / etc.
  const arr = [...set].sort();
  sel.innerHTML = '<option value="">SEMANA · TODAS</option>' +
    arr.map(s => `<option value="${escapeAttr(s)}">${escapeHtml(s.toUpperCase())}</option>`).join("");
  sel.value = current;
}

function applyFilters() {
  const s = STATE.search.toLowerCase();
  const f = STATE.filters;
  const tab = STATE.activeTab;
  STATE.filtered = STATE.items.filter(it => {
    if (tab !== "ALL" && it.fuente !== tab) return false;
    if (f.estado && it.estado !== f.estado) return false;
    if (f.prioridad && it.prioridad !== f.prioridad) return false;
    if (f.canal && it.canal !== f.canal) return false;
    if (f.semana && it.semana !== f.semana) return false;
    if (s) {
      const blob = `${it.id} ${it.titulo} ${it.descripcion} ${it.canal} ${it.categoria} ${it.comentarios_staff||""}`.toLowerCase();
      if (!blob.includes(s)) return false;
    }
    return true;
  });
  renderTable();
}

/* ---------- RENDER TABLE ---------- */
function renderTable() {
  const body = document.getElementById("itemsBody");
  document.getElementById("visibleCount").textContent = STATE.filtered.length;

  if (!STATE.filtered.length) {
    body.innerHTML = `<tr><td colspan="8" class="empty-state">
      <div class="ascii">— ∅ —</div>
      SIN RESULTADOS PARA LOS FILTROS APLICADOS
    </td></tr>`;
    return;
  }

  const stMap = {
    "Pendiente": "pending",
    "Aprobado": "approved",
    "Cambios": "changes",
    "Rechazado": "rejected",
  };

  body.innerHTML = STATE.filtered.map(it => {
    const stKey = stMap[it.estado] || "pending";
    return `
      <tr data-id="${escapeAttr(it.id)}">
        <td data-label="ID"><span class="item-id">${escapeHtml(it.id)}</span></td>
        <td data-label="FUENTE">
          <div class="source-tag">${escapeHtml(it.fuente)}</div>
          <div style="margin-top:4px;color:var(--txt-1);font-size:11px;">${escapeHtml(it.categoria)}</div>
        </td>
        <td data-label="ITEM">
          <div class="item-title">${escapeHtml(it.titulo)}</div>
          <div class="item-desc">${escapeHtml(it.descripcion)}</div>
        </td>
        <td data-label="CANAL"><span class="channel-tag">${escapeHtml(it.canal || "—")}</span></td>
        <td data-label="SEM/DÍA">
          <div style="font-size:11px;color:var(--txt-1);">${escapeHtml(it.semana || "—")}</div>
          <div style="font-size:10px;color:var(--txt-3);margin-top:2px;">${escapeHtml(it.dia || "")}</div>
        </td>
        <td data-label="PRI"><span class="priority priority--${escapeAttr(it.prioridad)}">${escapeHtml(it.prioridad)}</span></td>
        <td data-label="DEADLINE" style="font-size:11px;color:var(--txt-2);">${escapeHtml(it.deadline)}</td>
        <td data-label="ESTADO"><span class="badge badge--${stKey}">${escapeHtml(it.estado)}</span></td>
      </tr>
    `;
  }).join("");

  body.querySelectorAll("tr").forEach(tr => {
    tr.addEventListener("click", () => openModal(tr.dataset.id));
  });
}

/* ---------- MODAL ---------- */
function openModal(id) {
  const it = STATE.items.find(x => x.id === id);
  if (!it) return;
  STATE.selected = it;

  document.getElementById("modalId").textContent = it.id;
  document.getElementById("modalTitle").textContent = it.titulo;
  document.getElementById("modalFuente").textContent = it.fuente || "—";
  document.getElementById("modalCategoria").textContent = it.categoria || "—";
  document.getElementById("modalCanal").textContent = it.canal || "—";
  document.getElementById("modalSemDia").textContent = `${it.semana || "—"} · ${it.dia || "—"}`;
  document.getElementById("modalPrioridad").textContent = it.prioridad || "—";
  document.getElementById("modalDeadline").textContent = it.deadline || "—";
  document.getElementById("modalDescripcion").textContent = it.descripcion || "—";
  document.getElementById("modalEstado").innerHTML = `<span class="badge badge--${
    {"Pendiente":"pending","Aprobado":"approved","Cambios":"changes","Rechazado":"rejected"}[it.estado] || "pending"
  }">${it.estado}</span> ${it.revisor ? `· revisado por <strong>${escapeHtml(it.revisor)}</strong>` : ""}`;
  document.getElementById("modalComentarios").value = it.comentarios_staff || "";
  document.getElementById("modalUpdate").textContent = it.fecha_actualizacion || "Sin actualizaciones registradas.";

  document.getElementById("modalBackdrop").classList.add("active");
}

function closeModal() {
  document.getElementById("modalBackdrop").classList.remove("active");
  STATE.selected = null;
}

function applyAction(action) {
  if (!STATE.selected) return;
  const it = STATE.selected;
  const comment = document.getElementById("modalComentarios").value.trim();
  const stamp = new Date().toLocaleString("es-MX", { hour12: false });

  if (CFG.APPROVAL_MODE === "sheets") {
    // Abre el Sheets para que STAFF aplique el cambio en el motor real.
    // Se pasa el ID por hash para que un Apps Script (opcional) lo capture.
    const url = `${CFG.SHEETS_EDIT_URL}#gid=0&item=${encodeURIComponent(it.id)}&action=${encodeURIComponent(action)}`;
    window.open(url, "_blank", "noopener");
    // además aplicamos override visual local para feedback inmediato
  }

  // override local (siempre, para feedback inmediato en la UI)
  STATE.localOverrides[it.id] = {
    estado: action,
    comentarios_staff: comment,
    fecha_actualizacion: stamp,
  };
  localStorage.setItem("gtahub_overrides", JSON.stringify(STATE.localOverrides));

  it.estado = action;
  it.comentarios_staff = comment;
  it.fecha_actualizacion = stamp;

  closeModal();
  renderKPIs();
  renderTabs();
  applyFilters();
}

/* ---------- HELPERS ---------- */
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/\s/g, "_"); }

function tickClock() {
  const d = new Date();
  const txt = d.toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric"
  }).toUpperCase() + " · " + d.toLocaleTimeString("es-MX", { hour12: false });
  document.getElementById("dateNow").textContent = txt;
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // listeners
  document.getElementById("searchInput").addEventListener("input", e => {
    STATE.search = e.target.value;
    applyFilters();
  });
  document.getElementById("filterEstado").addEventListener("change", e => {
    STATE.filters.estado = e.target.value; applyFilters();
  });
  document.getElementById("filterPrioridad").addEventListener("change", e => {
    STATE.filters.prioridad = e.target.value; applyFilters();
  });
  document.getElementById("filterCanal").addEventListener("change", e => {
    STATE.filters.canal = e.target.value; applyFilters();
  });
  document.getElementById("filterSemana").addEventListener("change", e => {
    STATE.filters.semana = e.target.value; applyFilters();
  });
  document.getElementById("btnRefresh").addEventListener("click", () => loadData());
  document.getElementById("btnSheet").addEventListener("click", () => {
    window.open(CFG.SHEETS_EDIT_URL, "_blank", "noopener");
  });

  // modal
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modalBackdrop").addEventListener("click", e => {
    if (e.target.id === "modalBackdrop") closeModal();
  });
  document.querySelectorAll(".action-btn").forEach(b => {
    b.addEventListener("click", () => applyAction(b.dataset.action));
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });

  // clock
  tickClock();
  setInterval(tickClock, 1000);

  // initial load
  loadData();

  // auto refresh
  if (CFG.AUTO_REFRESH_SECONDS > 0) {
    setInterval(loadData, CFG.AUTO_REFRESH_SECONDS * 1000);
  }
});
