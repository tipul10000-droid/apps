// study-grade: "✅ בדוק שאלות" (אורן 21.11.2026, כלל לכל תוכן עם תשובות פתוחות, לכל הילדים).
// הילד לוחץ "בדוק שאלות" (study/grade.js) ← הבקשה נרשמת. מ-22.11.2026 הבדיקה עצמה רצה 3 פעמים ביום (לא מעירים יותר את המשימה
// דרך ה-API trigger; הניסיון קיבל 403 "project is paused"). Claude בודק ומחזיר ציון ל-study_answers.
//  ?action=req&kid=&app=  → רושם את הבקשה ביומן ומחזיר {ok, n (כמה מחכות), sched: true}. לא מעיר ריצה.
//  ?action=st&kid=&app=   → {ok, n, last (מתי נשלחה הבקשה האחרונה)}
// בלי שינוי סכמה: יומן ב-study_push_log ('gradereq:<kid>:<app>:<ms>').
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
  // מ-22.11.2026 (אורן): Claude בודק 3 פעמים ביום בלבד (משימה מתוזמנת "Study: בדיקת תשובות פתוחות 3 פעמים ביום", 15:50/18:50/21:50).
  // הכפתור רק מכניס לתור ונרשם ביומן; לא מעירים ריצה.
  if (!(last && now - Date.parse(last) < 3 * 60e3 && (lg![0].info?.n || 0) >= n))
    await sb.from("study_push_log").insert({ key: `gradereq:${kid}:${app}:${now}`, info: { n, sched: true } });
  return json({ ok: true, n, sched: true, last });
});
