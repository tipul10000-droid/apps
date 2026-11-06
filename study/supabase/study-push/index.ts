// study-push: התראות ל-Study. רץ כל 5 דקות (pg_cron, action=tick).
// 1. דוח קטן להורים אחרי כל תרגול (זמן, תשובות, נכונות, אחוז).
// 2. מבחן קרוב וההתקדמות נמוכה: התראה להורים לבדוק עם הילד (1-2 ימים: 08/14/19, 3-5 ימים: 19).
// 3. הכל נכון לפני מבחן: מתנה לילד באפליקציה + התראה לילד ולהורים.
// 4. תור תוכן חדש (study_notify) לילדים.
// 5. בקשה או הצעה חדשה מילד (study_requests) → התראה להורים (אורן 6.11.2026).
// שעות שקט: ילדים 21:00-07:00, הורים 22:00-07:00 (מה שלא נשלח נשלח אחר כך).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const BASE = "https://tipul10000-droid.github.io/apps/study/";
const APPS = [
  { kid: "evyatar", app: "vocab", name: "אביתר", boy: true, what: "אוצר מילים באנגלית", unit: "מילים", test: "המבחן באנגלית" },
  { kid: "dani", app: "spelling", name: "דני", boy: false, what: "הכתבה באנגלית", unit: "מילים", test: "ההכתבה" },
  { kid: "lia", app: "phonics", name: "ליה", boy: false, what: "אותיות וצלילים באנגלית", unit: "צלילים", test: "המבחן" },
];
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...CORS } });

function israel(ms = Date.now()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(new Date(ms));
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return { date: `${g("year")}-${g("month")}-${g("day")}`, hour: parseInt(g("hour")) % 24 };
}
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
const inDays = (n: number) => (n === 0 ? "היום" : n === 1 ? "מחר" : n === 2 ? "מחרתיים" : `בעוד ${n} ימים`);
const mins = (s: number) => (s < 60 ? "פחות מדקה" : `${Math.round(s / 60)} דק׳`);
const ago = (iso: string | null, now: number) => {
  if (!iso) return "עוד אין";
  const h = (now - Date.parse(iso)) / 36e5;
  return h < 1 ? "בשעה האחרונה" : h < 24 ? `לפני ${Math.round(h)} שעות` : `לפני ${Math.round(h / 24)} ימים`;
};

async function getKeys(sb: any) {
  const { data } = await sb.from("study_secrets").select("k,h").in("k", ["vapid_public", "vapid_private"]);
  const m: Record<string, string> = {};
  (data || []).forEach((r: any) => (m[r.k] = r.h));
  if (!m.vapid_public || !m.vapid_private) {
    const k = webpush.generateVAPIDKeys();
    await sb.from("study_secrets").upsert([{ k: "vapid_public", h: k.publicKey }, { k: "vapid_private", h: k.privateKey }]);
    return { pub: k.publicKey, priv: k.privateKey };
  }
  return { pub: m.vapid_public, priv: m.vapid_private };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  if (url.searchParams.get("action") !== "tick") return json({ ok: false, err: "action" }, 400);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const keys = await getKeys(sb);
  webpush.setVapidDetails(BASE, keys.pub, keys.priv);
  const now = Date.now(), il = israel(now);
  const kidQuiet = il.hour >= 21 || il.hour < 7, parQuiet = il.hour >= 22 || il.hour < 7;
  const { data: subs } = await sb.from("study_push").select("*").eq("active", true);
  const out: string[] = [];

  async function push(role: "kid" | "parent", kid: string | null, msg: any) {
    const list = (subs || []).filter((s: any) => s.role === role && (role === "parent" || s.kid === kid));
    const body = JSON.stringify(msg);
    let n = 0;
    await Promise.allSettled(list.map(async (s: any) => {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 86400 }); n++; }
      catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("study_push").update({ active: false }).eq("endpoint", s.endpoint); }
    }));
    out.push(`${role}:${kid || ""}:${msg.tag}:${n}/${list.length}`);
    return n;
  }
  // מסמן ביומן; מחזיר false אם כבר נשלח
  async function once(key: string, info?: any) {
    const { error } = await sb.from("study_push_log").insert({ key, info: info || null });
    return !error;
  }

  const { data: prog } = await sb.from("study_progress").select("device,kid,app,data,updated_at");
  const { data: snaps } = await sb.from("study_sess").select("*");
  const snap = (r: any) => (snaps || []).find((s: any) => s.device === r.device && s.kid === r.kid && s.app === r.app);

  for (const A of APPS) {
    const rows = (prog || []).filter((r: any) => r.kid === A.kid && r.app === A.app);
    const best = rows.reduce((b: any, r: any) => (!b || (r.data?.done || 0) > (b.data?.done || 0) ? r : b), null);
    const done = best?.data?.done || 0, total = best?.data?.total || 0;
    const last = rows.map((r: any) => r.data?.last).filter(Boolean).sort().pop() || null;
    const { data: test } = await sb.rpc("study_test_get", { p_kid: A.kid, p_app: A.app });
    const tdays = test?.d ? dayDiff(il.date, String(test.d)) : null;
    const tline = tdays !== null && tdays >= 0 ? ` · ${A.test} ${inDays(tdays)}` : "";

    // 1. דוח אחרי תרגול (8 דקות בלי פעילות = התרגול נגמר)
    for (const r of rows) {
      const d = r.data || {}, s = snap(r) || { sec: 0, att: 0, ok: 0, done: 0 };
      const dSec = (d.sec || 0) - s.sec, dAtt = (d.att || 0) - s.att, dOk = (d.ok || 0) - s.ok;
      if (dSec < 0 || dAtt < 0) { // איפוס במכשיר: מתחילים תמונה חדשה
        await sb.from("study_sess").upsert({ device: r.device, kid: r.kid, app: r.app, sec: d.sec || 0, att: d.att || 0, ok: d.ok || 0, done: d.done || 0, seen_at: new Date().toISOString() });
        continue;
      }
      if (now - Date.parse(r.updated_at) < 8 * 60e3) continue;
      if (dSec < 60 && dAtt < 3) continue;
      if (parQuiet) continue;
      const pct = dAtt ? Math.round((dOk / dAtt) * 100) : 0;
      await push("parent", null, {
        title: `📚 ${A.name} ${A.boy ? "תרגל" : "תרגלה"} ${A.what}`,
        body: `${mins(dSec)} · ${dAtt} תשובות, ${dOk} נכונות (${pct}%) · ${A.boy ? "יודע" : "יודעת"} ${d.done || 0}/${d.total || 0} ${A.unit}${tline}`,
        tag: `sess-${A.kid}-${A.app}`, url: BASE + "parents/",
      });
      await sb.from("study_sess").upsert({ device: r.device, kid: r.kid, app: r.app, sec: d.sec || 0, att: d.att || 0, ok: d.ok || 0, done: d.done || 0, seen_at: new Date().toISOString() });
    }

    if (tdays === null || tdays < 0) continue;
    const pct = total ? Math.round((done / total) * 100) : 0;

    // 3. הכל נכון לפני מבחן (עד 7 ימים): מתנה פעם אחת לכל מבחן
    if (total > 0 && done >= total && tdays <= 7) {
      if (await once(`gift:${A.kid}:${A.app}:${test.d}`)) {
        await sb.from("study_gifts").insert({ kid: A.kid, app: A.app, kind: "bonus", note: `${A.test} ${inDays(tdays)}` });
      }
    }
    // 2. מבחן קרוב וההתקדמות נמוכה
    else if (!parQuiet && total > 0) {
      const slot = tdays <= 2 && pct < 80 ? [8, 14, 19] : tdays >= 3 && tdays <= 5 && pct < 60 ? [19] : [];
      if (slot.includes(il.hour) && (await once(`lag:${A.kid}:${A.app}:${il.date}:${il.hour}`))) {
        await push("parent", null, {
          title: `📅 ${A.name}: ${A.test} ${inDays(tdays)}`,
          body: `${A.boy ? "יודע" : "יודעת"} ${done}/${total} ${A.unit} (${pct}%), תרגול אחרון ${ago(last, now)}. כדאי לבדוק ${A.boy ? "איתו אם הוא עבד" : "איתה אם היא עבדה"} מספיק באפליקציה.`,
          tag: `lag-${A.kid}-${A.app}`, url: BASE + "parents/",
        });
      }
    }
  }

  // מתנות שעוד לא נשלחה עליהן התראה
  const { data: gifts } = await sb.from("study_gifts").select("*").gte("created_at", new Date(now - 3 * 864e5).toISOString());
  for (const g of gifts || []) {
    const A = APPS.find((a) => a.kid === g.kid && a.app === g.app);
    if (!A) continue;
    if (!parQuiet && (await once(`giftpar:${g.id}`))) {
      await push("parent", null, {
        title: `🌟 ${A.name} ${A.boy ? "יודע" : "יודעת"} הכל!`,
        body: `${A.boy ? "ענה" : "ענתה"} נכון על כל ה${A.unit}. ${g.note || ""}, ו${A.boy ? "קיבל" : "קיבלה"} מתנה באפליקציה 🎁`,
        tag: `gift-${A.kid}`, url: BASE + "parents/",
      });
    }
    if (!g.taken_at && !kidQuiet && (await once(`giftkid:${g.id}`))) {
      await push("kid", A.kid, {
        title: "🎁 יש לך מתנה!", body: `ענית נכון על הכל לפני ${A.test}. ${A.boy ? "תיכנס" : "תיכנסי"} לקבל אותה!`,
        tag: `gift-${A.kid}`, url: BASE + `${A.kid}/${A.app}/`,
      });
    }
  }

  // 4. תוכן חדש
  if (!kidQuiet) {
    const { data: q } = await sb.from("study_notify").select("*").is("sent_at", null).order("id").limit(10);
    for (const m of q || []) {
      const kids = m.kid ? [m.kid] : ["evyatar", "dani", "lia"];
      for (const k of kids) await push("kid", k, { title: m.title, body: m.body, tag: `new-${m.id}`, url: m.url || BASE + `${k}/` });
      await sb.from("study_notify").update({ sent_at: new Date().toISOString() }).eq("id", m.id);
    }
  }
  // 5. בקשות והצעות חדשות מהילדים
  if (!parQuiet) {
    const KN: Record<string, string> = { evyatar: "אביתר", dani: "דני", lia: "ליה" };
    const KK: Record<string, string> = { test: "📅 מבחן קרוב", quiz: "⏰ בוחן", hard: "🤔 לא הבנתי נושא", topic: "📚 נושא חדש ללימוד", idea: "💡 רעיון לאפליקציה", bug: "🐞 באג באפליקציה" };
    const { data: rq } = await sb.from("study_requests").select("id,kid,kind,txt").is("notified_at", null).eq("hidden", false).order("id").limit(10);
    for (const r of rq || []) {
      const boy = r.kid === "evyatar";
      await push("parent", null, {
        title: `💬 ${KN[r.kid] || r.kid} ${boy ? "שלח" : "שלחה"} בקשה: ${KK[r.kind] || ""}`,
        body: String(r.txt || "").slice(0, 140), tag: `req-${r.id}`, url: BASE + "parents/",
      });
      await sb.from("study_requests").update({ notified_at: new Date().toISOString() }).eq("id", r.id);
    }
  }
  return json({ ok: true, il, out });
});
