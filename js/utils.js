import { state } from './state.js';

export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const dateKey = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const fmtDate = iso =>
  new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });

export const isExpected = (h, date) => {
  if (h.allDays) return true;
  if (h.weekdays) return h.weekdays.includes(new Date(date + 'T12:00:00').getDay());
  return false;
};

let _toastTimer = null;
export function showToast(msg, type = 'suc', duration) {
  const el = document.getElementById('g-toast');
  if (!el) return;
  const d = duration || (type === 'err' ? 6000 : 3000);
  if (_toastTimer) clearTimeout(_toastTimer);
  el.textContent = msg;
  el.className = 'g-toast ' + type + ' show';
  if (type === 'err') { el.onclick = () => { el.classList.remove('show'); }; }
  else { el.onclick = null; }
  _toastTimer = setTimeout(() => el.classList.remove('show'), d);
}

export function showFieldErr(fieldId, errId, msg) {
  const input = document.getElementById(fieldId);
  const err = document.getElementById(errId);
  if (input) input.classList.add('invalid');
  if (err) { err.textContent = msg; err.classList.add('show'); }
}

export function clearFieldErr(errId) {
  const err = document.getElementById(errId);
  if (err) { err.textContent = ''; err.classList.remove('show'); }
  const input = document.getElementById(errId.replace('-err', ''));
  if (input) input.classList.remove('invalid');
}

export function getActiveQ(s) {
  if (!s) return 1;
  const start = new Date(s);
  const today = new Date();
  let months = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
  if (today.getDate() < start.getDate()) months--;
  if (months < 0) months = 0;
  const q = Math.floor(months / 3) + 1;
  return Math.min(4, Math.max(1, q));
}

export function getPeriodDates(p) {
  const today = new Date(); const days = [];
  if (p === 'semana') {
    for (let i = 6; i >= 0; i--) { const d = new Date(today); d.setDate(today.getDate() - i); days.push(dateKey(d)); }
  } else if (p === 'mes') {
    const y = today.getFullYear(), m = today.getMonth();
    const dim = new Date(y, m + 1, 0).getDate();
    for (let i = 1; i <= dim; i++) { days.push(dateKey(new Date(y, m, i))); }
  } else if (p === 'trimestre') {
    const aq = getActiveQ(state.userCfg.startDate);
    const start = new Date(state.userCfg.startDate || todayKey());
    const qs = new Date(start); qs.setMonth(start.getMonth() + (aq - 1) * 3);
    const qe = new Date(qs); qe.setMonth(qs.getMonth() + 3);
    let d = new Date(qs);
    while (d <= today && d < qe) { days.push(dateKey(d)); d.setDate(d.getDate() + 1); }
  } else {
    const start = new Date(state.userCfg.startDate || todayKey());
    let d = new Date(start);
    while (d <= today) { days.push(dateKey(d)); d.setDate(d.getDate() + 1); }
  }
  return days;
}

// Data a partir da qual o critério estrito (todos os hábitos esperados) vale. Antes disso,
// usa o critério antigo — evita que hábitos novos (ex: financas/tempo/relacoes, adicionados
// nesta versão) sejam exigidos retroativamente em dias que nem existiam na UI do usuário,
// o que zeraria streaks antigas do dia para a noite.
const STRICT_CRITERIA_SINCE = '2026-08-14';

// Um dia conta para a streak se todo hábito esperado (isExpected) naquele dia foi concluído.
// Dias sem nenhum hábito esperado não quebram a streak. Sem userHabits carregado, ou para
// datas anteriores ao cutover acima, usa o critério antigo de "algum hábito marcado".
export function dayFulfilled(entry, date) {
  const habits = state.userHabits || [];
  const doneMap = (entry && entry.habits) || {};
  if (!habits.length || date < STRICT_CRITERIA_SINCE) return Object.values(doneMap).some(Boolean);
  const expected = habits.filter(h => isExpected(h, date));
  if (!expected.length) return true;
  return expected.every(h => !!doneMap[h.id]);
}

export function calcStreak(lg) {
  const map = Object.fromEntries(lg.map(e => [e.date, e]));
  let s = 0; let d = new Date(); d.setDate(d.getDate() - 1);
  while (s < 365) {
    const k = dateKey(d);
    if (!dayFulfilled(map[k], k)) break;
    s++; d.setDate(d.getDate() - 1);
  }
  if (dayFulfilled(map[todayKey()], todayKey())) s++;
  return s;
}

export function sanitize(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function getBestStreak(lg) {
  if (!lg.length) return 0;
  const map = Object.fromEntries(lg.map(e => [e.date, e]));
  const firstDate = [...lg].map(e => e.date).sort()[0];
  let d = new Date(firstDate + 'T12:00:00');
  const end = new Date();
  let best = 0, cur = 0;
  while (d <= end) {
    const k = dateKey(d);
    if (dayFulfilled(map[k], k)) { cur++; if (cur > best) best = cur; } else { cur = 0; }
    d.setDate(d.getDate() + 1);
  }
  return best;
}
