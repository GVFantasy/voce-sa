import { state } from './state.js';
import { sb, getCfg, loadCfgRemote, flushPendingCheckins, flushPendingCfg } from './db.js';
import { showToast, showFieldErr, clearFieldErr, isValidEmail } from './utils.js';
import { buildHabitsFromCfg } from './habits.js';

export function toggleAuthMode() {
  state.authMode = state.authMode === 'login' ? 'signup' : 'login';
  const isLogin = state.authMode === 'login';
  document.getElementById('auth-btn').textContent = isLogin ? 'Entrar' : 'Criar conta';
  document.getElementById('auth-toggle').innerHTML = isLogin
    ? 'Não tem conta? <span>Criar conta grátis</span>'
    : 'Já tem conta? <span>Entrar</span>';
  const titleEl = document.getElementById('auth-card-title');
  if (titleEl) titleEl.textContent = isLogin ? 'Entrar' : 'Criar conta';
  document.getElementById('auth-err').textContent = '';
}

export async function forgotPassword() {
  const emailEl = document.getElementById('auth-email');
  const email = emailEl.value.trim();
  clearFieldErr('auth-email-err');
  if (!email || !isValidEmail(email)) {
    showFieldErr('auth-email', 'auth-email-err', 'Informe seu email para recuperar a senha.');
    return;
  }
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });
  if (error) { showToast('Erro ao enviar: ' + error.message, 'err'); return; }
  showToast('Se esse email tiver uma conta, enviamos um link de recuperação.', 'info', 6000);
}

// Disparado quando o link do email de recuperação traz o usuário de volta ao app
// (evento PASSWORD_RECOVERY do supabase-js) - pede a nova senha antes de liberar o app.
export function showRecoveryForm() {
  document.getElementById('pg-auth').style.display = 'none';
  const app = document.getElementById('app'); if (app) app.style.display = 'none';
  const mainNav = document.querySelector('.main-nav'); if (mainNav) mainNav.style.display = 'none';
  document.getElementById('pg-recovery').style.display = 'flex';
}

export async function confirmRecovery() {
  const passEl = document.getElementById('recovery-pass');
  const pass = passEl.value;
  clearFieldErr('recovery-pass-err');
  if (!pass || pass.length < 6) {
    showFieldErr('recovery-pass', 'recovery-pass-err', 'A senha deve ter pelo menos 6 caracteres.');
    return;
  }
  const { error } = await sb.auth.updateUser({ password: pass });
  if (error) { showFieldErr('recovery-pass', 'recovery-pass-err', error.message); return; }
  document.getElementById('pg-recovery').style.display = 'none';
  window._recovering = false;
  showToast('Senha redefinida! Você já está logado.');
  await afterLogin();
}

export async function submitAuth() {
  const emailEl = document.getElementById('auth-email');
  const passEl = document.getElementById('auth-pass');
  const email = emailEl.value.trim();
  const pass = passEl.value;
  const errEl = document.getElementById('auth-err');
  const btn = document.getElementById('auth-btn');
  let hasErr = false;
  clearFieldErr('auth-email-err'); clearFieldErr('auth-pass-err'); errEl.textContent = '';
  if (!email) { showFieldErr('auth-email', 'auth-email-err', 'Informe seu email.'); hasErr = true; }
  else if (!isValidEmail(email)) { showFieldErr('auth-email', 'auth-email-err', 'Email inválido.'); hasErr = true; }
  if (!pass) { showFieldErr('auth-pass', 'auth-pass-err', 'Informe sua senha.'); hasErr = true; }
  else if (pass.length < 6) { showFieldErr('auth-pass', 'auth-pass-err', 'Senha deve ter pelo menos 6 caracteres.'); hasErr = true; }
  if (hasErr) return;
  btn.disabled = true; btn.textContent = 'Aguarde...';
  const result = state.authMode === 'login'
    ? await sb.auth.signInWithPassword({ email, password: pass })
    : await sb.auth.signUp({ email, password: pass });
  btn.disabled = false; btn.textContent = state.authMode === 'login' ? 'Entrar' : 'Criar conta';
  if (result.error) {
    const msg = result.error.message;
    const isEmailErr = msg.toLowerCase().includes('email') || msg.toLowerCase().includes('user');
    const isPassErr = msg.toLowerCase().includes('password') || msg.toLowerCase().includes('invalid login');
    if (isEmailErr && !isPassErr) showFieldErr('auth-email', 'auth-email-err', msg);
    else if (isPassErr) showFieldErr('auth-pass', 'auth-pass-err', 'Email ou senha incorretos.');
    else errEl.textContent = msg;
    return;
  }
  if (state.authMode === 'signup' && !result.data.session) {
    errEl.style.color = 'var(--suc-txt)';
    errEl.textContent = 'Conta criada! Confirme seu email para entrar.';
    return;
  }
  state.currentUser = result.data.user;
  await afterLogin();
}

export async function signOut() {
  // Tenta sincronizar check-ins e config pendentes antes de invalidar a sessão — evita perder
  // dados que ainda não foram confirmados no servidor (ver js/db.js queuePendingCheckin/queuePendingCfg).
  try { await flushPendingCheckins(); } catch (e) {}
  try { await flushPendingCfg(); } catch (e) {}
  await sb.auth.signOut();
  clearInterval(state.pomodoro.timer);
  state.pomodoro = { timer: null, seconds: 25 * 60, isRunning: false, isBreak: false, sessions: 0, subject: '' };
  state.currentUser = null; state.log = []; state.userCfg = {}; state.userHabits = [];
  document.body.classList.remove('dark');
  // 'voce_sa_dark' não é isolado por usuário (ao contrário de cfg/ts/pomo) — limpa para não
  // vazar o tema de uma conta para a próxima num dispositivo compartilhado.
  localStorage.removeItem('voce_sa_dark');
  document.getElementById('app').style.display = 'none';
  document.getElementById('pg-auth').style.display = 'block';
}

export async function afterLogin() {
  const { startApp, loadLog } = await import('./nav.js');
  const { startOnboarding } = await import('./onboarding.js');

  document.getElementById('pg-auth').style.display = 'none';

  // envia qualquer edição de config que ficou pendente de uma sessão offline anterior antes de
  // buscar a versão do servidor — senão a busca sobrescreveria a edição não sincronizada.
  try { await flushPendingCfg(); } catch (e) {}
  const result = await loadCfgRemote();

  if (result === 'found') {
    // Supabase tem config válida — fonte da verdade
    buildHabitsFromCfg(); startApp();
  } else if (result === 'not_found') {
    // Online, mas sem config → usuário novo ou conta zerada
    startOnboarding();
  } else {
    // Offline — localStorage como fallback para não perder o usuário
    state.userCfg = getCfg();
    if (state.userCfg.name && state.userCfg.startDate) {
      buildHabitsFromCfg(); startApp();
    } else {
      startOnboarding();
    }
  }
}
