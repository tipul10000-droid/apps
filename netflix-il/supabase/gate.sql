-- netflix-il: cap on how many different devices may use the public link (Oren 17.11.2026: 15 for now,
-- so the link stays among a few small groups). Each browser makes a random device id (nf_dev in localStorage).
-- A device that got in stays in. Oren's devices are "owner" and not counted: the copy inside Side Quests
-- (?embed=1), and any device that uses a sync code also used on an owner device.
-- Change the cap: update public.nf_cfg set v = '<n>' where k = 'max';
create table if not exists public.nf_cfg (k text primary key, v text not null);
insert into public.nf_cfg(k, v) values ('max', '15') on conflict (k) do nothing;

create table if not exists public.nf_dev (
  id text primary key check (id ~ '^[a-z0-9]{16,40}$'),
  owner boolean not null default false,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  n integer not null default 1,
  blocked boolean not null default false -- tried to open after the cap was reached
);
alter table public.nf_cfg enable row level security;
alter table public.nf_dev enable row level security;
revoke all on public.nf_cfg, public.nf_dev from anon, authenticated;

alter table public.nf_sync add column if not exists owner boolean not null default false;

create or replace function public.nf_gate(p_dev text, p_sync text default null, p_emb boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare own boolean; d public.nf_dev; cnt int; mx int; den int; ok boolean;
begin
  if p_dev is null or p_dev !~ '^[a-z0-9]{16,40}$' then return jsonb_build_object('ok', true); end if;
  own := coalesce(p_emb, false) or exists(select 1 from public.nf_sync where code = upper(coalesce(p_sync, '')) and owner);
  select v::int into mx from public.nf_cfg where k = 'max';
  select count(*) into cnt from public.nf_dev where not owner and not blocked;
  select * into d from public.nf_dev where id = p_dev;
  if found then
    own := own or d.owner;
    ok := own or not d.blocked or cnt < mx;
    update public.nf_dev set last_at = now(), n = n + 1, owner = own, blocked = not ok where id = p_dev;
  else
    ok := own or cnt < mx;
    insert into public.nf_dev(id, owner, blocked) values (p_dev, own, not ok);
  end if;
  if own then
    -- a sync code used on an owner device becomes an owner code, so Oren's other places (home-screen icon) join it
    if p_sync is not null then update public.nf_sync set owner = true where code = upper(p_sync) and not owner; end if;
    select count(*) filter (where not owner and not blocked), count(*) filter (where blocked) into cnt, den from public.nf_dev;
    return jsonb_build_object('ok', ok, 'owner', true, 'n', cnt, 'max', mx, 'denied', den);
  end if;
  return jsonb_build_object('ok', ok);
end $$;

revoke all on function public.nf_gate(text, text, boolean) from public;
grant execute on function public.nf_gate(text, text, boolean) to anon;
