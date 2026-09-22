'use strict';

/* ============================================================
   Mis Finanzas — control de ingresos y gastos personales
   Todo se guarda localmente (localStorage) en este teléfono.
   ============================================================ */

const STORAGE_KEY = 'finanzas_v1';
const MONEDA = 'C$';

const CATEGORIAS = {
  gasto: ['Alimentación', 'Transporte', 'Vivienda', 'Servicios', 'Salud', 'Entretenimiento', 'Educación', 'Ropa', 'Otro'],
  ingreso: ['Salario', 'Freelance', 'Ventas', 'Regalo', 'Otro']
};

const CAT_ICON = {
  'Alimentación': '🍽️', 'Transporte': '🚌', 'Vivienda': '🏠', 'Servicios': '💡', 'Salud': '🩺',
  'Entretenimiento': '🎬', 'Educación': '📚', 'Ropa': '👕', 'Otro': '📦',
  'Salario': '💼', 'Freelance': '💻', 'Ventas': '🛍️', 'Regalo': '🎁'
};

/* ---------------- Utilidades ---------------- */

function uid() { return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function pad(n) { return String(n).padStart(2, '0'); }
function todayISO() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); }
function monthKeyOf(s) { return s.slice(0, 7); }
function shiftMonth(monthKey, delta) {
  let [y, m] = monthKey.split('-').map(Number);
  m += delta;
  while (m < 1) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return y + '-' + pad(m);
}
function formatMonthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  const txt = d.toLocaleDateString('es-NI', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}
function formatDateHuman(s) {
  const d = parseDate(s);
  const txt = d.toLocaleDateString('es-NI', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}
function money(amount) {
  const n = Number(amount) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return sign + MONEDA + ' ' + abs.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function esc(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------------- Persistencia ---------------- */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { movimientos: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.movimientos)) return { movimientos: [] };
    return parsed;
  } catch (e) {
    return { movimientos: [] };
  }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

let state = loadState();

const nav = { tab: 'movimientos', month: monthKeyOf(todayISO()), catTipo: 'gasto' };

/* ---------------- Cálculos ---------------- */

function movimientosDelMes(monthKey) {
  return state.movimientos.filter(m => monthKeyOf(m.fecha) === monthKey);
}
function totalesDelMes(monthKey) {
  const movs = movimientosDelMes(monthKey);
  const ingresos = movs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
  const gastos = movs.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0);
  return { ingresos, gastos, balance: ingresos - gastos };
}
function saldoDisponible() {
  return state.movimientos.reduce((s, m) => s + (m.tipo === 'ingreso' ? m.monto : -m.monto), 0);
}
function desgloseCategorias(monthKey, tipo) {
  const movs = movimientosDelMes(monthKey).filter(m => m.tipo === tipo);
  const map = {};
  movs.forEach(m => { map[m.categoria] = (map[m.categoria] || 0) + m.monto; });
  const total = Object.values(map).reduce((s, v) => s + v, 0);
  return Object.entries(map)
    .map(([categoria, monto]) => ({ categoria, monto, pct: total ? Math.round((monto / total) * 100) : 0 }))
    .sort((a, b) => b.monto - a.monto);
}

/* ---------------- Render raíz ---------------- */

const appEl = document.getElementById('app');

function render() { renderHome(); }

function renderHome() {
  const t = totalesDelMes(nav.month);
  const saldo = saldoDisponible();

  appEl.innerHTML = `
    <div class="appbar"><h1>Mis Finanzas<span class="sub">Ingresos y gastos</span></h1></div>
    <div class="month-nav">
      <button data-action="prev-month">←</button>
      <span class="month-label">${formatMonthLabel(nav.month)}</span>
      <button data-action="next-month">→</button>
    </div>
    <div class="tabs">
      <button class="tab ${nav.tab === 'movimientos' ? 'active' : ''}" data-action="tab" data-tab="movimientos">Movimientos</button>
      <button class="tab ${nav.tab === 'categorias' ? 'active' : ''}" data-action="tab" data-tab="categorias">Por categoría</button>
    </div>
    <div class="content">
      ${nav.tab === 'movimientos' ? renderMovimientosTab(t, saldo) : renderCategoriasTab()}
      <div class="footer-note">Tus datos se guardan solo en este teléfono.</div>
    </div>
    <button class="fab" data-action="new-mov" aria-label="Nuevo movimiento">+</button>
  `;
}

function renderMovimientosTab(t, saldo) {
  const movs = [...movimientosDelMes(nav.month)].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.createdAt - a.createdAt);
  const grouped = {};
  movs.forEach(m => { (grouped[m.fecha] = grouped[m.fecha] || []).push(m); });
  const dates = Object.keys(grouped).sort().reverse();

  return `
    <div class="summary-grid">
      <div class="stat primary wide"><div class="label">Saldo disponible</div><div class="value">${money(saldo)}</div></div>
      <div class="stat success"><div class="label">Ingresos del mes</div><div class="value">${money(t.ingresos)}</div></div>
      <div class="stat danger"><div class="label">Gastos del mes</div><div class="value">${money(t.gastos)}</div></div>
    </div>
    ${movs.length === 0 ? `
      <div class="empty-state">
        <span class="emoji">💸</span>
        <p><strong>Sin movimientos este mes.</strong></p>
        <p>Toca el botón + para registrar tu salario u otros ingresos, y cada gasto que hagas.</p>
      </div>` : dates.map(date => `
        <div class="date-group">
          <div class="dg-header">${formatDateHuman(date)}</div>
          <div class="list">${grouped[date].map(movRowHTML).join('')}</div>
        </div>`).join('')}
  `;
}

function movRowHTML(m) {
  const icon = CAT_ICON[m.categoria] || (m.tipo === 'ingreso' ? '💰' : '💳');
  const bg = m.tipo === 'ingreso' ? 'var(--success-bg)' : 'var(--danger-bg)';
  return `
    <div class="item-row" data-action="open-mov" data-id="${m.id}">
      <div class="cat-icon" style="background:${bg}">${icon}</div>
      <div class="info" style="flex:1">
        <div class="title">${esc(m.concepto || m.categoria)}</div>
        <div class="meta">${esc(m.categoria)}</div>
      </div>
      <div class="amount ${m.tipo}">${m.tipo === 'ingreso' ? '+' : '−'} ${money(m.monto)}</div>
    </div>`;
}

function renderCategoriasTab() {
  const data = desgloseCategorias(nav.month, nav.catTipo);
  return `
    <div class="chip-row">
      <button class="chip ${nav.catTipo === 'gasto' ? 'active' : ''}" data-action="cat-tipo" data-tipo="gasto">Gastos</button>
      <button class="chip ${nav.catTipo === 'ingreso' ? 'active' : ''}" data-action="cat-tipo" data-tipo="ingreso">Ingresos</button>
    </div>
    ${data.length === 0 ? `
      <div class="empty-state">
        <span class="emoji">📊</span>
        <p>No hay ${nav.catTipo === 'gasto' ? 'gastos' : 'ingresos'} registrados este mes.</p>
      </div>` : `
      <div class="list">
        ${data.map(d => `
          <div class="cat-row">
            <div class="top">
              <span>${CAT_ICON[d.categoria] || '📦'} ${esc(d.categoria)}</span>
              <span class="amount">${money(d.monto)}</span>
            </div>
            <div class="bar-track"><div class="bar-fill" style="width:${d.pct}%"></div></div>
            <div class="small muted">${d.pct}% del total</div>
          </div>`).join('')}
      </div>`}
  `;
}

/* ---------------- Sheets ---------------- */

const sheetEl = document.getElementById('sheet-root');
const backdropEl = document.getElementById('sheet-backdrop');
let sheetClearTimer = null;
function openSheet(html) {
  clearTimeout(sheetClearTimer);
  sheetEl.innerHTML = `<div class="handle"></div>${html}`;
  sheetEl.classList.add('open');
  backdropEl.classList.add('open');
}
function closeSheet() {
  sheetEl.classList.remove('open');
  backdropEl.classList.remove('open');
  clearTimeout(sheetClearTimer);
  sheetClearTimer = setTimeout(() => { sheetEl.innerHTML = ''; }, 200);
}
backdropEl.addEventListener('click', closeSheet);

let movDraft = null; // { id|null, tipo, monto, concepto, categoria, fecha }

function openMovSheet(existing) {
  movDraft = existing
    ? { id: existing.id, tipo: existing.tipo, monto: existing.monto, concepto: existing.concepto, categoria: existing.categoria, fecha: existing.fecha }
    : { id: null, tipo: 'gasto', monto: '', concepto: '', categoria: CATEGORIAS.gasto[0], fecha: todayISO() };

  openSheet(`
    <h2>${existing ? 'Editar movimiento' : 'Nuevo movimiento'}</h2>
    <div class="stack">
      <div class="segmented" id="mov-tipo">
        <button type="button" class="${movDraft.tipo === 'ingreso' ? 'active ingreso' : ''}" data-tipo="ingreso">💰 Ingreso</button>
        <button type="button" class="${movDraft.tipo === 'gasto' ? 'active gasto' : ''}" data-tipo="gasto">💳 Gasto</button>
      </div>
      <div class="field"><label for="mov-monto">Monto</label><input type="number" id="mov-monto" min="0" step="0.01" inputmode="decimal" value="${movDraft.monto}"></div>
      <div class="field"><label for="mov-concepto">Concepto</label><input type="text" id="mov-concepto" placeholder="Ej. Salario, Supermercado" value="${esc(movDraft.concepto)}"></div>
      <div class="field">
        <label>Categoría</label>
        <div class="chip-row" id="mov-categorias"></div>
      </div>
      <div class="field"><label for="mov-fecha">Fecha</label><input type="date" id="mov-fecha" value="${movDraft.fecha}"></div>
    </div>
    <div class="actions" style="margin-top:14px">
      <button class="btn btn-primary" data-action="confirm-mov">Guardar</button>
      ${existing ? `<button class="btn btn-danger" data-action="delete-mov" data-id="${existing.id}">🗑 Eliminar</button>` : ''}
      <button class="btn btn-ghost" data-action="close-sheet">Cancelar</button>
    </div>
  `);

  renderCategoriaChips();

  document.querySelectorAll('#mov-tipo button').forEach(btn => {
    btn.addEventListener('click', () => {
      movDraft.tipo = btn.dataset.tipo;
      if (!CATEGORIAS[movDraft.tipo].includes(movDraft.categoria)) movDraft.categoria = CATEGORIAS[movDraft.tipo][0];
      document.querySelectorAll('#mov-tipo button').forEach(b => { b.classList.remove('active', 'ingreso', 'gasto'); });
      btn.classList.add('active', movDraft.tipo);
      renderCategoriaChips();
    });
  });
}

function renderCategoriaChips() {
  const box = document.getElementById('mov-categorias');
  if (!box) return;
  box.innerHTML = CATEGORIAS[movDraft.tipo].map(c =>
    `<button type="button" class="chip ${c === movDraft.categoria ? 'active' : ''}" data-action="mov-cat" data-cat="${esc(c)}">${CAT_ICON[c] || ''} ${esc(c)}</button>`
  ).join('');
}

/* ---------------- Acciones ---------------- */

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
    case 'prev-month': nav.month = shiftMonth(nav.month, -1); render(); break;
    case 'next-month': nav.month = shiftMonth(nav.month, 1); render(); break;
    case 'tab': nav.tab = el.dataset.tab; render(); break;
    case 'cat-tipo': nav.catTipo = el.dataset.tipo; render(); break;
    case 'new-mov': openMovSheet(null); break;
    case 'open-mov': {
      const m = state.movimientos.find(x => x.id === el.dataset.id);
      if (m) openMovSheet(m);
      break;
    }
    case 'close-sheet': closeSheet(); break;
    case 'mov-cat':
      movDraft.categoria = el.dataset.cat;
      renderCategoriaChips();
      break;
    case 'confirm-mov': {
      const monto = parseFloat(document.getElementById('mov-monto').value);
      const concepto = document.getElementById('mov-concepto').value.trim();
      const fecha = document.getElementById('mov-fecha').value;
      if (isNaN(monto) || monto <= 0) { showToast('Ingresa un monto válido'); break; }
      if (!fecha) { showToast('Selecciona una fecha'); break; }
      if (movDraft.id) {
        const m = state.movimientos.find(x => x.id === movDraft.id);
        m.tipo = movDraft.tipo; m.monto = monto; m.concepto = concepto; m.categoria = movDraft.categoria; m.fecha = fecha;
      } else {
        state.movimientos.push({ id: uid(), tipo: movDraft.tipo, monto, concepto, categoria: movDraft.categoria, fecha, createdAt: Date.now() });
      }
      saveState();
      nav.month = monthKeyOf(fecha);
      closeSheet();
      render();
      showToast('Movimiento guardado');
      break;
    }
    case 'delete-mov': {
      if (confirm('¿Eliminar este movimiento?')) {
        state.movimientos = state.movimientos.filter(m => m.id !== el.dataset.id);
        saveState();
        closeSheet();
        render();
        showToast('Movimiento eliminado');
      }
      break;
    }
  }
});

/* ---------------- Toasts ---------------- */

let toastTimer = null;
function showToast(msg) {
  const root = document.getElementById('toast-root');
  root.innerHTML = `<div class="toast" id="active-toast">${esc(msg)}</div>`;
  const t = document.getElementById('active-toast');
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => { root.innerHTML = ''; }, 200);
  }, 2500);
}

/* ---------------- Arranque ---------------- */

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
