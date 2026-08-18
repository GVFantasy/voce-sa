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

  function localDateStrDaysAgo(tzOffsetMin: number, daysAgo: number) {
    const localMs = Date.now() - tzOffsetMin * 60000 - daysAgo * 86400000;
    return new Date(localMs).toISOString().slice(0, 10);
  }

  const due: { userId: string; localDate: string; tzOffsetMin: number; localHour: number }[] = [];
  for (const row of configs || []) {
    const cfg = row.config || {};
    if (!cfg.lembreteAtivo || !cfg.lembreteHora) continue;
    const [h, m] = String(cfg.lembreteHora).split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) continue;
    const targetMin = h * 60 + m;
    const tzOffsetMin = cfg.tzOffsetMin || 0;
    const localNow = localMinutesNow(tzOffsetMin);
    const diff = Math.min(Math.abs(localNow - targetMin), 1440 - Math.abs(localNow - targetMin));
    if (diff <= WINDOW_MIN) {
      due.push({ userId: row.user_id, localDate: localDateStr(tzOffsetMin), tzOffsetMin, localHour: Math.floor(localNow / 60) });
    }
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
  const pending = due.filter(d => !doneSet.has(`${d.userId}|${d.localDate}`));
  if (!pending.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  const targets = pending.map(d => d.userId);

  // "Streak em risco": aviso diferente pra quem, tarde da noite (≥21h local), ainda não fez
  // check-in hoje E tem pelo menos os últimos 3 dias anteriores registrados. É uma aproximação
  // simples de "streak ativo" (checa presença de registro, não se cumpriu 100% dos hábitos como
  // o cálculo completo do client faz) — suficiente pra um aviso, não precisa ser exato.
  const lateCandidates = pending.filter(d => d.localHour >= 21);
  const streakRiskUserIds = new Set<string>();
  if (lateCandidates.length) {
    const checkDates = [...new Set(lateCandidates.flatMap(d => [1, 2, 3].map(n => localDateStrDaysAgo(d.tzOffsetMin, n))))];
    const { data: recentRows } = await admin
      .from("checkins")
      .select("user_id, date")
      .in("user_id", lateCandidates.map(d => d.userId))
      .in("date", checkDates);
    const recentSet = new Set((recentRows || []).map(c => `${c.user_id}|${c.date}`));
    for (const d of lateCandidates) {
      const has3 = [1, 2, 3].every(n => recentSet.has(`${d.userId}|${localDateStrDaysAgo(d.tzOffsetMin, n)}`));
      if (has3) streakRiskUserIds.add(d.userId);
    }
  }

  const { data: subs, error: subsErr } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", targets);
  if (subsErr) return new Response(JSON.stringify({ error: subsErr.message }), { status: 500 });

  const defaultPayload = JSON.stringify({
    title: "Você S.A. 🔥",
    body: "Hora do seu check-in! Não deixe o streak quebrar.",
    url: "./",
  });
  const riskPayload = JSON.stringify({
    title: "Sua sequência está em risco! ⚠️",
    body: "Faltam poucas horas pro dia acabar e você ainda não fez o check-in de hoje.",
    url: "./",
  });

  let sent = 0;
  const staleIds: string[] = [];
  await Promise.all((subs || []).map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        streakRiskUserIds.has(sub.user_id) ? riskPayload : defaultPayload
      );
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) staleIds.push(sub.id);
    }
  }));

  if (staleIds.length) await admin.from("push_subscriptions").delete().in("id", staleIds);

  return new Response(JSON.stringify({ sent, stale: staleIds.length }), { status: 200 });
});
