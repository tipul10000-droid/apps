// Side Quests push: morning brief + evening brief + critical-only alerts to Oren's devices (Web Push, VAPID).
// Called every 5 minutes by pg_cron (job "sq-push", action=tick) and by the app (key / test / brief).
// Data: sq_docs. Subscriptions in sidequests/push_subs (written by the app through sq_put, so only
// someone with the code can add a device). Server state + VAPID keys in app "sq_push_srv", which
// sq_open can never read (that app has no code in sq_secrets). The private key never leaves the server.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";
import "./timegate.js"; // shared with the app: side-quests/timegate.js (copy it here on every change)
const SQGate = (globalThis as any).SQGate;
import "./sqctx.js"; // shared with the app: side-quests/sqctx.js (copy it here on every change)
const SQCtx = (globalThis as any).SQCtx;

const APP = "sidequests";
const SRV = "sq_push_srv";
const APP_URL = "https://tipul10000-droid.github.io/apps/side-quests/";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...CORS } });

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

// ---------- time (Israel) ----------
function il(ms = Date.now(), tz = "Asia/Jerusalem") {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false,
  }).formatToParts(new Date(ms));
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  const hour = parseInt(g("hour")) % 24, minute = parseInt(g("minute"));
  return { date: `${g("year")}-${g("month")}-${g("day")}`, hour, minute, mins: hour * 60 + minute, wd: g("weekday") };
}
const dayDiff = (a: string, b: string) => Math.round((Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / 86400000);

// ---------- storage ----------
async function getDoc(app: string, coll: string, id: string) {
  const { data } = await sb.from("sq_docs").select("data").eq("app", app).eq("collection", coll).eq("id", id).maybeSingle();
  return (data?.data as any) || null;
}
async function putDoc(app: string, coll: string, id: string, patch: any) {
  const cur = (await getDoc(app, coll, id)) || {};
  const { error } = await sb.from("sq_docs").upsert({ app, collection: coll, id, data: { ...cur, ...patch }, updated_at: new Date().toISOString() }, { onConflict: "app,collection,id" });
  if (error) throw error;
}
async function listColl(app: string, coll: string) {
  const { data } = await sb.from("sq_docs").select("id,data").eq("app", app).eq("collection", coll);
  return (data || []).filter((r: any) => !(r.data && r.data._deleted)).map((r: any) => ({ id: r.id, ...(r.data || {}) }));
}

// topics with weekly tasks reopened for their day (recur, shared with the app in timegate.js)
async function listTopics() {
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  return (await listColl(APP, "topics")).map((t: any) => SQGate.recurOpen(t, d));
}

async function keys() {
  let k = await getDoc(SRV, "secrets", "vapid");
  if (!k?.pub || !k?.priv) {
    const g = webpush.generateVAPIDKeys();
    k = { pub: g.publicKey, priv: g.privateKey };
    await putDoc(SRV, "secrets", "vapid", k);
  }
  // Apple rejects a fake contact (403 BadJwtToken): the subject must be a real https URL or mailto (fixed 3.11.2026)
  webpush.setVapidDetails(APP_URL, k.pub, k.priv);
  return k;
}

async function subs() {
  return (await listColl(APP, "push_subs")).filter((s: any) => s.endpoint && s.keys?.p256dh && s.keys?.auth);
}
async function sendTo(list: any[], msg: { title: string; body: string; tag?: string; url?: string }) {
  await keys();
  let ok = 0;
  const fails: string[] = [];
  await Promise.allSettled(list.map(async (s: any) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(msg), { TTL: 6 * 3600, urgency: "high" });
      ok++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await putDoc(APP, "push_subs", s.id, { _deleted: true, gone_at: new Date().toISOString() });
      else fails.push(`${s.device || s.id}: ${e?.statusCode || ""} ${String(e?.body || e?.message || e).slice(0, 120)}`);
    }
  }));
  // keep the last failure visible (server-only state), so a silent miss can be diagnosed
  if (fails.length) await putDoc(SRV, "state", "last_error", { at: new Date().toISOString(), title: msg.title, errors: fails });
  return ok;
}

// ---------- prefs ----------
const DEF = { brief: true, brief_time: "08:00", brief_days: "sun-thu", wk: true, eve: true, eve_time: "18:00", eve_days: "sun-thu", critical: true, quiet_from: 22, quiet_to: 7 };
async function prefs() { return { ...DEF, ...((await getDoc(APP, "settings", "notify")) || {}) }; }

// ---------- brief ----------
const OPEN = ["active", "waiting_me", "waiting_other"];
const short = (s: any, n = 38) => { s = String(s || "").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
function isTask(t: any) { return !t.fun && t.kind !== "fun" && !(Array.isArray(t.tags) && t.tags.includes("fun question")); }
function snoozed(t: any, now: number) { const s = t.snooze_until; if (!s) return false; if (s === "someday") return true; const x = Date.parse(s); return x > now; }
function openQ(t: any) { return (Array.isArray(t.questions) ? t.questions : []).filter((q: any) => q && !q.answer && !q.done && !q.superseded); }

function buildBrief(all: any[]) {
  const now = Date.now(), today = il(now).date;
  const tasks = all.filter((t) => isTask(t) && OPEN.includes(t.status || "active"));
  const live = tasks.filter((t) => !snoozed(t, now));
  const due = (t: any) => (t.next_date ? dayDiff(t.next_date, today) : null);
  const urgent = live.filter((t) => t.urgent || t.critical);
  const late = live.filter((t) => !urgent.includes(t) && due(t) != null && due(t)! <= 0);
  const mine = live.filter((t) => t.status === "waiting_me" || openQ(t).length);
  // overnight: since 20:00 yesterday (Israel) ~ last 12h
  const since = now - 12 * 3600 * 1000;
  const touched = (t: any) => {
    let best = 0;
    for (const v of [t.updated_at, t.sync?.at, ...(Array.isArray(t.log) ? t.log.map((e: any) => e?.at) : [])]) { const x = v ? Date.parse(v) : NaN; if (x > best) best = x; }
    return best;
  };
  const added = all.filter((t) => isTask(t) && t.created_at && Date.parse(t.created_at) > since);
  const done = all.filter((t) => isTask(t) && t.status === "done" && t.done_at && Date.parse(t.done_at) > since);
  const upd = tasks.filter((t) => touched(t) > since && !added.includes(t));
  const score = (t: any) => (t.urgent || t.critical ? 0 : 100) + (due(t) == null ? 50 : Math.max(-20, Math.min(40, due(t)!))) + (t.priority === "high" ? 0 : 20) + (t.status === "waiting_me" ? 0 : 10);
  const pick = [...live].filter((t) => t.status !== "waiting_other").sort((a, b) => score(a) - score(b))[0];

  const lines: string[] = [];
  if (urgent.length) lines.push(`❗ דחוף: ${urgent.slice(0, 2).map((t) => short(t.title, 30)).join(" · ")}`);
  if (late.length) lines.push(`📅 להיום: ${late.slice(0, 2).map((t) => short(t.title, 30)).join(" · ")}${late.length > 2 ? ` ועוד ${late.length - 2}` : ""}`);
  if (mine.length) lines.push(`🟠 מחכות להחלטה שלך: ${mine.length}`);
  const night: string[] = [];
  if (added.length) night.push(added.length === 1 ? `נוספה "${short(added[0].title, 26)}"` : `נוספו ${added.length}`);
  if (upd.length) night.push(`עודכנו ${upd.length}`);
  if (done.length) night.push(`נסגרו ${done.length}`);
  if (night.length) lines.push(`🌙 בלילה: ${night.join(", ")}`);
  if (pick) lines.push(`▶️ להתחיל בדרך: ${short(pick.title, 40)}${pick.waiting_for ? ` (${short(pick.waiting_for, 30)})` : ""}`);
  if (!lines.length) lines.push("שקט היום. אין משהו שמחכה לך ☕");
  const title = urgent.length ? `☀️ בוקר טוב · ${urgent.length === 1 ? "דבר דחוף אחד" : urgent.length + " דחופים"}` : `☀️ בוקר טוב · ${live.length} משימות פתוחות`;
  return { title, body: lines.join("\n"), lines, pick: pick?.id || "" };
}

async function briefNow(source: string, list?: any[]) {
  const today = il().date;
  const all = await listTopics();
  let b: any = buildBrief(all);
  // a Claude-written brief (the 07:00 sweep writes settings/morning_brief for today) wins when present
  const ai = await getDoc(APP, "settings", "morning_brief");
  // 5.9 format: {date, headline, critical[], news[], now[], work[], evening[], errands[]} (items {text,id?}); old format: {title, body, lines}
  if (ai && ai.date === today && (ai.body || ai.headline)) {
    const flat = ["critical", "news", "now", "work", "evening"].flatMap((k) => (Array.isArray(ai[k]) ? ai[k] : []).map((x: any) => String(x?.text || "")).filter(Boolean));
    const body = ai.body ? String(ai.body) : flat.join("\n");
    b = { ...b, title: String(ai.title || (ai.headline ? "☀️ בוקר טוב · " + ai.headline : b.title)).slice(0, 80), body: body.slice(0, 400), lines: Array.isArray(ai.lines) && ai.lines.length ? ai.lines.map(String) : body.split("\n"), headline: ai.headline || "", by: "claude" };
  }
  // the notification is one line only; the full brief opens in the app (#brief), Oren 3.11.2026
  const head = String(b.headline || "").trim() || String(b.title || "").replace(/^☀️?\s*בוקר טוב\s*·\s*/, "").trim();
  const n = await sendTo(list || (await subs()), { title: "☀️ בוקר טוב", body: head || "הבריף של הבוקר מוכן", tag: "sq-brief", url: APP_URL + "#brief" });
  await putDoc(APP, "settings", "brief_last", { at: new Date().toISOString(), date: today, title: b.title, body: b.body, lines: b.lines, pick: b.pick, by: b.by || "auto", source, sent: n });
  return { sent: n, ...b };
}

// ---------- evening brief (Oren 3.11.2026): on the way home. Small errands he added himself, a call, ask Lior ----------
const ERRAND = /^(לקנות|לקחת|להחליף|לסדר|לעבור|לאסוף|להביא|לתקן|לשכפל|להחזיר|למסור|להוציא|לצלם)/;
async function eveNow(source: string, list?: any[]) {
  const today = il().date, now = Date.now();
  let head = "";
  const ai = await getDoc(APP, "settings", "evening_brief");
  if (ai && ai.date === today && ai.headline) head = String(ai.headline);
  if (!head) {
    const all = await listTopics();
    const way = all.filter((t: any) => isTask(t) && OPEN.includes(t.status || "active") && t.status !== "waiting_other" && !snoozed(t, now) &&
      ((Array.isArray(t.context) && t.context.includes("out")) || ERRAND.test(String(t.title || "").trim())))
      .sort((a: any, b: any) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0));
    head = way.length ? "בדרך הביתה: " + way.slice(0, 2).map((t: any) => short(t.title, 26)).join(" · ") : "לשאול את ליאור אם צריך משהו מהדרך";
  }
  const n = await sendTo(list || (await subs()), { title: "🌆 ערב טוב", body: head, tag: "sq-eve", url: APP_URL + "#eve" });
  await putDoc(APP, "settings", "eve_last", { at: new Date().toISOString(), date: today, headline: head, by: ai && ai.date === today ? "claude" : "auto", source, sent: n });
  return { sent: n, headline: head };
}
// ---------- 10.7 (Oren 6.11.2026): Friday errands (Thu 21:30), weekend (Fri 13:00), the coming week (Sat 21:00) ----------
// Claude's routines write settings/fri_brief | weekend_brief | week_brief {date, headline, top, sections}; the app shows them (#fri/#wkend/#week).
const XB = [
  { k: "fri", wd: "Thu", at: 21 * 60 + 30, doc: "fri_brief", title: "🛒 מחר שישי", def: "הבריף לסידורים של מחר מוכן" },
  { k: "wkend", wd: "Fri", at: 13 * 60, doc: "weekend_brief", title: "🏡 סופ״ש טוב", def: "הבריף לסופ״ש מוכן" },
  { k: "week", wd: "Sat", at: 21 * 60, doc: "week_brief", title: "🗓️ שבוע טוב", def: "הבריף לשבוע הקרוב מוכן" },
];
async function xNow(x: any, source: string, list?: any[]) {
  const today = il().date;
  const ai = await getDoc(APP, "settings", x.doc);
  const head = ai && ai.date === today && ai.headline ? String(ai.headline) : x.def;
  const n = await sendTo(list || (await subs()), { title: x.title, body: head, tag: "sq-" + x.k, url: APP_URL + "#" + x.k });
  await putDoc(APP, "settings", x.k + "_last", { at: new Date().toISOString(), date: today, headline: head, by: ai && ai.date === today ? "claude" : "auto", source, sent: n });
  return { sent: n, headline: head };
}
const dayOkFor = (days: string, wd: string) => days === "sun-thu" ? !["Fri", "Sat"].includes(wd) : days === "sun-fri" ? wd !== "Sat" : true;

// ---------- critical ----------
// critical = a topic with critical:true (set by a Claude run / project when it really can't wait),
// or marked urgent by someone other than Oren. Oren's own taps never ping him. One push per topic per marking.
async function criticalTick(p: any, t0: ReturnType<typeof il>) {
  if (!p.critical && !p.abroadOn) return { critical: 0 };
  // abroad: quiet hours follow the phone's local time there
  let t = t0;
  if (p.abroadOn && p.abroad_tz) { try { t = il(Date.now(), p.abroad_tz); } catch (_) { t = t0; } }
  const quiet = p.quiet_from > p.quiet_to ? (t.hour >= p.quiet_from || t.hour < p.quiet_to) : (t.hour >= p.quiet_from && t.hour < p.quiet_to);
  if (quiet) return { critical: 0, quiet: true };
  const all = await listTopics();
  const st = (await getDoc(SRV, "state", "critical")) || {};
  const seen: Record<string, string> = st.seen || {};
  const hits = all.filter((x: any) => isTask(x) && OPEN.includes(x.status || "active") && !snoozed(x, Date.now()) &&
    (x.critical === true || (x.urgent && x.urgent_by && x.urgent_by !== "oren")));
  const fresh = hits.filter((x: any) => { const mark = String(x.critical_at || x.urgent_at || x.updated_at || "1"); return seen[x.id] !== mark; });
  if (!fresh.length) return { critical: 0 };
  const list = await subs();
  for (const x of fresh.slice(0, 3)) {
    await sendTo(list, { title: `🚨 ${short(x.title, 50)}`, body: short(x.critical_reason || x.waiting_for || x.next_step || x.stand || "צריך את תשומת הלב שלך", 160), tag: "sq-crit-" + x.id, url: APP_URL + "#t=" + encodeURIComponent(x.id) });
  }
  for (const x of fresh) seen[x.id] = String(x.critical_at || x.urgent_at || x.updated_at || "1");
  await putDoc(SRV, "state", "critical", { seen });
  return { critical: fresh.length };
}

// ---------- "צא עד" / "להתקשר עד" (10.0, Oren 6.11.2026 after missing the Kia test) ----------
// Every open task planned for today with opening hours (fit.open / fit.appt) gets up to 3 pushes:
// ~90 min before the leave/call deadline, ~20 min before, and once it is late but the place is still open.
// A task whose place is closed today gets one morning push. At 20:00 one push lists tomorrow's deadlines.
const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
function gateOk(x: any) {
  return isTask(x) && OPEN.includes(x.status || "active") && x.status !== "waiting_other" && !x.background &&
    !(x.fit && x.fit.owner === "claude") && !snoozed(x, Date.now());
}
async function gateTick(p: any, t: ReturnType<typeof il>) {
  if (p.gates === false || p.abroadOn) return { gates: 0 };
  const quiet = p.quiet_from > p.quiet_to ? (t.hour >= p.quiet_from || t.hour < p.quiet_to) : (t.hour >= p.quiet_from && t.hour < p.quiet_to);
  if (quiet) return { gates: 0, quiet: true };
  const all = await listTopics();
  const st = (await getDoc(SRV, "state", "gates")) || {};
  const sent: Record<string, number> = st.date === t.date ? (st.sent || {}) : {};
  const dow = WD[t.wd] ?? new Date().getDay();
  const gs = SQGate.list(all, t.date, dow, t.mins, gateOk);
  const out: any[] = [];
  let list: any[] | null = null;
  for (const g of gs) {
    // stage: 1 = heads-up (<=90 min), 2 = soon (<=20 min), 3 = late but still open; 9 = closed today
    let stage = 0;
    if (g.kind === "closed") stage = 9;
    else if (g.kind === "remind") stage = t.mins >= g.by && g.state !== "past" ? 2 : 0; // one push at the time
    else if (g.state !== "past") {
      const left = g.by - t.mins;
      stage = left <= 0 ? 3 : left <= 20 ? 2 : left <= 90 ? 1 : 0;
    }
    const k = g.key || g.id;
    if (!stage || (sent[k] || 0) >= stage) continue;
    if (stage === 9 && t.hour >= 13) { sent[k] = 9; continue; } // only worth saying in the morning
    const tx = SQGate.text(g);
    const pre = stage === 3 ? "⚠️ עכשיו! " : "";
    if (g.kind === "remind") { list = list || (await subs()); await sendTo(list, { title: `⏰ ${short(g.title, 60)}`, body: short(tx.body, 170), tag: "sq-gate-" + g.id, url: APP_URL + "#t=" + encodeURIComponent(g.id) }); sent[k] = stage; out.push({ id: k, stage }); continue; }
    list = list || (await subs());
    await sendTo(list, { title: `${pre}${tx.head} · ${short(g.title, 40)}`, body: short(tx.body + (g.est ? " (שעות משוערות)" : ""), 170), tag: "sq-gate-" + g.id, url: APP_URL + "#t=" + encodeURIComponent(g.id) });
    sent[k] = stage; out.push({ id: k, stage });
  }
  // tomorrow, once at 20:00-21:59
  let tom = st.tom || "";
  if (t.hour >= 20 && t.hour < 22 && tom !== t.date) {
    const d2 = new Date(Date.parse(t.date + "T12:00:00Z") + 86400000).toISOString().slice(0, 10);
    const g2 = SQGate.list(all, d2, (dow + 1) % 7, 0, gateOk);
    if (g2.length) {
      const lines = g2.slice(0, 3).map((g: any) => g.kind === "closed" ? `${short(g.title, 26)}: סגור מחר` : g.kind === "remind" ? `${short(g.title, 26)}: ⏰ ${SQGate.fmt(g.by)}` : `${short(g.title, 26)}: ${g.call ? "עד" : "צא עד"} ${SQGate.fmt(g.by)}`);
      list = list || (await subs());
      await sendTo(list, { title: "🗓️ מחר יש שעת סגירה", body: lines.join(" · "), tag: "sq-gate-tom", url: APP_URL });
      out.push({ tomorrow: g2.length });
    }
    tom = t.date;
  }
  await putDoc(SRV, "state", "gates", { date: t.date, sent, tom });
  return { gates: out };
}

async function ctxTick(t: any) {
  const now = { date: t.date, mins: t.mins };
  const all = (await listColl(APP, "topics")).filter((x: any) => SQCtx.wants(x));
  let n = 0;
  for (const x of all) {
    const r = SQCtx.apply(x, now);
    if (!r) continue;
    await putDoc(APP, "topics", x.id, r.patch);
    n++;
  }
  return n;
}

async function tick() {
  const p = await prefs(), t = il();
  const out: any = { at: t };
  // 14.3: tasks said with their context ("מחר בדרך לעבודה לקנות עוגיות") get their window and day even when the app is closed
  try { out.ctx = await ctxTick(t); } catch (e: any) { out.ctx = { error: String(e?.message || e) }; }
  const st = (await getDoc(SRV, "state", "brief")) || {};
  const [hh, mm] = String(p.brief_time || "08:00").split(":").map((x: string) => parseInt(x) || 0);
  const at = hh * 60 + mm;
  const dayOk = p.brief_days === "sun-thu" ? !["Fri", "Sat"].includes(t.wd) : p.brief_days === "sun-fri" ? t.wd !== "Sat" : true;
  // abroad mode (Oren, 2.11.2026): no brief at all, only new critical items, until abroad_until (inclusive)
  p.abroadOn = p.abroad === true && (!p.abroad_until || t.date <= p.abroad_until);
  out.abroad = p.abroadOn;
  if (p.brief && !p.abroadOn && dayOk && st.date !== t.date && t.mins >= at && t.mins < at + 180) {
    await putDoc(SRV, "state", "brief", { date: t.date }); // claim first, so two ticks never double-send
    out.brief = await briefNow("schedule");
  }
  // evening brief, same once-a-day claim (window: 120 minutes)
  const se = (await getDoc(SRV, "state", "eve")) || {};
  const [eh, em] = String(p.eve_time || "18:00").split(":").map((x: string) => parseInt(x) || 0);
  const ea = eh * 60 + em;
  if (p.eve && !p.abroadOn && dayOkFor(p.eve_days, t.wd) && se.date !== t.date && t.mins >= ea && t.mins < ea + 120) {
    await putDoc(SRV, "state", "eve", { date: t.date });
    out.eve = await eveNow("schedule");
  }
  if (p.wk !== false && !p.abroadOn) for (const x of XB) {
    if (t.wd !== x.wd || t.mins < x.at || t.mins >= x.at + 120) continue;
    const sx = (await getDoc(SRV, "state", "b_" + x.k)) || {};
    if (sx.date === t.date) continue;
    await putDoc(SRV, "state", "b_" + x.k, { date: t.date });
    out[x.k] = await xNow(x, "schedule");
  }
  out.crit = await criticalTick(p, t);
  try { out.gates = await gateTick(p, t); } catch (e: any) { out.gates = { error: String(e?.message || e) }; }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const u = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = u.searchParams.get("action") || body.action || "tick";
    if (action === "key") return json({ key: (await keys()).pub });
    if (action === "tick") return json(await tick());
    // test / brief: only to a device that is already registered (registering needs the code)
    if (action === "test" || action === "brief" || action === "eve") {
      const mine = (await subs()).filter((s: any) => s.endpoint === body.endpoint);
      if (!mine.length) return json({ error: "device not registered" }, 404);
      const st = (await getDoc(SRV, "state", "manual")) || {};
      if (st.at && Date.now() - Date.parse(st.at) < 20000) return json({ error: "too soon" }, 429);
      await putDoc(SRV, "state", "manual", { at: new Date().toISOString() });
      if (action === "test") return json({ sent: await sendTo(mine, { title: "🔔 Side Quests", body: "ההתראות עובדות. בריף בבוקר, ופה רק על דברים קריטיים.", tag: "sq-test", url: APP_URL }) });
      if (action === "eve") return json(await eveNow("manual", mine));
      return json(await briefNow("manual", mine));
    }
    return json({ error: "unknown action" }, 400);
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500);
  }
});
