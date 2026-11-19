// מיני דשבורד לטיול (19.11.2026). מצייר טיול אחד מתוך אובייקט נתונים.
// משמש גם את הדף הציבורי (trips/index.html, רק תצוגה) וגם את הדף של אורן (side-quests/trip.html, עריכה / תצוגה / שיתוף).
// אין כאן נתונים, הכול מגיע מהמסד. כל טקסט עובר escape.
(function () {
  "use strict";
  var DAY = 864e5;
  var HEB_DOW = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function url(u) { try { var x = new URL(u, location.href); return /^https?:$/.test(x.protocol) ? x.href : ""; } catch (e) { return ""; } }
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
  function t1Box(f, big) {
    return '<div class="tp-t1' + (big ? " big" : "") + '" role="alert"><span class="n">1</span><div><b>טרמינל 1, לא 3!</b><span>' +
      esc((big ? (f.dir ? f.dir + " " : "") + "ב-" + dShort(f.d) + " " + (f.dep || "") + ": " : "") + "ממריאים מטרמינל 1 בנתב״ג. לא לנסוע לטרמינל 3.") + "</span></div></div>";
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

  function chev() { return '<span class="tp-chev" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'; }
  function img(base, k) { return k ? (/^(data:|https?:)/.test(k) ? k : base + k + ".webp") : ""; }

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
    var hero = gfxUrl("hero") || img(base, t.hero_img);
    var cd = ph.k === "pre" ? (ph.n === 1 ? "מחר טסים!" : "עוד " + ph.n + " ימים") : ph.k === "trip" ? "יום " + ph.n + " מתוך " + ph.of : "היה מדהים";
    H.push('<header class="tp-hero">' + (hero ? '<img src="' + esc(hero) + '" alt="">' : "") + (t.snow ? '<div class="tp-snow"></div>' : "") +
      '<div class="in"><div class="tp-flag">' + esc(t.flag || "") + "</div><h1>" + esc(t.title) + '</h1><p class="sub">' + esc(t.tagline || "") + "</p>" +
      '<div class="tp-chips"><span class="tp-chip big">' + esc(cd) + '</span><span class="tp-chip" dir="ltr">' + esc(dShort(t.from) + " – " + dShort(t.to) + "." + String(t.to || "").slice(2, 4)) + "</span>" +
      (t.who ? '<span class="tp-chip">' + esc(t.who) + "</span>" : "") + "</div></div></header>");
    if (own && o.slot) H.push('<div class="w"><div data-slot="hero" style="margin-top:12px"></div></div>');

    H.push('<div class="w">');
    // ---- stats strip ----
    var st = t.stats || [];
    if (st.length) H.push('<div class="tp-stats">' + st.slice(0, 4).map(function (s) { return '<div class="tp-stat"><i>' + esc(s.e) + "</i><b dir=\"ltr\">" + esc(s.v) + "</b><span>" + esc(s.l) + "</span></div>"; }).join("") + "</div>");
    if (t.desc) H.push('<p class="tp-desc">' + esc(t.desc) + "</p>");

    // ---- now / next ----
    var days = Array.isArray(t.days) ? t.days : [];
    var nowBox = "";
    if (ph.k === "trip") {
      var dd = days.filter(function (d) { return d.d === ph.today; })[0], hm = nowHM(t.tz);
      var nx = dd && (dd.items || []).filter(function (it) { return it.t && it.t >= hm; })[0];
      nowBox = '<div class="tp-now"><span class="ic">' + esc(nx ? nx.e || "⭐" : "🌙") + "</span><div><b>" + esc(nx ? "הבא: " + nx.t + " · " + nx.h : (dd ? dd.title : "יום בטיול")) + "</b><span>" + esc(nx ? nx.s || "" : "תהנו מהערב") + "</span></div></div>";
    } else if (ph.k === "pre" && t.next_up) {
      nowBox = '<div class="tp-now"><span class="ic">' + esc(t.next_up.e || "🧳") + "</span><div><b>" + esc(t.next_up.h) + "</b><span>" + esc(t.next_up.s || "") + "</span></div></div>";
    }
    H.push(nowBox);

    // ---- TLV terminal 1 warning (permanent rule: T1 must never be missed) ----
    var t1f = (Array.isArray(t.flights) ? t.flights : []).filter(function (f) { return isT1(f.from) && (!ph.today || f.d >= ph.today); })[0];
    if (t1f && ph.k !== "post") H.push(t1Box(t1f, true));

    // ---- map ----
    if (t.map) {
      H.push('<section class="tp-sec"><div class="tp-sh"><span class="e">🗺️</span><h2>המסלול</h2><small>' + esc(t.map.note || "") + '</small></div><div class="tp-card tp-map">' + mapSvg(t.map) +
        '<div class="tp-legend"><span style="color:var(--c1)"><u style="border-top-style:dashed"></u>טיסה</span><span style="color:var(--c2)"><u></u>רכבת</span>' + (t.map.legend || []).map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") + "</div></div></section>");
    }

    // ---- days ----
    if (days.length) {
      H.push('<section class="tp-sec"><div class="tp-sh"><span class="e">📅</span><h2>יום אחרי יום</h2><small>לחיצה פותחת</small></div><div class="tp-days">' +
        days.map(function (d, i) {
          var isT = ph.k === "trip" && d.d === ph.today, hm = isT ? nowHM(t.tz) : "", nextDone = false;
          return '<details class="tp-day' + (isT ? " today" : "") + '"' + (isT || (ph.k === "pre" && i === 0 && o.openFirst) ? " open" : "") + "><summary>" +
            '<div class="tp-dimg">' + (d.img ? '<img src="' + esc(img(base, d.img)) + '" alt="" loading="lazy">' : "") + '<span class="tp-dnum">יום ' + (i + 1) + "</span></div>" +
            '<div class="tp-dt"><small>' + esc((isT ? "היום · " : "") + "יום " + dowOf(d.d) + " " + dShort(d.d) + (d.city ? " · " + d.city : "")) + "</small><b>" + esc(d.title) + "</b>" + (d.sub ? "<span>" + esc(d.sub) + "</span>" : "") + "</div>" + chev() + "</summary>" +
            '<ul class="tp-tl">' + (d.items || []).map(function (it) {
              var nx = isT && !nextDone && it.t && it.t >= hm; if (nx) nextDone = true;
              return '<li class="' + (it.open ? "open " : "") + (nx ? "next" : "") + '"><span class="t">' + esc(it.t || "") + '</span><span class="e">' + esc(it.e || "•") + '</span><span class="x"><b>' + esc(it.h) + "</b>" + (it.s ? "<span>" + esc(it.s) + "</span>" : "") + "</span></li>";
            }).join("") + "</ul></details>";
        }).join("") + "</div></section>");
    }

    // ---- flights ----
    var fl = Array.isArray(t.flights) ? t.flights : [];
    if (fl.length) {
      var plane = '<svg viewBox="0 0 84 26" aria-hidden="true"><path d="M4 18 Q42 -2 80 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 4"/><g transform="translate(42 8)">' + PLANE + "</g></svg>";
      H.push('<section class="tp-sec"><div class="tp-sh"><span class="e">✈️</span><h2>טיסות</h2><small>לחיצה לפרטים</small></div>' +
        fl.map(function (f) {
          var A = f.from || {}, B = f.to || {};
          return '<details class="tp-bp"><summary><div class="tp-bph"><span>' + esc(f.dir || "") + " · יום " + esc(dowOf(f.d)) + " " + esc(dShort(f.d)) + '</span><span dir="ltr">' + esc((f.air || "") + " " + (f.no || "")) + "</span></div>" +
            (isT1(A) ? t1Box(f, false) : "") +
            '<div class="tp-bpm"><div class="tp-ap"><b>' + esc(A.c) + "</b><span>" + esc(A.n) + "</span><i>" + esc(f.dep) + '</i></div><div class="tp-fly">' + plane + esc(f.dur || "") + '</div><div class="tp-ap r"><b>' + esc(B.c) + "</b><span>" + esc(B.n) + "</span><i>" + esc(f.arr) + "</i></div></div>" +
            '<div class="tp-bpf"><span>טרמינל <b>' + esc(A.t || "?") + "</b> ← <b>" + esc(B.t || "?") + "</b></span>" + (f.seats ? "<span>מושבים <b dir=\"ltr\">" + esc(f.seats) + "</b></span>" : "") + "</div>" +
            '<span class="tp-tap">▾ פרטים</span></summary><div class="tear"></div><div class="tp-more"><dl class="tp-kv">' +
            (f.kv || []).map(function (x) { return "<dt>" + esc(x[0]) + "</dt><dd>" + esc(x[1]) + "</dd>"; }).join("") + "</dl></div></details>";
        }).join("") + "</section>");
    }

    // ---- hotels ----
    var ho = Array.isArray(t.hotels) ? t.hotels : [];
    if (ho.length) {
      H.push('<section class="tp-sec"><div class="tp-sh"><span class="e">🏨</span><h2>איפה ישנים</h2><small>' + esc(t.nights_l || "") + "</small></div>" +
        ho.map(function (x) {
          var mu = url(x.maps || "");
          return '<details class="tp-hotel"><summary><div class="tp-himg">' + (x.img ? '<img src="' + esc(img(base, x.img)) + '" alt="" loading="lazy">' : "") + '<span class="tp-hn">' + esc(x.city || "") + " · " + esc(x.nights_l || "") + "</span></div>" +
            '<div class="tp-hb"><b>' + esc(x.name) + "</b><span>" + esc(x.area || x.addr || "") + "</span></div>" +
            '<div class="tp-hrow"><span class="tp-pill" dir="rtl">📅 ' + esc(dShort(x.in) + " ← " + dShort(x.out)) + "</span>" + (x.pills || []).map(function (p) { return '<span class="tp-pill ' + esc(p.c || "") + '">' + esc(p.t) + "</span>"; }).join("") + "</div>" +
            '<span class="tp-tap">▾ פרטים</span></summary><div class="tp-more"><dl class="tp-kv">' + (x.kv || []).map(function (k) { return "<dt>" + esc(k[0]) + "</dt><dd>" + esc(k[1]) + "</dd>"; }).join("") + "</dl>" +
            (mu ? '<a class="tp-mapsph" style="margin-top:10px" href="' + esc(mu) + '" target="_blank" rel="noopener"><span class="e">📍</span>פתיחה בגוגל מפס</a>' : "") + "</div></details>";
        }).join("") + "</section>");
    }

    // ---- getting around ----
    var mv = Array.isArray(t.moves) ? t.moves : [];
    if (mv.length) {
      H.push('<section class="tp-sec"><div class="tp-sh"><span class="e">🚆</span><h2>איך מתניידים</h2></div><div class="tp-grid">' +
        mv.map(function (m) { return '<div class="tp-tile' + (m.open ? " open" : "") + (m.full ? " full" : "") + '"><span class="e">' + esc(m.e) + "</span><b>" + esc(m.h) + "</b><span>" + esc(m.s || "") + "</span></div>"; }).join("") + "</div></section>");
    }

    // ---- weather ----
    var wx = Array.isArray(t.weather) ? t.weather : [];
    if (wx.length) {
      H.push('<section class="tp-sec"><div class="tp-sh"><span class="e">🌦️</span><h2>מזג אוויר</h2><small>ממוצע לתאריכים</small></div><div class="tp-grid">' +
        wx.map(function (w) { return '<div class="tp-tile"><div class="tp-wx"><span class="e">' + esc(w.e || "⛅") + '</span><div><b>' + esc(w.city) + '</b><span class="tmp">' + esc(w.hi) + "°<small> / " + esc(w.lo) + "°</small></span></div></div><span>" + esc(w.s || "") + "</span></div>"; }).join("") + "</div>" +
        (t.wx_tip ? '<div class="tp-tip">🧥 ' + esc(t.wx_tip) + "</div>" : "") + "</section>");
    }

    // ---- extra notes (Hanukkah etc.) ----
    var nt = Array.isArray(t.notes) ? t.notes : [];
    if (nt.length) H.push('<section class="tp-sec"><div class="tp-grid">' + nt.map(function (n) { return '<div class="tp-tile full"><span class="e">' + esc(n.e) + "</span><b>" + esc(n.h) + "</b><span>" + esc(n.s || "") + "</span></div>"; }).join("") + "</div></section>");

    // ---- our Google Maps list: insights + every place (short line, tap for the full insight) ----
    var mp = t.maps || null, pl = mp && Array.isArray(mp.places) ? mp.places : [];
    if (pl.length) {
      var CAT = [["sight", "🏛️", "לראות"], ["view", "🌅", "תצפיות"], ["food", "🍝", "לאכול"], ["coffee", "☕", "קפה ומאפים"], ["sweet", "🍦", "מתוקים"], ["bar", "🍸", "גגות ובר"], ["shop", "🛍️", "קניות"], ["hotel", "🏨", "המלונות"]];
      var RK = { must: ["★", "חובה"], good: ["●", "שווה"], optional: ["○", "אם יש זמן"], skip: ["–", "אפשר לוותר"] };
      var cities = []; pl.forEach(function (x) { if (cities.indexOf(x.city || "") < 0) cities.push(x.city || ""); });
      var row = function (x) {
        var g = url(x.g || ""), rk = RK[x.rank] || RK.good;
        var kv = [["שעות", x.hours], ["הזמנה", x.book], ["הכי כדאי", x.best], ["הליכה", x.walk ? x.walk + " דק׳ מהמלון" : ""]].filter(function (k) { return k[1]; });
        return '<details class="tp-pl r-' + esc(x.rank || "good") + '"><summary><span class="rk" title="' + esc(rk[1]) + '">' + rk[0] + '</span><span class="x"><b>' + esc(x.he || x.n) + "</b><span>" + esc(x.tip || "") + "</span></span>" + chev() + "</summary>" +
          '<div class="tp-plm">' + (x.full ? "<p>" + esc(x.full) + "</p>" : "") +
          (x.note ? '<p class="nt">💬 ' + esc((x.by === "oren" ? "אורן" : "ליאור") + ": " + x.note) + "</p>" : "") +
          (kv.length ? '<dl class="tp-kv">' + kv.map(function (k) { return "<dt>" + esc(k[0]) + "</dt><dd>" + esc(k[1]) + "</dd>"; }).join("") + "</dl>" : "") +
          '<div class="tp-plf"><span class="tp-pill">' + esc(rk[0] + " " + rk[1]) + "</span>" + (g ? '<a href="' + esc(g) + '" target="_blank" rel="noopener">📍 במפות</a>' : "") + "</div></div></details>";
      };
      var tops = Array.isArray(mp.top) ? mp.top : [];
      H.push('<section class="tp-sec"><div class="tp-sh"><span class="e">📍</span><h2>' + esc(mp.title || "הליסט שלנו") + "</h2><small>" + pl.length + " מקומות · לחיצה לפירוט</small></div>" +
        (tops.length ? '<div class="tp-card tp-ins"><div class="tp-insh">💡 תובנות מהליסט</div>' + tops.map(function (x) {
          return '<details class="tp-pl"><summary><span class="rk">' + esc(x.e || "•") + '</span><span class="x"><b>' + esc(x.h) + "</b></span>" + chev() + '</summary><div class="tp-plm"><p>' + esc(x.t || "") + "</p></div></details>";
        }).join("") + "</div>" : "") +
        '<div class="tp-lg"><span>★ חובה</span><span>● שווה</span><span>○ אם יש זמן</span><span>– אפשר לוותר</span></div>' +
        cities.map(function (c) {
          var mine = pl.filter(function (x) { return (x.city || "") === c; });
          return (cities.length > 1 && c ? '<h3 class="tp-city">' + esc(c) + "</h3>" : "") + CAT.map(function (k) {
            var g = mine.filter(function (x) { return (x.cat || "sight") === k[0]; });
            return g.length ? '<div class="tp-card tp-plg"><div class="tp-insh">' + k[1] + " " + esc(k[2]) + " <i>" + g.length + "</i></div>" + g.map(row).join("") + "</div>" : "";
          }).join("");
        }).join("") +
        (url(mp.url || "") ? '<a class="tp-mapsph" href="' + esc(url(mp.url)) + '" target="_blank" rel="noopener"><span class="e">🗺️</span><span>' + esc(mp.label || "הרשימה המלאה בגוגל מפס") + "</span></a>" : "") + "</section>");
    }

    // ---- gallery ----
    var phs = Array.isArray(t.photos) ? t.photos : [];
    if (phs.length || (t.maps && !pl.length)) {
      var mu = t.maps && url(t.maps.url || "");
      H.push('<section class="tp-sec"><div class="tp-sh"><span class="e">📸</span><h2>' + (pl.length ? "תמונות" : "המקומות שלנו") + "</h2></div>" +
        (phs.length ? '<div class="tp-gal">' + phs.map(function (p) { return '<figure><img src="' + esc(img(base, p.img)) + '" alt="" loading="lazy"><figcaption>' + esc(p.cap) + "</figcaption></figure>"; }).join("") + "</div>" : "") +
        (pl.length ? "" : mu ? '<a class="tp-mapsph" href="' + esc(mu) + '" target="_blank" rel="noopener"><span class="e">📍</span><span>' + esc(t.maps.label || "הרשימה שלנו בגוגל מפס") + "</span></a>"
          : t.maps ? '<div class="tp-mapsph"><span class="e">📍</span><span>' + esc(t.maps.pending || "רשימת המקומות בגוגל מפס תגיע בקרוב") + "</span></div>" : "") + "</section>");
    }

    // ---- owner: what's left to plan ----
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

    if (own && o.slot) { var sl = root.querySelector('[data-slot="hero"]'); if (sl) o.slot(sl, "hero"); }
    if (own && o.gaps) { var g = root.querySelector("[data-gaps]"); if (g) o.gaps(g); }
  }

  window.TripView = { render: render, phase: phase, esc: esc };
})();
