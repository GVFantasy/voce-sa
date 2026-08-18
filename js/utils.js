import { state } from './state.js';

export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const dateKey = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const fmtDate = iso =>
  new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });

export const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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

// Cache do intervalo de datas de cada trimestre (chave = data de hoje + startDate + aq) - o
// resultado é puramente função desses 3 valores, então dá pra reaproveitar entre todas as
// chamadas de um mesmo render (ex: renderOkrFocusStrip roda a cada toque em hábito e antes
// recomputava esse intervalo do zero pra cada KR automático de cada área).
let _qDatesCache = new Map();

export function getPeriodDates(p, aqOverride) {
  // ancorado ao meio-dia local (mesmo idioma de isExpected/fmtDate) - datas "AAAA-MM-DD" sem
  // hora sao interpretadas como meia-noite UTC pelo Date nativo, o que em fusos negativos (ex:
  // Brasil) pode empurrar o dia pro anterior e fazer o intervalo excluir o dia de hoje.
  const today = new Date(todayKey() + 'T12:00:00'); const days = [];
  if (p === 'semana') {
    for (let i = 6; i >= 0; i--) { const d = new Date(today); d.setDate(today.getDate() - i); days.push(dateKey(d)); }
  } else if (p === 'mes') {
    const y = today.getFullYear(), m = today.getMonth();
    const dim = new Date(y, m + 1, 0).getDate();
    for (let i = 1; i <= dim; i++) { days.push(dateKey(new Date(y, m, i))); }
  } else if (p === 'trimestre') {
    // aqOverride permite calcular o intervalo de um trimestre especifico (ex: passado, na
    // timeline de OKRs) em vez de sempre o trimestre ativo - sem isso, metricas pedidas pra um
    // trimestre passado acabavam avaliadas contra a janela de datas do trimestre atual.
    const aq = aqOverride || getActiveQ(state.userCfg.startDate);
    const cacheKey = `${todayKey()}|${state.userCfg.startDate}|${aq}`;
    const cached = _qDatesCache.get(cacheKey);
    if (cached) return cached;
    if (_qDatesCache.size > 20) _qDatesCache.clear(); // limite simples, evita crescer sem fim numa sessão longa
    const start = new Date((state.userCfg.startDate || todayKey()) + 'T12:00:00');
    const qs = new Date(start); qs.setMonth(start.getMonth() + (aq - 1) * 3);
    const qe = new Date(qs); qe.setMonth(qs.getMonth() + 3);
    let d = new Date(qs);
    while (d <= today && d < qe) { days.push(dateKey(d)); d.setDate(d.getDate() + 1); }
    _qDatesCache.set(cacheKey, days);
    return days;
  } else {
    const start = new Date((state.userCfg.startDate || todayKey()) + 'T12:00:00');
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

// Um dia conta como cumprido se a fração de hábitos esperados (isExpected) feitos naquele dia
// atinge o threshold (1 = todos, exigido pela conquista "Semana perfeita"; STREAK_THRESHOLD = 80%,
// usado pela sequência - com vários hábitos por dia, exigir 100% travava a streak por 1 hábito só).
// Dias sem nenhum hábito esperado não quebram a streak. Sem userHabits carregado, ou para
// datas anteriores ao cutover acima, usa o critério antigo de "algum hábito marcado".
export const STREAK_THRESHOLD = 0.8;

export function dayFulfilled(entry, date, threshold = 1) {
  const habits = state.userHabits || [];
  const doneMap = (entry && entry.habits) || {};
  if (!habits.length || date < STRICT_CRITERIA_SINCE) return Object.values(doneMap).some(Boolean);
  const expected = habits.filter(h => isExpected(h, date));
  if (!expected.length) return true;
  const doneCount = expected.filter(h => !!doneMap[h.id]).length;
  return doneCount / expected.length >= threshold;
}

// Chave de mês-calendário (ex: "2026-7" pra agosto/2026, mês 0-indexado como Date.getMonth())
// usada pelo perdão de streak abaixo — 1 por mês, não reseta por streak, é do calendário real.
const monthKeyOf = date => { const d = new Date(date + 'T12:00:00'); return `${d.getFullYear()}-${d.getMonth()}`; };

// Sequência atual (streak "ao vivo"), andando pra trás a partir de ontem. 1 perdão automático
// por mês-calendário: um dia não cumprido não soma à sequência, mas também não a quebra — a
// menos que o perdão daquele mês já tenha sido usado, aí quebra normalmente. O limite de
// iteração fica independente do contador de streak (que pode ficar "parado" em dias perdoados),
// senão um histórico com meses inteiros sem dado nenhum faria o laço rodar indefinidamente.
export function calcStreak(lg) {
  const map = Object.fromEntries(lg.map(e => [e.date, e]));
  const pardonedMonths = new Set();
  let s = 0; let d = new Date(); d.setDate(d.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    const k = dateKey(d);
    if (dayFulfilled(map[k], k, STREAK_THRESHOLD)) {
      s++;
    } else {
      const mk = monthKeyOf(k);
      if (pardonedMonths.has(mk)) break;
      pardonedMonths.add(mk);
    }
    d.setDate(d.getDate() - 1);
  }
  if (dayFulfilled(map[todayKey()], todayKey(), STREAK_THRESHOLD)) s++;
  return s;
}

// Maior sequência dentro de um intervalo de datas (ordem cronológica, mais antiga primeiro),
// com o mesmo perdão de 1 dia por mês-calendário do calcStreak — usada por getBestStreak() e
// pelas métricas de sequência do motor de KRs automáticos (habitStreakInQuarter/
// overallStreakInQuarter), pra que toda medida de "sequência" do app siga o mesmo critério.
export function longestRunWithPardon(dates, isFulfilledFn) {
  const pardonedMonths = new Set();
  let best = 0, cur = 0;
  dates.forEach(date => {
    if (isFulfilledFn(date)) {
      cur++; if (cur > best) best = cur;
    } else {
      const mk = monthKeyOf(date);
      if (pardonedMonths.has(mk)) cur = 0;
      else pardonedMonths.add(mk);
    }
  });
  return best;
}

export function sanitize(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Formata um valor para uma celula CSV: neutraliza injecao de formula (Excel/Sheets executam
// valores comecando com =,+,-,@) e escapa aspas/virgulas/quebras de linha via RFC 4180.
export function csvField(val) {
  let s = String(val ?? '');
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function getBestStreak(lg) {
  if (!lg.length) return 0;
  const map = Object.fromEntries(lg.map(e => [e.date, e]));
  const firstDate = [...lg].map(e => e.date).sort()[0];
  const dates = []; let d = new Date(firstDate + 'T12:00:00'); const end = new Date();
  while (d <= end) { dates.push(dateKey(d)); d.setDate(d.getDate() + 1); }
  return longestRunWithPardon(dates, k => dayFulfilled(map[k], k, STREAK_THRESHOLD));
}

// ---- Métricas escopadas ao trimestre ativo (getPeriodDates('trimestre')) — usadas tanto pelo
// motor de KRs automáticos (okrs.js) quanto pelas Ações do trimestre (checkin.js). Leem só dado
// já coletado (log de check-ins / state.userCfg.finLog), nenhuma coleta nova.

export function habitPctInQuarter(log, habitId, aq) {
  const h = (state.userHabits || []).find(x => x.id === habitId);
  if (!h) return 0;
  const dates = getPeriodDates('trimestre', aq);
  const logMap = Object.fromEntries(log.map(e => [e.date, e]));
  let done = 0, possible = 0;
  dates.forEach(date => {
    if (isExpected(h, date)) {
      possible++;
      const e = logMap[date];
      if (e && e.habits[habitId]) done++;
    }
  });
  return possible > 0 ? done / possible : 0;
}

export function weeklyFreqInQuarter(log, habitId, aq) {
  const dates = getPeriodDates('trimestre', aq);
  if (!dates.length) return 0;
  const logMap = Object.fromEntries(log.map(e => [e.date, e]));
  let doneCount = 0;
  dates.forEach(date => { const e = logMap[date]; if (e && e.habits[habitId]) doneCount++; });
  return doneCount / (dates.length / 7);
}

export function habitStreakInQuarter(log, habitId, aq) {
  const dates = getPeriodDates('trimestre', aq);
  const logMap = Object.fromEntries(log.map(e => [e.date, e]));
  return longestRunWithPardon(dates, date => { const e = logMap[date]; return !!(e && e.habits[habitId]); });
}

export function overallStreakInQuarter(log, aq) {
  const dates = getPeriodDates('trimestre', aq);
  const logMap = Object.fromEntries(log.map(e => [e.date, e]));
  return longestRunWithPardon(dates, date => dayFulfilled(logMap[date], date, STREAK_THRESHOLD));
}

export function overallPctInQuarter(log, aq) {
  const dates = getPeriodDates('trimestre', aq);
  const logMap = Object.fromEntries(log.map(e => [e.date, e]));
  let done = 0, possible = 0;
  dates.forEach(date => {
    (state.userHabits || []).forEach(h => {
      if (isExpected(h, date)) { possible++; const e = logMap[date]; if (e && e.habits[h.id]) done++; }
    });
  });
  return possible > 0 ? done / possible : 0;
}

// meses do trimestre (default = ativo, ou o trimestre passado em aqOverride) ja decorridos
// (inclui o atual), no formato "AAAA-MM" usado em finLog
export function quarterMonthsSoFar(aqOverride) {
  const aq = aqOverride || getActiveQ(state.userCfg.startDate);
  const start = new Date(state.userCfg.startDate || new Date());
  const qs = new Date(start.getFullYear(), start.getMonth() + (aq - 1) * 3, 1);
  const now = new Date();
  const months = [];
  let d = new Date(qs);
  while (d <= now && months.length < 3) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    d.setMonth(d.getMonth() + 1);
  }
  return months;
}

export function finLogConsistencyInQuarter(aq) {
  const months = quarterMonthsSoFar(aq);
  const finLog = state.userCfg.finLog || [];
  const withData = months.filter(m => {
    const entry = finLog.find(x => x.mes === m);
    return entry && ((entry.guardado || 0) + (entry.investido || 0)) > 0;
  });
  return { done: withData.length, total: months.length };
}

export function finLogGrowthInQuarter(aq) {
  const months = quarterMonthsSoFar(aq);
  if (months.length < 2) return false;
  const finLog = state.userCfg.finLog || [];
  const totalFor = m => { const e = finLog.find(x => x.mes === m); return e ? (e.guardado || 0) + (e.investido || 0) : 0; };
  return totalFor(months[months.length - 1]) > totalFor(months[0]);
}

// Valor de gasto registrado no dia (hábito "financas", detalhe tipo amount) - 0 se não registrado.
export function gastoDoDia(entry) {
  return parseFloat(entry && entry.idiomDetails && entry.idiomDetails.financas && entry.idiomDetails.financas.valor) || 0;
}

export function sumGastosInPeriod(dates, logMap) {
  return dates.reduce((sum, date) => sum + gastoDoDia(logMap[date]), 0);
}
