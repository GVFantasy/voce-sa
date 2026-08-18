-- Biblioteca ganha status de leitura e avaliação — ambos nullable (linhas antigas continuam
-- válidas sem esses campos, tratadas no código como "sem status definido").
alter table public.biblioteca add column if not exists status text;
alter table public.biblioteca add column if not exists rating smallint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'biblioteca_status_check') then
    alter table public.biblioteca add constraint biblioteca_status_check
      check (status is null or status in ('quero_ler', 'lendo', 'concluido'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'biblioteca_rating_check') then
    alter table public.biblioteca add constraint biblioteca_rating_check
      check (rating is null or (rating >= 1 and rating <= 5));
  end if;
end $$;
