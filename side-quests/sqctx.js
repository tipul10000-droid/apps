// Side Quests 14.3 (Oren 9.11.2026): a task said into the iPhone Action Button (or typed / recorded with ⚡ in the app) often
// carries its own context: "מחר בדרך לעבודה לקנות עוגיות", "בדרך הביתה לקנות פנס", "בשישי לאסוף את החבילה", "להתקשר לאמא בערב".
// This file reads that sentence with plain rules (no AI, no API) and places the task at once:
//   when      window ids of the app (WINS in index.html): drive_am, errands, work, drive_pm, near_home, light, deep, fri, sat_am, weekend…
//   next_date the day it is for (YYYY-MM-DD, Israel)
//   how / loc / party / anywhere / area   as in the profile rules (fit)
//   title     the sentence without the time words ("לקנות עוגיות")
// It runs in the app (when a new task arrives) and in the sq-push edge function (every 5 minutes), so the task is placed even
// when the app is closed. Same file in both places: copy it to supabase/sq-push/sqctx.js on every change.
// The task keeps what was said in ctx.said. Nothing found = only ctx_done is set, and the hourly run profiles it as before.
(function (G) {
  const DAYS = { "ראשון": 0, "שני": 1, "שלישי": 2, "רביעי": 3, "חמישי": 4, "שישי": 5, "שבת": 6 };
  // approximate end of each window on a regular weekday (minutes), to tell "today" from "the next time"
  const END = { home_am: 480, errands: 540, drive_am: 570, work: 1110, drive_pm: 1140, near_home: 1170, family: 1290, light: 1410, deep: 1500, fri: 780, sat_am: 720, weekend: 1380 };
  const WEEKDAY_ONLY = ["drive_am", "errands", "work", "drive_pm"];

  const clean = (s) => String(s || "").replace(/[‎‏‪-‮⁦-⁩]/g, "").replace(/\s+/g, " ").trim();
  const iso = (y, m, d) => { const x = new Date(Date.UTC(y, m - 1, d)); return x.toISOString().slice(0, 10); };
  const addDays = (s, n) => { const [y, m, d] = s.split("-").map(Number); return iso(y, m, d + n); };
  const dowOf = (s) => new Date(s + "T12:00:00Z").getUTCDay();

  // ordered: longer phrases first. w = windows, k = what kind of moment, strip = remove from the title
  const PH = [
    { re: /(?:מחר\s+)?ב(?:דרך|נסיעה)\s+(?:ל|אל\s+ה)?עבודה|ב(?:דרך|נסיעה)\s+לנתניה|בבוקר\s+בדרך/, w: "am_road" },
    { re: /ב(?:דרך|נסיעה)\s+(?:ה)?ביתה|ב(?:דרך|נסיעה)\s+הבית|בחזרה\s+(?:מהעבודה|הביתה)|ביציאה\s+מהעבודה|אחרי\s+העבודה|כשאני\s+(?:יוצא|חוזר)\s+מהעבודה/, w: "pm_road" },
    { re: /בסידורי\s+(?:ה)?בוקר|בבוקר\s+לפני\s+העבודה|לפני\s+העבודה/, w: "errands" },
    { re: /ב(?:זמן\s+ה)?עבודה|במשרד/, w: "work" },
    { re: /במוצ(?:״|"|')?ש|במוצאי\s+שבת/, w: "motzash" },
    { re: /בסופ(?:״|"|')?ש|בסוף\s+השבוע/, w: "weekend" },
    { re: /בשבת\s+בבוקר/, w: "sat_am" },
    { re: /בשישי\s+בבוקר|ביום\s+שישי\s+בבוקר/, w: "fri" },
    { re: /ב(?:ה)?ערב|הערב/, w: "eve" },
    { re: /בלילה|הלילה/, w: "night" },
    { re: /בצהריים/, w: "noon" },
    { re: /בבוקר|הבוקר/, w: "morning" },
  ];
  const DAYRE = /(?:^|\s)(היום|מחרתיים|מחר|ב(?:יום\s+)?(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת))(?=\s|$|[,.])/;
  const PLACE_V = /^(?:ל)?(קנות|לקנות|לאסוף|לקחת|להחזיר|לקפוץ|ללכת|להוריד|להביא|לשלוח\s+(?:חבילה|דואר)|להדפיס|לתדלק|לשטוף|לצלם|לתקן)/;
  const BUY = /(לקנות|לאסוף|לקפוץ\s+ל|להחזיר|לתדלק)/;
  const CALL = /(להתקשר|לדבר\s+עם|לחייג|שיחה\s+ל|לטלפן)/;
  const PC = /(במחשב|על\s+המחשב|לשלוח\s+מייל|מייל\s+ל|להזמין\s+(?:באתר|אונליין|ב?אמזון)|באתר|להוריד\s+קובץ)/;
  const LIOR = /(ליאור|לליאור|עם\s+ליאור)/;
  const HOME = /(בבית|הביתה\s+לסדר|לסדר\s+את|לנקות|לתלות|להחליף\s+נורה)/;
  const NEAR = /(בשכונה|ליד\s+הבית|במכולת|במאפייה|בסופר\s+(?:הקרוב|בשכונה))/;
  const CITY = /ב(נתניה|כפר\s+סבא|רעננה|הוד\s+השרון|תל\s+אביב|הרצליה)/;

  // now = {date:"YYYY-MM-DD", mins} in Israel. Returns null when the sentence holds no context to act on.
  function parse(text, now) {
    let s = clean(text);
    if (!s) return null;
    let out = { when: null, date: null, how: [], loc: null, party: null, anywhere: false, area: null, found: [] };
    let t = " " + s + " ";
    // the day
    const dm = t.match(DAYRE);
    let dayK = null;
    if (dm) {
      const w = dm[1];
      if (w === "היום") dayK = 0; else if (w === "מחר") dayK = 1; else if (w === "מחרתיים") dayK = 2;
      else { const d = DAYS[dm[2]]; let k = (d - dowOf(now.date) + 7) % 7; dayK = { d, k }; }
      out.found.push(w);
      t = t.replace(dm[0], " ");
    }
    // the moment
    let kind = null;
    for (const p of PH) { const m = t.match(p.re); if (m) { kind = p.w; out.found.push(m[0]); t = t.replace(m[0], " "); break; } }
    // what it is
    const body = clean(t.replace(/^\s*(?:ו|וגם)\s+/, ""));
    const call = CALL.test(body), pc = PC.test(body) && !call, lior = LIOR.test(body), buy = BUY.test(body) || PLACE_V.test(body);
    const city = (s.match(CITY) || [])[1];
    if (call) out.how = ["call"]; else if (pc) out.how = ["pc"]; else if (buy) out.how = ["place"]; else if (lior) out.how = ["lior"]; else if (HOME.test(body)) out.how = ["home"];
    if (city) { out.area = city.replace(/\s+/g, " "); }
    if (buy) {
      out.party = "shop";
      if (city === "נתניה" || city === "תל אביב" || city === "הרצליה") out.loc = "none";
      else if (NEAR.test(s)) { out.loc = "walk"; out.anywhere = true; }
      else { out.loc = "car"; if (!city) out.anywhere = true; }
    } else if (call) { out.party = "person"; out.loc = "house"; }
    else if (pc) { out.party = "self"; out.loc = "pc"; }
    else if (lior) { out.party = "lior"; out.loc = "house"; }
    else if (out.how[0] === "home") { out.party = "self"; out.loc = "house"; }

    // "להחזיר / להביא / לקחת X הביתה" = take something home from work (before leaving), not a shop errand
    const takeHome = !kind && /(להחזיר|להביא|לקחת)\s.+\sהביתה\s*$/.test(body);
    if (takeHome) { out.how = ["place"]; out.loc = "none"; out.party = "self"; out.anywhere = false; out.found.push("הביתה"); }
    // windows for the moment (place errands stop on the way; calls use the drive)
    let when = null;
    if (takeHome) when = ["work", "drive_pm"];
    else if (kind === "am_road") when = buy ? ["errands", "drive_am"] : ["drive_am"];
    else if (kind === "pm_road") when = buy ? ["drive_pm", "near_home"] : ["drive_pm"];
    else if (kind === "errands") when = ["errands"];
    else if (kind === "work") when = ["work"];
    else if (kind === "motzash") when = ["weekend"];
    else if (kind === "weekend") when = ["weekend", "sat_am"];
    else if (kind === "sat_am") when = ["sat_am"];
    else if (kind === "fri") when = ["fri"];
    else if (kind === "eve") when = buy ? ["near_home"] : lior ? ["light"] : call ? ["drive_pm", "light"] : ["light"];
    else if (kind === "night") when = ["deep"];
    else if (kind === "noon") when = ["work"];
    else if (kind === "morning") when = buy ? ["errands"] : call ? ["drive_am"] : ["home_am"];
    if (!when && dayK && typeof dayK === "object" && dayK.d === 5) when = buy ? ["fri"] : null; // "בשישי לאסוף" = Friday errands
    if (!when && dayK && typeof dayK === "object" && dayK.d === 6) when = ["weekend", "sat_am"];

    // the date
    let date = null;
    if (dayK != null) {
      const k = typeof dayK === "object" ? dayK.k : dayK;
      date = addDays(now.date, k);
    } else if (when) {
      // no day said: today if the window is still ahead today, else the next day it exists
      const endToday = Math.max(...when.map((w) => END[w] || 0));
      date = now.mins < endToday - 10 ? now.date : addDays(now.date, 1);
    }
    if (date && when && when.every((w) => WEEKDAY_ONLY.includes(w))) {
      for (let i = 0; i < 3 && [5, 6].includes(dowOf(date)); i++) date = addDays(date, 1); // on the way to work = Sunday-Thursday
    }
    if (kind === "motzash" && date && dowOf(date) !== 6) { const k = (6 - dowOf(date) + 7) % 7; date = addDays(date, k); }
    if (kind === "motzash") out.rel = { "6": "18:00-23:00" };

    out.when = when; out.date = date;
    const title = clean(body.replace(/^[,.\-–:]+|[,.\-–:]+$/g, ""));
    out.title = title.length >= 2 ? title : s;
    out.ok = !!(when || date || out.how.length);
    return out;
  }

  // what to merge into a new task. t = the topic (needs title or summary). Returns {patch} or null (nothing to do).
  function apply(t, now) {
    if (!t || t.ctx_done) return null;
    const said = clean(t.title || "");
    const p = parse(said, now);
    const at = new Date().toISOString();
    if (!p || !p.ok) return { patch: { ctx_done: true } };
    if (!p.when && !p.date && t.fit && Array.isArray(t.fit.how) && t.fit.how.length) return { patch: { ctx_done: true } }; // nothing new to add
    const f = { ...(t.fit || {}) };
    if (f.by === "oren") return { patch: { ctx_done: true } }; // his own profile wins
    if (p.when) f.when = p.when;
    const prof = Array.isArray(f.how) && f.how.length; // already profiled (hourly run): keep its how / place, add only the time said
    if (!prof) {
      if (p.how.length) f.how = p.how;
      if (p.loc) f.loc = p.loc;
      if (p.party) f.party = p.party;
      if (p.anywhere) f.anywhere = true;
      if (p.area) f.area = p.area;
    }
    if (p.rel) f.rel = p.rel;
    if (f.mins == null) f.mins = p.how[0] === "place" ? 20 : p.how[0] === "call" ? 10 : 5;
    f.v = f.v || 3; f.at = now.date; f.by = f.by || "ctx";
    const patch = { fit: f, ctx_done: true, ctx: { said, at, found: p.found } };
    if (p.title && p.title !== said) patch.title = p.title;
    if (p.date && !t.next_date) patch.next_date = p.date;
    if (!t.size) patch.size = "quick";
    const where = p.when ? p.when.join("/") : "";
    patch.log = [...(Array.isArray(t.log) ? t.log : []), { at, text: "הקשר מהמשפט: " + (p.found.join(", ") || "—") + (where ? " → " + where : "") + (patch.next_date ? " · " + patch.next_date : "") }];
    patch.updated_at = at;
    return { patch };
  }

  // only fresh tasks that came in by voice / quick add, never older ones
  const SOURCES = ["נוסף ידנית בקיצור דרך", "נוסף ידנית בדף", "נוסף בהקלטה בדף"];
  function wants(t) {
    if (!t || t.ctx_done || t._deleted || !SOURCES.includes(t.source)) return false;
    const c = Date.parse(t.created_at || "");
    return !isNaN(c) && Date.now() - c < 36 * 3600000;
  }

  G.SQCtx = { parse, apply, wants, clean };
})(typeof globalThis !== "undefined" ? globalThis : window);
