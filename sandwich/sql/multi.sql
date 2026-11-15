-- משפחת חלפון: בחירת כמה פריטים (נשמרים כטקסט אחד עם | ביניהם) ותזכורות הערה בבוקר.
-- לא מופעל אוטומטית: דורש אישור של אורן. מריצים ב-Supabase (פרויקט family-apps).

-- 1) אורך השדה: sandwich_set חותכת ל-100 תווים. כמה פריטים לא נכנסים בזה, לכן מעלים ל-600.
--    (הגוף זהה לגרסה שרצה היום, רק שהחיתוך 600 במקום 100.)
create or replace function public.sandwich_set(p_child text, p_date date, p_dish text)
 returns void language plpgsql security definer set search_path to 'public' as $$
declare prev text; d text := left(p_dish, 600); secs int; pushed boolean; m jsonb;
begin
  select dish into prev from sandwich_choices where child = p_child and for_date = p_date;
  insert into sandwich_choices(child, for_date, dish, updated_at) values (p_child, p_date, d, now())
  on conflict (child, for_date) do update set dish = excluded.dish, updated_at = now();
  select extract(epoch from now() - max(at))::int into secs from sandwich_events where child = p_child and type = 'app_open' and at > now() - interval '2 hours';
  select exists(select 1 from sandwich_events where child = p_child and type in ('reminder_sent','nudge_sent','replace_sent','dish_back_sent','new_dishes_sent') and at > now() - interval '30 minutes') into pushed;
  m := jsonb_build_object('after_push', pushed);
  if secs is not null then m := m || jsonb_build_object('secs_since_open', secs); end if;
  insert into sandwich_events(child, type, dish, prev_dish, for_date, meta)
  values (p_child, case when d = '' then 'clear' when coalesce(prev,'') = '' then 'choose' else 'change' end, nullif(d,''), nullif(prev,''), p_date, m);
end $$;

-- 2) תזכורת הערה: כל 5 דקות בשעות 03:00-04:59 UTC (6:00 שעון ישראל, חורף וקיץ). הפונקציה עצמה פועלת רק 6:00-6:34 שעון ישראל.
--    מחליפים את <ANON_KEY> במפתח הציבורי (anon), כמו ב-sandwich-reminders.
-- select cron.schedule('sandwich-wake', '*/5 3,4 * * *', $$select net.http_post(
--   url := 'https://<PROJECT>.supabase.co/functions/v1/send-reminders?action=wake&fam=b',
--   headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <ANON_KEY>'),
--   body := '{}'::jsonb)$$);
