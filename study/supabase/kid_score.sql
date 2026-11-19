-- ציון שהילד מזין בעצמו (אורן 19.11.2026). הוחל ב-19.11.2026 אחרי אישור אורן.
-- study_results: by_kid (הילד הזין), notified_at (נשלחה התראה להורים), seen_at (ההורים לחצו "ראיתי").
-- study_auto_past(kid): המבחן האוטומטי האחרון שעבר (עד 60 יום) בלי ציון.
-- study_test_get מחזיר גם 'past' ו-'by_kid'. study_kid_result(kid, app, d, score): רק 2-60 ימים אחרי מבחן ידוע (ידני שלא בוצע, או אוטומטי שעבר), ציון אחד למבחן.
-- study_parents_result_seen(pin, id). study_score_due(): לשרת בלבד, 7-21 ימים אחרי מבחן, למד את התוכן לפני המבחן, אין ציון.
-- study_parents_get מחזיר בתוצאות גם by_kid, seen_at, at.
-- ההגדרות המלאות: ראו את המיגרציה study_kid_score בפרויקט (supabase_migrations).
alter table public.study_results add column if not exists by_kid boolean not null default false,
  add column if not exists notified_at timestamptz, add column if not exists seen_at timestamptz;
