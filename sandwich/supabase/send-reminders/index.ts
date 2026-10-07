import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

// שעות התזכורת (שעון ישראל). אפשר לשנות כאן.
const SLOTS = [17, 19];
// תזכורת לאמא ליאורי לעדכן מה זמין בבית (שעון ישראל, ראשון עד חמישי)
const MOM_SLOTS = [10, 12];
const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const NAMES: Record<string, string> = { lia: "ליקי", daniela: "דנדי", evyatar: "אביה" };
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
    timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
  }).formatToParts(new Date(ms));
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return { y: +g("year"), m: +g("month"), d: +g("day"), hour: parseInt(g("hour")) % 24 };
}

// היום הלימודים הבא אחרי היום: ראשון עד שישי, בלי שבת.
function nextSchoolDay(y: number, m: number, d: number) {
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + 1);
  if (dt.getUTCDay() === 6) dt.setUTCDate(dt.getUTCDate() + 1);
  return dt;
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
async function replacementPush(sb: any, keys: { pub: string; priv: string }, iso: string, onlyDish?: string) {
  const { data: off } = await sb.from("sandwich_unavailable").select("dish");
  const gone = new Set((off || []).map((r: any) => r.dish));
  const { data: rows } = await sb.from("sandwich_choices").select("child,dish").eq("for_date", iso).neq("dish", "");
  const need = (rows || []).filter((r: any) => gone.has(r.dish) && (!onlyDish || r.dish === onlyDish));
  if (!need.length) return { need: 0, sent: 0 };
  const { data: subs } = await sb.from("sandwich_push").select("*").eq("active", true).in("child", need.map((r: any) => r.child));
  webpush.setVapidDetails(APP_URL, keys.pub, keys.priv);
  let sent = 0;
  const ev: any[] = [];
  await Promise.allSettled((subs || []).map(async (s: any) => {
    const dish = need.find((r: any) => r.child === s.child)!.dish;
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: `🥪 ${NAMES[s.child]}, ${dish} אזלה`, body: "צריך לבחור סנדוויץ' אחר למחר בבוקר", url: APP_URL, tag: `sandwich-gone-${iso}` }),
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

// הודעה לכל הילדים (מנה חדשה / מנה שחזרה). מגבלה: פעם אחת בכל 10 דקות.
async function broadcastKids(sb: any, keys: { pub: string; priv: string }, title: string, body: string, tag: string, evType: string, dish?: string) {
  const n = israelNow();
  const today = `${n.y}-${String(n.m).padStart(2, "0")}-${String(n.d).padStart(2, "0")}`;
  const { error: dup } = await sb.from("sandwich_push_log").insert({ for_date: today, slot: 500000 + (Math.floor(Date.now() / 600000) % 100000) });
  if (dup) return { ok: true, result: "too_soon" };
  const { data: subs } = await sb.from("sandwich_push").select("*").eq("active", true);
  const kids = (subs || []).filter((s: any) => NAMES[s.child]);
  webpush.setVapidDetails(APP_URL, keys.pub, keys.priv);
  const ev: any[] = [];
  let sent = 0;
  await Promise.allSettled(kids.map(async (s: any) => {
    try {
      await webpush.sendNotification(
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
  if (url.searchParams.get("action") === "pubkey") return json({ publicKey: keys.pub });

  // אמא ליאורי סימנה מנה כלא זמינה: מתריעים מיד לילדים שבחרו אותה
  if (url.searchParams.get("action") === "dish_off") {
    const dish = url.searchParams.get("dish") || "";
    const b = israelNow(Date.now() - 4 * 3600e3);
    const iso = nextSchoolDay(b.y, b.m, b.d).toISOString().slice(0, 10);
    return json({ ok: true, ...(await replacementPush(sb, keys, iso, dish)) });
  }

  // מנה חזרה לתפריט אחרי 4 ימים ומעלה (סרט "חזר!"): מתריעים לכל הילדים
  if (url.searchParams.get("action") === "dish_on") {
    const dish = url.searchParams.get("dish") || "";
    const { data: ret } = await sb.from("sandwich_returned").select("dish").eq("dish", dish).gte("back_at", new Date(Date.now() - 5 * 60e3).toISOString());
    if (!ret || !ret.length) return json({ ok: true, result: "not_returned" });
    return json(await broadcastKids(sb, keys, `🥪 ${dish} חזרה לתפריט!`, "אפשר לבחור אותה או להחליף את הבחירה", "sandwich-back", "dish_back_sent", dish));
  }

  // מנות חדשות בתפריט (נקרא ידנית אחרי שחרור גרסה): dishes=שם1,שם2
  if (url.searchParams.get("action") === "new_dishes") {
    const dishes = (url.searchParams.get("dishes") || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 8);
    if (!dishes.length) return json({ ok: false, error: "no dishes" }, 400);
    return json(await broadcastKids(sb, keys, "🆕 מנות חדשות בתפריט!", `${dishes.join(", ")}. אפשר לבחור או להחליף את הבחירה`, "sandwich-new", "new_dishes_sent"));
  }

  // אמא ליאורי שולחת תזכורת לילד שעוד לא בחר. הגבלה: פעם אחת לכל ילד כל 10 דקות, ורק אם לא בחר.
  if (url.searchParams.get("action") === "nudge") {
    const child = url.searchParams.get("child") || "";
    if (!NAMES[child]) return json({ ok: false, error: "bad child" }, 400);
    // היום הבא של הילדים: הבחירה נסגרת ב-04:00 (שעון ישראל)
    const b = israelNow(Date.now() - 4 * 3600e3);
    const iso = nextSchoolDay(b.y, b.m, b.d).toISOString().slice(0, 10);
    const { data: chosen } = await sb.from("sandwich_choices").select("child").eq("for_date", iso).eq("child", child).neq("dish", "");
    if (chosen && chosen.length) return json({ ok: true, result: "already_chosen" });
    const n = israelNow();
    const today = `${n.y}-${String(n.m).padStart(2, "0")}-${String(n.d).padStart(2, "0")}`;
    const idx = Object.keys(NAMES).indexOf(child) + 1;
    const slot = 100000 * idx + (Math.floor(Date.now() / 600000) % 100000);
    const { error: dup } = await sb.from("sandwich_push_log").insert({ for_date: today, slot });
    if (dup) return json({ ok: true, result: "too_soon" });
    const { data: devs } = await sb.from("sandwich_push").select("*").eq("child", child).eq("active", true);
    if (!devs || !devs.length) return json({ ok: true, result: "no_device" });
    webpush.setVapidDetails(APP_URL, keys.pub, keys.priv);
    let sent = 0;
    await Promise.allSettled(devs.map(async (s: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: `🥪 היי ${NAMES[child]}!`, body: "אמא מזכירה לבחור סנדוויץ' למחר בבוקר!", url: APP_URL, tag: `sandwich-nudge-${iso}` }),
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

  const dry = url.searchParams.get("dry") === "1";
  const now = israelNow();
  const slotParam = url.searchParams.get("slot");
  const slot = dry && slotParam ? +slotParam : SLOTS.includes(now.hour) ? now.hour : null;
  // בשישי בערב אין תזכורת. בשבת בערב יש (ליום ראשון).
  const todayDow = new Date(Date.UTC(now.y, now.m - 1, now.d, 12)).getUTCDay();
  // תזכורת חוזרת בכל שעה עגולה (16:00-23:00) לילד שבחר מנה שאזלה ועוד לא החליף
  let gone: unknown = null;
  if (!dry && todayDow !== 5 && now.hour >= 16 && now.hour <= 23) {
    const t = nextSchoolDay(now.y, now.m, now.d).toISOString().slice(0, 10);
    const today0 = `${now.y}-${String(now.m).padStart(2, "0")}-${String(now.d).padStart(2, "0")}`;
    const { error: dupG } = await sb.from("sandwich_push_log").insert({ for_date: today0, slot: 300 + now.hour });
    if (!dupG) gone = await replacementPush(sb, keys, t);
  }
  // תזכורת לאמא ליאורי לעדכן מלאי (10:00 ו-12:00, ראשון עד חמישי). אם כבר עדכנה היום, לא שולחים.
  let momRes: unknown = null;
  if (!dry && MOM_SLOTS.includes(now.hour) && todayDow >= 0 && todayDow <= 4) {
    const today1 = `${now.y}-${String(now.m).padStart(2, "0")}-${String(now.d).padStart(2, "0")}`;
    const { error: dupM } = await sb.from("sandwich_push_log").insert({ for_date: today1, slot: 400 + now.hour });
    if (!dupM) {
      const since = new Date(Date.now() - (now.hour * 3600e3 + 120e3)).toISOString();
      const { data: upd } = await sb.from("sandwich_events").select("id").in("type", ["avail_on", "avail_off"]).gte("at", since).limit(1);
      if (upd && upd.length) momRes = { skipped: "already updated today" };
      else {
        const { data: devs } = await sb.from("sandwich_push").select("*").eq("child", "mom").eq("active", true);
        webpush.setVapidDetails(APP_URL, keys.pub, keys.priv);
        let ms = 0;
        await Promise.allSettled((devs || []).map(async (s: any) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ title: "🛒 אמא ליאורי, מה יש בבית?", body: "אפשר לעדכן מה זמין לקראת הבחירה של הילדים אחרי הלימודים", url: APP_URL, tag: `sandwich-mom-${today1}` }),
              { TTL: 3600 },
            );
            ms++;
          } catch (e: any) {
            if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("sandwich_push").delete().eq("endpoint", s.endpoint);
          }
        }));
        if (ms) await logEv(sb, [{ child: "mom", type: "mom_reminder_sent", meta: { hour: now.hour } }]);
        momRes = { sent: ms };
      }
    }
  }
  if (slot === null) return json({ skipped: "not a reminder hour", hour: now.hour, gone, mom: momRes });
  if (todayDow === 5) return json({ skipped: "no reminder on Friday" });

  const target = nextSchoolDay(now.y, now.m, now.d);
  const iso = target.toISOString().slice(0, 10);
  const label = `יום ${DAYS[target.getUTCDay()]} · ${target.getUTCDate()}.${target.getUTCMonth() + 1}`;

  if (!dry) {
    // כל שעת תזכורת נשלחת פעם אחת ביום, גם אם הפונקציה נקראת כמה פעמים
    const today = `${now.y}-${String(now.m).padStart(2, "0")}-${String(now.d).padStart(2, "0")}`;
    const { error } = await sb.from("sandwich_push_log").insert({ for_date: today, slot });
    if (error) return json({ skipped: "already sent", slot });
  }

  const { data: chosen } = await sb.from("sandwich_choices").select("child").eq("for_date", iso).neq("dish", "");
  const done = new Set((chosen || []).map((r: any) => r.child));
  const { data: subs } = await sb.from("sandwich_push").select("*").eq("active", true);
  const todo = (subs || []).filter((s: any) => NAMES[s.child] && !done.has(s.child));
  if (dry) return json({ dry: true, slot, target: iso, label, subscribers: (subs || []).length, wouldSend: todo.length });

  webpush.setVapidDetails(APP_URL, keys.pub, keys.priv);
  let sent = 0, removed = 0, failed = 0;
  const evs: any[] = [];
  await Promise.allSettled(todo.map(async (s: any) => {
    const name = NAMES[s.child] || "";
    const payload = slot >= 19
      ? { title: `⏰ ${name}, עוד לא בחרת`, body: "תזכורת לבחור סנדוויץ' למחר בבוקר!" }
      : { title: `🥪 היי ${name}!`, body: "תזכורת לבחור סנדוויץ' למחר בבוקר!" };
    try {
      await webpush.sendNotification(
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
  return json({ slot, target: iso, sent, removed, failed, gone });
});
