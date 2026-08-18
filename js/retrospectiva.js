// Retrospectiva: painel passivo (nunca pede nada ao usuário) com a visão do trimestre inteiro
// e do ano inteiro - algo que o app não tinha até aqui (só heatmap de 84 dias e comparação
// semana-a-semana). Toda métrica é derivada de state.log/userCfg já existentes.
import { state } from './state.js';
import { getActiveQ, getPeriodDates, overallPctInQuarter, overallStreakInQuarter, quarterMonthsSoFar, sanitize, isExpected } from './utils.js';
import { getQuarterSummary } from './okrs.js';
import { gerarInsights } from './insights.js';

const Q_LABELS = ['', 'Fundação', 'Aceleração', 'Escala', 'Colheita'];

let selectedAq = null; // null = trimestre ativo
let activeTab = 'trimestre';

function weeklyPctRangeInQuarter(aq) {
  const dates = getPeriodDates('trimestre', aq);
  if (!dates.length) return null;
  const logMap = Object.fromEntries(state.log.map(e => [e.date, e]));
  const habits = state.userHabits || [];
  let best = null, worst = null;
  for (let i = 0; i < dates.length; i += 7) {
    const chunk = dates.slice(i, i + 7);
    let done = 0, possible = 0;
    chunk.forEach(date => {
      const entry = logMap[date];
      habits.forEach(h => {
        if (isExpected(h, date)) { possible++; if (entry && entry.habits[h.id]) done++; }
      });
    });
    if (possible === 0) continue;
    const pct = Math.round(done / possible * 100);
    if (best === null || pct > best) best = pct;
    if (worst === null || pct < worst) worst = pct;
  }
  return best === null ? null : { best, worst };
}

function fmtBRL(v) { return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

function finResumoQuarter(aq) {
  const months = quarterMonthsSoFar(aq);
  const finLog = state.userCfg.finLog || [];
  const total = months.reduce((sum, m) => {
    const e = finLog.find(x => x.mes === m);
    return sum + (e ? (e.guardado || 0) + (e.investido || 0) : 0);
  }, 0);
  return { total, meses: months.length };
}

function pesoResumoQuarter(aq) {
  const dates = getPeriodDates('trimestre', aq);
  if (!dates.length) return null;
  const log = (state.userCfg.pesoLog || []).filter(p => dates.includes(p.data)).sort((a, b) => a.data.localeCompare(b.data));
  if (log.length < 2) return null;
  const inicio = log[0].peso, fim = log[log.length - 1].peso;
  return { inicio, fim, diff: Math.round((fim - inicio) * 10) / 10 };
}

function renderTrimestre() {
  const el = document.getElementById('retro-content');
  if (!el) return;
  const activeAq = getActiveQ(state.userCfg.startDate);
  const aq = selectedAq || activeAq;
  const pct = Math.round(overallPctInQuarter(state.log, aq) * 100);
  const streak = overallStreakInQuarter(state.log, aq);
  const { doneCnt, totalCnt } = getQuarterSummary(aq, state.log);
  const weekRange = weeklyPctRangeInQuarter(aq);
  const fin = (state.userCfg.areas || []).includes('financas') ? finResumoQuarter(aq) : null;
  const peso = (state.userCfg.areas || []).includes('corpo') ? pesoResumoQuarter(aq) : null;

  let compareHtml = '';
  if (aq > 1) {
    const pctPrev = Math.round(overallPctInQuarter(state.log, aq - 1) * 100);
    const diff = pct - pctPrev;
    const cls = diff > 0 ? 'dc-up' : diff < 0 ? 'dc-down' : 'dc-same';
    const txt = diff === 0 ? 'Igual ao trimestre anterior' : `${diff > 0 ? '↑' : '↓'} ${Math.abs(diff)} pontos vs. Q${aq - 1}`;
    compareHtml = `<div class="dc-row"><span class="dc-name">Comparado ao Q${aq - 1}</span><span class="dc-val ${cls}">${txt}</span></div>`;
  }

  const insights = aq === activeAq ? gerarInsights(state.log) : [];

  el.innerHTML = `
    <div class="retro-q-nav">
      <button class="retro-q-arrow" ${aq <= 1 ? 'disabled' : ''} onclick="retroPrevQ()" aria-label="Trimestre anterior">‹</button>
      <div class="retro-q-label">Q${aq} — ${Q_LABELS[aq]}${aq === activeAq ? ' · ativo' : ''}</div>
      <button class="retro-q-arrow" ${aq >= activeAq ? 'disabled' : ''} onclick="retroNextQ()" aria-label="Próximo trimestre">›</button>
    </div>
    <div class="card">
      <div class="dc-row"><span class="dc-name">Cumprido no geral</span><span class="dc-val">${pct}%</span></div>
      <div class="dc-row"><span class="dc-name">Sequência conquistada</span><span class="dc-val">${streak}d</span></div>
      <div class="dc-row"><span class="dc-name">KRs concluídos</span><span class="dc-val">${doneCnt}/${totalCnt}</span></div>
      ${weekRange ? `<div class="dc-row"><span class="dc-name">Melhor semana / pior semana</span><span class="dc-val">${weekRange.best}% / ${weekRange.worst}%</span></div>` : ''}
      ${compareHtml}
    </div>
    ${fin ? `<div class="card">
      <div class="card-title" style="font-size:13px;font-weight:600;margin-bottom:8px">Financeiro do trimestre</div>
      <div class="dc-row"><span class="dc-name">Guardado + investido</span><span class="dc-val">R$ ${fmtBRL(fin.total)}</span></div>
    </div>` : ''}
    ${peso ? `<div class="card">
      <div class="card-title" style="font-size:13px;font-weight:600;margin-bottom:8px">Peso no trimestre</div>
      <div class="dc-row"><span class="dc-name">${peso.inicio}kg → ${peso.fim}kg</span><span class="dc-val ${peso.diff < 0 ? 'dc-down' : peso.diff > 0 ? 'dc-up' : 'dc-same'}">${peso.diff > 0 ? '+' : ''}${peso.diff}kg</span></div>
    </div>` : ''}
    ${insights.length ? `<div class="card">
      <div class="card-title" style="font-size:13px;font-weight:600;margin-bottom:8px">O que os dados mostram</div>
      ${insights.map(i => `<div class="retro-insight">${sanitize(i)}</div>`).join('')}
    </div>` : ''}
  `;
}

function renderAno() {
  const el = document.getElementById('retro-content');
  if (!el) return;
  const activeAq = getActiveQ(state.userCfg.startDate);
  const cards = [1, 2, 3, 4].map(aq => {
    const isFuture = aq > activeAq;
    if (isFuture) {
      return `<div class="retro-year-card future"><div class="retro-year-q">Q${aq}</div><div class="retro-year-lbl">${Q_LABELS[aq]}</div><div class="retro-year-empty">ainda não chegou</div></div>`;
    }
    const pct = Math.round(overallPctInQuarter(state.log, aq) * 100);
    const streak = overallStreakInQuarter(state.log, aq);
    const { doneCnt, totalCnt } = getQuarterSummary(aq, state.log);
    return `<div class="retro-year-card ${aq === activeAq ? 'active' : ''}">
      <div class="retro-year-q">Q${aq}</div>
      <div class="retro-year-lbl">${Q_LABELS[aq]}</div>
      <div class="retro-year-stat"><span>${pct}%</span> cumprido</div>
      <div class="retro-year-stat"><span>${streak}d</span> sequência</div>
      <div class="retro-year-stat"><span>${doneCnt}/${totalCnt}</span> KRs</div>
    </div>`;
  }).join('');
  el.innerHTML = `<div class="retro-year-grid">${cards}</div>`;
}

export function renderRetrospectiva() {
  selectedAq = null;
  activeTab = 'trimestre';
  document.querySelectorAll('.ptab').forEach(b => b.classList.toggle('on', b.dataset.tab === 'trimestre'));
  renderTrimestre();
}

export function setRetroTab(tab, el) {
  activeTab = tab;
  document.querySelectorAll('.ptab').forEach(b => b.classList.remove('on'));
  if (el) el.classList.add('on');
  if (tab === 'trimestre') renderTrimestre(); else renderAno();
}

export function retroPrevQ() {
  const activeAq = getActiveQ(state.userCfg.startDate);
  const aq = selectedAq || activeAq;
  if (aq <= 1) return;
  selectedAq = aq - 1;
  renderTrimestre();
}

export function retroNextQ() {
  const activeAq = getActiveQ(state.userCfg.startDate);
  const aq = selectedAq || activeAq;
  if (aq >= activeAq) return;
  selectedAq = aq + 1;
  renderTrimestre();
}
