import { state } from './state.js';
import { saveCfgAll } from './db.js';
import { todayKey, dateKey, fmtDate, sanitize, showToast } from './utils.js';

const DLABELS_ROTINA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function fmtHM(totalMin) {
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

// Gera os slots fixos (recorrentes por dia da semana) dentro da janela de horario informada,
// e distribui as materias em rodizio (round-robin) por todos os slots (dia x horario), na ordem
// dos dias escolhidos - assim a mesma materia nao cai sempre no mesmo dia da semana pra sempre.
// Deterministico, sem IA - so um agendador simples.
export function gerarBlocos(materias, disponibilidade) {
  const { dias, inicio, fim, duracaoBloco } = disponibilidade;
  if (!dias?.length || !materias?.length || !duracaoBloco) return [];
  const [ih, im] = inicio.split(':').map(Number);
  const [fh, fm] = fim.split(':').map(Number);
  const startMin = ih * 60 + im, endMin = fh * 60 + fm;
  const slots = [];
  for (let cur = startMin; cur + duracaoBloco <= endMin; cur += duracaoBloco) {
    slots.push({ inicio: fmtHM(cur), fim: fmtHM(cur + duracaoBloco) });
  }
  if (!slots.length) return [];

  const blocos = [];
  let matIdx = 0;
  [...dias].sort((a, b) => a - b).forEach(dow => {
    slots.forEach(slot => {
      blocos.push({
        id: crypto.randomUUID(),
        label: materias[matIdx % materias.length],
        diasSemana: [dow],
        inicio: slot.inicio,
        fim: slot.fim,
      });
      matIdx++;
    });
  });
  return blocos;
}

// Status de um bloco *hoje* - usado tanto pra render quanto (futuramente) pra notificacao.
// 'outro-dia' quando o bloco nao e recorrente no dia da semana de hoje.
export function blocoStatus(bloco, doneToday, agora = new Date()) {
  if (doneToday) return 'feito';
  if (!bloco.diasSemana.includes(agora.getDay())) return 'outro-dia';
  const nowMin = agora.getHours() * 60 + agora.getMinutes();
  const [ih, im] = bloco.inicio.split(':').map(Number);
  const [fh, fm] = bloco.fim.split(':').map(Number);
  const iniMin = ih * 60 + im, fimMin = fh * 60 + fm;
  if (nowMin < iniMin) return 'proximo';
  if (nowMin < fimMin) return 'agora';
  return 'perdido';
}

// Aderencia acumulada desde a criacao da rotina ate hoje (ou o prazo, o que vier primeiro) -
// mesmo espirito do dayFulfilled/STREAK_THRESHOLD do check-in geral, mas em cima de rotinaLog,
// separado do streak principal por decisao explicita do usuario.
export function calcAderencia(rotina, rotinaLog) {
  if (!rotina) return { pct: 0, esperado: 0, feito: 0 };
  const today = todayKey();
  const endKey = rotina.prazo < today ? rotina.prazo : today;
  let esperado = 0, feito = 0;
  for (let d = new Date(rotina.criadoEm + 'T12:00:00'); dateKey(d) <= endKey; d.setDate(d.getDate() + 1)) {
    const k = dateKey(d);
    const dow = d.getDay();
    const dayLog = rotinaLog[k] || { blocos: {}, checklist: {} };
    (rotina.blocos || []).forEach(b => {
      if (b.diasSemana.includes(dow)) { esperado++; if (dayLog.blocos?.[b.id]) feito++; }
    });
    (rotina.checklist || []).forEach(c => {
      if (c.diasSemana.includes(dow)) { esperado++; if (dayLog.checklist?.[c.id]) feito++; }
    });
  }
  return { pct: esperado > 0 ? Math.round(feito / esperado * 100) : 0, esperado, feito };
}

export function diasRestantes(rotina) {
  if (!rotina) return 0;
  const today = new Date(todayKey() + 'T12:00:00');
  const prazo = new Date(rotina.prazo + 'T12:00:00');
  return Math.max(0, Math.round((prazo - today) / 86400000));
}

// ---- Wizard de criacao (estado local do modulo, descartado ao cancelar/confirmar) ----

let rw = null;

function rwReset() {
  rw = { objetivo: '', prazo: '', materias: [], checklist: [], dias: [], duracao: 60, geradoBlocos: [] };
}

export function startRotinaWizard() {
  rwReset();
  document.getElementById('rw-objetivo').value = '';
  document.getElementById('rw-prazo').value = '';
  document.getElementById('rw-materia-input').value = '';
  document.getElementById('rw-checklist-input').value = '';
  document.getElementById('rw-materias-list').innerHTML = '';
  document.getElementById('rw-checklist-list').innerHTML = '';
  document.getElementById('rw-next-1').disabled = true;
  document.getElementById('rw-next-2').disabled = true;
  document.querySelectorAll('#rw-dias .ob-day-btn').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('#rw-duracao-chips .ob-chip').forEach(b => b.classList.remove('on'));
  document.querySelector('#rw-duracao-chips .ob-chip[data-val="60"]').classList.add('on');
  showRwStep(1);
  import('./nav.js').then(({ nav }) => nav('rotina-wizard', null));
}

export function closeRotinaWizard() {
  import('./nav.js').then(({ nav }) => nav('rotina', null));
}

function showRwStep(n) {
  document.querySelectorAll('#pg-rotina-wizard .ob-step').forEach(el => {
    el.classList.remove('on', 'out-left');
    el.style.display = 'none';
  });
  const next = document.getElementById('rws-' + n);
  if (!next) return;
  next.style.display = 'block';
  setTimeout(() => next.classList.add('on'), 10);
  let html = '';
  for (let i = 1; i <= 4; i++) html += `<div class="ob-prog-dot ${i <= n ? 'done' : ''}${i === n ? ' just' : ''}"></div>`;
  document.getElementById('rw-progress').innerHTML = html;
}

export function rwCheckStep1() {
  const objetivo = document.getElementById('rw-objetivo').value.trim();
  const prazo = document.getElementById('rw-prazo').value;
  document.getElementById('rw-next-1').disabled = !(objetivo && prazo && prazo > todayKey());
}

export function rwNext(step) {
  if (step === 1) {
    rw.objetivo = document.getElementById('rw-objetivo').value.trim();
    rw.prazo = document.getElementById('rw-prazo').value;
    showRwStep(2);
  } else if (step === 2) {
    showRwStep(3);
  }
}

export function rwBack(step) {
  showRwStep(step - 1);
}

function rwCheckStep2() {
  document.getElementById('rw-next-2').disabled = rw.materias.length === 0;
}

export function rwAddMateria() {
  const input = document.getElementById('rw-materia-input');
  const val = input.value.trim();
  if (!val) return;
  rw.materias.push(val);
  input.value = '';
  renderRwMaterias();
  rwCheckStep2();
}

export function rwRemoveMateria(idx) {
  rw.materias.splice(idx, 1);
  renderRwMaterias();
  rwCheckStep2();
}

function renderRwMaterias() {
  document.getElementById('rw-materias-list').innerHTML = rw.materias.map((m, i) =>
    `<div class="rw-list-row"><span>${sanitize(m)}</span><button class="icon-btn" onclick="rwRemoveMateria(${i})" aria-label="Remover">✕</button></div>`
  ).join('');
}

export function rwAddChecklist() {
  const input = document.getElementById('rw-checklist-input');
  const val = input.value.trim();
  if (!val) return;
  rw.checklist.push(val);
  input.value = '';
  renderRwChecklist();
}

export function rwRemoveChecklist(idx) {
  rw.checklist.splice(idx, 1);
  renderRwChecklist();
}

function renderRwChecklist() {
  document.getElementById('rw-checklist-list').innerHTML = rw.checklist.map((c, i) =>
    `<div class="rw-list-row"><span>${sanitize(c)}</span><button class="icon-btn" onclick="rwRemoveChecklist(${i})" aria-label="Remover">✕</button></div>`
  ).join('');
}

export function rwToggleDia(btn) {
  const val = parseInt(btn.dataset.val);
  const idx = rw.dias.indexOf(val);
  if (idx >= 0) { rw.dias.splice(idx, 1); btn.classList.remove('on'); }
  else { rw.dias.push(val); btn.classList.add('on'); }
}

export function rwSetDuracao(btn) {
  document.querySelectorAll('#rw-duracao-chips .ob-chip').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  rw.duracao = parseInt(btn.dataset.val);
}

export function rwGenerate() {
  const inicio = document.getElementById('rw-hora-inicio').value;
  const fim = document.getElementById('rw-hora-fim').value;
  if (!rw.dias.length) { showToast('Selecione pelo menos um dia da semana.', 'info', 3000); return; }
  if (!inicio || !fim || inicio >= fim) { showToast('Confira o horário de início e fim.', 'info', 3000); return; }
  const blocos = gerarBlocos(rw.materias, { dias: rw.dias, inicio, fim, duracaoBloco: rw.duracao });
  if (!blocos.length) { showToast('Não deu pra encaixar nenhum bloco nessa janela — tente um horário maior ou um bloco menor.', 'info', 4000); return; }
  rw.geradoBlocos = blocos;
  renderRwPreview();
  showRwStep(4);
}

export function rwRemoveBloco(idx) {
  rw.geradoBlocos.splice(idx, 1);
  renderRwPreview();
}

function renderRwPreview() {
  const blocosHtml = rw.geradoBlocos.map((b, i) => `
    <div class="rotina-bloco" style="cursor:default">
      <div class="rotina-bloco-time">${DLABELS_ROTINA[b.diasSemana[0]]} ${b.inicio}</div>
      <div class="rotina-bloco-label">${sanitize(b.label)}</div>
      <button class="icon-btn" onclick="rwRemoveBloco(${i})" aria-label="Remover bloco">✕</button>
    </div>`).join('');
  const checklistHtml = rw.checklist.length
    ? `<div class="ob-section-label">Checklist diário</div>` + rw.checklist.map(c => `<div class="rw-list-row"><span>${sanitize(c)}</span></div>`).join('')
    : '';
  document.getElementById('rw-preview').innerHTML = blocosHtml + checklistHtml;
}

export async function rwConfirm() {
  if (!rw.geradoBlocos.length) { showToast('Adicione pelo menos um bloco.', 'info', 3000); return; }
  const checklist = rw.checklist.map(label => ({ id: crypto.randomUUID(), label, diasSemana: [0, 1, 2, 3, 4, 5, 6] }));
  state.userCfg.rotina = {
    id: crypto.randomUUID(),
    objetivo: rw.objetivo,
    prazo: rw.prazo,
    criadoEm: todayKey(),
    blocos: rw.geradoBlocos,
    checklist,
  };
  state.userCfg.rotinaLog = state.userCfg.rotinaLog || {};
  await saveCfgAll(false);
  showToast('Rotina criada! Bora começar.');
  const { nav } = await import('./nav.js');
  nav('rotina', null);
}

// ---- Pagina da rotina ativa ----

export function renderRotina() {
  const rotina = state.userCfg.rotina;
  const emptyEl = document.getElementById('rotina-empty');
  const activeEl = document.getElementById('rotina-active');
  if (!rotina) {
    emptyEl.style.display = 'block';
    activeEl.style.display = 'none';
    renderRotinaHistorico();
    return;
  }
  emptyEl.style.display = 'none';
  activeEl.style.display = 'block';

  const today = todayKey();
  const dow = new Date().getDay();
  const rotinaLog = state.userCfg.rotinaLog || {};
  const dayLog = rotinaLog[today] || { blocos: {}, checklist: {} };
  const ader = calcAderencia(rotina, rotinaLog);
  const dias = diasRestantes(rotina);

  document.getElementById('rotina-objetivo').textContent = rotina.objetivo;
  document.getElementById('rotina-dias-restantes').textContent = dias === 1 ? '1 dia restante' : `${dias} dias restantes`;
  document.getElementById('rotina-aderencia').textContent = ader.pct + '%';

  const blocosHoje = rotina.blocos.filter(b => b.diasSemana.includes(dow));
  document.getElementById('rotina-blocos-hoje').innerHTML = blocosHoje.length
    ? blocosHoje.map(b => {
        const done = !!dayLog.blocos[b.id];
        const status = blocoStatus(b, done);
        return `<div class="rotina-bloco ${status}" role="button" tabindex="0" onclick="toggleRotinaBloco('${b.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleRotinaBloco('${b.id}')}">
          <div class="rotina-bloco-time">${b.inicio}–${b.fim}</div>
          <div class="rotina-bloco-label">${sanitize(b.label)}</div>
          <div class="rotina-bloco-check">${done ? '✓' : ''}</div>
        </div>`;
      }).join('')
    : '<div class="empty-state" style="padding:16px 0">Nenhum bloco hoje — dia de descanso da rotina.</div>';

  const checklistHoje = (rotina.checklist || []).filter(c => c.diasSemana.includes(dow));
  document.getElementById('rotina-checklist-hoje').innerHTML = checklistHoje.length
    ? checklistHoje.map(c => {
        const done = !!dayLog.checklist[c.id];
        return `<div class="rotina-check-item ${done ? 'done' : ''}" role="button" tabindex="0" onclick="toggleRotinaChecklist('${c.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleRotinaChecklist('${c.id}')}"><span>${sanitize(c.label)}</span><span>${done ? '✓' : ''}</span></div>`;
      }).join('')
    : '';

  renderRotinaDashCard();
}

export async function toggleRotinaBloco(id) {
  const today = todayKey();
  state.userCfg.rotinaLog = state.userCfg.rotinaLog || {};
  state.userCfg.rotinaLog[today] = state.userCfg.rotinaLog[today] || { blocos: {}, checklist: {} };
  state.userCfg.rotinaLog[today].blocos[id] = !state.userCfg.rotinaLog[today].blocos[id];
  await saveCfgAll(false);
  renderRotina();
}

export async function toggleRotinaChecklist(id) {
  const today = todayKey();
  state.userCfg.rotinaLog = state.userCfg.rotinaLog || {};
  state.userCfg.rotinaLog[today] = state.userCfg.rotinaLog[today] || { blocos: {}, checklist: {} };
  state.userCfg.rotinaLog[today].checklist[id] = !state.userCfg.rotinaLog[today].checklist[id];
  await saveCfgAll(false);
  renderRotina();
}

export async function encerrarRotina(manual = true) {
  const rotina = state.userCfg.rotina;
  if (!rotina) return;
  if (manual && !confirm(`Encerrar a rotina "${rotina.objetivo}"? O histórico fica salvo, mas os blocos param de valer.`)) return;
  const ader = calcAderencia(rotina, state.userCfg.rotinaLog || {});
  state.userCfg.rotinasArquivadas = state.userCfg.rotinasArquivadas || [];
  state.userCfg.rotinasArquivadas.unshift({ ...rotina, aderenciaFinal: ader.pct, encerradaEm: todayKey() });
  state.userCfg.rotina = null;
  state.userCfg.rotinaSentBlocks = {};
  await saveCfgAll(false);
  if (manual) { showToast('Rotina encerrada.'); renderRotina(); }
}

// Chamada no boot (nav.js loadLog()) - arquiva sozinha uma rotina cujo prazo ja passou, antes
// de qualquer render, pra nunca mostrar uma rotina "vencida" como se ainda estivesse valendo.
export function checkRotinaExpirada() {
  const rotina = state.userCfg.rotina;
  if (rotina && rotina.prazo < todayKey()) encerrarRotina(false);
}

function renderRotinaHistorico() {
  const el = document.getElementById('rotina-historico');
  if (!el) return;
  const arquivadas = state.userCfg.rotinasArquivadas || [];
  el.innerHTML = arquivadas.length
    ? `<div class="sec-label" style="margin-top:18px">Rotinas anteriores</div>` + arquivadas.map(r => `
        <div class="card manual-phase">
          <div class="manual-phase-title">${sanitize(r.objetivo)}</div>
          <div style="font-size:12px;color:var(--cinza)">${fmtDate(r.criadoEm)} – ${fmtDate(r.encerradaEm)} · ${r.aderenciaFinal}% de aderência</div>
        </div>`).join('')
    : '';
}

// Card resumido no Dashboard, so quando ha rotina ativa - sem "convite" permanente pra quem
// nao usa a funcionalidade, pra nao virar ruido visual (mesmo criterio do card financeiro).
export function renderRotinaDashCard() {
  const el = document.getElementById('dash-rotina-wrap');
  if (!el) return;
  const rotina = state.userCfg.rotina;
  if (!rotina) { el.innerHTML = ''; return; }
  const dow = new Date().getDay();
  const rotinaLog = state.userCfg.rotinaLog || {};
  const today = todayKey();
  const dayLog = rotinaLog[today] || { blocos: {}, checklist: {} };
  const blocosHoje = rotina.blocos.filter(b => b.diasSemana.includes(dow));
  const proximo = blocosHoje.find(b => !dayLog.blocos[b.id] && blocoStatus(b, false) !== 'perdido');
  const dias = diasRestantes(rotina);
  el.innerHTML = `
    <div class="dash-focus" role="button" tabindex="0" aria-label="Rotina travada — toque para ver a tela completa" onclick="nav('rotina',null)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();nav('rotina',null)}" style="cursor:pointer">
      <div class="dash-focus-label">Rotina · ${sanitize(rotina.objetivo)}</div>
      <div class="dc-card">
        <div class="dc-row"><span class="dc-name">${proximo ? `Próximo: ${sanitize(proximo.label)} às ${proximo.inicio}` : (blocosHoje.length ? 'Blocos de hoje concluídos' : 'Sem bloco hoje')}</span></div>
        <div class="dc-row"><span class="dc-name">Prazo</span><span class="dc-val">${dias === 1 ? '1 dia' : dias + ' dias'}</span></div>
      </div>
    </div>`;
}
