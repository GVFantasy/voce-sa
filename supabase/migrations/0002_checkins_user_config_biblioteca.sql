-- Documenta retroativamente o schema de checkins/user_config/biblioteca (criadas direto no
-- painel Supabase antes de existir controle de versão de migrations no repo). Escrita de forma
-- idempotente (IF NOT EXISTS / DO blocks com guarda) para poder rodar com segurança contra um
-- banco que já tem essas tabelas, sem duplicar nada.
--
-- Também corrige, nesta mesma migration, uma falha de segurança encontrada durante o
-- levantamento: as 3 tabelas estavam com RLS desativado e grant total (SELECT/INSERT/UPDATE/
-- DELETE) para os papéis "anon" e "authenticated" — ou seja, qualquer requisição usando a chave
-- pública do app (exposta no client) conseguia ler/alterar/apagar dados de QUALQUER usuário, sem
-- precisar nem estar autenticada. RLS + policies por dono já foram aplicadas manualmente em
-- produção via SQL Editor antes desta migration existir; este arquivo só a torna reproduzível.

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  date text not null,
  habits jsonb not null default '{}'::jsonb,
  energy integer default 0,
  nota text default '',
  plan_id text default 'principal',
  created_at timestamptz default now(),
  unique (user_id, date)
);

create table if not exists public.user_config (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.biblioteca (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  tipo text default 'livro',
  titulo text not null,
  nota text default '',
  created_at timestamptz default now()
);

create index if not exists checkins_user_id_date_idx on public.checkins (user_id, date);
create index if not exists checkins_plan_id on public.checkins (user_id, plan_id);
create index if not exists user_config_user_id_idx on public.user_config (user_id);
create index if not exists biblioteca_user_id_created_at_idx on public.biblioteca (user_id, created_at desc);

alter table public.checkins enable row level security;
alter table public.user_config enable row level security;
alter table public.biblioteca enable row level security;

-- a chave pública (anon) não deve ter acesso nenhum a essas 3 tabelas — só usuários autenticados,
-- e mesmo assim só ao próprio dado, via as policies abaixo.
revoke all on public.checkins from anon;
revoke all on public.user_config from anon;
revoke all on public.biblioteca from anon;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'checkins' and policyname = 'checkins_owner_select') then
    create policy "checkins_owner_select" on public.checkins for select to authenticated using (auth.uid()::text = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'checkins' and policyname = 'checkins_owner_insert') then
    create policy "checkins_owner_insert" on public.checkins for insert to authenticated with check (auth.uid()::text = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'checkins' and policyname = 'checkins_owner_update') then
    create policy "checkins_owner_update" on public.checkins for update to authenticated using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'checkins' and policyname = 'checkins_owner_delete') then
    create policy "checkins_owner_delete" on public.checkins for delete to authenticated using (auth.uid()::text = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_config' and policyname = 'user_config_owner_select') then
    create policy "user_config_owner_select" on public.user_config for select to authenticated using (auth.uid()::text = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_config' and policyname = 'user_config_owner_insert') then
    create policy "user_config_owner_insert" on public.user_config for insert to authenticated with check (auth.uid()::text = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_config' and policyname = 'user_config_owner_update') then
    create policy "user_config_owner_update" on public.user_config for update to authenticated using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_config' and policyname = 'user_config_owner_delete') then
    create policy "user_config_owner_delete" on public.user_config for delete to authenticated using (auth.uid()::text = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'biblioteca' and policyname = 'biblioteca_owner_select') then
    create policy "biblioteca_owner_select" on public.biblioteca for select to authenticated using (auth.uid()::text = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'biblioteca' and policyname = 'biblioteca_owner_insert') then
    create policy "biblioteca_owner_insert" on public.biblioteca for insert to authenticated with check (auth.uid()::text = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'biblioteca' and policyname = 'biblioteca_owner_update') then
    create policy "biblioteca_owner_update" on public.biblioteca for update to authenticated using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'biblioteca' and policyname = 'biblioteca_owner_delete') then
    create policy "biblioteca_owner_delete" on public.biblioteca for delete to authenticated using (auth.uid()::text = user_id);
  end if;
end $$;
