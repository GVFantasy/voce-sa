import { state } from './state.js';
import { sb, getCfg, loadCfgRemote } from './db.js';
import { showToast, showFieldErr, clearFieldErr } from './utils.js';
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

export async function submitAuth() {
  const emailEl = document.getElementById('auth-email');
  const passEl = document.getElementById('auth-pass');
  const email = emailEl.value.trim();
  const pass = passEl.value;
  const errEl = document.getElementById('auth-err');
  const btn = document.getElementById('auth-btn');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let hasErr = false;
  clearFieldErr('auth-email-err'); clearFieldErr('auth-pass-err'); errEl.textContent = '';
  if (!email) { showFieldErr('auth-email', 'auth-email-err', 'Informe seu email.'); hasErr = true; }
  else if (!emailRegex.test(email)) { showFieldErr('auth-email', 'auth-email-err', 'Email inválido.'); hasErr = true; }
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
  await sb.auth.signOut();
  state.currentUser = null; state.log = []; state.userCfg = {}; state.userHabits = [];
  document.getElementById('app').style.display = 'none';
  document.getElementById('pg-auth').style.display = 'block';
}

export async function afterLogin() {
  // Import lazily to avoid circular: nav/startApp depends on auth, auth needs startApp
  const { startApp, loadLog } = await import('./nav.js');
  const { startOnboarding } = await import('./onboarding.js');

  state.userCfg = getCfg();
  if (!state.userCfg.name || !state.userCfg.startDate) {
    const found = await loadCfgRemote();
    if (found) {
      document.getElementById('pg-auth').style.display = 'none';
      buildHabitsFromCfg(); startApp(); return;
    }
    document.getElementById('pg-auth').style.display = 'none';
    startOnboarding();
  } else {
    document.getElementById('pg-auth').style.display = 'none';
    buildHabitsFromCfg(); startApp();
  }
}
