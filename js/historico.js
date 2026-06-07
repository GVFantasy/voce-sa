import { state, ENERGY } from './state.js';
import { fmtDate, isExpected } from './utils.js';

export function renderHistorico() {
  const hl = document.getElementById('history-list');
  if (!state.log.length) {
    hl.innerHTML = '<div class="empty-state"><strong>Nenhum registro ainda</strong>Faça seu primeiro check-in na aba <b>Hoje</b> para começar a construir seu histórico.<br><br>Cada dia registrado é um tijolo do seu progresso de 12 meses.</div>';
    return;
  }
  hl.innerHTML = state.log.slice(0, 30).map(e => {
    const done = state.userHabits.filter(h => e.habits && e.habits[h.id] && isExpected(h, e.date));
    const extras = state.userHabits.filter(h => e.habits && e.habits[h.id] && !isExpected(h, e.date));
    const miss = state.userHabits.filter(h => isExpected(h, e.date) && !(e.habits && e.habits[h.id]));
    const eLabel = e.energy ? ENERGY[e.energy] : '';
    const nota = e.nota ? e.nota.slice(0, 60) + (e.nota.length > 60 ? '…' : '') : '';
    return `<div class="hi-item"><div class="hi-date">${fmtDate(e.date)}</div>
      <div class="hi-tags">
        ${done.map(h => `<span class="hi-tag done">${h.icon} ${h.name}</span>`).join('')}
        ${extras.map(h => `<span class="hi-tag extra">${h.icon} extra</span>`).join('')}
        ${miss.map(h => `<span class="hi-tag miss">${h.icon} ${h.name}</span>`).join('')}
      </div>
      ${eLabel || nota ? `<div class="hi-meta">${eLabel ? 'Energia: ' + eLabel : ''}${eLabel && nota ? ' · ' : ''}${nota}</div>` : ''}</div>`;
  }).join('');
}
