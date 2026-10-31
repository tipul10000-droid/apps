/* מעקב התקדמות – אפליקציית שקילות לקבוצות של פרידה */
(function () {
  "use strict";

  var CFG = window.FRIDA_CONFIG;
  var DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  var LS_TOKEN = "frida_token", LS_ADMIN = "frida_admin", LS_VIEW = "frida_view";
  var app = document.getElementById("app");

  var S = {
    token: lsGet(LS_TOKEN),
    admin: lsGet(LS_ADMIN) === "1",
    date: today(),
    ov: null,          // admin_overview לתאריך S.date
    groupSel: null,    // קבוצה נבחרת במסך "היום"
    clientsFilter: "all",
    clientsView: lsGet(LS_VIEW) || "list",
    search: ""
  };

  // ---------- כלים ----------
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  function h(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return iso(new Date()); }
  function parseD(s) { var p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parseD(s); d.setDate(d.getDate() + n); return iso(d); }
  function addMonths(s, n) { var d = parseD(s); d.setMonth(d.getMonth() + n); return iso(d); }
  function fmtD(s) { if (!s) return ""; var d = parseD(s); return d.getDate() + "." + (d.getMonth() + 1) + "." + String(d.getFullYear()).slice(2); }
  function fmtDLong(s) { var d = parseD(s); return "יום " + DAYS[d.getDay()] + ", " + d.getDate() + "." + (d.getMonth() + 1); }
  function daysBetween(a, b) { return Math.round((parseD(b) - parseD(a)) / 864e5); }
  function num(v) { return v == null || v === "" ? null : Number(v); }
  function kg(v) { return v == null ? "–" : (Math.round(v * 10) / 10).toFixed(1); }
  function signed(v) { if (v == null) return ""; var r = Math.round(v * 10) / 10; return (r > 0 ? "+" : r < 0 ? "−" : "") + Math.abs(r).toFixed(1); }
  function deltaHtml(v) { if (v == null) return ""; var cls = v < -0.05 ? "down" : v > 0.05 ? "up" : ""; return '<span class="delta ' + cls + '">' + signed(v) + "</span>"; }
  function initials(n) { var p = String(n || "").trim().split(/\s+/); return h((p[0] || "")[0] || "") + h(p.length > 1 ? (p[p.length - 1][0] || "") : ""); }
  function groupLabel(g) { return g ? "יום " + DAYS[g.weekday] + " " + String(g.start_time).slice(0, 5) + " · " + g.city : "בלי קבוצה"; }
  function groupById(id) { return S.ov && S.ov.groups.find(function (g) { return g.id === id; }); }
  function phoneFmt(p) { return p && p.length === 10 ? p.slice(0, 3) + "-" + p.slice(3, 6) + "-" + p.slice(6) : (p || ""); }

  var toastT;
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  // ---------- API ----------
  var ERR = {
    not_authenticated: "צריך להתחבר מחדש",
    forbidden: "אין הרשאה",
    bad_phone: "מספר הטלפון לא תקין (10 ספרות, מתחיל ב-05)",
    bad_pin: "הקוד צריך להיות 3 ספרות",
    bad_name: "חסר שם",
    phone_exists: "כבר קיים לקוח עם הטלפון הזה",
    bad_input: "צריך טלפון ו-3 ספרות"
  };
  function api(fn, args) {
    return fetch(CFG.supabaseUrl + "/rest/v1/rpc/" + fn, {
      method: "POST",
      headers: { apikey: CFG.supabaseKey, Authorization: "Bearer " + CFG.supabaseKey, "Content-Type": "application/json" },
      body: JSON.stringify(args || {})
    }).then(function (r) {
      return r.text().then(function (txt) {
        var data = txt ? JSON.parse(txt) : null;
        if (!r.ok) {
          var code = data && data.message;
          if (code === "not_authenticated") { logout(true); }
          var e = new Error(ERR[code] || "שגיאה בשמירה. נסו שוב.");
          e.code = code; throw e;
        }
        return data;
      });
    }, function () { throw new Error("אין חיבור לאינטרנט"); });
  }
  function adminApi(fn, args) { args = args || {}; args.p_token = S.token; return api(fn, args); }

  function loadOverview() {
    return adminApi("frida_admin_overview", { p_date: S.date }).then(function (ov) { S.ov = ov; return ov; });
  }

  function logout(silent) {
    if (S.token && !silent) api("frida_logout", { p_token: S.token }).catch(function () {});
    S.token = null; S.admin = false; S.ov = null;
    lsSet(LS_TOKEN, null); lsSet(LS_ADMIN, null);
    location.hash = "";
    render();
  }

  // ---------- סטטיסטיקה ----------
  function stats(client, visits) {
    var pts = [];
    if (client.start_weight != null) pts.push({ d: client.opened_at, w: num(client.start_weight), start: true });
    visits.forEach(function (v) { if (v.weight != null) pts.push({ d: v.visit_date, w: num(v.weight), id: v.id }); });
    pts.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : (a.start ? -1 : 1); });
    var st = { pts: pts, visits: visits.length };
    if (!pts.length) return st;
    var first = pts[0], last = pts[pts.length - 1];
    st.start = first.w; st.current = last.w; st.total = last.w - first.w;
    st.pct = first.w ? st.total / first.w * 100 : 0;
    st.lastChange = pts.length > 1 ? last.w - pts[pts.length - 2].w : null;
    st.min = Math.min.apply(null, pts.map(function (p) { return p.w; }));
    var days = daysBetween(first.d, last.d);
    st.weeks = days / 7;
    st.perWeek = days >= 7 ? st.total / st.weeks : null;
    if (client.goal_weight != null) {
      var g = num(client.goal_weight);
      st.goal = g; st.toGoal = last.w - g;
      var span = first.w - g;
      st.goalPct = span > 0 ? Math.max(0, Math.min(100, (first.w - last.w) / span * 100)) : null;
    }
    // רצף שבועות עם הגעה (אחורה מהמפגש האחרון)
    var weeks = {};
    visits.forEach(function (v) { weeks[Math.floor(daysBetween("2020-01-05", v.visit_date) / 7)] = 1; });
    var keys = Object.keys(weeks).map(Number).sort(function (a, b) { return b - a; });
    var streak = 0;
    for (var i = 0; i < keys.length; i++) { if (i === 0 || keys[i - 1] - keys[i] === 1) streak++; else break; }
    st.streak = streak;
    return st;
  }

  function activeCard(cards) {
    var t = today();
    var c = cards.filter(function (k) { return k.expires_at >= t && k.used < k.sessions_total; })
      .sort(function (a, b) { return a.expires_at < b.expires_at ? -1 : 1; })[0];
    return c || cards[0] || null;
  }

  function cardTag(card) {
    if (!card) return '<span class="tag warn">אין כרטיסייה</span>';
    var left = card.sessions_total - card.used;
    var t = today();
    if (card.expires_at < t) return '<span class="tag bad">פג תוקף</span>';
    if (left <= 0) return '<span class="tag bad">נגמרו המפגשים</span>';
    var soon = daysBetween(t, card.expires_at) <= 14;
    if (left <= 2 || soon) return '<span class="tag warn">נשארו ' + left + (soon ? " · עד " + fmtD(card.expires_at) : "") + "</span>";
    return '<span class="tag">נשארו ' + left + "</span>";
  }

  // ---------- גרף ----------
  function chartSvg(st) {
    var pts = st.pts;
    if (pts.length < 2) return '<div class="empty">הגרף יופיע אחרי השקילה הבאה</div>';
    var W = 340, H = 190, L = 34, R = 10, T = 12, B = 26;
    var ws = pts.map(function (p) { return p.w; });
    if (st.goal != null) ws.push(st.goal);
    var lo = Math.floor(Math.min.apply(null, ws) - 0.5), hi = Math.ceil(Math.max.apply(null, ws) + 0.5);
    var step = Math.max(1, Math.ceil((hi - lo) / 4));
    lo = Math.floor(lo / step) * step; hi = lo + step * Math.max(2, Math.ceil((hi - lo) / step));
    var d0 = parseD(pts[0].d), span = Math.max(1, (parseD(pts[pts.length - 1].d) - d0));
    // ציר הזמן משמאל לימין, כמו בגרפים מוכרים: ירידה במשקל נראית כקו יורד
    function x(p) { return L + ((parseD(p.d) - d0) / span) * (W - L - R); }
    function y(w) { return T + (hi - w) / (hi - lo) * (H - T - B); }
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="גרף משקל לאורך זמן">';
    for (var v = lo; v <= hi + 0.001; v += step) {
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="#e6e5ef" stroke-width="1"/>';
      s += '<text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" font-size="11" fill="#8a7e83" text-anchor="end" direction="ltr">' + v + "</text>";
    }
    if (st.goal != null) {
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(st.goal) + '" y2="' + y(st.goal) + '" stroke="#9aa514" stroke-width="1.5" stroke-dasharray="5 4"/>';
      s += '<text x="' + (W - R) + '" y="' + (y(st.goal) - 5) + '" font-size="11" fill="#6f7710" text-anchor="start">יעד ' + kg(st.goal) + "</text>";
    }
    var line = pts.map(function (p) { return x(p).toFixed(1) + "," + y(p.w).toFixed(1); }).join(" ");
    var area = x(pts[0]).toFixed(1) + "," + (H - B) + " " + line + " " + x(pts[pts.length - 1]).toFixed(1) + "," + (H - B);
    s += '<polygon points="' + area + '" fill="#dcdff0" opacity=".55"/>';
    s += '<polyline points="' + line + '" fill="none" stroke="#5e5257" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    pts.forEach(function (p, i) {
      s += '<circle cx="' + x(p) + '" cy="' + y(p.w) + '" r="4.5" fill="#d93a4b" stroke="#fff" stroke-width="2" data-i="' + i + '"/>';
    });
    s += '<text x="' + L + '" y="' + (H - 6) + '" font-size="11" fill="#8a7e83" text-anchor="end">' + fmtD(pts[0].d) + "</text>";
    s += '<text x="' + (W - R) + '" y="' + (H - 6) + '" font-size="11" fill="#8a7e83" text-anchor="start">' + fmtD(pts[pts.length - 1].d) + "</text>";
    s += '<rect x="' + L + '" y="0" width="' + (W - L - R) + '" height="' + H + '" fill="transparent" class="hit"/>';
    return '<div class="chart" data-pts=\'' + h(JSON.stringify(pts.map(function (p) { return [x(p), y(p.w), p.d, p.w]; }))) + '\' data-w="' + W + '">' + s + '</svg><div class="tip"></div></div>';
  }

  function bindChart(root) {
    root.querySelectorAll(".chart").forEach(function (el) {
      var pts = JSON.parse(el.getAttribute("data-pts")), W = +el.getAttribute("data-w");
      var tip = el.querySelector(".tip"), svg = el.querySelector("svg");
      function show(ev) {
        var r = svg.getBoundingClientRect(), sc = r.width / W;
        var cx = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left) / sc;
        var best = pts.reduce(function (a, p) { return Math.abs(p[0] - cx) < Math.abs(a[0] - cx) ? p : a; });
        tip.style.display = "block";
        tip.style.left = best[0] * sc + "px"; tip.style.top = best[1] * sc + "px";
        tip.textContent = fmtD(best[2]) + " · " + kg(best[3]) + ' ק"ג';
      }
      svg.addEventListener("pointermove", show);
      svg.addEventListener("pointerdown", show);
      svg.addEventListener("pointerleave", function () { tip.style.display = "none"; });
    });
  }

  // ---------- תצוגת התקדמות (משותפת ללקוח ולמנהלת) ----------
  function progressHtml(data, forAdmin) {
    var c = data.client, st = stats(c, data.visits), card = activeCard(data.cards);
    var out = "";
    if (st.pts.length < 2) {
      out += '<div class="card hero">' + (st.current != null ? '<div class="big">' + kg(st.current) + ' <small>ק"ג</small></div><div class="lbl">משקל התחלה</div>' : "") +
        '<div class="sub" style="margin-top:6px">' + (forAdmin ? "ההתקדמות תופיע אחרי השקילה הבאה" : "ההתקדמות שלך תופיע כאן אחרי השקילה הבאה. בהצלחה!") + "</div></div>";
    } else {
      var lost = -st.total;
      var big = Math.abs(st.total) < 0.05 ? "0.0" : kg(Math.abs(st.total));
      var verb = lost > 0.05 ? (forAdmin ? "ירידה כוללת" : "ירדת עד עכשיו") : lost < -0.05 ? (forAdmin ? "עלייה כוללת" : "עלית מאז ההתחלה") : "יציבות מאז ההתחלה";
      out += '<div class="card hero"><div class="big">' + big + ' <small>ק"ג</small></div><div class="lbl">' + verb + "</div>";
      if (st.pts.length > 1) out += '<div class="sub" style="margin-top:4px">' + Math.abs(st.pct).toFixed(1) + "% ממשקל ההתחלה · מאז " + fmtD(st.pts[0].d) + "</div>";
      out += "</div>";

      out += '<div class="card"><h2>' + (forAdmin ? "משקל לאורך זמן" : "המשקל שלי לאורך זמן") + "</h2>" + chartSvg(st) + "</div>";

      out += '<div class="tiles">';
      out += tile(kg(st.current), 'משקל נוכחי (ק"ג)');
      out += tile(st.lastChange == null ? "–" : signed(st.lastChange), "שינוי מהשקילה הקודמת");
      out += tile(kg(st.start), "משקל התחלה");
      out += tile(kg(st.min), "המשקל הנמוך ביותר");
      if (st.perWeek != null) out += tile(signed(st.perWeek), 'קצב ממוצע לשבוע (ק"ג)');
      out += tile(st.streak + (st.streak === 1 ? " שבוע" : " שבועות"), "רצף הגעה");
      out += tile(String(st.visits), "מפגשים עד היום");
      out += "</div>";

      if (st.goal != null) {
        out += '<div class="card"><div class="row between"><h2 style="margin:0">היעד: ' + kg(st.goal) + ' ק"ג</h2><span class="sub">' +
          (st.toGoal > 0 ? "נשארו " + kg(st.toGoal) + ' ק"ג' : "הגעת ליעד! 🎉") + "</span></div>" +
          (st.goalPct != null ? '<div class="bar" style="margin-top:12px"><i style="width:' + st.goalPct.toFixed(0) + '%"></i></div>' : "") + "</div>";
      }

      var ms = milestones(st);
      if (ms.length) {
        out += '<div class="card"><h2>הישגים</h2><div class="badges">' + ms.map(function (m) {
          return '<span class="badge' + (m.on ? "" : " off") + '">' + (m.on ? "🏅 " : "") + h(m.t) + "</span>";
        }).join("") + "</div></div>";
      }
    }

    out += cardHtml(card, forAdmin);
    return out;
  }
  function tile(v, k) { return '<div class="tile"><div class="v' + (/^[\d.+\u2212\u2013-]+$/.test(v) ? " n" : "") + '">' + h(v) + '</div><div class="k">' + h(k) + "</div></div>"; }

  function milestones(st) {
    if (st.start == null) return [];
    var lost = -st.total, pct = -st.pct, list = [];
    list.push({ t: 'ק"ג ראשון', on: lost >= 1 });
    list.push({ t: "5% מהמשקל", on: pct >= 5 });
    var top = Math.max(5, Math.ceil((lost + 0.01) / 5) * 5);
    for (var k = 5; k <= top && k <= 50; k += 5) list.push({ t: k + ' ק"ג', on: lost >= k });
    list.push({ t: "10% מהמשקל", on: pct >= 10 });
    list.push({ t: "4 שבועות ברצף", on: st.streak >= 4 });
    return list;
  }

  function cardHtml(card, forAdmin) {
    if (!card) return forAdmin ? "" : '<div class="card"><h2>הכרטיסייה שלי</h2><div class="sub">אין כרטיסייה פעילה</div></div>';
    var left = card.sessions_total - card.used, dots = "";
    for (var i = 0; i < card.sessions_total; i++) dots += '<i class="' + (i < card.used ? "used" : "") + '"></i>';
    var expired = card.expires_at < today();
    return '<div class="card"><div class="row between"><h2 style="margin:0">' + (forAdmin ? "כרטיסייה פעילה" : "הכרטיסייה שלי") + "</h2>" + cardTag(card) + "</div>" +
      '<div class="sub" style="margin-top:6px">' + card.used + " מתוך " + card.sessions_total + " מפגשים נוצלו · " + (expired ? "פג תוקף ב-" : "בתוקף עד ") + fmtD(card.expires_at) + "</div>" +
      '<div class="dots">' + dots + "</div></div>";
  }

  function historyHtml(data, forAdmin) {
    var v = data.visits.slice().reverse();
    if (!v.length) return "";
    var prevMap = {}, last = data.client.start_weight != null ? num(data.client.start_weight) : null;
    data.visits.forEach(function (x) { if (x.weight != null) { prevMap[x.id] = last == null ? null : num(x.weight) - last; last = num(x.weight); } });
    var rows = v.map(function (x) {
      return "<tr><td>" + fmtD(x.visit_date) + '</td><td class="num">' + (x.weight == null ? "–" : kg(x.weight)) + '</td><td class="num">' + deltaHtml(prevMap[x.id]) + "</td>" +
        (forAdmin ? '<td><button class="btn plain small" data-del-visit="' + x.id + '" aria-label="מחיקה">✕</button></td>' : "") + "</tr>";
    }).join("");
    return '<div class="section-title">היסטוריית שקילות</div><div class="tablewrap"><table class="t"><thead><tr><th>תאריך</th><th class="num">משקל</th><th class="num">שינוי</th>' + (forAdmin ? "<th></th>" : "") + "</tr></thead><tbody>" + rows + "</tbody></table></div>";
  }

  // ---------- מסכים ----------
  function viewLogin() {
    app.innerHTML =
      '<form class="login" id="lf" autocomplete="on">' +
      '<img class="logo" src="logo.png" alt="פרידה גבעון · תחושות בטן">' +
      "<h1>מעקב ההתקדמות שלי</h1><p>כניסה עם הטלפון ו-3 הספרות האחרונות של ת״ז</p>" +
      '<label class="f"><span>מספר טלפון</span><input class="in" id="ph" type="tel" inputmode="numeric" autocomplete="username" placeholder="050-0000000" required></label>' +
      '<label class="f"><span>3 ספרות אחרונות של תעודת הזהות</span><input class="in pin" id="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="current-password" required></label>' +
      '<div class="err" id="le"></div>' +
      '<button class="btn block" id="lb">כניסה</button></form>';
    var f = document.getElementById("lf");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = document.getElementById("lb"), err = document.getElementById("le");
      var ph = document.getElementById("ph").value, pin = document.getElementById("pin").value;
      var pl = pin.replace(/\D/g, "").length; if (pl < 1 || pl > 3) { err.textContent = "צריך 3 ספרות"; return; }
      btn.disabled = true; err.textContent = "";
      api("frida_login", { p_phone: ph, p_pin: pin }).then(function (r) {
        btn.disabled = false;
        if (!r.ok) {
          if (r.error === "locked") {
            var u = new Date(r.until);
            err.textContent = "יותר מדי ניסיונות. אפשר לנסות שוב ב-" + pad(u.getHours()) + ":" + pad(u.getMinutes());
          } else err.textContent = "הטלפון או הקוד לא נכונים";
          return;
        }
        S.token = r.token; S.admin = !!r.is_admin;
        lsSet(LS_TOKEN, r.token); lsSet(LS_ADMIN, S.admin ? "1" : "0");
        location.hash = S.admin ? "#/today" : "#/me";
        render();
      }).catch(function (e2) { btn.disabled = false; err.textContent = e2.message; });
    });
  }

  function shell(title, body, opts) {
    opts = opts || {};
    var nav = "";
    if (S.admin) {
      var r = location.hash;
      nav = '<nav class="nav">' +
        navA("#/today", "⚖️", "שקילה", /^#\/today/.test(r) || r === "") +
        navA("#/clients", "👥", "לקוחות", /^#\/client/.test(r)) +
        navA("#/groups", "📅", "קבוצות", /^#\/group/.test(r)) + "</nav>";
    }
    app.innerHTML = '<div class="wrap"><div class="topbar">' +
      (opts.back ? '<button class="back" data-back aria-label="חזרה">→</button>' : "") +
      (opts.back ? "" : '<img class="mark" src="mark.png" alt="">') + "<h1>" + h(title) + "</h1>" + (opts.right || "") + "</div>" + body + "</div>" + nav + (opts.fab || "");
    var b = app.querySelector("[data-back]");
    if (b) b.addEventListener("click", function () { history.length > 1 ? history.back() : (location.hash = opts.back); });
    var lo = app.querySelector("[data-logout]");
    if (lo) lo.addEventListener("click", function () { if (confirm("להתנתק?")) logout(); });
  }
  function navA(href, i, t, on) { return '<a href="' + href + '" class="' + (on ? "on" : "") + '"><span class="i">' + i + "</span>" + t + "</a>"; }
  var logoutBtn = '<button class="btn plain small" data-logout>יציאה</button>';

  function loading(title) { shell(title, '<div class="loading">טוען…</div>'); }
  function failed(e) { shell("שגיאה", '<div class="card">' + h(e.message) + '</div><button class="btn block" onclick="location.reload()">נסו שוב</button>'); }

  // לקוח: המסך שלי
  function viewMe() {
    loading("שלום");
    api("frida_my_data", { p_token: S.token }).then(function (d) {
      if (d.is_admin) { S.admin = true; lsSet(LS_ADMIN, "1"); location.hash = "#/today"; return; }
      var first = String(d.client.full_name).split(" ")[0];
      shell("שלום " + first, (d.group ? '<div class="sub" style="margin:-10px 0 14px">' + h(d.group.name) + " · " + h(groupLabel(d.group)) + "</div>" : "") +
        progressHtml(d, false) + historyHtml(d, false), { right: logoutBtn });
      bindChart(app);
    }).catch(failed);
  }

  // מנהלת: שקילה (המסך שמחליף את הפנקס)
  function viewToday() {
    loading("שקילה");
    loadOverview().then(renderToday).catch(failed);
  }
  function renderToday() {
    var ov = S.ov, wd = parseD(S.date).getDay();
    var groups = ov.groups.filter(function (g) { return g.active; });
    var todays = groups.filter(function (g) { return g.weekday === wd; });
    if (!S.groupSel || !groups.some(function (g) { return g.id === S.groupSel; })) S.groupSel = todays.length ? todays[0].id : (groups[0] && groups[0].id);
    var visitBy = {}; ov.visits_on_date.forEach(function (v) { visitBy[v.client_id] = v; });

    var body = '<div class="row" style="margin-bottom:12px"><button class="btn ghost small" data-day="-1" aria-label="יום קודם">→</button>' +
      '<input class="in grow" type="date" id="dt" value="' + S.date + '" style="text-align:center">' +
      '<button class="btn ghost small" data-day="1" aria-label="יום הבא">←</button></div>' +
      '<div class="sub" style="text-align:center;margin:-4px 0 12px">' + fmtDLong(S.date) + (S.date === today() ? " · היום" : "") + "</div>";

    if (!groups.length) {
      body += '<div class="card empty">עוד אין קבוצות.<br><br><a class="btn" href="#/group-new">הוספת קבוצה</a></div>';
      return shell("שקילה", body, { right: logoutBtn }), bindToday();
    }
    var ordered = todays.concat(groups.filter(function (g) { return g.weekday !== wd; }));
    body += '<div class="chips">' + ordered.map(function (g) {
      return '<button class="chip' + (g.id === S.groupSel ? " on" : "") + '" data-g="' + g.id + '">' + h(g.name) + (g.weekday === wd ? "" : " (" + DAYS[g.weekday] + ")") + "</button>";
    }).join("") + "</div>";

    var members = ov.clients.filter(function (c) { return c.active && (c.group_id === S.groupSel || (visitBy[c.id] && visitBy[c.id].group_id === S.groupSel)); });
    var q = S.search.trim();
    var extra = q ? ov.clients.filter(function (c) { return c.active && members.indexOf(c) < 0 && (c.full_name.indexOf(q) >= 0 || c.phone.indexOf(q.replace(/\D/g, "") || "~") >= 0); }) : [];
    var came = members.filter(function (c) { return visitBy[c.id]; }).length;

    body += '<div class="row between" style="margin:0 4px 8px"><span class="sub" id="came">' + came + " מתוך " + members.length + ' נשקלו</span><span class="sub">הקלידו משקל ולחצו "סיום"</span></div>';
    body += '<div class="list roster">' + (members.length ? members.map(function (c) { return rosterRow(c, visitBy[c.id]); }).join("") : '<div class="empty">אין לקוחות בקבוצה הזאת עדיין</div>') + "</div>";
    body += '<input class="in" id="sq" placeholder="🔍 לקוחה מקבוצה אחרת? חיפוש לפי שם" value="' + h(S.search) + '">';
    if (extra.length) body += '<div class="list roster" style="margin-top:8px">' + extra.slice(0, 8).map(function (c) { return rosterRow(c, visitBy[c.id]); }).join("") + "</div>";

    shell("שקילה", body, { right: logoutBtn });
    bindToday();
  }
  function rosterRow(c, v) {
    var prev = S.ov.prev_weights[c.id] != null ? num(S.ov.prev_weights[c.id]) : (c.start_weight != null ? num(c.start_weight) : null);
    var w = v && v.weight != null ? num(v.weight) : null;
    return '<div class="item" data-c="' + c.id + '"><a class="avatar" href="#/client/' + c.id + '">' + initials(c.full_name) + "</a>" +
      '<div class="grow"><div class="name">' + h(c.full_name) + '</div><div class="meta">' +
      (prev != null ? "קודם: " + kg(prev) + " " : "") + '<span data-dl>' + (w != null && prev != null ? deltaHtml(w - prev) : "") + "</span> " + cardTag(c.card) + "</div></div>" +
      '<div class="wbox"><input inputmode="decimal" enterkeyhint="done" placeholder="משקל" aria-label="משקל של ' + h(c.full_name) + '" value="' + (w != null ? kg(w) : "") + '" class="' + (v ? "saved" : "") + '" data-prev="' + (prev == null ? "" : prev) + '"></div></div>';
  }
  function bindToday() {
    var dt = document.getElementById("dt");
    if (dt) dt.addEventListener("change", function () { if (dt.value) { S.date = dt.value; S.groupSel = null; viewToday(); } });
    app.querySelectorAll("[data-day]").forEach(function (b) { b.addEventListener("click", function () { S.date = addDays(S.date, +b.getAttribute("data-day")); S.groupSel = null; viewToday(); }); });
    app.querySelectorAll("[data-g]").forEach(function (b) { b.addEventListener("click", function () { S.groupSel = +b.getAttribute("data-g"); renderToday(); }); });
    var sq = document.getElementById("sq");
    if (sq) sq.addEventListener("input", debounce(function () { S.search = sq.value; renderToday(); var n = document.getElementById("sq"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 350));
    app.querySelectorAll(".roster input").forEach(function (inp) {
      var orig = inp.value;
      function save() {
        var raw = inp.value.replace(",", ".").trim();
        if (raw === orig) return;
        var row = inp.closest("[data-c]"), cid = row.getAttribute("data-c");
        var existing = S.ov.visits_on_date.find(function (v) { return v.client_id === cid; });
        if (raw === "") {
          if (!existing) return;
          if (!confirm("למחוק את השקילה של היום?")) { inp.value = orig; return; }
          return adminApi("frida_admin_delete_visit", { p_id: existing.id }).then(function () { toast("נמחק"); viewToday(); }).catch(function (e) { toast(e.message); });
        }
        var w = Number(raw);
        if (!(w >= 20 && w <= 400)) { toast("משקל לא תקין"); inp.value = orig; return; }
        var prev = inp.getAttribute("data-prev");
        if (prev && Math.abs(w - Number(prev)) > 8 && !confirm("הפרש של " + Math.abs(w - Number(prev)).toFixed(1) + ' ק"ג מהשקילה הקודמת. לשמור?')) { inp.value = orig; return; }
        inp.disabled = true;
        adminApi("frida_admin_save_visit", { p: { client_id: cid, visit_date: S.date, weight: w, group_id: S.groupSel } }).then(function (v) {
          inp.disabled = false; inp.classList.add("saved"); orig = inp.value = kg(w);
          if (existing) existing.weight = v.weight; else S.ov.visits_on_date.push(v);
          var dl = row.querySelector("[data-dl]"); if (prev) dl.innerHTML = deltaHtml(w - Number(prev));
          toast("נשמר ✓");
          var cm = document.getElementById("came"); if (cm && !existing) cm.textContent = cm.textContent.replace(/^\d+/, function (n) { return +n + 1; });
          if (!existing) loadOverview().then(function () { var t = row.querySelector(".tag"), c = S.ov.clients.find(function (x) { return x.id === cid; }); if (t && c) t.outerHTML = cardTag(c.card); });
        }).catch(function (e) { inp.disabled = false; toast(e.message); });
      }
      inp.addEventListener("change", save);
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); inp.blur(); } });
    });
  }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  // מנהלת: לקוחות
  function viewClients() {
    loading("לקוחות");
    loadOverview().then(renderClients).catch(failed);
  }
  function renderClients() {
    var ov = S.ov, f = S.clientsFilter, q = S.search.trim();
    var list = ov.clients.filter(function (c) {
      if (f === "inactive") return !c.active;
      if (!c.active) return false;
      if (f === "nogroup") return !c.group_id;
      if (f !== "all" && c.group_id !== +f) return false;
      return true;
    }).filter(function (c) { return !q || c.full_name.indexOf(q) >= 0 || c.phone.indexOf(q.replace(/\D/g, "") || "~") >= 0; });

    var body = '<input class="in" id="cs" placeholder="🔍 חיפוש לפי שם או טלפון" value="' + h(q) + '" style="margin-bottom:10px">';
    body += '<div class="chips"><button class="chip' + (f === "all" ? " on" : "") + '" data-f="all">כולם (' + ov.clients.filter(function (c) { return c.active; }).length + ")</button>" +
      ov.groups.filter(function (g) { return g.active; }).map(function (g) { return '<button class="chip' + (String(g.id) === String(f) ? " on" : "") + '" data-f="' + g.id + '">' + h(g.name) + "</button>"; }).join("") +
      '<button class="chip' + (f === "nogroup" ? " on" : "") + '" data-f="nogroup">בלי קבוצה</button>' +
      '<button class="chip' + (f === "inactive" ? " on" : "") + '" data-f="inactive">לא פעילים</button></div>';
    body += '<div class="row between" style="margin:0 4px 8px"><span class="sub">' + list.length + ' לקוחות</span><span>' +
      '<button class="btn plain small" data-v="list"' + (S.clientsView === "list" ? ' style="color:var(--brand);font-weight:700"' : "") + ">כרטיסים</button>" +
      '<button class="btn plain small" data-v="table"' + (S.clientsView === "table" ? ' style="color:var(--brand);font-weight:700"' : "") + ">טבלה</button></span></div>";

    if (!list.length) body += '<div class="card empty">אין לקוחות להצגה</div>';
    else if (S.clientsView === "table") body += clientsTable(list);
    else {
      // קיבוץ לפי קבוצה
      var byG = {};
      list.forEach(function (c) { (byG[c.group_id || 0] = byG[c.group_id || 0] || []).push(c); });
      var order = ov.groups.map(function (g) { return g.id; }).concat([0]);
      order.forEach(function (gid) {
        if (!byG[gid]) return;
        var g = groupById(gid);
        body += '<div class="section-title">' + h(g ? g.name + " · " + groupLabel(g) : "בלי קבוצה") + "</div>";
        body += '<div class="list">' + byG[gid].map(clientItem).join("") + "</div>";
      });
    }
    shell("לקוחות", body, { right: logoutBtn, fab: '<a class="btn fab" href="#/client-new">+ לקוח חדש</a>' });
    var cs = document.getElementById("cs");
    cs.addEventListener("input", debounce(function () { S.search = cs.value; renderClients(); var n = document.getElementById("cs"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 350));
    app.querySelectorAll("[data-f]").forEach(function (b) { b.addEventListener("click", function () { S.clientsFilter = b.getAttribute("data-f"); renderClients(); }); });
    app.querySelectorAll("[data-v]").forEach(function (b) { b.addEventListener("click", function () { S.clientsView = b.getAttribute("data-v"); lsSet(LS_VIEW, S.clientsView); renderClients(); }); });
    app.querySelectorAll("tr[data-href]").forEach(function (tr) { tr.addEventListener("click", function () { location.hash = tr.getAttribute("data-href"); }); });
  }
  function clientItem(c) {
    var total = c.last_weight != null && c.start_weight != null ? num(c.last_weight) - num(c.start_weight) : null;
    return '<a class="item" href="#/client/' + c.id + '"><span class="avatar">' + initials(c.full_name) + '</span><div class="grow"><div class="name">' + h(c.full_name) + "</div>" +
      '<div class="meta">' + (c.last_weight != null ? kg(c.last_weight) + ' ק"ג ' : "") + deltaHtml(total) + (c.last_visit ? " · נשקלה " + fmtD(c.last_visit) : "") + "</div></div>" + cardTag(c.card) + "</a>";
  }
  function clientsTable(list) {
    return '<div class="tablewrap"><table class="t"><thead><tr><th>שם</th><th>קבוצה</th><th class="num">התחלה</th><th class="num">אחרון</th><th class="num">שינוי</th><th>כרטיסייה</th><th>תוקף</th><th>שקילה אחרונה</th></tr></thead><tbody>' +
      list.map(function (c) {
        var total = c.last_weight != null && c.start_weight != null ? num(c.last_weight) - num(c.start_weight) : null;
        var g = groupById(c.group_id);
        return '<tr class="click" data-href="#/client/' + c.id + '"><td>' + h(c.full_name) + "</td><td>" + h(g ? g.name : "–") + '</td><td class="num">' + kg(num(c.start_weight)) + '</td><td class="num">' + kg(num(c.last_weight)) +
          '</td><td class="num">' + deltaHtml(total) + "</td><td>" + (c.card ? (c.card.sessions_total - c.card.used) + "/" + c.card.sessions_total : "–") + "</td><td>" + (c.card ? fmtD(c.card.expires_at) : "–") + "</td><td>" + (c.last_visit ? fmtD(c.last_visit) : "–") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  // מנהלת: כרטיס לקוח
  function viewClient(id) {
    loading("כרטיס לקוח");
    Promise.all([adminApi("frida_admin_client", { p_client: id }), S.ov ? Promise.resolve(S.ov) : loadOverview()]).then(function (r) {
      var d = r[0];
      if (!d) return failed(new Error("הלקוח לא נמצא"));
      var c = d.client, g = d.group;
      var msg = "היי " + c.full_name.split(" ")[0] + ", זה הלינק למעקב ההתקדמות שלך בקבוצה של פרידה:\n" + CFG.appUrl +
        "\nכניסה עם מספר הטלפון שלך ו-3 הספרות האחרונות של תעודת הזהות.";
      var wa = "https://wa.me/972" + c.phone.slice(1) + "?text=" + encodeURIComponent(msg);
      var body = '<div class="card"><div class="row"><span class="avatar" style="width:52px;height:52px;font-size:18px">' + initials(c.full_name) + '</span><div class="grow">' +
        '<div class="sub"><a href="tel:' + c.phone + '" dir="ltr">' + phoneFmt(c.phone) + "</a></div>" +
        '<div class="sub">' + h(g ? g.name + " · " + groupLabel(g) : "בלי קבוצה") + "</div>" +
        '<div class="sub">כרטיס נפתח ב-' + fmtD(c.opened_at) + (c.active ? "" : ' · <span class="tag bad">לא פעיל</span>') + "</div></div></div>" +
        (c.notes ? '<div class="sub" style="margin-top:10px;white-space:pre-wrap">' + h(c.notes) + "</div>" : "") +
        '<div class="row" style="margin-top:14px"><a class="btn wa grow" style="text-align:center;text-decoration:none" target="_blank" rel="noopener" href="' + wa + '">שליחת לינק בוואטסאפ</a>' +
        '<a class="btn ghost" style="text-decoration:none" href="#/client-edit/' + c.id + '">עריכה</a></div></div>';

      body += '<div class="row" style="margin-bottom:12px"><button class="btn ghost grow" data-add-w>+ שקילה</button><button class="btn ghost grow" data-add-card>+ כרטיסייה</button></div>';
      body += progressHtml(d, true);

      if (d.cards.length) {
        body += '<div class="section-title">כל הכרטיסיות</div><div class="list">' + d.cards.map(function (k) {
          return '<div class="item"><div class="grow"><div class="name">' + k.sessions_total + " מפגשים · " + k.used + " נוצלו</div>" +
            '<div class="meta">נקנתה ' + fmtD(k.purchased_at) + " · תוקף עד " + fmtD(k.expires_at) + (k.price ? " · ₪" + Number(k.price) : "") + "</div></div>" +
            '<button class="btn plain small" data-edit-card="' + k.id + '">עריכה</button></div>';
        }).join("") + "</div>";
      }
      body += historyHtml(d, true);
      shell(c.full_name, body, { back: "#/clients" });
      bindChart(app);

      app.querySelector("[data-add-w]").addEventListener("click", function () { weighDialog(c); });
      app.querySelector("[data-add-card]").addEventListener("click", function () { cardDialog(c, null); });
      app.querySelectorAll("[data-edit-card]").forEach(function (b) { b.addEventListener("click", function () { cardDialog(c, d.cards.find(function (k) { return String(k.id) === b.getAttribute("data-edit-card"); })); }); });
      app.querySelectorAll("[data-del-visit]").forEach(function (b) {
        b.addEventListener("click", function () {
          if (!confirm("למחוק את השקילה?")) return;
          adminApi("frida_admin_delete_visit", { p_id: +b.getAttribute("data-del-visit") }).then(function () { toast("נמחק"); S.ov = null; viewClient(id); }).catch(function (e) { toast(e.message); });
        });
      });
    }).catch(failed);
  }

  function dialog(html, onSubmit) {
    var dl = document.createElement("dialog");
    dl.innerHTML = '<form method="dialog">' + html + '<div class="err" data-err></div><div class="row"><button class="btn grow" value="ok">שמירה</button><button class="btn ghost" value="cancel" formnovalidate>ביטול</button></div></form>';
    document.body.appendChild(dl);
    var form = dl.querySelector("form");
    form.addEventListener("submit", function (e) {
      if (e.submitter && e.submitter.value === "cancel") return;
      e.preventDefault();
      var fd = {}; new FormData(form).forEach(function (v, k) { fd[k] = v; });
      onSubmit(fd, dl).catch(function (er) { dl.querySelector("[data-err]").textContent = er.message; });
    });
    dl.addEventListener("close", function () { dl.remove(); });
    dl.showModal();
    return dl;
  }

  function weighDialog(c) {
    dialog("<h3>שקילה ל" + h(c.full_name) + "</h3>" +
      '<label class="f"><span>תאריך</span><input class="in" type="date" name="d" value="' + today() + '" required></label>' +
      '<label class="f"><span>משקל (ק"ג)</span><input class="in" name="w" inputmode="decimal" required></label>' +
      '<label class="f"><span>הערה (לא חובה)</span><input class="in" name="n"></label>',
      function (fd, dl) {
        var w = Number(String(fd.w).replace(",", "."));
        if (!(w >= 20 && w <= 400)) return Promise.reject(new Error("משקל לא תקין"));
        return adminApi("frida_admin_save_visit", { p: { client_id: c.id, visit_date: fd.d, weight: w, note: fd.n } }).then(function () { dl.close(); toast("נשמר ✓"); S.ov = null; viewClient(c.id); });
      });
  }

  function cardDialog(c, k) {
    var t = today();
    dialog("<h3>" + (k ? "עריכת כרטיסייה" : "כרטיסייה חדשה") + "</h3>" +
      '<div class="grid2"><label class="f"><span>מספר מפגשים</span><input class="in" name="s" inputmode="numeric" value="' + (k ? k.sessions_total : 10) + '" required></label>' +
      '<label class="f"><span>מחיר ₪ (לא חובה)</span><input class="in" name="p" inputmode="decimal" value="' + (k && k.price ? Number(k.price) : "") + '"></label></div>' +
      '<div class="grid2"><label class="f"><span>תאריך קנייה</span><input class="in" type="date" name="b" value="' + (k ? k.purchased_at : t) + '" required></label>' +
      '<label class="f"><span>בתוקף עד</span><input class="in" type="date" name="e" value="' + (k ? k.expires_at : addMonths(t, 3)) + '" required></label></div>' +
      (k ? '<button type="button" class="btn danger small" data-del style="margin-bottom:12px">מחיקת הכרטיסייה</button>' : ""),
      function (fd, dl) {
        var s = parseInt(fd.s, 10);
        if (!(s > 0)) return Promise.reject(new Error("מספר מפגשים לא תקין"));
        if (fd.e < fd.b) return Promise.reject(new Error("התוקף לפני תאריך הקנייה"));
        return adminApi("frida_admin_save_card", { p: { id: k ? k.id : "", client_id: c.id, sessions_total: s, purchased_at: fd.b, expires_at: fd.e, price: fd.p } })
          .then(function () { dl.close(); toast("נשמר ✓"); S.ov = null; viewClient(c.id); });
      });
    var del = document.querySelector("dialog [data-del]");
    if (del) del.addEventListener("click", function () {
      if (!confirm("למחוק את הכרטיסייה? המפגשים שנוצלו יישארו בהיסטוריה.")) return;
      adminApi("frida_admin_delete_card", { p_id: k.id }).then(function () { document.querySelector("dialog").close(); toast("נמחק"); S.ov = null; viewClient(c.id); }).catch(function (e) { toast(e.message); });
    });
  }

  // מנהלת: לקוח חדש / עריכה
  function viewClientForm(id) {
    loading(id ? "עריכת לקוח" : "לקוח חדש");
    Promise.all([id ? adminApi("frida_admin_client", { p_client: id }) : Promise.resolve(null), S.ov ? Promise.resolve(S.ov) : loadOverview()]).then(function (r) {
      var c = r[0] ? r[0].client : { opened_at: today(), group_id: S.clientsFilter !== "all" && !isNaN(+S.clientsFilter) ? +S.clientsFilter : "" };
      var t = c.opened_at;
      var gopts = '<option value="">בלי קבוצה</option>' + S.ov.groups.filter(function (g) { return g.active || g.id === c.group_id; }).map(function (g) {
        return '<option value="' + g.id + '"' + (g.id === c.group_id ? " selected" : "") + ">" + h(g.name + " · " + groupLabel(g)) + "</option>";
      }).join("");
      var body = '<form id="cf" class="card" novalidate>' +
        '<label class="f"><span>שם מלא</span><input class="in" name="full_name" value="' + h(c.full_name) + '" required autocomplete="off"></label>' +
        '<div class="grid2"><label class="f"><span>טלפון נייד</span><input class="in" name="phone" type="tel" inputmode="numeric" value="' + h(phoneFmt(c.phone)) + '" required></label>' +
        '<label class="f"><span>3 ספרות אחרונות ת"ז' + (id ? " (ריק = בלי שינוי)" : "") + '</span><input class="in" name="pin" inputmode="numeric" maxlength="3" autocomplete="off"' + (id ? "" : " required") + "></label></div>" +
        '<label class="f"><span>קבוצה</span><select class="in" name="group_id">' + gopts + "</select></label>" +
        '<div class="grid2"><label class="f"><span>משקל התחלתי (ק"ג)</span><input class="in" name="start_weight" inputmode="decimal" value="' + (c.start_weight != null ? kg(num(c.start_weight)) : "") + '"></label>' +
        '<label class="f"><span>תאריך פתיחת כרטיס</span><input class="in" type="date" name="opened_at" value="' + h(t) + '"></label></div>' +
        '<div class="grid2"><label class="f"><span>משקל יעד (לא חובה)</span><input class="in" name="goal_weight" inputmode="decimal" value="' + (c.goal_weight != null ? kg(num(c.goal_weight)) : "") + '"></label>' +
        '<input type="hidden" name="height_cm" value="' + (c.height_cm || "") + '"></div>';
      if (!id) {
        body += '<div class="section-title" style="margin-top:4px">כרטיסייה ראשונה</div>' +
          '<div class="grid2"><label class="f"><span>מספר מפגשים</span><input class="in" name="card_sessions" inputmode="numeric" value="10"></label>' +
          '<label class="f"><span>בתוקף עד</span><input class="in" type="date" name="card_expires_at" value="' + addMonths(t, 3) + '"></label></div>' +
          '<label class="f"><span>מחיר ₪ (לא חובה)</span><input class="in" name="card_price" inputmode="decimal"></label>';
      }
      body += '<label class="f"><span>הערות</span><textarea class="in" name="notes" rows="2">' + h(c.notes) + "</textarea></label>";
      if (id) body += '<label class="row" style="margin-bottom:12px"><input type="checkbox" name="active"' + (c.active ? " checked" : "") + "> לקוח פעיל</label>";
      body += '<div class="err" id="ce"></div><button class="btn block">' + (id ? "שמירה" : "יצירת לקוח") + "</button></form>";
      shell(id ? "עריכת " + c.full_name : "לקוח חדש", body, { back: id ? "#/client/" + id : "#/clients" });

      var f = document.getElementById("cf");
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var p = {}; new FormData(f).forEach(function (v, k) { p[k] = typeof v === "string" ? v.trim().replace(/^(\d+),(\d)$/, "$1.$2") : v; });
        if (id) { p.id = id; p.active = f.active.checked; }
        var err = document.getElementById("ce");
        if (!p.full_name) { err.textContent = "חסר שם"; return; }
        if (!id && p.pin.replace(/\D/g, "").length !== 3) { err.textContent = 'צריך 3 ספרות של ת"ז'; return; }
        if (!id && p.card_sessions && !p.card_expires_at) { err.textContent = "חסר תוקף לכרטיסייה"; return; }
        var btn = f.querySelector("button.btn"); btn.disabled = true;
        adminApi("frida_admin_save_client", { p: p }).then(function (newId) {
          toast(id ? "נשמר ✓" : "הלקוח נוצר ✓"); S.ov = null;
          location.replace("#/client/" + newId);
        }).catch(function (er) { btn.disabled = false; err.textContent = er.message; });
      });
    }).catch(failed);
  }

  // מנהלת: קבוצות
  function viewGroups() {
    loading("קבוצות");
    loadOverview().then(function (ov) {
      var count = {}; ov.clients.forEach(function (c) { if (c.active && c.group_id) count[c.group_id] = (count[c.group_id] || 0) + 1; });
      var body = "";
      if (!ov.groups.length) body = '<div class="card empty">עוד אין קבוצות. כל קבוצה היא יום, שעה ועיר קבועים בשבוע.</div>';
      for (var d = 0; d < 7; d++) {
        var gs = ov.groups.filter(function (g) { return g.weekday === d; });
        if (!gs.length) continue;
        body += '<div class="section-title">יום ' + DAYS[d] + '</div><div class="list">' + gs.map(function (g) {
          return '<a class="item" href="#/group/' + g.id + '"><span class="avatar">' + String(g.start_time).slice(0, 5) + '</span><div class="grow"><div class="name">' + h(g.name) + (g.active ? "" : ' <span class="tag bad">לא פעילה</span>') + "</div>" +
            '<div class="meta">' + h(g.city) + (g.location ? " · " + h(g.location) : "") + "</div></div><span class=\"tag\">" + (count[g.id] || 0) + " לקוחות</span></a>";
        }).join("") + "</div>";
      }
      shell("קבוצות", body, { right: logoutBtn, fab: '<a class="btn fab" href="#/group-new">+ קבוצה חדשה</a>' });
    }).catch(failed);
  }

  // מנהלת: קבוצה – טבלת לקוחות + עריכה
  function viewGroup(id) {
    loading("קבוצה");
    (S.ov ? Promise.resolve(S.ov) : loadOverview()).then(function (ov) {
      var g = id ? groupById(id) : { weekday: new Date().getDay(), start_time: "18:00", city: "", name: "", active: true };
      if (!g) return failed(new Error("הקבוצה לא נמצאה"));
      var members = id ? ov.clients.filter(function (c) { return c.group_id === id && c.active; }) : [];
      var body = "";
      if (id) {
        body += '<div class="sub" style="margin:-10px 0 14px">' + h(groupLabel(g)) + (g.location ? " · " + h(g.location) : "") + "</div>";
        body += members.length ? clientsTable(members) : '<div class="card empty">אין עדיין לקוחות בקבוצה</div>';
        body += '<div class="section-title">פרטי הקבוצה</div>';
      }
      body += '<form id="gf" class="card">' +
        '<label class="f"><span>שם הקבוצה</span><input class="in" name="name" value="' + h(g.name) + '" placeholder="למשל: חולון ערב" required></label>' +
        '<div class="grid2"><label class="f"><span>יום</span><select class="in" name="weekday">' + DAYS.map(function (n, i) { return '<option value="' + i + '"' + (i === g.weekday ? " selected" : "") + ">" + n + "</option>"; }).join("") + "</select></label>" +
        '<label class="f"><span>שעה</span><input class="in" type="time" name="start_time" value="' + String(g.start_time).slice(0, 5) + '" required></label></div>' +
        '<div class="grid2"><label class="f"><span>עיר</span><input class="in" name="city" value="' + h(g.city) + '" required></label>' +
        '<label class="f"><span>מקום (לא חובה)</span><input class="in" name="location" value="' + h(g.location) + '"></label></div>' +
        (id ? '<label class="row" style="margin-bottom:12px"><input type="checkbox" name="active"' + (g.active ? " checked" : "") + "> קבוצה פעילה</label>" : "") +
        '<div class="err" id="ge"></div><button class="btn block">' + (id ? "שמירה" : "יצירת קבוצה") + "</button></form>";
      shell(id ? g.name : "קבוצה חדשה", body, { back: "#/groups" });
      app.querySelectorAll("tr[data-href]").forEach(function (tr) { tr.addEventListener("click", function () { location.hash = tr.getAttribute("data-href"); }); });
      var f = document.getElementById("gf");
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var p = {}; new FormData(f).forEach(function (v, k) { p[k] = String(v).trim(); });
        if (!p.name || !p.city) { document.getElementById("ge").textContent = "חסר שם או עיר"; return; }
        if (id) { p.id = id; p.active = f.active.checked; }
        adminApi("frida_admin_save_group", { p: p }).then(function () { toast("נשמר ✓"); S.ov = null; location.hash = "#/groups"; })
          .catch(function (er) { document.getElementById("ge").textContent = er.message; });
      });
    }).catch(failed);
  }

  // ---------- ניתוב ----------
  function render() {
    window.scrollTo(0, 0);
    if (!S.token) return viewLogin();
    var r = location.hash.replace(/^#\/?/, "").split("/");
    if (!S.admin) return viewMe();
    switch (r[0]) {
      case "clients": return viewClients();
      case "client": return viewClient(r[1]);
      case "client-new": return viewClientForm(null);
      case "client-edit": return viewClientForm(r[1]);
      case "groups": return viewGroups();
      case "group": return viewGroup(+r[1]);
      case "group-new": return viewGroup(null);
      default: return viewToday();
    }
  }
  window.addEventListener("hashchange", render);
  render();
})();
