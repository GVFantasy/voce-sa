// Financeiro como página própria (v5 Fase 5) - antes vivia dentro da tela de OKRs
// (renderFinTracker/saveFinMes, js/okrs.js). Mesma lógica, só saiu de lá e ganhou um hero em
// bloco de cor sólida no topo (reaproveita as classes .dash-hero* do dashboard, mesmo
// tratamento visual, sem CSS novo).
import { state } from './state.js';
import { saveCfgLocal, saveCfgRemote } from './db.js';
import { sanitize } from './utils.js';
import { finDicas } from './okrs-data.js';

function fmtBRL(val) {
  return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function renderFinHero(mesData, meta, total, pct, mesNome) {
  const el = document.getElementById('fin-hero-wrap');
  if (!el) return;
  let color, label, msg, sub;
  if (meta <= 0) {
    color = 'roxo'; label = 'Financeiro';
    msg = 'Defina uma meta pra começar';
    sub = 'Uma meta mensal de economia ajuda a ver o progresso — configure em Perfil → Finanças.';
  } else if (pct >= 100) {
    color = 'verde'; label = 'Meta batida';
    msg = `R$ ${fmtBRL(total)} guardados em ${mesNome}`;
    sub = `Você bateu sua meta de R$ ${fmtBRL(meta)} este mês.`;
  } else if (pct >= 60) {
    color = 'verde'; label = 'No caminho certo';
    msg = `R$ ${fmtBRL(total)} de R$ ${fmtBRL(meta)}`;
    sub = `Faltam R$ ${fmtBRL(meta - total)} pra bater a meta de ${mesNome}.`;
  } else if (pct > 0) {
    color = 'ambar'; label = 'Financeiro';
    msg = `R$ ${fmtBRL(total)} de R$ ${fmtBRL(meta)}`;
    sub = `${pct}% da meta de ${mesNome} até aqui.`;
  } else {
    color = 'roxo'; label = 'Financeiro';
    msg = `Meta de R$ ${fmtBRL(meta)} em ${mesNome}`;
    sub = 'Ainda sem lançamento este mês — registre abaixo quando guardar ou investir algo.';
  }
  el.innerHTML = `
    <div class="dash-hero ${color}">
      ${meta > 0 ? `<div class="dash-hero-streak">${pct}%</div>` : ''}
      <div class="dash-hero-label">${label}</div>
      <div class="dash-hero-msg">${sanitize(msg)}</div>
      <div class="dash-hero-sub">${sanitize(sub)}</div>
    </div>`;
}

export function renderFinanceiro() {
  const heroWrap = document.getElementById('fin-hero-wrap');
  const el = document.getElementById('fin-tracker');
  if (!el) return;
  const areas = state.userCfg.areas || [];
  if (!areas.includes('financas')) {
    el.innerHTML = '<div class="empty-state"><strong>Financeiro não está ativo</strong>Escolha "Finanças" entre suas áreas em Configurações pra usar esta tela.</div>';
    if (heroWrap) heroWrap.innerHTML = '';
    return;
  }

  const meta = state.userCfg.finMeta || 0;
  const perfil = state.userCfg.finPerfil || 'iniciante';
  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const finLog = [...(state.userCfg.finLog || [])].sort((a, b) => b.mes.localeCompare(a.mes));
  const mesData = finLog.find(x => x.mes === mesAtual) || { guardado: 0, investido: 0 };
  const total = (mesData.guardado || 0) + (mesData.investido || 0);
  const pct = meta > 0 ? Math.max(0, Math.min(100, Math.round(total / meta * 100))) : 0;
  const mesNome = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  renderFinHero(mesData, meta, total, pct, mesNome);

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
      <span class="fin-tracker-title">Registrar o mês</span>
      <span class="fin-perfil-badge">${perfilLabels[perfil]}</span>
    </div>
    <div class="fin-tracker-mes">${mesNome}</div>
    <div class="fin-inputs-row">
      <div class="fin-field">
        <label class="fin-field-label" for="fin-guardado">Guardado 🏦</label>
        <div class="fin-input-wrap"><span>R$</span><input type="number" id="fin-guardado" class="fin-input" value="${mesData.guardado || ''}" placeholder="0" min="0"></div>
      </div>
      <div class="fin-field">
        <label class="fin-field-label" for="fin-investido">Investido 📈</label>
        <div class="fin-input-wrap"><span>R$</span><input type="number" id="fin-investido" class="fin-input" value="${mesData.investido || ''}" placeholder="0" min="0"></div>
      </div>
    </div>
    <button class="save-btn" style="margin-top:10px" onclick="saveFinMes()">Registrar mês</button>
    ${history ? `<div class="fin-history"><div class="fin-history-title">Meses anteriores</div>${history}</div>` : ''}
    <div class="fin-dica">${finDicas[perfil]}</div>
  </div>`;
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
  renderFinanceiro();
  const { renderDashboard } = await import('./dashboard.js');
  renderDashboard();
  await saveCfgRemote();
}
