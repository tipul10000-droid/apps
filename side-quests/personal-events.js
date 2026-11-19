// personal-events.js (Side Quests 24.6, Oren 19.11.2026, after arriving 30 minutes late to a private treatment at 18:00 on 17.11
// with no reminder at all). STANDING RULE for the whole app: every PRIVATE calendar event gets "leave by" alerts.
// Private = an event Oren opened for himself: no attendees, he is the organizer (Outlook self-invite), not all-day, not free/OOF,
// not a vacation / miluim / focus block. Later also events from his private Google Calendar (same shape, src "gcal").
// The same file runs in the app (red "צא עד" strip + brief top) and inside the sq-push edge function (pushes every 5 minutes).
// Each event becomes a pseudo task for timegate.js: {id:"cal:<doc>", title, next_date, fit:{appt, travel, where, how:["place"]}}.
// Travel = from where he will be at that time to the event's place, with a rush-hour model (no live traffic API yet):
//   origin: his phone's last location (settings/loc_last, < 45 min old) > office on a work day 08:30-18:30 > home.
//   place:  settings/places.list [{k:[keywords], name, area, lat, lng, mins?}] matched on subject + location, else the
//           location text (unknown coordinates = 25 min, said in the text so he can teach the place).
//   minutes = road km (straight line x1.3) / speed (Sun-Thu 07:00-09:30 and 15:30-19:00: 32 km/h, else 50) + 8 (parking, walk).
// Data never in the repo (public): places, coordinates of home/work and the calendar all live in sq_docs.
(function (G) {
  const TZ = "Asia/Jerusalem";
  const SKIP = /חופש|מיצוי|ריטריט|מילואים|\bOOF\b|out of office|vacation|focus|חסימה|לא לקבוע|block(ed)?\b|ריכוז|תזכורת לעצמי/i;
  const dk = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
  const hm = (d) => { const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d).split(":").map(Number); return (h % 24) * 60 + m; };
  const fmt = (m) => String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  function isPersonal(e, prof) {
    if (!e || e.cancelled || e.deleted || e._deleted || !e.start || e.all_day) return false;
    if (e.show_as === "free" || e.show_as === "oof") return false;
    if (e.src === "gcal") return !SKIP.test(e.subject || "");            // his private Google Calendar: everything is his
    const own = e.response === "organizer" || e.response === "none" || !e.response;
    if (!own || (+e.attendees || 0) > 1) return false;
    if (SKIP.test(e.subject || "")) return false;
    const off = (prof && prof.ev_alert) || {};                           // Oren can switch one off: _profile.ev_alert[<doc id or subject>] = "off"
    if (off[e._id] === "off" || off[String(e.subject || "").trim()] === "off") return false;
    return (new Date(e.end) - new Date(e.start)) < 10 * 3600e3;
  }
  const rad = (x) => x * Math.PI / 180;
  function km(a, b) {
    if (!a || !b || a.lat == null || b.lat == null) return null;
    const d1 = rad(b.lat - a.lat), d2 = rad(b.lng - a.lng);
    const x = Math.sin(d1 / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(d2 / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
  function peak(dow, mins) { return dow <= 4 && ((mins >= 420 && mins < 570) || (mins >= 930 && mins < 1140)); }
  function drive(from, to, dow, mins) {
    const k = km(from, to); if (k == null) return null;
    if (k < 0.6) return 0;
    return Math.max(8, Math.round((k * 1.3) / (peak(dow, mins) ? 32 : 50) * 60 + 8));
  }
  function placeOf(e, places) {
    const txt = ((e.subject || "") + " " + (e.location || "")).toLowerCase();
    for (const p of (places && places.list) || []) {
      const ks = Array.isArray(p.k) ? p.k : [p.k];
      if (ks.some((k) => k && txt.includes(String(k).toLowerCase()))) return p;
    }
    const loc = String(e.location || "").trim();
    return loc && !/teams|zoom|webex|online/i.test(loc) ? { name: loc, unknown: true } : null;
  }
  // where will he leave from, for an event that starts at minute `start` of day `iso`
  function originOf(iso, start, opt) {
    const P = opt.places || {}, now = opt.now || Date.now();
    const L = opt.loc;
    if (L && L.lat != null && now - Date.parse(L.at || 0) < 45 * 60000 && iso === dk(new Date(now))) return { lat: L.lat, lng: L.lng, label: L.label || "המיקום שלך" };
    const dow = new Date(iso + "T12:00:00Z").getUTCDay();
    const D = opt.day ? opt.day(iso) : null;
    const office = D ? D.office !== false && !D.away : dow <= 4;
    const leave = start - 40;
    if (dow <= 4 && office && leave >= 510 && leave < 1110 && P.work) return { ...P.work, label: "העבודה" };
    return P.home ? { ...P.home, label: "הבית" } : null;
  }
  // events of day `iso` as pseudo tasks for SQGate. opt: {places, prof, loc, day (SQWorkCal.day), now}
  function tasks(events, iso, opt) {
    opt = opt || {};
    const out = [];
    for (const e of events || []) {
      if (!isPersonal(e, opt.prof)) continue;
      const s = new Date(e.start); if (dk(s) !== iso) continue;
      const st = hm(s), dow = new Date(iso + "T12:00:00Z").getUTCDay();
      const pl = placeOf(e, opt.places), from = originOf(iso, st, opt);
      let travel = pl && pl.mins != null ? +pl.mins : null, guess = false;
      if (travel == null && pl && !pl.unknown) travel = drive(from, pl, dow, st - 30);
      if (travel == null) { travel = 25; guess = true; }
      const where = pl ? (pl.name + (pl.area && !String(pl.name).includes(pl.area) ? ", " + pl.area : "")) : "";
      const t = String(e.subject || "אירוע").replace(/^\[external\]\s*/i, "").trim();
      out.push({ id: "cal:" + (e._id || e.ev_id || t), title: t, next_date: iso, status: "active", cal: true, guess, from: from && from.label || "",
        start: st, url: e.web_link || "", fit: { appt: fmt(st), travel, where, how: travel ? ["place"] : ["home"] } });
    }
    return out;
  }
  // one line for a push / the strip: "לצאת מהעבודה ב-17:19 · 31 דק׳ לרעננה (שעת עומס)"
  function why(p) {
    const parts = [];
    if (p.fit.travel) parts.push(`${p.fit.travel} דק׳ נסיעה${p.from ? " מ" + p.from : ""}`);
    if (p.guess) parts.push("לא יודע איפה זה, הנחתי 25 דק׳");
    return parts.join(" · ");
  }
  G.SQPersonal = { isPersonal, tasks, why, km, drive, peak, fmt };
})(typeof globalThis !== "undefined" ? globalThis : window);
