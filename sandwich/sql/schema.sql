-- מריצים את כל הקובץ הזה פעם אחת ב-Supabase (SQL Editor -> Run).
-- בלי קוד משפחתי: מי שיש לו את הלינק לאפליקציה יכול לבחור ולראות.
-- הגישה לטבלה רק דרך שתי הפונקציות למטה, ואפשר לכתוב רק לשלושת הילדים.

create table if not exists sandwich_choices (
  child text not null check (child in ('lia','daniela','evyatar')),
  for_date date not null,
  dish text not null,
  updated_at timestamptz not null default now(),
  primary key (child, for_date)
);

alter table sandwich_choices enable row level security;
-- בלי policies: אין גישה ישירה לטבלה. הגישה רק דרך הפונקציות.

create or replace function sandwich_get(p_date date)
returns table(child text, dish text, updated_at timestamptz)
language sql security definer set search_path = public as $$
  select c.child, c.dish, c.updated_at from sandwich_choices c where c.for_date = p_date;
$$;

create or replace function sandwich_set(p_child text, p_date date, p_dish text)
returns void
language sql security definer set search_path = public as $$
  insert into sandwich_choices(child, for_date, dish, updated_at)
  values (p_child, p_date, left(p_dish, 100), now())
  on conflict (child, for_date) do update set dish = excluded.dish, updated_at = now();
$$;

grant execute on function sandwich_get(date) to anon;
grant execute on function sandwich_set(text, date, text) to anon;

-- ===== תזכורות (התראות דחיפה) =====
-- הפונקציה בענן: sandwich/supabase/send-reminders/index.ts (נפרסת ב-Supabase עם JWT פעיל).
-- תזמון: כל שעה עגולה; הפונקציה שולחת רק ב-17:00 וב-19:00 (שעון ישראל) לילדים שעוד לא בחרו.
-- מחליפים את <ANON_KEY> במפתח הציבורי (anon) של הפרויקט:
--   select cron.schedule('sandwich-reminders', '0 * * * *', $$select net.http_post(
--     url := 'https://<PROJECT>.supabase.co/functions/v1/send-reminders',
--     headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <ANON_KEY>'),
--     body := '{}'::jsonb)$$);

create table if not exists sandwich_push (
  endpoint text primary key,
  child text not null check (child in ('lia','daniela','evyatar')),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create table if not exists sandwich_push_log (
  for_date date not null,
  slot int not null,
  sent_at timestamptz not null default now(),
  primary key (for_date, slot)
);
-- מפתחות VAPID נוצרים ונשמרים כאן על ידי הפונקציה בענן. לא נכנסים למאגר.
create table if not exists sandwich_secrets (
  name text primary key,
  value text not null
);
alter table sandwich_push enable row level security;
alter table sandwich_push_log enable row level security;
alter table sandwich_secrets enable row level security;

create or replace function sandwich_push_save(p_child text, p_endpoint text, p_p256dh text, p_auth text)
returns void
language sql security definer set search_path = public as $$
  insert into sandwich_push(endpoint, child, p256dh, auth)
  values (left(p_endpoint, 1000), p_child, left(p_p256dh, 200), left(p_auth, 100))
  on conflict (endpoint) do update set child = excluded.child, p256dh = excluded.p256dh, auth = excluded.auth;
$$;
grant execute on function sandwich_push_save(text, text, text, text) to anon;
