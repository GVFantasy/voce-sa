import { state, IDIOMA_MAP, ENERGY } from './state.js';
import { saveCfgAll } from './db.js';
import { showToast, getActiveQ, todayKey, calcStreak, getBestStreak, isExpected, sanitize } from './utils.js';
import { buildHabitsFromCfg } from './habits.js';
import { getPlans, getActivePlanId } from './plans.js';

export function renderPerfil() {
  const aq = getActiveQ(state.userCfg.startDate);
  const ql = ['', 'Fundação', 'Aceleração', 'Escala', 'Colheita'];
  document.getElementById('prof-nome').textContent = state.userCfg.name || '';
  document.getElementById('prof-email').textContent = state.currentUser?.email || '';
  document.getElementById('prof-inicio').textContent = state.userCfg.startDate
    ? new Date(state.userCfg.startDate + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
  document.getElementById('prof-trimestre').textContent = `Q${aq} — ${ql[aq]}`;
  if (state.userCfg.sonoMeta) document.getElementById('pref-sono').value = state.userCfg.sonoMeta;
  if (state.userCfg.inglesMeta) document.getElementById('pref-ingles').value = state.userCfg.inglesMeta;
  const allIdiomas = Object.entries(IDIOMA_MAP).map(([id, v]) => ({ id, ...v }));
  const ativos = state.userCfg.idiomasAtivos || ['ingles'];
  document.getElementById('idiom-toggles').innerHTML = allIdiomas.map(id => {
    const on = ativos.includes(id.id);
    return `<div class="idiom-row"><div class="idiom-info"><div style="font-size:18px">${id.icon}</div><div><div class="idiom-name">${id.name}</div></div></div><div class="toggle-switch ${on ? 'on' : ''}" onclick="toggleIdioma('${id.id}',this)"></div></div>`;
  }).join('');
  document.getElementById('dark-toggle').classList.toggle('on', localStorage.getItem('voce_sa_dark') === '1');
  if (state.userCfg.lembreteHora) document.getElementById('pref-lembrete').value = state.userCfg.lembreteHora;
  document.getElementById('lembrete-toggle').classList.toggle('on', !!state.userCfg.lembreteAtivo);
  document.getElementById('notif-status').textContent = state.userCfg.lembreteAtivo ? 'Lembrete ativo ✓' : '';
  const activePlan = getPlans().find(p => p.id === getActivePlanId());
  if (activePlan) document.getElementById('plan-badge').textContent = activePlan.emoji + ' ' + activePlan.name;

  // Stats block
  const totalCheckins = state.log.length;
  const bestStreakVal = getBestStreak(state.log);
  const currentStreakVal = calcStreak(state.log);
  let bestHabit = null, bestHabitPct = 0;
  if (state.log.length >= 5) {
    state.userHabits.forEach(h => {
      const expected = state.log.filter(e => isExpected(h, e.date));
      const done = expected.filter(e => e.habits && e.habits[h.id]).length;
      const pct = expected.length > 0 ? Math.round(done / expected.length * 100) : 0;
      if (pct > bestHabitPct) { bestHabitPct = pct; bestHabit = h; }
    });
  }
  const statsEl = document.getElementById('prof-stats');
  if (statsEl) statsEl.innerHTML = `
    <div class="prof-stat-grid">
      <div class="prof-stat"><div class="prof-stat-val">${totalCheckins}</div><div class="prof-stat-label">check-ins</div></div>
      <div class="prof-stat"><div class="prof-stat-val">${currentStreakVal}d</div><div class="prof-stat-label">streak atual</div></div>
      <div class="prof-stat"><div class="prof-stat-val">${bestStreakVal}d</div><div class="prof-stat-label">melhor streak</div></div>
      <div class="prof-stat"><div class="prof-stat-val">${bestHabit ? bestHabitPct + '%' : '—'}</div><div class="prof-stat-label">${bestHabit ? sanitize(bestHabit.icon + ' ' + bestHabit.name) : 'hábito top'}</div></div>
    </div>`;
}

export async function savePerfil() {
  state.userCfg.sonoMeta = parseInt(document.getElementById('pref-sono').value) || 7;
  state.userCfg.inglesMeta = parseInt(document.getElementById('pref-ingles').value) || 20;
  await saveCfgAll(true);
}

export async function toggleIdioma(id, el) {
  el.classList.toggle('on');
  const ativos = state.userCfg.idiomasAtivos || ['ingles'];
  const idx = ativos.indexOf(id);
  if (idx >= 0 && ativos.length > 1) ativos.splice(idx, 1); else if (idx < 0) ativos.push(id);
  state.userCfg.idiomasAtivos = ativos;
  await saveCfgAll(false);
  const { renderCheckin } = await import('./checkin.js');
  buildHabitsFromCfg(); renderCheckin();
}

export function toggleDark() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('voce_sa_dark', isDark ? '1' : '0');
  document.getElementById('dark-toggle').classList.toggle('on', isDark);
}

export function applyDarkIfSaved() {
  if (localStorage.getItem('voce_sa_dark') === '1') document.body.classList.add('dark');
}

export function exportCSV() {
  const headers = 'Data,' + state.userHabits.map(h => h.name).join(',') + ',Energia,Nota';
  const rows = state.log.map(e => {
    const habits = state.userHabits.map(h => e.habits && e.habits[h.id] ? 'Sim' : 'Não').join(',');
    return `${e.date},${habits},${e.energy ? ENERGY[e.energy] : ''},${(e.nota || '').replace(/,/g, ';')}`;
  });
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = 'voce_sa_historico.csv'; a.click(); URL.revokeObjectURL(url);
}

export async function saveReminder() {
  state.userCfg.lembreteHora = document.getElementById('pref-lembrete').value;
  await saveCfgAll(false);
  if (state.userCfg.lembreteAtivo) scheduleReminder();
}

export async function toggleReminder(el) {
  if (Notification.permission === 'denied') {
    document.getElementById('notif-status').textContent = 'Notificações bloqueadas no navegador.';
    showToast('Notificações bloqueadas. Verifique as permissões do navegador.', 'err'); return;
  }
  if (Notification.permission !== 'granted') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      document.getElementById('notif-status').textContent = 'Permissão negada.';
      showToast('Permissão de notificação negada.', 'err'); return;
    }
  }
  state.userCfg.lembreteAtivo = !state.userCfg.lembreteAtivo;
  if (state.userCfg.lembreteAtivo && !state.userCfg.lembreteHora) {
    state.userCfg.lembreteHora = document.getElementById('pref-lembrete').value || '19:30';
  }
  el.classList.toggle('on', state.userCfg.lembreteAtivo);
  await saveCfgAll(false);
  document.getElementById('notif-status').textContent = state.userCfg.lembreteAtivo ? 'Lembrete ativo ✓' : 'Lembrete desativado';
  if (state.userCfg.lembreteAtivo) { scheduleReminder(); showToast('Lembrete ativado!'); }
}

export function scheduleReminder() {
  if (!state.userCfg.lembreteAtivo || !state.userCfg.lembreteHora) return;
  const [h, m] = state.userCfg.lembreteHora.split(':').map(Number);
  const now = new Date(); const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const ms = target - now;
  clearTimeout(window._reminderTimer);
  window._reminderTimer = setTimeout(() => {
    const today = todayKey();
    const checkedIn = state.log.some(e => e.date === today && Object.values(e.habits || {}).some(Boolean));
    if (!checkedIn && Notification.permission === 'granted') {
      new Notification('Você S.A. 🔥', { body: 'Hora do seu check-in! Não deixe o streak quebrar.', icon: 'icons/icon-192.png' });
    }
    scheduleReminder();
  }, ms);
}

export function initReminder() {
  if (state.userCfg.lembreteAtivo && Notification.permission === 'granted') scheduleReminder();
}
