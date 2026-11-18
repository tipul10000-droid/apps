הנחיה מ-Side Quests: סטטיסטיקה לאפליקציה (אורן, 18.11.2026)

אורן רוצה לראות ב-Side Quests ← AI Projects ← הפרויקט הזה ← "סטטיסטיקה" מיני דשבורד של האפליקציה: מתי נוצרה, כמה גרסאות שוחררו, הגרסה האחרונה, כמה משתמשים ומכשירים, וכמה זמן משתמשים בה. בבקשה תוסיף לאפליקציה שני דברים, תמזג, ותגיד לאורן בשורה אחת שזה פעיל.

מזהה האפליקציה בסטטיסטיקה: {{APP}}
מזהה הפרויקט ב-Side Quests (sq_docs, collection projects): {{PROJECT}}

## 1. נתוני שימוש (פינג אנונימי)

סקריפט משותף אחד, אותו לכל האפליקציות של אורן. בלי שמות ובלי מידע אישי: מזהה מכשיר אקראי, שניות שימוש פעיל (הדף גלוי ונגעו בו ב-2 הדקות האחרונות), גרסה, פלטפורמה, ו-uid אופציונלי שמגובב בתוך הסקריפט.

```html
<script src="https://tipul10000-droid.github.io/apps/appstat.js?v=1" defer></script>
<script>
  addEventListener("load", function () {
    window.AppStat && AppStat.init({
      app: "{{APP}}",
      ver: "1.4.2",                 // הגרסה הנוכחית (מחרוזת קצרה, עד 24 תווים). אפשר גם פונקציה שמחזירה אותה
      uid: function () { return null; } // רשות: מזהה יציב של משתמש אם יש התחברות (id פנימי, לא אימייל ולא שם). מגובב לפני השליחה
    });
  });
</script>
```

- Next.js / React: `<Script src="https://tipul10000-droid.github.io/apps/appstat.js?v=1" strategy="afterInteractive" onLoad={() => window.AppStat?.init({ app: "{{APP}}", ver: VERSION })} />` בתוך ה-layout הראשי, פעם אחת.
- אם יש Content-Security-Policy: להוסיף `https://tipul10000-droid.github.io` ל-script-src ו-`https://emgtyfksnofzzlutngbf.supabase.co` ל-connect-src.
- השרת: פונקציית `appstat_ping` בפרויקט Supabase `family-apps` (emgtyfksnofzzlutngbf), עם המפתח הציבורי שכבר בתוך הסקריפט. לא צריך מפתח ולא שינוי סכמה אצלך.
- אם יש לאפליקציה נתוני שימוש היסטוריים משלה (מכשירים, משתמשים רשומים), תכתוב אותם בסעיף 2 בשדה `history`.

## 2. נתוני פיתוח (מתי נוצרה, כמה גרסאות)

אחרי כל פריסה (או לפחות פעם ביום בריצה קבועה), תעדכן את המסמך של הפרויקט ב-sq_docs דרך Supabase execute_sql, במיזוג (לא דורסים שדות אחרים):

```sql
update sq_docs set data = data || jsonb_build_object('stats_meta', jsonb_build_object(
  'created', '2026-10-01T10:00:00+03:00',         -- הקומיט הראשון / יום ההקמה
  'releases', 57,                                 -- כמה פריסות לפרודקשן עד היום (מיזוגים ל-main / deployments)
  'release_days', 14,                             -- בכמה ימים שונים היו פריסות
  'version', '1.4.2',                             -- הגרסה הנוכחית
  'last_release', jsonb_build_object('at','2026-11-18T19:30:00+02:00','title','תיאור קצר של מה שהשתנה'),
  'weeks', '[["2026-11-09",5],["2026-11-16",3]]'::jsonb,  -- פריסות לפי שבוע, תאריך יום ראשון של השבוע, עד 12 שבועות
  'lines', 12000,                                 -- רשות: שורות קוד
  'history', null,                                -- רשות: {"devices":N,"users":N,"since":"YYYY-MM-DD","note":"..."}
  'updated_at', now()
)), version = version + 1, updated_at = now()
where app = 'sidequests' and collection = 'projects' and id = '{{PROJECT}}';
```

תודה!
