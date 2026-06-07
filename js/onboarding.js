import { state } from './state.js';
import { sb, saveCfgLocal, saveCfgRemote, setSyncStatus } from './db.js';
import { showToast, todayKey } from './utils.js';
import { buildHabitsFromCfg } from './habits.js';

export function startOnboarding() {
  document.getElementById('pg-onboard').style.display = 'block';
  renderObProgress(); showObStep(1);
}

export function renderObProgress() {
  const total = 3; let html = '';
  for (let i = 1; i <= total; i++) {
    html += `<div class="ob-prog-dot ${i <= (state.obData._step || 0) ? 'done' : ''}"></div>`;
  }
  document.getElementById('ob-progress').innerHTML = html;
}

export function showObStep(n) {
  const current = document.querySelector('.ob-step.on');
  const next = document.getElementById('obs-' + n);
  if (!next) return;
  if (current && current !== next) {
    current.classList.add('out-left');
    setTimeout(() => { current.classList.remove('on', 'out-left'); }, 280);
  }
  setTimeout(() => {
    if (current && current !== next) current.style.display = 'none';
    next.style.display = 'block';
    next.classList.add('on');
  }, current ? 100 : 0);
  state.obData._step = n;
  let html = ''; const total = 3;
  for (let i = 1; i <= total; i++) {
    html += `<div class="ob-prog-dot ${i <= n ? 'done' : ''}"></div>`;
  }
  document.getElementById('ob-progress').innerHTML = html;
  if (n === 3) {
    const treinoSec = document.getElementById('ob-treino-section');
    const estudoSec = document.getElementById('ob-estudo-section');
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
    state.obData.meta = (state.obData.metas || []).join(', ');
    state.obData.corpoNivel = state.obData.corpoNivel || 'irregular';
    state.obData.exercicios = state.obData.exercicios.length ? state.obData.exercicios : ['academia'];
    state.obData.horario = 'comercial';
    state.obData.tempoLivre = '1h';
    state.obData.idiomas = state.obData.idiomas.length ? state.obData.idiomas : ['ingles'];
    showObStep(4); generatePlan();
  }
}

export function obBack(step) {
  if (step === 2) showObStep(1);
  else if (step === 3) showObStep(2);
}

export function obToggleOpt(group, btn) {
  btn.classList.toggle('on');
  const val = btn.dataset.val;
  if (!state.obData.metas) state.obData.metas = [];
  const idx = state.obData.metas.indexOf(val);
  if (idx >= 0) state.obData.metas.splice(idx, 1); else state.obData.metas.push(val);
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

export function obToggleArea(btn) {
  const val = btn.dataset.val; const idx = state.obData.areas.indexOf(val);
  if (idx >= 0) { state.obData.areas.splice(idx, 1); btn.classList.remove('on'); }
  else { state.obData.areas.push(val); btn.classList.add('on'); }
  checkObStep2();
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
  if (group === 'horario') state.obData.horario = btn.dataset.val;
  else if (group === 'tempo-livre') state.obData.tempoLivre = btn.dataset.val;
  else if (group === 'corpo-nivel') state.obData.corpoNivel = btn.dataset.val;
  else if (group === 'situation') {
    state.obData.situation = btn.dataset.val;
    const nb = document.getElementById('ob-next-1'); if (nb) nb.disabled = false;
  } else if (group === 'livro-tipo') {
    // biblioteca usa este mesmo handler — delega para biblioteca
    window._newLivroTipo = btn.dataset.val;
  } else if (group === 'pomo-sub') {
    state.pomodoro.subject = btn.dataset.val;
  }
}

export async function generatePlan() {
  const msgs = ['Analisando seu perfil...', 'Definindo pilares...', 'Gerando OKRs...', 'Montando rotina...', 'Finalizando...'];
  let i = 0; const el = document.getElementById('ob-generating');
  const iv = setInterval(() => { if (i < msgs.length) { el.textContent = msgs[i]; i++; } }, 600);
  const idiomasAtivos = state.obData.idiomas.length ? state.obData.idiomas.slice(0, 2) : ['ingles'];
  const cfg = {
    name: state.obData.name, startDate: todayKey(), areas: state.obData.areas, meta: state.obData.meta,
    situation: state.obData.situation,
    exercicios: state.obData.exercicios.length ? state.obData.exercicios : ['academia'],
    idiomasAtivos, idiomasPlano: state.obData.idiomas.length ? state.obData.idiomas : ['ingles'], aprender: [],
    horario: 'comercial', tempoLivre: '1h',
    corpoNivel: state.obData.corpoNivel || 'irregular',
    treinoDias: state.obData.treinoDias.length ? state.obData.treinoDias : [2, 4, 6],
    idiomaDias: state.obData.idiomaDias.length ? state.obData.idiomaDias : [0, 1, 2, 3, 4, 5, 6],
    estudoDias: state.obData.estudoDias.length ? state.obData.estudoDias : [0, 1, 3],
    sonoMeta: 7, inglesMeta: 20,
  };
  setTimeout(async () => {
    clearInterval(iv);
    state.userCfg = cfg;
    saveCfgLocal();
    setSyncStatus('syncing', 'Salvando...');
    const ok = await saveCfgRemote();
    if (ok) { setSyncStatus('ok', 'Sincronizado'); }
    else { setSyncStatus('err', 'Salvo localmente'); }
    document.getElementById('pg-onboard').style.display = 'none';
    const { startApp } = await import('./nav.js');
    buildHabitsFromCfg(); startApp();
  }, 3200);
}
