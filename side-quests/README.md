# Side Quests (and Movies)

Oren's personal decision-support dashboard and task tracker. Hebrew, RTL, phone-first.
Live: https://tipul10000-droid.github.io/apps/side-quests/ (6-digit code screen).
Movies watch list (same data layer, English LTR): https://tipul10000-droid.github.io/apps/movies/

Rules for working on it: `../CLAUDE.md` (sections "side-quests ו-movies").

## Modes (6.2)
One "מצב" button, one choice, three modes. The app stays the same; a mode only hides quests and re-orders tasks. Side Quests is always the main quest.
- `home` (🏠): all 6 quests.
- `work` (💼, auto Sun-Thu 08:30-18:30): only Side, Army, Work. In Side: quick tasks on top ("קצרות, אפשר בין לבין"), tasks that need home/computer/errands fold into "🏠 לבית ולערב".
- `abroad` (✈️, = settings/notify abroad): everything but Work and Army. In Side: phone/call tasks on top, the rest folds into "🏠 כשאחזור".
- Time of day inside home: on the way (Sun-Thu 07:00-08:30, 18:30-19:30) calls/errands/quick on top; Friday 08:00-12:00 errands on top.
- Manual choice: localStorage `sq_mode` {m, auto, day}, holds until the next automatic change and never past today. No separate availability filter any more (topic `context` tags still drive the sorting).
Quick task = open, simple (level 1), added by hand ("נוסף ידנית") or tagged out/call/mobile (at work: no out/pc/house/lior). Urgent counts as quick outside home.
Rows (6.0): one circle to finish + title + one quiet line + at most one chip. Chat / later / urgent / done live in the action bar of an opened task. Waiting / paused / later groups start folded (`sq_fold`).

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app (HTML + CSS + JS in one file). Version in `window.SQ_BUILD` / `window.SQ_BUILD_AT` at the top. |
| `sq-db.js` | Data layer. Mimics `window.claude.use("db")` (collection / doc / set / update / delete / onSnapshot) on top of Supabase RPCs. Also draws the code screen. |
| `manifest.json`, `icon-*.png`, `apple-touch-icon.png` | Home-screen app (PWA) name and icons. |
| `sw.js` | Service worker: shows push notifications, opens the app on tap. No caching. |
| `insurance.html` | Family insurance dashboard (policies, costs, renewals, coverage map, tasks). Same PIN/data layer (`sq-db.js`); data in `sidequests/insurance` (one doc per policy + `_meta`), never in the repo. |
| `payments.html` | Fixed monthly payments dashboard (6.6): optimization cards with market price, a question and a ready-to-paste text; spending by category; full list; missing; cancelled. Data in `sidequests/payments` (one doc per payment + `_meta`), insurance shown as one live row from `insurance`. Fields: `name, cat, amt, cur, cycle (m/2m/y/var/once), pay, status (active/check/unknown/free/ended), src, note, market, save, lvl, opt_title, why, q{q,options,answer}, email{subject,to_label,body}`. No Gmail drafts addressed to Oren himself. |
| `shopping.html` | Purchases research dashboard (9.7): one card per purchase (options, comparison, where cheapest incl. Amazon.it, reviews, YouTube, 5-experts council button). Data in `sidequests/shopping` (one doc per purchase + `_meta`). |
| `fh-logo.png` | Frame Horizon logo for its Fun Quest card. |
| `supabase/schema.sql` | Tables and RPC functions (no secrets). Enough to rebuild the backend. |

## Run locally

No build step, no dependencies. Any static server:

```
cd apps
python3 -m http.server 8000
# open http://localhost:8000/side-quests/
```

The page talks to the live Supabase project. To test the UI **without** the real code, intercept the RPC calls (for example Playwright `page.route('**/rest/v1/rpc/**', ...)` returning `{"status":"ok","rows":[...]}`).
Never type guesses into the code screen: 5 wrong codes lock the app for everyone for 30 minutes.

## Deploy

GitHub Pages serves the `main` branch of `tipul10000-droid/apps`. Merge to `main` = live within ~1-10 minutes.
Bump `window.SQ_BUILD` on every change: the installed iPhone app compares it and reloads itself.

## Configuration (names only, no values)

There are no environment variables and no build secrets. Settings live in the code / database:

| Name | Where | Secret? |
|---|---|---|
| Supabase URL (`URL_`) | `sq-db.js` | no |
| Supabase publishable key (`ANON`) | `sq-db.js` | no (public by design) |
| `window.SQ_APP` | `index.html` (`sidequests`) / movies (`movies`) | no |
| `window.SQ_PIN`, `window.SQ_LANG`, `window.SQ_PIN_FALLBACK` | page flags | no |
| The 6-digit code | only as a salted hash in table `sq_secrets` | **yes, never in the repo** |
| The movies link key (`?k=`) | only as a salted hash in `sq_secrets` | **yes, never in the repo** |
| Browser storage | `sq_pin`, `sq_key`, `sq_seen` (localStorage) | device only |

## Backend (Supabase project `family-apps`, ref `emgtyfksnofzzlutngbf`)

- `sq_docs (app, collection, id, data jsonb, version, updated_at)`: all data. Apps/collections: `sidequests/topics`, `sidequests/projects`, `sidequests/settings`, `movies/movies`. Delete = `data._deleted = true`.
- `sq_secrets (app, key_hash, salt)`, `sq_throttle (app, fails, locked_until)`: auth and lockout.
- RPCs (anon may execute, tables are closed by RLS): `sq_open(p_key, p_app)` read all, `sq_put(p_key, p_app, p_collection, p_id, p_data, p_merge)` write, `sq_auth` check + throttle, `sq_check`, `sq_list` (blocked).
- Edge function `sq-push` (source: `supabase/sq-push/index.ts`, verify_jwt off): Web Push. pg_cron job `sq-push` calls `?action=tick` every 5 minutes: sends the morning brief once a day at `settings/notify.brief_time` (default 08:00 Israel), and a push for each topic newly marked `critical: true` (or urgent by someone other than Oren), quiet 22:00-07:00. The app calls `?action=key|test|brief`.
- Brief schedule (10.7, Oren 6.11.2026): morning + evening Sun-Thu only; Thu 21:30 Friday-errands brief (`settings/fri_brief`), Fri 13:00 weekend brief (`weekend_brief`), Sat 21:00 coming-week brief (`week_brief`), shape {date, headline, top, sections:[{h,e,items:[{text,sub,id,e}]}]}, opened by `#fri|#wkend|#week`; `settings/notify.wk:false` turns these three off. The top button always opens the latest brief. Picks are filtered in the app (`bOk`/`bFit`/`liveItem`): open, fits the slot's windows, not a project open-end, not planned later, long only if due within 3 days, closed places dropped. Routine instructions: `/mnt/project-files/side-quests/routine-briefs.md`.
- "צא עד" / "להתקשר עד" (10.0): `timegate.js` is shared by the app and `sq-push` (copy it into `supabase/sq-push/` and deploy both files on every change). A task planned for today (`day_plan.date`, else `next_date`) with `fit.open` {weekday 0-6: "HH:MM-HH:MM" | null} or `fit.appt` "HH:MM" gets: a red strip at the top of the app and the first rows of the morning brief, and pushes ~90 and ~20 minutes before the leave/call deadline and once when it is late but still open; closed today = one morning push; 20:00 = one push for tomorrow. leave_by = close - `last_in` - travel (`travel`, else 6 + 1.5*`km`, else 15) - 10. `hours_est: true` marks a guess (shown as "שעות משוערות"); a question option `{label, fit:{open:{...}, hours_est:false}}` fixes it in one tap. Server state: `sq_push_srv/state/gates`. `settings/notify.gates: false` turns the pushes off.
  - Devices: `sidequests/push_subs` (written by the app through `sq_put`, so only someone with the code can register). Prefs: `settings/notify` {brief, brief_time, brief_days all|sun-fri|sun-thu, critical, abroad, abroad_until, abroad_tz}; abroad mode = no brief, only new critical pushes, quiet hours in the phone's local time abroad. Last brief sent: `settings/brief_last`. A Claude-written brief for today in `settings/morning_brief` {date,title,body,lines} wins over the automatic one (scheduled task "Side Quests: בריף בוקר", 07:38 Israel).
  - Server state and the VAPID key pair: app `sq_push_srv` in `sq_docs` (no code exists for that app, so `sq_open` can never read it). The private key never leaves the server.
  - `sw.js`: service worker for push only (no caching).
- Scheduled Claude tasks read/write `sq_docs` directly with SQL.

### Topic fields (`sidequests/topics`)

title, kind (research|followup|admin|reminder|idea|project|fun), area, urgent, critical, critical_reason, critical_at, status (active|waiting_me|waiting_other|paused|done|promoted|archived), priority, quest (army|work|travel|ai; missing = side), fun (true = Fun Quest), stand, waiting_for, next_step, next_date (YYYY-MM-DD), snooze_until (ISO or "someday"), summary, links [{label,url,type: chat|page|file}], questions [{id,q,options,answer,answered_at,done,superseded}], ai_offers [{id,text,detail,state open|approved|declined|done,result,superseded}], log [{at,text}], sync {at,from,chat}, source, project, dash (dashboard id), level (1-4, optional override), tags, icon, items, item_groups, fun_order, subs, promoted_to, created_at, updated_at, done_at.

### Project fields (`sidequests/projects`)

name, icon, color, tagline, order, app_url, claude_url, links, stage.

### Dashboard fields (`sidequests/dashboards`, v5.0)

title, short (crumb label), icon, c1, c2 (tile gradient), quest (side|travel|ai|army|work), url (main page), links [{label,url}], kpis [{v,l}], note, as_of, live, source ("insurance" = numbers and suggestions computed from the insurance collection), project (level-4 parent), order, suggest [{text,sub,date,show_days}], sugg {key: added|dismissed}, archived, updated_at.
Task levels: 1 no chat/mail, 2 chat or mail, 3 `dash` set, 4 `project` set. Max 4 tiles per quest; more, or idle 90 days with no open tasks, go to "עוד דשבורדים וארכיון".

### Insurance fields (`sidequests/insurance`)

Policy doc: title, cat (health|life|nursing|car|home|travel|hmo|pension|accident|other), insurer, policy_no, who [oren|lior|kids|family], asset, status (active|check|ended|per_trip|unknown), monthly, annual, freq_label, card, charge_day, start, renew (YYYY-MM-DD), renew_note, agent, coverage [], flags [{lvl high|mid|low, type dup|cost|gap|check|pay, text, save}], notes, charges, links [{label,url,kind policy|login|mail|agent}], source, confidence (confirmed|likely|guess), icon.
`_meta` doc: updated, cost_note, sources, cov_cols, coverage [{risk, s:{oren,lior,kids,family: ok|partial|dup|gap|unknown|na}, note}], flags (the curated "needs attention" list, optional pid), tasks [{stage,text,sub,done}].

### Movie fields (`movies/movies`)

title, year, genre, lang, imdb_rating, note, source, seen, seen_at, downloaded, order, added_at, updated_at.

## 10.4: מקום מסוים מול משימה כללית, וכפתור 📍
- `fit.alts` [{name, area, km, open, src}] למשימה שכל מקום יכול לעשות (פיתות, סופר). `SQGate.gate` בוחר את הקרוב שעוד מספיקים להגיע אליו; אם הקרוב סגור, את הפתוח עד מאוחר יותר, והטקסט אומר לאן ללכת ולמה. `key` = `id@index`, ו-sq-push שומר את שלבי ההתראה לפי המפתח הזה.
- כפתור 📍 (`#locBtn`) בשורה העליונה: מפעיל מיקום, מזהה עיר מ-`CITIES` (בלי שירות חיצוני), חלון `#locM` עם מה שאפשר לעשות כאן. כשלא בבית, הסידור לפי אזור והפס האדום מחשבים מרחק מהמיקום הנוכחי (`kmHere`, `hereFit`). המיקום נשאר ב-`sq_loc` במכשיר בלבד.
