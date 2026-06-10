import { state, SUPABASE_URL, SUPABASE_KEY } from './state.js';
import { showToast } from './utils.js';

export const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export const getCfg = () => {
  try { return JSON.parse(localStorage.getItem('voce_sa_cfg_' + (state.currentUser?.id || '')) || '{}'); }
  catch (e) { return {}; }
};

export const saveCfgLocal = () => {
  try {
    localStorage.setItem('voce_sa_cfg_' + (state.currentUser?.id || ''), JSON.stringify(state.userCfg));
    return true;
  } catch (e) { return false; }
};

export async function saveCfgRemote() {
  if (!state.currentUser) return false;
  try {
    const { error } = await sb.from('user_config').upsert(
      { user_id: state.currentUser.id, config: state.userCfg },
      { onConflict: 'user_id' }
    );
    if (error) throw error;
    return true;
  } catch (e) {
    setSyncStatus('err', 'Sem conexão');
    return false;
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
      state.userCfg = data.config;
      saveCfgLocal();
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
