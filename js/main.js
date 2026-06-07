import { state } from './state.js';
import { sb } from './db.js';
import { clearFieldErr } from './utils.js';
import { toggleAuthMode, submitAuth, signOut, afterLogin } from './auth.js';
import { startOnboarding, renderObProgress, showObStep, obNext, obBack, obToggleOpt, obToggleArea, obToggleChip, obToggleDay, obSingle, obSingleMeta, checkObStep2, generatePlan } from './onboarding.js';
import { renderCheckin, toggleHabit, setHabitDetail, setEnergy, saveDay, renderWeeklyReview, setReviewFeel, toggleReviewAdjust, saveWeeklyReview, showBoom, hideBoom } from './checkin.js';
import { renderDashboard, setPeriod, generateDashboardInsight, renderEnergyChart } from './dashboard.js';
import { renderOKRs, togglePillar } from './okrs.js';
import { renderHistorico } from './historico.js';
import { renderConquistas } from './conquistas.js';
import { renderPerfil, savePerfil, toggleIdioma, toggleDark, applyDarkIfSaved, exportCSV, saveReminder, toggleReminder, scheduleReminder, initReminder } from './profile.js';
import { renderBiblioteca, showAddLivro, saveLivro } from './biblioteca.js';
import { pomodoroToggle, pomodoroReset, renderPomodoroTime, renderPomodoroSessions } from './pomodoro.js';
import { getPlans, getActivePlanId, openPlanModal, closePlanModal, switchPlan, addPlan } from './plans.js';
import { nav, startApp, loadLog, openMaisDrawer, closeMaisDrawer, navFromMais } from './nav.js';

// Expõe ao window para os onclick inline no HTML
window.clearFieldErr = clearFieldErr;
window.toggleAuthMode = toggleAuthMode;
window.submitAuth = submitAuth;
window.signOut = signOut;

window.startOnboarding = startOnboarding;
window.renderObProgress = renderObProgress;
window.showObStep = showObStep;
window.obNext = obNext;
window.obBack = obBack;
window.obToggleOpt = obToggleOpt;
window.obToggleArea = obToggleArea;
window.obToggleChip = obToggleChip;
window.obToggleDay = obToggleDay;
window.obSingle = obSingle;
window.obSingleMeta = obSingleMeta;
window.checkObStep2 = checkObStep2;
window.generatePlan = generatePlan;

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

window.renderDashboard = renderDashboard;
window.setPeriod = setPeriod;
window.generateDashboardInsight = generateDashboardInsight;
window.renderEnergyChart = renderEnergyChart;

window.renderOKRs = renderOKRs;
window.togglePillar = togglePillar;

window.renderHistorico = renderHistorico;
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

window.renderBiblioteca = renderBiblioteca;
window.showAddLivro = showAddLivro;
window.saveLivro = saveLivro;

window.pomodoroToggle = pomodoroToggle;
window.pomodoroReset = pomodoroReset;
window.renderPomodoroTime = renderPomodoroTime;
window.renderPomodoroSessions = renderPomodoroSessions;

window.getPlans = getPlans;
window.getActivePlanId = getActivePlanId;
window.openPlanModal = openPlanModal;
window.closePlanModal = closePlanModal;
window.switchPlan = switchPlan;
window.addPlan = addPlan;

window.nav = nav;
window.startApp = startApp;
window.loadLog = loadLog;
window.openMaisDrawer = openMaisDrawer;
window.closeMaisDrawer = closeMaisDrawer;
window.navFromMais = navFromMais;

// Init
async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) { state.currentUser = session.user; await afterLogin(); }
  else document.getElementById('pg-auth').style.display = 'block';
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session && !state.currentUser) {
      state.currentUser = session.user; await afterLogin();
    }
  });
}

init();
