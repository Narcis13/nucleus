-- Attach public.trigger_set_timestamp (defined in 0001_functions.sql) to every
-- table in `public` that has an `updated_at` column. Done via DO block so new
-- tables pick up the trigger automatically on subsequent `supabase db reset`.

do $$
declare
  r record;
begin
  for r in
    select table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name  = 'updated_at'
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at
         before update on public.%I
         for each row execute function public.trigger_set_timestamp();',
      r.table_name, r.table_name
    );
  end loop;
end $$;
