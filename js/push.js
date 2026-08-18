import { state } from './state.js';
import { sb, queuePendingPush } from './db.js';

// Chave pública VAPID do projeto (não é secreta - vai no client de qualquer app Web Push).
const VAPID_PUBLIC_KEY = 'BMT3PNO9Vg_IC4F8BGmf5PqaD7SmXrjDjfmFViUKBzUcstTpHiImOlwceVS2B3amzCVXtLdXHspWw7mZIHXtXYE';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// Best-effort: navegadores sem suporte a Push (ex.: iOS fora do modo instalado) simplesmente
// não recebem push remoto, mas continuam com o lembrete local (Notification+setTimeout) normal.
export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  let payload = null;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const json = sub.toJSON();
    payload = { user_id: state.currentUser.id, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
    const { error } = await sb.from('push_subscriptions').upsert(payload, { onConflict: 'endpoint' });
    if (error) console.warn('Não foi possível ativar push remoto:', error.message);
  } catch (e) {
    // exceção de rede (diferente de erro retornado pelo servidor, tratado acima) - fica na fila
    // pra reenviar quando a conexão voltar, mesmo padrão de checkins/config. Só sabemos o payload
    // se a inscrição no navegador (Push API) já tinha sido resolvida antes da falha de rede.
    if (payload) queuePendingPush({ type: 'subscribe', endpoint: payload.endpoint, payload });
    console.warn('Não foi possível ativar push remoto:', e.message);
  }
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  let endpoint = null;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    endpoint = sub.endpoint;
    const { error } = await sb.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', state.currentUser.id);
    if (error) console.warn('Não foi possível desativar push remoto:', error.message);
    await sub.unsubscribe();
  } catch (e) {
    // exceção de rede - fica na fila pra reenviar quando a conexão voltar
    if (endpoint) queuePendingPush({ type: 'unsubscribe', endpoint });
    console.warn('Não foi possível desativar push remoto:', e.message);
  }
}
