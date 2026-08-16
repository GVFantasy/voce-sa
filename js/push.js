import { state } from './state.js';
import { sb } from './db.js';

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
    await sb.from('push_subscriptions').upsert({
      user_id: state.currentUser.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    }, { onConflict: 'endpoint' });
  } catch (e) {
    console.warn('Não foi possível ativar push remoto:', e.message);
  }
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  } catch (e) {
    console.warn('Não foi possível desativar push remoto:', e.message);
  }
}
