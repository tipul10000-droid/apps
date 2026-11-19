-- Side Quests 23.x (Oren 19.11.2026): trip mini dashboards + public share page + graphics slots.
-- 1) sq_gfx: images for graphic placeholders (one row per slot). Kept OUT of sq_docs so sq_open stays small.
--    Closed to anon (RLS, no policies). Write/read only with the Side Quests code (sq_auth).
-- 2) sq_trip_public(token): the ONLY door for the public share page. Returns one trip (collection 'trips')
--    whose share.on = true and share.token = token (>= 24 chars), ONLY a whitelist of display fields, plus that trip's
--    own images. No write, no listing, nothing from any other collection.
create table if not exists sq_gfx (
  id text primary key,
  mime text not null default 'image/webp',
  data text not null,            -- base64 (no data: prefix)
  w int, h int,
  src text,                      -- upload | drive
  updated_at timestamptz not null default now()
);
alter table sq_gfx enable row level security;
revoke all on sq_gfx from anon, authenticated;

create or replace function sq_gfx_put(p_key text, p_id text, p_data text, p_mime text default 'image/webp', p_w int default null, p_h int default null, p_src text default 'upload')
returns int language plpgsql security definer set search_path = public as $$
begin
  if sq_auth(p_key, 'sidequests') <> 'ok' then return -1; end if;
  if p_id !~ '^[a-z0-9][a-z0-9_-]{2,80}$' then return -2; end if;
  if length(p_data) > 3000000 then return -3; end if;
  if p_data is null or p_data = '' then delete from sq_gfx where id = p_id; return 0; end if;
  insert into sq_gfx(id, mime, data, w, h, src) values (p_id, coalesce(p_mime,'image/webp'), p_data, p_w, p_h, p_src)
  on conflict (id) do update set mime = excluded.mime, data = excluded.data, w = excluded.w, h = excluded.h, src = excluded.src, updated_at = now();
  return 1;
end $$;

create or replace function sq_gfx_get(p_key text, p_ids text[])
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if sq_auth(p_key, 'sidequests') <> 'ok' then return jsonb_build_object('status','bad'); end if;
  return jsonb_build_object('status','ok','gfx', coalesce((select jsonb_object_agg(g.id, jsonb_build_object('mime',g.mime,'data',g.data,'w',g.w,'h',g.h,'at',g.updated_at))
    from sq_gfx g where g.id = any(p_ids)), '{}'::jsonb));
end $$;

create or replace function sq_trip_public(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d jsonb; ids text[];
begin
  if p_token is null or length(p_token) < 24 or p_token !~ '^[A-Za-z0-9_-]+$' then return null; end if;
  select x.data into d from sq_docs x
   where x.app = 'sidequests' and x.collection = 'trips'
     and coalesce(x.data->>'_deleted','false') <> 'true'
     and coalesce((x.data->'share'->>'on')::boolean, false)
     and x.data->'share'->>'token' = p_token
   limit 1;
  if d is null then return null; end if;
  select array_agg(v->>'id') into ids from jsonb_each(coalesce(d->'gfx','{}'::jsonb)) as e(k, v) where v ? 'id';
  return jsonb_build_object(
    'trip', (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from jsonb_each(d) as w(k, v)
              where k = any(array['kind','title','short','flag','who','tagline','from','to','tz','stage','snow','theme',
                'hero_img','desc','stats','next_up','map','days','flights','nights_l','hotels','moves','weather','wx_tip',
                'notes','photos','maps','wa_label','wa_sub','foot','updated_at']))
            || jsonb_build_object('wa', d->'share'->>'wa',
                 'gfx', coalesce((select jsonb_object_agg(e.k, jsonb_build_object('id', e.v->>'id')) from jsonb_each(coalesce(d->'gfx','{}'::jsonb)) as e(k, v) where e.v ? 'id'), '{}'::jsonb)),
    'gfx', coalesce((select jsonb_object_agg(g.id, jsonb_build_object('mime',g.mime,'data',g.data)) from sq_gfx g where g.id = any(coalesce(ids,'{}'))), '{}'::jsonb));
end $$;

revoke all on function sq_gfx_put(text,text,text,text,int,int,text) from public;
revoke all on function sq_gfx_get(text,text[]) from public;
revoke all on function sq_trip_public(text) from public;
grant execute on function sq_gfx_put(text,text,text,text,int,int,text) to anon;
grant execute on function sq_gfx_get(text,text[]) to anon;
grant execute on function sq_trip_public(text) to anon;
