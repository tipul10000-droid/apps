-- לוח דירוג של אפליקציית אוצר המילים. מופעל בפרויקט Supabase "family-apps" (migration: vocab_leaderboard).
-- הטבלה סגורה ל-anon; הגישה רק דרך הפונקציות. הקוד ב-index.html קורא להן ב-/rest/v1/rpc/.
create table public.vocab_lb_players (
  id uuid primary key,
  token text not null,
  name text not null check (char_length(name) between 1 and 20),
  learned int not null default 0 check (learned between 0 and 5000),
  streak int not null default 0 check (streak between 0 and 100000),
  best int not null default 0 check (best between 0 and 100000),
  updated_at timestamptz not null default now()
);
alter table public.vocab_lb_players enable row level security;
revoke all on public.vocab_lb_players from anon, authenticated;

create or replace function public.vocab_lb_upsert(p_id uuid, p_token text, p_name text, p_learned int, p_streak int, p_best int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := left(btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g')), 20);
  v_learned int := least(greatest(coalesce(p_learned, 0), 0), 5000);
  v_streak int := least(greatest(coalesce(p_streak, 0), 0), 100000);
  v_best int := least(greatest(coalesce(p_best, 0), coalesce(p_streak, 0), 0), 100000);
begin
  if p_id is null or p_token is null or char_length(p_token) < 16 then
    raise exception 'bad credentials';
  end if;
  if char_length(v_name) < 1 then
    raise exception 'bad name';
  end if;
  if not exists (select 1 from public.vocab_lb_players where id = p_id)
     and (select count(*) from public.vocab_lb_players) >= 500 then
    raise exception 'leaderboard full';
  end if;
  insert into public.vocab_lb_players as t (id, token, name, learned, streak, best)
  values (p_id, p_token, v_name, v_learned, v_streak, v_best)
  on conflict (id) do update
    set name = excluded.name,
        learned = excluded.learned,
        streak = excluded.streak,
        best = greatest(t.best, excluded.best),
        updated_at = now()
    where t.token = excluded.token;
  return found;
end;
$$;

create or replace function public.vocab_lb_get()
returns table (id uuid, name text, learned int, streak int, best int, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name, p.learned, p.streak, p.best, p.updated_at
  from public.vocab_lb_players p
  order by p.learned desc, p.best desc
  limit 200;
$$;

revoke all on function public.vocab_lb_upsert(uuid, text, text, int, int, int) from public;
revoke all on function public.vocab_lb_get() from public;
grant execute on function public.vocab_lb_upsert(uuid, text, text, int, int, int) to anon, authenticated;
grant execute on function public.vocab_lb_get() to anon, authenticated;
