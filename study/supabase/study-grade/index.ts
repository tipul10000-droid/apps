// study-grade: "✅ בדוק שאלות" (אורן 21.11.2026, כלל לכל תוכן עם תשובות פתוחות, לכל הילדים).
// במקום ריצה מתוזמנת כל שעה: הילד לוחץ "בדוק שאלות" (study/grade.js) ← הפונקציה הזו מעירה פעם אחת את המשימה
// "Study: בדיקת תשובות פתוחות (בלחיצת "בדוק שאלות")" דרך ה-API trigger שלה, עם kid ו-app. Claude בודק ומחזיר ציון ל-study_answers.
//  ?action=req&kid=&app=  → אם יש תשובות שלא נבדקו: מעיר את הבדיקה (לכל היותר פעם ב-3 דקות לכל ילד ותוכן, ועד 12 בשעה לכל הילדים).
//                           מחזיר {ok, n (כמה מחכות), fired, wait (כבר נשלח לאחרונה), nokey (אין עדיין טוקן)}.
//  ?action=st&kid=&app=   → {ok, n, last (מתי נשלחה הבקשה האחרונה)}
// בלי שינוי סכמה: הטוקן וה-URL ב-study_secrets ('grade_fire_token', 'grade_fire_url'), יומן ב-study_push_log ('gradereq:<kid>:<app>:<ms>').
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...CORS } });
const OK = /^[a-z0-9-]{1,20}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url), action = url.searchParams.get("action") || "";
  const kid = url.searchParams.get("kid") || "", app = (url.searchParams.get("app") || "").replace(/-rv$/, "");
  if (!["req", "st"].includes(action) || !OK.test(kid) || !OK.test(app)) return json({ ok: false, err: "arg" }, 400);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: k } = await sb.from("study_kids").select("kid").eq("kid", kid).maybeSingle();
  if (!k) return json({ ok: false, err: "kid" }, 400);
  const { count } = await sb.from("study_answers").select("id", { count: "exact", head: true })
    .eq("kid", kid).in("app", [app, app + "-rv"]).is("score", null).eq("hidden", false);
  const n = count || 0, now = Date.now();
  const { data: lg } = await sb.from("study_push_log").select("key,at,info").like("key", `gradereq:${kid}:${app}:%`).order("at", { ascending: false }).limit(1);
  const last = lg && lg[0] ? lg[0].at : null;
  if (action === "st") return json({ ok: true, n, last });
  if (!n) return json({ ok: true, n: 0 });
  // אותה בקשה פעמיים ברצף = לא מעירים שוב (הבדיקה כבר בדרך), אלא אם נוספו תשובות מאז
  if (last && now - Date.parse(last) < 3 * 60e3 && (lg![0].info?.n || 0) >= n) return json({ ok: true, n, wait: true, last });
  const { count: hr } = await sb.from("study_push_log").select("key", { count: "exact", head: true }).like("key", "gradereq:%").gte("at", new Date(now - 36e5).toISOString());
  if ((hr || 0) >= 12) return json({ ok: true, n, wait: true, last });
  const { data: ks } = await sb.from("study_secrets").select("k,h").in("k", ["grade_fire_token", "grade_fire_url"]);
  const S: Record<string, string> = {};
  (ks || []).forEach((r: any) => (S[r.k] = r.h));
  const key = `gradereq:${kid}:${app}:${now}`;
  if (!S.grade_fire_token || !S.grade_fire_url) {
    await sb.from("study_push_log").insert({ key, info: { n, fired: false, err: "nokey" } });
    return json({ ok: true, n, fired: false, nokey: true });
  }
  let fired = false, err = "", sess = "";
  try {
    const r = await fetch(S.grade_fire_url, {
      method: "POST",
      headers: { Authorization: "Bearer " + S.grade_fire_token, "anthropic-beta": "experimental-cc-routine-2026-04-01", "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ text: `kid=${kid} app=${app} n=${n} req=${now}` }),
    });
    const t = await r.text();
    fired = r.ok;
    if (r.ok) { try { sess = JSON.parse(t).claude_code_session_id || ""; } catch { /* */ } } else err = r.status + " " + t.slice(0, 200);
  } catch (e) { err = String(e).slice(0, 200); }
  await sb.from("study_push_log").insert({ key, info: { n, fired, err: err || undefined, sess: sess || undefined } });
  return json({ ok: true, n, fired, err: fired ? undefined : "fire" });
});
