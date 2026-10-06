-- שלב 1: מריצים את כל הקובץ הזה פעם אחת ב-Supabase (SQL Editor -> Run).
-- שלב 2: מריצים שורה נפרדת עם הקוד המשפחתי (לא שומרים אותו במאגר):
--   insert into sandwich_settings(code) values ('הקוד-שלכם');

create table if not exists sandwich_settings (code text not null);
create table if not exists sandwich_choices (
  child text not null check (child in ('lia','daniela','evyatar')),
  for_date date not null,
  dish text not null,
  updated_at timestamptz not null default now(),
  primary key (child, for_date)
);

alter table sandwich_settings enable row level security;
alter table sandwich_choices enable row level security;
-- בלי policies: אין גישה ישירה לטבלאות. הגישה רק דרך הפונקציות למטה.

create or replace function sandwich_get(p_code text, p_date date)
returns table(child text, dish text, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from sandwich_settings where code = p_code) then
    raise exception 'bad code';
  end if;
  return query select c.child, c.dish, c.updated_at from sandwich_choices c where c.for_date = p_date;
end $$;

create or replace function sandwich_set(p_code text, p_child text, p_date date, p_dish text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from sandwich_settings where code = p_code) then
    raise exception 'bad code';
  end if;
  insert into sandwich_choices(child, for_date, dish, updated_at)
  values (p_child, p_date, left(p_dish, 100), now())
  on conflict (child, for_date) do update set dish = excluded.dish, updated_at = now();
end $$;

grant execute on function sandwich_get(text, date) to anon;
grant execute on function sandwich_set(text, text, date, text) to anon;
