-- (9.11.2026, אורן) משפחות בני דודים: אותה אפליקציה, כמה משפחות. migration: study_families.
-- משפחה a = אביתר, דני, ליה (הקוד הקיים 'parents'). משפחה b = לביא ושילו (קוד הורים משלה: study_secrets 'parents_b').
-- להוסיף משפחה: שורות ב-study_kids + קוד ב-study_secrets ('parents_<fam>') + בצד הלקוח study/profiles.js.
-- קוד הורים רואה ומשנה רק את הילדים של המשפחה שלו. study_parents_check הישנה נשארת "רק משפחה a" (בטוח לכל מה שלא עודכן).
-- הקוד של משפחה b לא במאגר. הגדרה ידנית:
--   insert into public.study_secrets(k,h) values ('parents_b', extensions.crypt('<הקוד>', extensions.gen_salt('bf'))) on conflict (k) do update set h = excluded.h;

create table if not exists public.study_kids (kid text primary key check (kid ~ '^[a-z]{2,16}$'), fam text not null check (fam ~ '^[a-z]$'));
alter table public.study_kids enable row level security;
revoke all on public.study_kids from anon, authenticated;
insert into public.study_kids(kid, fam) values ('evyatar','a'),('dani','a'),('lia','a'),('levi','b'),('shilo','b') on conflict (kid) do update set fam = excluded.fam;

create or replace function public.study_kid_fam(p_kid text) returns text language sql stable security definer set search_path to '' as $$
  select fam from public.study_kids where kid = p_kid $$;
create or replace function public.study_kid_ok(p_kid text) returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.study_kids where kid = p_kid) $$;
revoke all on function public.study_kid_fam(text), public.study_kid_ok(text) from public, anon, authenticated;

-- הבדיקה של מזהה ילד עוברת מרשימה קבועה בטבלאות לרשימה ב-study_kids (בפונקציות)
alter table public.study_progress drop constraint if exists study_progress_kid_check, add constraint study_progress_kid_check check (kid ~ '^[a-z]{2,16}$');
alter table public.study_tests    drop constraint if exists study_tests_kid_check,    add constraint study_tests_kid_check    check (kid ~ '^[a-z]{2,16}$');
alter table public.study_results  drop constraint if exists study_results_kid_check,  add constraint study_results_kid_check  check (kid ~ '^[a-z]{2,16}$');
alter table public.study_requests drop constraint if exists study_requests_kid_check, add constraint study_requests_kid_check check (kid ~ '^[a-z]{2,16}$');
alter table public.study_materials drop constraint if exists study_materials_kid_check, add constraint study_materials_kid_check check (kid ~ '^[a-z]{2,16}$');
alter table public.study_quiz     drop constraint if exists study_quiz_kid_check,     add constraint study_quiz_kid_check     check (kid ~ '^[a-z]{2,16}$');
alter table public.study_content  drop constraint if exists study_content_id_check,   add constraint study_content_id_check   check (id ~ '^[a-z]{2,16}/[a-z0-9_-]{1,30}$');

-- קוד הורים → משפחה ('a' / 'b' / ...), או 'bad' / 'locked'. אותה נעילה כמו קודם (5 שגויים = 30 דקות).
create or replace function public.study_parents_fam(p_pin text)
returns text language plpgsql security definer set search_path to '' as $$
declare v_t public.study_throttle; r record;
begin
  insert into public.study_throttle(k) values ('parents') on conflict (k) do nothing;
  select * into v_t from public.study_throttle where k = 'parents' for update;
  if v_t.locked_until is not null and v_t.locked_until > now() then return 'locked'; end if;
  if coalesce(p_pin, '') <> '' then
    for r in select k, h from public.study_secrets where k = 'parents' or k ~ '^parents_[a-z]$' order by k loop
      if extensions.crypt(p_pin, r.h) = r.h then
        update public.study_throttle set fails = 0, locked_until = null where k = 'parents';
        return case when r.k = 'parents' then 'a' else substr(r.k, 9) end;
      end if;
    end loop;
  end if;
  update public.study_throttle
    set fails = case when v_t.fails + 1 >= 5 then 0 else v_t.fails + 1 end,
        locked_until = case when v_t.fails + 1 >= 5 then now() + interval '30 minutes' else null end
    where k = 'parents';
  return 'bad';
end $$;
-- תאימות: הבדיקה הישנה = רק הקוד של משפחה a
create or replace function public.study_parents_check(p_pin text)
returns text language plpgsql security definer set search_path to '' as $$
declare f text := public.study_parents_fam(p_pin);
begin
  if f in ('bad','locked') then return f; end if;
  return case when f = 'a' then 'ok' else 'bad' end;
end $$;
revoke all on function public.study_parents_fam(text) from public, anon, authenticated;

create or replace function public.study_parents_get(p_pin text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare f text := public.study_parents_fam(p_pin);
begin
  if f in ('bad','locked') then return jsonb_build_object('ok', false, 'err', f); end if;
  return jsonb_build_object('ok', true, 'fam', f,
    'progress', coalesce((select jsonb_agg(jsonb_build_object('kid', p.kid, 'app', p.app, 'device', left(p.device::text, 8),
        'first_at', p.first_at, 'updated_at', p.updated_at, 'data', p.data) order by p.updated_at desc)
      from public.study_progress p left join public.study_resets r on r.kid = p.kid and r.app = p.app
      where public.study_kid_fam(p.kid) = f and (r.at is null or p.updated_at > r.at)), '[]'::jsonb),
    'resets', coalesce((select jsonb_agg(jsonb_build_object('kid', kid, 'app', app, 'at', at)) from public.study_resets where public.study_kid_fam(kid) = f), '[]'::jsonb),
    'tests', coalesce((select jsonb_agg(jsonb_build_object('kid', kid, 'app', app, 'd', d, 'note', note, 'done', done, 'noauto', noauto)) from public.study_tests where public.study_kid_fam(kid) = f), '[]'::jsonb),
    'auto', coalesce((select jsonb_object_agg(kid, public.study_auto_test(kid)) from public.study_kids where fam = f), '{}'::jsonb),
    'results', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'kid', kid, 'app', app, 'd', d, 'note', note, 'score', score) order by d desc) from public.study_results where not hidden and public.study_kid_fam(kid) = f), '[]'::jsonb),
    'lb', case when f = 'a' then coalesce((select jsonb_agg(jsonb_build_object('name', name, 'learned', learned, 'streak', streak, 'best', best, 'updated_at', updated_at)) from public.vocab_lb_players), '[]'::jsonb) else '[]'::jsonb end);
end $$;

create or replace function public.study_parents_set_test(p_pin text, p_kid text, p_app text, p_d date, p_note text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare f text := public.study_parents_fam(p_pin);
begin
  if f in ('bad','locked') then return jsonb_build_object('ok', false, 'err', f); end if;
  if public.study_kid_fam(p_kid) is distinct from f then return jsonb_build_object('ok', false, 'err', 'arg'); end if;
  insert into public.study_tests(kid, app, d, note, done, noauto) values (p_kid, p_app, p_d, left(coalesce(p_note, ''), 80), false, true)
  on conflict (kid, app) do update set d = excluded.d, note = excluded.note, done = false, noauto = true, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.study_parents_result(p_pin text, p_kid text, p_app text, p_d date, p_note text, p_score numeric, p_hide_id bigint default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare f text := public.study_parents_fam(p_pin);
begin
  if f in ('bad','locked') then return jsonb_build_object('ok', false, 'err', f); end if;
  if p_hide_id is not null then
    update public.study_results set hidden = true where id = p_hide_id and public.study_kid_fam(kid) = f;
  else
    if public.study_kid_fam(p_kid) is distinct from f then return jsonb_build_object('ok', false, 'err', 'arg'); end if;
    if (select count(*) from public.study_results) >= 1000 then raise exception 'full'; end if;
    insert into public.study_results(kid, app, d, note, score) values (p_kid, p_app, p_d, left(coalesce(p_note, ''), 80), p_score);
    insert into public.study_tests(kid, app, d, note, done, noauto) values (p_kid, p_app, p_d, left(coalesce(p_note, ''), 80), true, true)
    on conflict (kid, app) do update set done = true, noauto = true, updated_at = now();
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.study_parents_reset(p_pin text, p_kid text, p_app text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare f text := public.study_parents_fam(p_pin);
begin
  if f in ('bad','locked') then return jsonb_build_object('ok', false, 'err', f); end if;
  if public.study_kid_fam(p_kid) is distinct from f or coalesce(p_app,'') !~ '^[a-z_]{1,30}$' then return jsonb_build_object('ok', false, 'err', 'arg'); end if;
  insert into public.study_resets(kid, app, at) values (p_kid, p_app, now()) on conflict (kid, app) do update set at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.study_parents_requests(p_pin text, p_id bigint default null, p_set text default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare f text := public.study_parents_fam(p_pin);
begin
  if f in ('bad','locked') then return jsonb_build_object('ok', false, 'err', f); end if;
  if p_id is not null then
    if p_set = 'done' then update public.study_requests set done = true, done_at = now() where id = p_id and public.study_kid_fam(kid) = f;
    elsif p_set = 'open' then update public.study_requests set done = false, done_at = null where id = p_id and public.study_kid_fam(kid) = f;
    elsif p_set = 'hide' then update public.study_requests set hidden = true where id = p_id and public.study_kid_fam(kid) = f; end if;
  end if;
  return jsonb_build_object('ok', true, 'items', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'kid', kid, 'kind', kind, 'txt', txt, 'done', done, 'at', created_at, 'done_at', done_at) order by done, created_at desc)
    from (select * from public.study_requests where not hidden and public.study_kid_fam(kid) = f order by created_at desc limit 300) r), '[]'::jsonb));
end $$;

create or replace function public.study_parents_quiz(p_pin text, p_kid text, p_cmd text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare f text := public.study_parents_fam(p_pin);
begin
  if f in ('bad','locked') then return jsonb_build_object('ok', false, 'err', f); end if;
  if p_cmd is not null then
    if public.study_kid_fam(p_kid) is distinct from f or p_cmd not in ('unlock','lock','open','auto') then return jsonb_build_object('ok', false, 'err', 'arg'); end if;
    insert into public.study_quiz(kid, cmd, cmd_at) values (p_kid, p_cmd, now())
    on conflict (kid) do update set cmd = p_cmd, cmd_at = now();
  end if;
  return jsonb_build_object('ok', true, 'now', now(), 'items', coalesce((select jsonb_agg(to_jsonb(q)) from public.study_quiz q where public.study_kid_fam(q.kid) = f), '[]'::jsonb));
end $$;

create or replace function public.study_parents_content_approve(p_pin text, p_id text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare f text := public.study_parents_fam(p_pin); k text;
begin
  if f in ('bad','locked') then return jsonb_build_object('ok', false, 'err', f); end if;
  if p_id is null or p_id !~ '^[a-z]{2,16}/[a-z0-9_-]{1,30}$' then return jsonb_build_object('ok', false, 'err', 'arg'); end if;
  k := split_part(p_id, '/', 1);
  if public.study_kid_fam(k) is distinct from f then return jsonb_build_object('ok', false, 'err', 'arg'); end if;
  if exists (select 1 from public.study_content where id = p_id and approved_at is not null) then return jsonb_build_object('ok', true, 'already', true); end if;
  insert into public.study_content(id, approved_at) values (p_id, now()) on conflict (id) do update set approved_at = now();
  insert into public.study_notify(kid, title, body, url)
  values (k, 'יש לך משהו חדש! ✨', 'אבא ואמא פתחו לך תוכן חדש ללמוד. בואו נתחיל!', 'https://tipul10000-droid.github.io/apps/study/' || k || '/');
  return jsonb_build_object('ok', true);
end $$;

-- התראות להורים: כרגע רק משפחה a (הדוחות שהשרת שולח הם של אביתר, דני וליה). לילדים: כל ילד שרשום ב-study_kids.
create or replace function public.study_push_save(p_role text, p_kid text, p_endpoint text, p_p256dh text, p_auth text, p_pin text default null)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare v text;
begin
  if p_role not in ('kid','parent') then raise exception 'bad role'; end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000 then raise exception 'bad endpoint'; end if;
  if char_length(coalesce(p_p256dh,'')) not between 20 and 200 or char_length(coalesce(p_auth,'')) not between 8 and 100 then raise exception 'bad keys'; end if;
  if p_role = 'parent' then
    v := public.study_parents_check(p_pin);
    if v <> 'ok' then return jsonb_build_object('ok', false, 'err', v); end if;
    p_kid := '';
  elsif not public.study_kid_ok(p_kid) then raise exception 'bad kid';
  end if;
  if (select count(*) from public.study_push) >= 200 then raise exception 'full'; end if;
  insert into public.study_push(endpoint, role, kid, p256dh, auth) values (p_endpoint, p_role, p_kid, p_p256dh, p_auth)
  on conflict (endpoint, role, kid) do update set p256dh = excluded.p256dh, auth = excluded.auth, active = true, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- פונקציות של הילד: הרשימה הקבועה מתחלפת ב-study_kid_ok
create or replace function public.study_material_add(p_kid text, p_title text, p_kind text, p_mime text, p_data text, p_thumb text default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare t text := btrim(coalesce(p_title, ''));
begin
  if not public.study_kid_ok(p_kid) or p_kind not in ('img','pdf','note') or t = '' or coalesce(p_data,'') = '' then return jsonb_build_object('ok', false, 'err', 'arg'); end if;
  if char_length(p_data) > 6000000 then return jsonb_build_object('ok', false, 'err', 'big'); end if;
  if (select count(*) from public.study_materials where kid = p_kid and created_at > now() - interval '1 hour') >= 30
     or (select count(*) from public.study_materials where kid = p_kid and not hidden) >= 300 then return jsonb_build_object('ok', false, 'err', 'limit'); end if;
  insert into public.study_materials(kid, title, kind, mime, data, thumb, size)
  values (p_kid, left(t, 80), p_kind, left(coalesce(p_mime, ''), 60), p_data, case when char_length(p_thumb) <= 60000 then p_thumb end, char_length(p_data));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.study_quiz_sync(p_kid text, p_until bigint, p_act integer, p_applied timestamptz)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare r public.study_quiz;
begin
  if not public.study_kid_ok(p_kid) then return '{}'::jsonb; end if;
  insert into public.study_quiz(kid, until_at, act, seen_at, applied_at)
  values (p_kid, case when coalesce(p_until,0) > 0 then to_timestamp(p_until/1000.0) end, greatest(0, least(coalesce(p_act,0), 100000)), now(), p_applied)
  on conflict (kid) do update set until_at = excluded.until_at, act = excluded.act, seen_at = now(),
    applied_at = greatest(public.study_quiz.applied_at, excluded.applied_at)
  returning * into r;
  return jsonb_build_object('cmd', r.cmd, 'cmd_at', r.cmd_at);
end $$;

create or replace function public.study_request_add(p_kid text, p_kind text, p_txt text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare t text := btrim(coalesce(p_txt, '')); nid bigint;
begin
  if not public.study_kid_ok(p_kid) or p_kind not in ('test','quiz','hard','topic','idea','bug') then return jsonb_build_object('ok', false, 'err', 'arg'); end if;
  if t = '' then return jsonb_build_object('ok', false, 'err', 'empty'); end if;
  if (select count(*) from public.study_requests where kid = p_kid and created_at > now() - interval '1 hour') >= 15
     or (select count(*) from public.study_requests) >= 3000 then return jsonb_build_object('ok', false, 'err', 'limit'); end if;
  insert into public.study_requests(kid, kind, txt) values (p_kid, p_kind, left(t, 500)) returning id into nid;
  return jsonb_build_object('ok', true, 'id', nid);
end $$;

create or replace function public.study_state_put(p_kid text, p_app text, p_keys jsonb, p_score integer)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare v_r timestamptz;
begin
  if not public.study_kid_ok(p_kid) or p_app !~ '^[a-z]{2,20}$' then raise exception 'bad'; end if;
  if p_keys is null or jsonb_typeof(p_keys) <> 'object' or pg_column_size(p_keys) >= 200000 then raise exception 'bad data'; end if;
  select at into v_r from public.study_resets where kid = p_kid and app = p_app;
  insert into public.study_state as t (kid, app, keys, score) values (p_kid, p_app, p_keys, coalesce(p_score,0))
  on conflict (kid, app) do update set keys = excluded.keys, score = excluded.score, updated_at = now()
  where excluded.score >= t.score or (v_r is not null and t.updated_at < v_r);
  return found;
end $$;

-- study_report: אין בה רשימת ילדים, הבדיקה היא ה-check של הטבלה. מוסיפים בדיקה מול study_kids.
create or replace function public.study_report(p_device uuid, p_token text, p_kid text, p_app text, p_data jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_h text;
begin
  if p_device is null or p_token is null or char_length(p_token) < 16 then raise exception 'bad credentials'; end if;
  if not public.study_kid_ok(p_kid) then raise exception 'bad kid'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or pg_column_size(p_data) >= 30000 then raise exception 'bad data'; end if;
  v_h := encode(extensions.digest(p_token, 'sha256'), 'hex');
  if not exists (select 1 from public.study_progress where device = p_device and kid = p_kid and app = p_app)
     and (select count(*) from public.study_progress) >= 300 then raise exception 'full'; end if;
  insert into public.study_progress as t (device, token_h, kid, app, data)
  values (p_device, v_h, p_kid, p_app, p_data)
  on conflict (device, kid, app) do update set data = excluded.data, updated_at = now()
  where t.token_h = excluded.token_h;
  return found;
end $$;

-- לוח ההתקדמות המשפחתי (קריאה בלבד, בלי קוד): לכל ילד זמן לימוד (סכום המכשירים), תשובות נכונות (לכל תוכן: המכשיר המתקדם)
-- והסקווישים שאסף (מהגיבוי study_state: כל מפתח שנגמר ב-_sq). רק שמות פרטיים, כוכבים וסקווישים; בלי תשובות, מילים או בקשות.
create or replace function public.study_try_arr(p text) returns jsonb language plpgsql immutable set search_path to '' as $$
begin
  if p is null or left(p, 1) <> '[' then return '[]'::jsonb; end if;
  return case when jsonb_typeof(p::jsonb) = 'array' then p::jsonb else '[]'::jsonb end;
exception when others then return '[]'::jsonb;
end $$;
create or replace function public.study_family_board()
returns jsonb language sql stable security definer set search_path to '' as $$
  with pa as (
    select p.kid, p.app,
      sum(case when p.data->>'sec' ~ '^[0-9]{1,9}(\.[0-9]+)?$' then (p.data->>'sec')::numeric else 0 end) sec,
      max(case when p.data->>'ok' ~ '^[0-9]{1,9}$' then (p.data->>'ok')::numeric else 0 end) ok
    from public.study_progress p left join public.study_resets r on r.kid = p.kid and r.app = p.app
    where r.at is null or p.updated_at > r.at group by p.kid, p.app),
  pk as (select kid, sum(sec) sec, sum(ok) ok from pa group by kid),
  sq as (
    select s.kid, jsonb_agg(distinct e.v) arr
    from public.study_state s left join public.study_resets r on r.kid = s.kid and r.app = s.app
    cross join lateral jsonb_each_text(s.keys) kv
    cross join lateral jsonb_array_elements_text(public.study_try_arr(kv.value)) e(v)
    where (r.at is null or s.updated_at > r.at) and kv.key ~ '_sq$' and e.v ~ '^[a-z0-9_]{1,30}$'
    group by s.kid)
  select jsonb_build_object('items', coalesce(jsonb_agg(jsonb_build_object('kid', k.kid, 'fam', k.fam,
    'sec', round(coalesce(pk.sec, 0)), 'ok', coalesce(pk.ok, 0), 'sq', coalesce(sq.arr, '[]'::jsonb)) order by k.fam, k.kid), '[]'::jsonb))
  from public.study_kids k left join pk on pk.kid = k.kid left join sq on sq.kid = k.kid
$$;
revoke all on function public.study_try_arr(text) from public, anon, authenticated;
revoke all on function public.study_family_board() from public;
grant execute on function public.study_family_board() to anon, authenticated;
