(function () {
  var P = "sandwich_";
  var KIDS = ["lia", "daniela", "evyatar"];
  var DISHES = [
    {n: "חומוס ומלפפון חמוץ", e: "🥒"}, {n: "חומוס ופסטרמה", e: "🥩"}, {n: "חומוס וסלמי", e: "🍖"},
    {n: "גבינה לבנה", e: "🥣"}, {n: "גבינת נפוליאון", e: "🧀"}, {n: "חומוס", e: "🫘"},
    {n: "חביתה", e: "🍳"}, {n: "ריבה", e: "🍓"}, {n: "שוקולד", e: "🍫"},
    {n: "פיתה זעתר", e: "🫓"}, {n: "טוסט", e: "🍞"}, {n: "סלט ביצים", e: "🥚"},
    {n: "טונה", e: "🐟"}, {n: "קוטג'", e: "🥛"}];
  function emoji(name) { for (var i = 0; i < DISHES.length; i++) if (DISHES[i].n === name) return DISHES[i].e; return "🥪"; }
  var cfg = window.SANDWICH_CONFIG || {};
  var demo = !(cfg.supabaseUrl && cfg.supabaseAnonKey);
  var app = document.getElementById("app");
  var timer = null;

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(P + k); if (v === null) localStorage.removeItem(P + k); else localStorage.setItem(P + k, v); } catch (e) { return null; }
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }

  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  // ילדים: תמיד הסנדוויץ' של מחר בבוקר.
  // ליאורי: עד 12:00 רואה את של היום (מה שמכינים עכשיו), אחרי 12:00 את של מחר.
  function target(forMom) {
    var d = new Date();
    var tomorrow = !forMom || d.getHours() >= 12;
    if (tomorrow) d.setDate(d.getDate() + 1);
    return {iso: iso(d), label: tomorrow ? "מחר" : "היום"};
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

  // ---- מסכים ----
  function show(html) { clearInterval(timer); app.innerHTML = html; window.scrollTo(0, 0); }
  function colorOf(id) { return "--c:" + CHARACTERS[id].color; }

  // קונפטי קטן מנקודה במסך
  function burst(x, y) {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var set = ["⭐", "🥪", "🍅", "🥒"];
    for (var i = 0; i < 8; i++) {
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

  function screenWho() {
    show('<div class="hero"><h1>מי אתם?</h1><p class="sub">לחצו על הדמות שלכם</p></div><div class="who">' +
      KIDS.map(function (id) { return '<button class="person" data-id="' + id + '" style="' + colorOf(id) + '"><div class="stage">' + drawCharacter(id) + '</div><b>' + CHARACTERS[id].name + '</b></button>'; }).join("") +
      '</div><button class="mom-card" data-id="mom" style="' + colorOf("mom") + '">' + drawCharacter("mom") + '<span class="mc-text"><b>ליאורי</b><small>לראות מה כולם בחרו</small></span></button>');
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

  function screenPick(child, saved, at) {
    var t = target(false);
    getAll(t.iso).then(function (rows) {
      var mine = rows.filter(function (r) { return r.child === child; })[0];
      var cur = mine && mine.dish;
      var first = !at;
      show(topBar() + '<div class="greet" style="' + colorOf(child) + '"><div class="pic">' + drawCharacter(child) + '</div>' +
        '<div class="bubble"><h1>היי ' + CHARACTERS[child].name + '!</h1><p>איזה סנדוויץ\' תרצו לקחת לבית הספר מחר בבוקר?</p></div></div>' +
        (cur ? '<div class="ok' + (saved ? " pop" : "") + '" style="' + colorOf(child) + '"><span class="e">' + emoji(cur) + '</span><span>' + (saved ? "נשמר! " : "בחרתם: ") + '<b>' + esc(cur) + '</b> · אפשר לשנות</span></div>' : '') +
        '<div class="grid" style="' + colorOf(child) + '">' + DISHES.map(function (d, i) {
          return '<button class="dish' + (d.n === cur ? " sel" : "") + '" data-i="' + i + '"><span class="em">' + d.e + '</span>' + esc(d.n) + '</button>';
        }).join("") + '</div>');
      bindSwitch();
      if (saved && at) burst(at.x, Math.min(at.y, window.innerHeight - 40));
      Array.prototype.forEach.call(app.querySelectorAll(".dish"), function (b) {
        b.onclick = function (ev) {
          var pt = {x: ev.clientX || window.innerWidth / 2, y: ev.clientY || 200};
          setChoice(child, t.iso, DISHES[b.dataset.i].n).then(function () { screenPick(child, true, pt); })
            .catch(function () { alert("לא הצלחנו לשמור. נסו שוב"); });
        };
      });
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
          '<div class="mom-head" style="' + colorOf("mom") + '"><div class="pic">' + drawCharacter("mom") + '</div><div><h1>הסנדוויץ\'ים ל' + t.label + ' בבוקר</h1><p class="sub" style="margin:0">' + done + ' מתוך ' + KIDS.length + ' בחרו</p></div></div>' +
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

  if (demo) document.getElementById("demo").hidden = false;
  route();
})();
