# סנדוויץ' למחר!

אפליקציית ווב בעברית (RTL, מותאמת לטלפון) שבה שלושה ילדים בוחרים מה יהיה הסנדוויץ' שלהם לבית הספר למחר, ואמא רואה את הבחירות ומעדכנת מה זמין בבית.

- לינק: https://tipul10000-droid.github.io/apps/sandwich/
- אירוח: GitHub Pages מענף `main`, תיקייה `sandwich/`. אין build ואין תלויות: קבצים סטטיים בלבד.
- דאטה: Supabase, פרויקט `emgtyfksnofzzlutngbf` (`family-apps`), כל האובייקטים עם הקידומת `sandwich_`.

## קבצים

| קובץ | תפקיד |
| --- | --- |
| `index.html` | דף יחיד. הפרמטר `?v=` על קבצי ה-CSS/JS הוא גרסת הפריסה |
| `app.js` | כל הלוגיקה. בראשו `DISHES` (המנות, `isNew: true` = סרט "חדש!") ו-`RELEASES` (יומן "מה חדש") |
| `config.js` | הגדרות ציבוריות בלבד (ראו למטה) |
| `characters.js`, `characters/` | איורי הדמויות |
| `style.css` | עיצוב |
| `sw.js` | Service worker להתראות דחיפה |
| `manifest.json`, `icon-*.png`, `apple-touch-icon.png`, `logo.svg` | התקנה למסך הבית |
| `sql/schema.sql` | סכמת Supabase (טבלאות ופונקציות) |
| `supabase/send-reminders/index.ts` | קוד ה-Edge Function להתראות |

## הרצה מקומית

```
cd sandwich
python3 -m http.server 8000
```

פותחים http://localhost:8000. אם `config.js` ריק האפליקציה עובדת במצב הדגמה (נתונים רק בדפדפן).

## פריסה

1. עובדים על ענף נפרד, בודקים בדפדפן ברוחב 390px.
2. בכל גרסה: מעלים את `?v=` ב-`index.html` ומוסיפים רשומה בראש `RELEASES` ב-`app.js`.
3. ממזגים ל-`main`. GitHub Pages מתעדכן לבד.
4. מנה חדשה: מסמנים `isNew: true` (ומורידים מהישנות) ואחרי המיזוג שולחים התראה:
   `POST <SUPABASE_URL>/functions/v1/send-reminders?action=new_dishes&dishes=שם1,שם2` עם מפתח ה-anon (מגבלה: פעם ב-10 דקות).
5. שינוי ב-Edge Function: `supabase functions deploy send-reminders` (או Deploy מה-Dashboard). `verify_jwt` פעיל.

## הגדרות ומשתני סביבה (שמות בלבד)

בצד הלקוח (`config.js`, ציבוריים ומותרים בקוד):

- `supabaseUrl`
- `supabaseAnonKey` (מפתח publishable)
- `functionsKey` (מפתח anon בפורמט JWT לקריאה לפונקציה)
- `vapidPublicKey`

בצד השרת (Edge Function, מוזרקים אוטומטית על ידי Supabase):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (סודי, אף פעם לא בקוד)

מפתחות VAPID (ציבורי ופרטי) נוצרים בשרת בפעם הראשונה ונשמרים בטבלה `sandwich_secrets`, שסגורה ל-anon. אסור לייצא אותה לקבצים.

## Supabase

טבלאות: `sandwich_choices`, `sandwich_daily`, `sandwich_dish_notes`, `sandwich_events`, `sandwich_push`, `sandwich_push_log`, `sandwich_returned`, `sandwich_secrets`, `sandwich_settings`, `sandwich_unavailable`.

כולן עם RLS בלי policies. הגישה מהאפליקציה רק דרך פונקציות `security definer`: `sandwich_get`, `sandwich_set`, `sandwich_daily_get/set`, `sandwich_note_all/set/return`, `sandwich_log`, `sandwich_push_save/off`, `sandwich_returned_get`, `sandwich_unavail_get/set`, `sandwich_stats`.

תזמון: `pg_cron` משימה `sandwich-reminders` (`0 * * * *`) קוראת ל-`send-reminders` כל שעה עגולה.

## התראות (send-reminders)

פעולות לפי `?action=`:

| action | מה עושה |
| --- | --- |
| (ללא) | כל שעה: ב-17:00 וב-19:00 תזכורת לילדים שעוד לא בחרו; 10:00 ו-12:00 תזכורת לאמא לעדכן מלאי; מ-09:00 ממלא "מנה יומית"; בערב תזכורת חוזרת למי שבחר מנה שאזלה. אין תזכורת בשישי |
| `chose&child=` | ילד בחר או שינה: התראה מיידית לאמא |
| `nudge&child=` | אמא מזכירה לילד שלא בחר |
| `dish_off&dish=` | מנה סומנה כלא זמינה: התראה למי שבחר אותה |
| `dish_on&dish=` | מנה חזרה אחרי 4 ימים ומעלה: התראה לכולם |
| `new_dishes&dishes=` | מנות חדשות בתפריט (ידני אחרי שחרור גרסה) |
| `new_features` | פיצ'רים חדשים (ידני) |
| `pubkey` | מחזיר את מפתח ה-VAPID הציבורי |

מצב מנהל: כל התראה לילד או לאמא נשלחת גם כעותק למכשירי `child = 'admin'`. כל שליחה נרשמת ב-`sandwich_events` לסטטיסטיקה.

## כללי המאגר

המאגר ציבורי: בלי שמות משפחה, בלי תמונות אמיתיות, בלי מפתחות סודיים. ראו `../CLAUDE.md`.
