-- מערכת השעות והדגשים למחר, לדף הילד באפליקציית הלימודים (אורן 20.11.2026).
-- קריאה בלבד מדשבורד "משפחה ולימודים" (sq_docs, app 'sidequests', collection 'family'), כמו study_kid_events.
-- מחזיר: tt = מערכת השעות (שיעורים, שעות, הפסקות, מה להביא), notes = דגשים של מורים לשיעורים (lesson_notes, 14 יום),
-- ev = אירועים של 14 הימים הקרובים (תאריך, סוג, שם, משפט קצר; בלי הערות הורים), wk = "קבוע בשבוע".
-- לא מחזיר טלפונים, מיילים או הערות הורים (prep).
create or replace function public.study_kid_timetable(p_kid text)
returns jsonb language sql stable security definer set search_path = '' as $$
  with f as (
    select f.data from public.sq_docs f
    where p_kid ~ '^[a-z]{2,20}$' and f.app = 'sidequests' and f.collection = 'family'
      and f.id = case p_kid when 'dani' then 'daniela' when 'evyatar' then 'evyatar' when 'lia' then 'lia' else p_kid end
      and coalesce(f.data->>'_deleted', '') <> 'true'),
  t as (select to_char(now() at time zone 'Asia/Jerusalem', 'YYYY-MM-DD') d0,
               to_char((now() at time zone 'Asia/Jerusalem') + interval '14 days', 'YYYY-MM-DD') d1)
  select case when (select data->'timetable' from f) is null then '{}'::jsonb else jsonb_build_object(
    'tt', (select data->'timetable' from f),
    'notes', coalesce((select jsonb_agg(jsonb_build_object('d', n->>'d', 's', left(coalesce(n->>'subj', ''), 40), 't', left(coalesce(n->>'t', ''), 200)) order by n->>'d')
       from f, t, jsonb_array_elements(coalesce(f.data->'lesson_notes', '[]'::jsonb)) n where n->>'d' between t.d0 and t.d1), '[]'::jsonb),
    'ev', coalesce((select jsonb_agg(jsonb_build_object('d', e->>'d', 'ty', e->>'type', 't', left(e->>'t', 80), 'sub', left(coalesce(e->>'sub', ''), 120)) order by e->>'d')
       from f, t, jsonb_array_elements(coalesce(f.data->'events', '[]'::jsonb)) e
       where e->>'d' between t.d0 and t.d1 and coalesce(e->>'type', '') <> 'holiday'
         and ((e->'cls') is null or (f.data->'class_n') is null or ((e->'cls') @> (f.data->'class_n')))), '[]'::jsonb),
    'wk', coalesce((select jsonb_agg(jsonb_build_object('day', w->>'day', 't', left(coalesce(w->>'text', ''), 120)))
       from f, jsonb_array_elements(coalesce(f.data->'weekly', '[]'::jsonb)) w), '[]'::jsonb)
  ) end;
$$;
revoke all on function public.study_kid_timetable(text) from public;
grant execute on function public.study_kid_timetable(text) to anon, authenticated;
