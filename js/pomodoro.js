import { state } from './state.js';
import { lsKey } from './db.js';

// Raio do arco SVG (deve coincidir com o r="68" no HTML)
const ARC_RADIUS = 68;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;
const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

function storageKey() {
  return lsKey('pomo');
}

function persistPomodoro() {
  try {
    localStorage.setItem(storageKey(), JSON.stringify({
      endTime: state.pomodoro.endTime || null,
      isRunning: state.pomodoro.isRunning,
      isBreak: state.pomodoro.isBreak,
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
  return state.pomodoro.isBreak ? BREAK_SECONDS : FOCUS_SECONDS;
}

function updateArc() {
  const arc = document.getElementById('pomo-arc-progress');
  if (!arc) return;
  const full = getFullDuration();
  const remaining = state.pomodoro.seconds;
  const progress = remaining / full; // 1.0 = cheio, 0.0 = vazio
  const offset = ARC_CIRCUMFERENCE * (1 - progress);
  arc.style.strokeDasharray = ARC_CIRCUMFERENCE;
  arc.style.strokeDashoffset = offset;
  arc.classList.toggle('break', state.pomodoro.isBreak);
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
  if (!state.pomodoro.isBreak) {
    state.pomodoro.sessions++;
    state.pomodoro.isBreak = true;
    state.pomodoro.seconds = BREAK_SECONDS;
    const label = document.getElementById('pomo-label'); if (label) label.textContent = 'Pausa';
    const complete = document.getElementById('pomo-complete'); if (complete) complete.style.display = 'block';
    renderPomodoroSessions();
  } else {
    state.pomodoro.isBreak = false;
    state.pomodoro.seconds = FOCUS_SECONDS;
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
  state.pomodoro.seconds = FOCUS_SECONDS;
  state.pomodoro.endTime = null;
  document.getElementById('pomo-start').textContent = 'Iniciar';
  document.getElementById('pomo-label').textContent = 'Foco';
  document.getElementById('pomo-circle').classList.remove('running', 'break');
  renderPomodoroTime();
  persistPomodoro();
}

export function renderPomodoroTime() {
  const m = Math.floor(state.pomodoro.seconds / 60);
  const s = state.pomodoro.seconds % 60;
  document.getElementById('pomo-time').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  updateArc();
}

export function renderPomodoroSessions() {
  let html = '';
  for (let i = 0; i < 4; i++) {
    html += `<div class="pomo-dot ${i < state.pomodoro.sessions ? 'done' : ''}"></div>`;
  }
  document.getElementById('pomo-sessions').innerHTML = html;
}

// Restaura um ciclo em andamento após reload/fechamento do app. Sempre reseta para um estado
// limpo primeiro — evita herdar isRunning/endTime de outro usuário após um troca de conta.
export function restorePomodoro() {
  clearInterval(state.pomodoro.timer);
  state.pomodoro = { timer: null, seconds: FOCUS_SECONDS, isRunning: false, isBreak: false, sessions: 0, subject: '' };
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(storageKey()) || 'null'); } catch (e) {}
  if (!saved) { renderPomodoroTime(); renderPomodoroSessions(); return; }
  state.pomodoro.isBreak = !!saved.isBreak;
  state.pomodoro.sessions = saved.sessions || 0;
  state.pomodoro.subject = saved.subject || '';
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
      if (label) label.textContent = state.pomodoro.isBreak ? 'Pausa' : 'Foco';
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
}
