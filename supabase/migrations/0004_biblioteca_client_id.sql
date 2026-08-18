-- client_id: gerado no cliente (crypto.randomUUID()) antes de qualquer chamada ao Supabase,
-- permite que a criação de item na Biblioteca use upsert(onConflict:'client_id') em vez de
-- insert puro — sem isso, reenviar um insert que falhou por rede (fila de retry offline)
-- arriscava duplicar a linha se o insert original tivesse na verdade funcionado no servidor
-- mas a resposta se perdido. Nullable pra não quebrar linhas antigas (sem fila, sem client_id).
alter table public.biblioteca add column if not exists client_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'biblioteca_client_id_key') then
    alter table public.biblioteca add constraint biblioteca_client_id_key unique (client_id);
  end if;
end $$;
