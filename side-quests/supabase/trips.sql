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
  -- the shared page is clean and experiential (Oren 21.11.2026): costs, open tasks, problems and worries stay in the
  -- owner's page only. `pub` = public versions of display fields (e.g. next_up without the open task, flights without
  -- "seats not chosen yet"), and they replace the owner's version here. Same list as PUB in side-quests/trip.html.
  d := d || coalesce((select jsonb_object_agg(k, v) from jsonb_each(case when jsonb_typeof(d->'pub') = 'object' then d->'pub' else '{}'::jsonb end) as p(k, v)
                      where k = any(array['title','short','flag','who','tagline','when','hero_img','hero_full','desc','stats','next_up','alerts',
                        'map','days','flights','nights_l','hotels','moves','weather','wx_tip','notes','notes_h','notes_i','photos','maps',
                        'wa_label','wa_sub','foot','dest','lounge','gear','gear_h','pack'])), '{}'::jsonb);
  select array_agg(v->>'id') into ids from jsonb_each(coalesce(d->'gfx','{}'::jsonb)) as e(k, v) where v ? 'id';
  return jsonb_build_object(
    'trip', (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from jsonb_each(d) as w(k, v)
              where k = any(array['kind','title','short','flag','who','tagline','from','to','tz','stage','snow','theme','when',
                'hero_img','hero_full','desc','stats','next_up','alerts','map','days','flights','nights_l','hotels','moves','weather','wx_tip',
                'notes','notes_h','notes_i','photos','maps','wa_label','wa_sub','foot','dest','lounge','gear_h','pack','updated_at']))
            -- gear bought for the trip, without prices (21.11.2026)
            || case when jsonb_typeof(d->'gear') = 'array' then jsonb_build_object('gear', (select coalesce(jsonb_agg(v - 'price' - 'ccy' - 'order' order by o), '[]'::jsonb) from jsonb_array_elements(d->'gear') with ordinality e(v, o))) else '{}'::jsonb end
            || jsonb_build_object('wa', d->'share'->>'wa',
                 'gfx', coalesce((select jsonb_object_agg(e.k, jsonb_build_object('id', e.v->>'id', 'banner', coalesce((e.v->>'banner')::boolean, false))) from jsonb_each(coalesce(d->'gfx','{}'::jsonb)) as e(k, v) where e.v ? 'id'), '{}'::jsonb)),
    'gfx', coalesce((select jsonb_object_agg(g.id, jsonb_build_object('mime',g.mime,'data',g.data,'w',g.w,'h',g.h)) from sq_gfx g where g.id = any(coalesce(ids,'{}'))), '{}'::jsonb));
end $$;

revoke all on function sq_gfx_put(text,text,text,text,int,int,text) from public;
revoke all on function sq_gfx_get(text,text[]) from public;
revoke all on function sq_trip_public(text) from public;
grant execute on function sq_gfx_put(text,text,text,text,int,int,text) to anon;
grant execute on function sq_gfx_get(text,text[]) to anon;
grant execute on function sq_trip_public(text) to anon;

-- Gear & preparations (Oren 21.11.2026): the packing list per person on the shared page. Everyone with the link can add an
-- item, tick it ready or remove it. The ONLY write door for the public page: touches nothing but data.pack.people[].items
-- of the one trip whose share is on and whose token matches. Limits: 120 chars, 150 items per person.
create or replace function sq_trip_pack(p_token text, p_op jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare did text; d jsonb; pk jsonb; ppl jsonb; its jsonb; px int; a text; iid text; txt text;
begin
  if p_token is null or length(p_token) < 24 or p_token !~ '^[A-Za-z0-9_-]+$' then return null; end if;
  if p_op is null or jsonb_typeof(p_op) <> 'object' then return null; end if;
  a := p_op->>'a'; iid := p_op->>'id';
  if a not in ('add','tog','del') or iid is null or iid !~ '^[a-z0-9]{2,24}$' then return null; end if;
  select x.id, x.data into did, d from sq_docs x
   where x.app = 'sidequests' and x.collection = 'trips'
     and coalesce(x.data->>'_deleted','false') <> 'true'
     and coalesce((x.data->'share'->>'on')::boolean, false)
     and x.data->'share'->>'token' = p_token
   limit 1 for update;
  if d is null then return null; end if;
  pk := case when jsonb_typeof(d->'pack') = 'object' then d->'pack' else '{}'::jsonb end;
  ppl := case when jsonb_typeof(pk->'people') = 'array' then pk->'people' else '[]'::jsonb end;
  select (o - 1)::int into px from jsonb_array_elements(ppl) with ordinality e(v, o) where v->>'id' = p_op->>'p' limit 1;
  if px is null then return null; end if;
  its := case when jsonb_typeof(ppl->px->'items') = 'array' then ppl->px->'items' else '[]'::jsonb end;
  if a = 'add' then
    txt := left(btrim(coalesce(p_op->>'t','')), 120);
    if txt = '' or jsonb_array_length(its) >= 150 or exists (select 1 from jsonb_array_elements(its) e(v) where v->>'id' = iid) then return pk; end if;
    its := its || jsonb_build_array(jsonb_build_object('id', iid, 't', txt, 'done', false, 'via', 'share'));
  elsif a = 'tog' then
    its := coalesce((select jsonb_agg(case when v->>'id' = iid then v || jsonb_build_object('done', coalesce((p_op->>'done')::boolean, false)) else v end order by o) from jsonb_array_elements(its) with ordinality e(v, o)), '[]'::jsonb);
  else
    its := coalesce((select jsonb_agg(v order by o) from jsonb_array_elements(its) with ordinality e(v, o) where v->>'id' <> iid), '[]'::jsonb);
  end if;
  ppl := jsonb_set(ppl, array[px::text, 'items'], its);
  pk := jsonb_set(pk, '{people}', ppl);
  update sq_docs set data = data || jsonb_build_object('pack', pk, 'updated_at', to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"')),
         version = version + 1, updated_at = now()
   where app = 'sidequests' and collection = 'trips' and id = did;
  return pk;
end $$;
revoke all on function sq_trip_pack(text, jsonb) from public;
grant execute on function sq_trip_pack(text, jsonb) to anon;
