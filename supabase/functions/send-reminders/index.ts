import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Disparada via pg_cron a cada 15 minutos (ver supabase/migrations/0001_push_subscriptions.sql).
// Não é um endpoint público de uso geral: só aceita chamadas autenticadas com a service role key,
// para impedir que qualquer pessoa na internet dispare push em massa para todos os usuários.
Deno.serve(async (req) => {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: "Não autorizado." }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
  webpush.setVapidDetails("mailto:gvmediabr@gmail.com", vapidPublicKey, vapidPrivateKey);

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: configs, error: cfgErr } = await admin
    .from("user_config")
    .select("user_id, config");
  if (cfgErr) return new Response(JSON.stringify({ error: cfgErr.message }), { status: 500 });

  const nowUtcMin = new Date().getUTCHours() * 60 + new Date().getUTCMinutes();
  const WINDOW_MIN = 7; // metade do intervalo do cron (15min), pra cada horário ser pego uma única vez

  function localMinutesNow(tzOffsetMin: number) {
    // getTimezoneOffset() no client: UTC = local + offset  =>  local = UTC - offset
    return ((nowUtcMin - tzOffsetMin) % 1440 + 1440) % 1440;
  }

  function localDateStr(tzOffsetMin: number) {
    // data local do usuário (YYYY-MM-DD), calculada a partir do offset de fuso salvo no client
    const localMs = Date.now() - tzOffsetMin * 60000;
    return new Date(localMs).toISOString().slice(0, 10);
  }

  const due: { userId: string; localDate: string }[] = [];
  for (const row of configs || []) {
    const cfg = row.config || {};
    if (!cfg.lembreteAtivo || !cfg.lembreteHora) continue;
    const [h, m] = String(cfg.lembreteHora).split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) continue;
    const targetMin = h * 60 + m;
    const tzOffsetMin = cfg.tzOffsetMin || 0;
    const localNow = localMinutesNow(tzOffsetMin);
    const diff = Math.min(Math.abs(localNow - targetMin), 1440 - Math.abs(localNow - targetMin));
    if (diff <= WINDOW_MIN) due.push({ userId: row.user_id, localDate: localDateStr(tzOffsetMin) });
  }
  if (!due.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

  // Não notifica quem já fez check-in hoje (data local de cada usuário, conforme seu próprio fuso).
  const distinctDates = [...new Set(due.map(d => d.localDate))];
  const { data: doneToday } = await admin
    .from("checkins")
    .select("user_id, date")
    .in("user_id", due.map(d => d.userId))
    .in("date", distinctDates);
  const doneSet = new Set((doneToday || []).map(c => `${c.user_id}|${c.date}`));
  const targets = due.filter(d => !doneSet.has(`${d.userId}|${d.localDate}`)).map(d => d.userId);
  if (!targets.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

  const { data: subs, error: subsErr } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", targets);
  if (subsErr) return new Response(JSON.stringify({ error: subsErr.message }), { status: 500 });

  const payload = JSON.stringify({
    title: "Você S.A. 🔥",
    body: "Hora do seu check-in! Não deixe o streak quebrar.",
    url: "./",
  });

  let sent = 0;
  const staleIds: string[] = [];
  await Promise.all((subs || []).map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) staleIds.push(sub.id);
    }
  }));

  if (staleIds.length) await admin.from("push_subscriptions").delete().in("id", staleIds);

  return new Response(JSON.stringify({ sent, stale: staleIds.length }), { status: 200 });
});
