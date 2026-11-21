// מיני דשבורד לטיול (19.11.2026). מצייר טיול אחד מתוך אובייקט נתונים.
// משמש גם את הדף הציבורי (trips/index.html, רק תצוגה) וגם את הדף של אורן (side-quests/trip.html, עריכה / תצוגה / שיתוף).
// אין כאן נתונים, הכול מגיע מהמסד. כל טקסט עובר escape.
(function () {
  "use strict";
  var DAY = 864e5;
  var HEB_DOW = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function url(u) { if (!u) return ""; try { var x = new URL(u, location.href); return /^https?:$/.test(x.protocol) ? x.href : ""; } catch (e) { return ""; } }
  // לוגו גוגל מפס (סיכה בארבעת הצבעים) ליד כל קישור לגוגל מפס (אורן 19.11.2026).
  var GMAPS = '<svg class="tp-gm" viewBox="0 0 92 132" aria-hidden="true"><path d="M60.2 2.2C55.8.8 51 0 46.1 0 32 0 19.3 6.4 10.8 16.5l21.8 18.3L60.2 2.2z" fill="#1a73e8"/><path d="M10.8 16.5C4.1 24.5 0 34.9 0 46.1c0 8.7 1.7 15.7 4.6 22l28-33.3-21.8-18.3z" fill="#ea4335"/><path d="M46.2 28.5c9.8 0 17.7 7.9 17.7 17.7 0 4.3-1.6 8.3-4.2 11.4 0 0 13.9-16.6 27.5-32.7-5.6-10.8-15.3-19-27-22.7L32.6 34.8c3.3-3.8 8.1-6.3 13.6-6.3" fill="#4285f4"/><path d="M46.2 63.8c-9.8 0-17.7-7.9-17.7-17.7 0-4.3 1.5-8.3 4.1-11.3l-28 33.3c4.8 10.6 12.8 19.2 21 29.9l34.1-40.5c-3.3 3.9-8.1 6.3-13.5 6.3" fill="#fbbc04"/><path d="M59.1 109.2c15.4-24.1 33.3-35 33.3-63 0-7.7-1.9-14.9-5.2-21.3L25.6 98c2.6 3.4 5.3 7.3 7.9 11.3 9.4 14.5 6.8 23.1 12.8 23.1s3.4-8.7 12.8-23.2" fill="#34a853"/></svg>';
  function ymd(s) { var p = String(s || "").split("-").map(Number); return p.length === 3 ? Date.UTC(p[0], p[1] - 1, p[2]) : NaN; }
  function dShort(s) { var p = String(s || "").split("-").map(Number); return p.length === 3 ? p[2] + "." + p[1] : ""; }
  function dowOf(s) { var t = ymd(s); return isNaN(t) ? "" : HEB_DOW[new Date(t).getUTCDay()]; }
  // today in the trip's time zone (or ?today=YYYY-MM-DD for testing)
  function todayIn(tz) {
    var q = new URLSearchParams(location.search).get("today");
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: tz || "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function isT1(a) {
    a = a || {};
    return (a.c === "TLV" || /נתב/.test(a.n || "")) && /^\s*1\b/.test(String(a.t || "")) && !/\?/.test(String(a.t || ""));
  }
  // Terminal 1 (Oren 19.11.2026): calm, no "!", shown in the "important to remember" box, not as an alarm.
  function t1Note(f) {
    return { i: "1", h: "ממריאים מטרמינל 1 בנתב״ג", s: (f.dir ? f.dir + " " : "") + "ב-" + dShort(f.d) + " " + (f.dep || "") + ". שימו לב, לא טרמינל 3." };
  }
  function nowHM(tz) {
    var q = new URLSearchParams(location.search).get("now");
    if (q && /^\d{2}:\d{2}$/.test(q)) return q;
    try { return new Intl.DateTimeFormat("en-GB", { timeZone: tz || "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()); }
    catch (e) { return "12:00"; }
  }
  function phase(t) {
    var td = todayIn(t.tz), a = ymd(t.from), b = ymd(t.to), n = ymd(td);
    if (n < a) return { k: "pre", n: Math.round((a - n) / DAY), today: td };
    if (n > b) return { k: "post", n: Math.round((n - b) / DAY), today: td };
    return { k: "trip", n: Math.round((n - a) / DAY) + 1, of: Math.round((b - a) / DAY) + 1, today: td };
  }

  var LAND = {
    italy: "M40 22 C70 6 140 6 162 20 C152 34 132 40 126 54 C146 84 176 108 200 128 C216 139 226 150 216 165 C206 160 200 151 190 151 C181 165 171 171 165 166 C170 151 160 136 140 126 C115 111 95 86 80 61 C70 46 52 40 40 22 Z",
    sicily: "M150 182 C165 176 186 176 196 180 C190 190 170 194 152 190 Z",
    sardinia: "M40 92 C50 88 56 98 54 116 C52 132 44 136 38 126 C34 112 34 98 40 92 Z",
    israel: "M330 112 C334 110 338 112 338 118 L336 140 C334 150 330 156 328 150 L326 128 C326 120 327 114 330 112 Z"
  };
  var PLANE = '<path d="M-7 -1 L2 -1 L-2 -7 L0.6 -7 L6 -1 L9 -1 Q11 0 9 1 L6 1 L0.6 7 L-2 7 L2 1 L-7 1 L-9 4 L-10 4 L-9 0 L-10 -4 L-9 -4 Z" fill="currentColor"/>';

  function mapSvg(m) {
    if (!m || !Array.isArray(m.pts)) return "";
    var P = {}; m.pts.forEach(function (p) { P[p.id] = p; });
    var land = (m.land || []).map(function (k) { return LAND[k] ? '<path d="' + LAND[k] + '" fill="var(--soft)" stroke="var(--line)" stroke-width="1.2"/>' : ""; }).join("");
    var legs = (m.legs || []).map(function (l, i) {
      var a = P[l.a], b = P[l.b]; if (!a || !b) return "";
      var cx = (a.x + b.x) / 2 + (l.dx || 0), cy = (a.y + b.y) / 2 + (l.dy || 0);
      var d = "M" + a.x + " " + a.y + " Q" + cx + " " + cy + " " + b.x + " " + b.y;
      var fly = l.mode === "fly";
      var s = '<path d="' + d + '" fill="none" stroke="' + (fly ? "var(--c1)" : "var(--c2)") + '" stroke-width="' + (fly ? 2 : 3) + '" stroke-linecap="round"' + (fly ? ' stroke-dasharray="5 6"' : "") + "/>";
      if (fly && l.plane) {
        var tx = 0.25 * a.x + 0.5 * cx + 0.25 * b.x, ty = 0.25 * a.y + 0.5 * cy + 0.25 * b.y;
        var ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
        s += '<g transform="translate(' + tx.toFixed(1) + " " + ty.toFixed(1) + ") rotate(" + ang.toFixed(0) + ')" style="color:var(--c1)">' + PLANE + "</g>";
      }
      return s;
    }).join("");
    var pts = m.pts.map(function (p) {
      var main = !!p.main, r = main ? 7 : 5;
      var lx = p.x + (p.lx != null ? p.lx : 10), ly = p.y + (p.ly != null ? p.ly : 4);
      return '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (r + 4) + '" fill="var(--gold)" opacity=".35"/>' +
        '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + r + '" fill="' + (main ? "var(--c1)" : "var(--c2)") + '" stroke="#fff" stroke-width="2"/>' +
        '<text x="' + lx + '" y="' + ly + '" font-family="Rubik,Assistant,sans-serif" font-weight="800" font-size="' + (main ? 15 : 13) + '" fill="var(--ink)" text-anchor="' + (p.anchor || "start") + '">' + esc(p.n) + "</text>" +
        (p.sub ? '<text x="' + lx + '" y="' + (ly + 15) + '" font-family="Assistant,sans-serif" font-weight="700" font-size="11.5" fill="var(--muted)" text-anchor="' + (p.anchor || "start") + '">' + esc(p.sub) + "</text>" : "");
    }).join("");
    return '<svg viewBox="0 0 360 200" direction="ltr" role="img" aria-label="מפת המסלול"><rect width="360" height="200" fill="rgba(80,150,200,.10)"/>' + land + legs + pts + "</svg>";
  }

  // אייקונים נקיים בקו אחד (Lucide, ISC) במקום אימוג׳ים, בצבע הטקסט (אורן 19.11.2026).
  var ICP = {
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    sight: '<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M12 2l8 5H4z"/>',
    view: '<path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
    food: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    coffee: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>',
    sweet: '<path d="m7 11 4.08 10.35a1 1 0 0 0 1.84 0L17 11"/><path d="M17 7A5 5 0 0 0 7 7"/><path d="M17 7a2 2 0 0 1 0 4H7a2 2 0 0 1 0-4"/>',
    bar: '<path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15v7"/><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"/>',
    shop: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    hotel: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    bulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>',
    map: '<path d="M14.1 4.4 9.9 2.3a2 2 0 0 0-1.8 0L3.6 4.6A1 1 0 0 0 3 5.5v14.3a1 1 0 0 0 1.4.9l3.7-1.9a2 2 0 0 1 1.8 0l4.2 2.1a2 2 0 0 0 1.8 0l4.5-2.3a1 1 0 0 0 .6-.9V3.4a1 1 0 0 0-1.4-.9l-3.7 1.9a2 2 0 0 1-1.8 0z"/><path d="M15 5.8v15"/><path d="M9 3.2v15"/>',
    pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    train: '<rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><path d="M8 15h.01"/><path d="M16 15h.01"/>',
    wx: '<path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
    cam: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
    school: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    bag: '<path d="M6 20a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2"/><path d="M8 18V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14"/><path d="M10 20h4"/><circle cx="16" cy="20" r="2"/><circle cx="8" cy="20" r="2"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    thermo: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
    mountain: '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
    star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>'
  };
  // אימוג׳י שמגיע מהנתונים (תובנות הליסט) -> אייקון נקי
  var EMO = { "🏛️": "sight", "🏛": "sight", "🌅": "view", "🍝": "food", "🥪": "food", "🍕": "food", "☕": "coffee", "🍦": "sweet", "🍰": "sweet", "🍸": "bar", "🍷": "bar", "🛍️": "shop", "🛍": "shop", "🏨": "hotel", "🧭": "compass", "📅": "cal", "🗓️": "cal", "💡": "bulb", "🗺️": "map", "📍": "pin", "✈️": "plane", "🚆": "train", "📸": "cam", "⭐": "star",
    "🎤": "mic", "🎙️": "mic", "💸": "cash", "💰": "cash", "💵": "cash", "🏫": "school", "🎓": "school", "🧳": "bag", "🎯": "target",
    "🌡️": "thermo", "🌡": "thermo", "🏔️": "mountain", "⛰️": "mountain", "🌑": "moon", "🌙": "moon", "🎫": "ticket", "🎟️": "ticket", "🏟️": "ticket", "ℹ️": "info", "📌": "pin" };
  // an emoji from the data: a known one becomes a clean icon, anything else (e.g. a country flag) stays as it is (Oren 21.11.2026)
  function em(e, cls) { e = e == null ? "" : String(e); return ICP[e] || EMO[e] ? ic(e, cls) : esc(e); }
  function ic(k, cls) { var d = ICP[k] || ICP[EMO[k]] || ICP.bulb; return '<svg class="tp-ic' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>"; }
  // section that opens and closes; closed by default (Oren 19.11.2026: a lot of knowledge, less scrolling)
  function sx(k, title, small, body, open, sub) {
    return '<section class="tp-sec"><details class="tp-sx"' + (open ? " open" : "") + '><summary class="tp-sh">' + ic(k, "e") + '<span class="tp-sht"><h2>' + title + "</h2>" + (sub || "") + "</span>" + (small ? "<small>" + small + "</small>" : "") + chev() + '</summary><div class="tp-sxb">' + body + "</div></details></section>";
  }
  function chev() { return '<span class="tp-chev" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'; }
  // כל מקום בטיול = קישור קטן ושקט לגוגל מפס עם סיכה וכיתוב "Google Maps" (אורן 19.11.2026).
  // x.g = קישור מוכן, x.q = מה לחפש בגוגל מפס. בלי אף אחד מהם = בלי קישור.
  function gq(x) { if (!x) return ""; var g = x.g ? url(x.g) : ""; return g || (x.q ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(x.q) : ""); }
  function gml(x, cls) { var u = gq(x); return u ? '<a class="tp-gl' + (cls ? " " + cls : "") + '" href="' + esc(u) + '" target="_blank" rel="noopener">' + GMAPS + '<span dir="ltr">Google Maps</span></a>' : ""; }
  function img(base, k) { return k ? (/^(data:|https?:)/.test(k) ? k : base + k + (/\.(png|webp|svg|jpg)$/.test(k) ? "" : ".webp")) : ""; }
  // brand logo next to a name (Oren 19.11.2026): hotel, airline, chain. k = "logo-citizenm.png"
  function logo(base, k) { return k ? '<img class="tp-logo" src="' + esc(img(base, k)) + '" alt="" loading="lazy">' : ""; }

  function render(root, t, o) {
    o = o || {};
    var base = o.img || "img/", G = o.gfx || {}, own = o.mode === "edit";
    var th = t.theme || {};
    root.className = "tp";
    if (th.c1) root.style.setProperty("--c1", th.c1);
    if (th.c2) root.style.setProperty("--c2", th.c2);
    if (th.gold) root.style.setProperty("--gold", th.gold);
    var ph = phase(t), H = [];
    var gfxUrl = function (key) { var s = (t.gfx || {})[key], g = s && G[s.id]; return g && g.data ? "data:" + (g.mime || "image/webp") + ";base64," + g.data : ""; };

    // ---- hero ----
    var hdef = (t.gfx || {}).hero, hg = hdef && G[hdef.id], hban = gfxUrl("hero");
    // a ready-made banner (with its own title, e.g. 3:1 from ChatGPT) is shown whole, not cropped, with the chips under it
    var isBan = !!hban && (hdef.banner || (hg && hg.w && hg.h && hg.w / hg.h >= 2.2));
    // a poster with its own text in hero_img (hero_full) = shown whole too, never cropped
    var hFull = !hban && !!t.hero_img && !!t.hero_full; if (hFull) isBan = true;
    var hero = hban || img(base, t.hero_img);
    var cd = t.stage === "plan" ? (t.when || "בתכנון") : ph.k === "pre" ? (ph.n === 1 ? "מחר טסים!" : "עוד " + ph.n + " ימים") : ph.k === "trip" ? "יום " + ph.n + " מתוך " + ph.of : "היה מדהים";
    var chips = '<div class="tp-chips"><span class="tp-chip big">' + esc(cd) + '</span><span class="tp-chip" dir="ltr">' + esc(dShort(t.from) + " – " + dShort(t.to) + "." + String(t.to || "").slice(2, 4)) + "</span>" +
      (t.who ? '<span class="tp-chip">' + esc(t.who) + "</span>" : "") + "</div>";
    if (isBan) H.push('<header class="tp-hero ban' + (hFull ? " full" : "") + '"><img src="' + esc(hero) + '" alt="' + esc(t.title) + '"><div class="in"><h1 class="tp-sr">' + esc(t.title) + "</h1>" + chips + "</div></header>");
    // no image yet (e.g. gfx.hero still waiting for its file) = a compact text header, no empty banner
    else H.push('<header class="tp-hero' + (hero ? "" : " noimg") + '">' + (hero ? '<img src="' + esc(hero) + '" alt="">' : "") + (t.snow ? '<div class="tp-snow"></div>' : "") +
      '<div class="in">' + (t.flag ? '<div class="tp-flag">' + em(t.flag) + "</div>" : "") + "<h1>" + esc(t.title) + '</h1><p class="sub">' + esc(t.tagline || "") + "</p>" + chips + "</div></header>");
    if (own && o.slot) H.push('<div class="w"><div data-slot="hero" style="margin-top:12px"></div></div>');

    H.push('<div class="w">');
    // ---- stats strip ----
    var st = t.stats || [];
    st = st.slice(0, 4);
    // exactly as many columns as stats, so no empty cells (Oren 21.11.2026)
    if (st.length) H.push('<div class="tp-stats" style="grid-template-columns:repeat(' + st.length + ',minmax(0,1fr))">' + st.map(function (s) { return '<div class="tp-stat"><i>' + em(s.e) + "</i><b dir=\"ltr\">" + esc(s.v) + "</b><span>" + esc(s.l) + "</span></div>"; }).join("") + "</div>");
    if (t.desc) H.push('<p class="tp-desc">' + esc(t.desc) + "</p>");

    // ---- now / next ----
    var days = Array.isArray(t.days) ? t.days : [];
    var nowBox = "";
    if (ph.k === "trip") {
      var dd = days.filter(function (d) { return d.d === ph.today; })[0], hm = nowHM(t.tz);
      var nx = dd && (dd.items || []).filter(function (it) { return it.t && it.t >= hm; })[0];
      nowBox = '<div class="tp-now"><span class="ic">' + em(nx ? nx.e || "⭐" : "🌙") + "</span><div><b>" + esc(nx ? "הבא: " + nx.t + " · " + nx.h : (dd ? dd.title : "יום בטיול")) + "</b><span>" + esc(nx ? nx.s || "" : "תהנו מהערב") + "</span></div></div>";
    } else if (ph.k === "pre" && t.next_up) {
      nowBox = '<div class="tp-now"><span class="ic">' + em(t.next_up.e || "🧳") + "</span><div><b>" + esc(t.next_up.h) + "</b><span>" + esc(t.next_up.s || "") + "</span>" + gml(t.next_up, "lt") + "</div></div>";
    }
    H.push(nowBox);

    // ---- 📌 important to remember (calm notices: Terminal 1 + t.alerts [{e,h,s}]) ----
    var t1f = (Array.isArray(t.flights) ? t.flights : []).filter(function (f) { return isT1(f.from) && (!ph.today || f.d >= ph.today); })[0];
    var notes = [];
    if (t1f && ph.k !== "post") notes.push(t1Note(t1f));
    (Array.isArray(t.alerts) ? t.alerts : []).forEach(function (a) { if (a && a.h) notes.push({ i: a.e || "•", h: a.h, s: a.s || "", g: a.g, q: a.q }); });
    if (notes.length) H.push('<section class="tp-notes" aria-label="חשוב לזכור"><div class="h">' + ic("pin") + 'חשוב לזכור</div>' + notes.map(function (n) {
      return '<div class="it"><span class="ic">' + em(n.i) + "</span><div><b>" + esc(n.h) + "</b>" + (n.s ? "<span>" + esc(n.s) + "</span>" : "") + gml(n) + "</div></div>";
    }).join("") + "</section>");

    // ---- a slideshow (deck) kept with the trip: one cover card, tap = full-screen swipe viewer (Oren 21.11.2026) ----
    // t.deck {h, sub, slides:[{img, cap}]}; not in the public whitelist, so only the owner's page shows it
    var dk = t.deck && Array.isArray(t.deck.slides) ? t.deck.slides.filter(function (x) { return x && x.img; }) : [];
    if (dk.length) H.push('<section class="tp-sec"><button type="button" class="tp-dk" data-dk="0" aria-label="' + esc(t.deck.h || "מצגת") + '"><img src="' + esc(img(base, dk[0].img)) + '" alt="" loading="lazy"><span class="x"><b>' + ic(t.deck.i || "cam") + esc(t.deck.h || "מצגת") + "</b><span>" + esc(t.deck.sub || "") + '</span></span><span class="n" dir="ltr">' + dk.length + " ▸</span></button></section>");

    // ---- map ----
    if (t.map) {
      H.push(sx("map", "המסלול", esc(t.map.note || ""), '<div class="tp-card tp-map">' + mapSvg(t.map) +
        '<div class="tp-legend"><span style="color:var(--acc)"><u style="border-top-style:dashed"></u>טיסה</span><span style="color:var(--acc2)"><u></u>רכבת</span>' + (t.map.legend || []).map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") + "</div></div>"));
    }

    // ---- days ----
    if (days.length) {
      H.push('<section class="tp-sec"><div class="tp-sh">' + ic("cal", "e") + '<h2>יום אחרי יום <span class="tp-h2s">(הצעת תכנון)</span></h2><small>לחיצה פותחת</small></div><div class="tp-days">' +
        days.map(function (d, i) {
          var isT = ph.k === "trip" && d.d === ph.today, hm = isT ? nowHM(t.tz) : "", nextDone = false;
          return '<details class="tp-day' + (isT ? " today" : "") + '"' + (isT || (ph.k === "pre" && i === 0 && o.openFirst) ? " open" : "") + "><summary>" +
            '<div class="tp-dimg">' + (d.img ? '<img src="' + esc(img(base, d.img)) + '" alt="" loading="lazy">' : "") + '<span class="tp-dnum">יום ' + (i + 1) + "</span></div>" +
            '<div class="tp-dt"><small>' + esc((isT ? "היום · " : "") + "יום " + dowOf(d.d) + " " + dShort(d.d) + (d.city ? " · " + d.city : "")) + "</small><b>" + esc(d.title) + "</b>" + (d.sub ? "<span>" + esc(d.sub) + "</span>" : "") + "</div>" + chev() + "</summary>" +
            '<ul class="tp-tl">' + (d.items || []).map(function (it) {
              var nx = isT && !nextDone && it.t && it.t >= hm; if (nx) nextDone = true;
              return '<li class="' + (it.open ? "open " : "") + (nx ? "next" : "") + '"><span class="t">' + esc(it.t || "") + '</span><span class="e">' + esc(it.e || "•") + '</span><span class="x"><b>' + logo(base, it.logo) + esc(it.h) + "</b>" + (it.s ? "<span>" + esc(it.s) + "</span>" : "") + gml(it) + "</span></li>";
            }).join("") + "</ul>" + (gq(d) ? '<div class="tp-dgl">' + gml(d) + "</div>" : "") + "</details>";
        }).join("") + "</div></section>");
    }

    // ---- flights ----
    var fl = Array.isArray(t.flights) ? t.flights : [];
    if (fl.length) {
      var plane = '<svg viewBox="0 0 84 26" aria-hidden="true"><path d="M4 18 Q42 -2 80 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 4"/><g transform="translate(42 8)">' + PLANE + "</g></svg>";
      H.push('<section class="tp-sec"><div class="tp-sh">' + ic("plane", "e") + '<h2>טיסות</h2><small>לחיצה לפרטים</small></div>' +
        fl.map(function (f) {
          var A = f.from || {}, B = f.to || {};
          // collapsed = one compact row: airline logo, flight no., date, times and duration; the boarding pass and every detail open on tap (Oren 21.11.2026)
          var mk = f.logo ? '<span class="tp-flg"><img src="' + esc(img(base, f.logo)) + '" alt="" loading="lazy"></span>' : '<span class="tp-flg">' + ic("plane") + "</span>";
          return '<details class="tp-bp"><summary><div class="tp-fs">' + mk +
            '<div class="tp-fsm"><b dir="ltr">' + esc(f.logo ? (f.no || f.air || "") : (f.air || "") + " " + (f.no || "")) + "</b><span>" + esc(f.dir || "") + " · " + esc(dShort(f.d)) + "</span></div>" +
            '<div class="tp-fst" dir="ltr"><b>' + esc(f.dep || "") + " → " + esc(f.arr || "") + "</b><span>" + esc((A.c || "") + "→" + (B.c || "") + (f.dur ? " · " + f.dur : "")) + "</span></div>" +
            '<span class="tp-chev">‹</span></div>' +
            (isT1(A) ? '<div class="tp-t1s">ממריאים מטרמינל 1, לא 3</div>' : "") +
            "</summary><div class=\"tp-more tp-fmore\">" +
            '<div class="tp-bpm"><div class="tp-ap"><b>' + esc(A.c) + "</b><span>" + esc(A.n) + "</span><i>" + esc(f.dep) + '</i></div><div class="tp-fly">' + plane + esc(f.dur || "") + '</div><div class="tp-ap r"><b>' + esc(B.c) + "</b><span>" + esc(B.n) + "</span><i>" + esc(f.arr) + "</i></div></div>" +
            '<div class="tp-bpf"><span>טרמינל <b>' + esc(A.t || "?") + "</b> ← <b>" + esc(B.t || "?") + "</b></span>" + (f.seats ? "<span>מושבים <b dir=\"ltr\">" + esc(f.seats) + "</b></span>" : "") + "</div>" +
            '<div class="tear"></div><dl class="tp-kv">' +
            [f.ac ? ["מטוס", f.ac] : null, f.dur ? ["משך טיסה", f.dur + " שעות"] : null].filter(Boolean).concat(f.kv || []).map(function (x) { return "<dt>" + esc(x[0]) + "</dt><dd>" + esc(x[1]) + "</dd>"; }).join("") + "</dl>" +
            '<div class="tp-gls">' + [A, B].map(function (p) { return p.c || p.n ? '<span>' + esc(p.n || p.c) + gml({ g: p.g, q: p.q || (p.c ? p.c + " Airport" + (p.t && p.t !== "?" ? " Terminal " + p.t : "") : p.n) }) + "</span>" : ""; }).join("") + "</div></div></details>";
        }).join("") + "</section>");
    }

    // ---- hotels ----
    var ho = Array.isArray(t.hotels) ? t.hotels : [];
    if (ho.length) {
      H.push('<section class="tp-sec"><div class="tp-sh">' + ic("hotel", "e") + '<h2>איפה ישנים</h2><small>' + esc(t.nights_l || "") + "</small></div>" +
        ho.map(function (x) {
          var mu = url(x.maps || "");
          return '<details class="tp-hotel"><summary><div class="tp-himg">' + (x.img ? '<img src="' + esc(img(base, x.img)) + '" alt="" loading="lazy">' : "") + '<span class="tp-hn">' + esc(x.city || "") + " · " + esc(x.nights_l || "") + "</span></div>" +
            '<div class="tp-hb"><b>' + logo(base, x.logo) + esc(x.name) + "</b><span>" + esc(x.area || x.addr || "") + "</span></div>" +
            '<div class="tp-hrow"><span class="tp-pill" dir="rtl">📅 ' + esc(dShort(x.in) + " ← " + dShort(x.out)) + "</span>" + (x.pills || []).map(function (p) { return '<span class="tp-pill ' + esc(p.c || "") + '">' + esc(p.t) + "</span>"; }).join("") + "</div>" +
            '<span class="tp-tap">▾ פרטים</span></summary><div class="tp-more">' + (Array.isArray(x.pics) && x.pics.length ? '<div class="tp-gal tp-hgal">' + x.pics.map(function (p) { return '<figure><img src="' + esc(img(base, p.img)) + '" alt="" loading="lazy">' + (p.cap ? "<figcaption>" + esc(p.cap) + "</figcaption>" : "") + "</figure>"; }).join("") + "</div>" : "") + '<dl class="tp-kv">' + (x.kv || []).map(function (k) { return "<dt>" + esc(k[0]) + "</dt><dd>" + esc(k[1]) + "</dd>"; }).join("") + "</dl>" +
            (mu ? '<a class="tp-mapsph" style="margin-top:10px" href="' + esc(mu) + '" target="_blank" rel="noopener">' + GMAPS + "<span>פתיחה ב-Google Maps</span></a>" : "") + "</div></details>";
        }).join("") + "</section>");
    }

    // ---- costs (owner only; never in the public page): paid, missing, vs the cashflow trip key, live spend (Oren 21.11.2026) ----
    var C = t.costs;
    if (own && C && Array.isArray(C.items) && C.items.length) {
      var nis = function (v) { return "₪" + Math.round(+v || 0).toLocaleString("en-US"); };
      var sum = function (f) { return C.items.filter(f).reduce(function (a, i) { return a + (+i.ils || 0); }, 0); };
      var KL = (C.key && C.key.lines) || [], kTot = KL.reduce(function (a, l) { return a + (+l.ils || 0); }, 0);
      var inK = function (i) { return i.line !== "extra" && !i.out; };
      var fIn = sum(inK), fAll = sum(function () { return true; });
      var paid = sum(function (i) { return i.st === "paid"; }), field = sum(function (i) { return i.field; });
      var toPay = sum(function (i) { return i.st === "due" || i.st === "pending" || i.st === "missing"; });
      var pct = kTot ? Math.round((fIn / kTot - 1) * 100) : 0;
      var vk = !kTot ? "" : pct > 5 ? "over" : pct < -5 ? "under" : "on";
      var vtx = vk === "over" ? "מעל המפתח ב-" + nis(fIn - kTot) + " (" + pct + "%)" : vk === "under" ? "מתחת למפתח ב-" + nis(kTot - fIn) + " (" + (-pct) + "%)" : vk ? "בתוך המפתח (" + (pct > 0 ? "+" : "") + pct + "%)" : "";
      var ST = { paid: ["שולם", "g"], due: ["משלמים במקום", ""], pending: ["מחכה לאישור חיוב", "w"], missing: ["חסר", "r"], est: ["הערכה לשטח", "s"] };
      var B = [];
      B.push('<div class="tp-cs3"><div><span>שולם</span><b dir="ltr">' + nis(paid) + '</b></div><div><span>עוד לשלם או להזמין</span><b dir="ltr">' + nis(toPay) + '</b></div><div><span>הוצאות בשטח</span><b dir="ltr">' + nis(field) + "</b></div></div>");
      B.push('<div class="tp-cv v-' + vk + '"><div><span>צפוי בסך הכול</span><b dir="ltr">' + nis(fAll) + "</b></div>" + (kTot ? '<div><span>מול המפתח</span><b>' + esc(vtx) + "</b></div>" : "") + "</div>");
      // line by line against the key
      var lines = KL.map(function (l) {
        var f = sum(function (i) { return i.line === l.k && !i.out; }), d = f - (+l.ils || 0);
        return '<details class="tp-cl"><summary><span class="x">' + esc(l.l) + '</span><span class="n" dir="ltr">' + nis(l.ils) + '</span><span class="n" dir="ltr">' + nis(f) + '</span><span class="n d ' + (d > 50 ? "up" : d < -50 ? "dn" : "") + '" dir="ltr">' + (d > 0 ? "+" : d < 0 ? "−" : "") + nis(Math.abs(d)).replace("₪-", "₪") + "</span></summary><p>" + esc(l.f || "") + "</p></details>";
      }).join("");
      var ext = C.items.filter(function (i) { return i.line === "extra" || i.out; });
      B.push('<div class="tp-card tp-ctab"><div class="tp-clh"><span class="x"></span><span class="n">מפתח</span><span class="n">צפוי</span><span class="n">הפרש</span></div>' + lines +
        '<div class="tp-clt"><span class="x">בתוך המפתח</span><span class="n" dir="ltr">' + nis(kTot) + '</span><span class="n" dir="ltr">' + nis(fIn) + '</span><span class="n d ' + (vk === "over" ? "up" : vk === "under" ? "dn" : "") + '" dir="ltr">' + (fIn >= kTot ? "+" : "−") + nis(Math.abs(fIn - kTot)) + "</span></div>" +
        (ext.length ? '<div class="tp-cle"><span class="x">מחוץ למפתח: ' + esc(ext.map(function (i) { return i.l.replace(/ \(.*\)$/, ""); }).join(", ")) + '</span><span class="n" dir="ltr">' + nis(ext.reduce(function (a, i) { return a + (+i.ils || 0); }, 0)) + "</span></div>" : "") +
        (C.key && C.key.alt ? '<div class="tp-cle"><span class="x">' + esc(C.key.alt.h) + ": מפתח " + nis(C.key.alt.ils) + '</span><span class="n" dir="ltr">' + ((fIn - C.key.alt.ils) >= 0 ? "+" : "−") + Math.abs(Math.round((fIn / C.key.alt.ils - 1) * 100)) + "%</span></div>" : "") + "</div>");
      // every component with its state
      B.push('<div class="tp-card tp-cits">' + C.items.map(function (i) {
        var s = ST[i.st] || ST.est, tx = i.tx && i.tx.d ? " · חויב ב-" + dShort(i.tx.d) : "";
        return '<details class="tp-ci"><summary><span class="tp-pill ' + s[1] + '">' + esc(s[0]) + '</span><span class="x">' + esc(i.l) + '</span><span class="n" dir="ltr">' + nis(i.ils) + "</span></summary><p>" + esc((i.s || "") + tx) + "</p></details>";
      }).join("") + "</div>");
      // live: card charges abroad during the trip vs the field budget
      var L = C.live, fr = String(t.from || "");
      if (ph.k === "pre" || !L) {
        B.push('<div class="tp-clive">' + ic("cash", "e") + "<div><b>מעקב תוך כדי הטיול</b><span>מ-" + esc(dShort(fr)) + ", כל חיוב באשראי בחו״ל בימי הטיול נכנס לכאן לבד (פעם בשעה) מול תקציב השטח של " + esc(nis(field)) + ". מה ששולם מראש לא נספר פעמיים.</span></div></div>");
      } else {
        var ndays = Math.max(1, Math.round((ymd(t.to) - ymd(t.from)) / DAY) + 1), dn = ph.k === "trip" ? ph.n : ndays;
        var exp = Math.round(field * dn / ndays), sp = +L.total || 0, ok = sp <= exp;
        var w = field ? Math.min(100, Math.round(sp / field * 100)) : 0, we = field ? Math.min(100, Math.round(exp / field * 100)) : 0;
        var KN = { food: "אוכל", transport: "תחבורה", shopping: "קניות", attractions: "אטרקציות", other: "אחר" };
        B.push('<div class="tp-clive on ' + (ok ? "ok" : "bad") + '"><div class="h"><b>' + (ph.k === "trip" ? "עד עכשיו בטיול" : "בפועל בטיול") + '</b><span dir="ltr">' + nis(sp) + " / " + nis(field) + "</span></div>" +
          '<div class="bar"><i style="width:' + w + '%"></i><u style="inset-inline-start:' + we + '%"></u></div>' +
          "<p>" + esc(ok ? (ph.k === "trip" ? "בתקציב: עד יום " + dn + " צפוי עד " + nis(exp) + "." : "נשארתם בתקציב השטח.") : "מעל הקצב: עד יום " + dn + " צפוי עד " + nis(exp) + ", יצא " + nis(sp) + ".") + "</p>" +
          '<div class="by">' + Object.keys(L.by || {}).map(function (k) { return "<span>" + esc(KN[k] || k) + ' <b dir="ltr">' + nis(L.by[k]) + "</b></span>"; }).join("") + "</div>" +
          ((L.last || []).length ? '<details class="tp-cl"><summary><span class="x">' + L.n + " חיובים, האחרונים</span></summary>" + L.last.map(function (x) { return '<div class="tp-clr"><span>' + esc(dShort(x.d)) + '</span><span class="x" dir="ltr">' + esc(x.m) + '</span><span dir="ltr">' + nis(x.ils) + "</span></div>"; }).join("") + "</details>" : "") +
          '<small>עודכן מהאשראי ' + esc((function () { try { return new Date(L.at).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } })()) + "</small></div>");
      }
      // insights: one line each, tap for the full text
      var cn = Array.isArray(C.notes) ? C.notes : [];
      if (cn.length) B.push('<div class="tp-card tp-cits">' + cn.map(function (n) { return '<details class="tp-ci"><summary>' + ic("bulb") + '<span class="x">' + esc(n.h) + "</span>" + chev() + "</summary><p>" + esc(n.t) + "</p></details>"; }).join("") + "</div>");
      if (C.key) B.push('<p class="tp-csrc">' + esc(C.key.src + ": " + [C.key.region, C.key.season, C.key.style, C.key.pax + " נוסעים", C.key.nights + " לילות"].join(" · ") + (C.fx ? ". שער: $ " + C.fx.USD + ", € " + C.fx.EUR : "")) + "</p>");
      H.push(sx("cash", "עלויות ותקציב", vk ? esc(vk === "over" ? "מעל המפתח" : vk === "under" ? "מתחת למפתח" : "במפתח") : "", B.join(""), false, '<span class="tp-shs" dir="ltr">' + nis(fAll) + "</span>"));
    }

    // ---- getting around ----
    var mv = Array.isArray(t.moves) ? t.moves : [];
    if (mv.length) {
      H.push(sx("train", "איך מתניידים", "", '<div class="tp-grid">' +
        mv.map(function (m) { return '<div class="tp-tile' + (m.open ? " open" : "") + (m.full ? " full" : "") + '"><span class="e">' + em(m.e) + "</span><b>" + esc(m.h) + "</b><span>" + esc(m.s || "") + "</span>" + gml(m) + "</div>"; }).join("") + "</div>"));
    }

    // ---- weather ----
    var wx = Array.isArray(t.weather) ? t.weather : [];
    if (wx.length) {
      H.push(sx("wx", "מזג אוויר", "ממוצע לתאריכים", '<div class="tp-grid">' +
        wx.map(function (w) { return '<div class="tp-tile"><div class="tp-wx"><span class="e">' + esc(w.e || "⛅") + '</span><div><b>' + esc(w.city) + '</b><span class="tmp">' + esc(w.hi) + "°<small> / " + esc(w.lo) + "°</small></span></div></div><span>" + esc(w.s || "") + "</span></div>"; }).join("") + "</div>" +
        (t.wx_tip ? '<div class="tp-tip">🧥 ' + esc(t.wx_tip) + "</div>" : "")));
    }

    // ---- flight analysis per option (a trip still being planned, Oren 21.11.2026) ----
    // options[{e, h, sub, venue, q, miss, verdict, sky, fl:[{tag, l, pp, tot, bag, note, kiwi, out:{a, fn, fr, to, dep, arr, dur, sky}, back:{...}}]}]
    var ops = Array.isArray(t.options) ? t.options : [];
    if (ops.length) {
      var SKY = '<svg class="tp-sky" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21.5c-.6 0-1.1-.3-1.4-.8L8.4 17c-.3-.6-.1-1.4.5-1.7.6-.3 1.4-.1 1.7.5l1.4 2.4 1.4-2.4c.3-.6 1.1-.8 1.7-.5.6.3.8 1.1.5 1.7l-2.2 3.7c-.3.5-.8.8-1.4.8zM5.6 14.6c-.5 0-1-.3-1.2-.8-.3-.6 0-1.4.6-1.7L8.6 10c.6-.3 1.4 0 1.7.6.3.6 0 1.4-.6 1.7l-3.6 2.1c-.2.1-.3.2-.5.2zm12.8 0c-.2 0-.4-.1-.6-.2l-3.6-2.1c-.6-.3-.8-1.1-.5-1.7.3-.6 1.1-.8 1.7-.5l3.6 2.1c.6.3.8 1.1.5 1.7-.2.4-.7.7-1.1.7zM12 10.4c-.7 0-1.3-.6-1.3-1.3V4.2c0-.7.6-1.3 1.3-1.3s1.3.6 1.3 1.3v4.9c0 .7-.6 1.3-1.3 1.3z"/></svg>';
      var skyA = function (u, lbl) { u = url(u || ""); return u ? '<a class="tp-skyl" href="' + esc(u) + '" target="_blank" rel="noopener">' + SKY + '<span dir="ltr">' + esc(lbl || "Skyscanner") + "</span></a>" : ""; };
      var leg = function (k, x) {
        if (!x) return "";
        return '<div class="tp-leg"><span class="k">' + esc(k) + '</span><div class="x"><span class="fn"><b><bdi dir="ltr">' + esc(x.fn || "") + "</bdi></b> · " + esc(x.a || "") + "</span>" +
          '<span class="tm"><bdi dir="ltr">' + esc((x.fr || "") + " " + (x.dep || "") + " → " + (x.to || "") + " " + (x.arr || "")) + "</bdi>" + (x.dur ? " · " + esc(x.dur) : "") + "</span>" +
          (x.d ? '<span class="d">' + esc(x.d) + "</span>" : "") + skyA(x.sky, "Skyscanner") + "</div></div>";
      };
      var fcard = function (f) {
        var kw = url(f.kiwi || "");
        return '<div class="tp-fo t-' + esc(f.tag || "alt") + '"><div class="tp-foh"><span class="tp-pill' + (f.tag === "cheap" ? " g" : f.tag === "elal" ? "" : " w") + '">' + esc(f.l || "") + '</span><span class="pr"><b dir="ltr">$' + esc(f.pp) + '</b> לאדם<small dir="ltr">$' + esc(f.tot) + " ל-5</small></span></div>" +
          leg("הלוך", f.out) + leg("חזור", f.back) +
          '<div class="tp-fof">' + (f.bag ? "<span>" + ic("bag") + esc(f.bag) + "</span>" : "") + (f.note ? "<span>" + esc(f.note) + "</span>" : "") +
          (kw ? '<a class="tp-gl" href="' + esc(kw) + '" target="_blank" rel="noopener"><span dir="ltr">Kiwi.com</span></a>' : "") + "</div></div>";
      };
      H.push(sx(t.options_i || "plane", esc(t.options_h || "ניתוח הטיסות לכל אפשרות"), ops.length + " אפשרויות",
        (t.options_note ? '<div class="tp-tip">' + esc(t.options_note) + "</div>" : "") +
        ops.map(function (op) {
          var lo = (op.fl || []).reduce(function (m, f) { return m == null || +f.pp < m ? +f.pp : m; }, null);
          return '<details class="tp-card tp-plg tp-op"><summary><span class="tp-ope">' + em(op.e || "🎫") + '</span><span class="x"><b>' + esc(op.h) + "</b><span>" + esc(op.sub || "") + "</span></span>" +
            (lo != null ? '<span class="tp-opp" dir="ltr">$' + lo + "</span>" : "") + chev() + '</summary><div class="tp-plb tp-opb">' +
            '<div class="tp-opi">' + (op.venue ? "<span>" + ic("ticket") + esc(op.venue) + "</span>" : "") + (op.miss ? "<span>" + ic("school") + esc(op.miss) + "</span>" : "") + gml(op) + "</div>" +
            (op.fl || []).map(fcard).join("") +
            (op.verdict ? '<p class="tp-opv">' + ic("bulb") + esc(op.verdict) + "</p>" : "") +
            (op.sky ? '<div class="tp-oprt">' + skyA(op.sky, "Skyscanner: הלוך-חזור, ישיר, 5 נוסעים") + "</div>" : "") +
            "</div></details>";
        }).join("")));
    }

    // ---- extra notes (Hanukkah etc.) ----
    var nt = Array.isArray(t.notes) ? t.notes : [];
    if (nt.length) H.push(sx(t.notes_i || "info", esc(t.notes_h || "טוב לדעת"), t.notes_h ? String(nt.length) : "", '<div class="tp-grid">' + nt.map(function (n) { return '<div class="tp-tile full"><span class="e">' + em(n.e) + "</span><b>" + esc(n.h) + "</b><span>" + esc(n.s || "") + "</span>" + gml(n) + "</div>"; }).join("") + "</div>"));

    // ---- our Google Maps list: insights + every place (short line, tap for the full insight) ----
    var mp = t.maps || null, pl = mp && Array.isArray(mp.places) ? mp.places : [];
    if (pl.length) {
      var CAT = [["sight", "לראות"], ["view", "תצפיות"], ["food", "לאכול"], ["coffee", "קפה ומאפים"], ["sweet", "מתוקים"], ["bar", "גגות ובר"], ["shop", "קניות"], ["hotel", "המלונות"]];
      var RK = { must: "חובה", good: "שווה", optional: "אם יש זמן", skip: "אפשר לוותר" };
      var cities = []; pl.forEach(function (x) { if (cities.indexOf(x.city || "") < 0) cities.push(x.city || ""); });
      var row = function (x) {
        var g = url(x.g || ""), rk = RK[x.rank] || RK.good, ck = x.cat || "sight";
        var kv = [["שעות", x.hours], ["הזמנה", x.book], ["הכי כדאי", x.best], ["הליכה", x.walk ? x.walk + " דק׳ מהמלון" : ""]].filter(function (k) { return k[1]; });
        return '<details class="tp-pl r-' + esc(x.rank || "good") + '"><summary><span class="rk" title="' + esc(rk) + '">' + ic(ck) + '</span><span class="x"><b>' + esc(x.he || x.n) + "</b><span>" + esc(x.tip || "") + "</span></span>" + chev() + "</summary>" +
          '<div class="tp-plm">' + (x.full ? "<p>" + esc(x.full) + "</p>" : "") +
          (x.note ? '<p class="nt">💬 ' + esc((x.by === "oren" ? "אורן" : "ליאור") + ": " + x.note) + "</p>" : "") +
          (kv.length ? '<dl class="tp-kv">' + kv.map(function (k) { return "<dt>" + esc(k[0]) + "</dt><dd>" + esc(k[1]) + "</dd>"; }).join("") + "</dl>" : "") +
          '<div class="tp-plf"><span class="tp-pill tp-rk r-' + esc(x.rank || "good") + '">' + (x.rank === "must" ? ic("star") : "") + esc(rk) + "</span>" + gml({ g: g, q: g ? "" : (x.n ? x.n + (x.city_en ? ", " + x.city_en : "") : "") }) + "</div></div></details>";
      };
      var tops = Array.isArray(mp.top) ? mp.top : [];
      var lname = mp.name || "", lurl = url(mp.url || "");
      var lsub = lurl ? '<a class="tp-lnk" href="' + esc(lurl) + '" target="_blank" rel="noopener">' + GMAPS + '<span dir="auto">' + esc(lname || "Google Maps") + "</span></a>" : "";
      var grp = function (k, label, n, body) { return '<details class="tp-card tp-plg"><summary class="tp-insh">' + ic(k) + "<b>" + esc(label) + "</b><i>" + n + "</i>" + chev() + '</summary><div class="tp-plb">' + body + "</div></details>"; };
      H.push(sx("pin", esc(mp.title || "הליסט שלנו"), pl.length + " מקומות",
        (tops.length ? grp("bulb", "תובנות מהליסט", tops.length, tops.map(function (x) {
          return '<details class="tp-pl"><summary><span class="rk">' + ic(x.e || "bulb") + '</span><span class="x"><b>' + esc(x.h) + "</b></span>" + chev() + '</summary><div class="tp-plm"><p>' + esc(x.t || "") + "</p></div></details>";
        }).join("")) : "") +
        '<div class="tp-lg"><span><i class="tp-rkd r-must"></i>חובה</span><span><i class="tp-rkd r-good"></i>שווה</span><span><i class="tp-rkd r-optional"></i>אם יש זמן</span><span><i class="tp-rkd r-skip"></i>אפשר לוותר</span></div>' +
        cities.map(function (c) {
          var mine = pl.filter(function (x) { return (x.city || "") === c; });
          return (cities.length > 1 && c ? '<h3 class="tp-city">' + esc(c) + "</h3>" : "") + CAT.map(function (k) {
            var g = mine.filter(function (x) { return (x.cat || "sight") === k[0]; });
            return g.length ? grp(k[0], k[1], g.length, g.map(row).join("")) : "";
          }).join("");
        }).join("") +
        (lurl ? '<a class="tp-mapsph" href="' + esc(lurl) + '" target="_blank" rel="noopener">' + GMAPS + "<span>" + esc(mp.label || "הרשימה המלאה ב-Google Maps") + "</span></a>" : ""), false, lsub));
    }

    // ---- gallery ----
    var phs = Array.isArray(t.photos) ? t.photos : [];
    if (phs.length || (t.maps && !pl.length)) {
      var mu = t.maps && url(t.maps.url || "");
      H.push(sx("cam", pl.length ? "תמונות" : "המקומות שלנו", "",
        (phs.length ? '<div class="tp-gal">' + phs.map(function (p) { return '<figure><img src="' + esc(img(base, p.img)) + '" alt="" loading="lazy"><figcaption>' + esc(p.cap) + "</figcaption></figure>"; }).join("") + "</div>" : "") +
        (pl.length ? "" : mu ? '<a class="tp-mapsph" href="' + esc(mu) + '" target="_blank" rel="noopener">' + GMAPS + "<span>" + esc(t.maps.label || "הרשימה שלנו ב-Google Maps") + "</span></a>"
          : t.maps ? '<div class="tp-mapsph">' + ic("pin", "e") + "<span>" + esc(t.maps.pending || "רשימת המקומות ב-Google Maps תגיע בקרוב") + "</span></div>" : "")));
    }

    // ---- owner: what's left to plan ----
    // links (owner page only; a planned trip keeps its older planning pages here)
    var lk = (Array.isArray(t.links) ? t.links : []).filter(function (l) { return l && url(l.url || ""); });
    if (own && lk.length) H.push(sx("link", "קישורים", String(lk.length), '<div class="tp-grid">' + lk.map(function (l) { return '<a class="tp-tile full tp-lk" href="' + esc(url(l.url)) + '" target="_blank" rel="noopener"><b>' + esc(l.label || "קישור") + "</b>" + (l.s ? "<span>" + esc(l.s) + "</span>" : "") + "</a>"; }).join("") + "</div>"));
    if (own && Array.isArray(t.gaps) && t.gaps.length) H.push('<section class="tp-sec"><div class="tp-sh"><span class="e">🧩</span><h2>עוד לתכנן</h2><small>רק אצלך</small></div><div class="tp-gaps" data-gaps></div></section>');

    // ---- WhatsApp to the owner (view) ----
    var wa = String(o.wa || "").replace(/\D/g, "");
    if (wa && o.mode !== "edit") {
      var txt = (t.wa_text || ("היי, ראיתי את הדף של הטיול \"" + (t.title || "") + "\" ויש לי המלצה: "));
      H.push('<a class="tp-wa" href="https://wa.me/' + wa + "?text=" + encodeURIComponent(txt) + '" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#fff" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6c-2 0-3.9-.5-5.6-1.5l-.4-.2-3.9 1 1-3.8-.3-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.7 3.7 0 0 0-1.1 2.7 6.4 6.4 0 0 0 1.3 3.4 14.6 14.6 0 0 0 5.6 5c2.1.9 2.9 1 4 .8a3.4 3.4 0 0 0 2.2-1.6 2.8 2.8 0 0 0 .2-1.6c-.1-.2-.3-.2-.6-.4z"/></svg><span>' +
        esc(t.wa_label || "יש לכם המלצה? שלחו לאורן") + "<small>" + esc(t.wa_sub || "מסעדה, מקום, טיפ או תמונה, ישר לוואטסאפ") + "</small></span></a>");
    }
    H.push('<div class="tp-foot">' + esc(t.foot || "נבנה באהבה לטיול הזה") + '<div class="tp-credit">Side Quests</div></div></div>');
    root.innerHTML = H.join("");

    if (dk.length) root.querySelectorAll("[data-dk]").forEach(function (b) { b.onclick = function () { deckOpen(dk.map(function (x) { return { src: img(base, x.img), cap: x.cap || "" }; }), +b.getAttribute("data-dk") || 0, t.deck.h || ""); }; });
    if (own && o.slot) { var sl = root.querySelector('[data-slot="hero"]'); if (sl) o.slot(sl, "hero"); }
    if (own && o.gaps) { var g = root.querySelector("[data-gaps]"); if (g) o.gaps(g); }
  }

  // full-screen viewer: fixed height, close always visible, swipe (scroll-snap) + arrows + keys; the buttons never move
  function deckOpen(sl, at, title) {
    var ov = document.createElement("div"); ov.className = "tp-dkv"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", title);
    ov.innerHTML = '<div class="tp-dkt"><button type="button" class="c" aria-label="סגירה">✕</button><b>' + esc(title) + '</b><span class="i" dir="ltr"></span></div>' +
      '<div class="tp-dks">' + sl.map(function (x) { return '<figure><img src="' + esc(x.src) + '" alt="">' + (x.cap ? "<figcaption>" + esc(x.cap) + "</figcaption>" : "") + "</figure>"; }).join("") + "</div>" +
      '<div class="tp-dkb"><button type="button" class="p" aria-label="הקודם">→</button><span class="d">' + sl.map(function () { return "<i></i>"; }).join("") + '</span><button type="button" class="nx" aria-label="הבא">←</button></div>';
    document.body.appendChild(ov); var keep = document.body.style.overflow; document.body.style.overflow = "hidden";
    var sc = ov.querySelector(".tp-dks"), ind = ov.querySelector(".i"), dots = ov.querySelectorAll(".d i");
    var cur = function () { return Math.round(Math.abs(sc.scrollLeft) / (sc.clientWidth || 1)); };
    var paint = function () { var k = cur(); ind.textContent = (k + 1) + " / " + sl.length; dots.forEach(function (d, j) { d.className = j === k ? "on" : ""; }); };
    var rtl = getComputedStyle(sc).direction === "rtl";
    var go = function (k, now) { k = Math.max(0, Math.min(sl.length - 1, k)); sc.scrollTo({ left: (rtl ? -1 : 1) * k * sc.clientWidth, behavior: now ? "auto" : "smooth" }); };
    var close = function () { document.removeEventListener("keydown", key); document.body.style.overflow = keep; ov.remove(); };
    var key = function (e) { if (e.key === "Escape") close(); else if (e.key === "ArrowLeft") go(cur() + 1); else if (e.key === "ArrowRight") go(cur() - 1); };
    document.addEventListener("keydown", key);
    ov.querySelector(".c").onclick = close; ov.querySelector(".p").onclick = function () { go(cur() - 1); }; ov.querySelector(".nx").onclick = function () { go(cur() + 1); };
    sc.addEventListener("scroll", paint, { passive: true });
    requestAnimationFrame(function () { if (at) go(at, 1); paint(); });
  }

  window.TripView = { render: render, phase: phase, esc: esc };
})();
