import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const USER_DATA_TABLES = ["checkins", "user_config", "biblioteca"];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Não autenticado." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Client autenticado como quem chamou a função - só usado para confirmar a identidade
  // do usuário (nunca confiar em um user_id vindo do corpo da requisição).
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !callerData?.user) return jsonResponse({ error: "Sessão inválida." }, 401);
  const userId = callerData.user.id;

  // Service role: única credencial com permissão de apagar linhas de outras contas
  // (RLS bloquearia isso no client normal) e de acessar auth.admin.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  for (const table of USER_DATA_TABLES) {
    const { error } = await adminClient.from(table).delete().eq("user_id", userId);
    if (error) return jsonResponse({ error: `Falha ao apagar dados de "${table}": ${error.message}` }, 500);
  }

  const { error: deleteUserErr } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteUserErr) return jsonResponse({ error: `Falha ao apagar usuário: ${deleteUserErr.message}` }, 500);

  return jsonResponse({ ok: true });
});
