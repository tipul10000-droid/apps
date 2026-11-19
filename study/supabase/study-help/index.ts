// study-help: 🙋 עזרה מקרוב משפחה בזמן אמת (אורן 19.11.2026, כלל קבוע לכל הילדים ולכל תוכן לימוד). נקרא מ-study/help.js ומ-study/help/.
// פונקציה נפרדת מ-study-push (שרצה כל 5 דקות), כדי שבקשת עזרה תישלח מיד ולא תיגע בסבב הקבוע. אותם מפתחות VAPID ואותה טבלת מכשירים (study_push).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const BASE = "https://tipul10000-droid.github.io/apps/study/";
const KN: Record<string, string> = { evyatar: "אביתר", dani: "דני", lia: "ליה", levi: "לביא", shilo: "שילה" };
const BOY: Record<string, boolean> = { evyatar: true, levi: true, shilo: true };
// שם התוכן בהתראה (כמו NUDGE ב-study-push). תוכן חדש = שורה כאן (אחרת ההתראה בלי שם התוכן).
const CN: Record<string, string> = {
  "lia/math4": "חיזוק המתמטיקה 🚀 מסע בין הכוכבים", "dani/math6": "חיזוק המתמטיקה 🎤 סיבוב הופעות", "dani/spelling2": "ההכתבה החדשה באנגלית",
  "dani/spelling": "ההכתבה באנגלית", "lia/mult": "לוח הכפל", "lia/phonics": "אותיות וצלילים באנגלית", "evyatar/past": "החזרה על past simple",
  "evyatar/econ": "הבוחן בכלכלה", "evyatar/pres": "ההכנה לבוחן באנגלית", "evyatar/hist": "הבוחן בהיסטוריה", "shilo/numbers": "המספרים של שילה",
  "shilo/letters": "האותיות של שילה", "levi/phonics": "אותיות וצלילים באנגלית", "dani/tanach": "ההכנה למבחן בתנ״ך", "evyatar/vocab": "אוצר המילים באנגלית",
};
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...CORS } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url), action = url.searchParams.get("action") || "";
  if (!["help", "avail", "iam", "wa", "tok", "call"].includes(action)) return json({ ok: false, err: "action" }, 400);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: ks } = await sb.from("study_secrets").select("k,h").in("k", ["vapid_public", "vapid_private"]);
  const V: Record<string, string> = {};
  (ks || []).forEach((r: any) => (V[r.k] = r.h));
  if (V.vapid_public && V.vapid_private) webpush.setVapidDetails(BASE, V.vapid_public, V.vapid_private);
  const { data: subs } = await sb.from("study_push").select("*").eq("active", true);
  const { data: kidsRows } = await sb.from("study_kids").select("kid,fam");
  const FAM: Record<string, string> = {};
  (kidsRows || []).forEach((r: any) => (FAM[r.kid] = r.fam));
  const once = async (key: string, info?: any) => !(await sb.from("study_push_log").insert({ key, info: info || null })).error;
  return await helpApi(action, url, sb, FAM, subs || [], once, Date.now());
});

// הילד בוחר ממי לבקש עזרה (help.js): ההתראה הולכת רק למי שנבחר. זמינות לפי כללים (HELP_RULES) ולפי הלו״ז של אורן (sq_docs work_calendar).
//  ?action=avail&kid=          → רשימת העוזרים של המשפחה (בלי הילד עצמו): זמין או לא, למה, עד מתי, כמה מכשירים עם התראות, ואם יש וואטסאפ.
//  ?action=help&kid=&sid=&to=  → התראה מיידית לעוזר (גם בשעות השקט: הילד מבקש עכשיו). רק כשיש שידור חי עם אותו sid. פעם אחת לכל עוזר ובקשה, עד 10 בשעה.
//  ?action=wa&kid=&sid=&to=    → הפניה לוואטסאפ של העוזר עם הודעה מוכנה וקישור למסך המראה. המספרים רק בשרת (study_secrets 'phone_<id>'), לא במאגר.
//  ?action=call&kid=&sid=&to=  → שיחה קולית: פותח את הצ׳אט בוואטסאפ עם העוזר (אין לינק שמתחיל שיחה), הילד לוחץ 📞 ורמקול.
//  ?action=tok&kid=&t=         → הלינק מוואטסאפ נפתח בספארי בלי קוד הורים: t = מפתח צפייה אקראי שנוצר ב-wa לבקשה הזאת בלבד (study_push_log 'htok:<t>'),
//                                 תקף רק כל עוד אותה בקשה (sid) פתוחה ועד 3 שעות. מחזיר {ok, sid, by}.
//  ?action=iam&pin=&who=&endpoint= → הורה מסמן שהמכשיר שלו שייך לו (אבא / אמא), כדי שבקשה אליו תגיע רק אליו. נשמר ב-study_push_log 'dev:<sha>'.
// הורה בלי מכשיר מסומן: ההתראה הולכת למכשירי ההורים של המשפחה שלא סומנו (עם השם בכותרת).
const HELPERS: Record<string, { id: string; n: string; kid?: boolean; boy?: boolean }[]> = {
  a: [{ id: "oren", n: "אבא", boy: true }, { id: "lior", n: "אמא" }, { id: "evyatar", n: "אביתר", kid: true, boy: true }, { id: "dani", n: "דני", kid: true }, { id: "lia", n: "ליה", kid: true }],
  b: [{ id: "yehuda", n: "אבא", boy: true }],
};
// כללי זמינות (שעון ישראל). dow: 0 = ראשון. [מ-דקה, עד-דקה) = לא זמין.
// לילה (אורן 19.11.2026: בשעות הלילה המאוחרות אף אחד לא זמין): מבוגרים 23:00-07:00, ילדים 22:00-07:00.
const NIGHT = (from: number) => [{ off: [from, 1440] as [number, number], why: "לילה", u: "07:00" }, { off: [0, 420] as [number, number], why: "לילה" }];
const HELP_RULES: Record<string, { off: [number, number]; dow?: number[]; why: string; u?: string }[]> = {
  oren: NIGHT(1380), yehuda: NIGHT(1380), dani: NIGHT(1320), lia: NIGHT(1320),
  lior: [...NIGHT(1380), { off: [780, 930], why: "לא זמינה" }],
  evyatar: [...NIGHT(1320), { off: [480, 840], dow: [0, 1, 2, 3, 4, 5], why: "בבית הספר" }],
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
async function helpApi(action: string, url: URL, sb: any, FAM: Record<string, string>, subs: any[], once: any, now: number) {
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
  if (action === "tok") {
    const t = (url.searchParams.get("t") || "").replace(/[^a-f0-9]/g, "");
    if (t.length < 24) return json({ ok: false });
    const { data: r } = await sb.from("study_push_log").select("info,at").eq("key", "htok:" + t).maybeSingle();
    if (!r || r.info?.kid !== kid || now - Date.parse(r.at) > 3 * 36e5) return json({ ok: false });
    const { data: st } = await sb.from("study_state").select("keys").eq("kid", kid).eq("app", "live").maybeSingle();
    const k: any = st?.keys || {};
    if (k.sid !== r.info.sid || !k.on) return json({ ok: false });
    return json({ ok: true, sid: r.info.sid, by: r.info.to });
  }
  if (action === "avail") {
    const t = ilNow(now), list = [];
    for (const h of H) {
      if (h.id === kid) continue;
      let ok = true, why = "", until = "";
      for (const r of HELP_RULES[h.id] || []) if ((!r.dow || r.dow.includes(t.dow)) && t.min >= r.off[0] && t.min < r.off[1]) { ok = false; why = r.why; until = r.u || hhmm(r.off[1]); }
      if (ok && h.id === "oren") { try { const o = await orenBusy(sb, now); ok = o.ok; why = o.why; until = (o as any).until || ""; } catch (_) { /* בלי לו״ז = זמין */ } }
      list.push({ id: h.id, n: h.n, kid: !!h.kid, boy: !!h.boy, ok, why, until, dev: devsOf(h).length, wa: PH.has(h.id) });
    }
    return json({ ok: true, list });
  }
  const sid = url.searchParams.get("sid") || "", to = url.searchParams.get("to") || "", h = H.find((x) => x.id === to);
  if (!h || to === kid || !/^[a-f0-9]{16}$/.test(sid)) return json({ ok: false, err: "arg" }, 400);
  const k = await live(sid);
  if (!k) return json({ ok: false, err: "nolive" });
  // שיחה קולית (אורן 19.11.2026): וואטסאפ לא מאפשר להתחיל שיחה מלינק, אז פותחים את הצ׳אט עם העוזר בלי טקסט, ושם לוחצים על 📞
  if (action === "call") {
    const { data: s } = await sb.from("study_secrets").select("h").eq("k", "phone_" + to).maybeSingle();
    const num = String(s?.h || "").replace(/\D/g, "").replace(/^0/, "972");
    if (!num) return json({ ok: false, err: "nophone" });
    return new Response(null, { status: 302, headers: { Location: `https://wa.me/${num}`, ...CORS } });
  }
  if (action === "wa") {
    const { data: s } = await sb.from("study_secrets").select("h").eq("k", "phone_" + to).maybeSingle();
    const num = String(s?.h || "").replace(/\D/g, "").replace(/^0/, "972");
    // הודעה בשם הילד לעוזר (אורן 19.11.2026): "היי אבא, אני צריכה עזרה ב..." + קישור שפותח בדיוק את המסך שלו
    const hi: Record<string, string> = { oren: "אבא", lior: "אמא", evyatar: "אביה", dani: "דני", lia: "ליה", yehuda: "אבא" };
    const fem = !h.boy, cn = CN[`${kid}/${k.app}`];
    // מפתח צפייה לבקשה הזאת (הלינק נפתח בספארי, שם אין קוד הורים)
    const tb = new Uint8Array(16); crypto.getRandomValues(tb);
    const tok = Array.from(tb, (x) => x.toString(16).padStart(2, "0")).join("");
    await sb.from("study_push_log").insert({ key: "htok:" + tok, info: { kid, sid, to } });
    const txt = `היי ${hi[to] || h.n}! אני ${boy ? "צריך" : "צריכה"} עזרה${cn ? ` ב${cn}` : " בשאלה באפליקציה"} 🙋\n${fem ? "תלחצי" : "תלחץ"} כאן ${fem ? "ותראי" : "ותראה"} בדיוק את המסך שלי ואת השאלה שאני ${boy ? "תקוע" : "תקועה"} בה:\n${mirror(to)}&t=${tok}`;
    return new Response(null, { status: 302, headers: { Location: `https://wa.me/${num}?text=${encodeURIComponent(txt)}`, ...CORS } });
  }
  // help
  const { count } = await sb.from("study_push_log").select("key", { count: "exact", head: true }).like("key", `help:${kid}:%`).gte("at", new Date(now - 36e5).toISOString());
  if ((count || 0) >= 10) return json({ ok: false, err: "limit" });
  if (!(await once(`help:${kid}:${sid}:${to}`, { app: k.app, to }))) return json({ ok: true, dup: true });
  const devs = devsOf(h), cn = CN[`${kid}/${k.app}`];
  const msg = JSON.stringify({
    title: `🙋 ${name} ${boy ? "מבקש" : "מבקשת"} ${h.kid ? "ממך" : `מ${h.n}`} עזרה עכשיו`,
    body: `${cn ? `ב${cn}. ` : ""}${h.kid ? (h.boy ? "לחץ" : "לחצי") : "לחצו"} כדי לראות בדיוק את המסך ${boy ? "שלו" : "שלה"}, ואז ${h.kid ? (h.boy ? "תתקשר" : "תתקשרי") : "התקשרו"} ${boy ? "אליו" : "אליה"} ${h.kid ? (h.boy ? "ותעזור" : "ותעזרי") : "ותעזרו"} בשאלה.`,
    tag: `help-${kid}`, url: mirror(to),
  });
  let n = 0; const errs: number[] = [];
  await Promise.allSettled(devs.map(async (s: any) => {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, msg, { TTL: 3600, urgency: "high" }); n++; }
    catch (e: any) { errs.push(e?.statusCode || 0); if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("study_push").update({ active: false }).eq("endpoint", s.endpoint); }
  }));
  await sb.from("study_push_log").update({ info: { app: k.app, to, sent: n, devices: devs.length, errs } }).eq("key", `help:${kid}:${sid}:${to}`);
  return json({ ok: true, sent: n, devices: devs.length, wa: PH.has(to) });
}
