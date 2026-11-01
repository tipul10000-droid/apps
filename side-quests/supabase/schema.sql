-- Side Quests + movies: data layer on Supabase (project family-apps, ref emgtyfksnofzzlutngbf).
-- Snapshot of the live schema taken 2026-11-01 for backup / rebuild. No secrets here:
-- the 6-digit code and the movies key live only as salted sha256 hashes in sq_secrets,
-- and their rows are NOT in this file. To rebuild, insert them yourself (see the end).
-- Requires the pgcrypto extension in schema "extensions" (Supabase default).

create table if not exists public.sq_docs (
  app        text not null,          -- 'sidequests' | 'movies'
  collection text not null,          -- sidequests: topics, projects, settings; movies: movies
  id         text not null,
  data       jsonb default '{}'::jsonb,
  version    integer default 1,
  updated_at timestamptz default now(),
  primary key (app, collection, id)
);

create table if not exists public.sq_secrets (
  app      text primary key,         -- one row per app
  key_hash text,                     -- encode(digest(salt || code, 'sha256'), 'hex')
  salt     text
);

create table if not exists public.sq_throttle (
  app          text primary key,
  fails        integer default 0,
  locked_until timestamptz           -- 5 wrong codes -> locked 30 minutes (per app, all devices)
);

-- RLS on, no policies: anon/authenticated can't touch the tables directly.
alter table public.sq_docs     enable row level security;
alter table public.sq_secrets  enable row level security;
alter table public.sq_throttle enable row level security;

create or replace function public.sq_auth(p_key text, p_app text)
 returns text language plpgsql security definer
 set search_path to 'public', 'extensions'
as $function$
declare s record; t record; good boolean;
begin
  insert into sq_throttle(app) values (p_app) on conflict (app) do nothing;
  select * into t from sq_throttle where app = p_app for update;
  if t.locked_until is not null and t.locked_until > now() then return 'locked'; end if;
  select * into s from sq_secrets where app = p_app;
  good := s.app is not null and s.key_hash = encode(extensions.digest(coalesce(s.salt,'') || coalesce(p_key,''), 'sha256'), 'hex');
  -- movies also accepts the Side Quests code (Oren, 2026-11-01)
  if not good and p_app = 'movies' then
    good := exists (select 1 from sq_secrets x where x.app = 'sidequests'
      and x.key_hash = encode(extensions.digest(coalesce(x.salt,'') || coalesce(p_key,''), 'sha256'), 'hex'));
  end if;
  if good then
    update sq_throttle set fails = 0, locked_until = null where app = p_app;
    return 'ok';
  end if;
  update sq_throttle set fails = fails + 1,
    locked_until = case when fails + 1 >= 5 then now() + interval '30 minutes' else null end
  where app = p_app;
  update sq_throttle set fails = 0 where app = p_app and fails >= 5;
  return 'bad';
end $function$;

create or replace function public.sq_check(p_key text, p_app text)
 returns boolean language plpgsql security definer set search_path to 'public'
as $function$
begin return sq_auth(p_key, p_app) = 'ok'; end $function$;

-- Old bulk reader, blocked on purpose (use sq_open).
create or replace function public.sq_list(p_key text, p_app text)
 returns table(collection text, id text, data jsonb, version integer, updated_at timestamptz)
 language plpgsql security definer set search_path to 'public'
as $function$
begin raise exception 'use sq_open'; end $function$;

-- Read everything of one app: {"status":"ok","rows":[{collection,id,data}]} or {"status":"bad"|"locked"}.
create or replace function public.sq_open(p_key text, p_app text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare st text;
begin
  st := sq_auth(p_key, p_app);
  if st <> 'ok' then return jsonb_build_object('status', st); end if;
  return jsonb_build_object('status','ok','rows', coalesce((select jsonb_agg(jsonb_build_object('collection',d.collection,'id',d.id,'data',d.data)) from sq_docs d where d.app = p_app), '[]'::jsonb));
end $function$;

-- Upsert one doc (p_merge=true merges top-level keys). Returns new version, -1 on bad code.
-- There is no delete: a delete is data._deleted = true.
create or replace function public.sq_put(p_key text, p_app text, p_collection text, p_id text, p_data jsonb, p_merge boolean default false)
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare v int;
begin
  if sq_auth(p_key, p_app) <> 'ok' then return -1; end if;
  insert into sq_docs(app, collection, id, data) values (p_app, p_collection, p_id, coalesce(p_data,'{}'::jsonb))
  on conflict (app, collection, id) do update
    set data = case when p_merge then sq_docs.data || excluded.data else excluded.data end,
        version = sq_docs.version + 1, updated_at = now()
  returning version into v;
  return v;
end $function$;

grant execute on function public.sq_auth(text,text), public.sq_check(text,text), public.sq_list(text,text),
  public.sq_open(text,text), public.sq_put(text,text,text,text,jsonb,boolean) to anon, authenticated;

-- Rebuild only: set a code (run in the SQL editor, never commit the real value).
-- insert into sq_secrets(app, salt, key_hash)
--   select 'sidequests', s, encode(extensions.digest(s || '<CODE>', 'sha256'), 'hex')
--   from (select encode(extensions.gen_random_bytes(16),'hex') s) x
-- on conflict (app) do update set salt = excluded.salt, key_hash = excluded.key_hash;
