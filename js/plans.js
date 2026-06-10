import { state } from './state.js';
import { saveCfgAll } from './db.js';
import { showToast, todayKey, sanitize } from './utils.js';
import { buildHabitsFromCfg } from './habits.js';

export function getPlans() {
  return state.userCfg.plans || [{ id: 'principal', name: 'Principal', emoji: '⬡' }];
}

export function getActivePlanId() {
  return state.userCfg.activePlan || 'principal';
}

export function openPlanModal() {
  const plans = getPlans(); const active = getActivePlanId();
  document.getElementById('plan-list').innerHTML = plans.map(p => `
    <div class="plan-row ${p.id === active ? 'active' : ''}" onclick="switchPlan('${p.id}')">
      <div class="plan-row-left"><span style="font-size:18px">${sanitize(p.emoji)}</span> ${sanitize(p.name)}</div>
      ${p.id === active ? '<span style="font-size:11px;color:var(--roxo);font-weight:600">ativo</span>' : '<span style="font-size:11px;color:var(--cinza)">trocar</span>'}
    </div>`).join('');
  document.getElementById('plan-modal').style.display = 'flex';
}

export function closePlanModal(e) {
  if (!e || e.target === document.getElementById('plan-modal'))
    document.getElementById('plan-modal').style.display = 'none';
}

export async function switchPlan(id) {
  if (!state.userCfg.planConfigs) state.userCfg.planConfigs = {};
  // Salvar config atual SEM planConfigs e SEM activePlan (evita referência circular)
  const { planConfigs, activePlan, plans, ...cfgSnapshot } = state.userCfg;
  state.userCfg.planConfigs[getActivePlanId()] = cfgSnapshot;
  const allPlans = getPlans(); const target = allPlans.find(p => p.id === id);
  if (!target) return;
  const saved = state.userCfg.planConfigs[id];
  if (saved) {
    const currentPlanConfigs = state.userCfg.planConfigs;
    const currentPlans = state.userCfg.plans;
    Object.assign(state.userCfg, saved);
    state.userCfg.planConfigs = currentPlanConfigs;
    state.userCfg.plans = currentPlans;
  }
  state.userCfg.activePlan = id;
  await saveCfgAll(false);
  document.getElementById('plan-badge').textContent = target.emoji + ' ' + target.name;
  document.getElementById('plan-modal').style.display = 'none';
  const { renderCheckin } = await import('./checkin.js');
  const { renderDashboard } = await import('./dashboard.js');
  const { renderOKRs } = await import('./okrs.js');
  buildHabitsFromCfg(); renderCheckin(); renderDashboard(); renderOKRs();
}

export async function addPlan() {
  const name = prompt('Nome do novo plano:');
  if (!name) return;
  const emojis = ['🌟', '💡', '🎯', '🏋️', '💼', '🧘', '🚀', '🌱'];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  const id = 'plan_' + Date.now();
  const plans = getPlans(); plans.push({ id, name, emoji });
  state.userCfg.plans = plans;
  if (!state.userCfg.planConfigs) state.userCfg.planConfigs = {};
  state.userCfg.planConfigs[id] = {
    name: state.userCfg.name, startDate: todayKey(),
    areas: ['corpo', 'mente'], idiomasAtivos: ['ingles'],
    idiomaDias: [0, 1, 2, 3, 4, 5, 6], treinoDias: [2, 4, 6],
    estudoDias: [0, 1, 3], sonoMeta: 7, inglesMeta: 20,
  };
  await saveCfgAll(false);
  showToast('Plano "' + name + '" criado!');
  openPlanModal();
}
