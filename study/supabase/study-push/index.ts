// study-push: התראות ל-Study. רץ כל 5 דקות (pg_cron, action=tick).
// 1. דוח קטן להורים אחרי כל תרגול (זמן, תשובות, נכונות, אחוז).
// 2. מבחן קרוב וההתקדמות נמוכה: התראה להורים לבדוק עם הילד (1-2 ימים: 08/14/19, 3-5 ימים: 19).
// 3. הכל נכון לפני מבחן: מתנה לילד באפליקציה + התראה לילד ולהורים.
// 4. תור תוכן חדש (study_notify) לילדים.
// 5. בקשה או הצעה חדשה מילד (study_requests) → התראה להורים (אורן 6.11.2026).
// 6. ציון שהילד הזין בעצמו (study_results.by_kid) → התראה להורים (אורן 19.11.2026).
// 7. שבוע אחרי מבחן בלי ציון, אם הילד למד את התוכן באפליקציה לפני המבחן → התראה לילד להזין ציון (study_score_due, פעם אחת למבחן, 17:00).
// 8. תזכורת יומית לתוכן חדש שעוד לא התחילו (אורן 19.11.2026, כלל לכל הילדים ולכל תוכן): תוכן שאושר באזור ההורים (study_content)
//    ואין לו אף שורת התקדמות (study_progress) יום אחרי האישור = תזכורת אחת ביום לילד (מ-16:00), עם עידוד והסיבה (NUDGE.why).
//    אחת ביום לכל ילד גם כשמחכים כמה תכנים. עד 14 ימים מהאישור; לא אחרי שהמבחן של התוכן עבר או קיבל ציון. ?action=nudge_preview = מה יישלח, בלי לשלוח.
// 9. ילד התחיל תוכן חדש (אורן 19.11.2026, כלל קבוע לכל הילדים ולכל תוכן חדש): השורה הראשונה ב-study_progress של תוכן שאושר (study_content)
//    = התראה להורים "X התחיל/ה את Y" (בסבב הקרוב, עד 5 דק׳). כשהסשן הראשון נגמר (האפליקציה נסגרה: 5 דק׳ בלי דיווח מאותו מכשיר)
//    = התראה שנייה עם כמה זמן היה/הייתה באפליקציה, זמן לימוד פעיל ותשובות. יומן: start:<kid>/<app>, firstend:<kid>/<app>.
//    רק התחלות מאז START (לא על תכנים שכבר התחילו לפני הכלל). ?action=start_preview = מה יישלח, בלי לשלוח.
// 10. 🙋 בקשת עזרה מקרוב משפחה (help.js, אורן 19.11.2026, כל הילדים וכל תוכן): פירוט ב-helpApi למטה.
// הורים מקבלים רק על ילדי המשפחה שלהם (9.11.2026): ב-study_push להורה kid = '' (משפחה a) או מזהה המשפחה ('b'), והמשפחה של כל ילד מ-study_kids.
// שעות שקט: ילדים 21:00-07:00, הורים 22:00-07:00 (מה שלא נשלח נשלח אחר כך).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const BASE = "https://tipul10000-droid.github.io/apps/study/";
const APPS = [
  { kid: "evyatar", app: "vocab", name: "אביתר", boy: true, what: "אוצר מילים באנגלית", unit: "מילים", test: "המבחן באנגלית" },
  { kid: "dani", app: "spelling", name: "דני", boy: false, what: "הכתבה באנגלית", unit: "מילים", test: "ההכתבה" },
  // ליה עוד לא בדוחות התרגול (לא נפרס; לשאול את אורן לפני שמוסיפים):
  // { kid: "lia", app: "phonics", name: "ליה", boy: false, what: "אותיות וצלילים באנגלית", unit: "צלילים", test: "המבחן" },
  { kid: "levi", app: "phonics", name: "לביא", boy: true, what: "אותיות וצלילים באנגלית", unit: "צלילים", test: "המבחן" },
];
// תוכן חדש = שורה כאן: n = איך קוראים לו בהתראה, why = למה זה חשוב (משפט מלא, בלשון הילד: {ת} / {י} מתחלפים לפי מין).
const NUDGE: Record<string, { n: string; why: string }> = {
  "lia/math4": { n: "חיזוק המתמטיקה 🚀 מסע בין הכוכבים", why: "הוא נבנה בדיוק בשבילך, כדי לסגור את הפערים שמצאנו במבחן המיפוי של תחילת השנה." },
  "dani/math6": { n: "חיזוק המתמטיקה 🎤 סיבוב הופעות", why: "הוא נבנה בדיוק בשבילך, כדי לסגור את הפערים שמצאנו במבחן המיפוי של תחילת השנה." },
  "dani/spelling2": { n: "ההכתבה החדשה באנגלית (מילים מהבית)", why: "ככה תגיע{י} להכתבה כש{את|אתה} כבר יודע{ת} את כל המילים." },
  "dani/spelling": { n: "ההכתבה באנגלית", why: "ככה תגיע{י} להכתבה כש{את|אתה} כבר יודע{ת} את כל המילים." },
  "lia/mult": { n: "לוח הכפל 🐞 חרקי חלל", why: "לוח הכפל הוא הבסיס של כמעט כל המתמטיקה בכיתה ד׳, ועם כל כוכב הוא נהיה קל יותר." },
  "lia/phonics": { n: "אותיות וצלילים באנגלית", why: "ככה תוכל{י} לקרוא מילים באנגלית לבד." },
  "evyatar/past": { n: "החזרה על past simple ו-past progressive", why: "ככה תגיע{י} לבוחן מוכן{ה} ורגוע{ה}." },
  "evyatar/econ": { n: "הבוחן בכלכלה", why: "ככה תגיע{י} לבוחן מוכן{ה} ורגוע{ה}." },
  "evyatar/pres": { n: "ההכנה לבוחן באנגלית (present simple ו-present continuous)", why: "ככה תגיע{י} לבוחן מוכן{ה} ורגוע{ה}, כש{את|אתה} כבר יודע{ת} מתי כל זמן מתאים." },
  "evyatar/hist": { n: "הבוחן בהיסטוריה", why: "ככה תגיע{י} לבוחן מוכן{ה} ורגוע{ה}." },
  "shilo/numbers": { n: "המספרים של שילה", why: "ככה תכיר{י} את כל המספרים עד 10." },
  "dani/tanach": { n: "ההכנה למבחן בתנ״ך (יהושע א׳-ו׳)", why: "ככה תגיע{י} למבחן מוכן{ה} ורגוע{ה}, כש{את|אתה} כבר יודע{ת} את כל הפרקים." },
};
// שלב 9: מתחילים לספור מרגע הכלל (19.11.2026), כדי שלא תצא התראה על תכנים שכבר התחילו קודם.
const START = Date.parse("2026-11-19T13:45:00Z");
const KN: Record<string, string> = { evyatar: "אביתר", dani: "דני", lia: "ליה", levi: "לביא", shilo: "שילה" };
const BOY: Record<string, boolean> = { evyatar: true, levi: true, shilo: true };
// {י} = "י" לבת, ריק לבן; {ה} / {ת} כנ"ל; {את|אתה} = בת|בן
const g = (t: string, boy: boolean) => t.replace(/\{([^}|]*)\|([^}]*)\}/g, (_, f, m) => (boy ? m : f)).replace(/\{([^}]*)\}/g, (_, x) => (boy ? "" : x));
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
  const action = url.searchParams.get("action");
  if (!["tick", "nudge_preview", "start_preview", "help", "avail", "iam", "wa"].includes(action || "")) return json({ ok: false, err: "action" }, 400);
  const preview = action !== "tick";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const keys = await getKeys(sb);
  webpush.setVapidDetails(BASE, keys.pub, keys.priv);
  const now = Date.now(), il = israel(now);
  const kidQuiet = il.hour >= 21 || il.hour < 7, parQuiet = il.hour >= 22 || il.hour < 7;
  const { data: subs } = await sb.from("study_push").select("*").eq("active", true);
  const { data: kidsRows } = await sb.from("study_kids").select("kid,fam");
  const FAM: Record<string, string> = {};
  (kidsRows || []).forEach((r: any) => (FAM[r.kid] = r.fam));
  const out: string[] = [];

  // הורה: kid = הילד שההתראה עליו, וההתראה הולכת רק להורים של המשפחה שלו
  async function push(role: "kid" | "parent", kid: string | null, msg: any) {
    const fam = FAM[kid || ""] || "a";
    const list = (subs || []).filter((s: any) => s.role === role && (role === "parent" ? (s.kid || "a") === fam : s.kid === kid));
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

  if (["help", "avail", "iam", "wa"].includes(action!)) return await helpApi(action!, url, sb, FAM, subs || [], push, once, now);

  const { data: prog } = await sb.from("study_progress").select("device,kid,app,data,first_at,updated_at");
  const { data: snaps } = await sb.from("study_sess").select("*");
  const snap = (r: any) => (snaps || []).find((s: any) => s.device === r.device && s.kid === r.kid && s.app === r.app);

  for (const A of preview ? [] : APPS) {
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
      await push("parent", A.kid, {
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
        await push("parent", A.kid, {
          title: `📅 ${A.name}: ${A.test} ${inDays(tdays)}`,
          body: `${A.boy ? "יודע" : "יודעת"} ${done}/${total} ${A.unit} (${pct}%), תרגול אחרון ${ago(last, now)}. כדאי לבדוק ${A.boy ? "איתו אם הוא עבד" : "איתה אם היא עבדה"} מספיק באפליקציה.`,
          tag: `lag-${A.kid}-${A.app}`, url: BASE + "parents/",
        });
      }
    }
  }

  // מתנות שעוד לא נשלחה עליהן התראה
  const { data: gifts } = await sb.from("study_gifts").select("*").gte("created_at", new Date(now - 3 * 864e5).toISOString());
  for (const g of preview ? [] : gifts || []) {
    const A = APPS.find((a) => a.kid === g.kid && a.app === g.app);
    if (!A) continue;
    if (!parQuiet && (await once(`giftpar:${g.id}`))) {
      await push("parent", A.kid, {
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
  if (!kidQuiet && !preview) {
    const { data: q } = await sb.from("study_notify").select("*").is("sent_at", null).order("id").limit(10);
    for (const m of q || []) {
      const kids = m.kid ? [m.kid] : ["evyatar", "dani", "lia"];
      for (const k of kids) await push("kid", k, { title: m.title, body: m.body, tag: `new-${m.id}`, url: m.url || BASE + `${k}/` });
      await sb.from("study_notify").update({ sent_at: new Date().toISOString() }).eq("id", m.id);
    }
  }
  // 5. בקשות והצעות חדשות מהילדים
  if (!parQuiet && !preview) {
    const KK: Record<string, string> = { test: "📅 מבחן קרוב", quiz: "⏰ בוחן", hard: "🤔 לא הבנתי נושא", topic: "📚 נושא חדש ללימוד", idea: "💡 רעיון לאפליקציה", bug: "🐞 באג באפליקציה" };
    const { data: rq } = await sb.from("study_requests").select("id,kid,kind,txt").is("notified_at", null).eq("hidden", false).order("id").limit(10);
    for (const r of rq || []) {
      // כל בקשה הולכת רק להורים של המשפחה של הילד (push לפי FAM)
      const boy = !!BOY[r.kid];
      await push("parent", r.kid, {
        title: `💬 ${KN[r.kid] || r.kid} ${boy ? "שלח" : "שלחה"} בקשה: ${KK[r.kind] || ""}`,
        body: String(r.txt || "").slice(0, 140), tag: `req-${r.id}`, url: BASE + "parents/",
      });
      await sb.from("study_requests").update({ notified_at: new Date().toISOString() }).eq("id", r.id);
    }
  }
  // 6. ציון שהילד הזין בעצמו → להורים
  const KN6: Record<string, string> = { evyatar: "אביתר", dani: "דני", lia: "ליה", levi: "לביא", shilo: "שילה" };
  const BOY6: Record<string, boolean> = { evyatar: true, levi: true, shilo: true };
  if (!parQuiet && !preview) {
    const { data: ks } = await sb.from("study_results").select("id,kid,app,d,score").eq("by_kid", true).eq("hidden", false).is("notified_at", null).order("id").limit(10);
    for (const r of ks || []) {
      const boy = !!BOY6[r.kid];
      await push("parent", r.kid, {
        title: `✏️ ${KN6[r.kid] || r.kid} ${boy ? "הזין" : "הזינה"} ציון: ${+r.score}`,
        body: `המבחן מ-${String(r.d).split("-").reverse().slice(0, 2).join(".")}. אפשר לראות ולאשר באזור ההורים.`,
        tag: `kscore-${r.id}`, url: BASE + "parents/",
      });
      await sb.from("study_results").update({ notified_at: new Date().toISOString() }).eq("id", r.id);
    }
  }
  // 7. שבוע אחרי מבחן: תזכורת לילד להזין ציון (פעם אחת לכל ילד ומבחן)
  if (!kidQuiet && !preview && il.hour === 17) {
    const { data: due } = await sb.rpc("study_score_due");
    for (const r of due || []) {
      if (!(await once(`scoreask:${r.kid}:${r.d}`))) continue;
      const boy = !!BOY6[r.kid];
      await push("kid", r.kid, {
        title: "✏️ כמה קיבלת במבחן?",
        body: `${boy ? "תיכנס ותזין" : "תיכנסי ותזיני"} את הציון של המבחן מ-${String(r.d).split("-").reverse().slice(0, 2).join(".")}, כדי שאבא ואמא יראו כמה התקדמת 💪`,
        tag: `scoreask-${r.kid}`, url: BASE + `${r.kid}/?score=${r.app}`,
      });
    }
  }
  // 8. תזכורת יומית לתוכן חדש שעוד לא התחילו
  const plan: any[] = [];
  {
    const { data: cnt } = await sb.from("study_content").select("id,approved_at").not("approved_at", "is", null);
    const byKid: Record<string, any[]> = {};
    for (const c of cnt || []) {
      const [kid, app] = String(c.id).split("/");
      if (!kid || !app) continue;
      const age = (now - Date.parse(c.approved_at)) / 864e5;
      if (age < 1 || age > 14) continue;
      if ((prog || []).some((r: any) => r.kid === kid && r.app === app)) continue; // נכנס/ה ותרגל/ה לפחות פעם אחת = התחיל/ה
      const { data: t } = await sb.rpc("study_test_get", { p_kid: kid, p_app: app });
      if (t?.score != null || (t?.d && dayDiff(il.date, String(t.d)) < 0)) continue;
      (byKid[kid] ||= []).push({ id: c.id, app, at: c.approved_at, days: Math.floor(age), test: t?.d ? dayDiff(il.date, String(t.d)) : null });
    }
    for (const kid of Object.keys(byKid)) {
      // קודם תוכן עם מבחן קרוב, אחר כך החדש ביותר
      const L = byKid[kid].sort((a, b) => (a.test ?? 99) - (b.test ?? 99) || Date.parse(b.at) - Date.parse(a.at));
      const c = L[0], boy = !!BOY[kid], name = KN[kid] || "", N = NUDGE[c.id] || { n: "התוכן החדש שאבא ואמא הכינו לך", why: "כל תרגול קטן מקדם אותך." };
      const more = L.length === 2 ? " ויש עוד תוכן חדש אחד שמחכה לך." : L.length > 2 ? ` ויש עוד ${L.length - 1} תכנים חדשים שמחכים לך.` : "";
      const test = c.test !== null && c.test >= 0 && c.test <= 7 ? ` המבחן ${inDays(c.test)}${c.test <= 1 ? "!" : "."}` : ""; // רק מבחן בשבוע הקרוב
      const msg = {
        title: `${name}, ${N.n} מחכה לך ✨`,
        body: g(`עוד לא התחל{ת} אותו. ${N.why}${test} מספיקות 10 דקות היום כדי להתחיל, בוא{י} לתרגל! 💪${more}`, boy),
        tag: `nudge-${kid}`, url: BASE + `${kid}/${c.app}/`,
      };
      plan.push({ kid, items: L.map((x) => x.id), msg });
      if (preview || kidQuiet || il.hour < 16) continue;
      if (await once(`nudge:${kid}:${il.date}`, { items: L.map((x) => x.id) })) await push("kid", kid, msg);
    }
  }
  // 9. הילד התחיל תוכן חדש + סוף הסשן הראשון → להורים
  const starts: any[] = [];
  {
    const { data: cnt } = await sb.from("study_content").select("id,approved_at").not("approved_at", "is", null);
    // בדיקה בלי שליחה: ?action=start_preview&since=<ISO> מראה גם התחלות ישנות יותר, כולל הודעת הסיום
    const since = action === "start_preview" && url.searchParams.get("since") ? Date.parse(url.searchParams.get("since")!) : START;
    const LOG: Record<string, any> = {};
    for (const p of ["start:%", "firstend:%"]) {
      const { data: lg } = await sb.from("study_push_log").select("key,info").like("key", p);
      (lg || []).forEach((x: any) => (LOG[x.key] = x.info || {}));
    }
    for (const c of cnt || []) {
      const [kid, app] = String(c.id).split("/");
      if (!kid || !app) continue;
      const rows = (prog || []).filter((r: any) => r.kid === kid && r.app === app && r.first_at);
      if (!rows.length) continue;
      const r0 = rows.reduce((a: any, b: any) => (Date.parse(b.first_at) < Date.parse(a.first_at) ? b : a));
      const t0 = Date.parse(r0.first_at);
      if (t0 < since || now - t0 > 3 * 864e5) continue; // רק התחלות חדשות, ולא התראה ישנה מדי
      const boy = !!BOY[kid], name = KN[kid] || kid, cn = NUDGE[c.id]?.n || "התוכן החדש";
      const sk = `start:${c.id}`, ek = `firstend:${c.id}`;
      const hm = new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit" }).format(new Date(t0));
      if (!(sk in LOG)) {
        const msg = {
          title: `🚀 ${name} ${boy ? "התחיל" : "התחילה"} את ${cn}`,
          body: `${boy ? "נכנס והתחיל" : "נכנסה והתחילה"} להתאמן בפעם הראשונה (${hm}). אחרי הסשן הראשון תגיע הודעה נוספת עם כמה זמן ${boy ? "היה" : "הייתה"} באפליקציה.`,
          tag: `start-${kid}-${app}`, url: BASE + "parents/",
        };
        starts.push({ id: c.id, kind: "start", msg });
        if (!preview) {
          if (parQuiet) continue;
          if (await once(sk, { device: r0.device, first_at: r0.first_at })) await push("parent", kid, msg);
          continue; // סוף הסשן רק בסבב הבא, אחרי שההתחלה נשלחה
        }
      }
      if (ek in LOG) continue;
      const dv = LOG[sk]?.device || r0.device;
      const r = rows.find((x: any) => x.device === dv) || r0;
      const idle = now - Date.parse(r.updated_at);
      if (idle < 5 * 60e3) continue; // עוד בפנים (דיווח כל דקה בזמן לימוד, ובסגירה)
      const d = r.data || {};
      const wall = Math.max(0, (Date.parse(r.updated_at) - Date.parse(r.first_at)) / 1e3), act = Math.min(+d.sec || 0, wall + 60);
      const att = +d.att, ok = +d.ok;
      const ans = isFinite(att) && att > 0 ? ` · ${att} תשובות, ${isFinite(ok) ? ok : 0} נכונות (${Math.round(((isFinite(ok) ? ok : 0) / att) * 100)}%)` : "";
      const msg = {
        title: `⏱️ ${name} ${boy ? "סיים" : "סיימה"} סשן ראשון: ${cn}`,
        body: `${boy ? "היה" : "הייתה"} באפליקציה ${mins(Math.max(wall, act))}, מתוכן ${mins(act)} לימוד פעיל${ans}.`,
        tag: `firstend-${kid}-${app}`, url: BASE + "parents/",
      };
      starts.push({ id: c.id, kind: "end", msg });
      if (preview || parQuiet) continue;
      if (await once(ek, { device: r.device, sec: act, wall })) await push("parent", kid, msg);
    }
  }
  return json({ ok: true, il, out, nudge: plan, starts });
});

// ===================== 10. 🙋 בקשת עזרה מקרוב משפחה (אורן 19.11.2026) =====================
// הילד בוחר ממי לבקש עזרה (help.js): ההתראה הולכת רק למי שנבחר. זמינות לפי כללים (HELP_RULES) ולפי הלו״ז של אורן (sq_docs work_calendar).
//  ?action=avail&kid=          → רשימת העוזרים של המשפחה (בלי הילד עצמו): זמין או לא, למה, עד מתי, כמה מכשירים עם התראות, ואם יש וואטסאפ.
//  ?action=help&kid=&sid=&to=  → התראה מיידית לעוזר (גם בשעות השקט: הילד מבקש עכשיו). רק כשיש שידור חי עם אותו sid. פעם אחת לכל עוזר ובקשה, עד 10 בשעה.
//  ?action=wa&kid=&sid=&to=    → הפניה לוואטסאפ של העוזר עם הודעה מוכנה וקישור למסך המראה. המספרים רק בשרת (study_secrets 'phone_<id>'), לא במאגר.
//  ?action=iam&pin=&who=&endpoint= → הורה מסמן שהמכשיר שלו שייך לו (אבא / אמא), כדי שבקשה אליו תגיע רק אליו. נשמר ב-study_push_log 'dev:<sha>'.
// הורה בלי מכשיר מסומן: ההתראה הולכת למכשירי ההורים של המשפחה שלא סומנו (עם השם בכותרת).
const HELPERS: Record<string, { id: string; n: string; kid?: boolean; boy?: boolean }[]> = {
  a: [{ id: "oren", n: "אבא", boy: true }, { id: "lior", n: "אמא" }, { id: "evyatar", n: "אביתר", kid: true, boy: true }, { id: "dani", n: "דני", kid: true }, { id: "lia", n: "ליה", kid: true }],
  b: [{ id: "yehuda", n: "אבא", boy: true }],
};
// כללי זמינות (שעון ישראל). dow: 0 = ראשון. [מ-דקה, עד-דקה) = לא זמין.
const HELP_RULES: Record<string, { off: [number, number]; dow?: number[]; why: string }[]> = {
  lior: [{ off: [60, 210], why: "ישנה" }],
  evyatar: [{ off: [480, 840], dow: [0, 1, 2, 3, 4, 5], why: "בבית הספר" }],
};
function ilNow(ms: number) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(ms));
  const v = (t: string) => p.find((x) => x.type === t)!.value;
  return { dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(v("weekday")), min: (parseInt(v("hour")) % 24) * 60 + parseInt(v("minute")) };
}
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const hm2 = (ms: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(ms));
async function sha(s: string) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return Array.from(new Uint8Array(b)).slice(0, 12).map((x) => x.toString(16).padStart(2, "0")).join(""); }
// הלו״ז של אורן: אותם כללים כמו side-quests/workcal-engine.js (kind): פגישה שהוא צריך לשבת בה (או בלוק פרטי/מילואים) = לא זמין עד סופה;
// פגישה שהוא רק מקשיב בה = זמין ("בדיון האזנה"); פגישה שסומנה רשות / לא חובה, או זימון ענק שלא ענה עליו = לא חוסמת.
async function orenBusy(sb: any, now: number) {
  const { data } = await sb.from("sq_docs").select("id,data").eq("app", "sidequests").eq("collection", "work_calendar")
    .gte("data->>end", new Date(now - 864e5).toISOString()).lte("data->>start", new Date(now + 864e5).toISOString());
  const { data: pr } = await sb.from("sq_docs").select("data").eq("app", "sidequests").eq("collection", "work_calendar").eq("id", "_profile").maybeSingle();
  const prof = pr?.data || {}, OLD: Record<string, string> = { maybe: "rec", no: "avoid" };
  const skey = (e: any) => { let h = 0; const s = (e.subject || "").trim().toLowerCase() + "|" + (e.organizer || "").toLowerCase(); for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return "s" + (h >>> 0).toString(36); };
  const kind = (e: any) => {
    if (!e || e.cancelled || e.deleted || e._deleted || !e.start || !e.end || e.all_day || e.show_as === "free" || e.show_as === "oof") return null;
    const r = (prof.series || {})[skey(e)] || {}, need = OLD[r.need] || r.need || "", own = e.response === "organizer";
    const solo = (own || e.response === "none" || !e.response) && !(+e.attendees > 1);
    if (solo) return "meet";
    if (need === "opt" || need === "avoid") return null;
    const unconf = e.response === "tentativelyAccepted" || e.response === "notResponded" || e.show_as === "tentative";
    if (!need && !own && unconf && (+e.attendees || 0) >= 50) return null;
    if (r.mode === "phone" || r.mode === "car") return "listen";
    if (r.mode || own) return "meet";
    if ((+e.attendees || 0) >= 20) return "listen";
    return "meet";
  };
  const L = (data || []).filter((x: any) => /^ev-/.test(x.id)).map((x: any) => ({ k: kind(x.data), s: Date.parse(x.data.start), e: Date.parse(x.data.end) })).filter((x: any) => x.k);
  const cur = L.filter((x: any) => x.s <= now && x.e > now);
  if (cur.some((x: any) => x.k === "meet")) {
    let until = Math.max(...cur.filter((x: any) => x.k === "meet").map((x: any) => x.e)), grew = true;
    while (grew) { grew = false; for (const x of L) if (x.k === "meet" && x.s <= until + 5 * 60e3 && x.e > until) { until = x.e; grew = true; } }
    return { ok: false, why: "בפגישה", until: hm2(until) };
  }
  if (cur.length) return { ok: true, why: "בדיון שאפשר להפריע בו" };
  return { ok: true, why: "" };
}
async function helpApi(action: string, url: URL, sb: any, FAM: Record<string, string>, subs: any[], push: any, once: any, now: number) {
  const kid = url.searchParams.get("kid") || "", fam = FAM[kid];
  const H = HELPERS[fam || ""] || [];
  // מכשירים: ילד = מנוי kid שלו; הורה = מכשירי הורים של המשפחה שסומנו לו, ואם אין = שלא סומנו
  const { data: lg } = await sb.from("study_push_log").select("key,info").like("key", "dev:%");
  const WHO: Record<string, string> = {};
  (lg || []).forEach((x: any) => (WHO[x.key.slice(4)] = x.info?.who || ""));
  const parSubs = subs.filter((s: any) => s.role === "parent" && (s.kid || "a") === fam);
  const tagged = await Promise.all(parSubs.map(async (s: any) => ({ s, who: WHO[await sha(s.endpoint)] || "" })));
  const devsOf = (h: any) => h.kid ? subs.filter((s: any) => s.role === "kid" && s.kid === h.id)
    : (() => { const mine = tagged.filter((t) => t.who === h.id).map((t) => t.s); return mine.length ? mine : tagged.filter((t) => !t.who).map((t) => t.s); })();
  const { data: ph } = await sb.from("study_secrets").select("k").like("k", "phone_%");
  const PH = new Set((ph || []).map((x: any) => x.k.slice(6)));
  const live = async (sid: string) => {
    const { data: st } = await sb.from("study_state").select("keys").eq("kid", kid).eq("app", "live").maybeSingle();
    const k: any = st?.keys || {};
    return k.sid === sid && k.on && now - (+k.at || 0) < 5 * 60e3 ? k : null;
  };
  const boy = !!BOY[kid], name = KN[kid] || kid;
  const mirror = (to: string) => BASE + `help/?kid=${kid}&by=${to}`;

  if (action === "iam") {
    const who = url.searchParams.get("who") || "", ep = url.searchParams.get("endpoint") || "";
    const { data: f } = await sb.rpc("study_parents_fam", { p_pin: url.searchParams.get("pin") || "" });
    if (!f || f === "bad" || f === "locked") return json({ ok: false, err: "pin" }, 403);
    if (!(HELPERS[f] || []).some((h) => !h.kid && h.id === who) || !/^https:\/\//.test(ep)) return json({ ok: false, err: "arg" }, 400);
    const key = "dev:" + (await sha(ep));
    await sb.from("study_push_log").delete().eq("key", key);
    await sb.from("study_push_log").insert({ key, info: { who, fam: f } });
    return json({ ok: true });
  }
  if (!fam) return json({ ok: false, err: "kid" }, 400);
  if (action === "avail") {
    const t = ilNow(now), list = [];
    for (const h of H) {
      if (h.id === kid) continue;
      let ok = true, why = "", until = "";
      for (const r of HELP_RULES[h.id] || []) if ((!r.dow || r.dow.includes(t.dow)) && t.min >= r.off[0] && t.min < r.off[1]) { ok = false; why = r.why; until = hhmm(r.off[1]); }
      if (h.id === "oren") { try { const o = await orenBusy(sb, now); ok = o.ok; why = o.why; until = (o as any).until || ""; } catch (_) { /* בלי לו״ז = זמין */ } }
      list.push({ id: h.id, n: h.n, kid: !!h.kid, boy: !!h.boy, ok, why, until, dev: devsOf(h).length, wa: PH.has(h.id) });
    }
    return json({ ok: true, list });
  }
  const sid = url.searchParams.get("sid") || "", to = url.searchParams.get("to") || "", h = H.find((x) => x.id === to);
  if (!h || to === kid || !/^[a-f0-9]{16}$/.test(sid)) return json({ ok: false, err: "arg" }, 400);
  const k = await live(sid);
  if (!k) return json({ ok: false, err: "nolive" });
  if (action === "wa") {
    const { data: s } = await sb.from("study_secrets").select("h").eq("k", "phone_" + to).maybeSingle();
    const num = String(s?.h || "").replace(/\D/g, "").replace(/^0/, "972");
    const txt = `🙋 ${name} ${boy ? "צריך" : "צריכה"} עזרה בשאלה באפליקציה. לחצו כאן ותראו בדיוק את המסך ${boy ? "שלו" : "שלה"}: ${mirror(to)}`;
    return new Response(null, { status: 302, headers: { Location: `https://wa.me/${num}?text=${encodeURIComponent(txt)}`, ...CORS } });
  }
  // help
  const { count } = await sb.from("study_push_log").select("key", { count: "exact", head: true }).like("key", `help:${kid}:%`).gte("at", new Date(now - 36e5).toISOString());
  if ((count || 0) >= 10) return json({ ok: false, err: "limit" });
  if (!(await once(`help:${kid}:${sid}:${to}`, { app: k.app, to }))) return json({ ok: true, dup: true });
  const devs = devsOf(h), cn = NUDGE[`${kid}/${k.app}`]?.n;
  const msg = JSON.stringify({
    title: `🙋 ${name} ${boy ? "מבקש" : "מבקשת"} ${h.kid ? "ממך" : `מ${h.n}`} עזרה עכשיו`,
    body: `${cn ? `ב${cn}. ` : ""}לחצו כדי לראות בדיוק את המסך ${boy ? "שלו" : "שלה"}, ואז ${h.kid ? (h.boy ? "תתקשר" : "תתקשרי") : "התקשרו"} ${boy ? "אליו" : "אליה"} ${h.kid ? (h.boy ? "ותעזור" : "ותעזרי") : "ותעזרו"} בשאלה.`,
    tag: `help-${kid}`, url: mirror(to),
  });
  let n = 0;
  await Promise.allSettled(devs.map(async (s: any) => {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, msg, { TTL: 3600, urgency: "high" }); n++; }
    catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("study_push").update({ active: false }).eq("endpoint", s.endpoint); }
  }));
  return json({ ok: true, sent: n, devices: devs.length, wa: PH.has(to) });
}
