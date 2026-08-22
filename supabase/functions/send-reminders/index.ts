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

  // Resumo semanal: dias com check-in nos últimos 7 vs. 7 anteriores (proxy honesto — não
  // recalcula % de hábitos cumpridos como o client faz, só presença de registro, mesma
  // aproximação já usada acima pelo aviso de "streak em risco"). Grava a data de envio de volta
  // no blob de config pra não reenviar na mesma semana.
  async function sendWeeklySummaries(weeklyDue: { userId: string; localDate: string; tzOffsetMin: number }[]) {
    const userIds = weeklyDue.map(d => d.userId);
    const allDates = new Set<string>();
    weeklyDue.forEach(d => { for (let i = 0; i < 14; i++) allDates.add(localDateStrDaysAgo(d.tzOffsetMin, i)); });
    const { data: rows } = await admin
      .from("checkins")
      .select("user_id, date")
      .in("user_id", userIds)
      .in("date", [...allDates]);
    const byUser = new Map<string, Set<string>>();
    (rows || []).forEach(r => {
      if (!byUser.has(r.user_id)) byUser.set(r.user_id, new Set());
      byUser.get(r.user_id)!.add(r.date);
    });

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", userIds);
    const subsByUser = new Map<string, typeof subs>();
    (subs || []).forEach(s => {
      if (!subsByUser.has(s.user_id)) subsByUser.set(s.user_id, []);
      subsByUser.get(s.user_id)!.push(s);
    });

    const staleIds: string[] = [];
    await Promise.all(weeklyDue.map(async (d) => {
      const dates = byUser.get(d.userId) || new Set();
      let cur = 0, prev = 0;
      for (let i = 0; i < 7; i++) if (dates.has(localDateStrDaysAgo(d.tzOffsetMin, i))) cur++;
      for (let i = 7; i < 14; i++) if (dates.has(localDateStrDaysAgo(d.tzOffsetMin, i))) prev++;
      const delta = cur - prev;
      const deltaTxt = prev === 0 ? "" : delta === 0 ? " (igual à semana passada)" : ` (${delta > 0 ? "+" : ""}${delta} vs. semana passada)`;
      const payload = JSON.stringify({
        title: "Resumo da semana 📊",
        body: `Você fez check-in em ${cur}/7 dias essa semana${deltaTxt}.`,
        url: "./",
      });
      const userSubs = subsByUser.get(d.userId) || [];
      await Promise.all(userSubs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
        } catch (e) {
          if (e.statusCode === 404 || e.statusCode === 410) staleIds.push(sub.id);
        }
      }));
      const { data: cfgRow } = await admin.from("user_config").select("config").eq("user_id", d.userId).single();
      const newCfg = { ...(cfgRow?.config || {}), lastWeeklySummaryDate: d.localDate };
      await admin.from("user_config").update({ config: newCfg }).eq("user_id", d.userId);
    }));
    if (staleIds.length) await admin.from("push_subscriptions").delete().in("id", staleIds);
  }

  const due: { userId: string; localDate: string; tzOffsetMin: number; localHour: number }[] = [];
  // Resumo semanal: domingo ~20h local, opt-in separado (resumoSemanalAtivo), 1x por semana
  // (guardado como lastWeeklySummaryDate no proprio blob de config, sem tabela/coluna nova).
  const WEEKLY_HOUR = 20;
  const weeklyDue: { userId: string; localDate: string; tzOffsetMin: number }[] = [];
  for (const row of configs || []) {
    const cfg = row.config || {};
    const tzOffsetMin = cfg.tzOffsetMin || 0;
    if (cfg.lembreteAtivo && cfg.lembreteHora) {
      const [h, m] = String(cfg.lembreteHora).split(":").map(Number);
      if (!Number.isNaN(h) && !Number.isNaN(m)) {
        const targetMin = h * 60 + m;
        const localNow = localMinutesNow(tzOffsetMin);
        const diff = Math.min(Math.abs(localNow - targetMin), 1440 - Math.abs(localNow - targetMin));
        if (diff <= WINDOW_MIN) {
          due.push({ userId: row.user_id, localDate: localDateStr(tzOffsetMin), tzOffsetMin, localHour: Math.floor(localNow / 60) });
        }
      }
    }
    if (cfg.resumoSemanalAtivo) {
      const localNow = localMinutesNow(tzOffsetMin);
      const localDow = new Date(Date.now() - tzOffsetMin * 60000).getUTCDay();
      const diff = Math.min(Math.abs(localNow - WEEKLY_HOUR * 60), 1440 - Math.abs(localNow - WEEKLY_HOUR * 60));
      const today = localDateStr(tzOffsetMin);
      if (localDow === 0 && diff <= WINDOW_MIN && cfg.lastWeeklySummaryDate !== today) {
        weeklyDue.push({ userId: row.user_id, localDate: today, tzOffsetMin });
      }
    }
  }

  if (weeklyDue.length) await sendWeeklySummaries(weeklyDue);

  if (!due.length) return new Response(JSON.stringify({ sent: 0, weekly: weeklyDue.length }), { status: 200 });

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
