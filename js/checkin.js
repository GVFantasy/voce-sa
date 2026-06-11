import { state, ENERGY, ECLASS, REFLECTIONS } from './state.js';
import { getActiveObjective } from './okrs.js';
import { sb, setSyncStatus, saveCfgLocal, saveCfgRemote } from './db.js';
import { todayKey, isExpected, showToast, calcStreak, getPeriodDates, getActiveQ } from './utils.js';
import { getActivePlanId } from './plans.js';

const QUARTERLY_TASKS = {
  corpo: {
    1: [
      { id: 'corpo_q1_a', text: 'Definir horário fixo de treino na semana', hint: 'Trate como compromisso — bloqueie na agenda' },
      { id: 'corpo_q1_b', text: 'Remover telas 30 min antes de dormir', hint: 'Configure modo foco automático no celular' },
      { id: 'corpo_q1_c', text: 'Preparar roupa e material de treino na véspera', hint: 'Remove a fricção do dia seguinte' },
    ],
    2: [
      { id: 'corpo_q2_a', text: 'Medir evolução: fotos, medidas ou performance', hint: 'Compare com o início do plano' },
      { id: 'corpo_q2_b', text: 'Adicionar mais 1 dia de treino à semana', hint: 'Se já está no ritmo, hora de elevar' },
    ],
    3: [
      { id: 'corpo_q3_a', text: 'Participar de evento esportivo ou desafio', hint: 'Corrida, campeonato, desafio de 30 dias' },
      { id: 'corpo_q3_b', text: 'Revisar protocolo de recuperação', hint: 'Sono, hidratação, alimentação — o básico sustenta o avanço' },
    ],
    4: [
      { id: 'corpo_q4_a', text: 'Registrar evolução física do ano', hint: 'Compare hoje com o início — a diferença vai te surpreender' },
    ],
  },
  mente: {
    1: [
      { id: 'mente_q1_a', text: 'Configurar app de idioma com meta diária', hint: 'Duolingo, Anki, ou similar — 10 min já conta' },
      { id: 'mente_q1_b', text: 'Escolher e comprar o próximo livro', hint: 'Tenha sempre um na fila' },
      { id: 'mente_q1_c', text: 'Alcançar 30 dias seguidos de estudo', hint: 'O streak importa mais que a duração' },
    ],
    2: [
      { id: 'mente_q2_a', text: 'Ter uma conversa básica no idioma escolhido', hint: 'App, sala de prática ou com nativo' },
      { id: 'mente_q2_b', text: 'Consumir 30 min de conteúdo no idioma sem parar', hint: 'Série, podcast ou livro' },
    ],
    3: [
      { id: 'mente_q3_a', text: 'Usar o idioma em situação real', hint: 'Email, reunião, viagem ou trabalho' },
    ],
    4: [
      { id: 'mente_q4_a', text: 'Avaliar evolução no idioma — o que mudou?', hint: 'Reflita e ajuste para o próximo ano' },
    ],
  },
  financas: {
    1: [
      { id: 'fin_q1_a', text: 'Mapear todas as despesas do mês atual', hint: 'Planilha, Notion ou app de finanças — qualquer um' },
      { id: 'fin_q1_b', text: 'Definir % fixo do salário para guardar', hint: 'Comece com 10% — o hábito importa mais que o valor' },
      { id: 'fin_q1_c', text: 'Abrir conta de investimento se ainda não tem', hint: 'Nubank, XP, NuInvest, Rico — todos gratuitos' },
    ],
    2: [
      { id: 'fin_q2_a', text: 'Cortar ou renegociar 1 gasto desnecessário', hint: 'Assinatura esquecida? Serviço que não usa?' },
      { id: 'fin_q2_b', text: 'Estudar um produto financeiro novo', hint: 'CDB, Tesouro, FII ou ações — entender o que é' },
    ],
    3: [
      { id: 'fin_q3_a', text: 'Calcular patrimônio acumulado até agora', hint: 'Saldo + investimentos + ativos' },
    ],
    4: [
      { id: 'fin_q4_a', text: 'Balanço financeiro do ano — meta atingida?', hint: 'Compare com janeiro e planeje o próximo ano' },
    ],
  },
  tempo: {
    1: [
      { id: 'tempo_q1_a', text: 'Criar blocos fixos de foco na agenda', hint: 'Mínimo: 90 min de deep work pela manhã' },
      { id: 'tempo_q1_b', text: 'Agendar revisão semanal toda sexta', hint: '30 min para planejar a semana seguinte' },
      { id: 'tempo_q1_c', text: 'Eliminar 1 atividade que não gera retorno', hint: 'O que você faz por hábito sem resultado real?' },
    ],
    2: [
      { id: 'tempo_q2_a', text: 'Experimentar a técnica Pomodoro por 2 semanas', hint: 'Use o timer do app — 25 min foco, 5 min pausa' },
      { id: 'tempo_q2_b', text: 'Delegar ou terceirizar 1 tarefa operacional', hint: 'Seu tempo é para o que só você pode fazer' },
    ],
    3: [
      { id: 'tempo_q3_a', text: 'Tirar 3–5 dias de férias reais sem trabalho', hint: 'Descanso intencional é produtividade a longo prazo' },
    ],
    4: [
      { id: 'tempo_q4_a', text: 'Auditar onde foi o seu tempo este ano', hint: 'O que ganhou espaço? O que você abre mão para o próximo?' },
    ],
  },
  relacoes: {
    1: [
      { id: 'rel_q1_a', text: 'Listar 3 pessoas que quer cultivar este trimestre', hint: 'Família, amigos próximos, mentores' },
      { id: 'rel_q1_b', text: 'Agendar 1 encontro com cada uma delas', hint: 'Uma data marcada vale mais que boa intenção' },
      { id: 'rel_q1_c', text: 'Reduzir scroll passivo em redes sociais em 30%', hint: 'Mais presença real, menos consumo automático' },
    ],
    2: [
      { id: 'rel_q2_a', text: 'Entrar em grupo ou comunidade com propósito', hint: 'Esporte, estudo, trabalho voluntário' },
      { id: 'rel_q2_b', text: 'Ter 1 conversa difícil que está adiando', hint: 'Resolver o que está travado libera energia' },
    ],
    3: [
      { id: 'rel_q3_a', text: 'Retomar contato com alguém que se distanciou', hint: 'Uma mensagem simples já muda o suficiente' },
    ],
    4: [
      { id: 'rel_q4_a', text: 'Celebrar o ano com as pessoas certas', hint: 'Compartilhe sua evolução com quem importa' },
    ],
  },
};

function renderQuarterlyTasks() {
  const el = document.getElementById('quarterly-tasks-list');
  if (!el) return;
  const aq = getActiveQ(state.userCfg.startDate);
  const areas = (state.userCfg.areas || []).filter(a => a !== 'negocio');
  const doneTasks = state.userCfg.tasksDone || {};
  const tasks = areas.flatMap(area => (QUARTERLY_TASKS[area]?.[aq] || []).map(t => ({ ...t, area })));
  if (!tasks.length) { el.innerHTML = ''; return; }
  const doneCount = tasks.filter(t => doneTasks[t.id]).length;
  el.innerHTML = `<div class="qtask-section">
    <div class="qtask-header"><span>Ações do trimestre · Q${aq}</span><span class="qtask-count">${doneCount}/${tasks.length}</span></div>
    ${tasks.map(t => {
      const isDone = !!doneTasks[t.id];
      return `<div class="qtask ${isDone ? 'done' : ''}" onclick="toggleQTask('${t.id}')">
        <div class="qtask-check-box">${isDone ? '✓' : ''}</div>
        <div class="qtask-body">
          <div class="qtask-text">${t.text}</div>
          ${t.hint ? `<div class="qtask-hint">${t.hint}</div>` : ''}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

export async function toggleQTask(taskId) {
  if (!state.userCfg.tasksDone) state.userCfg.tasksDone = {};
  state.userCfg.tasksDone[taskId] = !state.userCfg.tasksDone[taskId];
  saveCfgLocal();
  saveCfgRemote();
  renderQuarterlyTasks();
}

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

  // OKR focus strip
  const okrFocusEl = document.getElementById('okr-focus-strip');
  if (okrFocusEl) {
    const obj = getActiveObjective();
    okrFocusEl.innerHTML = obj
      ? `<div class="okr-focus-strip">
          <div class="okr-focus-top">Q${obj.aq} · ${obj.areaName}</div>
          <div class="okr-focus-label">${obj.label}</div>
          <div class="okr-focus-krs">${obj.krs.map(k => `<span>→ ${k}</span>`).join('')}</div>
        </div>`
      : '';
  }

  renderQuarterlyTasks();
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
      habits: { ...state.ts.habits, _d: state.ts.idiomDetails },
      energy: state.ts.energy, nota: state.ts.nota,
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
