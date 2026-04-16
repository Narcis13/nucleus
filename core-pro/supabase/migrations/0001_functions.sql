-- Shared trigger functions used by tables with updated_at.
-- Applied before Drizzle-generated schema so tables can reference these functions
-- (the trigger *attachments* happen post-schema in 9903_triggers.sql).

create or replace function public.trigger_set_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
