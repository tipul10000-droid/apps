// Side Quests 10.0 (Oren 6.11.2026, after missing the Kia test at Dynamometer Ra'anana, which closes 11:45 on Friday):
// "צא עד" / "להתקשר עד". A task that depends on opening hours (a place that closes, a call center, a person who is
// only reachable at certain hours, a fixed appointment) gets its hours in its profile, and when it is planned for
// today the app and the push server (sq-push, every 5 minutes) compute the last moment to leave / call:
//   leave_by = closing - last_in - travel - buffer      (place)
//   call_by  = closing - call length - 5                 (call center / person)
// Fields on topic.fit (all optional except open or appt):
//   open: {"0":"07:15-16:15", ..., "5":"07:15-11:45", "6":null}  JS weekday keys (0 = Sunday); "all" = every day;
//         a value may be "08:00-13:00,16:00-19:00"; null / "" = closed that day
//   appt: "HH:MM" fixed appointment on the planned day (wins over open). (fit.at is the profile date, not a time)
//   last_in: minutes before closing that the last car / customer is taken (default 0)
//   travel: one-way minutes (default from km: 6 + 1.5*km, else 15)
//   hours_src, hours_at, hours_est (true = an estimate; the app asks to confirm)
//   remind: "HH:MM" (11.5, Oren 6.11.2026, sport dashboard): a plain timed reminder on the planned day (register in ARBOX,
//         go train). One push at that time, no travel math. kind "remind".
//   alts: [{name, area, km, open, last_in?, travel?, src}] (10.4, Oren 6.11.2026): a generic errand (pitas, groceries) that any of
//         several places can do. The nearest place that can still be reached wins; when the nearest one is closed or closing,
//         the gate points to a place that closes later, even if a bit farther, and the text says so ("X כבר סגור, לך ל-Y").
//         With alts, fit.open is ignored. key = id@<index of the picked place>, so the push restarts when the pick changes.
// The same file is loaded by the app (<script src="timegate.js">) and bundled into the sq-push edge function.
(function (G) {
  const DOW = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const hm = (s) => { const m = String(s || "").trim().match(/^(\d{1,2}):(\d{2})$/); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  const fmt = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };
  function ranges(open, d) {
    if (!open || typeof open !== "object") return null;
    let v = Object.prototype.hasOwnProperty.call(open, String(d)) ? open[String(d)] : open.all;
    if (v === undefined) return null;          // unknown for this day
    if (!v) return [];                          // closed
    return String(v).split(",").map((r) => r.split("-").map(hm)).filter((r) => r.length === 2 && r[0] != null && r[1] != null);
  }
  const isCall = (f) => { const h = Array.isArray(f.how) ? f.how : []; return h.includes("call") && !h.includes("place"); };
  function travelOf(f) {
    if (isCall(f)) return 0;
    if (f.travel != null && !isNaN(+f.travel)) return +f.travel;
    if (f.km != null && !isNaN(+f.km)) return Math.round(6 + 1.5 * +f.km);
    return 15;
  }
  // when is the task planned for (YYYY-MM-DD): Oren's day plan, else next_date, else a deadline day
  function dayOf(t) {
    if (t.day_plan && t.day_plan.date) return t.day_plan.date;
    if (t.next_date) return t.next_date;
    const dl = t.deadline; const d = dl && (typeof dl === "string" ? dl : dl.d);
    return d || null;
  }
  // gate for a task on date `date` (weekday `dow`) at minute-of-day `now`. Returns null when the task has no hours.
  function gate(t, date, dow, now) {
    const f = t && t.fit && typeof t.fit === "object" ? t.fit : null;
    if (!f || (!f.open && !f.appt && !f.remind && !(Array.isArray(f.alts) && f.alts.length))) return null;
    const call = isCall(f), travel = travelOf(f), last = +f.last_in || 0;
    const need = call ? Math.min(+f.mins || 15, 45) : 0;
    const buf = call ? 5 : 10;
    const where = String(f.where || "").trim();
    const base = { id: t.id, title: t.title || "", call, where, travel, est: !!f.hours_est, date };
    if (f.appt) {
      const a = hm(f.appt); if (a == null) return null;
      const by = call ? a : a - travel - buf;
      return { ...base, kind: "at", open: null, close: a, by, closed: false, state: now >= a ? "past" : now >= by ? "late" : by - now <= 30 ? "soon" : "ok" };
    }
    if (Array.isArray(f.alts) && f.alts.length) return altGate(t, f, date, dow, now);
    if (f.remind && !f.open) {
      const r = hm(f.remind); if (r == null) return null;
      return { ...base, kind: "remind", call: false, open: null, close: r, by: r, closed: false, note: String(t.next_step || "").trim(), state: now >= r + 180 ? "past" : now >= r ? "late" : r - now <= 30 ? "soon" : "ok" };
    }
    const rs = ranges(f.open, dow);
    if (rs == null) return { ...base, kind: "unknown" };
    if (!rs.length) return { ...base, kind: "closed", closed: true, next: nextOpen(f.open, dow) };
    // the current or next range today
    let r = rs.find((x) => now < x[1]) || rs[rs.length - 1];
    const close = r[1], by = close - last - travel - need - buf;
    const state = now >= close - last ? "past" : now >= by ? "late" : by - now <= 30 ? "soon" : by - now <= 120 ? "near" : "ok";
    return { ...base, kind: "open", open: r[0], close, last, by, closed: false, state, before: now < r[0] };
  }
  // several places that can do the same errand: pick the nearest one that can still be reached in time
  function altGate(t, f, date, dow, now) {
    const opts = [];
    f.alts.forEach((a, i) => {
      if (!a || !a.open) return;
      const fa = { ...f, open: a.open, km: a.km, travel: a.travel, last_in: a.last_in, where: a.name || f.where, hours_est: !!a.est, appt: null };
      delete fa.alts;
      const g = gate({ ...t, fit: fa }, date, dow, now);
      if (!g || g.kind === "unknown") return;
      opts.push({ ...g, i, km: a.km != null && !isNaN(+a.km) ? +a.km : 99, area: a.area || "" });
    });
    if (!opts.length) return { id: t.id, title: t.title || "", kind: "unknown" };
    opts.sort((a, b) => a.km - b.km);
    const near = opts[0];
    const live = opts.filter((g) => g.kind === "open" && g.state !== "past");
    const reach = live.filter((g) => now < g.by);
    let pick;
    if (reach.length) pick = reach[0];
    else if (live.length) pick = live.slice().sort((a, b) => b.close - a.close)[0];
    else if (opts.every((g) => g.kind === "closed")) {
      const nx = opts.map((g) => g.next).filter(Boolean)[0] || null;
      return { ...near, kind: "closed", closed: true, next: nx, key: t.id, alts: opts.length };
    } else pick = opts.filter((g) => g.kind === "open").sort((a, b) => b.close - a.close)[0] || near;
    // a backup when the pick itself is tight: the place that closes latest
    const later = reach.filter((g) => g !== pick && g.close > pick.close).sort((a, b) => b.close - a.close)[0] || null;
    const backup = (pick.state === "soon" || pick.state === "late") && later ? { where: later.where, close: later.close, by: later.by, km: later.km } : null;
    const nearTxt = near === pick ? null : near.kind === "closed" ? "סגור היום" : now >= near.close - (near.last || 0) ? "כבר סגור" : "סוגר ב-" + fmt(near.close);
    return { ...pick, key: t.id + "@" + pick.i, switched: near !== pick, near: near.where, nearTxt, backup, alts: opts.length };
  }
  function nextOpen(open, dow) {
    for (let i = 1; i <= 7; i++) { const d = (dow + i) % 7, rs = ranges(open, d); if (rs && rs.length) return { dow: d, day: DOW[d], from: fmt(rs[0][0]), to: fmt(rs[rs.length - 1][1]) }; }
    return null;
  }
  // tasks planned for `date` that have hours, sorted by deadline
  function list(topics, date, dow, now, ok) {
    const out = [];
    for (const t of topics || []) {
      if (ok && !ok(t)) continue;
      const d = dayOf(t); if (d !== date) continue;
      const g = gate(t, date, dow, now); if (g && g.kind !== "unknown") out.push(g);
    }
    return out.sort((a, b) => (a.closed ? 9e9 : a.by) - (b.closed ? 9e9 : b.by));
  }
  function text(g) {
    const w = g.where ? g.where + " " : "";
    if (g.kind === "closed") return { head: (g.call ? "📵 לא עונים היום" : "🚫 סגור היום"), body: `${w}סגור היום.${g.next ? ` פתוח שוב ב${g.next.day} מ-${g.next.from}.` : ""}` };
    if (g.kind === "remind") return { head: `⏰ ${fmt(g.close)}`, body: g.note || g.where || "תזכורת" };
    if (g.kind === "at") return { head: g.call ? `📞 שיחה ב-${fmt(g.close)}` : `🚗 צא עד ${fmt(g.by)}`, body: `${w}ב-${fmt(g.close)}.${g.call ? "" : ` ${g.travel} דק׳ נסיעה.`}` };
    const lastTxt = g.last ? ` (כניסה אחרונה ${fmt(g.close - g.last)})` : "";
    if (g.alts) {
      // the place to go comes first (the strip cuts long lines), then why
      const sw = g.switched ? ` (${g.near} ${g.nearTxt})` : "";
      const bk = g.backup ? ` לא מספיק? ${g.backup.where} עד ${fmt(g.backup.close)}.` : "";
      return { head: `🚗 צא עד ${fmt(g.by)}`, body: `${g.switched ? "לך ל" : ""}${g.where}: פתוח עד ${fmt(g.close)}${lastTxt}, ${g.travel} דק׳.${sw}${bk}`, tip: !!(g.switched || g.backup) };
    }
    if (g.call) return { head: `📞 להתקשר עד ${fmt(g.by)}`, body: `${w || "המוקד "}נסגר ב-${fmt(g.close)}.` };
    return { head: `🚗 צא עד ${fmt(g.by)}`, body: `${w}סוגרים ב-${fmt(g.close)}${lastTxt}. ${g.travel} דק׳ נסיעה.` };
  }
  // recurring task (9.2): recur {dow: 0-6}. A done task reopens on its next day (closed before that day's 00:00 = open again),
  // planned for that day. Same rule in the app and in sq-push, so a weekly reminder pushes again every week.
  function recurOpen(t, today) {
    const r = t && t.recur; if (!r || r.dow == null || t.status !== "done") return t;
    const d = today ? new Date(today + "T00:00:00") : new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() - r.dow + 7) % 7));
    const iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const doneAt = t.done_at ? Date.parse(t.done_at) : 0;
    // done_at is UTC; compare with that day's 00:00 in Israel (UTC+2/+3): 21:00Z the evening before is safe enough
    return doneAt < Date.parse(iso + "T00:00:00Z") - 2 * 3600000 ? { ...t, status: "active", done_at: "", next_date: iso } : t;
  }
  G.SQGate = { gate, list, text, fmt, hm, dayOf, ranges, nextOpen, recurOpen, DOW };
})(typeof globalThis !== "undefined" ? globalThis : window);
