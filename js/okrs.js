import { state } from './state.js';
import { getActiveQ } from './utils.js';
import { saveCfgLocal, saveCfgRemote } from './db.js';

const areaIcons = { corpo: '🏃', mente: '🧠', financas: '💰', tempo: '⏱', relacoes: '❤️' };
const areaNames = { corpo: 'Corpo', mente: 'Mente', financas: 'Finanças', tempo: 'Tempo', relacoes: 'Relações' };
const qColors = ['', 'q1b', 'q2b', 'q3b', 'q4b'];
const qLabels = ['', 'Fundação', 'Aceleração', 'Escala', 'Colheita'];
const bgColors = [, 'var(--info-bg)', 'var(--suc-bg)', 'var(--warn-bg)', 'var(--dan-bg)'];
const txtColors = [, 'var(--info-txt)', 'var(--suc-txt)', 'var(--warn-txt)', 'var(--dan-txt)'];

const defaultOKR = {
  corpo: [
    { q: 1, label: 'Instalar movimento', krs: ['Treinar nos dias escolhidos consistentemente', 'Dormir 7h+ em 5 dias/semana', 'Tela off 30 min antes de dormir'] },
    { q: 2, label: 'Elevar frequência', krs: ['Adicionar mais 1 dia de treino', 'Sono 7h+ em 6/7 dias'] },
    { q: 3, label: 'Alta performance', krs: ['4+ treinos/semana', 'Participar de evento esportivo'] },
    { q: 4, label: 'Alta performance — manter', krs: ['4+ treinos/semana', 'Encerrar o ano com evolução documentada'] },
  ],
  mente: [
    { q: 1, label: 'Hábito diário de aprendizado', krs: ['Idioma nos dias escolhidos', 'Streak de 30 dias de estudo', '1 livro por mês'] },
    { q: 2, label: 'Conversação básica', krs: ['Ter uma conversa simples no idioma', 'Consumir 30 min de conteúdo sem parar'] },
    { q: 3, label: 'Fluência progressiva', krs: ['Usar o idioma em situação real', '3 livros lidos no trimestre'] },
    { q: 4, label: 'Fluência consolidada', krs: ['Idioma integrado à rotina', 'Avaliar e documentar evolução anual'] },
  ],
  tempo: [
    { q: 1, label: 'Estruturar semana', krs: ['Criar blocos fixos de foco', 'Revisão semanal toda sexta', 'Eliminar 1 atividade improdutiva'] },
    { q: 2, label: 'Proteção do tempo', krs: ['Deep work diário de 90 min', 'Delegar 1 tarefa operacional'] },
    { q: 3, label: 'Eficiência avançada', krs: ['Tirar férias reais de 3–5 dias', 'Hábitos no piloto automático'] },
    { q: 4, label: 'Legado do tempo', krs: ['Auditar onde foi o tempo este ano', 'Projetar a estrutura do próximo ano'] },
  ],
  relacoes: [
    { q: 1, label: 'Presença e qualidade', krs: ['1 encontro intencional por semana', 'Reduzir scroll passivo em 30%', 'Listar 3 pessoas para cultivar'] },
    { q: 2, label: 'Aprofundamento', krs: ['Cultivar 3 relações importantes', 'Ter 1 conversa difícil que está adiando'] },
    { q: 3, label: 'Comunidade', krs: ['Entrar em grupo com propósito', 'Retomar contato com alguém que se distanciou'] },
    { q: 4, label: 'Celebrar e renovar', krs: ['Celebrar o ano com as pessoas certas', 'Agradecer pelas relações que importam'] },
  ],
};

const finOKR = {
  iniciante: [
    { q: 1, label: 'Instalar controle financeiro', krs: ['Mapear todas as despesas do mês', 'Definir % fixo do salário para guardar', 'Abrir conta de investimento gratuita'] },
    { q: 2, label: 'Hábito de poupar', krs: ['Guardar % fixo todo mês sem falhar', 'Eliminar ou renegociar 1 gasto desnecessário', 'Primeiro investimento em renda fixa'] },
    { q: 3, label: 'Primeiros investimentos', krs: ['Reserva de emergência completa (3× despesas)', 'Investir em Tesouro Selic ou CDB', 'Entender a diferença entre guardar e investir'] },
    { q: 4, label: 'Avaliar e crescer', krs: ['Calcular patrimônio acumulado no ano', 'Aumentar % de economia para o próximo ano', 'Definir meta financeira para os próximos 12 meses'] },
  ],
  transicao: [
    { q: 1, label: 'Organizar e automatizar', krs: ['Automatizar aporte mensal no dia do salário', 'Revisar e cortar 2+ gastos desnecessários', 'Criar planilha ou usar app de orçamento'] },
    { q: 2, label: 'Diversificar carteira', krs: ['Iniciar em renda variável (FII ou ETF)', 'Estudar tributação de cada tipo de investimento', 'Rebalancear alocação por perfil de risco'] },
    { q: 3, label: 'Crescer patrimônio', krs: ['Aumentar % investido em 5+ pontos', 'Calcular taxa de poupança atual', 'Comparar retorno da carteira com o CDI'] },
    { q: 4, label: 'Otimizar e planejar', krs: ['Rebalancear carteira ao fim do ano', 'Calcular retorno real dos investimentos', 'Definir meta de patrimônio para os próximos 5 anos'] },
  ],
  investidor: [
    { q: 1, label: 'Revisar estratégia', krs: ['Rebalancear alocação da carteira', 'Revisar tese de cada posição ativa', 'Calcular retorno vs benchmark (CDI / IBOV)'] },
    { q: 2, label: 'Escalar aportes', krs: ['Aumentar aporte vs trimestre anterior', 'Explorar nova classe de ativo ou mercado', 'Otimizar carga tributária dos investimentos'] },
    { q: 3, label: 'Renda passiva', krs: ['Calcular renda passiva mensal gerada', 'Medir % das despesas cobertas por investimentos', 'Avaliar oportunidades de diversificação internacional'] },
    { q: 4, label: 'Planejar próximo nível', krs: ['Calcular FI Number (independência financeira)', 'Revisar plano de 5 anos', 'Definir estratégia de alocação para o próximo ano'] },
  ],
};

const finDicas = {
  iniciante: 'Comece guardando qualquer valor. O hábito de poupar importa mais que o montante inicial.',
  transicao: 'Automatize: configure transferência automática para investimento no dia que cai o salário.',
  investidor: 'Revise sua alocação trimestralmente e compare o retorno real com benchmarks (CDI, IBOV).',
};

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
  const areas = (state.userCfg.areas || []).filter(a => a !== 'negocio');
  if (!areas.includes('financas')) { el.innerHTML = ''; return; }

  const meta = state.userCfg.finMeta || 0;
  const perfil = state.userCfg.finPerfil || 'iniciante';
  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const finLog = [...(state.userCfg.finLog || [])].sort((a, b) => b.mes.localeCompare(a.mes));
  const mesData = finLog.find(x => x.mes === mesAtual) || { guardado: 0, investido: 0 };
  const total = (mesData.guardado || 0) + (mesData.investido || 0);
  const pct = meta > 0 ? Math.min(100, Math.round(total / meta * 100)) : 0;
  const mesNome = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const perfilLabels = { iniciante: 'Iniciante', transicao: 'Em transição', investidor: 'Investidor' };

  const history = finLog.filter(m => m.mes !== mesAtual).slice(0, 3).map(m => {
    const [y, mo] = m.mes.split('-');
    const nome = new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    const tot = (m.guardado || 0) + (m.investido || 0);
    const mpct = meta > 0 ? Math.min(100, Math.round(tot / meta * 100)) : 0;
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

export function renderOKRs() {
  const aq = getActiveQ(state.userCfg.startDate);
  const areas = (state.userCfg.areas || ['corpo', 'mente']).filter(a => a !== 'negocio');
  const progress = state.userCfg.okrProgress || {};
  const custom = state.userCfg.okrCustom || {};

  document.getElementById('q-badge').innerHTML =
    `<div class="q-badge-active" style="background:${bgColors[aq]};color:${txtColors[aq]}">Q${aq} — ${qLabels[aq]} · trimestre ativo</div>`;

  if (state.userCfg.meta) document.getElementById('user-mission').textContent = '"' + state.userCfg.meta + '"';

  document.getElementById('pillar-list').innerHTML = areas.map(area => {
    const defMap = getDefaultMap(area);
    if (!defMap.length) return '';
    const qData = getQData(area, aq);
    if (!qData) return '';
    const totalCnt = qData.krs.length;
    const doneCnt = qData.krs.filter((_, i) => progress[`${area}_q${aq}_${i}`]).length;
    const pct = totalCnt > 0 ? Math.round(doneCnt / totalCnt * 100) : 0;

    const krItems = qData.krs.map((kr, i) => {
      const done = !!progress[`${area}_q${aq}_${i}`];
      return `<div class="okr-kr-item ${done ? 'done' : ''}" id="okr-kr-el-${area}-${aq}-${i}" onclick="toggleKR('${area}',${aq},${i})">
        <div class="okr-kr-check">${done ? '✓' : ''}</div>
        <div class="okr-kr-text">${esc(kr)}</div>
      </div>`;
    }).join('');

    const editInputs = qData.krs.map((kr, i) =>
      `<input class="ob-input" id="okr-kr-${area}-${aq}-${i}" value="${esc(kr)}" placeholder="Key result ${i + 1}" style="margin-bottom:6px">`
    ).join('');

    const otherQs = defMap
      .filter(x => x.q !== aq)
      .map(x => {
        const isPast = x.q < aq;
        const lbl = custom[`${area}_q${x.q}`]?.label || x.label;
        const doneOther = (custom[`${area}_q${x.q}`]?.krs || x.krs).filter((_, i) => progress[`${area}_q${x.q}_${i}`]).length;
        const totOther = (custom[`${area}_q${x.q}`]?.krs || x.krs).length;
        return `<div class="okr-tl-item ${isPast ? 'past' : 'future'}">
          <span class="qbadge ${qColors[x.q] || 'q3b'}">Q${x.q}</span>
          <span class="tl-lbl">${esc(lbl)}</span>
          ${isPast && doneOther > 0 ? `<span class="tl-done">${doneOther}/${totOther}</span>` : ''}
        </div>`;
      }).join('');

    return `<div class="pillar-card">
      <div class="pillar-header" onclick="togglePillar(this)">
        <div class="pillar-title">${areaIcons[area] || '⭐'} ${areaNames[area] || area}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="okr-mini-prog" id="okr-mini-${area}">${doneCnt}/${totalCnt}</span>
          <div class="pillar-chev" style="transform:rotate(90deg)">›</div>
        </div>
      </div>
      <div class="pillar-body open">
        <div class="okr-active-section">
          <div class="okr-active-hdr">
            <span class="qbadge ${qColors[aq]}">Q${aq}</span>
            <span class="okr-active-lbl">${esc(qData.label)}</span>
            <button class="okr-edit-btn" onclick="openOKREdit('${area}',${aq});event.stopPropagation()">✏️</button>
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
        </div>
        ${otherQs ? `<div class="okr-timeline">${otherQs}</div>` : ''}
      </div>
    </div>`;
  }).join('');

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
  chev.style.transform = body.classList.contains('open') ? 'rotate(90deg)' : '';
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
  saveCfgRemote();
  renderOKRs();
}

export async function toggleKR(area, q, krIdx) {
  const key = `${area}_q${q}_${krIdx}`;
  if (!state.userCfg.okrProgress) state.userCfg.okrProgress = {};
  state.userCfg.okrProgress[key] = !state.userCfg.okrProgress[key];
  const done = state.userCfg.okrProgress[key];

  const krEl = document.getElementById(`okr-kr-el-${area}-${q}-${krIdx}`);
  if (krEl) {
    krEl.classList.toggle('done', done);
    const check = krEl.querySelector('.okr-kr-check');
    if (check) check.textContent = done ? '✓' : '';
  }

  const progWrap = document.getElementById(`okr-prog-${area}-${q}`);
  if (progWrap) {
    const total = parseInt(progWrap.dataset.total || '0');
    const pr = state.userCfg.okrProgress;
    let doneCnt = 0;
    for (let i = 0; i < total; i++) { if (pr[`${area}_q${q}_${i}`]) doneCnt++; }
    const pct = total > 0 ? Math.round(doneCnt / total * 100) : 0;
    const fill = progWrap.querySelector('.okr-progress-fill');
    const lbl = progWrap.querySelector('.okr-progress-label');
    if (fill) fill.style.width = pct + '%';
    if (lbl) lbl.textContent = `${doneCnt}/${total} KRs`;
    const miniEl = document.getElementById(`okr-mini-${area}`);
    if (miniEl) miniEl.textContent = `${doneCnt}/${total}`;
  }

  saveCfgLocal();
  saveCfgRemote();

  const { renderDashboard } = await import('./dashboard.js');
  renderDashboard();
}

export async function saveFinMes() {
  const guardado = parseFloat(document.getElementById('fin-guardado')?.value || '0') || 0;
  const investido = parseFloat(document.getElementById('fin-investido')?.value || '0') || 0;
  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (!state.userCfg.finLog) state.userCfg.finLog = [];
  const idx = state.userCfg.finLog.findIndex(x => x.mes === mesAtual);
  const entry = { mes: mesAtual, guardado, investido };
  if (idx >= 0) state.userCfg.finLog[idx] = entry;
  else state.userCfg.finLog.unshift(entry);
  state.userCfg.finLog = state.userCfg.finLog.slice(0, 24); // keep 2 years
  saveCfgLocal();
  saveCfgRemote();
  renderFinTracker();
  const { renderDashboard } = await import('./dashboard.js');
  renderDashboard();
}

export function getActiveObjective() {
  if (!state.userCfg.startDate) return null;
  const aq = getActiveQ(state.userCfg.startDate);
  const areas = (state.userCfg.areas || []).filter(a => a !== 'negocio');
  const primaryArea = areas[0];
  if (!primaryArea) return null;
  const defMap = getDefaultMap(primaryArea);
  if (!defMap.length) return null;
  const qData = getQData(primaryArea, aq);
  if (!qData) return null;
  const progress = state.userCfg.okrProgress || {};
  const krsProgress = qData.krs.map((_, i) => !!progress[`${primaryArea}_q${aq}_${i}`]);
  const doneCnt = krsProgress.filter(Boolean).length;
  return {
    aq, area: primaryArea,
    areaName: areaNames[primaryArea] || primaryArea,
    label: qData.label,
    krs: qData.krs,
    krsProgress,
    doneCnt,
    totalCnt: qData.krs.length,
  };
}
