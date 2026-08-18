import { state, IDIOMA_MAP, ENERGY } from './state.js';
import { saveCfgAll, sb } from './db.js';
import { showToast, getActiveQ, todayKey, calcStreak, getBestStreak, isExpected, sanitize, showFieldErr, clearFieldErr, dayFulfilled, csvField, isValidEmail } from './utils.js';
import { buildHabitsFromCfg } from './habits.js';
import { getPlans, getActivePlanId } from './plans.js';
import { subscribeToPush, unsubscribeFromPush } from './push.js';

export function renderPerfil() {
  const aq = getActiveQ(state.userCfg.startDate);
  const ql = ['', 'Fundação', 'Aceleração', 'Escala', 'Colheita'];
  document.getElementById('prof-nome').textContent = state.userCfg.name || '';
  document.getElementById('prof-email').textContent = state.currentUser?.email || '';
  document.getElementById('prof-inicio').textContent = state.userCfg.startDate
    ? new Date(state.userCfg.startDate + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
  document.getElementById('prof-trimestre').textContent = `Q${aq} — ${ql[aq]}`;

  const sonoMeta = state.userCfg.sonoMeta || 7;
  document.querySelectorAll('#sono-chips .ob-chip').forEach(btn => {
    btn.classList.toggle('on', parseInt(btn.dataset.val) === sonoMeta);
  });

  const areas = state.userCfg.areas || [];
  const treWrap = document.getElementById('treino-dias-wrap');
  if (treWrap) {
    treWrap.style.display = areas.includes('corpo') ? '' : 'none';
    if (areas.includes('corpo')) {
      const treinoDias = state.userCfg.treinoDias || [2, 4, 6];
      document.querySelectorAll('#treino-dias-btns .ob-day-btn').forEach((btn, i) => {
        btn.classList.toggle('on', treinoDias.includes(i));
      });
    }
  }

  const estWrap = document.getElementById('estudo-dias-wrap');
  if (estWrap) {
    estWrap.style.display = areas.includes('mente') ? '' : 'none';
    if (areas.includes('mente')) {
      const estudoDias = state.userCfg.estudoDias || [1, 3, 5];
      document.querySelectorAll('#estudo-dias-btns .ob-day-btn').forEach((btn, i) => {
        btn.classList.toggle('on', estudoDias.includes(i));
      });
    }
  }

  const finSection = document.getElementById('fin-pref-section');
  if (finSection) {
    const hasFinancas = (state.userCfg.areas || []).includes('financas');
    finSection.style.display = hasFinancas ? '' : 'none';
    if (hasFinancas) {
      const finPerfil = state.userCfg.finPerfil || 'iniciante';
      document.querySelectorAll('#fin-perfil-chips .ob-chip').forEach(btn => {
        btn.classList.toggle('on', btn.dataset.val === finPerfil);
      });
      const metaEl = document.getElementById('pref-fin-meta');
      if (metaEl && state.userCfg.finMeta) metaEl.value = state.userCfg.finMeta;
    }
  }

  const customList = document.getElementById('custom-habits-list');
  if (customList) {
    const custom = state.userCfg.customHabits || [];
    customList.innerHTML = custom.length ? custom.map(h => `
      <div class="idiom-row"><div class="idiom-info"><div style="font-size:18px">${sanitize(h.icon)}</div><div><div class="idiom-name">${sanitize(h.name)}</div></div></div>
      <button aria-label="Excluir hábito" onclick="deleteCustomHabit('${h.id}')" style="background:none;border:none;cursor:pointer;padding:4px;opacity:.5;line-height:1;display:flex"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div>
    `).join('') : '';
  }

  const allIdiomas = Object.entries(IDIOMA_MAP).map(([id, v]) => ({ id, ...v }));
  const ativos = state.userCfg.idiomasAtivos || ['ingles'];
  document.getElementById('idiom-toggles').innerHTML = allIdiomas.map(id => {
    const on = ativos.includes(id.id);
    return `<div class="idiom-row"><div class="idiom-info"><div style="font-size:18px">${id.icon}</div><div><div class="idiom-name">${id.name}</div></div></div><div class="toggle-switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="${sanitize(id.name)} ativo" tabindex="0" onclick="toggleIdioma('${id.id}',this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleIdioma('${id.id}',this)}"></div></div>`;
  }).join('');

  const darkOn = document.body.classList.contains('dark');
  const darkToggleEl = document.getElementById('dark-toggle');
  darkToggleEl.classList.toggle('on', darkOn);
  darkToggleEl.setAttribute('aria-checked', darkOn);
  if (state.userCfg.lembreteHora) document.getElementById('pref-lembrete').value = state.userCfg.lembreteHora;
  const lembreteOn = !!state.userCfg.lembreteAtivo;
  const lembreteToggleEl = document.getElementById('lembrete-toggle');
  lembreteToggleEl.classList.toggle('on', lembreteOn);
  lembreteToggleEl.setAttribute('aria-checked', lembreteOn);
  document.getElementById('notif-status').textContent = state.userCfg.lembreteAtivo ? 'Lembrete ativo ✓' : '';
  const activePlan = getPlans().find(p => p.id === getActivePlanId());
  if (activePlan) document.getElementById('plan-badge').textContent = activePlan.emoji + ' ' + activePlan.name;

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
  await saveCfgAll(true);
}

export async function toggleSonoMeta(h) {
  state.userCfg.sonoMeta = h;
  document.querySelectorAll('#sono-chips .ob-chip').forEach(btn => {
    btn.classList.toggle('on', parseInt(btn.dataset.val) === h);
  });
  await saveCfgAll(false);
  buildHabitsFromCfg();
  const { renderCheckin } = await import('./checkin.js');
  renderCheckin();
}

export async function toggleTreinoDia(d) {
  const dias = [...(state.userCfg.treinoDias || [2, 4, 6])];
  const idx = dias.indexOf(d);
  if (idx >= 0 && dias.length > 1) dias.splice(idx, 1);
  else if (idx < 0) dias.push(d);
  state.userCfg.treinoDias = dias;
  document.querySelectorAll('#treino-dias-btns .ob-day-btn').forEach((btn, i) => {
    btn.classList.toggle('on', dias.includes(i));
  });
  await saveCfgAll(false);
  buildHabitsFromCfg();
  const { renderCheckin } = await import('./checkin.js');
  renderCheckin();
}

export async function toggleFinPerfil(perfil) {
  state.userCfg.finPerfil = perfil;
  document.querySelectorAll('#fin-perfil-chips .ob-chip').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.val === perfil);
  });
  await saveCfgAll(false);
}

export async function saveFinMeta() {
  const val = parseFloat(document.getElementById('pref-fin-meta')?.value || '0') || 0;
  state.userCfg.finMeta = val;
  await saveCfgAll(false);
}

export async function toggleEstudoDia(d) {
  const dias = [...(state.userCfg.estudoDias || [1, 3, 5])];
  const idx = dias.indexOf(d);
  if (idx >= 0 && dias.length > 1) dias.splice(idx, 1);
  else if (idx < 0) dias.push(d);
  state.userCfg.estudoDias = dias;
  document.querySelectorAll('#estudo-dias-btns .ob-day-btn').forEach((btn, i) => {
    btn.classList.toggle('on', dias.includes(i));
  });
  await saveCfgAll(false);
  buildHabitsFromCfg();
  const { renderCheckin } = await import('./checkin.js');
  renderCheckin();
}

export async function toggleIdioma(id, el) {
  el.classList.toggle('on');
  el.setAttribute('aria-checked', el.classList.contains('on'));
  const ativos = state.userCfg.idiomasAtivos || ['ingles'];
  const idx = ativos.indexOf(id);
  if (idx >= 0 && ativos.length > 1) ativos.splice(idx, 1); else if (idx < 0) ativos.push(id);
  state.userCfg.idiomasAtivos = ativos;
  await saveCfgAll(false);
  buildHabitsFromCfg();
  const { renderCheckin } = await import('./checkin.js');
  renderCheckin();
}

export async function toggleDark() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('voce_sa_dark', isDark ? '1' : '0');
  const toggleEl = document.getElementById('dark-toggle');
  toggleEl.classList.toggle('on', isDark);
  toggleEl.setAttribute('aria-checked', isDark);
  state.userCfg.darkMode = isDark;
  await saveCfgAll(false);
}

// userCfg.darkMode é a fonte de verdade após login (sincroniza entre dispositivos);
// localStorage é usado só como cache local antes do primeiro carregamento de config.
export function applyDarkIfSaved() {
  const hasRemotePref = typeof state.userCfg.darkMode === 'boolean';
  const isDark = hasRemotePref ? state.userCfg.darkMode : localStorage.getItem('voce_sa_dark') === '1';
  document.body.classList.toggle('dark', isDark);
  localStorage.setItem('voce_sa_dark', isDark ? '1' : '0');
  const toggle = document.getElementById('dark-toggle');
  if (toggle) { toggle.classList.toggle('on', isDark); toggle.setAttribute('aria-checked', isDark); }
}

export function exportCSV() {
  const headers = ['Data', ...state.userHabits.map(h => h.name), 'Energia', 'Nota'].map(csvField).join(',');
  const rows = state.log.map(e => {
    const habits = state.userHabits.map(h => e.habits && e.habits[h.id] ? 'Sim' : 'Não');
    return [e.date, ...habits, e.energy ? ENERGY[e.energy] : '', e.nota || ''].map(csvField).join(',');
  });
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = 'voce_sa_historico.csv'; a.click(); URL.revokeObjectURL(url);
}

// Mesmo dado do exportCSV(), em formato alternativo (mais fácil de reprocessar programaticamente).
export function exportJSON() {
  const data = state.log.map(e => ({
    data: e.date,
    habitos: Object.fromEntries(state.userHabits.map(h => [h.name, !!(e.habits && e.habits[h.id])])),
    energia: e.energy ? ENERGY[e.energy] : null,
    nota: e.nota || '',
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = 'voce_sa_historico.json'; a.click(); URL.revokeObjectURL(url);
}

export async function saveReminder() {
  const val = document.getElementById('pref-lembrete').value;
  if (!val) {
    showFieldErr('pref-lembrete', 'pref-lembrete-err', 'Escolha um horário para o lembrete.');
    return;
  }
  clearFieldErr('pref-lembrete-err');
  state.userCfg.lembreteHora = val;
  state.userCfg.tzOffsetMin = new Date().getTimezoneOffset();
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
  if (state.userCfg.lembreteAtivo) state.userCfg.tzOffsetMin = new Date().getTimezoneOffset();
  el.classList.toggle('on', state.userCfg.lembreteAtivo);
  el.setAttribute('aria-checked', state.userCfg.lembreteAtivo);
  await saveCfgAll(false);
  document.getElementById('notif-status').textContent = state.userCfg.lembreteAtivo ? 'Lembrete ativo ✓' : 'Lembrete desativado';
  if (state.userCfg.lembreteAtivo) {
    scheduleReminder(); showToast('Lembrete ativado!');
    subscribeToPush();
  } else {
    unsubscribeFromPush();
  }
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
    const entry = state.log.find(e => e.date === today);
    const fulfilled = dayFulfilled(entry, today);
    if (!fulfilled && Notification.permission === 'granted') {
      new Notification('Você S.A. 🔥', { body: 'Hora do seu check-in! Não deixe o streak quebrar.', icon: 'icons/icon-192.png' });
    }
    scheduleReminder();
  }, ms);
}

export function initReminder() {
  if (state.userCfg.lembreteAtivo && Notification.permission === 'granted') scheduleReminder();
}

export async function changeEmail() {
  const input = document.getElementById('prof-new-email');
  const email = input.value.trim();
  clearFieldErr('prof-new-email-err');
  if (!email || !isValidEmail(email)) {
    showFieldErr('prof-new-email', 'prof-new-email-err', 'Informe um email válido.');
    return;
  }
  const { error } = await sb.auth.updateUser({ email });
  if (error) { showFieldErr('prof-new-email', 'prof-new-email-err', error.message); return; }
  input.value = '';
  showToast('Confira sua caixa de entrada (atual e nova) para confirmar a troca de email.', 'info', 6000);
}

export async function addCustomHabit() {
  const input = document.getElementById('custom-habit-name');
  const name = input.value.trim();
  if (!name) { input.focus(); showToast('Dê um nome ao hábito.', 'info', 3000); return; }
  const icon = window._newHabitIcon || '⭐';
  const id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  if (!state.userCfg.customHabits) state.userCfg.customHabits = [];
  state.userCfg.customHabits.push({ id, name, icon, weekdays: [] });
  input.value = '';
  window._newHabitIcon = '⭐';
  document.querySelectorAll('#custom-habit-icon-chips .ob-chip').forEach((c, i) => c.classList.toggle('on', i === 0));
  await saveCfgAll(false);
  buildHabitsFromCfg();
  renderPerfil();
  const { renderCheckin } = await import('./checkin.js');
  renderCheckin();
  showToast('Hábito adicionado!');
}

export async function deleteCustomHabit(id) {
  if (!confirm('Excluir este hábito? O histórico de check-ins já feitos não será apagado.')) return;
  state.userCfg.customHabits = (state.userCfg.customHabits || []).filter(h => h.id !== id);
  await saveCfgAll(false);
  buildHabitsFromCfg();
  renderPerfil();
  const { renderCheckin } = await import('./checkin.js');
  renderCheckin();
  showToast('Hábito removido.');
}

export async function deleteAccount() {
  const confirmInput = document.getElementById('prof-delete-confirm');
  clearFieldErr('prof-delete-err');
  if (confirmInput.value.trim().toLowerCase() !== 'excluir') {
    showFieldErr('prof-delete-confirm', 'prof-delete-err', 'Digite exatamente "excluir" para confirmar.');
    return;
  }
  const btn = document.getElementById('prof-delete-btn');
  if (btn.disabled) return;
  btn.disabled = true; btn.textContent = 'Excluindo...';
  const { error } = await sb.functions.invoke('delete-account');
  if (error) {
    btn.disabled = false; btn.textContent = 'Excluir minha conta';
    showFieldErr('prof-delete-confirm', 'prof-delete-err', 'Não foi possível excluir a conta: ' + error.message);
    return;
  }
  const { signOut } = await import('./auth.js');
  await signOut();
  showToast('Conta excluída. Sentiremos sua falta.', 'info', 5000);
}

export async function changePassword() {
  const input = document.getElementById('prof-new-pass');
  const pass = input.value;
  clearFieldErr('prof-new-pass-err');
  if (!pass || pass.length < 6) {
    showFieldErr('prof-new-pass', 'prof-new-pass-err', 'A senha deve ter pelo menos 6 caracteres.');
    return;
  }
  const { error } = await sb.auth.updateUser({ password: pass });
  if (error) { showFieldErr('prof-new-pass', 'prof-new-pass-err', error.message); return; }
  input.value = '';
  showToast('Senha alterada com sucesso!');
}
