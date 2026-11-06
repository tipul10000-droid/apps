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
    if (!f || (!f.open && !f.appt)) return null;
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
    const rs = ranges(f.open, dow);
    if (rs == null) return { ...base, kind: "unknown" };
    if (!rs.length) return { ...base, kind: "closed", closed: true, next: nextOpen(f.open, dow) };
    // the current or next range today
    let r = rs.find((x) => now < x[1]) || rs[rs.length - 1];
    const close = r[1], by = close - last - travel - need - buf;
    const state = now >= close - last ? "past" : now >= by ? "late" : by - now <= 30 ? "soon" : by - now <= 120 ? "near" : "ok";
    return { ...base, kind: "open", open: r[0], close, last, by, closed: false, state, before: now < r[0] };
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
    if (g.kind === "at") return { head: g.call ? `📞 שיחה ב-${fmt(g.close)}` : `🚗 צא עד ${fmt(g.by)}`, body: `${w}ב-${fmt(g.close)}.${g.call ? "" : ` ${g.travel} דק׳ נסיעה.`}` };
    const lastTxt = g.last ? ` (כניסה אחרונה ${fmt(g.close - g.last)})` : "";
    if (g.call) return { head: `📞 להתקשר עד ${fmt(g.by)}`, body: `${w || "המוקד "}נסגר ב-${fmt(g.close)}.` };
    return { head: `🚗 צא עד ${fmt(g.by)}`, body: `${w}סוגרים ב-${fmt(g.close)}${lastTxt}. ${g.travel} דק׳ נסיעה.` };
  }
  G.SQGate = { gate, list, text, fmt, hm, dayOf, ranges, nextOpen, DOW };
})(typeof globalThis !== "undefined" ? globalThis : window);
