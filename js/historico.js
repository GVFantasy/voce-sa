import { state, ENERGY } from './state.js';
import { fmtDate, isExpected, dateKey, sanitize } from './utils.js';

let _hiLimit = 15;
let _hiCalYear = new Date().getFullYear();
let _hiCalMonth = new Date().getMonth();
let _hiSearchTerm = '';
let _hiHabitFilter = '';

export function renderHistorico() {
  _hiLimit = 15;
  // recalcula "hoje" a cada abertura da aba - o app pode ficar aberto (PWA) atravessando
  // meia-noite/virada de mes, entao nao pode confiar num valor cacheado no load do modulo
  const today = new Date();
  _hiCalYear = today.getFullYear();
  _hiCalMonth = today.getMonth();
  const sel = document.getElementById('hi-habit-filter');
  if (sel) {
    sel.innerHTML = '<option value="">Todos os hábitos</option>' +
      state.userHabits.map(h => `<option value="${h.id}">${sanitize(h.icon)} ${sanitize(h.name)}</option>`).join('');
    sel.value = _hiHabitFilter;
  }
  _renderHistoricoInner();
}

export function loadMoreHistorico() {
  _hiLimit += 15;
  _renderHistoricoInner();
}

export function filterHistorico(term) {
  _hiSearchTerm = term.trim().toLowerCase();
  _hiLimit = 15;
  _renderHistoricoInner();
}

export function setHistoricoHabitFilter(habitId) {
  _hiHabitFilter = habitId;
  _hiLimit = 15;
  _renderHistoricoInner();
}

function applyHistoricoFilters(log) {
  let filtered = log;
  if (_hiSearchTerm) filtered = filtered.filter(e => (e.nota || '').toLowerCase().includes(_hiSearchTerm));
  if (_hiHabitFilter) filtered = filtered.filter(e => e.habits && e.habits[_hiHabitFilter]);
  return filtered;
}

// state.log so guarda os check-ins mais recentes (limit 365 em nav.js loadLog) - navegar para
// antes do registro mais antigo carregado mostraria meses "vazios" enganosamente, entao trava ali
function earliestLoadedYearMonth() {
  if (!state.log.length) return null;
  const oldest = state.log.reduce((min, e) => (e.date < min ? e.date : min), state.log[0].date);
  const d = new Date(oldest + 'T12:00:00');
  return { y: d.getFullYear(), m: d.getMonth() };
}

export function navCalMonth(delta) {
  let newMonth = _hiCalMonth + delta, newYear = _hiCalYear;
  if (newMonth < 0) { newMonth = 11; newYear--; }
  else if (newMonth > 11) { newMonth = 0; newYear++; }
  const earliest = earliestLoadedYearMonth();
  if (delta < 0 && earliest && (newYear < earliest.y || (newYear === earliest.y && newMonth < earliest.m))) return;
  _hiCalMonth = newMonth; _hiCalYear = newYear;
  _renderHistoricoInner();
}

function _renderHistoricoInner() {
  const hl = document.getElementById('history-list');
  if (!state.log.length) {
    hl.innerHTML = '<div class="empty-state"><strong>Nenhum registro ainda</strong>Faça seu primeiro check-in na aba <b>Hoje</b> para começar a construir seu histórico.</div>';
    return;
  }

  // --- Calendário (navegável entre meses) ---
  const today = new Date();
  const y = _hiCalYear, mo = _hiCalMonth;
  const dim = new Date(y, mo + 1, 0).getDate();
  const firstDow = new Date(y, mo, 1).getDay();
  const MNAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const DNAMES = ['D','S','T','Q','Q','S','S'];

  const logMap = Object.fromEntries(state.log.map(e => [e.date, e]));

  let calCells = DNAMES.map(d => `<div class="cal-head">${d}</div>`).join('');
  for (let i = 0; i < firstDow; i++) calCells += `<div class="cal-cell empty"></div>`;
  for (let d = 1; d <= dim; d++) {
    const dk = dateKey(new Date(y, mo, d));
    const entry = logMap[dk];
    const isFuture = dk > dateKey(today);
    const isToday = dk === dateKey(today);
    let cls = 'cal-cell';
    if (isFuture) cls += ' cal-future';
    else if (!entry) cls += ' cal-miss';
    else {
      const done = state.userHabits.filter(h => isExpected(h, dk) && entry.habits?.[h.id]).length;
      const exp = state.userHabits.filter(h => isExpected(h, dk)).length;
      const pct = exp > 0 ? done / exp : 0;
      cls += pct >= 0.8 ? ' cal-ok' : pct >= 0.4 ? ' cal-warn' : ' cal-low';
    }
    if (isToday) cls += ' cal-today';
    const hasEntry = !!entry;
    calCells += `<div class="${cls}"${hasEntry ? ` onclick="showHiDay('${dk}')"` : ''}>${d}</div>`;
  }

  const isCurrentMonth = y === today.getFullYear() && mo === today.getMonth();
  const earliest = earliestLoadedYearMonth();
  const isEarliestMonth = earliest && y === earliest.y && mo === earliest.m;
  const calHTML = `<div class="cal-wrap">
    <div class="cal-nav">
      <button class="cal-nav-btn" aria-label="Mês anterior" onclick="navCalMonth(-1)" ${isEarliestMonth ? 'disabled' : ''}>‹</button>
      <div class="cal-title">${MNAMES[mo]} ${y}</div>
      <button class="cal-nav-btn" aria-label="Próximo mês" onclick="navCalMonth(1)" ${isCurrentMonth ? 'disabled' : ''}>›</button>
    </div>
    <div class="cal-grid">${calCells}</div>
    <div id="hi-day-detail" class="hi-day-detail"></div>
  </div>`;

  // --- Lista (busca por nota / filtro por hábito aplicados antes da paginação) ---
  const filteredLog = applyHistoricoFilters(state.log);
  const slice = filteredLog.slice(0, _hiLimit);
  const listHTML = !filteredLog.length
    ? '<div class="empty-state"><strong>Nada encontrado</strong>Tente outro termo ou hábito.</div>'
    : slice.map(e => {
    const done = state.userHabits.filter(h => e.habits && e.habits[h.id] && isExpected(h, e.date));
    const extras = state.userHabits.filter(h => e.habits && e.habits[h.id] && !isExpected(h, e.date));
    const miss = state.userHabits.filter(h => isExpected(h, e.date) && !(e.habits && e.habits[h.id]));
    const eLabel = e.energy ? ENERGY[e.energy] : '';
    const nota = e.nota ? sanitize(e.nota.slice(0, 80) + (e.nota.length > 80 ? '…' : '')) : '';
    return `<div class="hi-item">
      <div class="hi-date">${sanitize(fmtDate(e.date))}</div>
      <div class="hi-tags">
        ${done.map(h => `<span class="hi-tag done">${sanitize(h.icon)} ${sanitize(h.name)}</span>`).join('')}
        ${extras.map(h => `<span class="hi-tag extra">${sanitize(h.icon)} extra</span>`).join('')}
        ${miss.map(h => `<span class="hi-tag miss">${sanitize(h.icon)} ${sanitize(h.name)}</span>`).join('')}
      </div>
      ${eLabel || nota ? `<div class="hi-meta">${eLabel ? 'Energia: ' + eLabel : ''}${eLabel && nota ? ' · ' : ''}${nota}</div>` : ''}
    </div>`;
  }).join('');

  const moreBtn = filteredLog.length > _hiLimit
    ? `<button class="btn-secondary" onclick="loadMoreHistorico()" style="width:100%;margin-top:8px">Carregar mais</button>`
    : '';

  hl.innerHTML = calHTML + `<div class="sec-label" style="margin-top:16px">Registros recentes</div>` + listHTML + moreBtn;
}

export function showHiDay(dk) {
  const entry = state.log.find(e => e.date === dk);
  const el = document.getElementById('hi-day-detail');
  if (!entry || !el) return;
  const done = state.userHabits.filter(h => entry.habits?.[h.id] && isExpected(h, dk));
  const extras = state.userHabits.filter(h => entry.habits?.[h.id] && !isExpected(h, dk));
  const miss = state.userHabits.filter(h => isExpected(h, dk) && !entry.habits?.[h.id]);
  const eLabel = entry.energy ? ENERGY[entry.energy] : '';
  const nota = entry.nota ? sanitize(entry.nota) : '';
  el.innerHTML = `<div class="hi-detail-card">
    <div class="hi-detail-date">${sanitize(fmtDate(dk))}</div>
    <div class="hi-tags">
      ${done.map(h => `<span class="hi-tag done">${sanitize(h.icon)} ${sanitize(h.name)}</span>`).join('')}
      ${extras.map(h => `<span class="hi-tag extra">${sanitize(h.icon)} extra</span>`).join('')}
      ${miss.map(h => `<span class="hi-tag miss">${sanitize(h.icon)} ${sanitize(h.name)}</span>`).join('')}
    </div>
    ${eLabel ? `<div class="hi-meta">Energia: ${eLabel}</div>` : ''}
    ${nota ? `<div class="hi-nota">"${nota}"</div>` : ''}
  </div>`;
  el.style.display = 'block';
}
