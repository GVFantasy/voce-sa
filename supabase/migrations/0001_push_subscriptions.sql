-- Tabela de inscrições Web Push (uma linha por dispositivo/navegador inscrito)
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

create policy "usuário gerencia suas próprias inscrições push"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Agendamento da Edge Function send-reminders via pg_cron + pg_net, a cada 15 minutos.
-- O service role key fica guardado no Vault (nunca em texto puro nesta migration) --
-- rodar uma única vez antes deste bloco, no SQL Editor do painel Supabase:
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select
  cron.schedule(
    'send-reminders-every-15min',
    '*/15 * * * *',
    $$
    select net.http_post(
      url := 'https://dwazoldkxgscdkpzaqsj.supabase.co/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
    $$
  )
where not exists (select 1 from cron.job where jobname = 'send-reminders-every-15min');
