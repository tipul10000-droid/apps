# apps

אפליקציות קטנות למשפחה. כל אפליקציה בתיקייה משלה.

- `sandwich/` – בחירת סנדוויץ' לבית הספר
- `side-quests/` – לוח משימות אישי (פרטי, נפתח עם קוד). הרצה, פריסה ומבנה הנתונים: `side-quests/README.md`. לינק: https://tipul10000-droid.github.io/apps/side-quests/
- `movies/` – רשימת צפייה אישית (אותו מפתח). לינק: https://tipul10000-droid.github.io/apps/movies/
- `frida/` – מעקב שקילות ולקוחות לקבוצות ההרזיה של פרידה. לינק: https://tipul10000-droid.github.io/apps/frida/
- `study/` – אזור לימוד לשלושת הילדים (מסך בחירה). ילד ← תכנים ← אפליקציה: `study/evyatar/vocab/` אוצר מילים באנגלית (עבר מהמאגר english-vocab), `study/dani/spelling/` הכתבה באנגלית, `study/parents/` אזור הורים עם קוד. לינק: https://tipul10000-droid.github.io/apps/study/

כללי עבודה: ראו `CLAUDE.md`.

## הרצה ופריסה
- אתר סטטי (HTML/JS/CSS), בלי build. פריסה: GitHub Pages מענף `main` (תיקיית root). כל מיזוג ל-`main` מעדכן את האתר תוך דקה או שתיים (מטמון של עד 10 דקות).
- הרצה מקומית: `python3 -m http.server 8000` בשורש המאגר, ואז http://localhost:8000/<שם-אפליקציה>/
- בסיס נתונים: Supabase, פרויקט `family-apps` (ref `emgtyfksnofzzlutngbf`). כל אפליקציה עם קידומת משלה: `sandwich_*`, `vocab_lb_*` ו-`study_*` (study), `sq_*` (side-quests, movies), `frida_*`. הגדרות SQL בתיקיות `*/supabase/` ו-`sandwich/sql/`.
- `.github/workflows/keep-supabase-awake.yml`: פינג יומי (06:17 UTC) ל-`vocab_lb_get` כדי שהפרויקט ב-Supabase לא יירדם.

## משתני סביבה
אין משתני סביבה ואין secrets במאגר. מפתח Supabase הציבורי (anon) נמצא בקוד (`*/config.js`, `study/index.html`) וזה מותר. מפתח סודי (service_role) לעולם לא נכנס למאגר. קודי גישה פרטיים (PIN של side-quests, מפתח movies) לא נמצאים במאגר.

## study בקצרה (למי שממשיך את העבודה)
- אוצר המילים: קובץ אחד, `study/evyatar/vocab/index.html`. הנתונים של כל משתמש ב-localStorage של הדפדפן (`vq1`, `vq1streak`, `vq1lvl`, `vq1blk`, `vq1lb`); אסור לשנות שמות או מבנה. פירוט מלא ב-`CLAUDE.md`.
- לוח דירוג: הטבלה `vocab_lb_players` ופונקציות `vocab_lb_upsert` / `vocab_lb_get` (`study/supabase/leaderboard.sql`).
- הכתובת הישנה (מאגר `english-vocab`) מפנה ל-`/apps/study/`.
