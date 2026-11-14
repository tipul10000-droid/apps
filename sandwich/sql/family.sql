-- ===== משפחה שנייה (גרסה 20261114a) =====
-- אותה אפליקציה ואותו לינק למשפחה נוספת (משפחה "b": ילדים ron, omer, uri ואמא mom_b).
-- ההפרדה: כל ילד/ה/אמא הם מזהים ייחודיים בטבלאות שמפתחן הוא child (בחירות, מנה יומית, הערות, התראות),
-- ובטבלאות ברמת מנה (לא זמין / חזר) נוספה עמודה fam ('a' = המשפחה הראשונה, 'b' = השנייה).
-- כל הפונקציות החדשות מקבלות p_fam עם ברירת מחדל 'a', כך שגרסאות ישנות של האפליקציה ממשיכות לעבוד.
-- הרצה חד-פעמית. כבר הורצה על family-apps ב-14.11.2026.

-- 1. מזהים מותרים
alter table sandwich_choices drop constraint sandwich_choices_child_check;
alter table sandwich_choices add constraint sandwich_choices_child_check check (child in ('lia','daniela','evyatar','ron','omer','uri'));
alter table sandwich_daily drop constraint sandwich_daily_child_check;
alter table sandwich_daily add constraint sandwich_daily_child_check check (child in ('lia','daniela','evyatar','ron','omer','uri'));
alter table sandwich_dish_notes drop constraint sandwich_dish_notes_child_check;
alter table sandwich_dish_notes add constraint sandwich_dish_notes_child_check check (child in ('lia','daniela','evyatar','ron','omer','uri'));
alter table sandwich_push drop constraint sandwich_push_child_check;
alter table sandwich_push add constraint sandwich_push_child_check check (child in ('lia','daniela','evyatar','mom','admin','ron','omer','uri','mom_b'));

-- 2. זמינות מנות וחזרה לתפריט: לפי משפחה
alter table sandwich_unavailable add column fam text not null default 'a';
alter table sandwich_unavailable drop constraint sandwich_unavailable_pkey;
alter table sandwich_unavailable add primary key (fam, dish);
alter table sandwich_returned add column fam text not null default 'a';
alter table sandwich_returned drop constraint sandwich_returned_pkey;
alter table sandwich_returned add primary key (fam, dish);

create or replace function sandwich_note_return() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if now() - old.since >= interval '4 days' then
    insert into sandwich_returned(fam, dish, back_at) values (old.fam, old.dish, now()) on conflict (fam, dish) do update set back_at = now();
  end if;
  return old;
end $$;

drop function if exists sandwich_unavail_get();
create or replace function sandwich_unavail_get(p_fam text default 'a') returns table(dish text)
language sql security definer set search_path = public as $$
  select u.dish from sandwich_unavailable u where u.fam = case when p_fam = 'b' then 'b' else 'a' end order by u.since $$;

drop function if exists sandwich_unavail_set(text, boolean);
create or replace function sandwich_unavail_set(p_dish text, p_off boolean, p_fam text default 'a') returns void
language plpgsql security definer set search_path = public as $$
declare f text := case when p_fam = 'b' then 'b' else 'a' end;
begin
  if p_off then insert into sandwich_unavailable(fam, dish) values (f, left(p_dish,100)) on conflict (fam, dish) do nothing;
  else delete from sandwich_unavailable where fam = f and dish = left(p_dish,100); end if;
  insert into sandwich_events(child, type, dish) values (case when f = 'b' then 'mom_b' else 'mom' end, case when p_off then 'avail_off' else 'avail_on' end, left(p_dish,100));
end $$;

drop function if exists sandwich_returned_get();
create or replace function sandwich_returned_get(p_fam text default 'a') returns table(dish text)
language sql security definer set search_path = public as $$
  select r.dish from sandwich_returned r where r.fam = case when p_fam = 'b' then 'b' else 'a' end and r.back_at > now() - interval '3 days' $$;

-- 3. פונקציות שבודקות מזהים
create or replace function sandwich_daily_set(p_child text, p_dish text) returns void
language plpgsql security definer set search_path = public as $$
declare d text := left(coalesce(p_dish,''), 100); prev text;
begin
  if p_child not in ('lia','daniela','evyatar','ron','omer','uri') then raise exception 'bad child'; end if;
  select dish into prev from sandwich_daily where child = p_child;
  if d = '' then
    delete from sandwich_daily where child = p_child;
    insert into sandwich_events(child, type, prev_dish) values (p_child, 'daily_clear', prev);
  else
    insert into sandwich_daily(child, dish, updated_at) values (p_child, d, now())
      on conflict (child) do update set dish = excluded.dish, updated_at = now();
    insert into sandwich_events(child, type, dish, prev_dish) values (p_child, 'daily_set', d, prev);
  end if;
end $$;

create or replace function sandwich_note_set(p_child text, p_dish text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare t text := left(btrim(coalesce(p_note,'')), 160);
begin
  if p_child not in ('lia','daniela','evyatar','ron','omer','uri') or coalesce(p_dish,'') = '' then return; end if;
  if t = '' then
    delete from sandwich_dish_notes where child = p_child and dish = left(p_dish,100);
    insert into sandwich_events(child, type, dish) values (p_child, 'note_clear', left(p_dish,100));
  else
    insert into sandwich_dish_notes(child, dish, note) values (p_child, left(p_dish,100), t)
    on conflict (child, dish) do update set note = excluded.note, updated_at = now();
    insert into sandwich_events(child, type, dish) values (p_child, 'note_set', left(p_dish,100));
  end if;
end $$;

create or replace function sandwich_log(p_child text, p_type text, p_meta jsonb) returns void
language sql security definer set search_path = public as $$
  insert into sandwich_events(child, type, meta)
  select p_child, p_type, p_meta where p_type = 'app_open' and p_child in ('lia','daniela','evyatar','mom','ron','omer','uri','mom_b')
$$;

-- 4. סטטיסטיקה לפי משפחה
drop function if exists sandwich_stats();
create or replace function sandwich_stats(p_fam text default 'a') returns jsonb
language sql security definer set search_path = public as $$
  with k as (select case when p_fam = 'b' then array['ron','omer','uri'] else array['lia','daniela','evyatar'] end ks)
  select jsonb_build_object(
    'choices', coalesce((select jsonb_agg(jsonb_build_object('c', child, 'd', for_date, 'x', dish) order by for_date)
      from sandwich_choices where dish <> '' and child = any((select ks from k)::text[]) and for_date between date '2026-10-01' and current_date + 10), '[]'::jsonb),
    'ev', coalesce((select jsonb_agg(r) from (
      select child as c,
        count(*) filter (where type = 'choose') as chooses,
        count(*) filter (where type = 'change') as changes,
        count(*) filter (where type = 'choose' and meta ? 'secs_since_open') as n_s,
        round(avg((meta->>'secs_since_open')::numeric) filter (where type = 'choose' and meta ? 'secs_since_open'))::int as avg_s,
        min((meta->>'secs_since_open')::int) filter (where type = 'choose' and meta ? 'secs_since_open') as min_s,
        count(*) filter (where type in ('choose','change') and (meta->>'after_push')::boolean) as after_push
      from sandwich_events
      where child = any((select ks from k)::text[]) and type in ('choose','change') and for_date between date '2026-10-01' and current_date + 10
      group by child) r), '[]'::jsonb),
    'opens', coalesce((select jsonb_object_agg(child, n) from (select child, count(*) n from sandwich_events where type = 'app_open' and child = any((select ks from k)::text[]) group by child) o), '{}'::jsonb)
  )
$$;

grant execute on function sandwich_unavail_get(text) to anon;
grant execute on function sandwich_unavail_set(text, boolean, text) to anon;
grant execute on function sandwich_returned_get(text) to anon;
grant execute on function sandwich_stats(text) to anon;
notify pgrst, 'reload schema';
