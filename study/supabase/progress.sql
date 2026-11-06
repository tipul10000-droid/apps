-- התקדמות הילדים ואזור ההורים של study. פרויקט Supabase "family-apps" (migration: study_progress).
-- כל האובייקטים עם הקידומת study_. הטבלאות סגורות ל-anon; גישה רק דרך הפונקציות.
-- קוד ההורים לא במאגר: נשמר כ-hash (bcrypt) ב-study_secrets, מוגדר ידנית:
--   insert into public.study_secrets(k,h) values ('parents', extensions.crypt('<הקוד>', extensions.gen_salt('bf')))
--   on conflict (k) do update set h = excluded.h;

create table public.study_progress (
  device uuid not null,
  token_h text not null,
  kid text not null check (kid in ('evyatar','dani','lia')),
  app text not null check (app ~ '^[a-z0-9_]{1,24}$'),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 30000),
  first_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (device, kid, app)
);
create table public.study_secrets (k text primary key, h text not null);
create table public.study_throttle (k text primary key, fails int not null default 0, locked_until timestamptz);
create table public.study_tests (
  kid text not null check (kid in ('evyatar','dani','lia')),
  app text not null check (app ~ '^[a-z0-9_]{1,24}$'),
  d date, note text check (char_length(note) <= 80),
  updated_at timestamptz not null default now(),
  primary key (kid, app)
);
alter table public.study_progress enable row level security;
alter table public.study_secrets enable row level security;
alter table public.study_throttle enable row level security;
alter table public.study_tests enable row level security;
revoke all on public.study_progress, public.study_secrets, public.study_throttle, public.study_tests from anon, authenticated;

-- דיווח מהמכשיר של הילד. שורה לכל (מכשיר, ילד, אפליקציה); רק מי שמחזיק ב-token של המכשיר מעדכן אותה.
create or replace function public.study_report(p_device uuid, p_token text, p_kid text, p_app text, p_data jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_h text;
begin
  if p_device is null or p_token is null or char_length(p_token) < 16 then raise exception 'bad credentials'; end if;
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

-- בדיקת קוד ההורים: 5 שגויים נועלים ל-30 דקות. מחזירה ok / bad / locked (בלי exception, כדי שהספירה תישמר).
create or replace function public.study_parents_check(p_pin text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_t public.study_throttle; v_h text;
begin
  insert into public.study_throttle(k) values ('parents') on conflict (k) do nothing;
  select * into v_t from public.study_throttle where k = 'parents' for update;
  if v_t.locked_until is not null and v_t.locked_until > now() then return 'locked'; end if;
  select h into v_h from public.study_secrets where k = 'parents';
  if v_h is not null and coalesce(p_pin, '') <> '' and extensions.crypt(p_pin, v_h) = v_h then
    update public.study_throttle set fails = 0, locked_until = null where k = 'parents';
    return 'ok';
  end if;
  update public.study_throttle
    set fails = case when v_t.fails + 1 >= 5 then 0 else v_t.fails + 1 end,
        locked_until = case when v_t.fails + 1 >= 5 then now() + interval '30 minutes' else null end
    where k = 'parents';
  return 'bad';
end $$;

create or replace function public.study_parents_get(p_pin text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v text := public.study_parents_check(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('ok', false, 'err', v); end if;
  return jsonb_build_object('ok', true,
    'progress', coalesce((select jsonb_agg(jsonb_build_object('kid', kid, 'app', app, 'device', left(device::text, 8),
        'first_at', first_at, 'updated_at', updated_at, 'data', data) order by updated_at desc) from public.study_progress), '[]'::jsonb),
    'tests', coalesce((select jsonb_agg(jsonb_build_object('kid', kid, 'app', app, 'd', d, 'note', note)) from public.study_tests), '[]'::jsonb));
end $$;

create or replace function public.study_parents_set_test(p_pin text, p_kid text, p_app text, p_d date, p_note text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v text := public.study_parents_check(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('ok', false, 'err', v); end if;
  insert into public.study_tests(kid, app, d, note) values (p_kid, p_app, p_d, left(coalesce(p_note, ''), 80))
  on conflict (kid, app) do update set d = excluded.d, note = excluded.note, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- תאריך ההכתבה/המבחן הקרוב, כדי שהאפליקציה של הילד תציג ספירה לאחור (לא סודי).
create or replace function public.study_test_get(p_kid text, p_app text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((select jsonb_build_object('d', d, 'note', note) from public.study_tests where kid = p_kid and app = p_app), '{}'::jsonb);
$$;

revoke all on function public.study_report(uuid, text, text, text, jsonb), public.study_parents_check(text),
  public.study_parents_get(text), public.study_parents_set_test(text, text, text, date, text), public.study_test_get(text, text) from public;
grant execute on function public.study_report(uuid, text, text, text, jsonb), public.study_parents_get(text),
  public.study_parents_set_test(text, text, text, date, text), public.study_test_get(text, text) to anon, authenticated;
