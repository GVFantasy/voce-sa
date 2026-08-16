import { state } from './state.js';
import { sb } from './db.js';
import { clearFieldErr } from './utils.js';
import { toggleAuthMode, submitAuth, signOut, afterLogin, forgotPassword, showRecoveryForm, confirmRecovery } from './auth.js';
import { startOnboarding, renderObProgress, showObStep, obNext, obBack, obToggleArea, obToggleChip, obToggleDay, obSingle, obSingleMeta, checkObStep2, generatePlan, obToggleIdioma, obSonoMeta, obEstudoMeta, showKickoff, startFromKickoff } from './onboarding.js';
import { renderCheckin, toggleHabit, setHabitDetail, setEnergy, saveDay, renderWeeklyReview, setReviewFeel, toggleReviewAdjust, saveWeeklyReview, showBoom, hideBoom, toggleQTask, onNotaInput } from './checkin.js';
import { renderDashboard, setPeriod, generateDashboardInsight, renderEnergyChart } from './dashboard.js';
import { renderOKRs, togglePillar, getActiveObjective, toggleKR, openOKREdit, cancelOKREdit, saveOKREdit, saveFinMes } from './okrs.js';
import { renderHistorico, loadMoreHistorico, showHiDay, navCalMonth } from './historico.js';
import { renderConquistas } from './conquistas.js';
import { renderPerfil, savePerfil, toggleIdioma, toggleDark, applyDarkIfSaved, exportCSV, saveReminder, toggleReminder, scheduleReminder, initReminder, toggleSonoMeta, toggleTreinoDia, toggleEstudoDia, toggleFinPerfil, saveFinMeta, changeEmail, changePassword, addCustomHabit, deleteCustomHabit } from './profile.js';
import { renderBiblioteca, showAddLivro, saveLivro, editLivro, deleteLivro, filterBiblioteca } from './biblioteca.js';
import { pomodoroToggle, pomodoroReset, renderPomodoroTime, renderPomodoroSessions, setFocusDuration } from './pomodoro.js';
import { getPlans, getActivePlanId, openPlanModal, closePlanModal, switchPlan, addPlan, deletePlan, startRenamePlan, cancelPlanForm, openNewPlanForm } from './plans.js';
import { nav, startApp, loadLog, openMaisDrawer, closeMaisDrawer, navFromMais } from './nav.js';

// Expõe ao window para os onclick inline no HTML
window.clearFieldErr = clearFieldErr;
window.toggleAuthMode = toggleAuthMode;
window.submitAuth = submitAuth;
window.forgotPassword = forgotPassword;
window.confirmRecovery = confirmRecovery;
window.signOut = signOut;

window.startOnboarding = startOnboarding;
window.renderObProgress = renderObProgress;
window.showObStep = showObStep;
window.obNext = obNext;
window.obBack = obBack;
window.obToggleArea = obToggleArea;
window.obToggleChip = obToggleChip;
window.obToggleDay = obToggleDay;
window.obSingle = obSingle;
window.obSingleMeta = obSingleMeta;
window.checkObStep2 = checkObStep2;
window.generatePlan = generatePlan;
window.obToggleIdioma = obToggleIdioma;
window.obSonoMeta = obSonoMeta;
window.obEstudoMeta = obEstudoMeta;
window.showKickoff = showKickoff;
window.startFromKickoff = startFromKickoff;

window.renderCheckin = renderCheckin;
window.toggleHabit = toggleHabit;
window.setHabitDetail = setHabitDetail;
window.setEnergy = setEnergy;
window.saveDay = saveDay;
window.renderWeeklyReview = renderWeeklyReview;
window.setReviewFeel = setReviewFeel;
window.toggleReviewAdjust = toggleReviewAdjust;
window.saveWeeklyReview = saveWeeklyReview;
window.showBoom = showBoom;
window.hideBoom = hideBoom;
window.toggleQTask = toggleQTask;
window.onNotaInput = onNotaInput;

window.renderDashboard = renderDashboard;
window.setPeriod = setPeriod;
window.generateDashboardInsight = generateDashboardInsight;
window.renderEnergyChart = renderEnergyChart;

window.renderOKRs = renderOKRs;
window.togglePillar = togglePillar;
window.getActiveObjective = getActiveObjective;
window.toggleKR = toggleKR;
window.openOKREdit = openOKREdit;
window.cancelOKREdit = cancelOKREdit;
window.saveOKREdit = saveOKREdit;

window.renderHistorico = renderHistorico;
window.loadMoreHistorico = loadMoreHistorico;
window.navCalMonth = navCalMonth;
window.showHiDay = showHiDay;
window.renderConquistas = renderConquistas;

window.renderPerfil = renderPerfil;
window.savePerfil = savePerfil;
window.toggleIdioma = toggleIdioma;
window.toggleDark = toggleDark;
window.applyDarkIfSaved = applyDarkIfSaved;
window.exportCSV = exportCSV;
window.saveReminder = saveReminder;
window.toggleReminder = toggleReminder;
window.scheduleReminder = scheduleReminder;
window.initReminder = initReminder;
window.toggleSonoMeta = toggleSonoMeta;
window.toggleTreinoDia = toggleTreinoDia;
window.toggleEstudoDia = toggleEstudoDia;
window.toggleFinPerfil = toggleFinPerfil;
window.saveFinMeta = saveFinMeta;
window.changeEmail = changeEmail;
window.changePassword = changePassword;
window.addCustomHabit = addCustomHabit;
window.deleteCustomHabit = deleteCustomHabit;
window.saveFinMes = saveFinMes;

window.renderBiblioteca = renderBiblioteca;
window.showAddLivro = showAddLivro;
window.saveLivro = saveLivro;
window.editLivro = editLivro;
window.deleteLivro = deleteLivro;
window.filterBiblioteca = filterBiblioteca;

window.pomodoroToggle = pomodoroToggle;
window.pomodoroReset = pomodoroReset;
window.renderPomodoroTime = renderPomodoroTime;
window.renderPomodoroSessions = renderPomodoroSessions;
window.setFocusDuration = setFocusDuration;

window.getPlans = getPlans;
window.getActivePlanId = getActivePlanId;
window.openPlanModal = openPlanModal;
window.closePlanModal = closePlanModal;
window.switchPlan = switchPlan;
window.addPlan = addPlan;
window.deletePlan = deletePlan;
window.startRenamePlan = startRenamePlan;
window.cancelPlanForm = cancelPlanForm;
window.openNewPlanForm = openNewPlanForm;

window.nav = nav;
window.startApp = startApp;
window.loadLog = loadLog;
window.openMaisDrawer = openMaisDrawer;
window.closeMaisDrawer = closeMaisDrawer;
window.navFromMais = navFromMais;

// Init
async function init() {
  // registrado ANTES de getSession(): se o link de recuperacao de senha ja tiver sido
  // processado pelo supabase-js durante o load da pagina, o evento PASSWORD_RECOVERY so
  // chega a quem ja estava inscrito - registrar depois arrisca perder o evento
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      // veio do link do email de "esqueci a senha" - pede a nova senha antes de liberar o
      // app, nao entra direto (senao a recuperacao nunca chegaria a trocar a senha de fato).
      // window._recovering evita que o SIGNED_IN abaixo entre direto na app; confirmRecovery()
      // (auth.js) reseta a flag depois de trocar a senha com sucesso.
      window._recovering = true;
      state.currentUser = session?.user || null;
      showRecoveryForm();
      return;
    }
    if (event === 'SIGNED_IN' && session && !state.currentUser && !window._recovering) {
      state.currentUser = session.user; await afterLogin();
    }
  });
  const { data: { session } } = await sb.auth.getSession();
  if (session && !state.currentUser && !window._recovering) {
    state.currentUser = session.user; await afterLogin();
  } else if (!session && !state.currentUser && !window._recovering) {
    document.getElementById('pg-auth').style.display = 'block';
  }
  window.addEventListener('online', () => { if (state.currentUser) loadLog(); });
}

init();
