import { state } from './state.js';
import { saveCfgAll, clearTsLocal } from './db.js';
import { showToast, todayKey, sanitize } from './utils.js';
import { buildHabitsFromCfg } from './habits.js';

// Ultima atividade de um plano especifico, a partir do plan_id ja gravado em cada check-in
// (nunca lido de volta ate agora) - sem nenhuma busca nova ao Supabase.
function planActivityLabel(planId) {
  const entries = state.log.filter(e => (e.plan_id || 'principal') === planId);
  if (!entries.length) return 'sem check-ins ainda';
  const lastDate = entries[0].date; // state.log ja vem ordenado por data desc (loadLog)
  const days = Math.round((new Date(todayKey() + 'T12:00:00') - new Date(lastDate + 'T12:00:00')) / 86400000);
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  return `${days}d atrás`;
}

export function getPlans() {
  return state.userCfg.plans || [{ id: 'principal', name: 'Principal', emoji: '⬡' }];
}

export function getActivePlanId() {
  return state.userCfg.activePlan || 'principal';
}

let editingPlanId = null;

// Aplica a config salva de um plano sobre state.userCfg, preservando planConfigs/plans
// (que nao fazem parte do snapshot de um plano individual, senao criaria referencia circular)
function restorePlanConfig(id) {
  const saved = state.userCfg.planConfigs?.[id];
  if (!saved) return;
  const currentPlanConfigs = state.userCfg.planConfigs;
  const currentPlans = state.userCfg.plans;
  Object.assign(state.userCfg, saved);
  state.userCfg.planConfigs = currentPlanConfigs;
  state.userCfg.plans = currentPlans;
}

export function openPlanModal() {
  editingPlanId = null;
  const addForm = document.getElementById('plan-add-form');
  const addInput = document.getElementById('plan-add-input');
  const addBtn = document.getElementById('plan-add-btn-confirm');
  if (addForm) addForm.style.display = 'none';
  if (addInput) addInput.value = '';
  if (addBtn) { addBtn.disabled = false; addBtn.textContent = 'Criar'; }
  const plans = getPlans(); const active = getActivePlanId();
  document.getElementById('plan-list').innerHTML = plans.map(p => `
    <div class="plan-row ${p.id === active ? 'active' : ''}">
      <div class="plan-row-left" style="cursor:pointer" onclick="switchPlan('${p.id}')">
        <span style="font-size:18px">${sanitize(p.emoji)}</span>
        <div><div>${sanitize(p.name)}</div><div style="font-size:11px;color:var(--cinza);font-weight:400">${planActivityLabel(p.id)}</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        ${p.id === active ? '<span style="font-size:11px;color:var(--roxo);font-weight:600">ativo</span>' : ''}
        <button aria-label="Renomear plano" onclick="startRenamePlan('${p.id}')" style="background:none;border:none;cursor:pointer;padding:4px;opacity:.5;line-height:1;display:flex"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg></button>
        ${plans.length > 1 ? `<button aria-label="Excluir plano" onclick="deletePlan('${p.id}')" style="background:none;border:none;cursor:pointer;padding:4px;opacity:.5;line-height:1;display:flex"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>` : ''}
      </div>
    </div>`).join('');
  document.getElementById('plan-modal').style.display = 'flex';
}

export function startRenamePlan(id) {
  const plan = getPlans().find(p => p.id === id);
  if (!plan) return;
  editingPlanId = id;
  const addForm = document.getElementById('plan-add-form');
  const addInput = document.getElementById('plan-add-input');
  const addBtn = document.getElementById('plan-add-btn-confirm');
  if (addInput) { addInput.value = plan.name; addInput.focus(); }
  if (addBtn) addBtn.textContent = 'Renomear';
  if (addForm) addForm.style.display = 'block';
}

export function cancelPlanForm() {
  editingPlanId = null;
  const addForm = document.getElementById('plan-add-form');
  const addInput = document.getElementById('plan-add-input');
  const addBtn = document.getElementById('plan-add-btn-confirm');
  if (addForm) addForm.style.display = 'none';
  if (addInput) addInput.value = '';
  if (addBtn) { addBtn.disabled = false; addBtn.textContent = 'Criar'; }
}

export function openNewPlanForm() {
  cancelPlanForm();
  const addForm = document.getElementById('plan-add-form');
  const addInput = document.getElementById('plan-add-input');
  if (addForm) addForm.style.display = 'block';
  if (addInput) addInput.focus();
}

export function closePlanModal(e) {
  if (!e || e.target === document.getElementById('plan-modal'))
    document.getElementById('plan-modal').style.display = 'none';
}

async function rerenderAfterPlanChange() {
  const { renderCheckin } = await import('./checkin.js');
  const { renderDashboard } = await import('./dashboard.js');
  const { renderOKRs } = await import('./okrs.js');
  buildHabitsFromCfg(); renderCheckin(); renderDashboard(); renderOKRs();
}

export async function switchPlan(id) {
  const allPlans = getPlans(); const target = allPlans.find(p => p.id === id);
  if (!target) return;
  if (!state.userCfg.planConfigs) state.userCfg.planConfigs = {};
  // Salvar config atual SEM planConfigs e SEM activePlan (evita referência circular)
  const { planConfigs, activePlan, plans, ...cfgSnapshot } = state.userCfg;
  state.userCfg.planConfigs[getActivePlanId()] = cfgSnapshot;
  restorePlanConfig(id);
  state.userCfg.activePlan = id;
  await saveCfgAll(false);
  document.getElementById('plan-badge').textContent = target.emoji + ' ' + target.name;
  document.getElementById('plan-modal').style.display = 'none';
  // Descarta rascunho não salvo do check-in de hoje — pertencia ao contexto do plano anterior
  // (habits/energy/nota daquele plano não fazem sentido misturados com o novo).
  clearTsLocal(todayKey());
  await rerenderAfterPlanChange();
}

export async function deletePlan(id) {
  const plans = getPlans();
  if (plans.length <= 1) { showToast('Você precisa manter pelo menos um plano.', 'info'); return; }
  const plan = plans.find(p => p.id === id);
  if (!plan) return;
  if (!confirm(`Excluir o plano "${plan.name}"? Essa ação não pode ser desfeita.`)) return;
  const wasActive = id === getActivePlanId();
  const remaining = plans.filter(p => p.id !== id);
  state.userCfg.plans = remaining;
  if (state.userCfg.planConfigs) delete state.userCfg.planConfigs[id];
  if (wasActive) {
    const next = remaining[0];
    restorePlanConfig(next.id);
    state.userCfg.activePlan = next.id;
    clearTsLocal(todayKey());
    await rerenderAfterPlanChange();
    const badge = document.getElementById('plan-badge');
    if (badge) badge.textContent = next.emoji + ' ' + next.name;
  }
  await saveCfgAll(false);
  showToast('Plano excluído.');
  openPlanModal();
}

export async function addPlan() {
  const input = document.getElementById('plan-add-input');
  const name = input ? input.value.trim() : '';
  if (!name) { if (input) input.focus(); return; }
  const btn = document.getElementById('plan-add-btn-confirm');
  if (btn) { if (btn.disabled) return; btn.disabled = true; }

  if (editingPlanId) {
    const plan = getPlans().find(p => p.id === editingPlanId);
    if (plan) {
      plan.name = name;
      state.userCfg.plans = getPlans();
      if (editingPlanId === getActivePlanId()) {
        const badge = document.getElementById('plan-badge');
        if (badge) badge.textContent = plan.emoji + ' ' + plan.name;
      }
      await saveCfgAll(false);
      showToast('Plano renomeado!');
    }
    editingPlanId = null;
    if (btn) { btn.disabled = false; btn.textContent = 'Criar'; }
    const addForm = document.getElementById('plan-add-form');
    if (addForm) addForm.style.display = 'none';
    openPlanModal();
    return;
  }

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
    seenStreakRecalcNotice: true,
  };
  await saveCfgAll(false);
  const addForm = document.getElementById('plan-add-form');
  const addInput = document.getElementById('plan-add-input');
  if (addForm) addForm.style.display = 'none';
  if (addInput) addInput.value = '';
  showToast('Plano "' + name + '" criado!');
  openPlanModal();
}
