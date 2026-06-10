import { state, ENERGY, ECLASS, REFLECTIONS } from './state.js';
import { sb, setSyncStatus } from './db.js';
import { todayKey, isExpected, showToast, calcStreak, getPeriodDates } from './utils.js';
import { getActivePlanId } from './plans.js';

export function renderCheckin() {
  const today = todayKey();
  const ex = state.log.find(e => e.date === today);
  state.ts = ex
    ? { habits: { ...ex.habits }, energy: ex.energy || 0, nota: ex.nota || '', idiomDetails: { ...ex.idiomDetails || {} } }
    : { habits: {}, energy: 0, nota: '', idiomDetails: {} };
  const h = new Date().getHours();
  document.getElementById('greeting').textContent =
    (h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite') + ', ' + state.userCfg.name;
  document.getElementById('sub-date').textContent =
    new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('streak-val').textContent = calcStreak(state.log) + 'd';
  document.getElementById('reflection-q').textContent = REFLECTIONS[new Date().getDay() % REFLECTIONS.length];
  if (new Date().getDay() === 5) {
    document.getElementById('weekly-review-banner').style.display = 'block';
    renderWeeklyReview();
  } else {
    document.getElementById('weekly-review-banner').style.display = 'none';
  }
  if (!state.userHabits.length) {
    document.getElementById('habit-list').innerHTML =
      '<div class="empty-state"><strong>Nenhum hábito configurado</strong>Vá em Configurações (⚙️) para definir suas áreas e hábitos do plano de 12 meses.</div>';
  } else {
    document.getElementById('habit-list').innerHTML = state.userHabits.map(h => {
      const done = !!state.ts.habits[h.id]; const exp = isExpected(h, today); const isExtra = done && !exp;
      return `<div class="habit-card ${done ? 'done' : ''} ${!exp && !done ? 'skip' : ''}" id="hcard-${h.id}">
        <div class="habit-main" onclick="toggleHabit('${h.id}')">
          <div class="habit-left"><div class="habit-icon">${h.icon}</div>
          <div><div class="habit-name">${h.name}${isExtra ? '<span class="habit-extra-tag">extra</span>' : ''}</div><div class="habit-days">${exp ? h.days : 'toque para registrar como extra'}</div></div></div>
          <div class="habit-toggle">${done ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</div>
        </div>
        ${h.hasDetail ? `<div class="habit-detail ${done ? 'open' : ''}" id="hdetail-${h.id}">
          <div class="hd-label">Tempo</div>
          <div class="hd-chips">${h.detailOptions.time.map(t => `<button class="hd-chip ${(state.ts.idiomDetails[h.id] || {}).time === t ? 'on' : ''}" onclick="setHabitDetail('${h.id}','time','${t}')">${t}</button>`).join('')}</div>
          <div class="hd-label">Método</div>
          <div class="hd-chips">${h.detailOptions.method.map(m => `<button class="hd-chip ${(state.ts.idiomDetails[h.id] || {}).method === m ? 'on' : ''}" onclick="setHabitDetail('${h.id}','method','${m}')">${m}</button>`).join('')}</div>
        </div>` : ''}
      </div>`;
    }).join('');
  }
  [1, 2, 3].forEach(i => {
    const b = document.getElementById('e' + i);
    if (b) b.className = 'e-btn' + (state.ts.energy === i ? ' ' + ECLASS[i] : '');
  });
  const na = document.getElementById('nota-area'); if (na) na.value = state.ts.nota;
}

export function toggleHabit(id) {
  state.ts.habits[id] = !state.ts.habits[id]; const done = state.ts.habits[id];
  const card = document.getElementById('hcard-' + id); if (!card) return;
  const h = state.userHabits.find(x => x.id === id);
  const exp = h ? isExpected(h, todayKey()) : true; const isExtra = done && !exp;
  card.className = 'habit-card' + (done ? ' done' : '');
  card.querySelector('.habit-toggle').innerHTML = done
    ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
    : '';
  const nameEl = card.querySelector('.habit-name');
  if (nameEl && h) nameEl.innerHTML = h.name + (isExtra ? '<span class="habit-extra-tag">extra</span>' : '');
  const detail = document.getElementById('hdetail-' + id); if (detail) detail.classList.toggle('open', done);
  if (done) { card.classList.add('pop'); setTimeout(() => card.classList.remove('pop'), 200); }
}

export function setHabitDetail(habitId, key, val) {
  if (!state.ts.idiomDetails[habitId]) state.ts.idiomDetails[habitId] = {};
  state.ts.idiomDetails[habitId][key] = val;
  const detail = document.getElementById('hdetail-' + habitId); if (!detail) return;
  const groups = detail.querySelectorAll('.hd-chips');
  groups.forEach((group, gi) => {
    const gKey = gi === 0 ? 'time' : 'method';
    if (gKey === key) { group.querySelectorAll('.hd-chip').forEach(chip => { chip.classList.toggle('on', chip.textContent === val); }); }
  });
}

export function setEnergy(val) {
  state.ts.energy = val;
  [1, 2, 3].forEach(i => {
    const b = document.getElementById('e' + i);
    if (b) b.className = 'e-btn' + (i === val ? ' ' + ECLASS[i] : '');
  });
}

export async function saveDay() {
  if (!state.currentUser) { showToast('Sessão expirada. Faça login novamente.', 'err'); return; }
  const na = document.getElementById('nota-area'); state.ts.nota = na ? na.value : '';
  const btn = document.getElementById('save-btn'); btn.disabled = true; btn.textContent = 'Salvando...';
  const entry = { date: todayKey(), habits: { ...state.ts.habits }, energy: state.ts.energy, nota: state.ts.nota, idiomDetails: { ...state.ts.idiomDetails } };
  const idx = state.log.findIndex(e => e.date === todayKey());
  if (idx >= 0) state.log[idx] = entry; else state.log.unshift(entry);
  const prevStreak = calcStreak(state.log.filter(e => e.date !== todayKey()));
  const newStreak = calcStreak(state.log);
  document.getElementById('streak-val').textContent = newStreak + 'd';
  setSyncStatus('syncing', 'Salvando...');
  try {
    const { error } = await sb.from('checkins').upsert({
      user_id: state.currentUser.id, date: todayKey(),
      habits: state.ts.habits, energy: state.ts.energy, nota: state.ts.nota,
      idiomDetails: state.ts.idiomDetails,
      plan_id: getActivePlanId(),
    }, { onConflict: 'user_id,date' });
    btn.disabled = false; btn.textContent = 'Salvar check-in';
    if (error) {
      setSyncStatus('err', 'Erro ao salvar');
      showToast('Erro ao salvar: ' + error.message, 'err');
    } else {
      setSyncStatus('ok', 'Sincronizado');
      const t = document.getElementById('toast'); if (t) t.textContent = '';
      showToast('Check-in salvo com sucesso!');
      btn.classList.add('saved'); setTimeout(() => btn.classList.remove('saved'), 1200);
    }
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Salvar check-in';
    setSyncStatus('err', 'Sem conexão');
    showToast('Check-in salvo localmente. Sem conexão com o servidor.', 'info');
  }
  if (newStreak > prevStreak) showBoom(newStreak);
  const { renderDashboard } = await import('./dashboard.js');
  const { renderHistorico } = await import('./historico.js');
  const { renderConquistas } = await import('./conquistas.js');
  renderDashboard(); renderHistorico(); renderConquistas();
}

export function renderWeeklyReview() {
  const dates = getPeriodDates('semana'); let html = '';
  const logMap = Object.fromEntries(state.log.map(e => [e.date, e]));
  state.userHabits.forEach(h => {
    let done = 0, possible = 0;
    dates.forEach(date => {
      if (isExpected(h, date)) {
        possible++;
        const e = logMap[date];
        if (e && e.habits[h.id]) done++;
      }
    });
    const pct = possible > 0 ? Math.round(done / possible * 100) : 0;
    const cls = pct >= 80 ? 'rs-ok' : pct >= 50 ? 'rs-warn' : 'rs-bad';
    html += `<div class="review-stat"><div class="rs-label">${h.icon} ${h.name}</div><div class="rs-val ${cls}">${done}/${possible}</div></div>`;
  });
  document.getElementById('review-stats').innerHTML = html;
}

export function setReviewFeel(val, btn) {
  state.reviewData.feel = val;
  document.querySelectorAll('#review-feel .review-opt').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  const box = document.getElementById('review-impact');
  if (val === 'pesada') {
    box.style.display = 'block';
    box.textContent = '⚠️ Semanas pesadas são normais. O importante é não pular 2 dias seguidos do mesmo hábito. Reduza a intensidade, não a frequência.';
  } else {
    box.style.display = 'none';
  }
}

export function toggleReviewAdjust(val, btn) {
  btn.classList.toggle('on');
  const idx = state.reviewData.adjust.indexOf(val);
  if (idx >= 0) state.reviewData.adjust.splice(idx, 1); else state.reviewData.adjust.push(val);
}

export function saveWeeklyReview() {
  document.getElementById('weekly-review-banner').style.display = 'none';
  const t = document.getElementById('toast'); t.textContent = '✓ Revisão salva!';
  setTimeout(() => { t.textContent = ''; }, 2000);
  showToast('Revisão da semana salva!');
}

export function showBoom(streak) {
  const el = document.getElementById('streak-boom');
  document.getElementById('streak-boom-num').textContent = '🔥 ' + streak;
  document.getElementById('streak-boom-label').textContent =
    streak === 1 ? 'primeiro dia!' : streak < 7 ? 'dias seguidos!' : streak < 30 ? 'dias! Continue!' : 'dias! Incrível!';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3500);
}

export function hideBoom() {
  document.getElementById('streak-boom').classList.remove('show');
}
