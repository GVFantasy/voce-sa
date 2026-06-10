import { state, ENERGY } from './state.js';
import { fmtDate, isExpected, dateKey, sanitize } from './utils.js';

let _hiLimit = 15;

export function renderHistorico() {
  _hiLimit = 15;
  _renderHistoricoInner();
}

export function loadMoreHistorico() {
  _hiLimit += 15;
  _renderHistoricoInner();
}

function _renderHistoricoInner() {
  const hl = document.getElementById('history-list');
  if (!state.log.length) {
    hl.innerHTML = '<div class="empty-state"><strong>Nenhum registro ainda</strong>Faça seu primeiro check-in na aba <b>Hoje</b> para começar a construir seu histórico.</div>';
    return;
  }

  // --- Calendário do mês atual ---
  const today = new Date();
  const y = today.getFullYear(), mo = today.getMonth();
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

  const calHTML = `<div class="cal-wrap">
    <div class="cal-title">${MNAMES[mo]} ${y}</div>
    <div class="cal-grid">${calCells}</div>
    <div id="hi-day-detail" class="hi-day-detail"></div>
  </div>`;

  // --- Lista ---
  const slice = state.log.slice(0, _hiLimit);
  const listHTML = slice.map(e => {
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

  const moreBtn = state.log.length > _hiLimit
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
