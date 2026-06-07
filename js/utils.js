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
  const m = Math.floor((new Date() - new Date(s)) / 86400000 / 30);
  return m < 3 ? 1 : m < 6 ? 2 : m < 9 ? 3 : 4;
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

export function calcStreak(lg) {
  let s = 0; let d = new Date(); d.setDate(d.getDate() - 1);
  while (s < 365) {
    const k = dateKey(d);
    const e = lg.find(x => x.date === k);
    if (!e || !Object.values(e.habits || {}).some(Boolean)) break;
    s++; d.setDate(d.getDate() - 1);
  }
  const te = lg.find(x => x.date === todayKey());
  if (te && Object.values(te.habits || {}).some(Boolean)) s++;
  return s;
}

export function getBestStreak(lg) {
  let best = 0, cur = 0;
  const sorted = [...lg].sort((a, b) => a.date.localeCompare(b.date));
  sorted.forEach((e, i) => {
    if (Object.values(e.habits || {}).some(Boolean)) {
      if (i === 0) { cur = 1; } else {
        const diff = (new Date(e.date + 'T12:00:00') - new Date(sorted[i - 1].date + 'T12:00:00')) / 86400000;
        cur = diff === 1 ? cur + 1 : 1;
      }
      if (cur > best) best = cur;
    }
  });
  return best;
}
