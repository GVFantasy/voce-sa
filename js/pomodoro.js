import { state } from './state.js';
import { lsKey, saveCfgAll } from './db.js';
import { todayKey, fmtDate, dateKey, sanitize } from './utils.js';

// Raio do arco SVG (deve coincidir com o r="68" no HTML)
const ARC_RADIUS = 68;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;
const SHORT_BREAK_SECONDS = 5 * 60;
const LONG_BREAK_SECONDS = 15 * 60;

function focusSeconds() {
  return (state.userCfg.pomoFocusMin || 25) * 60;
}

function storageKey() {
  return lsKey('pomo');
}

function persistPomodoro() {
  try {
    localStorage.setItem(storageKey(), JSON.stringify({
      endTime: state.pomodoro.endTime || null,
      isRunning: state.pomodoro.isRunning,
      isBreak: state.pomodoro.isBreak,
      isLongBreak: state.pomodoro.isLongBreak,
      sessions: state.pomodoro.sessions,
      subject: state.pomodoro.subject,
      seconds: state.pomodoro.seconds,
    }));
  } catch (e) {}
}

export function clearPomodoroStorage() {
  try { localStorage.removeItem(storageKey()); } catch (e) {}
}

function getFullDuration() {
  if (state.pomodoro.isBreak) return state.pomodoro.isLongBreak ? LONG_BREAK_SECONDS : SHORT_BREAK_SECONDS;
  return focusSeconds();
}

function updateArc() {
  const arc = document.getElementById('pomo-arc-progress');
  if (!arc) return;
  const full = getFullDuration();
  const remaining = state.pomodoro.seconds;
  const progress = full > 0 ? remaining / full : 0; // 1.0 = cheio, 0.0 = vazio
  const offset = ARC_CIRCUMFERENCE * (1 - progress);
  arc.style.strokeDasharray = ARC_CIRCUMFERENCE;
  arc.style.strokeDashoffset = offset;
  arc.classList.toggle('break', state.pomodoro.isBreak);
}

// Toca um bipe curto (Web Audio API, sem depender de arquivo externo — funciona offline)
// e vibra se o dispositivo suportar, para avisar o fim do ciclo mesmo com a aba em segundo plano.
// Complementa (nao substitui) com uma notificacao do sistema quando a permissao ja foi concedida
// antes (ex: pro lembrete de check-in) — nao pede permissao aqui, so aproveita se ja existir,
// pra nao interromper o fluxo do Pomodoro com um prompt novo.
function notifyPhaseEnd() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(); osc.stop(ctx.currentTime + 0.6);
      osc.onended = () => ctx.close().catch(() => {});
    }
  } catch (e) {}
  if (navigator.vibrate) { try { navigator.vibrate(200); } catch (e) {} }
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const wasBreak = state.pomodoro.isBreak;
      new Notification(wasBreak ? 'Pausa concluída ⏱' : 'Foco concluído 🍅', {
        body: wasBreak ? 'Hora de voltar ao foco.' : 'Hora da pausa.',
        icon: 'icons/icon-192.png',
        tag: 'pomodoro-phase',
      });
    }
  } catch (e) {}
}

async function logCompletedSession() {
  if (!state.userCfg) return;
  if (!state.userCfg.pomodoroLog) state.userCfg.pomodoroLog = [];
  state.userCfg.pomodoroLog.unshift({
    date: todayKey(), subject: state.pomodoro.subject || '',
    durationMin: Math.round(focusSeconds() / 60),
  });
  state.userCfg.pomodoroLog = state.userCfg.pomodoroLog.slice(0, 200);
  renderPomodoroLog();
  renderPomodoroStats();
  await saveCfgAll(false);
}

// Recalcula os segundos restantes a partir de um timestamp de término em vez de decrementar
// a cada tick — evita o drift causado pelo throttling do navegador quando a aba fica em background.
function tick() {
  // Não persiste a cada tick: endTime (o único dado que importa para retomar o ciclo) não muda
  // enquanto está rodando — já foi salvo uma vez em pomodoroToggle().
  const remaining = Math.round((state.pomodoro.endTime - Date.now()) / 1000);
  state.pomodoro.seconds = Math.max(0, remaining);
  renderPomodoroTime();
  if (remaining <= 0) completePhase();
}

function startTicking() {
  clearInterval(state.pomodoro.timer);
  state.pomodoro.timer = setInterval(tick, 1000);
}

function completePhase() {
  clearInterval(state.pomodoro.timer);
  state.pomodoro.isRunning = false;
  const circle = document.getElementById('pomo-circle');
  notifyPhaseEnd();
  if (!state.pomodoro.isBreak) {
    state.pomodoro.sessions++;
    logCompletedSession();
    const isLong = state.pomodoro.sessions % 4 === 0;
    state.pomodoro.isBreak = true;
    state.pomodoro.isLongBreak = isLong;
    state.pomodoro.seconds = isLong ? LONG_BREAK_SECONDS : SHORT_BREAK_SECONDS;
    const label = document.getElementById('pomo-label'); if (label) label.textContent = isLong ? 'Pausa longa' : 'Pausa';
    const complete = document.getElementById('pomo-complete'); if (complete) complete.style.display = 'block';
    renderPomodoroSessions();
  } else {
    state.pomodoro.isBreak = false;
    state.pomodoro.isLongBreak = false;
    state.pomodoro.seconds = focusSeconds();
    const label = document.getElementById('pomo-label'); if (label) label.textContent = 'Foco';
  }
  const startBtn = document.getElementById('pomo-start'); if (startBtn) startBtn.textContent = 'Iniciar';
  if (circle) circle.classList.remove('running', 'break');
  renderPomodoroTime();
  persistPomodoro();
}

export function pomodoroToggle() {
  if (state.pomodoro.isRunning) {
    clearInterval(state.pomodoro.timer);
    state.pomodoro.isRunning = false;
    document.getElementById('pomo-start').textContent = 'Continuar';
    // legado: mantém compatibilidade com pomo-circle (oculto via CSS)
    document.getElementById('pomo-circle').classList.remove('running', 'break');
    persistPomodoro();
  } else {
    state.pomodoro.isRunning = true;
    state.pomodoro.endTime = Date.now() + state.pomodoro.seconds * 1000;
    document.getElementById('pomo-start').textContent = 'Pausar';
    const circle = document.getElementById('pomo-circle');
    circle.classList.toggle('running', !state.pomodoro.isBreak);
    circle.classList.toggle('break', state.pomodoro.isBreak);
    startTicking();
    persistPomodoro();
  }
}

export function pomodoroReset() {
  clearInterval(state.pomodoro.timer);
  state.pomodoro.isRunning = false;
  state.pomodoro.isBreak = false;
  state.pomodoro.isLongBreak = false;
  state.pomodoro.seconds = focusSeconds();
  state.pomodoro.endTime = null;
  document.getElementById('pomo-start').textContent = 'Iniciar';
  document.getElementById('pomo-label').textContent = 'Foco';
  document.getElementById('pomo-circle').classList.remove('running', 'break');
  renderPomodoroTime();
  persistPomodoro();
}

export async function setFocusDuration(min) {
  // so ajusta o contador visivel se o ciclo atual ainda nao foi tocado (senao um foco pausado
  // no meio perderia o progresso so por trocar a preferencia de duracao pra sessao seguinte)
  const untouched = state.pomodoro.seconds === focusSeconds();
  state.userCfg.pomoFocusMin = min;
  document.querySelectorAll('#pomo-duration-chips .ob-chip').forEach(btn => {
    btn.classList.toggle('on', parseInt(btn.dataset.val) === min);
  });
  if (!state.pomodoro.isRunning && !state.pomodoro.isBreak && untouched) {
    state.pomodoro.seconds = focusSeconds();
    renderPomodoroTime();
    persistPomodoro();
  }
  await saveCfgAll(false);
}

export function renderPomodoroTime() {
  const m = Math.floor(state.pomodoro.seconds / 60);
  const s = state.pomodoro.seconds % 60;
  document.getElementById('pomo-time').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  updateArc();
}

export function renderPomodoroSessions() {
  const s = state.pomodoro.sessions;
  const inCycle = s > 0 && s % 4 === 0 ? 4 : s % 4;
  let html = '';
  for (let i = 0; i < 4; i++) {
    html += `<div class="pomo-dot ${i < inCycle ? 'done' : ''}"></div>`;
  }
  document.getElementById('pomo-sessions').innerHTML = html;
}

export function renderPomodoroDuration() {
  const wrap = document.getElementById('pomo-duration-chips');
  if (!wrap) return;
  const min = state.userCfg.pomoFocusMin || 25;
  wrap.querySelectorAll('.ob-chip').forEach(btn => {
    btn.classList.toggle('on', parseInt(btn.dataset.val) === min);
  });
}

// Vocabulario fixo antigo do assunto do pomodoro (antes de virar ligado aos habitos reais) -
// mantido so pra rotular corretamente sessoes ja registradas no historico com esses valores.
const LEGACY_SUBJ_NAMES = { idioma: 'Idioma', habilidade: 'Habilidade', tecnico: 'Técnico', faculdade: 'Faculdade', leitura: 'Leitura' };

function subjectLabel(subject) {
  if (!subject) return '';
  const habit = (state.userHabits || []).find(h => h.id === subject);
  return habit ? habit.name : (LEGACY_SUBJ_NAMES[subject] || subject);
}

export function renderPomodoroLog() {
  const el = document.getElementById('pomo-log-list');
  if (!el) return;
  const log = (state.userCfg.pomodoroLog || []).slice(0, 8);
  if (!log.length) { el.innerHTML = '<div style="font-size:12px;color:var(--cinza)">Nenhuma sessão concluída ainda.</div>'; return; }
  el.innerHTML = log.map(s => `<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--cinza);padding:4px 0;border-bottom:1px solid var(--borda)">
    <span>${fmtDate(s.date)}${subjectLabel(s.subject) ? ' · ' + sanitize(subjectLabel(s.subject)) : ''}</span><span>${s.durationMin}min</span>
  </div>`).join('');
}

// Estatisticas agregadas (7/30 dias) a partir do mesmo pomodoroLog que ja alimenta o historico
// de sessoes - nenhuma coleta nova.
function fmtDurationH(min) {
  const h = Math.floor(min / 60), m = min % 60;
  if (h > 0) return `${h}h${m > 0 ? m + 'min' : ''}`;
  return `${m}min`;
}

export function renderPomodoroStats() {
  const el = document.getElementById('pomo-stats');
  if (!el) return;
  const log = state.userCfg.pomodoroLog || [];
  const today = new Date();
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30);
  const sumSince = fromKey => log.filter(s => s.date >= fromKey).reduce((sum, s) => sum + (s.durationMin || 0), 0);
  const weekMin = sumSince(dateKey(weekAgo));
  const monthMin = sumSince(dateKey(monthAgo));
  el.innerHTML = `<div class="pomo-stats-row">
    <div class="pomo-stat-tile"><div class="pomo-stat-val">${fmtDurationH(weekMin)}</div><div class="pomo-stat-label">últimos 7 dias</div></div>
    <div class="pomo-stat-tile"><div class="pomo-stat-val">${fmtDurationH(monthMin)}</div><div class="pomo-stat-label">últimos 30 dias</div></div>
  </div>`;
}

// Restaura um ciclo em andamento após reload/fechamento do app. Sempre reseta para um estado
// limpo primeiro — evita herdar isRunning/endTime de outro usuário após um troca de conta.
export function restorePomodoro() {
  clearInterval(state.pomodoro.timer);
  state.pomodoro = { timer: null, seconds: focusSeconds(), isRunning: false, isBreak: false, isLongBreak: false, sessions: 0, subject: '' };
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(storageKey()) || 'null'); } catch (e) {}
  if (!saved) {
    // sem ciclo salvo: pre-seleciona o ultimo assunto usado, em vez de comecar em branco
    state.pomodoro.subject = state.userCfg.pomodoroLog?.[0]?.subject || '';
    renderPomodoroTime(); renderPomodoroSessions(); renderPomoSubjectChips();
    return;
  }
  state.pomodoro.isBreak = !!saved.isBreak;
  state.pomodoro.isLongBreak = !!saved.isLongBreak;
  state.pomodoro.sessions = saved.sessions || 0;
  state.pomodoro.subject = saved.subject || state.userCfg.pomodoroLog?.[0]?.subject || '';
  if (saved.isRunning && saved.endTime) {
    const remaining = Math.round((saved.endTime - Date.now()) / 1000);
    if (remaining > 0) {
      state.pomodoro.seconds = remaining;
      state.pomodoro.endTime = saved.endTime;
      state.pomodoro.isRunning = true;
      const circle = document.getElementById('pomo-circle');
      const startBtn = document.getElementById('pomo-start');
      const label = document.getElementById('pomo-label');
      if (startBtn) startBtn.textContent = 'Pausar';
      if (label) label.textContent = state.pomodoro.isBreak ? (state.pomodoro.isLongBreak ? 'Pausa longa' : 'Pausa') : 'Foco';
      if (circle) circle.classList.toggle('running', !state.pomodoro.isBreak);
      if (circle) circle.classList.toggle('break', state.pomodoro.isBreak);
      startTicking();
    } else {
      // ciclo terminou enquanto o app estava fechado
      state.pomodoro.endTime = saved.endTime;
      completePhase();
    }
  } else {
    state.pomodoro.seconds = typeof saved.seconds === 'number' ? saved.seconds : getFullDuration();
    state.pomodoro.isRunning = false;
  }
  renderPomodoroTime();
  renderPomodoroSessions();
  renderPomoSubjectChips();
}

// Assunto do pomodoro passa a ser um habito real do usuario (em vez de uma lista fixa
// idioma/habilidade/tecnico/faculdade/leitura) - a sessao fica ligada a algo que ja existe no
// check-in, sem inventar uma categoria paralela. Sessoes antigas continuam legiveis via
// LEGACY_SUBJ_NAMES em subjectLabel().
export function renderPomoSubjectChips() {
  const container = document.getElementById('pomo-subject');
  if (!container) return;
  const habits = state.userHabits || [];
  if (!habits.length) {
    container.innerHTML = '<div style="font-size:12px;color:var(--cinza)">Configure hábitos em Perfil para ligar suas sessões a eles.</div>';
    return;
  }
  container.innerHTML = habits.map(h =>
    `<button class="ob-chip ${state.pomodoro.subject === h.id ? 'on' : ''}" onclick="setPomoSubject('${h.id}')">${sanitize(h.icon)} ${sanitize(h.name)}</button>`
  ).join('');
}

export function setPomoSubject(habitId) {
  state.pomodoro.subject = state.pomodoro.subject === habitId ? '' : habitId; // toca de novo desmarca
  renderPomoSubjectChips();
  persistPomodoro();
}
