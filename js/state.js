import { dayFulfilled } from './utils.js';

export const SUPABASE_URL = 'https://dwazoldkxgscdkpzaqsj.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_O0qMyJ3XNCFisGORFrRdPQ_8e6Bp3VL';

export const ENERGY = ['', 'Baixa', 'Ok', 'Alta'];
export const ECLASS = ['', 'on-low', 'on-ok', 'on-high'];
export const DLABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const REFLECTIONS = [
  'Qual foi sua maior conquista hoje?',
  'O que você aprendeu hoje que pode usar amanhã?',
  'Qual foi sua maior distração hoje?',
  'O que faria diferente se repetisse o dia?',
  'Como seu corpo e mente estão se sentindo?',
  'O que você está evitando que precisa enfrentar?',
  'Qual pequena vitória merece ser celebrada?',
];
export const IDIOMA_MAP = {
  ingles:   { name: 'Inglês',    icon: '🇬🇧' },
  espanhol: { name: 'Espanhol',  icon: '🇪🇸' },
  alemao:   { name: 'Alemão',    icon: '🇩🇪' },
  japones:  { name: 'Japonês',   icon: '🇯🇵' },
  frances:  { name: 'Francês',   icon: '🇫🇷' },
  italiano: { name: 'Italiano',  icon: '🇮🇹' },
  mandarin: { name: 'Mandarim',  icon: '🇨🇳' },
  coreano:  { name: 'Coreano',   icon: '🇰🇷' },
  russo:    { name: 'Russo',     icon: '🇷🇺' },
  arabe:    { name: 'Árabe',     icon: '🇸🇦' },
  libras:   { name: 'Libras',    icon: '🤟' },
};
export const META_LABELS = {
  corpo: 'Ter um corpo saudável e com energia',
  idioma: 'Falar um novo idioma com confiança',
  rotina: 'Ter uma rotina organizada e consistente',
  conhecimento: 'Aprender habilidades que me diferenciam',
  equilibrio: 'Ter mais equilíbrio e qualidade de vida',
};
export const SITUATION_START_HINTS = {
  sobrecarregado: { msg: 'Um hábito de cada vez.', sub: 'Você chegou aqui sobrecarregado — comece pequeno. Um check-in hoje já é suficiente.' },
  desorganizado: { msg: 'Vamos dar o primeiro passo.', sub: 'Você disse que não sabia por onde começar — o plano já está pronto, só falta registrar o dia de hoje.' },
  estagnado: { msg: 'Hora de sair do lugar.', sub: 'Você sentia que não estava evoluindo — o primeiro check-in de hoje já quebra essa inércia.' },
  'recomeçando': { msg: 'Bem-vindo de volta.', sub: 'Toda pausa pode virar recomeço. Hoje é o dia 1 da nova sequência.' },
  acelerando: { msg: 'Hora de acelerar de verdade.', sub: 'Você já tem ritmo — use o check-in de hoje pra manter o pé no acelerador.' },
};
export const ACHIEVEMENTS = [
  { id: 'primeiro', icon: '🌱', name: 'Primeiro passo',   desc: 'Primeiro check-in',          check: (l, s) => l.length >= 1 },
  { id: 'semana1',  icon: '🔥', name: '7 dias',           desc: '7 dias consecutivos',         check: (l, s) => s >= 7 },
  { id: 'mes1',     icon: '⚡', name: '30 dias',          desc: '30 dias consecutivos',        check: (l, s) => s >= 30 },
  { id: 'mes3',     icon: '💎', name: '90 dias',          desc: '90 dias consecutivos',        check: (l, s) => s >= 90 },
  { id: 'treino10', icon: '🏋️', name: '10 treinos',       desc: '10 treinos feitos',           check: (l, s) => l.filter(e => e.habits && e.habits.treino).length >= 10 },
  { id: 'check30',  icon: '📅', name: '30 registros',     desc: '30 check-ins totais',         check: (l, s) => l.length >= 30 },
  { id: 'check100', icon: '🏆', name: '100 registros',    desc: '100 check-ins totais',        check: (l, s) => l.length >= 100 },
  { id: 'perfeito', icon: '✨', name: 'Semana perfeita',  desc: 'Todos os hábitos esperados numa semana', check: (l) => {
    const sorted = [...l].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i <= sorted.length - 7; i++) {
      if (sorted.slice(i, i + 7).every(e => dayFulfilled(e, e.date))) return true;
    }
    return false;
  }},
  { id: 'idioma30', icon: '🗣️', name: '30 dias de idioma', desc: '30 dias estudando idioma', check: (l, s) => {
    return l.filter(e => e.habits && Object.keys(e.habits).some(k => IDIOMA_MAP[k] && e.habits[k])).length >= 30;
  }},
  { id: 'pomodoro10', icon: '🍅', name: '10 sessões de foco', desc: '10 pomodoros concluídos', check: () => {
    return (state.userCfg.pomodoroLog || []).length >= 10;
  }},
  // state.bibConcluidosCount e um cache local (nao persistido) populado por conquistas.js -
  // Biblioteca nao carrega no login, entao esse numero comeca em 0 e chega via busca assincrona.
  { id: 'leitor3', icon: '📚', name: '3 itens concluídos', desc: '3 itens concluídos na Biblioteca', check: () => (state.bibConcluidosCount || 0) >= 3 },
  { id: 'fin_registro10', icon: '💰', name: '10 registros de gastos', desc: '10 dias com gastos registrados', check: (l) => {
    return l.filter(e => e.idiomDetails && e.idiomDetails.financas && e.idiomDetails.financas.valor !== undefined && e.idiomDetails.financas.valor !== '').length >= 10;
  }},
  { id: 'fin_meta3', icon: '🏅', name: '3 meses de meta', desc: 'Meta de economia batida 3 meses seguidos', check: () => {
    const meta = state.userCfg.finMeta || 0;
    if (meta <= 0) return false;
    const monthsDiff = (a, b) => { const [ay, am] = a.split('-').map(Number); const [by, bm] = b.split('-').map(Number); return (by - ay) * 12 + (bm - am); };
    const sorted = [...(state.userCfg.finLog || [])].sort((a, b) => a.mes.localeCompare(b.mes));
    let run = 0, prevMes = null;
    for (const entry of sorted) {
      const hit = (entry.guardado || 0) + (entry.investido || 0) >= meta;
      run = hit ? (prevMes && monthsDiff(prevMes, entry.mes) === 1 ? run + 1 : 1) : 0;
      prevMes = entry.mes;
      if (run >= 3) return true;
    }
    return false;
  }},
  // Tempo e Relações ficavam sem nenhuma conquista dedicada apesar de serem pilares completos
  // de OKR - mesmo padrão de treino10, só trocando o hábito verificado.
  { id: 'tempo10', icon: '⏱', name: '10 blocos de foco', desc: '10 blocos de foco cumpridos', check: (l, s) => l.filter(e => e.habits && e.habits.tempo).length >= 10 },
  { id: 'relacoes10', icon: '❤️', name: '10 conexões', desc: '10 conexões intencionais registradas', check: (l, s) => l.filter(e => e.habits && e.habits.relacoes).length >= 10 },
];

export const state = {
  currentUser: null,
  userCfg: {},
  userHabits: [],
  log: [],
  period: 'semana',
  logLoaded: false,
  authMode: 'login',
  ts: { habits: {}, energy: 0, nota: '', idiomDetails: {}, _detailTouched: {} },
  obData: {
    areas: [], exercicios: [], idiomas: [], idiomasAtivos: [], aprender: [],
    horario: '', tempoLivre: '', corpoNivel: '', treinoDias: [2, 4, 6],
    idiomaDias: [0, 1, 2, 3, 4, 5, 6], estudoDias: [1, 3, 5],
    situation: '', meta: '', metas: [], sonoMeta: 7, estudoMeta: 30,
  },
  pomodoro: { timer: null, seconds: 25 * 60, isRunning: false, isBreak: false, sessions: 0, subject: '' },
  reviewData: { semana: { feel: '', adjust: [] }, mes: { feel: '', adjust: [] } },
};
