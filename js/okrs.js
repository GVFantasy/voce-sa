import { state, META_LABELS } from './state.js';
import { getActiveQ, getPeriodDates, habitPctInQuarter, weeklyFreqInQuarter, habitStreakInQuarter, overallStreakInQuarter, overallPctInQuarter, finLogConsistencyInQuarter, finLogGrowthInQuarter } from './utils.js';
import { saveCfgLocal, saveCfgRemote } from './db.js';
import { defaultOKR, finOKR, finDicas, QUARTERLY_TASKS } from './okrs-data.js';
import { fetchBibConcluidosCount } from './biblioteca.js';

const areaIcons = { corpo: '🏃', mente: '🧠', financas: '💰', tempo: '⏱', relacoes: '❤️' };
const areaNames = { corpo: 'Corpo', mente: 'Mente', financas: 'Finanças', tempo: 'Tempo', relacoes: 'Relações' };
const qColors = ['', 'q1b', 'q2b', 'q3b', 'q4b'];
const qLabels = ['', 'Fundação', 'Aceleração', 'Escala', 'Colheita'];
const bgColors = [, 'var(--info-bg)', 'var(--suc-bg)', 'var(--warn-bg)', 'var(--dan-bg)'];
const txtColors = [, 'var(--info-txt)', 'var(--suc-txt)', 'var(--warn-txt)', 'var(--dan-txt)'];

// Unica automacao que exige uma busca nova ao Supabase (Biblioteca nao e carregada no login,
// ao contrario de state.log/userCfg) - cache simples em memoria, invalidado quando a Biblioteca
// muda (ver invalidateBibConcluidosCache, chamado por biblioteca.js apos salvar/excluir).
let bibConcluidosCount = 0;
let bibConcluidosLoaded = false;

export function invalidateBibConcluidosCache() {
  bibConcluidosLoaded = false;
}

function ensureBibConcluidosLoaded() {
  if (bibConcluidosLoaded || !state.userCfg.startDate) return;
  bibConcluidosLoaded = true;
  const dates = getPeriodDates('trimestre');
  const fromDate = dates[0];
  fetchBibConcluidosCount(fromDate).then(count => {
    if (count === null) { bibConcluidosLoaded = false; return; } // erro - mantém o cache anterior, tenta de novo depois
    bibConcluidosCount = count;
    renderOKRs();
  });
}

// Avalia uma regra "auto" e devolve { done, pct } (pct 0-100, so pra exibir progresso). As
// métricas em si (habitPctInQuarter etc.) vivem em utils.js — reaproveitadas também pelas
// Ações do trimestre em checkin.js. `aq` e o trimestre sendo avaliado (nao necessariamente o
// ativo - a timeline de OKRs avalia trimestres passados tambem, ver computeKRs/otherQs abaixo).
function evalAutoKR(auto, log, aq) {
  switch (auto.type) {
    case 'habitPct': {
      const pct = habitPctInQuarter(log, auto.habit, aq);
      return { done: pct >= auto.min, pct: Math.round(pct * 100) };
    }
    case 'weeklyFreq': {
      const freq = weeklyFreqInQuarter(log, auto.habit, aq);
      return { done: freq >= auto.min, pct: Math.round(Math.min(1, freq / auto.min) * 100) };
    }
    case 'habitStreak': {
      const streak = habitStreakInQuarter(log, auto.habit, aq);
      return { done: streak >= auto.min, pct: Math.round(Math.min(1, streak / auto.min) * 100) };
    }
    case 'overallStreak': {
      const streak = overallStreakInQuarter(log, aq);
      return { done: streak >= auto.min, pct: Math.round(Math.min(1, streak / auto.min) * 100) };
    }
    case 'overallPct': {
      const pct = overallPctInQuarter(log, aq);
      return { done: pct >= auto.min, pct: Math.round(pct * 100) };
    }
    case 'finLogConsistency': {
      const { done, total } = finLogConsistencyInQuarter(aq);
      return { done: total > 0 && done >= total, pct: total > 0 ? Math.round(done / total * 100) : 0 };
    }
    case 'finLogGrowth': {
      const g = finLogGrowthInQuarter(aq);
      return { done: g, pct: g ? 100 : 0 };
    }
    case 'bibConcluidos': {
      ensureBibConcluidosLoaded();
      return { done: bibConcluidosCount >= auto.min, pct: Math.round(Math.min(1, bibConcluidosCount / auto.min) * 100) };
    }
    default:
      return { done: false, pct: 0 };
  }
}

// String (KR custom digitado pelo usuario) -> sempre manual, sem id estavel (usa indice).
function normalizeKR(kr) {
  return typeof kr === 'string' ? { id: null, text: kr, auto: null } : kr;
}

// Monta a lista de KRs de um trimestre com "done"/"pct" ja calculados — para KRs automaticos,
// usa a regra; para manuais, cai no checkbox de sempre (state.userCfg.okrProgress).
function computeKRs(area, q, krsRaw, log) {
  const progress = state.userCfg.okrProgress || {};
  return krsRaw.map((raw, i) => {
    const kr = normalizeKR(raw);
    if (kr.auto) {
      const { done, pct } = evalAutoKR(kr.auto, log, q);
      return { ...kr, done, pct, isAuto: true, idx: i, progressKey: null };
    }
    const progressKey = `${area}_q${q}_${kr.id || i}`;
    return { ...kr, done: !!progress[progressKey], pct: null, isAuto: false, idx: i, progressKey };
  });
}

function getQData(area, q) {
  const custom = state.userCfg.okrCustom?.[`${area}_q${q}`];
  if (custom) return custom;
  if (area === 'financas') {
    const perfil = state.userCfg.finPerfil || 'iniciante';
    const map = finOKR[perfil] || finOKR.iniciante;
    return map.find(x => x.q === q) || map[map.length - 1];
  }
  return defaultOKR[area]?.find(x => x.q === q) || defaultOKR[area]?.[defaultOKR[area].length - 1];
}

function getDefaultMap(area) {
  if (area === 'financas') {
    const perfil = state.userCfg.finPerfil || 'iniciante';
    return finOKR[perfil] || finOKR.iniciante;
  }
  return defaultOKR[area] || [];
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtBRL(val) {
  return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function renderFinTracker() {
  const el = document.getElementById('fin-tracker');
  if (!el) return;
  const areas = state.userCfg.areas || [];
  if (!areas.includes('financas')) { el.innerHTML = ''; return; }

  const meta = state.userCfg.finMeta || 0;
  const perfil = state.userCfg.finPerfil || 'iniciante';
  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const finLog = [...(state.userCfg.finLog || [])].sort((a, b) => b.mes.localeCompare(a.mes));
  const mesData = finLog.find(x => x.mes === mesAtual) || { guardado: 0, investido: 0 };
  const total = (mesData.guardado || 0) + (mesData.investido || 0);
  const pct = meta > 0 ? Math.max(0, Math.min(100, Math.round(total / meta * 100))) : 0;
  const mesNome = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const perfilLabels = { iniciante: 'Iniciante', transicao: 'Em transição', investidor: 'Investidor' };

  const history = finLog.filter(m => m.mes !== mesAtual).slice(0, 3).map(m => {
    const [y, mo] = m.mes.split('-');
    const nome = new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    const tot = (m.guardado || 0) + (m.investido || 0);
    const mpct = meta > 0 ? Math.max(0, Math.min(100, Math.round(tot / meta * 100))) : 0;
    return `<div class="fin-hist-row">
      <span class="fin-hist-mes">${nome}</span>
      <div class="fin-hist-bar-bg"><div class="fin-hist-bar-fill" style="width:${mpct}%"></div></div>
      <span class="fin-hist-val">R$ ${fmtBRL(tot)}</span>
    </div>`;
  }).join('');

  el.innerHTML = `<div class="fin-tracker-card">
    <div class="fin-tracker-hdr">
      <span class="fin-tracker-title">Tracker financeiro</span>
      <span class="fin-perfil-badge">${perfilLabels[perfil]}</span>
    </div>
    <div class="fin-tracker-mes">${mesNome}</div>
    ${meta > 0 ? `<div class="fin-meta-label">Meta: R$ ${fmtBRL(meta)}/mês</div>` : '<div class="fin-meta-label" style="color:var(--ambar)">Defina sua meta em Perfil → Finanças</div>'}
    <div class="fin-inputs-row">
      <div class="fin-field">
        <div class="fin-field-label">Guardado 🏦</div>
        <div class="fin-input-wrap"><span>R$</span><input type="number" id="fin-guardado" class="fin-input" value="${mesData.guardado || ''}" placeholder="0" min="0"></div>
      </div>
      <div class="fin-field">
        <div class="fin-field-label">Investido 📈</div>
        <div class="fin-input-wrap"><span>R$</span><input type="number" id="fin-investido" class="fin-input" value="${mesData.investido || ''}" placeholder="0" min="0"></div>
      </div>
    </div>
    <button class="save-btn" style="margin-top:10px" onclick="saveFinMes()">Registrar mês</button>
    ${meta > 0 ? `<div class="okr-progress-wrap" style="margin-top:12px">
      <div class="okr-progress-bg"><div class="okr-progress-fill fin-fill" style="width:${pct}%"></div></div>
      <span class="okr-progress-label">R$ ${fmtBRL(total)} / R$ ${fmtBRL(meta)} · ${pct}%</span>
    </div>` : ''}
    ${history ? `<div class="fin-history"><div class="fin-history-title">Meses anteriores</div>${history}</div>` : ''}
    <div class="fin-dica">${finDicas[perfil]}</div>
  </div>`;
}

// 7 itens do checklist tem proxy honesto direto no que o check-in/Biblioteca ja grava (mesmo
// principio do motor de KRs automaticos acima) - fecham sozinhos, sem clique manual. O resto
// continua exatamente como hoje (checkbox manual via tasksDone).
const TASK_AUTO = {
  mente_q1_b: () => { ensureBibConcluidosLoaded(); return bibConcluidosCount >= 1; },
  mente_q1_c: () => habitStreakInQuarter(state.log, 'estudo') >= 30,
  tempo_q1_b: () => {
    const dates = new Set(getPeriodDates('trimestre'));
    return Object.keys(state.userCfg.weeklyReviews || {}).some(d => dates.has(d));
  },
  tempo_q2_a: () => {
    const quarterDates = getPeriodDates('trimestre');
    if (!quarterDates.length) return false;
    const qStart = new Date(quarterDates[0] + 'T12:00:00');
    const dateSet = new Set(quarterDates);
    const weeks = new Set();
    (state.userCfg.pomodoroLog || []).forEach(s => {
      if (!dateSet.has(s.date)) return;
      const d = new Date(s.date + 'T12:00:00');
      weeks.add(Math.floor((d - qStart) / (7 * 86400000)));
    });
    return weeks.size >= 2;
  },
  fin_q1_a: () => habitPctInQuarter(state.log, 'financas') >= 0.7,
  fin_q1_b: () => (state.userCfg.finMeta || 0) > 0,
  fin_q3_a: () => {
    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return (state.userCfg.finLog || []).some(m => m.mes === mesAtual && ((m.guardado || 0) + (m.investido || 0)) > 0);
  },
};

// Renderiza as Acoes do trimestre so da area/trimestre desse pilar (antes ficava numa lista unica
// no check-in, juntando todas as areas - agora mora dentro do card do trimestre a que pertence).
function renderPillarTasks(area, aq) {
  const tasks = QUARTERLY_TASKS[area]?.[aq] || [];
  if (!tasks.length) return '';
  const doneTasks = state.userCfg.tasksDone || {};
  const isTaskDone = t => TASK_AUTO[t.id] ? TASK_AUTO[t.id]() : !!doneTasks[t.id];
  const doneCount = tasks.filter(isTaskDone).length;
  return `<div class="qtask-section-nested">
    <div class="qtask-header"><span>Ações do trimestre</span><span class="qtask-count">${doneCount}/${tasks.length}</span></div>
    ${tasks.map(t => {
      const auto = !!TASK_AUTO[t.id];
      const isDone = isTaskDone(t);
      const interactiveAttrs = auto
        ? ` role="status" aria-label="${esc(t.text)} — ${isDone ? 'concluído automaticamente' : 'ainda não concluído automaticamente'}"`
        : ` role="checkbox" aria-checked="${isDone}" aria-label="${esc(t.text)}" tabindex="0" onclick="toggleQTask('${t.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleQTask('${t.id}')}"`;
      return `<div class="qtask ${isDone ? 'done' : ''}${auto ? ' auto' : ''}" id="qtask-${t.id}"${interactiveAttrs}>
        <div class="qtask-check-box">${isDone ? '✓' : ''}</div>
        <div class="qtask-body">
          <div class="qtask-text">${esc(t.text)}${auto ? '<span class="okr-kr-auto-tag">automático</span>' : ''}</div>
          ${t.hint ? `<div class="qtask-hint">${esc(t.hint)}</div>` : ''}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

export async function toggleQTask(taskId) {
  if (!state.userCfg.tasksDone) state.userCfg.tasksDone = {};
  state.userCfg.tasksDone[taskId] = !state.userCfg.tasksDone[taskId];
  const done = state.userCfg.tasksDone[taskId];

  const el = document.getElementById(`qtask-${taskId}`);
  if (el) {
    el.classList.toggle('done', done);
    el.setAttribute('aria-checked', done);
    const check = el.querySelector('.qtask-check-box');
    if (check) check.textContent = done ? '✓' : '';
    const section = el.closest('.qtask-section-nested');
    if (section) {
      const cards = section.querySelectorAll('.qtask');
      const doneCnt = section.querySelectorAll('.qtask.done').length;
      const countEl = section.querySelector('.qtask-count');
      if (countEl) countEl.textContent = `${doneCnt}/${cards.length}`;
    }
  }

  saveCfgLocal();
  const { renderDashboard } = await import('./dashboard.js');
  renderDashboard();
  await saveCfgRemote();
}

export function renderOKRs() {
  const aq = getActiveQ(state.userCfg.startDate);
  const areas = state.userCfg.areas || [];
  const custom = state.userCfg.okrCustom || {};

  document.getElementById('q-badge').innerHTML =
    `<div class="q-badge-active" style="background:${bgColors[aq]};color:${txtColors[aq]}">Q${aq} — ${qLabels[aq]} · trimestre ativo</div>`;

  if (state.userCfg.meta) document.getElementById('user-mission').textContent = '"' + (META_LABELS[state.userCfg.meta] || state.userCfg.meta) + '"';

  // 1a passada: monta o dado de cada pilar (mesmo calculo de sempre) pra descobrir qual area
  // esta mais atrasada antes de renderizar - so essa comeca aberta, as outras ficam colapsadas
  // (mostrando so nome+progresso) ate o usuario tocar. Mesmo criterio de "mais atrasada" de
  // getActiveObjective() (menor % de KRs concluidos; empate mantem a ordem original).
  const pillarData = areas.map(area => {
    const defMap = getDefaultMap(area);
    if (!defMap.length) return null;
    const qData = getQData(area, aq);
    if (!qData) return null;
    const krs = computeKRs(area, aq, qData.krs, state.log);
    const totalCnt = krs.length;
    const doneCnt = krs.filter(k => k.done).length;
    const pct = totalCnt > 0 ? doneCnt / totalCnt : 0;
    return { area, defMap, qData, krs, totalCnt, doneCnt, pct };
  }).filter(Boolean);

  let mostBehindArea = null, worstPct = Infinity;
  pillarData.forEach(p => { if (p.pct < worstPct) { worstPct = p.pct; mostBehindArea = p.area; } });

  document.getElementById('pillar-list').innerHTML = pillarData.map(({ area, defMap, qData, krs, totalCnt, doneCnt }) => {
    const pct = totalCnt > 0 ? Math.round(doneCnt / totalCnt * 100) : 0;
    const isOpen = area === mostBehindArea;

    const krItems = krs.map(kr => {
      if (kr.isAuto) {
        const stateLabel = kr.done ? 'concluído automaticamente' : `em progresso automaticamente, ${kr.pct}%`;
        return `<div class="okr-kr-item auto ${kr.done ? 'done' : ''}" role="status" aria-label="${esc(kr.text)} — ${stateLabel}">
          <div class="okr-kr-check">${kr.done ? '✓' : ''}</div>
          <div class="okr-kr-body">
            <div class="okr-kr-text">${esc(kr.text)}<span class="okr-kr-auto-tag">automático</span></div>
            ${!kr.done ? `<div class="okr-kr-mini-bar"><div class="okr-kr-mini-fill" style="width:${kr.pct}%"></div></div>` : ''}
          </div>
        </div>`;
      }
      return `<div class="okr-kr-item ${kr.done ? 'done' : ''}" id="okr-kr-el-${area}-${aq}-${kr.idx}" role="checkbox" aria-checked="${kr.done}" tabindex="0" onclick="toggleKR('${area}',${aq},${kr.idx},'${kr.progressKey}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleKR('${area}',${aq},${kr.idx},'${kr.progressKey}')}">
        <div class="okr-kr-check">${kr.done ? '✓' : ''}</div>
        <div class="okr-kr-text">${esc(kr.text)}</div>
      </div>`;
    }).join('');

    const editInputs = krs.map((kr, i) =>
      `<input class="ob-input" id="okr-kr-${area}-${aq}-${i}" value="${esc(kr.text)}" placeholder="Key result ${i + 1}" style="margin-bottom:6px">`
    ).join('');

    const otherQs = defMap
      .filter(x => x.q !== aq)
      .map(x => {
        const isPast = x.q < aq;
        const lbl = custom[`${area}_q${x.q}`]?.label || x.label;
        const otherKrs = computeKRs(area, x.q, custom[`${area}_q${x.q}`]?.krs || x.krs, state.log);
        const doneOther = otherKrs.filter(k => k.done).length;
        const totOther = otherKrs.length;
        return `<div class="okr-tl-item ${isPast ? 'past' : 'future'}">
          <span class="qbadge ${qColors[x.q] || 'q3b'}">Q${x.q}</span>
          <span class="tl-lbl">${esc(lbl)}</span>
          ${isPast && doneOther > 0 ? `<span class="tl-done">${doneOther}/${totOther}</span>` : ''}
        </div>`;
      }).join('');

    return `<div class="pillar-card">
      <div class="pillar-header" role="button" tabindex="0" aria-expanded="${isOpen}" aria-label="${areaNames[area] || area}, ${doneCnt} de ${totalCnt} KRs" onclick="togglePillar(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();togglePillar(this)}">
        <div class="pillar-title">${areaIcons[area] || '⭐'} ${areaNames[area] || area}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="okr-mini-prog" id="okr-mini-${area}">${doneCnt}/${totalCnt}</span>
          <div class="pillar-chev" style="transform:${isOpen ? 'rotate(90deg)' : ''}">›</div>
        </div>
      </div>
      <div class="pillar-body${isOpen ? ' open' : ''}">
        <div class="okr-active-section">
          <div class="okr-active-hdr">
            <span class="qbadge ${qColors[aq]}">Q${aq}</span>
            <span class="okr-active-lbl">${esc(qData.label)}</span>
            <button class="okr-edit-btn" aria-label="Editar objetivo e KRs" onclick="openOKREdit('${area}',${aq});event.stopPropagation()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg></button>
          </div>
          <div class="okr-edit-form" id="okr-edit-${area}-${aq}" style="display:none">
            <input class="ob-input" id="okr-obj-${area}-${aq}" value="${esc(qData.label)}" placeholder="Objetivo do trimestre" style="margin-bottom:6px">
            ${editInputs}
            <div style="display:flex;gap:8px;margin-top:4px">
              <button class="btn-primary" style="padding:8px 14px;font-size:13px;width:auto" onclick="saveOKREdit('${area}',${aq},${totalCnt})">Salvar</button>
              <button class="btn-ghost" style="padding:8px 14px;font-size:13px;width:auto" onclick="cancelOKREdit('${area}',${aq})">Cancelar</button>
            </div>
          </div>
          <div id="okr-krs-list-${area}-${aq}">
            ${krItems}
          </div>
          <div class="okr-progress-wrap" id="okr-prog-${area}-${aq}" data-total="${totalCnt}">
            <div class="okr-progress-bg"><div class="okr-progress-fill" style="width:${pct}%"></div></div>
            <span class="okr-progress-label">${doneCnt}/${totalCnt} KRs</span>
          </div>
          ${renderPillarTasks(area, aq)}
        </div>
        ${otherQs ? `<div class="okr-timeline">${otherQs}</div>` : ''}
      </div>
    </div>`;
  }).join('') || '<div class="empty-state"><strong>Nenhum OKR ainda</strong>Escolha suas áreas de foco em Configurações para gerar objetivos do trimestre.</div>';

  renderFinTracker();

  const habitIds = new Set(state.userHabits.map(h => h.id));
  const missing = [];
  if (areas.includes('corpo') && !habitIds.has('treino'))
    missing.push('🏋️ <b>Treino</b> — importante para seus OKRs de Corpo');
  if (areas.includes('mente') && !habitIds.has('estudo'))
    missing.push('📚 <b>Estudo</b> — importante para seus OKRs de Mente');
  const notifEl = document.getElementById('okr-habit-notif');
  if (notifEl) {
    notifEl.innerHTML = missing.length
      ? `<div class="alert alert-warn" style="margin-bottom:12px"><strong>Hábitos não ativos:</strong><br>${missing.join('<br>')}<br><span style="font-size:11px;opacity:.75">Ative em Perfil → Ajustes táticos ou refaça o onboarding.</span></div>`
      : '';
  }
}

export function togglePillar(hdr) {
  const body = hdr.nextElementSibling;
  const chev = hdr.querySelector('.pillar-chev');
  body.classList.toggle('open');
  const isOpen = body.classList.contains('open');
  chev.style.transform = isOpen ? 'rotate(90deg)' : '';
  hdr.setAttribute('aria-expanded', isOpen);
}

export function openOKREdit(area, q) {
  const form = document.getElementById(`okr-edit-${area}-${q}`);
  const list = document.getElementById(`okr-krs-list-${area}-${q}`);
  if (form) form.style.display = 'block';
  if (list) list.style.display = 'none';
}

export function cancelOKREdit(area, q) {
  const form = document.getElementById(`okr-edit-${area}-${q}`);
  const list = document.getElementById(`okr-krs-list-${area}-${q}`);
  if (form) form.style.display = 'none';
  if (list) list.style.display = '';
}

export async function saveOKREdit(area, q, krCount) {
  const label = document.getElementById(`okr-obj-${area}-${q}`)?.value?.trim();
  if (!label) return;
  const krs = [];
  for (let i = 0; i < krCount; i++) {
    const val = document.getElementById(`okr-kr-${area}-${q}-${i}`)?.value?.trim();
    if (val) krs.push(val);
  }
  if (!krs.length) return;
  if (!state.userCfg.okrCustom) state.userCfg.okrCustom = {};
  state.userCfg.okrCustom[`${area}_q${q}`] = { label, krs };
  saveCfgLocal();
  renderOKRs();
  await saveCfgRemote();
}

export async function toggleKR(area, q, krIdx, progressKey) {
  if (!state.userCfg.okrProgress) state.userCfg.okrProgress = {};
  state.userCfg.okrProgress[progressKey] = !state.userCfg.okrProgress[progressKey];
  const done = state.userCfg.okrProgress[progressKey];

  const krEl = document.getElementById(`okr-kr-el-${area}-${q}-${krIdx}`);
  if (krEl) {
    krEl.classList.toggle('done', done);
    krEl.setAttribute('aria-checked', done);
    const check = krEl.querySelector('.okr-kr-check');
    if (check) check.textContent = done ? '✓' : '';
  }

  const qData = getQData(area, q);
  const progWrap = document.getElementById(`okr-prog-${area}-${q}`);
  if (progWrap && qData) {
    const krs = computeKRs(area, q, qData.krs, state.log);
    const doneCnt = krs.filter(k => k.done).length;
    const total = krs.length;
    const pct = total > 0 ? Math.round(doneCnt / total * 100) : 0;
    const fill = progWrap.querySelector('.okr-progress-fill');
    const lbl = progWrap.querySelector('.okr-progress-label');
    if (fill) fill.style.width = pct + '%';
    if (lbl) lbl.textContent = `${doneCnt}/${total} KRs`;
    const miniEl = document.getElementById(`okr-mini-${area}`);
    if (miniEl) miniEl.textContent = `${doneCnt}/${total}`;
  }

  saveCfgLocal();

  const { renderDashboard } = await import('./dashboard.js');
  renderDashboard();
  await saveCfgRemote();
}

export async function saveFinMes() {
  const guardado = Math.max(0, parseFloat(document.getElementById('fin-guardado')?.value || '0') || 0);
  const investido = Math.max(0, parseFloat(document.getElementById('fin-investido')?.value || '0') || 0);
  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (!state.userCfg.finLog) state.userCfg.finLog = [];
  const idx = state.userCfg.finLog.findIndex(x => x.mes === mesAtual);
  const entry = { mes: mesAtual, guardado, investido };
  if (idx >= 0) state.userCfg.finLog[idx] = entry;
  else state.userCfg.finLog.unshift(entry);
  state.userCfg.finLog = state.userCfg.finLog.slice(0, 24); // keep 2 years
  saveCfgLocal();
  renderFinTracker();
  const { renderDashboard } = await import('./dashboard.js');
  renderDashboard();
  await saveCfgRemote();
}

// logOverride: usado pelo check-in pra pré-visualizar o impacto do rascunho do dia (state.ts)
// sem esperar o "Salvar check-in" — ver renderOkrFocusStrip() em checkin.js.
export function getActiveObjective(logOverride) {
  if (!state.userCfg.startDate) return null;
  const aq = getActiveQ(state.userCfg.startDate);
  const areas = state.userCfg.areas || [];
  if (!areas.length) return null;
  const log = logOverride || state.log;

  // monta o objeto de cada área e escolhe a mais atrasada (menor % de KRs concluídos);
  // empate mantém a ordem original das áreas escolhidas no onboarding
  let best = null;
  for (const area of areas) {
    const defMap = getDefaultMap(area);
    if (!defMap.length) continue;
    const qData = getQData(area, aq);
    if (!qData) continue;
    const krs = computeKRs(area, aq, qData.krs, log);
    const doneCnt = krs.filter(k => k.done).length;
    const totalCnt = krs.length;
    const pct = totalCnt > 0 ? doneCnt / totalCnt : 0;
    const candidate = {
      aq, area,
      areaName: areaNames[area] || area,
      label: qData.label,
      krs,
      doneCnt,
      totalCnt,
    };
    if (!best || pct < best.pct) best = { ...candidate, pct };
  }
  if (!best) return null;
  const { pct, ...obj } = best;
  return obj;
}
