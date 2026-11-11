-- המבחנים הקרובים של ילד, לדף שלו באפליקציה (אורן 11.11.2026).
-- קריאה בלבד מדשבורד המשפחה (sq_docs, app 'sidequests', collection 'family'), כמו study_auto_test.
-- מחזיר רק תאריך, סוג, שם ומשפט קצר, ל-60 הימים הקרובים, לפי הכיתה של הילד. לא מחזיר הערות הורים (prep) או פרטים אחרים.
create or replace function public.study_kid_events(p_kid text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x->>'d', x->>'t'), '[]'::jsonb) from (
    select distinct jsonb_build_object('d', e->>'d', 'ty', e->>'type', 't', left(e->>'t', 80), 'sub', left(coalesce(e->>'sub', ''), 80)) x
    from public.sq_docs f, jsonb_array_elements(coalesce(f.data->'events', '[]'::jsonb)) e
    where p_kid ~ '^[a-z]{2,20}$' and f.app = 'sidequests' and f.collection = 'family'
      and f.id = case p_kid when 'dani' then 'daniela' else p_kid end
      and coalesce(f.data->>'_deleted', '') <> 'true'
      and (e->>'type') in ('exam', 'quiz')
      and (e->>'d') >= to_char(now() at time zone 'Asia/Jerusalem', 'YYYY-MM-DD')
      and (e->>'d') <= to_char((now() at time zone 'Asia/Jerusalem') + interval '60 days', 'YYYY-MM-DD')
      and ((e->'cls') is null or (f.data->'class_n') is null or ((e->'cls') @> (f.data->'class_n')))
    limit 40) s;
$$;
revoke all on function public.study_kid_events(text) from public;
grant execute on function public.study_kid_events(text) to anon, authenticated;
