import { state, SUPABASE_URL, SUPABASE_KEY } from './state.js';
import { showToast } from './utils.js';

export const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export function lsKey(base) {
  return 'voce_sa_' + base + '_' + (state.currentUser?.id || '');
}

export const getCfg = () => {
  try { return JSON.parse(localStorage.getItem('voce_sa_cfg_' + (state.currentUser?.id || '')) || '{}'); }
  catch (e) { return {}; }
};

// stamp=false ao apenas cachear localmente uma config que acabou de vir do servidor
// (loadCfgRemote) — não é uma edição do usuário, então não deve mexer em updatedAt.
export const saveCfgLocal = (stamp = true) => {
  try {
    if (stamp) state.userCfg.updatedAt = Date.now();
    localStorage.setItem('voce_sa_cfg_' + (state.currentUser?.id || ''), JSON.stringify(state.userCfg));
    return true;
  } catch (e) { return false; }
};

// Rascunho local do check-in do dia (state.ts) — evita perder alterações não salvas ao navegar de aba.
export function saveTsLocal(date, ts) {
  try { localStorage.setItem(lsKey('ts_' + date), JSON.stringify(ts)); return true; }
  catch (e) { return false; }
}
export function loadTsLocal(date) {
  try { const raw = localStorage.getItem(lsKey('ts_' + date)); return raw ? JSON.parse(raw) : null; }
  catch (e) { return null; }
}
export function clearTsLocal(date) {
  try { localStorage.removeItem(lsKey('ts_' + date)); } catch (e) {}
}

// Fila de check-ins que falharam ao sincronizar (offline) — reenviada quando a conexão volta.
export function queuePendingCheckin(entry) {
  try {
    const key = lsKey('pending_checkins');
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = list.findIndex(e => e.date === entry.date);
    if (idx >= 0) list[idx] = entry; else list.push(entry);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {}
}
export function getPendingCheckins() {
  try { return JSON.parse(localStorage.getItem(lsKey('pending_checkins')) || '[]'); }
  catch (e) { return []; }
}
export function clearPendingCheckin(date) {
  try {
    const key = lsKey('pending_checkins');
    const list = JSON.parse(localStorage.getItem(key) || '[]').filter(e => e.date !== date);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {}
}
// Mantém a fila sincronizada se o usuário continuar editando depois de um "Salvar" que falhou
// (offline) — sem isso, o flush reenviaria os valores antigos e perderia as edições seguintes.
export function refreshPendingCheckinIfQueued(date, patch) {
  try {
    const key = lsKey('pending_checkins');
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = list.findIndex(e => e.date === date);
    if (idx < 0) return;
    list[idx] = { ...list[idx], ...patch };
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {}
}
export async function flushPendingCheckins() {
  if (!state.currentUser) return;
  const pending = getPendingCheckins();
  for (const entry of pending) {
    try {
      const { error } = await sb.from('checkins').upsert(entry, { onConflict: 'user_id,date' });
      if (!error) { clearPendingCheckin(entry.date); clearTsLocal(entry.date); }
    } catch (e) { /* ainda offline, mantém na fila */ }
  }
}

// Config pendente que falhou ao sincronizar (offline) — reenviada quando a conexão volta, mesmo
// padrão já usado pra checkins. Como userCfg é um blob único por usuário (não por data), a fila
// aqui é só o último blob pendente, não uma lista.
export function queuePendingCfg(cfg) {
  try { localStorage.setItem(lsKey('pending_cfg'), JSON.stringify(cfg)); } catch (e) {}
}
export function getPendingCfg() {
  try { const raw = localStorage.getItem(lsKey('pending_cfg')); return raw ? JSON.parse(raw) : null; }
  catch (e) { return null; }
}
export function clearPendingCfg() {
  try { localStorage.removeItem(lsKey('pending_cfg')); } catch (e) {}
}
export async function flushPendingCfg() {
  if (!state.currentUser) return;
  const pending = getPendingCfg();
  if (!pending) return;
  try {
    const { error } = await sb.from('user_config').upsert(
      { user_id: state.currentUser.id, config: pending },
      { onConflict: 'user_id' }
    );
    if (!error) clearPendingCfg();
  } catch (e) { /* ainda offline, mantém na fila */ }
}

export async function saveCfgRemote() {
  if (!state.currentUser) return false;
  try {
    const { error } = await sb.from('user_config').upsert(
      { user_id: state.currentUser.id, config: state.userCfg },
      { onConflict: 'user_id' }
    );
    if (error) throw error;
    clearPendingCfg();
    return true;
  } catch (e) {
    queuePendingCfg(state.userCfg);
    setSyncStatus('err', 'Sem conexão');
    return false;
  }
}

// Fila de operações da Biblioteca que falharam ao sincronizar (offline) — mesmo padrão de
// checkins/config. Criação usa upsert(onConflict:'client_id') em vez de insert puro (client_id
// é gerado no cliente antes da chamada, ver js/biblioteca.js) — sem isso, reenviar um insert que
// falhou por rede arriscaria duplicar a linha se o insert original tivesse funcionado no servidor
// mas a resposta se perdido. Update/delete já são seguros de reenviar (chave é o id existente).
export function queuePendingBiblioteca(op) {
  try {
    const key = lsKey('pending_biblioteca');
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.push(op);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {}
}
export function getPendingBiblioteca() {
  try { return JSON.parse(localStorage.getItem(lsKey('pending_biblioteca')) || '[]'); }
  catch (e) { return []; }
}
function removePendingBiblioteca(type, matchKey) {
  try {
    const key = lsKey('pending_biblioteca');
    const list = JSON.parse(localStorage.getItem(key) || '[]')
      .filter(op => !(op.type === type && (type === 'upsert' ? op.payload.client_id : op.id) === matchKey));
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {}
}
export async function flushPendingBiblioteca() {
  if (!state.currentUser) return;
  const pending = getPendingBiblioteca();
  for (const op of pending) {
    try {
      let error;
      if (op.type === 'delete') {
        ({ error } = await sb.from('biblioteca').delete().eq('id', op.id).eq('user_id', state.currentUser.id));
      } else if (op.type === 'update') {
        ({ error } = await sb.from('biblioteca').update(op.payload).eq('id', op.id).eq('user_id', state.currentUser.id));
      } else {
        ({ error } = await sb.from('biblioteca').upsert(op.payload, { onConflict: 'client_id' }));
      }
      if (!error) removePendingBiblioteca(op.type, op.type === 'upsert' ? op.payload.client_id : op.id);
    } catch (e) { /* ainda offline, mantém na fila */ }
  }
}

// Fila de (in)/(un)subscribe de push que falharam ao sincronizar (offline). Ambas as operações
// já são idempotentes por natureza: upsert(onConflict:'endpoint') e delete-por-endpoint podem ser
// reenviados com segurança.
export function queuePendingPush(op) {
  try {
    const key = lsKey('pending_push');
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.push(op);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {}
}
export function getPendingPush() {
  try { return JSON.parse(localStorage.getItem(lsKey('pending_push')) || '[]'); }
  catch (e) { return []; }
}
function removePendingPush(type, endpoint) {
  try {
    const key = lsKey('pending_push');
    const list = JSON.parse(localStorage.getItem(key) || '[]').filter(op => !(op.type === type && op.endpoint === endpoint));
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {}
}
export async function flushPendingPush() {
  if (!state.currentUser) return;
  const pending = getPendingPush();
  for (const op of pending) {
    try {
      let error;
      if (op.type === 'subscribe') {
        ({ error } = await sb.from('push_subscriptions').upsert(op.payload, { onConflict: 'endpoint' }));
      } else {
        ({ error } = await sb.from('push_subscriptions').delete().eq('endpoint', op.endpoint).eq('user_id', state.currentUser.id));
      }
      if (!error) removePendingPush(op.type, op.endpoint);
    } catch (e) { /* ainda offline, mantém na fila */ }
  }
}

export async function saveCfgAll(showFeedback) {
  saveCfgLocal();
  setSyncStatus('syncing', 'Salvando...');
  const ok = await saveCfgRemote();
  if (ok) { setSyncStatus('ok', 'Sincronizado'); if (showFeedback) showToast('Configurações salvas'); }
  else { if (showFeedback) showToast('Salvo localmente. Sem conexão com o servidor.', 'info'); }
}

export async function loadCfgRemote() {
  try {
    const { data, error } = await sb.from('user_config').select('config').eq('user_id', state.currentUser.id).single();
    if (error) {
      if (error.code === 'PGRST116') return 'not_found'; // linha não existe
      throw error;
    }
    if (data?.config && data.config.name) {
      const localCfg = getCfg();
      if (localCfg?.name && (localCfg.updatedAt || 0) > (data.config.updatedAt || 0)) {
        // Não fazemos merge automático (config é salva como blob único) — só avisamos.
        // Ver memory/plano de execução: limitação aceita, resolver exigiria mudar o modelo de dados.
        showToast('Este dispositivo tinha alterações que talvez não tenham chegado a sincronizar. Carregamos os dados do servidor — se algo que você mudou recentemente sumiu, será preciso refazer.', 'info', 7000);
      }
      state.userCfg = data.config;
      saveCfgLocal(false);
      return 'found';
    }
    return 'not_found';
  } catch (e) {
    return 'offline';
  }
}

export function setSyncStatus(s, msg) {
  // dot no header compacto (id="sync-dot")
  const dot = document.getElementById('sync-dot');
  if (dot) dot.className = 'app-sync-dot ' + s;
  // legado: sync-bar oculto por CSS, mas mantemos o texto para compatibilidade
  const legacyDot = document.getElementById('sync-dot-legacy');
  const legacyTxt = document.getElementById('sync-txt');
  if (legacyDot) legacyDot.className = 'sync-dot ' + s;
  if (legacyTxt) legacyTxt.textContent = msg;
}
