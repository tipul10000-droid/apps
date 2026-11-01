# Frida App (תחושות בטן · מעקב)

מעקב שקילות וניהול לקוחות לקבוצות ההרזיה והלייפסטייל של פרידה. עברית, RTL, מותאם לטלפון.
לינק: https://tipul10000-droid.github.io/apps/frida/ (לא מופיע בדף הראשי של המאגר בכוונה).

כללי העבודה המלאים לאפליקציה הזו נמצאים ב-`../CLAUDE.md` בסעיף "אפליקציית frida".

## מבנה
| קובץ | מה יש בו |
|---|---|
| `index.html` | דף יחיד, טוען את `config.js` ואת `app.js` (עם `?v=` לשבירת מטמון) |
| `app.js` | כל הממשק: מסך כניסה, ממשק מנהלת (שקילה, לקוחות, קבוצות, כרטיס לקוח), ממשק לקוח (התקדמות, גרף, היסטוריה) |
| `style.css` | עיצוב. פונטים: Fredoka לכותרות, Heebo לטקסט (Google Fonts) |
| `config.js` | כתובת Supabase, מפתח anon ציבורי, כתובת האפליקציה, דגל `beta` |
| `supabase/schema.sql` | כל הטבלאות והפונקציות (`frida_*`). אפשר להריץ שוב (idempotent) |
| `logo.png`, `mark.png`, `icon-*.png`, `apple-touch-icon.png`, `manifest.json` | מיתוג ואייקונים למסך הבית |

## צד שרת (Supabase)
- פרויקט `family-apps` (ref `emgtyfksnofzzlutngbf`). כל האובייקטים עם הקידומת `frida_`.
- טבלאות: `frida_groups`, `frida_clients`, `frida_cards` (כרטיסיות), `frida_visits` (מפגש + שקילה), `frida_sessions` (טוקני התחברות, נשמרים כ-hash), `frida_login_attempts` (נעילה אחרי 5 ניסיונות ל-15 דקות).
- RLS פעיל בלי policies: anon לא ניגש לטבלאות. כל הגישה דרך פונקציות `SECURITY DEFINER` שמקבלות טוקן:
  `frida_login`, `frida_logout`, `frida_my_data`, `frida_admin_overview`, `frida_admin_client`, `frida_admin_save_client`, `frida_admin_save_group`, `frida_admin_save_card`, `frida_admin_save_visit`, `frida_admin_delete_card`, `frida_admin_delete_visit`, `frida_admin_set_show` (ועוד עזרים פנימיים).
- הקליינט קורא להן ב-`POST /rest/v1/rpc/<fn>`.
- מחיקה רכה בלבד (`deleted_at`). אין edge functions לאפליקציה הזו.

## הרצה מקומית
1. `python3 -m http.server 8000` מתיקיית השורש של המאגר, ואז http://localhost:8000/frida/
2. זה עובד מול Supabase האמיתי (לפי `config.js`). לבדיקה מבודדת: להריץ את `supabase/schema.sql` על Postgres מקומי ולהפנות את `supabaseUrl` לשרת מדומה/PostgREST מקומי.
3. **לא להתחבר עם הטלפון של המנהלת, גם לא לבדיקה.**

## פריסה
- GitHub Pages מענף `main` (אין build). שינוי = ענף, PR, מיזוג ל-main; הדף מתעדכן תוך דקה-שתיים.
- אחרי שינוי ב-`app.js` או `style.css` להעלות את ה-`?v=` ב-`index.html`.
- שינוי בסכמה: לעדכן את `supabase/schema.sql` ולהריץ אותו ב-SQL Editor של Supabase (או דרך migration).

## משתני סביבה / הגדרות
אין build ואין משתני סביבה. ההגדרות ב-`config.js` (שמות בלבד):
- `supabaseUrl` – כתובת פרויקט Supabase
- `supabaseKey` – מפתח anon ציבורי (מותר בקוד; מפתח service_role אף פעם לא נכנס למאגר)
- `appUrl` – הכתובת שנשלחת ללקוחות בוואטסאפ
- `beta` – `true` מציג פס "גרסת בטא"; בהשקה `false`

## מצב בטא והשקה
עכשיו: בטא עם נתוני בדיקה פיקטיביים (`is_test = true`). צ'קליסט השקה:
1. `beta: false` ב-`config.js`.
2. השבתת כל השורות עם `is_test` (קבוצות ולקוחות), כולל מנהלת הבדיקה.
3. החזרת הדרישה לטלפון מלא ו-3 ספרות בהתחברות (היום מתקבלים גם קודים קצרים בשביל משתמשי הבדיקה).
4. הכנסת הקבוצות והלקוחות האמיתיים.
