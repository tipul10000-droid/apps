-- מריצים פעם אחת ב-Supabase: SQL Editor -> Run.
-- החליפו את CHANGE_ME בקוד המשפחתי (לפני ההרצה, ולא לשמור אותו במאגר).

create table if not exists dinner_settings (code text not null);
create table if not exists dinner_choices (
  child text not null check (child in ('lia','daniela','evyatar')),
  for_date date not null,
  dish text not null,
  updated_at timestamptz not null default now(),
  primary key (child, for_date)
);

alter table dinner_settings enable row level security;
alter table dinner_choices enable row level security;
-- בלי policies: אין גישה ישירה לטבלאות. הגישה רק דרך הפונקציות למטה.

delete from dinner_settings;
insert into dinner_settings(code) values ('CHANGE_ME');

create or replace function dinner_get(p_code text, p_date date)
returns table(child text, dish text, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from dinner_settings where code = p_code) then
    raise exception 'bad code';
  end if;
  return query select c.child, c.dish, c.updated_at from dinner_choices c where c.for_date = p_date;
end $$;

create or replace function dinner_set(p_code text, p_child text, p_date date, p_dish text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from dinner_settings where code = p_code) then
    raise exception 'bad code';
  end if;
  insert into dinner_choices(child, for_date, dish, updated_at)
  values (p_child, p_date, left(p_dish, 100), now())
  on conflict (child, for_date) do update set dish = excluded.dish, updated_at = now();
end $$;

grant execute on function dinner_get(text, date) to anon;
grant execute on function dinner_set(text, text, date, text) to anon;
