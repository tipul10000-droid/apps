# apps

אפליקציות קטנות למשפחה. כל אפליקציה בתיקייה משלה.

- `sandwich/` – בחירת סנדוויץ' לבית הספר
- `side-quests/` – לוח משימות אישי (פרטי, נפתח רק עם מפתח בלינק). לינק: https://tipul10000-droid.github.io/apps/side-quests/
- `movies/` – רשימת צפייה אישית (אותו מפתח). לינק: https://tipul10000-droid.github.io/apps/movies/
- `frida/` – מעקב שקילות ולקוחות לקבוצות ההרזיה של פרידה. לינק: https://tipul10000-droid.github.io/apps/frida/
- `study/` – לימוד אוצר מילים באנגלית (עבר מהמאגר english-vocab). לינק: https://tipul10000-droid.github.io/apps/study/

כללי עבודה: ראו `CLAUDE.md`.

## הרצה ופריסה
- אתר סטטי (HTML/JS/CSS), בלי build. פריסה: GitHub Pages מענף `main` (תיקיית root). כל מיזוג ל-`main` מעדכן את האתר תוך דקה או שתיים (מטמון של עד 10 דקות).
- הרצה מקומית: `python3 -m http.server 8000` בשורש המאגר, ואז http://localhost:8000/<שם-אפליקציה>/
- בסיס נתונים: Supabase, פרויקט `family-apps` (ref `emgtyfksnofzzlutngbf`). כל אפליקציה עם קידומת משלה: `sandwich_*`, `vocab_lb_*` (study), `sq_*` (side-quests, movies), `frida_*`. הגדרות SQL בתיקיות `*/supabase/` ו-`sandwich/sql/`.
- `.github/workflows/keep-supabase-awake.yml`: פינג יומי (06:17 UTC) ל-`vocab_lb_get` כדי שהפרויקט ב-Supabase לא יירדם.

## משתני סביבה
אין משתני סביבה ואין secrets במאגר. מפתח Supabase הציבורי (anon) נמצא בקוד (`*/config.js`, `study/index.html`) וזה מותר. מפתח סודי (service_role) לעולם לא נכנס למאגר. קודי גישה פרטיים (PIN של side-quests, מפתח movies) לא נמצאים במאגר.

## study בקצרה (למי שממשיך את העבודה)
- קובץ אחד: `study/index.html`. הנתונים של כל משתמש ב-localStorage של הדפדפן (`vq1`, `vq1streak`, `vq1lvl`, `vq1blk`, `vq1lb`); אסור לשנות שמות או מבנה. פירוט מלא ב-`CLAUDE.md`.
- לוח דירוג: הטבלה `vocab_lb_players` ופונקציות `vocab_lb_upsert` / `vocab_lb_get` (`study/supabase/leaderboard.sql`).
- הכתובת הישנה (מאגר `english-vocab`) מפנה ל-`/apps/study/`.
