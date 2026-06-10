import { state, IDIOMA_MAP } from './state.js';
import { sb, saveCfgLocal, saveCfgRemote, setSyncStatus } from './db.js';
import { showToast, todayKey } from './utils.js';
import { buildHabitsFromCfg } from './habits.js';

export function startOnboarding() {
  document.getElementById('pg-onboard').style.display = 'block';
  showObStep(1);
}

export function renderObProgress() {
  showObStep(state.obData._step || 1);
}

export function showObStep(n) {
  document.querySelectorAll('.ob-step').forEach(el => {
    el.classList.remove('on', 'out-left');
    el.style.display = 'none';
  });
  const next = document.getElementById('obs-' + n);
  if (!next) return;
  next.style.display = 'block';
  setTimeout(() => next.classList.add('on'), 10);
  state.obData._step = n;
  const total = 4;
  let html = '';
  for (let i = 1; i <= total; i++) {
    html += `<div class="ob-prog-dot ${i <= n ? 'done' : ''}"></div>`;
  }
  document.getElementById('ob-progress').innerHTML = html;
  if (n === 4) {
    const treinoSec = document.getElementById('ob-treino-section-4');
    const estudoSec = document.getElementById('ob-estudo-section-4');
    if (treinoSec) treinoSec.style.display = state.obData.areas.includes('corpo') ? 'block' : 'none';
    if (estudoSec) estudoSec.style.display = state.obData.areas.includes('mente') ? 'block' : 'none';
  }
}

export function obNext(step) {
  if (step === 1) {
    if (!state.obData.situation) { showToast('Selecione como está sua vida hoje.', 'info', 3000); return; }
    state.obData.name = state.currentUser?.email?.split('@')[0] || 'Usuário';
    showObStep(2);
  } else if (step === 2) {
    if (!state.obData.areas.length) { showToast('Selecione pelo menos uma área para desenvolver.', 'info', 3000); return; }
    if (!state.obData.metas || !state.obData.metas.length) { showToast('Selecione sua maior prioridade em 12 meses.', 'info', 3000); return; }
    showObStep(3);
  } else if (step === 3) {
    if (!state.obData.idiomas.length) { showToast('Selecione pelo menos um idioma.', 'info', 3000); return; }
    showObStep(4);
  } else if (step === 4) {
    state.obData.meta = (state.obData.metas || []).join(', ');
    showObStep(5);
    generatePlan();
  }
}

export function obBack(step) {
  if (step === 2) showObStep(1);
  else if (step === 3) showObStep(2);
  else if (step === 4) showObStep(3);
}

export function obToggleArea(btn) {
  const val = btn.dataset.val;
  const idx = state.obData.areas.indexOf(val);
  if (idx >= 0) { state.obData.areas.splice(idx, 1); btn.classList.remove('on'); }
  else { state.obData.areas.push(val); btn.classList.add('on'); }
  checkObStep2();
}

export function obSingleMeta(btn) {
  const parent = btn.closest('.ob-options');
  if (parent) parent.querySelectorAll('.ob-option').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  state.obData.metas = [btn.dataset.val];
  checkObStep2();
}

export function checkObStep2() {
  const btn = document.getElementById('ob-next-2');
  if (btn) btn.disabled = !(state.obData.areas.length >= 1 && state.obData.metas && state.obData.metas.length >= 1);
}

export function obToggleIdioma(btn) {
  btn.classList.toggle('on');
  const val = btn.dataset.val;
  const idx = state.obData.idiomas.indexOf(val);
  if (idx >= 0) state.obData.idiomas.splice(idx, 1);
  else state.obData.idiomas.push(val);
  const nb = document.getElementById('ob-next-3');
  if (nb) nb.disabled = state.obData.idiomas.length === 0;
}

export function obSonoMeta(btn) {
  const parent = btn.closest('.ob-chips');
  if (parent) parent.querySelectorAll('.ob-chip').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  state.obData.sonoMeta = parseInt(btn.dataset.val);
}

export function obEstudoMeta(btn) {
  const parent = btn.closest('.ob-chips');
  if (parent) parent.querySelectorAll('.ob-chip').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  state.obData.estudoMeta = parseInt(btn.dataset.val);
}

export function obToggleChip(group, btn) {
  const val = btn.dataset.val;
  let arr = group === 'exercicio' ? state.obData.exercicios
    : group === 'idioma' ? state.obData.idiomas
    : state.obData.aprender;
  const idx = arr.indexOf(val);
  if (idx >= 0) { arr.splice(idx, 1); btn.classList.remove('on'); }
  else { arr.push(val); btn.classList.add('on'); }
}

export function obToggleOpt(group, btn) {
  btn.classList.toggle('on');
  const val = btn.dataset.val;
  if (!state.obData.metas) state.obData.metas = [];
  const idx = state.obData.metas.indexOf(val);
  if (idx >= 0) state.obData.metas.splice(idx, 1); else state.obData.metas.push(val);
}

export function obToggleDay(group, btn) {
  const val = parseInt(btn.dataset.val);
  let arr = group === 'treino' ? state.obData.treinoDias
    : group === 'idioma' ? state.obData.idiomaDias
    : state.obData.estudoDias;
  const idx = arr.indexOf(val);
  if (idx >= 0) { arr.splice(idx, 1); btn.classList.remove('on'); }
  else { arr.push(val); btn.classList.add('on'); }
}

export function obSingle(group, btn) {
  const parent = btn.closest('.ob-options,.ob-chips');
  if (parent) parent.querySelectorAll('.ob-option,.ob-chip').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  if (group === 'situation') {
    state.obData.situation = btn.dataset.val;
    const nb = document.getElementById('ob-next-1'); if (nb) nb.disabled = false;
  } else if (group === 'livro-tipo') {
    window._newLivroTipo = btn.dataset.val;
  } else if (group === 'pomo-sub') {
    state.pomodoro.subject = btn.dataset.val;
  }
}

export async function generatePlan() {
  const msgs = ['Analisando seu perfil...', 'Definindo pilares...', 'Gerando OKRs...', 'Montando rotina...', 'Finalizando...'];
  let i = 0;
  const el = document.getElementById('ob-generating');
  const iv = setInterval(() => { if (i < msgs.length) { if (el) el.textContent = msgs[i]; i++; } }, 600);
  const idiomasAtivos = state.obData.idiomas.length ? state.obData.idiomas.slice(0, 2) : ['ingles'];
  const areas = state.obData.areas.filter(a => a !== 'negocio');
  const cfg = {
    name: state.obData.name,
    startDate: todayKey(),
    areas,
    meta: state.obData.meta,
    situation: state.obData.situation,
    exercicios: ['Academia', 'Corrida', 'Ciclismo', 'HIIT'],
    idiomasAtivos,
    idiomasPlano: state.obData.idiomas.length ? state.obData.idiomas : ['ingles'],
    aprender: [],
    horario: 'comercial',
    tempoLivre: '1h',
    corpoNivel: 'irregular',
    treinoDias: state.obData.treinoDias.length ? state.obData.treinoDias : [2, 4, 6],
    idiomaDias: state.obData.idiomaDias.length ? state.obData.idiomaDias : [0, 1, 2, 3, 4, 5, 6],
    estudoDias: state.obData.estudoDias.length ? state.obData.estudoDias : [1, 3, 5],
    sonoMeta: state.obData.sonoMeta || 7,
    inglesMeta: state.obData.estudoMeta || 30,
  };
  setTimeout(async () => {
    clearInterval(iv);
    state.userCfg = cfg;
    buildHabitsFromCfg();
    saveCfgLocal();
    setSyncStatus('syncing', 'Salvando...');
    const ok = await saveCfgRemote();
    if (ok) setSyncStatus('ok', 'Sincronizado');
    else setSyncStatus('err', 'Salvo localmente');
    document.getElementById('pg-onboard').style.display = 'none';
    showKickoff();
  }, 3200);
}

export function showKickoff() {
  const pg = document.getElementById('pg-kickoff');
  if (!pg) {
    import('./nav.js').then(({ startApp }) => startApp());
    return;
  }
  const areas = state.userCfg.areas || ['corpo'];
  const AREA_ICONS = { corpo: '🏃', mente: '🧠', financas: '💰', tempo: '⏱', relacoes: '❤️' };
  const AREA_NAMES = { corpo: 'Corpo', mente: 'Mente', financas: 'Finanças', tempo: 'Tempo', relacoes: 'Relações' };
  const okrQ1 = {
    corpo: 'Treinar nos dias escolhidos + dormir bem + sem tela antes de dormir.',
    mente: 'Idioma todo dia + streak de 30 dias + 1 livro por mês.',
    financas: 'Mapear todas as despesas + criar fundo de emergência.',
    tempo: 'Blocos fixos na agenda + revisão toda sexta.',
    relacoes: '1 encontro intencional por semana + presença de verdade.',
  };
  const titleEl = document.getElementById('kickoff-title');
  const subEl = document.getElementById('kickoff-sub');
  const q1El = document.getElementById('kickoff-q1');
  const areasEl = document.getElementById('kickoff-areas');
  const habitsEl = document.getElementById('kickoff-habits');
  if (titleEl) titleEl.textContent = 'Seu plano de 12 meses está pronto.';
  if (subEl) subEl.textContent = 'Consistência simples vence motivação intensa. Um hábito de cada vez.';
  if (areasEl) areasEl.innerHTML = areas.map(a =>
    `<div class="kickoff-area-chip">${AREA_ICONS[a] || '⭐'} ${AREA_NAMES[a] || a}</div>`
  ).join('');
  if (q1El) q1El.innerHTML = areas.map(a =>
    okrQ1[a] ? `<div class="kickoff-q1-item">• ${okrQ1[a]}</div>` : ''
  ).join('');
  if (habitsEl) habitsEl.innerHTML = state.userHabits.map(h =>
    `<div class="kickoff-habit-row"><span>${h.icon}</span><span>${h.name}</span><span class="kickoff-habit-days">${h.days}</span></div>`
  ).join('');
  pg.style.display = 'flex';
}

export function startFromKickoff() {
  const pg = document.getElementById('pg-kickoff');
  if (pg) pg.style.display = 'none';
  import('./nav.js').then(({ startApp }) => startApp());
}
