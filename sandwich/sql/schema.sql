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
