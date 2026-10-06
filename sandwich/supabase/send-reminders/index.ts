import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

// שעות התזכורת (שעון ישראל). אפשר לשנות כאן.
const SLOTS = [17, 19];
const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const NAMES: Record<string, string> = { lia: "ליקי", daniela: "דנדי", evyatar: "אביה" };
const APP_URL = "https://tipul10000-droid.github.io/apps/sandwich/";

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

function israelNow() {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
  }).formatToParts(new Date());
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

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const keys = await getKeys(sb);
  if (url.searchParams.get("action") === "pubkey") return json({ publicKey: keys.pub });

  const dry = url.searchParams.get("dry") === "1";
  const now = israelNow();
  const slotParam = url.searchParams.get("slot");
  const slot = dry && slotParam ? +slotParam : SLOTS.includes(now.hour) ? now.hour : null;
  if (slot === null) return json({ skipped: "not a reminder hour", hour: now.hour });
  // בשישי בערב אין תזכורת. בשבת בערב יש (ליום ראשון).
  const todayDow = new Date(Date.UTC(now.y, now.m - 1, now.d, 12)).getUTCDay();
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

  const { data: chosen } = await sb.from("sandwich_choices").select("child").eq("for_date", iso);
  const done = new Set((chosen || []).map((r: any) => r.child));
  const { data: subs } = await sb.from("sandwich_push").select("*");
  const todo = (subs || []).filter((s: any) => !done.has(s.child));
  if (dry) return json({ dry: true, slot, target: iso, label, subscribers: (subs || []).length, wouldSend: todo.length });

  webpush.setVapidDetails(APP_URL, keys.pub, keys.priv);
  let sent = 0, removed = 0, failed = 0;
  await Promise.allSettled(todo.map(async (s: any) => {
    const name = NAMES[s.child] || "";
    const payload = slot >= 19
      ? { title: `⏰ ${name}, עוד לא בחרת סנדוויץ'`, body: `תזכורת אחרונה: בחירת סנדוויץ' ל${label}` }
      : { title: `🥪 היי ${name}!`, body: `בחירת סנדוויץ' ל${label}` };
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ ...payload, url: APP_URL, tag: `sandwich-${iso}` }),
        { TTL: 3600 },
      );
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await sb.from("sandwich_push").delete().eq("endpoint", s.endpoint);
        removed++;
      } else failed++;
    }
  }));
  return json({ slot, target: iso, sent, removed, failed });
});
