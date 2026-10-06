(function () {
  var P = "sandwich_";
  var KIDS = ["lia", "daniela", "evyatar"];
  var DISHES = [
    {n: "חומוס ומלפפון חמוץ", e: "🥒"}, {n: "חומוס ופסטרמה", e: ["hummus", "pastrami"]}, {n: "חומוס וסלמי", e: ["hummus", "salami"]},
    {n: "גבינה לבנה", e: "🥣"}, {n: "גבינת נפוליאון", e: "🧀"}, {n: "חומוס", e: ["hummus"]},
    {n: "חביתה", e: "🍳"}, {n: "ריבה", e: "🍓"}, {n: "שוקולד", e: "🍫"},
    {n: "פיתה זעתר", e: "🫓"}, {n: "טוסט", e: "🍞"}, {n: "סלט ביצים", e: "🥚"},
    {n: "טונה", e: "🐟"}, {n: "קוטג'", e: "🥛"}];

  // אייקונים מצוירים לאוכל שאין לו אימוג'י מתאים
  var SVG = {
    hummus: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M5 31h54c0 15-11 25-27 25S5 46 5 31z" fill="#f6f1e7" stroke="#c9bfa9" stroke-width="2"/><ellipse cx="32" cy="31" rx="27" ry="9" fill="#ecd196" stroke="#c9bfa9" stroke-width="2"/><ellipse cx="32" cy="31" rx="16" ry="4.6" fill="none" stroke="#c98a1b" stroke-width="2.4"/><ellipse cx="32" cy="31" rx="7" ry="2" fill="#dcae4e"/><circle cx="19" cy="28" r="3.4" fill="#d9ad62" stroke="#b5842f" stroke-width="1.2"/><circle cx="45" cy="29" r="3.4" fill="#d9ad62" stroke="#b5842f" stroke-width="1.2"/><circle cx="32" cy="25.5" r="3.4" fill="#d9ad62" stroke="#b5842f" stroke-width="1.2"/><circle cx="26" cy="35" r="1.1" fill="#c0392b"/><circle cx="38" cy="35.5" r="1.1" fill="#c0392b"/></svg>',
    pastrami: '<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="34" rx="27" ry="20" fill="#7a2a1c" stroke="#3b1710" stroke-width="2"/><ellipse cx="32" cy="33" rx="22" ry="15.5" fill="#d0646d"/><path d="M14 30c8-6 20 4 36-4M13 38c9-5 22 5 38-3M20 44c7-3 17 2 25-2" fill="none" stroke="#f0a8ab" stroke-width="2.2" stroke-linecap="round"/><g fill="#24140f"><circle cx="10" cy="34" r="1.5"/><circle cx="16" cy="46" r="1.5"/><circle cx="28" cy="52" r="1.5"/><circle cx="42" cy="51" r="1.5"/><circle cx="53" cy="43" r="1.5"/><circle cx="55" cy="31" r="1.5"/><circle cx="46" cy="19" r="1.5"/><circle cx="30" cy="15" r="1.5"/><circle cx="17" cy="21" r="1.5"/></g></svg>',
    salami: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="38" cy="26" r="19" fill="#c0443f" stroke="#7a1a22" stroke-width="2" opacity=".75"/><circle cx="29" cy="35" r="22" fill="#b5303a" stroke="#7a1a22" stroke-width="2.4"/><g fill="#f6d9d0"><circle cx="21" cy="28" r="2.4"/><circle cx="33" cy="25" r="2"/><circle cx="38" cy="36" r="2.6"/><circle cx="26" cy="41" r="2.2"/><circle cx="17" cy="38" r="1.8"/><circle cx="31" cy="47" r="1.8"/><circle cx="42" cy="27" r="1.6"/><circle cx="24" cy="20" r="1.6"/></g></svg>'
  };
  function ico(e) {
    if (typeof e === "string") return e;
    return '<span class="pair">' + e.map(function (k) { return SVG[k]; }).join("") + '</span>';
  }
  var DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  function dayLabel(isoStr) {
    var d = new Date(isoStr + "T12:00:00");
    return "יום " + DAYS[d.getDay()] + " · " + d.getDate() + "." + (d.getMonth() + 1);
  }
  function emoji(name) { for (var i = 0; i < DISHES.length; i++) if (DISHES[i].n === name) return ico(DISHES[i].e); return "🥪"; }
  var cfg = window.SANDWICH_CONFIG || {};
  var demo = !(cfg.supabaseUrl && cfg.supabaseAnonKey);
  var app = document.getElementById("app");
  var timer = null;

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(P + k); if (v === null) localStorage.removeItem(P + k); else localStorage.setItem(P + k, v); } catch (e) { return null; }
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }

  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  // לימודים ראשון עד שישי, בלי שבת.
  // הבחירה נסגרת ב-04:00 בבוקר (מי שהולך לישון מאוחר עדיין בוחר ליום שלמחרת).
  // ילדים: תמיד היום הבא, לפי "יום" שמתחלף ב-04:00 (שישי ושבת מובילים לראשון).
  // ליאורי: עד 12:00 רואה את היום (מה שמכינים עכשיו), מ-12:00 את היום הבא.
  var CLOSE_HOUR = 4;
  function nextSchoolDay(d) {
    var n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12);
    if (n.getDay() === 6) n.setDate(n.getDate() + 1);
    return n;
  }
  function target(forMom) {
    var now = new Date(), base, d;
    if (forMom) {
      base = now;
      d = (now.getHours() < 12 && now.getDay() !== 6) ? now : nextSchoolDay(now);
    } else {
      base = new Date(now.getTime() - CLOSE_HOUR * 36e5);
      d = nextSchoolDay(base);
    }
    var days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(base.getFullYear(), base.getMonth(), base.getDate())) / 864e5);
    return {iso: iso(d), label: days === 0 ? "היום" : days === 1 ? "מחר" : "יום " + DAYS[d.getDay()]};
  }

  // ---- שכבת נתונים ----
  // מפתח ישן (anon, מתחיל ב-eyJ) נשלח גם כ-Bearer. מפתח חדש (sb_publishable_...) רק ב-apikey.
  function authHeaders() {
    var h = {"Content-Type": "application/json", apikey: cfg.supabaseAnonKey};
    if (String(cfg.supabaseAnonKey).indexOf("eyJ") === 0) h.Authorization = "Bearer " + cfg.supabaseAnonKey;
    return h;
  }
  function rpc(name, body) {
    return fetch(cfg.supabaseUrl + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) throw new Error("שגיאה " + r.status);
      return r.text().then(function (t) { return t ? JSON.parse(t) : null; });
    });
  }
  function getAll(date) {
    if (demo) return Promise.resolve(JSON.parse(store("demo_" + date) || "[]"));
    return rpc("sandwich_get", {p_date: date});
  }
  function setChoice(child, date, dish) {
    if (demo) {
      var rows = JSON.parse(store("demo_" + date) || "[]").filter(function (r) { return r.child !== child; });
      rows.push({child: child, dish: dish});
      store("demo_" + date, JSON.stringify(rows));
      return Promise.resolve();
    }
    return rpc("sandwich_set", {p_child: child, p_date: date, p_dish: dish});
  }

  // ---- תזכורות (Web Push) ----
  function pushSupported() { return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window; }
  function urlB64(b) {
    var p = "=".repeat((4 - b.length % 4) % 4), raw = atob((b + p).replace(/-/g, "+").replace(/_/g, "/")), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function saveSub(child, sub) {
    var j = sub.toJSON();
    return rpc("sandwich_push_save", {p_child: child, p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth});
  }
  function pushState() {
    if (demo || !pushSupported() || Notification.permission !== "granted") return Promise.resolve(null);
    return navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); });
  }
  // חשוב: הבקשה לאישור חייבת לצאת ישר מהלחיצה (בלי await לפניה), אחרת iPhone לא יציג אותה.
  function enablePush(child) {
    var ask = Notification.requestPermission();
    return Promise.resolve(ask).then(function (perm) {
      if (perm !== "granted") throw new Error("denied");
      return navigator.serviceWorker.ready;
    }).then(function (reg) {
      return reg.pushManager.getSubscription().then(function (sub) {
        return sub || reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: urlB64(cfg.vapidPublicKey)});
      });
    }).then(function (sub) { return saveSub(child, sub); });
  }
  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.className = "show";
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.className = ""; }, 6000);
  }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }

  // ---- מסכים ----
  function show(html) { clearInterval(timer); app.className = ""; app.innerHTML = html; window.scrollTo(0, 0); }
  function colorOf(id) { return "--c:" + CHARACTERS[id].color; }

  // קונפטי קטן מנקודה במסך
  function burst(x, y) {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var set = ["⭐", "✨", "🥪", "🎉", "💛"];
    for (var i = 0; i < 12; i++) {
      var el = document.createElement("span");
      el.className = "fx"; el.textContent = set[i % set.length];
      el.style.left = x + "px"; el.style.top = y + "px";
      document.body.appendChild(el);
      var ang = Math.random() * Math.PI * 2, dist = 50 + Math.random() * 60;
      var anim = el.animate([
        {transform: "translate(-50%,-50%) scale(.4)", opacity: 1},
        {transform: "translate(calc(-50% + " + Math.cos(ang) * dist + "px),calc(-50% + " + (Math.sin(ang) * dist - 30) + "px)) scale(1.2) rotate(" + (Math.random() * 360) + "deg)", opacity: 0}
      ], {duration: 600 + Math.random() * 300, easing: "cubic-bezier(.2,.7,.3,1)"});
      anim.onfinish = (function (e) { return function () { e.remove(); }; })(el);
    }
  }

  function burstFrom(el) {
    if (!el) return;
    var r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2);
  }

  function screenWho() {
    show('<div class="hero"><h1>בוחרים סנדוויץ\'</h1><p class="sub">בוחרים סנדוויץ\' למחר בבוקר!</p></div><div class="who">' +
      KIDS.map(function (id) { return '<button class="person" data-id="' + id + '" style="' + colorOf(id) + '"><div class="stage">' + drawCharacter(id) + '</div><b>' + CHARACTERS[id].name + '</b></button>'; }).join("") +
      '</div><p class="pickhint">לחצו על השם שלכם</p><button class="mom-card" data-id="mom" style="' + colorOf("mom") + '">' + drawCharacter("mom") + '<span class="mc-text"><b>ליאורי</b><small>לראות מה כולם בחרו</small></span></button>');
    Array.prototype.forEach.call(app.querySelectorAll("[data-id]"), function (b) {
      b.onclick = function () { store("who", b.dataset.id); route(); };
    });
  }

  function topBar() {
    return '<div class="top"><span><span class="lg">🥪</span> <span class="logo">סנדוויץ\'</span></span><button class="link" id="switch">לא אני? החלפה</button></div>';
  }
  function bindSwitch() {
    var s = document.getElementById("switch");
    if (s) s.onclick = function () { store("who", null); screenWho(); };
  }

  function screenPick(child) {
    var t = target(false);
    var forTxt = t.label === "מחר" ? "למחר" : "ל" + t.label;
    getAll(t.iso).then(function (rows) {
      var mine = rows.filter(function (r) { return r.child === child; })[0];
      var cur = mine && mine.dish;
      show('<header class="phead" style="' + colorOf(child) + '"><div class="ptop">' +
        (demo ? "" : '<button class="pill" id="bell" type="button">🔔 תזכורות</button>') +
        '<button class="pill" id="switch" type="button">חזרה לדמויות</button></div>' +
        '<div class="greet"><div class="pic">' + drawCharacter(child) + '</div>' +
        '<div class="bubble"><small>היי ' + CHARACTERS[child].name + '!</small><h1>בחירת סנדוויץ\' ' + forTxt + '</h1><p class="when">' + dayLabel(t.iso) + '</p><div class="ok" id="status"></div></div></div></header>' +
        '<div class="plist" style="' + colorOf(child) + '"><div class="grid">' + DISHES.map(function (d, i) {
          return '<button class="dish" data-i="' + i + '"><span class="em">' + ico(d.e) + '</span><span class="nm">' + esc(d.n) + '</span></button>';
        }).join("") + '</div></div>');
      app.className = "pick";
      bindSwitch();
      var status = document.getElementById("status");
      var dishes = Array.prototype.slice.call(app.querySelectorAll(".dish"));
      function paint(saved) {
        dishes.forEach(function (b) { b.classList.toggle("sel", DISHES[b.dataset.i].n === cur); });
        status.className = "ok" + (cur ? "" : " idle") + (saved ? " pop" : "");
        status.innerHTML = cur
          ? '<span class="e">' + emoji(cur) + '</span><span>' + (saved ? "נשמר! כל הכבוד " : "בחרת: ") + '<b>' + esc(cur) + '</b></span>'
          : '<span>לחצו על מנה כדי לבחור</span>';
      }
      paint(false);
      dishes.forEach(function (b) {
        b.onclick = function () {
          var name = DISHES[b.dataset.i].n;
          setChoice(child, t.iso, name).then(function () {
            cur = name; paint(true); burstFrom(status);
          }).catch(function () { toast("לא הצלחנו לשמור. נסו שוב"); });
        };
      });
      var bell = document.getElementById("bell");
      if (bell) {
        pushState().then(function (sub) {
          if (sub) { bell.textContent = "🔔 תזכורות פעילות ✓"; bell.classList.add("on"); saveSub(child, sub).catch(function () {}); }
        }).catch(function () {});
        bell.onclick = function () {
          if (!pushSupported()) {
            toast(isIOS() ? "כדי לקבל תזכורות: לחצו על כפתור השיתוף בספארי, בחרו 'הוספה למסך הבית', ופתחו את האפליקציה משם." : "הדפדפן הזה לא תומך בתזכורות.");
            return;
          }
          enablePush(child).then(function () {
            bell.textContent = "🔔 תזכורות פעילות ✓"; bell.classList.add("on");
            toast("מעולה! תקבלו תזכורת ב-17:00 וב-19:00 אם עוד לא בחרתם.");
          }).catch(function (e) {
            toast(e && e.message === "denied" ? "התזכורות חסומות. אפשר לאשר אותן בהגדרות הטלפון." : "לא הצלחנו להפעיל תזכורות. נסו שוב.");
          });
        };
      }
    }).catch(function () { show('<h1>אין חיבור 📡</h1><button class="main" id="retry">נסו שוב</button>'); document.getElementById("retry").onclick = route; });
  }

  function screenMom() {
    var t = target(true), celebrated = false;
    function render() {
      getAll(t.iso).then(function (rows) {
        var by = {}; rows.forEach(function (r) { by[r.child] = r.dish; });
        var done = KIDS.filter(function (k) { return by[k]; }).length;
        var all = done === KIDS.length;
        app.innerHTML = topBar() +
          '<div class="mom-head" style="' + colorOf("mom") + '"><div class="pic">' + drawCharacter("mom") + '</div><div><h1>הסנדוויץ\'ים של ' + t.label + ' בבוקר</h1><p class="sub" style="margin:0">' + done + ' מתוך ' + KIDS.length + ' בחרו</p></div></div>' +
          '<div class="progress"><i style="width:' + (done / KIDS.length * 100) + '%"></i></div>' +
          (all ? '<div class="all">כולם בחרו 🎉</div>' : '') +
          KIDS.map(function (k) {
            var d = by[k];
            return '<div class="row ' + (d ? "done" : "wait") + '" style="' + colorOf(k) + '">' + drawCharacter(k, "face") + '<div><b>' + CHARACTERS[k].name + '</b>' +
              (d ? '<span class="d"><span class="em">' + emoji(d) + '</span>' + esc(d) + '</span>' : '<span class="none">עדיין לא בחר/ה…</span>') + '</div>' +
              '<span class="chip ' + (d ? "y" : "n") + '">' + (d ? "בחר/ה ✓" : "ממתין") + '</span></div>';
          }).join("") + '<button class="main refresh" id="refresh">רענון</button>';
        bindSwitch();
        document.getElementById("refresh").onclick = render;
        if (all && !celebrated) { celebrated = true; burst(window.innerWidth / 2, 160); }
      }).catch(function () { app.innerHTML = '<h1>אין חיבור 📡</h1>'; });
    }
    show("");
    render();
    timer = setInterval(render, 20000);
  }

  function route() {
    var who = store("who");
    if (!who || !CHARACTERS[who]) return screenWho();
    if (who === "mom") return screenMom();
    screenPick(who);
  }

  // בלי זום בטעות: לא מגיבים לצביטה ב-iOS, ולחיצה כפולה לא מקרבת (touch-action ב-CSS)
  ["gesturestart", "gesturechange", "gestureend"].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); }); });
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(function () {});
  if (demo) document.getElementById("demo").hidden = false;
  route();
})();
