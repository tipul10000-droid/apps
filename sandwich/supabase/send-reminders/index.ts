import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

// שעות התזכורת (שעון ישראל). אפשר לשנות כאן.
const SLOTS = [17, 19];
// תזכורת לאמא ליאורי לעדכן מה זמין בבית (שעון ישראל, ראשון עד חמישי)
const MOM_SLOTS = [10, 12];
const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
// משפחות: a = הראשונה, b = השנייה. מזהי הילדים ייחודיים, והבחירה נעשית לפי הפרמטר fam (ברירת מחדל a).
// off = היסט למספרי ה-slot בטבלת היומן (sandwich_push_log), כדי שהגבלות "פעם אחת" לא יתנגשו בין משפחות.
// wake = משפחה שבה ילד שבחר 4 פריטים ומעלה מקבל תזכורות הערה בבוקר (6:00 עד 6:30, כל 5 דקות). הבחירות נשמרות כטקסט אחד עם | ביניהם.
type Fam = { key: string; kids: Record<string, string>; fem: string[]; mom: string; momName: string; off: number; wake?: number };
const FAMS: Record<string, Fam> = {
  a: { key: "a", kids: { lia: "ליקי", daniela: "דנדי", evyatar: "אביה" }, fem: ["lia", "daniela"], mom: "mom", momName: "אמא ליאורי", off: 0 },
  b: { key: "b", kids: { ron: "רון", omer: "עומר", uri: "אורי" }, fem: ["uri"], mom: "mom_b", momName: "אמא", off: 10_000_000, wake: 4 },
};
const famOf = (url: URL): Fam => FAMS[url.searchParams.get("fam") || "a"] || FAMS.a;
const ALLNAMES: Record<string, string> = Object.assign({}, ...Object.values(FAMS).map((f) => f.kids));
const todayStr = (n: { y: number; m: number; d: number }) => `${n.y}-${String(n.m).padStart(2, "0")}-${String(n.d).padStart(2, "0")}`;
const APP_URL = "https://tipul10000-droid.github.io/apps/sandwich/";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...CORS } });

// יומן אירועים לסטטיסטיקה (נכתב רק מהשרת)
const logEv = async (sb: any, rows: any[]) => { if (rows.length) await sb.from("sandwich_events").insert(rows); };

function israelNow(ms: number = Date.now()) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(ms));
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return { y: +g("year"), m: +g("month"), d: +g("day"), hour: parseInt(g("hour")) % 24, minute: +g("minute") };
}

// היום הלימודים הבא אחרי היום: ראשון עד שישי, בלי שבת.
function nextSchoolDay(y: number, m: number, d: number) {
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + 1);
  if (dt.getUTCDay() === 6) dt.setUTCDate(dt.getUTCDate() + 1);
  return dt;
}


// מצב מנהל: כל התראה שנשלחת לילד או לאמא נשלחת גם כעותק למכשירי המנהל (child = "admin"), כדי לראות מה כולם מקבלים
const WHO: Record<string, string> = { ...ALLNAMES, mom: "אמא", mom_b: "אמא (משפחה 2)" };
let EP: Record<string, string> = {};
let ADMINS: any[] = [];
let SB: any = null;
async function loadAdmin(sb: any) {
  SB = sb;
  const { data } = await sb.from("sandwich_push").select("*").eq("active", true);
  EP = {}; (data || []).forEach((r: any) => (EP[r.endpoint] = r.child));
  ADMINS = (data || []).filter((r: any) => r.child === "admin");
}
async function sendPush(sub: any, payload: string, opts?: any) {
  const res = await webpush.sendNotification(sub, payload, opts);
  const who = EP[sub.endpoint];
  if (who && WHO[who] && ADMINS.length) {
    let p: any = {};
    try { p = JSON.parse(payload); } catch (_) { /* ignore */ }
    const copy = JSON.stringify({ ...p, title: `\u{1F441}\uFE0F ${WHO[who]}: ${p.title || ""}`, tag: `${p.tag || "sandwich"}-adm-${who}` });
    await Promise.allSettled(ADMINS.map(async (a: any) => {
      try { await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, copy, opts); }
      catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await SB.from("sandwich_push").delete().eq("endpoint", a.endpoint); }
    }));
  }
  return res;
}

// זוג מפתחות VAPID נוצר בשרת בפעם הראשונה ונשמר בטבלה נעולה. המפתח הפרטי לא יוצא מהשרת.
async function getKeys(sb: any) {
  const { data } = await sb.from("sandwich_secrets").select("name,value").in("name", ["vapid_public", "vapid_private"]);
  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => (map[r.name] = r.value));
  if (!map.vapid_public || !map.vapid_private) {
    const k = webpush.generateVAPIDKeys();
    await sb.from("sandwich_secrets").upsert([
      { name: "vapid_public", value: k.publicKey },
      { name: "vapid_private", value: k.privateKey },
    ]);
    return { pub: k.publicKey, priv: k.privateKey };
  }
  return { pub: map.vapid_public, priv: map.vapid_private };
}

// ילדים שבחרו מנה שאזלה מקבלים התראה לבחור מחדש. onlyDish: מגביל למנה אחת (בזמן הסימון).
async function replacementPush(sb: any, keys: { pub: string; priv: string }, F: Fam, iso: string, onlyDish?: string) {
  const { data: off } = await sb.from("sandwich_unavailable").select("dish").eq("fam", F.key);
  const gone = new Set((off || []).map((r: any) => r.dish));
  const { data: rows } = await sb.from("sandwich_choices").select("child,dish").eq("for_date", iso).neq("dish", "");
  const items = (d: string) => String(d).split("|");
  const need = (rows || []).map((r: any) => ({ child: r.child, dish: items(r.dish).find((x) => gone.has(x) && (!onlyDish || x === onlyDish)) }))
    .filter((r: any) => F.kids[r.child] && r.dish);
  if (!need.length) return { need: 0, sent: 0 };
  const { data: subs } = await sb.from("sandwich_push").select("*").eq("active", true).in("child", need.map((r: any) => r.child));
  webpush.setVapidDetails(APP_URL, keys.pub, keys.priv);
  let sent = 0;
  const ev: any[] = [];
  await Promise.allSettled((subs || []).map(async (s: any) => {
    const dish = need.find((r: any) => r.child === s.child)!.dish;
    try {
      await sendPush(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: `🥪 ${F.kids[s.child]}, ${dish} אזלה`, body: "צריך לבחור סנדוויץ' אחר למחר בבוקר", url: APP_URL, tag: `sandwich-gone-${iso}` }),
        { TTL: 3600 },
      );
      sent++;
      ev.push({ child: s.child, type: "replace_sent", dish, for_date: iso });
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("sandwich_push").delete().eq("endpoint", s.endpoint);
    }
  }));
  await logEv(sb, ev);
  return { need: need.length, sent };
}

// מנה יומית: ממלא בחירה ליום iso לילד שיש לו מנה יומית זמינה ועוד אין לו שורה ליום הזה (שורה ריקה = ביטול ידני, לא נוגעים)
async function applyDaily(sb: any, F: Fam, iso: string) {
  const { data: dl0 } = await sb.from("sandwich_daily").select("child,dish");
  const dl = (dl0 || []).filter((r: any) => F.kids[r.child]);
  if (!dl.length) return { filled: 0 };
  const { data: off } = await sb.from("sandwich_unavailable").select("dish").eq("fam", F.key);
  const gone = new Set((off || []).map((r: any) => r.dish));
  const { data: have } = await sb.from("sandwich_choices").select("child").eq("for_date", iso);
  const has = new Set((have || []).map((r: any) => r.child));
  const todo = dl.filter((r: any) => !has.has(r.child) && !gone.has(r.dish));
  if (!todo.length) return { filled: 0 };
  const { error } = await sb.from("sandwich_choices").upsert(todo.map((r: any) => ({ child: r.child, for_date: iso, dish: r.dish, updated_at: new Date().toISOString() })), { onConflict: "child,for_date", ignoreDuplicates: true });
  if (error) return { filled: 0, error: error.message };
  await logEv(sb, todo.map((r: any) => ({ child: r.child, type: "daily_auto", dish: r.dish, for_date: iso })));
  return { filled: todo.length };
}

// הודעה לכל הילדים (מנה חדשה / מנה שחזרה). מגבלה: פעם אחת בכל 10 דקות.
async function broadcastKids(sb: any, keys: { pub: string; priv: string }, F: Fam, title: string, body: string, tag: string, evType: string, dish?: string, everyone = false) {
  const n = israelNow();
  const today = todayStr(n);
  const { error: dup } = await sb.from("sandwich_push_log").insert({ for_date: today, slot: F.off + 500000 + (Math.floor(Date.now() / 600000) % 100000) });
  if (dup) return { ok: true, result: "too_soon" };
  const { data: subs } = await sb.from("sandwich_push").select("*").eq("active", true);
  const kids = (subs || []).filter((s: any) => F.kids[s.child] || (everyone && s.child === F.mom));
  webpush.setVapidDetails(APP_URL, keys.pub, keys.priv);
  const ev: any[] = [];
  let sent = 0;
  await Promise.allSettled(kids.map(async (s: any) => {
    try {
      await sendPush(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title, body, url: APP_URL, tag }),
        { TTL: 3600 },
      );
      sent++;
      ev.push({ child: s.child, type: evType, dish: dish || null });
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("sandwich_push").delete().eq("endpoint", s.endpoint);
    }
  }));
  await logEv(sb, ev);
  return { ok: true, result: sent ? "sent" : "no_device", sent };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const keys = await getKeys(sb);
  await loadAdmin(sb);
  const action = url.searchParams.get("action");
  if (action === "pubkey") return json({ publicKey: keys.pub });
  const F = famOf(url);

  // אמא סימנה מנה כלא זמינה: מתריעים מיד לילדים שבחרו אותה
  if (action === "dish_off") {
    const dish = url.searchParams.get("dish") || "";
    const b = israelNow(Date.now() - 9 * 3600e3);
    const iso = nextSchoolDay(b.y, b.m, b.d).toISOString().slice(0, 10);
    return json({ ok: true, ...(await replacementPush(sb, keys, F, iso, dish)) });
  }

  // מנה חזרה לתפריט אחרי 4 ימים ומעלה (סרט "חזר!"): מתריעים לכל הילדים
  if (action === "dish_on") {
    const dish = url.searchParams.get("dish") || "";
    const { data: ret } = await sb.from("sandwich_returned").select("dish").eq("fam", F.key).eq("dish", dish).gte("back_at", new Date(Date.now() - 5 * 60e3).toISOString());
    if (!ret || !ret.length) return json({ ok: true, result: "not_returned" });
    return json(await broadcastKids(sb, keys, F, `🥪 ${dish} חזרה לתפריט!`, "אפשר לבחור אותה או להחליף את הבחירה", "sandwich-back", "dish_back_sent", dish));
  }

  // מנות חדשות בתפריט (נקרא ידנית אחרי שחרור גרסה): dishes=שם1,שם2
  if (action === "new_dishes") {
    const dishes = (url.searchParams.get("dishes") || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 8);
    if (!dishes.length) return json({ ok: false, error: "no dishes" }, 400);
    return json(await broadcastKids(sb, keys, F, "🆕 מנות חדשות בתפריט!", `${dishes.join(", ")}. אפשר לבחור או להחליף את הבחירה`, "sandwich-new", "new_dishes_sent"));
  }

  // פיצ'רים חדשים באפליקציה (נקרא ידנית אחרי שחרור גרסה): הודעה לכולם, כולל אמא
  if (action === "new_features") {
    return json(await broadcastKids(sb, keys, F, "🎉 שני פיצ'רים חדשים!", "סטטיסטיקה ומנה יומית. נכנסים לנסות", "sandwich-features", "features_sent", undefined, true));
  }

  // ילד בחר או שינה מנה: התראה מיידית לאמא. המנה נקראת מהמסד (לא מהבקשה), ואין התראה על ביטול.
  if (action === "chose") {
    const child = url.searchParams.get("child") || "";
    if (!F.kids[child]) return json({ ok: false, error: "bad child" }, 400);
    const b = israelNow(Date.now() - 9 * 3600e3);
    const t = nextSchoolDay(b.y, b.m, b.d);
    const iso = t.toISOString().slice(0, 10);
    const { data: row } = await sb.from("sandwich_choices").select("dish").eq("for_date", iso).eq("child", child).maybeSingle();
    const dish = row?.dish || "";
    if (!dish) return json({ ok: true, result: "no_choice" });
    const today = todayStr(israelNow());
    const idx = Object.keys(F.kids).indexOf(child) + 1;
    const { error: dup } = await sb.from("sandwich_push_log").insert({ for_date: today, slot: F.off + 200000 + idx * 10000 + (Math.floor(Date.now() / 5000) % 10000) });
    if (dup) return json({ ok: true, result: "too_soon" });
    const { data: devs } = await sb.from("sandwich_push").select("*").eq("child", F.mom).eq("active", true);
    if (!devs || !devs.length) return json({ ok: true, result: "no_device" });
    webpush.setVapidDetails(APP_URL, keys.pub, keys.priv);
    const fem = F.fem.includes(child);
    const changed = url.searchParams.get("changed") === "1";
    const verb = changed ? (fem ? "שינתה" : "שינה") : (fem ? "בחרה" : "בחר");
    let sent = 0;
    await Promise.allSettled(devs.map(async (s: any) => {
      try {
        await sendPush(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: `🥪 ${F.kids[child]} ${verb} סנדוויץ'`, body: `${dish.split("|").join(" + ")} · יום ${DAYS[t.getUTCDay()]}`, url: APP_URL, tag: `sandwich-chose-${child}` }),
          { TTL: 3600 },
        );
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("sandwich_push").delete().eq("endpoint", s.endpoint);
      }
    }));
    if (sent) await logEv(sb, [{ child, type: "choice_notify_sent", dish, for_date: iso }]);
    return json({ ok: true, result: sent ? "sent" : "no_device", sent });
  }

  // אמא שולחת תזכורת לילד שעוד לא בחר. הגבלה: פעם אחת לכל ילד כל 10 דקות, ורק אם לא בחר.
  if (action === "nudge") {
    const child = url.searchParams.get("child") || "";
    if (!F.kids[child]) return json({ ok: false, error: "bad child" }, 400);
    // היום הבא של הילדים: היום מתחלף ב-09:00 (שעון ישראל)
    const b = israelNow(Date.now() - 9 * 3600e3);
    const iso = nextSchoolDay(b.y, b.m, b.d).toISOString().slice(0, 10);
    const { data: chosen } = await sb.from("sandwich_choices").select("child").eq("for_date", iso).eq("child", child).neq("dish", "");
    if (chosen && chosen.length) return json({ ok: true, result: "already_chosen" });
    const today = todayStr(israelNow());
    const idx = Object.keys(F.kids).indexOf(child) + 1;
    const slot = F.off + 100000 * idx + (Math.floor(Date.now() / 600000) % 100000);
    const { error: dup } = await sb.from("sandwich_push_log").insert({ for_date: today, slot });
    if (dup) return json({ ok: true, result: "too_soon" });
    const { data: devs } = await sb.from("sandwich_push").select("*").eq("child", child).eq("active", true);
    if (!devs || !devs.length) return json({ ok: true, result: "no_device" });
    webpush.setVapidDetails(APP_URL, keys.pub, keys.priv);
    let sent = 0;
    await Promise.allSettled(devs.map(async (s: any) => {
      try {
        await sendPush(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: `🥪 היי ${F.kids[child]}!`, body: "אמא מזכירה לבחור סנדוויץ' למחר בבוקר!", url: APP_URL, tag: `sandwich-nudge-${iso}` }),
          { TTL: 3600 },
        );
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("sandwich_push").delete().eq("endpoint", s.endpoint);
      }
    }));
    if (sent) await logEv(sb, [{ child, type: "nudge_sent", for_date: iso }]);
    return json({ ok: true, result: sent ? "sent" : "no_device", sent });
  }

  // תזכורות הערה בבוקר: ילד שבחר 4 פריטים ומעלה מקבל תזכורת ב-6:00 ובכל 5 דקות עד 6:30, כדי שיקום ויכין לעצמו.
  // נקרא כל 5 דקות (pg_cron, ראו sql/multi.sql) ופועל רק בין 6:00 ל-6:34 שעון ישראל, ראשון עד שישי. dry=1 בודק בלי לשלוח.
  if (action === "wake") return json(await wakeFamily(sb, keys, F, url.searchParams.get("dry") === "1", url.searchParams.get("at")));

  // תזמון (כל שעה עגולה): כל משפחה בנפרד. dry=1 בודק בלי לשלוח; fam=b מגביל למשפחה אחת (בבדיקות).
  const dry = url.searchParams.get("dry") === "1";
  const only = url.searchParams.get("fam");
  const out: Record<string, unknown> = {};
  for (const f of Object.values(FAMS)) {
    if (only && only !== f.key) continue;
    out[f.key] = await cronFamily(sb, keys, f, url, dry);
  }
  return json(only ? out[only] ?? out : out);
});

async function cronFamily(sb: any, keys: { pub: string; priv: string }, F: Fam, url: URL, dry: boolean) {
  const now = israelNow();
  const today = todayStr(now);
  // מנה יומית: מ-09:00 (תחילת היום) בוחרים אוטומטית לילדים שסימנו מנה יומית ועוד אין להם בחירה (גם לא ביטול ידני)
  let daily: unknown = null;
  if (!dry && now.hour >= 9) daily = await applyDaily(sb, F, nextSchoolDay(now.y, now.m, now.d).toISOString().slice(0, 10));
  const slotParam = url.searchParams.get("slot");
  const slot = dry && slotParam ? +slotParam : SLOTS.includes(now.hour) ? now.hour : null;
  // בשישי בערב אין תזכורת. בשבת בערב יש (ליום ראשון).
  const todayDow = new Date(Date.UTC(now.y, now.m - 1, now.d, 12)).getUTCDay();
  // תזכורת חוזרת בכל שעה עגולה (16:00-23:00) לילד שבחר מנה שאזלה ועוד לא החליף
  let gone: unknown = null;
  if (!dry && todayDow !== 5 && now.hour >= 16 && now.hour <= 23) {
    const t = nextSchoolDay(now.y, now.m, now.d).toISOString().slice(0, 10);
    const { error: dupG } = await sb.from("sandwich_push_log").insert({ for_date: today, slot: F.off + 300 + now.hour });
    if (!dupG) gone = await replacementPush(sb, keys, F, t);
  }
  // תזכורת לאמא לעדכן מלאי (10:00 ו-12:00, ראשון עד חמישי). אם כבר עדכנה היום, לא שולחים.
  let momRes: unknown = null;
  if (!dry && MOM_SLOTS.includes(now.hour) && todayDow >= 0 && todayDow <= 4) {
    const { error: dupM } = await sb.from("sandwich_push_log").insert({ for_date: today, slot: F.off + 400 + now.hour });
    if (!dupM) {
      const since = new Date(Date.now() - (now.hour * 3600e3 + 120e3)).toISOString();
      const { data: upd } = await sb.from("sandwich_events").select("id").eq("child", F.mom).in("type", ["avail_on", "avail_off"]).gte("at", since).limit(1);
      if (upd && upd.length) momRes = { skipped: "already updated today" };
      else {
        const { data: devs } = await sb.from("sandwich_push").select("*").eq("child", F.mom).eq("active", true);
        webpush.setVapidDetails(APP_URL, keys.pub, keys.priv);
        let ms = 0;
        await Promise.allSettled((devs || []).map(async (s: any) => {
          try {
            await sendPush(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ title: `🛒 ${F.momName}, מה יש בבית?`, body: "אפשר לעדכן מה זמין לקראת הבחירה של הילדים אחרי הלימודים", url: APP_URL, tag: `sandwich-mom-${today}` }),
              { TTL: 3600 },
            );
            ms++;
          } catch (e: any) {
            if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("sandwich_push").delete().eq("endpoint", s.endpoint);
          }
        }));
        if (ms) await logEv(sb, [{ child: F.mom, type: "mom_reminder_sent", meta: { hour: now.hour } }]);
        momRes = { sent: ms };
      }
    }
  }
  if (slot === null) return { skipped: "not a reminder hour", hour: now.hour, gone, mom: momRes, daily };
  if (todayDow === 5) return { skipped: "no reminder on Friday" };

  const target = nextSchoolDay(now.y, now.m, now.d);
  const iso = target.toISOString().slice(0, 10);
  const label = `יום ${DAYS[target.getUTCDay()]} · ${target.getUTCDate()}.${target.getUTCMonth() + 1}`;

  if (!dry) {
    // כל שעת תזכורת נשלחת פעם אחת ביום, גם אם הפונקציה נקראת כמה פעמים
    const { error } = await sb.from("sandwich_push_log").insert({ for_date: today, slot: F.off + slot });
    if (error) return { skipped: "already sent", slot };
  }

  const { data: chosen } = await sb.from("sandwich_choices").select("child").eq("for_date", iso).neq("dish", "");
  const done = new Set((chosen || []).map((r: any) => r.child));
  const { data: subs } = await sb.from("sandwich_push").select("*").eq("active", true);
  const todo = (subs || []).filter((s: any) => F.kids[s.child] && !done.has(s.child));
  if (dry) return { dry: true, slot, target: iso, label, subscribers: (subs || []).length, wouldSend: todo.length };

  webpush.setVapidDetails(APP_URL, keys.pub, keys.priv);
  let sent = 0, removed = 0, failed = 0;
  const evs: any[] = [];
  await Promise.allSettled(todo.map(async (s: any) => {
    const name = F.kids[s.child] || "";
    const payload = slot >= 19
      ? { title: `⏰ ${name}, עוד לא בחרת`, body: "תזכורת לבחור סנדוויץ' למחר בבוקר!" }
      : { title: `🥪 היי ${name}!`, body: "תזכורת לבחור סנדוויץ' למחר בבוקר!" };
    try {
      await sendPush(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ ...payload, url: APP_URL, tag: `sandwich-${iso}` }),
        { TTL: 3600 },
      );
      sent++;
      evs.push({ child: s.child, type: "reminder_sent", for_date: iso, meta: { slot } });
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await sb.from("sandwich_push").delete().eq("endpoint", s.endpoint);
        removed++;
      } else failed++;
    }
  }));
  await logEv(sb, evs);
  return { slot, target: iso, sent, removed, failed, gone, daily };
}

async function wakeFamily(sb: any, keys: { pub: string; priv: string }, F: Fam, dry: boolean, at: string | null) {
  if (!F.wake) return { skipped: "family has no wake" };
  const now = israelNow();
  // at=HH:MM רק לבדיקה (עם dry=1)
  const hour = dry && at ? +at.split(":")[0] : now.hour, minute = dry && at ? +at.split(":")[1] : now.minute;
  if (hour !== 6 || minute > 34) return { skipped: "not wake time", hour, minute };
  const dow = new Date(Date.UTC(now.y, now.m - 1, now.d, 12)).getUTCDay();
  if (dow === 6) return { skipped: "saturday" };
  const iso = todayStr(now);
  const idx = Math.floor(minute / 5); // 0..6
  const { data: rows } = await sb.from("sandwich_choices").select("child,dish").eq("for_date", iso).neq("dish", "");
  const want = (rows || []).map((r: any) => ({ child: r.child, items: String(r.dish).split("|").filter(Boolean) }))
    .filter((r: any) => F.kids[r.child] && r.items.length >= F.wake!);
  if (!want.length) return { skipped: "nobody chose enough", idx };
  if (dry) return { dry: true, idx, kids: want.map((r: any) => ({ child: r.child, n: r.items.length })) };
  // כל סבב נשלח פעם אחת, גם אם הפונקציה נקראת כמה פעמים
  const { error: dup } = await sb.from("sandwich_push_log").insert({ for_date: iso, slot: F.off + 700 + idx });
  if (dup) return { skipped: "already sent", idx };
  const { data: subs } = await sb.from("sandwich_push").select("*").eq("active", true).in("child", want.map((r: any) => r.child));
  webpush.setVapidDetails(APP_URL, keys.pub, keys.priv);
  let sent = 0;
  const ev: any[] = [];
  await Promise.allSettled((subs || []).map(async (s: any) => {
    const w = want.find((r: any) => r.child === s.child)!;
    const fem = F.fem.includes(s.child);
    try {
      await sendPush(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({
          title: `⏰ ${F.kids[s.child]}, ${fem ? "קומי" : "קום"} להכין לבד!`,
          body: `אמא והאפליקציה: ביקשת ${w.items.length} דברים (${w.items.join(", ")}), אז ${fem ? "מכינה" : "מכין"} בעצמך`,
          url: APP_URL, tag: `sandwich-wake-${iso}-${idx}`,
        }),
        { TTL: 300 },
      );
      sent++;
      ev.push({ child: s.child, type: "wake_sent", for_date: iso, meta: { n: w.items.length, idx } });
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("sandwich_push").delete().eq("endpoint", s.endpoint);
    }
  }));
  await logEv(sb, ev);
  return { sent, idx, kids: want.length };
}
