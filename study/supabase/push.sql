-- התראות ל-Study (Web Push) + סנכרון התקדמות בין Safari לאפליקציה במסך הבית + מתנות.
-- כל האובייקטים עם הקידומת study_. הטבלאות סגורות ל-anon (RLS בלי policies). גישה רק דרך הפונקציות.
-- מפתחות VAPID נוצרים בשרת בפעם הראשונה (פונקציית study-push) ונשמרים ב-study_secrets (k = vapid_public / vapid_private).

-- מכשירים רשומים. role: kid (התראות על תוכן חדש ומתנות) או parent (דוחות תרגול והתראות מבחן).
create table if not exists public.study_push (
  endpoint text not null,
  role text not null check (role in ('kid','parent')),
  kid text not null default '',
  p256dh text not null,
  auth text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (endpoint, role, kid)
);
alter table public.study_push enable row level security;

-- יומן מה נשלח (מונע כפילויות): key ייחודי לכל התראה.
create table if not exists public.study_push_log (
  key text primary key,
  at timestamptz not null default now(),
  info jsonb
);
alter table public.study_push_log enable row level security;

-- תמונת מצב לכל מכשיר/ילד/תוכן, כדי לחשב כמה תרגלו מאז הדוח הקודם.
create table if not exists public.study_sess (
  device uuid not null, kid text not null, app text not null,
  sec int not null default 0, att int not null default 0, ok int not null default 0, done int not null default 0,
  seen_at timestamptz not null default now(),
  primary key (device, kid, app)
);
alter table public.study_sess enable row level security;

-- מתנות לילד (למשל סקווישי נוסף כשהכל נכון לפני מבחן). taken_at = הילד קיבל באפליקציה.
create table if not exists public.study_gifts (
  id bigserial primary key,
  kid text not null, app text not null,
  kind text not null default 'bonus',
  note text,
  created_at timestamptz not null default now(),
  taken_at timestamptz
);
alter table public.study_gifts enable row level security;

-- גיבוי התקדמות לכל ילד ותוכן (המפתחות שהתוכן מעביר ל-StudyTrack.init). נשמר הגיבוי עם יותר תשובות.
create table if not exists public.study_state (
  kid text not null, app text not null,
  keys jsonb not null,
  score int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (kid, app)
);
alter table public.study_state enable row level security;

-- תור התראות על תוכן חדש (Claude מוסיף שורה כשנכנס תוכן חדש). kid = '' לכל הילדים.
create table if not exists public.study_notify (
  id bigserial primary key,
  kid text not null default '',
  title text not null, body text not null, url text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.study_notify enable row level security;

create or replace function public.study_push_key() returns text
language sql security definer set search_path = public as $$
  select h from public.study_secrets where k = 'vapid_public'
$$;

-- רישום מכשיר. הורה: רק עם הקוד של אזור ההורים.
create or replace function public.study_push_save(p_role text, p_kid text, p_endpoint text, p_p256dh text, p_auth text, p_pin text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v text;
begin
  if p_role not in ('kid','parent') then raise exception 'bad role'; end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000 then raise exception 'bad endpoint'; end if;
  if char_length(coalesce(p_p256dh,'')) not between 20 and 200 or char_length(coalesce(p_auth,'')) not between 8 and 100 then raise exception 'bad keys'; end if;
  if p_role = 'parent' then
    v := public.study_parents_check(p_pin);
    if v <> 'ok' then return jsonb_build_object('ok', false, 'err', v); end if;
    p_kid := '';
  elsif p_kid not in ('evyatar','dani','lia') then raise exception 'bad kid';
  end if;
  if (select count(*) from public.study_push) >= 200 then raise exception 'full'; end if;
  insert into public.study_push(endpoint, role, kid, p256dh, auth) values (p_endpoint, p_role, p_kid, p_p256dh, p_auth)
  on conflict (endpoint, role, kid) do update set p256dh = excluded.p256dh, auth = excluded.auth, active = true, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.study_push_off(p_endpoint text, p_role text default null, p_kid text default null)
returns boolean language sql security definer set search_path = public as $$
  update public.study_push set active = false, updated_at = now()
  where endpoint = p_endpoint and (p_role is null or role = p_role) and (p_kid is null or kid = p_kid)
  returning true
$$;

-- הילד בודק אם יש לו מתנה שמחכה (מסמן שנלקחה).
create or replace function public.study_gift_take(p_kid text, p_app text)
returns jsonb language sql security definer set search_path = public as $$
  update public.study_gifts set taken_at = now()
  where id = (select id from public.study_gifts where kid = p_kid and app = p_app and taken_at is null order by id limit 1)
  returning jsonb_build_object('id', id, 'kind', kind, 'note', note)
$$;

-- גיבוי ההתקדמות: נשמר רק אם יש בו לפחות אותו מספר תשובות (score), או אם ההורים איפסו אחרי הגיבוי הקודם.
create or replace function public.study_state_put(p_kid text, p_app text, p_keys jsonb, p_score int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_r timestamptz;
begin
  if p_kid not in ('evyatar','dani','lia') or p_app !~ '^[a-z]{2,20}$' then raise exception 'bad'; end if;
  if p_keys is null or jsonb_typeof(p_keys) <> 'object' or pg_column_size(p_keys) >= 200000 then raise exception 'bad data'; end if;
  select at into v_r from public.study_resets where kid = p_kid and app = p_app;
  insert into public.study_state as t (kid, app, keys, score) values (p_kid, p_app, p_keys, coalesce(p_score,0))
  on conflict (kid, app) do update set keys = excluded.keys, score = excluded.score, updated_at = now()
  where excluded.score >= t.score or (v_r is not null and t.updated_at < v_r);
  return found;
end $$;

-- גיבוי שנשמר לפני איפוס מאזור ההורים לא מוחזר.
create or replace function public.study_state_get(p_kid text, p_app text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object('keys', s.keys, 'score', s.score, 'at', s.updated_at) from public.study_state s
  left join public.study_resets r on r.kid = s.kid and r.app = s.app
  where s.kid = p_kid and s.app = p_app and (r.at is null or s.updated_at > r.at)
$$;

-- הרשאות
revoke all on public.study_push, public.study_push_log, public.study_sess, public.study_gifts, public.study_state, public.study_notify from anon, authenticated;
grant execute on function public.study_push_key(), public.study_push_save(text,text,text,text,text,text), public.study_push_off(text,text,text),
  public.study_gift_take(text,text), public.study_state_put(text,text,jsonb,int), public.study_state_get(text,text) to anon;

-- ריצה כל 5 דקות (pg_cron + pg_net):
-- select cron.schedule('study-push', '*/5 * * * *', $$select net.http_post(url := 'https://<project>.supabase.co/functions/v1/study-push?action=tick', body := '{}'::jsonb, headers := '{"Content-Type":"application/json"}'::jsonb)$$);
