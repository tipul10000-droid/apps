(function () {
  var P = "sandwich_";
  var KIDS = ["lia", "daniela", "evyatar"];
  var DISHES = ["חומוס ומלפפון חמוץ", "חומוס ופסטרמה", "חומוס וסלמי", "גבינה לבנה", "גבינת נפוליאון", "חומוס",
    "חביתה", "ריבה", "שוקולד", "פיתה זעתר", "טוסט", "סלט ביצים", "טונה", "קוטג"];
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
  function rpc(name, body) {
    return fetch(cfg.supabaseUrl + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: {"Content-Type": "application/json", apikey: cfg.supabaseAnonKey, Authorization: "Bearer " + cfg.supabaseAnonKey},
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error(t.indexOf("bad code") >= 0 ? "bad code" : "שגיאה " + r.status); });
      return r.text().then(function (t) { return t ? JSON.parse(t) : null; });
    });
  }
  function getAll(code, date) {
    if (demo) return Promise.resolve(JSON.parse(store("demo_" + date) || "[]"));
    return rpc("sandwich_get", {p_code: code, p_date: date});
  }
  function setChoice(code, child, date, dish) {
    if (demo) {
      var rows = JSON.parse(store("demo_" + date) || "[]").filter(function (r) { return r.child !== child; });
      rows.push({child: child, dish: dish});
      store("demo_" + date, JSON.stringify(rows));
      return Promise.resolve();
    }
    return rpc("sandwich_set", {p_code: code, p_child: child, p_date: date, p_dish: dish});
  }

  // ---- מסכים ----
  function show(html) { clearInterval(timer); app.innerHTML = html; }

  function screenCode(msg) {
    show('<h1>ברוכים הבאים</h1><p class="sub">הקלידו את הקוד המשפחתי</p>' +
      '<input id="code" autocomplete="off" autocapitalize="off"><div class="err">' + (msg || "") + '</div>' +
      '<button class="main" id="go">כניסה</button>');
    var inp = document.getElementById("code");
    function go() {
      var c = inp.value.trim();
      if (!c) return;
      store("code", c);
      // בדיקת קוד מול השרת
      getAll(c, target(false).iso).then(function () { screenWho(); }).catch(function (e) {
        store("code", null);
        screenCode(e.message === "bad code" ? "הקוד לא נכון" : "אין חיבור. נסו שוב");
      });
    }
    document.getElementById("go").onclick = go;
    inp.onkeydown = function (e) { if (e.key === "Enter") go(); };
  }

  function screenWho() {
    var ids = KIDS.concat(["mom"]);
    show('<h1>מי אתם?</h1><p class="sub">בחרו את הדמות שלכם</p><div class="grid">' +
      ids.map(function (id) { return '<button class="card" data-id="' + id + '">' + drawCharacter(id) + CHARACTERS[id].name + '</button>'; }).join("") +
      '</div>');
    Array.prototype.forEach.call(app.querySelectorAll(".card"), function (b) {
      b.onclick = function () { store("who", b.dataset.id); route(); };
    });
  }

  function topBar() {
    return '<div class="top"><span></span><button class="link" id="switch">לא אני? החלפה</button></div>';
  }
  function bindSwitch() {
    var s = document.getElementById("switch");
    if (s) s.onclick = function () { store("who", null); screenWho(); };
  }

  function screenPick(child, saved) {
    var t = target(false), code = store("code");
    getAll(code, t.iso).then(function (rows) {
      var mine = rows.filter(function (r) { return r.child === child; })[0];
      var cur = mine && mine.dish;
      show(topBar() + '<h1>היי ' + CHARACTERS[child].name + '!</h1><p class="sub">איזה סנדוויץ\' תרצו לקחת לבית הספר מחר בבוקר?</p>' +
        (saved ? '<div class="ok">נשמר ✔ אפשר לשנות</div>' : cur ? '<div class="ok">בחרתם: <b>' + esc(cur) + '</b></div>' : '') +
        '<div class="grid">' + DISHES.map(function (d, i) {
          return '<button class="card dish' + (d === cur ? " sel" : "") + '" data-i="' + i + '">' + esc(d) + '</button>';
        }).join("") + '</div>');
      bindSwitch();
      Array.prototype.forEach.call(app.querySelectorAll(".dish"), function (b) {
        b.onclick = function () {
          setChoice(code, child, t.iso, DISHES[b.dataset.i]).then(function () { screenPick(child, true); window.scrollTo(0, 0); })
            .catch(function () { alert("לא הצלחנו לשמור. נסו שוב"); });
        };
      });
    }).catch(function () { show('<h1>אין חיבור</h1><button class="main" id="retry">נסו שוב</button>'); document.getElementById("retry").onclick = route; });
  }

  function screenMom() {
    var t = target(true), code = store("code");
    function render() {
      getAll(code, t.iso).then(function (rows) {
        var by = {}; rows.forEach(function (r) { by[r.child] = r.dish; });
        var left = KIDS.filter(function (k) { return !by[k]; }).length;
        var html = topBar() + '<h1>הסנדוויץ\'ים ל' + t.label + ' בבוקר</h1><p class="sub">' + (left ? "עוד לא בחרו: " + left : "כולם בחרו 🎉") + '</p>' +
          KIDS.map(function (k) {
            return '<div class="row ' + (by[k] ? "done" : "wait") + '">' + drawCharacter(k) + '<div><b>' + CHARACTERS[k].name + '</b>' +
              (by[k] ? '<span class="d">' + esc(by[k]) + '</span>' : '<span class="none">עדיין לא בחר/ה</span>') + '</div></div>';
          }).join("") + '<button class="main" id="refresh">רענון</button>';
        app.innerHTML = html;
        bindSwitch();
        document.getElementById("refresh").onclick = render;
      }).catch(function () { app.innerHTML = '<h1>אין חיבור</h1>'; });
    }
    show("");
    render();
    timer = setInterval(render, 20000);
  }

  function route() {
    var code = store("code"), who = store("who");
    if (!code) return screenCode();
    if (!who || !CHARACTERS[who]) return screenWho();
    if (who === "mom") return screenMom();
    screenPick(who);
  }

  if (demo) document.getElementById("demo").hidden = false;
  route();
})();
