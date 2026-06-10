import { state } from './state.js';
import { sb, setSyncStatus } from './db.js';
import { showToast } from './utils.js';
import { applyDarkIfSaved, initReminder, renderPerfil } from './profile.js';
import { renderCheckin } from './checkin.js';
import { renderDashboard } from './dashboard.js';
import { renderHistorico } from './historico.js';
import { renderConquistas } from './conquistas.js';
import { renderOKRs } from './okrs.js';
import { renderBiblioteca } from './biblioteca.js';
import { renderPomodoroTime, renderPomodoroSessions } from './pomodoro.js';

export function startApp() {
  document.getElementById('app').style.display = 'block';
  document.getElementById('user-info').textContent = state.currentUser?.email?.split('@')[0] || '';
  applyDarkIfSaved(); initReminder(); loadLog();
}

export async function loadLog() {
  if (!state.currentUser) return;
  setSyncStatus('syncing', 'Sincronizando...');
  const { data, error } = await sb.from('checkins')
    .select('*')
    .eq('user_id', state.currentUser.id)
    .order('date', { ascending: false })
    .limit(365);
  if (error) {
    setSyncStatus('err', 'Sem conexão');
    showToast('Não foi possível sincronizar dados. Trabalhando offline.', 'info');
    renderCheckin(); renderDashboard(); renderHistorico(); renderOKRs(); renderPerfil(); renderConquistas();
    return;
  }
  state.log = data.map(r => ({
    date: r.date, habits: r.habits || {}, energy: r.energy || 0, nota: r.nota || '', idiomDetails: r.idiomDetails || {},
  }));
  setSyncStatus('ok', 'Sincronizado');
  renderCheckin(); renderDashboard(); renderHistorico(); renderOKRs(); renderPerfil(); renderConquistas();
}

const MAIS_PAGES = ['historico', 'biblioteca', 'pomodoro', 'perfil', 'manual'];

export function nav(id, el) {
  ['checkin', 'dashboard', 'okrs', 'historico', 'conquistas', 'biblioteca', 'pomodoro', 'perfil', 'manual'].forEach(p => {
    const pg = document.getElementById('pg-' + p); if (pg) pg.style.display = 'none';
  });
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('on'));
  const target = document.getElementById('pg-' + id);
  if (target) {
    target.style.display = 'block';
    target.classList.remove('fade-in');
    void target.offsetWidth;
    target.classList.add('fade-in');
  }
  if (el) el.classList.add('on');
  if (id === 'checkin') renderCheckin();
  if (id === 'dashboard') renderDashboard();
  if (id === 'okrs') renderOKRs();
  if (id === 'historico') renderHistorico();
  if (id === 'conquistas') renderConquistas();
  if (id === 'perfil') renderPerfil();
  if (id === 'pomodoro') { renderPomodoroTime(); renderPomodoroSessions(); }
  if (id === 'biblioteca') renderBiblioteca();
}

export function openMaisDrawer() {
  document.getElementById('mais-drawer')?.classList.add('open');
  document.getElementById('mais-backdrop')?.classList.add('open');
}

export function closeMaisDrawer() {
  document.getElementById('mais-drawer')?.classList.remove('open');
  document.getElementById('mais-backdrop')?.classList.remove('open');
}

export function navFromMais(id) {
  closeMaisDrawer(null);
  setTimeout(() => {
    ['checkin', 'dashboard', 'okrs', 'historico', 'conquistas', 'biblioteca', 'pomodoro', 'perfil', 'manual'].forEach(p => {
      const pg = document.getElementById('pg-' + p); if (pg) pg.style.display = 'none';
    });
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('on'));
    const target = document.getElementById('pg-' + id);
    if (target) {
      target.style.display = 'block';
      target.classList.remove('fade-in');
      void target.offsetWidth;
      target.classList.add('fade-in');
    }
    const maisBtn = document.getElementById('navbtn-mais');
    if (maisBtn) maisBtn.classList.add('on');
    if (id === 'historico') renderHistorico();
    if (id === 'conquistas') renderConquistas();
    if (id === 'perfil') renderPerfil();
    if (id === 'pomodoro') { renderPomodoroTime(); renderPomodoroSessions(); }
    if (id === 'biblioteca') renderBiblioteca();
  }, 280);
}
