import { state, ECLASS, REFLECTIONS } from './state.js';
import { getActiveObjective } from './okrs.js';
import { sb, setSyncStatus, saveCfgAll, saveTsLocal, loadTsLocal, clearTsLocal, queuePendingCheckin, clearPendingCheckin, refreshPendingCheckinIfQueued } from './db.js';
import { todayKey, isExpected, showToast, calcStreak, getPeriodDates, sanitize } from './utils.js';
import { getActivePlanId } from './plans.js';

// Persiste o rascunho não salvo do check-in de hoje, para não perder alterações ao trocar de aba.
// Se já existe uma entrada na fila de sincronização pendente (salvamento anterior que falhou
// offline), atualiza-a também — sem isso, o flush reenviaria valores desatualizados.
function persistTsDraft() {
  const today = todayKey();
  saveTsLocal(today, state.ts);
  refreshPendingCheckinIfQueued(today, {
    habits: { ...state.ts.habits, _d: state.ts.idiomDetails },
    energy: state.ts.energy, nota: state.ts.nota,
  });
}

// state.log só reflete o dia de hoje depois de "Salvar check-in" — pra mostrar o impacto de um
// toque no hábito em tempo real, montamos um log temporário com o rascunho do dia substituindo
// (ou inserindo) a entrada de hoje, sem alterar state.log de verdade.
function logWithTodayDraft() {
  const today = todayKey();
  const draftEntry = { date: today, habits: { ...state.ts.habits }, energy: state.ts.energy, nota: state.ts.nota, idiomDetails: { ...state.ts.idiomDetails } };
  const idx = state.log.findIndex(e => e.date === today);
  const log = [...state.log];
  if (idx >= 0) log[idx] = draftEntry; else log.unshift(draftEntry);
  return log;
}

// Indicador compacto (1 linha, toca e vai pra tela de OKRs) — o detalhe dos KRs mora só lá agora.
export function renderOkrFocusStrip() {
  const okrFocusEl = document.getElementById('okr-focus-strip');
  if (!okrFocusEl) return;
  const obj = getActiveObjective(logWithTodayDraft());
  okrFocusEl.innerHTML = obj
    ? `<div class="okr-focus-compact" role="button" tabindex="0" aria-label="Q${obj.aq}, ${sanitize(obj.areaName)}, ${sanitize(obj.label)}, ${obj.doneCnt} de ${obj.totalCnt} KRs — toque para ver a tela de OKRs" onclick="nav('okrs',null)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();nav('okrs',null)}">
        <span class="okr-focus-compact-q">Q${obj.aq} · ${sanitize(obj.areaName)}</span>
        <span class="okr-focus-compact-label">${sanitize(obj.label)}</span>
        <span class="okr-focus-compact-prog">${obj.doneCnt}/${obj.totalCnt} KRs</span>
      </div>`
    : '';
}

function renderDetailBlock(h, done) {
  const val = state.ts.idiomDetails[h.id] || {};
  const touched = !!(state.ts._detailTouched && state.ts._detailTouched[h.id]);
  if (h.detailType === 'amount') {
    const collapsed = val.valor !== undefined && val.valor !== '' && !touched;
    if (collapsed) {
      return `<div class="habit-detail-summary ${done ? 'open' : ''}" id="hdetail-${h.id}" role="button" tabindex="0" aria-label="Gasto registrado: R$ ${sanitize(val.valor)} — toque para editar" onclick="expandHabitDetail('${h.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();expandHabitDetail('${h.id}')}">
        <span>R$ ${sanitize(val.valor)}</span>
        <span class="hd-edit-link">editar</span>
      </div>`;
    }
    return `<div class="habit-detail ${done ? 'open' : ''}" id="hdetail-${h.id}">${renderAmountDetail(h, h.id)}</div>`;
  }
  const collapsed = val.time && val.method && !touched;
  if (collapsed) {
    return `<div class="habit-detail-summary ${done ? 'open' : ''}" id="hdetail-${h.id}" role="button" tabindex="0" aria-label="Tempo e método: ${sanitize(val.time)}, ${sanitize(val.method)} — toque para editar" onclick="expandHabitDetail('${h.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();expandHabitDetail('${h.id}')}">
      <span>${sanitize(val.time)} · ${sanitize(val.method)}</span>
      <span class="hd-edit-link">editar</span>
    </div>`;
  }
  return `<div class="habit-detail ${done ? 'open' : ''}" id="hdetail-${h.id}">${renderDetailChips(h, h.id)}</div>`;
}

function renderDetailChips(h, habitId) {
  return `<div class="hd-label">Tempo</div>
    <div class="hd-chips">${h.detailOptions.time.map(t => `<button class="hd-chip ${(state.ts.idiomDetails[habitId] || {}).time === t ? 'on' : ''}" onclick="setHabitDetail('${habitId}','time','${t}')">${t}</button>`).join('')}</div>
    <div class="hd-label">Método</div>
    <div class="hd-chips">${h.detailOptions.method.map(m => `<button class="hd-chip ${(state.ts.idiomDetails[habitId] || {}).method === m ? 'on' : ''}" onclick="setHabitDetail('${habitId}','method','${m}')">${m}</button>`).join('')}</div>`;
}

function renderAmountDetail(h, habitId) {
  const val = (state.ts.idiomDetails[habitId] || {}).valor ?? '';
  return `<div class="hd-label">${sanitize(h.detailOptions.label)}</div>
    <div class="fin-input-wrap"><span>R$</span><input type="number" inputmode="decimal" step="0.01" min="0" class="fin-input" placeholder="0,00" value="${sanitize(val)}" oninput="setHabitDetail('${habitId}','valor',this.value)"></div>`;
}

export function expandHabitDetail(habitId) {
  if (!state.ts._detailTouched) state.ts._detailTouched = {};
  state.ts._detailTouched[habitId] = true;
  const h = state.userHabits.find(x => x.id === habitId);
  const el = document.getElementById('hdetail-' + habitId);
  if (!el || !h) return;
  const done = !!state.ts.habits[habitId];
  const inner = h.detailType === 'amount' ? renderAmountDetail(h, habitId) : renderDetailChips(h, habitId);
  el.outerHTML = `<div class="habit-detail ${done ? 'open' : ''}" id="hdetail-${habitId}">${inner}</div>`;
}

export function renderCheckin() {
  const today = todayKey();
  const draft = loadTsLocal(today);
  if (draft) {
    state.ts = draft;
  } else {
    const ex = state.log.find(e => e.date === today);
    state.ts = ex
      ? { habits: { ...ex.habits }, energy: ex.energy || 0, nota: ex.nota || '', idiomDetails: { ...ex.idiomDetails || {} } }
      : { habits: {}, energy: 0, nota: '', idiomDetails: {} };
    if (!ex) {
      // dia novo: pré-preenche tempo/método de hábitos com detalhe com a última escolha do usuário
      state.userHabits.forEach(hb => {
        // valor gasto não é uma preferência que se repete como tempo/método - não pré-preencher
        if (!hb.hasDetail || hb.detailType === 'amount') return;
        const past = state.log.find(e => e.idiomDetails && e.idiomDetails[hb.id]);
        if (past) state.ts.idiomDetails[hb.id] = { ...past.idiomDetails[hb.id] };
      });
    }
  }
  const h = new Date().getHours();
  document.getElementById('greeting').textContent =
    (h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite') + ', ' + state.userCfg.name;
  document.getElementById('sub-date').textContent =
    new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('streak-val').textContent = calcStreak(state.log) + 'd';

  renderOkrFocusStrip();
  document.getElementById('reflection-q').textContent = REFLECTIONS[new Date().getDay() % REFLECTIONS.length];
  if (new Date().getDay() === 5 && state.userCfg.lastReviewedWeek !== today) {
    document.getElementById('weekly-review-banner').style.display = 'block';
    renderWeeklyReview();
  } else {
    document.getElementById('weekly-review-banner').style.display = 'none';
  }
  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (now.getDate() >= lastDayOfMonth - 2 && state.userCfg.lastReviewedMonth !== mesAtual) {
    document.getElementById('monthly-review-banner').style.display = 'block';
    renderMonthlyReview();
  } else {
    document.getElementById('monthly-review-banner').style.display = 'none';
  }
  if (!state.userHabits.length) {
    document.getElementById('habit-list').innerHTML =
      '<div class="empty-state"><strong>Nenhum hábito configurado</strong>Vá em Configurações (⚙️) para definir suas áreas e hábitos do plano de 12 meses.</div>';
  } else {
    const renderHabitCard = h => {
      const done = !!state.ts.habits[h.id]; const exp = isExpected(h, today); const isExtra = done && !exp;
      return `<div class="habit-card ${done ? 'done' : ''} ${!exp && !done ? 'skip' : ''}" id="hcard-${h.id}">
        <div class="habit-main" role="checkbox" aria-checked="${done}" aria-label="${sanitize(h.name)}" tabindex="0" onclick="toggleHabit('${h.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleHabit('${h.id}')}">
          <div class="habit-left"><div class="habit-icon">${sanitize(h.icon)}</div>
          <div><div class="habit-name">${sanitize(h.name)}${isExtra ? '<span class="habit-extra-tag">extra</span>' : ''}</div><div class="habit-days">${exp ? h.days : 'toque para registrar como extra'}</div></div></div>
          <div class="habit-toggle">${done ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</div>
        </div>
        ${h.hasDetail ? renderDetailBlock(h, done) : ''}
      </div>`;
    };
    const todayHabits = state.userHabits.filter(h => isExpected(h, today));
    const extraHabits = state.userHabits.filter(h => !isExpected(h, today));
    let html = todayHabits.length
      ? todayHabits.map(renderHabitCard).join('')
      : '<div class="empty-state" style="padding:18px"><strong>Nada esperado hoje</strong>Toque em "extra" abaixo se quiser registrar algo mesmo assim.</div>';
    if (extraHabits.length) {
      html += `<div class="sec-label" style="margin-top:14px">Extra, se quiser</div>` + extraHabits.map(renderHabitCard).join('');
    }
    document.getElementById('habit-list').innerHTML = html;
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
  const main = card.querySelector('.habit-main'); if (main) main.setAttribute('aria-checked', done);
  card.querySelector('.habit-toggle').innerHTML = done
    ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
    : '';
  const nameEl = card.querySelector('.habit-name');
  if (nameEl && h) nameEl.innerHTML = sanitize(h.name) + (isExtra ? '<span class="habit-extra-tag">extra</span>' : '');
  const detail = document.getElementById('hdetail-' + id); if (detail) detail.classList.toggle('open', done);
  if (done) { card.classList.add('pop'); setTimeout(() => card.classList.remove('pop'), 200); }
  persistTsDraft();
  renderOkrFocusStrip();
}

export function setHabitDetail(habitId, key, val) {
  if (!state.ts.idiomDetails[habitId]) state.ts.idiomDetails[habitId] = {};
  state.ts.idiomDetails[habitId][key] = val;
  if (!state.ts._detailTouched) state.ts._detailTouched = {};
  state.ts._detailTouched[habitId] = true;
  const detail = document.getElementById('hdetail-' + habitId); if (!detail) return;
  const groups = detail.querySelectorAll('.hd-chips');
  groups.forEach((group, gi) => {
    const gKey = gi === 0 ? 'time' : 'method';
    if (gKey === key) { group.querySelectorAll('.hd-chip').forEach(chip => { chip.classList.toggle('on', chip.textContent === val); }); }
  });
  persistTsDraft();
}

export function setEnergy(val) {
  state.ts.energy = val;
  [1, 2, 3].forEach(i => {
    const b = document.getElementById('e' + i);
    if (b) b.className = 'e-btn' + (i === val ? ' ' + ECLASS[i] : '');
  });
  persistTsDraft();
}

let _notaDebounce = null;
export function onNotaInput() {
  const na = document.getElementById('nota-area');
  state.ts.nota = na ? na.value : '';
  clearTimeout(_notaDebounce);
  _notaDebounce = setTimeout(persistTsDraft, 400);
}

export async function saveDay() {
  if (!state.currentUser) { showToast('Sessão expirada. Faça login novamente.', 'err'); return; }
  const na = document.getElementById('nota-area'); state.ts.nota = na ? na.value : '';
  const btn = document.getElementById('save-btn'); btn.disabled = true; btn.textContent = 'Salvando...';
  const entry = { date: todayKey(), habits: { ...state.ts.habits }, energy: state.ts.energy, nota: state.ts.nota, idiomDetails: { ...state.ts.idiomDetails }, plan_id: getActivePlanId() };
  const idx = state.log.findIndex(e => e.date === todayKey());
  if (idx >= 0) state.log[idx] = entry; else state.log.unshift(entry);
  const prevStreak = calcStreak(state.log.filter(e => e.date !== todayKey()));
  const newStreak = calcStreak(state.log);
  document.getElementById('streak-val').textContent = newStreak + 'd';
  setSyncStatus('syncing', 'Salvando...');
  const remoteEntry = {
    user_id: state.currentUser.id, date: todayKey(),
    habits: { ...state.ts.habits, _d: state.ts.idiomDetails },
    energy: state.ts.energy, nota: state.ts.nota,
    plan_id: getActivePlanId(),
  };
  try {
    const { error } = await sb.from('checkins').upsert(remoteEntry, { onConflict: 'user_id,date' });
    btn.disabled = false; btn.textContent = 'Salvar check-in';
    if (error) {
      // Erro retornado pelo servidor (ex: violação de RLS/constraint) — não é falha de rede,
      // então NÃO entra na fila de retry (reenviar o mesmo payload rejeitado não vai resolver).
      setSyncStatus('err', 'Erro ao salvar');
      showToast('Erro ao salvar: ' + error.message, 'err');
    } else {
      setSyncStatus('ok', 'Sincronizado');
      const t = document.getElementById('toast'); if (t) t.textContent = '';
      showToast('Check-in salvo com sucesso!');
      btn.classList.add('saved'); setTimeout(() => btn.classList.remove('saved'), 1200);
      clearTsLocal(todayKey());
      clearPendingCheckin(todayKey());
    }
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Salvar check-in';
    setSyncStatus('err', 'Sem conexão');
    queuePendingCheckin(remoteEntry);
    showToast('Sem conexão. Check-in ficou na fila e será sincronizado automaticamente.', 'info');
  }
  if (newStreak > prevStreak) showBoom(newStreak);
  const { renderDashboard } = await import('./dashboard.js');
  const { renderHistorico } = await import('./historico.js');
  const { renderConquistas } = await import('./conquistas.js');
  renderDashboard(); renderHistorico(); renderConquistas();
}

// Estatisticas por habito no periodo (semana ou mes) - mesmo calculo pras duas revisoes, so
// muda o intervalo de datas e o elemento onde renderiza.
function renderReviewStats(period, elId) {
  const dates = getPeriodDates(period); let html = '';
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
    html += `<div class="review-stat"><div class="rs-label">${sanitize(h.icon)} ${sanitize(h.name)}</div><div class="rs-val ${cls}">${done}/${possible}</div></div>`;
  });
  document.getElementById(elId).innerHTML = html;
}

export function renderWeeklyReview() {
  renderReviewStats('semana', 'review-stats');
}

// Sem coleta nova: cita o resultado financeiro do mes corrente (userCfg.finLog), que o usuario
// ja lanca por conta propria na tela de OKRs - a revisao so junta o que ja existe.
export function renderMonthlyReview() {
  renderReviewStats('mes', 'review-stats-m');
  const finEl = document.getElementById('review-fin-summary-m');
  if (!finEl) return;
  if ((state.userCfg.areas || []).includes('financas')) {
    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const entry = (state.userCfg.finLog || []).find(m => m.mes === mesAtual);
    const total = entry ? (entry.guardado || 0) + (entry.investido || 0) : 0;
    finEl.style.display = 'block';
    finEl.textContent = total > 0
      ? `💰 Você guardou/investiu R$ ${total.toLocaleString('pt-BR')} este mês.`
      : '💰 Você ainda não lançou o resultado financeiro deste mês.';
  } else {
    finEl.style.display = 'none';
  }
  const pesoWrap = document.getElementById('review-peso-wrap-m');
  if (pesoWrap) pesoWrap.style.display = (state.userCfg.areas || []).includes('corpo') ? 'block' : 'none';
}

export function setReviewFeel(period, val, btn) {
  state.reviewData[period].feel = val;
  const groupId = period === 'semana' ? 'review-feel' : 'review-feel-m';
  const boxId = period === 'semana' ? 'review-impact' : 'review-impact-m';
  document.querySelectorAll('#' + groupId + ' .review-opt').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  const box = document.getElementById(boxId);
  const msg = period === 'semana'
    ? '⚠️ Semanas pesadas são normais. O importante é não pular 2 dias seguidos do mesmo hábito. Reduza a intensidade, não a frequência.'
    : '⚠️ Meses pesados são normais. Olhe o trimestre inteiro, não só este mês, antes de decidir mudar algo.';
  if (val === 'pesada') { box.style.display = 'block'; box.textContent = msg; }
  else { box.style.display = 'none'; }
}

export function toggleReviewAdjust(period, val, btn) {
  btn.classList.toggle('on');
  const arr = state.reviewData[period].adjust;
  const idx = arr.indexOf(val);
  if (idx >= 0) arr.splice(idx, 1); else arr.push(val);
}

export async function saveWeeklyReview() {
  const today = todayKey();
  if (!state.userCfg.weeklyReviews) state.userCfg.weeklyReviews = {};
  state.userCfg.weeklyReviews[today] = { date: today, feel: state.reviewData.semana.feel, adjust: [...state.reviewData.semana.adjust] };
  state.userCfg.lastReviewedWeek = today;
  document.getElementById('weekly-review-banner').style.display = 'none';
  const t = document.getElementById('toast'); if (t) { t.textContent = '✓ Revisão salva!'; setTimeout(() => { t.textContent = ''; }, 2000); }
  showToast('Revisão da semana salva!');
  state.reviewData.semana = { feel: '', adjust: [] };
  await saveCfgAll(false);
}

// Unico ponto ativo (pede pra parar e responder) do plano de peso/revisao mensal - so 1x/mes,
// e o peso e um campo opcional dentro desse mesmo momento, nunca um lembrete separado.
export async function saveMonthlyReview() {
  const now = new Date();
  const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (!state.userCfg.monthlyReviews) state.userCfg.monthlyReviews = {};
  const entry = { mes, feel: state.reviewData.mes.feel, adjust: [...state.reviewData.mes.adjust] };
  const pesoEl = document.getElementById('review-peso-m');
  const pesoVal = pesoEl && pesoEl.value ? parseFloat(pesoEl.value) : null;
  if (pesoVal) {
    entry.peso = pesoVal;
    if (!state.userCfg.pesoLog) state.userCfg.pesoLog = [];
    const today = todayKey();
    const idx = state.userCfg.pesoLog.findIndex(p => p.data === today);
    const logEntry = { data: today, peso: pesoVal };
    if (idx >= 0) state.userCfg.pesoLog[idx] = logEntry; else state.userCfg.pesoLog.push(logEntry);
  }
  state.userCfg.monthlyReviews[mes] = entry;
  state.userCfg.lastReviewedMonth = mes;
  document.getElementById('monthly-review-banner').style.display = 'none';
  showToast('Revisão do mês salva!');
  state.reviewData.mes = { feel: '', adjust: [] };
  if (pesoEl) pesoEl.value = '';
  await saveCfgAll(false);
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
