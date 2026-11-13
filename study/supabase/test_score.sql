-- חותמת ציון בדף הילד (אורן 13.11.2026): study_test_get מחזיר גם את הציון האחרון של התוכן (score), אם הוזן באזור ההורים.
-- study/kidlist.js מציג אותו כחותמת עגולה בצד שמאל של כרטיס התוכן. בלי ציון אין שדה score, והכול כמו קודם.
create or replace function public.study_test_get(p_kid text, p_app text)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  select coalesce(coalesce(
    (select jsonb_build_object('d', d, 'note', note) from public.study_tests where kid = p_kid and app = p_app and d is not null and not done),
    case when exists (select 1 from public.study_tests where kid = p_kid and app = p_app and (noauto or done)) then '{}'::jsonb
         else public.study_auto_test(p_kid) end), '{}'::jsonb)
  || coalesce((select jsonb_build_object('score', score) from public.study_results
               where kid = p_kid and app = p_app and not hidden order by d desc, id desc limit 1), '{}'::jsonb);
$function$;
