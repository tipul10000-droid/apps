-- netflix-il: optional sync of "הרשימה שלי" / "ראיתי" / filters between places (Oren 17.11.2026).
-- iOS gives every home-screen web app its own storage, so the app inside Side Quests and the home-screen icon
-- saw different lists. A random 8-char sync code (made on one device, typed on the other) keys one row.
-- The row holds only Netflix title ids and filter choices, no personal details. Table closed to anon; RPCs only.
create table if not exists public.nf_sync (
  code text primary key check (code ~ '^[A-Z0-9]{8}$'),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.nf_sync enable row level security;
revoke all on public.nf_sync from anon, authenticated;

create or replace function public.nf_sync_get(p_code text) returns jsonb
language sql security definer set search_path = public as $$
  select data from public.nf_sync where code = upper(p_code)
$$;

create or replace function public.nf_sync_put(p_code text, p_data jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if upper(p_code) !~ '^[A-Z0-9]{8}$' or length(p_data::text) > 400000 then return false; end if;
  insert into public.nf_sync(code, data, updated_at) values (upper(p_code), p_data, now())
  on conflict (code) do update set data = excluded.data, updated_at = now();
  return true;
end $$;

revoke all on function public.nf_sync_get(text), public.nf_sync_put(text, jsonb) from public;
grant execute on function public.nf_sync_get(text), public.nf_sync_put(text, jsonb) to anon;
