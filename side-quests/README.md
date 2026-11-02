# Side Quests (and Movies)

Oren's personal decision-support dashboard and task tracker. Hebrew, RTL, phone-first.
Live: https://tipul10000-droid.github.io/apps/side-quests/ (6-digit code screen).
Movies watch list (same data layer, English LTR): https://tipul10000-droid.github.io/apps/movies/

Rules for working on it: `../CLAUDE.md` (sections "side-quests ו-movies").

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app (HTML + CSS + JS in one file). Version in `window.SQ_BUILD` / `window.SQ_BUILD_AT` at the top. |
| `sq-db.js` | Data layer. Mimics `window.claude.use("db")` (collection / doc / set / update / delete / onSnapshot) on top of Supabase RPCs. Also draws the code screen. |
| `manifest.json`, `icon-*.png`, `apple-touch-icon.png` | Home-screen app (PWA) name and icons. |
| `sw.js` | Service worker: shows push notifications, opens the app on tap. No caching. |
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
  - Devices: `sidequests/push_subs` (written by the app through `sq_put`, so only someone with the code can register). Prefs: `settings/notify` {brief, brief_time, brief_days all|sun-thu, critical}. Last brief sent: `settings/brief_last`. A Claude-written brief for today in `settings/morning_brief` {date,title,body,lines} wins over the automatic one (scheduled task "Side Quests: בריף בוקר", 07:38 Israel).
  - Server state and the VAPID key pair: app `sq_push_srv` in `sq_docs` (no code exists for that app, so `sq_open` can never read it). The private key never leaves the server.
  - `sw.js`: service worker for push only (no caching).
- Scheduled Claude tasks read/write `sq_docs` directly with SQL.

### Topic fields (`sidequests/topics`)

title, kind (research|followup|admin|reminder|idea|project|fun), area, urgent, critical, critical_reason, critical_at, status (active|waiting_me|waiting_other|paused|done|promoted|archived), priority, quest (army|work; missing = side), fun (true = Fun Quest), stand, waiting_for, next_step, next_date (YYYY-MM-DD), snooze_until (ISO or "someday"), summary, links [{label,url,type: chat|page|file}], questions [{id,q,options,answer,answered_at,done,superseded}], ai_offers [{id,text,detail,state open|approved|declined|done,result,superseded}], log [{at,text}], sync {at,from,chat}, source, project, tags, icon, items, item_groups, fun_order, subs, promoted_to, created_at, updated_at, done_at.

### Project fields (`sidequests/projects`)

name, icon, color, tagline, order, app_url, claude_url, links, stage.

### Movie fields (`movies/movies`)

title, year, genre, lang, imdb_rating, note, source, seen, seen_at, downloaded, order, added_at, updated_at.
