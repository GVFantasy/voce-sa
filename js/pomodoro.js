import { state } from './state.js';

// Raio do arco SVG (deve coincidir com o r="68" no HTML)
const ARC_RADIUS = 68;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;

function getFullDuration() {
  return state.pomodoro.isBreak ? 5 * 60 : 25 * 60;
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
  // cor: roxo em foco, âmbar em pausa
  if (state.pomodoro.isBreak) {
    arc.classList.add('break');
  } else {
    arc.classList.remove('break');
  }
}

export function pomodoroToggle() {
  if (state.pomodoro.isRunning) {
    clearInterval(state.pomodoro.timer);
    state.pomodoro.isRunning = false;
    document.getElementById('pomo-start').textContent = 'Continuar';
    // legado: mantém compatibilidade com pomo-circle (oculto via CSS)
    document.getElementById('pomo-circle').classList.remove('running', 'break');
  } else {
    state.pomodoro.isRunning = true;
    document.getElementById('pomo-start').textContent = 'Pausar';
    const circle = document.getElementById('pomo-circle');
    circle.classList.toggle('running', !state.pomodoro.isBreak);
    circle.classList.toggle('break', state.pomodoro.isBreak);
    state.pomodoro.timer = setInterval(() => {
      state.pomodoro.seconds--;
      if (state.pomodoro.seconds <= 0) {
        clearInterval(state.pomodoro.timer);
        state.pomodoro.isRunning = false;
        if (!state.pomodoro.isBreak) {
          state.pomodoro.sessions++;
          state.pomodoro.isBreak = true;
          state.pomodoro.seconds = 5 * 60;
          document.getElementById('pomo-label').textContent = 'Pausa';
          document.getElementById('pomo-complete').style.display = 'block';
          renderPomodoroSessions();
        } else {
          state.pomodoro.isBreak = false;
          state.pomodoro.seconds = 25 * 60;
          document.getElementById('pomo-label').textContent = 'Foco';
        }
        document.getElementById('pomo-start').textContent = 'Iniciar';
        circle.classList.remove('running', 'break');
      }
      renderPomodoroTime();
    }, 1000);
  }
}

export function pomodoroReset() {
  clearInterval(state.pomodoro.timer);
  state.pomodoro.isRunning = false;
  state.pomodoro.isBreak = false;
  state.pomodoro.seconds = 25 * 60;
  document.getElementById('pomo-start').textContent = 'Iniciar';
  document.getElementById('pomo-label').textContent = 'Foco';
  document.getElementById('pomo-circle').classList.remove('running', 'break');
  renderPomodoroTime();
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
