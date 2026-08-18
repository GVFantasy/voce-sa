import { state } from './state.js';
import { sb, flushPendingCfg } from './db.js';
import { clearFieldErr, showToast } from './utils.js';
import { toggleAuthMode, submitAuth, signOut, afterLogin, forgotPassword, showRecoveryForm, confirmRecovery } from './auth.js';
import { startOnboarding, renderObProgress, showObStep, obNext, obBack, obToggleArea, obToggleChip, obToggleDay, obSingle, obSingleMeta, checkObStep2, generatePlan, obToggleIdioma, obSonoMeta, obEstudoMeta, showKickoff, startFromKickoff } from './onboarding.js';
import { renderCheckin, toggleHabit, setHabitDetail, expandHabitDetail, setEnergy, saveDay, renderWeeklyReview, renderMonthlyReview, setReviewFeel, toggleReviewAdjust, saveWeeklyReview, saveMonthlyReview, showBoom, hideBoom, onNotaInput } from './checkin.js';
import { renderDashboard, setPeriod, renderEnergyChart } from './dashboard.js';
import { renderOKRs, togglePillar, toggleKR, toggleQTask, openOKREdit, cancelOKREdit, saveOKREdit, saveFinMes } from './okrs.js';
import { renderHistorico, loadMoreHistorico, showHiDay, navCalMonth, filterHistorico, setHistoricoHabitFilter } from './historico.js';
import { renderConquistas } from './conquistas.js';
import { renderPerfil, savePerfil, toggleIdioma, toggleDark, applyDarkIfSaved, exportCSV, exportJSON, saveReminder, toggleReminder, scheduleReminder, initReminder, toggleSonoMeta, toggleTreinoDia, toggleEstudoDia, toggleRelacoesDia, toggleFinancasDia, toggleFinPerfil, saveFinMeta, changeEmail, changePassword, addCustomHabit, deleteCustomHabit, toggleCustomHabitDia, deleteAccount } from './profile.js';
import { renderBiblioteca, showAddLivro, saveLivro, editLivro, deleteLivro, filterBiblioteca, toggleLivroStatus, setLivroRating, setBiblSort } from './biblioteca.js';
import { pomodoroToggle, pomodoroReset, renderPomodoroTime, renderPomodoroSessions, setFocusDuration, setPomoSubject } from './pomodoro.js';
import { getPlans, getActivePlanId, openPlanModal, closePlanModal, switchPlan, addPlan, deletePlan, startRenamePlan, cancelPlanForm, openNewPlanForm } from './plans.js';
import { nav, startApp, loadLog, openMaisDrawer, closeMaisDrawer, navFromMais } from './nav.js';
import { setRetroTab, retroPrevQ, retroNextQ } from './retrospectiva.js';

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
window.expandHabitDetail = expandHabitDetail;
window.setEnergy = setEnergy;
window.saveDay = saveDay;
window.renderWeeklyReview = renderWeeklyReview;
window.renderMonthlyReview = renderMonthlyReview;
window.setReviewFeel = setReviewFeel;
window.toggleReviewAdjust = toggleReviewAdjust;
window.saveWeeklyReview = saveWeeklyReview;
window.saveMonthlyReview = saveMonthlyReview;
window.showBoom = showBoom;
window.hideBoom = hideBoom;
window.toggleQTask = toggleQTask;
window.onNotaInput = onNotaInput;

window.renderDashboard = renderDashboard;
window.setPeriod = setPeriod;
window.renderEnergyChart = renderEnergyChart;

window.renderOKRs = renderOKRs;
window.togglePillar = togglePillar;
window.toggleKR = toggleKR;
window.openOKREdit = openOKREdit;
window.cancelOKREdit = cancelOKREdit;
window.saveOKREdit = saveOKREdit;

window.renderHistorico = renderHistorico;
window.loadMoreHistorico = loadMoreHistorico;
window.filterHistorico = filterHistorico;
window.setHistoricoHabitFilter = setHistoricoHabitFilter;
window.navCalMonth = navCalMonth;
window.showHiDay = showHiDay;
window.renderConquistas = renderConquistas;

window.renderPerfil = renderPerfil;
window.savePerfil = savePerfil;
window.toggleIdioma = toggleIdioma;
window.toggleDark = toggleDark;
window.applyDarkIfSaved = applyDarkIfSaved;
window.exportCSV = exportCSV;
window.exportJSON = exportJSON;
window.saveReminder = saveReminder;
window.toggleReminder = toggleReminder;
window.scheduleReminder = scheduleReminder;
window.initReminder = initReminder;
window.toggleSonoMeta = toggleSonoMeta;
window.toggleTreinoDia = toggleTreinoDia;
window.toggleEstudoDia = toggleEstudoDia;
window.toggleRelacoesDia = toggleRelacoesDia;
window.toggleFinancasDia = toggleFinancasDia;
window.toggleFinPerfil = toggleFinPerfil;
window.saveFinMeta = saveFinMeta;
window.changeEmail = changeEmail;
window.changePassword = changePassword;
window.deleteAccount = deleteAccount;
window.addCustomHabit = addCustomHabit;
window.deleteCustomHabit = deleteCustomHabit;
window.toggleCustomHabitDia = toggleCustomHabitDia;
window.saveFinMes = saveFinMes;

window.renderBiblioteca = renderBiblioteca;
window.showAddLivro = showAddLivro;
window.saveLivro = saveLivro;
window.editLivro = editLivro;
window.deleteLivro = deleteLivro;
window.filterBiblioteca = filterBiblioteca;
window.toggleLivroStatus = toggleLivroStatus;
window.setLivroRating = setLivroRating;
window.setBiblSort = setBiblSort;

window.pomodoroToggle = pomodoroToggle;
window.pomodoroReset = pomodoroReset;
window.renderPomodoroTime = renderPomodoroTime;
window.renderPomodoroSessions = renderPomodoroSessions;
window.setFocusDuration = setFocusDuration;
window.setPomoSubject = setPomoSubject;

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
window.setRetroTab = setRetroTab;
window.retroPrevQ = retroPrevQ;
window.retroNextQ = retroNextQ;

// Rede de segurança: qualquer Promise rejeitada sem catch (ex: falha de rede numa chamada que
// não previu isso) não deve travar a UI em silêncio - loga e avisa de forma genérica em vez de
// deixar o usuário sem feedback nenhum do que aconteceu.
window.addEventListener('unhandledrejection', (event) => {
  console.error('Erro não tratado:', event.reason);
  showToast('Algo deu errado. Se persistir, recarregue a página.', 'err');
});

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
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session && !state.currentUser && !window._recovering) {
      state.currentUser = session.user; await afterLogin();
    } else if (!session && !state.currentUser && !window._recovering) {
      document.getElementById('pg-auth').style.display = 'block';
    }
  } catch (e) {
    // sem sessão local/rede pra confirmar login - cai pra tela de entrada em vez de travar
    // a página em branco pra sempre
    if (!state.currentUser) document.getElementById('pg-auth').style.display = 'block';
  }
  window.addEventListener('online', () => { if (state.currentUser) { flushPendingCfg(); loadLog(); } });
}

init().catch(e => console.error('Falha ao iniciar o app:', e));
