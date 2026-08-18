import { state, META_LABELS } from './state.js';
import { getActiveQ, getPeriodDates, habitPctInQuarter, weeklyFreqInQuarter, habitStreakInQuarter, overallStreakInQuarter, overallPctInQuarter, finLogConsistencyInQuarter, finLogGrowthInQuarter } from './utils.js';
import { saveCfgLocal, saveCfgRemote } from './db.js';

const areaIcons = { corpo: '🏃', mente: '🧠', financas: '💰', tempo: '⏱', relacoes: '❤️' };
const areaNames = { corpo: 'Corpo', mente: 'Mente', financas: 'Finanças', tempo: 'Tempo', relacoes: 'Relações' };
const qColors = ['', 'q1b', 'q2b', 'q3b', 'q4b'];
const qLabels = ['', 'Fundação', 'Aceleração', 'Escala', 'Colheita'];
const bgColors = [, 'var(--info-bg)', 'var(--suc-bg)', 'var(--warn-bg)', 'var(--dan-bg)'];
const txtColors = [, 'var(--info-txt)', 'var(--suc-txt)', 'var(--warn-txt)', 'var(--dan-txt)'];

// KRs sao objetos { id, text, auto? }. Quando "auto" existe, o progresso e calculado a partir
// do check-in/dados ja coletados (ver evalAutoKR) em vez de checkbox manual. So ficam sem "auto"
// os KRs que genuinamente nao tem proxy honesto nos dados do app (ex: "concluir um livro" - a
// Biblioteca so registra "adicionado", nao "lido"). Custom KRs editados pelo usuario (okrCustom)
// continuam strings simples e sao sempre manuais - ver normalizeKR().
const defaultOKR = {
  corpo: [
    { q: 1, label: 'Instalar movimento', krs: [
      { id: 'treino_pct', text: 'Treinar nos dias escolhidos (≥80% do trimestre)', auto: { type: 'habitPct', habit: 'treino', min: 0.8 } },
      { id: 'sono_pct', text: 'Dormir bem em pelo menos 5 dias por semana', auto: { type: 'habitPct', habit: 'sono', min: 0.7 } },
    ] },
    { q: 2, label: 'Elevar frequência', krs: [
      { id: 'treino_freq4', text: 'Treinar 4+ vezes por semana em média', auto: { type: 'weeklyFreq', habit: 'treino', min: 4 } },
      { id: 'sono_pct85', text: 'Dormir bem em pelo menos 6 dias por semana', auto: { type: 'habitPct', habit: 'sono', min: 0.857 } },
    ] },
    { q: 3, label: 'Alta performance', krs: [
      { id: 'treino_freq4', text: 'Manter 4+ treinos por semana', auto: { type: 'weeklyFreq', habit: 'treino', min: 4 } },
      { id: 'streak21', text: 'Sequência de 21+ dias cumprindo os hábitos do trimestre', auto: { type: 'overallStreak', min: 21 } },
    ] },
    { q: 4, label: 'Alta performance — manter', krs: [
      { id: 'treino_freq4', text: 'Manter 4+ treinos por semana', auto: { type: 'weeklyFreq', habit: 'treino', min: 4 } },
      { id: 'overall_pct80', text: 'Fechar o trimestre com 80%+ de consistência geral', auto: { type: 'overallPct', min: 0.8 } },
    ] },
  ],
  mente: [
    { q: 1, label: 'Hábito diário de aprendizado', krs: [
      { id: 'estudo_pct', text: 'Estudar nos dias escolhidos (≥80% do trimestre)', auto: { type: 'habitPct', habit: 'estudo', min: 0.8 } },
      { id: 'estudo_streak14', text: 'Sequência de 14+ dias estudando', auto: { type: 'habitStreak', habit: 'estudo', min: 14 } },
      { id: null, text: 'Concluir 1 livro ou curso no trimestre' },
    ] },
    { q: 2, label: 'Conversação básica', krs: [
      { id: 'estudo_pct85', text: 'Estudar nos dias escolhidos (≥85% do trimestre)', auto: { type: 'habitPct', habit: 'estudo', min: 0.85 } },
      { id: 'estudo_streak21', text: 'Sequência de 21+ dias estudando', auto: { type: 'habitStreak', habit: 'estudo', min: 21 } },
    ] },
    { q: 3, label: 'Fluência progressiva', krs: [
      { id: 'estudo_pct90', text: 'Estudar nos dias escolhidos (≥90% do trimestre)', auto: { type: 'habitPct', habit: 'estudo', min: 0.9 } },
      { id: 'estudo_streak30', text: 'Sequência de 30+ dias estudando', auto: { type: 'habitStreak', habit: 'estudo', min: 30 } },
    ] },
    { q: 4, label: 'Fluência consolidada', krs: [
      { id: 'estudo_pct90', text: 'Manter o estudo nos dias escolhidos (≥90% do trimestre)', auto: { type: 'habitPct', habit: 'estudo', min: 0.9 } },
      { id: 'overall_pct80', text: 'Fechar o trimestre com 80%+ de consistência geral', auto: { type: 'overallPct', min: 0.8 } },
    ] },
  ],
  tempo: [
    { q: 1, label: 'Estruturar semana', krs: [
      { id: 'tempo_pct', text: 'Cumprir o bloco de foco nos dias esperados (≥80% do trimestre)', auto: { type: 'habitPct', habit: 'tempo', min: 0.8 } },
      { id: 'tempo_streak14', text: 'Sequência de 14+ dias cumprindo o bloco de foco', auto: { type: 'habitStreak', habit: 'tempo', min: 14 } },
    ] },
    { q: 2, label: 'Proteção do tempo', krs: [
      { id: 'tempo_pct85', text: 'Cumprir o bloco de foco nos dias esperados (≥85% do trimestre)', auto: { type: 'habitPct', habit: 'tempo', min: 0.85 } },
      { id: 'tempo_streak21', text: 'Sequência de 21+ dias cumprindo o bloco de foco', auto: { type: 'habitStreak', habit: 'tempo', min: 21 } },
    ] },
    { q: 3, label: 'Eficiência avançada', krs: [
      { id: 'tempo_pct90', text: 'Cumprir o bloco de foco nos dias esperados (≥90% do trimestre)', auto: { type: 'habitPct', habit: 'tempo', min: 0.9 } },
      { id: 'streak21', text: 'Sequência de 21+ dias cumprindo os hábitos do trimestre', auto: { type: 'overallStreak', min: 21 } },
    ] },
    { q: 4, label: 'Legado do tempo', krs: [
      { id: 'tempo_pct90', text: 'Manter o bloco de foco nos dias esperados (≥90% do trimestre)', auto: { type: 'habitPct', habit: 'tempo', min: 0.9 } },
      { id: 'overall_pct80', text: 'Fechar o trimestre com 80%+ de consistência geral', auto: { type: 'overallPct', min: 0.8 } },
    ] },
  ],
  relacoes: [
    { q: 1, label: 'Presença e qualidade', krs: [
      { id: 'relacoes_freq1', text: 'Conexão intencional pelo menos 1x por semana', auto: { type: 'weeklyFreq', habit: 'relacoes', min: 1 } },
      { id: 'relacoes_pct', text: 'Manter o hábito nos dias esperados (≥80% do trimestre)', auto: { type: 'habitPct', habit: 'relacoes', min: 0.8 } },
    ] },
    { q: 2, label: 'Aprofundamento', krs: [
      { id: 'relacoes_freq2', text: 'Conexão intencional pelo menos 2x por semana', auto: { type: 'weeklyFreq', habit: 'relacoes', min: 2 } },
    ] },
    { q: 3, label: 'Comunidade', krs: [
      { id: 'relacoes_freq3', text: 'Conexão intencional pelo menos 3x por semana', auto: { type: 'weeklyFreq', habit: 'relacoes', min: 3 } },
    ] },
    { q: 4, label: 'Celebrar e renovar', krs: [
      { id: 'relacoes_freq3b', text: 'Manter conexão intencional 3x+ por semana', auto: { type: 'weeklyFreq', habit: 'relacoes', min: 3 } },
      { id: 'overall_pct80', text: 'Fechar o trimestre com 80%+ de consistência geral', auto: { type: 'overallPct', min: 0.8 } },
    ] },
  ],
};

const finOKR = {
  iniciante: [
    { q: 1, label: 'Instalar controle financeiro', krs: [
      { id: 'fin_pct', text: 'Registrar os gastos do dia (≥70% do trimestre)', auto: { type: 'habitPct', habit: 'financas', min: 0.7 } },
      { id: null, text: 'Abrir conta de investimento gratuita' },
    ] },
    { q: 2, label: 'Hábito de poupar', krs: [
      { id: 'fin_pct85', text: 'Registrar os gastos do dia (≥85% do trimestre)', auto: { type: 'habitPct', habit: 'financas', min: 0.85 } },
      { id: 'fin_consist', text: 'Guardar ou investir algo em todos os meses do trimestre', auto: { type: 'finLogConsistency' } },
    ] },
    { q: 3, label: 'Primeiros investimentos', krs: [
      { id: 'fin_consist', text: 'Guardar ou investir algo em todos os meses do trimestre', auto: { type: 'finLogConsistency' } },
      { id: 'fin_growth', text: 'Aumentar o valor guardado/investido no trimestre', auto: { type: 'finLogGrowth' } },
    ] },
    { q: 4, label: 'Avaliar e crescer', krs: [
      { id: 'fin_consist', text: 'Manter guardado/investido em todos os meses', auto: { type: 'finLogConsistency' } },
      { id: 'fin_growth', text: 'Fechar o trimestre com aumento no valor guardado/investido', auto: { type: 'finLogGrowth' } },
    ] },
  ],
  transicao: [
    { q: 1, label: 'Organizar e automatizar', krs: [
      { id: 'fin_pct', text: 'Registrar os gastos do dia (≥70% do trimestre)', auto: { type: 'habitPct', habit: 'financas', min: 0.7 } },
      { id: 'fin_consist', text: 'Aportar algo em todos os meses do trimestre', auto: { type: 'finLogConsistency' } },
    ] },
    { q: 2, label: 'Diversificar carteira', krs: [
      { id: 'fin_consist', text: 'Aportar algo em todos os meses do trimestre', auto: { type: 'finLogConsistency' } },
      { id: null, text: 'Estudar tributação de cada tipo de investimento' },
    ] },
    { q: 3, label: 'Crescer patrimônio', krs: [
      { id: 'fin_growth', text: 'Aumentar o valor investido no trimestre', auto: { type: 'finLogGrowth' } },
      { id: 'fin_consist', text: 'Aportar algo em todos os meses do trimestre', auto: { type: 'finLogConsistency' } },
    ] },
    { q: 4, label: 'Otimizar e planejar', krs: [
      { id: 'fin_growth', text: 'Fechar o trimestre com aumento no valor investido', auto: { type: 'finLogGrowth' } },
      { id: 'fin_consist', text: 'Manter aportes em todos os meses', auto: { type: 'finLogConsistency' } },
    ] },
  ],
  investidor: [
    { q: 1, label: 'Revisar estratégia', krs: [
      { id: 'fin_consist', text: 'Aportar algo em todos os meses do trimestre', auto: { type: 'finLogConsistency' } },
      { id: null, text: 'Revisar tese de cada posição ativa' },
    ] },
    { q: 2, label: 'Escalar aportes', krs: [
      { id: 'fin_growth', text: 'Aumentar o aporte vs. o início do trimestre', auto: { type: 'finLogGrowth' } },
      { id: 'fin_consist', text: 'Aportar algo em todos os meses do trimestre', auto: { type: 'finLogConsistency' } },
    ] },
    { q: 3, label: 'Renda passiva', krs: [
      { id: 'fin_growth', text: 'Aumentar o aporte vs. o início do trimestre', auto: { type: 'finLogGrowth' } },
      { id: 'fin_consist', text: 'Aportar algo em todos os meses do trimestre', auto: { type: 'finLogConsistency' } },
    ] },
    { q: 4, label: 'Planejar próximo nível', krs: [
      { id: 'fin_growth', text: 'Fechar o trimestre com aumento no aporte', auto: { type: 'finLogGrowth' } },
      { id: 'fin_consist', text: 'Manter aportes em todos os meses', auto: { type: 'finLogConsistency' } },
    ] },
  ],
};

const finDicas = {
  iniciante: 'Comece guardando qualquer valor. O hábito de poupar importa mais que o montante inicial.',
  transicao: 'Automatize: configure transferência automática para investimento no dia que cai o salário.',
  investidor: 'Revise sua alocação trimestralmente e compare o retorno real com benchmarks (CDI, IBOV).',
};

// Avalia uma regra "auto" e devolve { done, pct } (pct 0-100, so pra exibir progresso). As
// métricas em si (habitPctInQuarter etc.) vivem em utils.js — reaproveitadas também pelas
// Ações do trimestre em checkin.js.
function evalAutoKR(auto, log) {
  switch (auto.type) {
    case 'habitPct': {
      const pct = habitPctInQuarter(log, auto.habit);
      return { done: pct >= auto.min, pct: Math.round(pct * 100) };
    }
    case 'weeklyFreq': {
      const freq = weeklyFreqInQuarter(log, auto.habit);
      return { done: freq >= auto.min, pct: Math.round(Math.min(1, freq / auto.min) * 100) };
    }
    case 'habitStreak': {
      const streak = habitStreakInQuarter(log, auto.habit);
      return { done: streak >= auto.min, pct: Math.round(Math.min(1, streak / auto.min) * 100) };
    }
    case 'overallStreak': {
      const streak = overallStreakInQuarter(log);
      return { done: streak >= auto.min, pct: Math.round(Math.min(1, streak / auto.min) * 100) };
    }
    case 'overallPct': {
      const pct = overallPctInQuarter(log);
      return { done: pct >= auto.min, pct: Math.round(pct * 100) };
    }
    case 'finLogConsistency': {
      const { done, total } = finLogConsistencyInQuarter();
      return { done: total > 0 && done >= total, pct: total > 0 ? Math.round(done / total * 100) : 0 };
    }
    case 'finLogGrowth': {
      const g = finLogGrowthInQuarter();
      return { done: g, pct: g ? 100 : 0 };
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
      const { done, pct } = evalAutoKR(kr.auto, log);
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
  const areas = (state.userCfg.areas || []).filter(a => a !== 'negocio');
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

// 6 itens do checklist tem proxy honesto direto no que o check-in ja grava (mesmo principio do
// motor de KRs automaticos acima) - fecham sozinhos, sem clique manual. O resto continua
// exatamente como hoje (checkbox manual via tasksDone).
const TASK_AUTO = {
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
      const interactiveAttrs = auto ? '' : ` role="checkbox" aria-checked="${isDone}" tabindex="0" onclick="toggleQTask('${t.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleQTask('${t.id}')}"`;
      return `<div class="qtask ${isDone ? 'done' : ''}${auto ? ' auto' : ''}" id="qtask-${t.id}" aria-label="${esc(t.text)}"${interactiveAttrs}>
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
  const areas = (state.userCfg.areas || ['corpo', 'mente']).filter(a => a !== 'negocio');
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
        return `<div class="okr-kr-item auto ${kr.done ? 'done' : ''}">
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
      <div class="pillar-header" onclick="togglePillar(this)">
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
            <button class="okr-edit-btn" aria-label="Editar objetivo e KRs" onclick="openOKREdit('${area}',${aq});event.stopPropagation()">✏️</button>
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
  const areas = (state.userCfg.areas || []).filter(a => a !== 'negocio');
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
