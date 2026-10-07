(function () {
  var P = "sandwich_";
  var VERSION = ((document.currentScript && document.currentScript.src || "").split("v=")[1] || "").split("&")[0];
  var KIDS = ["lia", "daniela", "evyatar"];
  var DISHES = [
    {n: "חומוס ומלפפון חמוץ", e: ["hummus", "pickle"]}, {n: "חומוס ופסטרמה", e: ["hummus", "pastrami"]}, {n: "חומוס וסלמי", e: ["hummus", "salami"]},
    {n: "גבינה לבנה", e: ["tub"]}, {n: "גבינת נפוליאון", e: ["napoleon"]}, {n: "חומוס", e: ["hummus"]},
    {n: "חביתה", e: "🍳"}, {n: "ריבת תות", e: "🍓", old: ["ריבה", "ריבה תות"]}, {n: "שוקולד נוטלה", e: "🍫", old: ["שוקולד"]},
    {n: "פיתה זעתר", e: "🫓"}, {n: "טוסט", e: "🍞"}, {n: "סלט ביצים", e: ["eggs"]},
    {n: "טונה", e: "🐟"}, {n: "קוטג'", e: ["cottage"]},
    {n: "לאבנה", e: ["labneh"], old: ["לבנה"], isNew: true}, {n: "חמאה ומלח", e: ["butter"], isNew: true}];
  // בחירות ישנות ששמרו שם קודם של מנה
  function canon(name) { for (var i = 0; i < DISHES.length; i++) if (DISHES[i].n === name || (DISHES[i].old || []).indexOf(name) >= 0) return DISHES[i].n; return name; }

  // אייקונים מצוירים לאוכל שאין לו אימוג'י מתאים
  var SVG = {
    hummus: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M5 31h54c0 15-11 25-27 25S5 46 5 31z" fill="#f6f1e7" stroke="#c9bfa9" stroke-width="2"/><ellipse cx="32" cy="31" rx="27" ry="9" fill="#ecd196" stroke="#c9bfa9" stroke-width="2"/><ellipse cx="32" cy="31" rx="16" ry="4.6" fill="none" stroke="#c98a1b" stroke-width="2.4"/><ellipse cx="32" cy="31" rx="7" ry="2" fill="#dcae4e"/><circle cx="19" cy="28" r="3.4" fill="#d9ad62" stroke="#b5842f" stroke-width="1.2"/><circle cx="45" cy="29" r="3.4" fill="#d9ad62" stroke="#b5842f" stroke-width="1.2"/><circle cx="32" cy="25.5" r="3.4" fill="#d9ad62" stroke="#b5842f" stroke-width="1.2"/><circle cx="26" cy="35" r="1.1" fill="#c0392b"/><circle cx="38" cy="35.5" r="1.1" fill="#c0392b"/></svg>',
    pastrami: '<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="34" rx="27" ry="20" fill="#7a2a1c" stroke="#3b1710" stroke-width="2"/><ellipse cx="32" cy="33" rx="22" ry="15.5" fill="#d0646d"/><path d="M14 30c8-6 20 4 36-4M13 38c9-5 22 5 38-3M20 44c7-3 17 2 25-2" fill="none" stroke="#f0a8ab" stroke-width="2.2" stroke-linecap="round"/><g fill="#24140f"><circle cx="10" cy="34" r="1.5"/><circle cx="16" cy="46" r="1.5"/><circle cx="28" cy="52" r="1.5"/><circle cx="42" cy="51" r="1.5"/><circle cx="53" cy="43" r="1.5"/><circle cx="55" cy="31" r="1.5"/><circle cx="46" cy="19" r="1.5"/><circle cx="30" cy="15" r="1.5"/><circle cx="17" cy="21" r="1.5"/></g></svg>',
    salami: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="38" cy="26" r="19" fill="#c0443f" stroke="#7a1a22" stroke-width="2" opacity=".75"/><circle cx="29" cy="35" r="22" fill="#b5303a" stroke="#7a1a22" stroke-width="2.4"/><g fill="#f6d9d0"><circle cx="21" cy="28" r="2.4"/><circle cx="33" cy="25" r="2"/><circle cx="38" cy="36" r="2.6"/><circle cx="26" cy="41" r="2.2"/><circle cx="17" cy="38" r="1.8"/><circle cx="31" cy="47" r="1.8"/><circle cx="42" cy="27" r="1.6"/><circle cx="24" cy="20" r="1.6"/></g></svg>',
    pickle: '<svg viewBox="0 0 64 64" aria-hidden="true"><g transform="rotate(-32 32 32)"><rect x="5" y="20" width="54" height="25" rx="12.5" fill="#7f9a2e" stroke="#46591a" stroke-width="2.4"/><path d="M15 28h28" stroke="#b4cc5a" stroke-width="2.6" stroke-linecap="round" opacity=".85"/><g fill="#46591a"><circle cx="17" cy="36" r="1.7"/><circle cx="27" cy="39" r="1.7"/><circle cx="37" cy="36" r="1.7"/><circle cx="47" cy="39" r="1.7"/><circle cx="23" cy="32" r="1.4"/><circle cx="42" cy="32" r="1.4"/><circle cx="32" cy="31" r="1.4"/></g></g></svg>',
    napoleon: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 60c1-11 9-15 22-15s21 4 22 15z" fill="#2c4f9e" stroke="#1b3270" stroke-width="1.6"/><path d="M20 47l12 13M44 47L32 60" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/><circle cx="32" cy="46" r="1.6" fill="#e5b73b"/><circle cx="32" cy="37" r="11.5" fill="#f7cba3" stroke="#c1906a" stroke-width="1.6"/><circle cx="27.8" cy="37" r="1.6" fill="#2a1d17"/><circle cx="36.2" cy="37" r="1.6" fill="#2a1d17"/><path d="M27.5 42.5q4.5 3.2 9 0" stroke="#a24a3a" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M20.5 32.5q-2.6 6 .4 10M43.5 32.5q2.6 6-.4 10" stroke="#6a4528" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M2 29c5-13 18-19 30-13 12-6 25 0 30 13-9-5-19-5-30-2-11-3-21-3-30 2z" fill="#1c1c25" stroke="#000" stroke-width="1.4"/><path d="M7 28c8-4 17-4 25-1 8-3 17-3 25 1" fill="none" stroke="#e5b73b" stroke-width="2"/><circle cx="48" cy="21.5" r="3.8" fill="#e63946"/><circle cx="48" cy="21.5" r="2.3" fill="#fff"/><circle cx="48" cy="21.5" r="1" fill="#2c4f9e"/></svg>',
    tub: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 26h44l-4 29q-.7 4-5 4H19q-4.3 0-5-4z" fill="#fbfbf6" stroke="#b9b9aa" stroke-width="2"/><rect x="37" y="-0" width="0" height="0"/><path d="M12 36h40l-1.2 8H13.2z" fill="#cfe8ff"/><path d="M26 40q3-5 6 0t6 0" stroke="#4aa3e8" stroke-width="2.2" fill="none" stroke-linecap="round"/><rect x="7" y="17" width="50" height="11" rx="4" fill="#4aa3e8" stroke="#2a7bbd" stroke-width="2"/><path d="M13 21h20" stroke="#9fd0f5" stroke-width="2.2" stroke-linecap="round"/></svg>',
    labneh: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M13 26h38l-3.4 29q-.6 4-4.6 4H21q-4 0-4.6-4z" fill="#fbfbf6" stroke="#b9b9aa" stroke-width="2"/><circle cx="25.5" cy="43" r="2.4" fill="#2b2b2b"/><circle cx="38.5" cy="43" r="2.4" fill="#2b2b2b"/><path d="M28 50q4 3 8 0" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"/><path d="M6 46Q4 14 32 7Q60 14 58 46L52 44V27H12v17z" fill="#fff" stroke="#9a9a8c" stroke-width="2" stroke-linejoin="round"/><g stroke="#d6262d" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M10 22h12M42 22h12M9 32h6M49 32h6M8 41h4M52 41h4"/><path d="M20 12l-2 6M32 9v6M44 12l2 6" /></g><path d="M12 19Q32 5 52 19" fill="none" stroke="#222" stroke-width="5" stroke-linecap="round"/><path d="M13 19q19-12 38 0" fill="none" stroke="#555" stroke-width="1.2" stroke-linecap="round" opacity=".6"/></svg>',
    butter: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M3 34l14-9h27l5 9v17H3z" fill="#ffe27a" stroke="#c9a31f" stroke-width="2" stroke-linejoin="round"/><path d="M3 34h46M44 25l5 9" fill="none" stroke="#c9a31f" stroke-width="2"/><path d="M3 34l14-9h27l5 9z" fill="#fff0a8" stroke="#c9a31f" stroke-width="2" stroke-linejoin="round"/><path d="M8 43h20" stroke="#fff6c4" stroke-width="2.4" stroke-linecap="round"/><path d="M47 29q3-4 7 0" fill="none" stroke="#c9a31f" stroke-width="0"/><g transform="translate(47 17)"><rect x="1" y="12" width="14" height="31" rx="3.5" fill="#f4f8ff" stroke="#9db0c9" stroke-width="2"/><path d="M2 14q6-12 12 0z" fill="#cfd8e6" stroke="#9db0c9" stroke-width="2" stroke-linejoin="round"/><circle cx="6" cy="8.5" r="1" fill="#6b7a90"/><circle cx="10" cy="8.5" r="1" fill="#6b7a90"/><circle cx="8" cy="5.5" r="1" fill="#6b7a90"/><path d="M4 24h8M4 30h8" stroke="#7d93b3" stroke-width="2" stroke-linecap="round"/></g></svg>',
    cottage: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M13 28h38l-4.2 28q-.6 3.6-4.4 3.6H21.6q-3.8 0-4.4-3.6z" fill="#fffef6" stroke="#c7c1a4" stroke-width="2"/><path d="M15 40h34l-1.2 9H16.2z" fill="#a5d86a"/><path d="M26 44.5h12" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><g fill="#fffdf0" stroke="#d4cdb0" stroke-width="1.6"><circle cx="20" cy="26" r="6"/><circle cx="44" cy="26" r="6"/><circle cx="32" cy="22" r="8"/><circle cx="25.5" cy="21" r="5"/><circle cx="38.5" cy="20.5" r="5"/><circle cx="32" cy="27" r="6"/></g><ellipse cx="13" cy="28" rx="1.5" ry="1.5" fill="#c7c1a4"/></svg>',
    eggs: '<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="18" cy="32" rx="13" ry="19" fill="#fffdf6" stroke="#d3cbb2" stroke-width="2"/><ellipse cx="18" cy="35" rx="7" ry="8.6" fill="#ffc72b" stroke="#e0a10f" stroke-width="1.6"/><ellipse cx="46" cy="32" rx="13" ry="19" fill="#fffdf6" stroke="#d3cbb2" stroke-width="2"/><ellipse cx="46" cy="35" rx="7" ry="8.6" fill="#ffc72b" stroke="#e0a10f" stroke-width="1.6"/><ellipse cx="15.5" cy="32" rx="2" ry="2.6" fill="#ffe27a"/><ellipse cx="43.5" cy="32" rx="2" ry="2.6" fill="#ffe27a"/></svg>'
  };
  function ico(e) {
    if (typeof e === "string") return e;
    return '<span class="pair' + (e.length === 1 ? " one" : "") + '">' + e.map(function (k) { return SVG[k]; }).join("") + '</span>';
  }
  var DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  function dayLabel(isoStr) {
    var d = new Date(isoStr + "T12:00:00");
    return "יום " + DAYS[d.getDay()] + " · " + d.getDate() + "." + (d.getMonth() + 1);
  }
  function emoji(name) { name = canon(name); for (var i = 0; i < DISHES.length; i++) if (DISHES[i].n === name) return ico(DISHES[i].e); return "🥪"; }
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

  // זמינות מנות: ליאורי מסמנת מה אזל. ברירת מחדל: הכול זמין. שום דבר לא משתנה לבד.
  function getOff() {
    if (demo) return Promise.resolve(JSON.parse(store("demo_off") || "[]"));
    return rpc("sandwich_unavail_get", {}).then(function (rows) { return (rows || []).map(function (r) { return r.dish; }); });
  }
  function setOff(dish, off) {
    if (demo) {
      var cur = JSON.parse(store("demo_off") || "[]").filter(function (d) { return d !== dish; });
      if (off) cur.push(dish);
      store("demo_off", JSON.stringify(cur));
      return Promise.resolve();
    }
    return rpc("sandwich_unavail_set", {p_dish: dish, p_off: off}).then(function () {
      // מי שכבר בחר את המנה מקבל התראה לבחור מחדש (לא מחכים לתשובה)
      if (off) fetch(cfg.supabaseUrl + "/functions/v1/send-reminders?action=dish_off&dish=" + encodeURIComponent(dish), {
        method: "POST", headers: {apikey: cfg.supabaseAnonKey, Authorization: "Bearer " + (cfg.functionsKey || cfg.supabaseAnonKey)}
      }).catch(function () {});
    });
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
    }).then(function (sub) { return child ? saveSub(child, sub) : null; }).then(function () { if (child) store("push_child", child); });
  }
  function bellOn(b) { b.textContent = "תזכורות - מופעל"; b.classList.remove("off"); b.classList.add("on"); }
  function bellOff(b) { b.textContent = "תזכורות - כבוי"; b.classList.remove("on"); b.classList.add("off"); }
  function setupBell() {
    var bell = document.getElementById("bell");
    if (!bell) return;
    var panel = null;
    function kid() { var w = store("who"); return KIDS.indexOf(w) >= 0 ? w : null; }
    function closePanel() { if (panel) { panel.remove(); panel = null; } }
    function schedule() { return "כל יום ב-17:00 וב-19:00 תגיע תזכורת לבחור סנדוויץ' למחר, אם עוד לא בחרתם."; }
    function body(msg) {
      var owner = store("push_child"), k = kid();
      if (bell.classList.contains("on")) {
        return '<h3><i class="dot on"></i> התזכורות פעילות</h3><p>' + (owner && CHARACTERS[owner] ? 'במכשיר הזה התזכורות מגיעות ל<b>' + CHARACTERS[owner].name + '</b>. ' : '') + schedule() + '</p>' +
          (k && owner && k !== owner ? '<button class="main" id="move" type="button">להעביר ל' + CHARACTERS[k].name + '</button>' : '') +
          '<button class="main off" id="off" type="button">כיבוי תזכורות</button>';
      }
      if (msg) return '<h3><i class="dot"></i> תזכורות</h3><p>' + msg + '</p><p class="sm">' + schedule() + '</p>';
      if (!pushSupported()) {
        return '<h3><i class="dot"></i> איך מפעילים תזכורות</h3><p>' + schedule() + '</p>' + (isIOS()
          ? '<ol><li>בספארי לוחצים על כפתור השיתוף (הריבוע עם החץ למעלה).</li><li>בוחרים "הוספה למסך הבית" ואז "הוספה".</li><li>פותחים את האפליקציה מהאייקון החדש במסך הבית.</li><li>לוחצים שוב על "תזכורות", ומאשרים.</li></ol>'
          : '<p class="sm">הדפדפן הזה לא תומך בתזכורות. אפשר לנסות בכרום או בספארי.</p>');
      }
      if (!k) return '<h3><i class="dot"></i> איך מפעילים תזכורות</h3><p>קודם לוחצים על הדמות שלכם, אחר כך חוזרים למסך הדמויות ומפעילים תזכורות. התזכורות יהיו קשורות לדמות שבחרתם.</p><p class="sm">' + schedule() + '</p>';
      return '<h3><i class="dot"></i> איך מפעילים תזכורות</h3><p>' + schedule() + '</p><p>במכשיר הזה התזכורות יגיעו ל<b>' + CHARACTERS[k].name + '</b>.</p><button class="main" id="enable" type="button">הפעלת תזכורות</button><p class="sm">הטלפון ישאל אם לאשר התראות. יש ללחוץ "אפשר".</p>';
    }
    function draw(msg) {
      if (!panel) {
        panel = document.createElement("div"); panel.className = "panel";
        panel.style.bottom = (app.getBoundingClientRect().height - bell.getBoundingClientRect().top + 8) + "px";
        app.appendChild(panel);
      }
      panel.innerHTML = '<button class="px" type="button" aria-label="סגירה">✕</button>' + body(msg);
      panel.querySelector(".px").onclick = closePanel;
      var en = panel.querySelector("#enable"), off = panel.querySelector("#off"), mv = panel.querySelector("#move");
      if (mv) mv.onclick = function () {
        var k = kid();
        pushState().then(function (sub) { return sub && k ? saveSub(k, sub).then(function () { store("push_child", k); }) : null; })
          .then(function () { draw(); }).catch(function () { draw("לא הצלחנו להעביר. נסו שוב."); });
      };
      if (en) en.onclick = function () {
        // הבקשה לאישור יוצאת ישר מהלחיצה
        enablePush(kid()).then(function () { bellOn(bell); draw(); setTimeout(closePanel, 3200); }).catch(function (e) {
          draw(e && e.message === "denied" ? "ההתראות חסומות. אפשר לאשר אותן בהגדרות הטלפון, בהתראות של האפליקציה, ואז ללחוץ שוב." : "לא הצלחנו להפעיל תזכורות. נסו שוב.");
        });
      };
      if (off) off.onclick = function () {
        pushState().then(function (sub) {
          if (!sub) return null;
          return rpc("sandwich_push_off", {p_endpoint: sub.endpoint}).catch(function () {}).then(function () { return sub.unsubscribe(); });
        }).then(function () { store("push_child", null); bellOff(bell); draw(); }).catch(function () { draw("לא הצלחנו לכבות. נסו שוב."); });
      };
    }
    pushState().then(function (sub) {
      if (!sub) return;
      var owner = store("push_child");
      if (!owner && kid()) { owner = kid(); store("push_child", owner); }
      bellOn(bell);
      if (owner) saveSub(owner, sub).catch(function () {});
    }).catch(function () {});
    bell.onclick = function () { if (panel) closePanel(); else draw(); };
  }
  // ---- מה חדש ----
  // כל גרסה חדשה מוסיפה כאן שורה בראש הרשימה (הגרסה = המספר ב-?v= באינדקס). at = תאריך ושעה בשעון ישראל.
  var RELEASES = [
    {v: "20261007f", at: "7.10.2026 · 13:32", items: [
      "סרט אדום \"חדש!\" על מנות חדשות, והן מופיעות בראש הרשימה.",
      "אמא ליאורי יכולה לסמן מה זמין בבית (הכפתור \"מה יש בבית?\"). מנה שאזלה יורדת לתחתית הרשימה עם תגית \"לא זמין\".",
      "מי שבחר מנה שאזלה מקבל התראה לבחור מחדש, ואמא רואה \"צריך להחליף\".",
      "כפתור i ליד הגרסה: חלון \"מה חדש\" עם פירוט השינויים."
    ]},
    {v: "20261007b", at: "7.10.2026 · 10:04", items: ["שתי מנות חדשות: לאבנה, וחמאה ומלח.", "הסרט העליון בעמודי הבחירה עלה למעלה."]},
    {v: "20261006q", at: "6.10.2026 · 23:23", items: ["כפתור \"התקנה למסך הבית\" עם הסבר צעד אחר צעד."]}
  ];
  function openNotes() {
    var ov = document.createElement("div"); ov.className = "ins";
    var latest = RELEASES[0];
    ov.innerHTML = '<div class="ins-box notes"><button class="px" type="button" aria-label="סגירה">✕</button><h3>מה חדש?</h3>' +
      '<p class="rv">גרסה ' + esc(latest.v) + ' · ' + esc(latest.at) + '</p><ul>' + latest.items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join("") + '</ul>' +
      (RELEASES.length > 1 ? '<h4>גרסאות קודמות</h4>' + RELEASES.slice(1).map(function (r) {
        return '<p class="rv">גרסה <bdi>' + esc(r.v) + '</bdi> · <bdi>' + esc(r.at) + '</bdi>' + '</p><ul>' + r.items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join("") + '</ul>';
      }).join("") : "") + '</div>';
    function close() { ov.remove(); }
    ov.onclick = function (e) { if (e.target === ov) close(); };
    ov.querySelector(".px").onclick = close;
    document.body.appendChild(ov);
  }

  // ---- התקנה למסך הבית ----
  var deferredInstall = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredInstall = e; var b = document.getElementById("install"); if (b) b.hidden = false; });
  function isInstalled() { return window.navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches); }
  var SHARE_ICO = '<svg viewBox="0 0 24 24" aria-hidden="true" style="width:1.1em;height:1.1em;vertical-align:-.2em"><path d="M12 15V4M8 8l4-4 4 4M6 11H5v9h14v-9h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function setupInstall() {
    var btn = document.getElementById("install");
    if (!btn) return;
    btn.onclick = function () {
      if (deferredInstall) {
        deferredInstall.prompt();
        deferredInstall.userChoice.then(function () { deferredInstall = null; btn.hidden = true; });
        return;
      }
      var ov = document.createElement("div"); ov.className = "ins";
      var safari = /safari\//i.test(navigator.userAgent) && !/crios|fxios|edgios|instagram|fban|fbav|line\//i.test(navigator.userAgent);
      var html = '<div class="ins-box"><button class="px" type="button" aria-label="סגירה">✕</button><h3>מוסיפים למסך הבית</h3>';
      if (isIOS() && !safari) {
        html += '<p>הלינק נפתח בתוך אפליקציה אחרת (למשל וואטסאפ). צריך לפתוח אותו בספארי:</p><ol><li>לוחצים על "העתקת לינק".</li><li>פותחים את ספארי ומדביקים בשורת הכתובת.</li><li>חוזרים לכאן ללחוץ "התקנה".</li></ol><button class="main" id="cp" type="button">העתקת לינק</button>';
      } else if (isIOS()) {
        html += '<ol><li>לוחצים על כפתור השיתוף ' + SHARE_ICO + ' בתחתית המסך.</li><li>גוללים ובוחרים <b>"הוספה למסך הבית"</b>.</li><li>לוחצים <b>"הוספה"</b> למעלה.</li><li>פותחים את האפליקציה מהאייקון החדש.</li></ol><div class="ins-arrow" aria-hidden="true">⬇</div>';
      } else {
        html += '<ol><li>לוחצים על שלוש הנקודות בתפריט הדפדפן.</li><li>בוחרים "התקנת אפליקציה" או "הוספה למסך הבית".</li></ol>';
      }
      ov.innerHTML = html + '</div>';
      function close() { ov.remove(); }
      ov.onclick = function (e) { if (e.target === ov) close(); };
      ov.querySelector(".px").onclick = close;
      var cp = ov.querySelector("#cp");
      if (cp) cp.onclick = function () {
        var u = location.href.split("#")[0];
        (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { cp.textContent = "הלינק הועתק ✓"; }, function () { cp.textContent = u; });
      };
      document.body.appendChild(ov);
    };
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

  // ---- הגדלת דמות למסך מלא ----
  var MAGNIFY = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.2" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M15 15l5.5 5.5" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/></svg>';
  function zoomBtn() { return '<span class="zoom" aria-hidden="true">' + MAGNIFY + '</span>'; }
  function picBox(id) { return '<div class="pic" data-zoom="' + id + '" role="button" aria-label="הגדלת הדמות">' + drawCharacter(id) + zoomBtn() + '</div>'; }
  function openZoom(id) {
    var z = document.createElement("div");
    z.id = "zoom"; z.style.cssText = "--c:" + CHARACTERS[id].color;
    z.innerHTML = '<button class="zx" type="button" aria-label="סגירה">✕</button>' + drawCharacter(id, "big");
    function close() { z.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    z.onclick = close; document.addEventListener("keydown", onKey);
    document.body.appendChild(z);
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-zoom]");
    if (b) { e.stopPropagation(); openZoom(b.dataset.zoom); }
  });

  function burstFrom(el) {
    if (!el) return;
    var r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2);
  }

  // הצב של אורן
  var TURTLE = '<svg viewBox="0 8 68 50" aria-hidden="true"><ellipse cx="32" cy="55" rx="22" ry="3.2" fill="#000" opacity=".18"/><path d="M8 47l-5 3 6 .5z" fill="#7fc65a" stroke="#3f8f33" stroke-width="1.8" stroke-linejoin="round"/><rect x="14" y="43" width="10" height="11" rx="5" fill="#8fd467" stroke="#3f8f33" stroke-width="2"/><rect x="40" y="43" width="10" height="11" rx="5" fill="#8fd467" stroke="#3f8f33" stroke-width="2"/><path d="M52 40c1-8 6-14 11-10 3 3 1 10-3 13-3 2-7 2-8-3z" fill="#8fd467" stroke="#3f8f33" stroke-width="2" stroke-linejoin="round"/><circle cx="59.2" cy="33.2" r="2" fill="#1d2b1a"/><circle cx="59.8" cy="32.6" r=".7" fill="#fff"/><path d="M57 38.5q2.5 1.6 4.6 0" fill="none" stroke="#1d2b1a" stroke-width="1.4" stroke-linecap="round"/><path d="M8 46C8 28 18 17 32 17s24 11 24 29z" fill="#58b447" stroke="#2f7a2a" stroke-width="2.4" stroke-linejoin="round"/><path d="M32 22l8 5v9l-8 5-8-5v-9z" fill="#7ad45f" stroke="#2f7a2a" stroke-width="1.8" stroke-linejoin="round"/><path d="M24 27l-10 3M24 36l-8 7M40 27l10 3M40 36l8 7M32 41v5M32 22v-4" fill="none" stroke="#2f7a2a" stroke-width="1.8" stroke-linecap="round"/><path d="M11 46h42" stroke="#2f7a2a" stroke-width="2.4" stroke-linecap="round"/></svg>';

  function screenWho() {
    show('<div class="hero"><h1>בוחרים סנדוויץ\' למחר בבוקר!</h1><p class="sub">לחצו על השם שלכם</p></div><div class="who">' +
      KIDS.map(function (id) { return '<button class="person" data-id="' + id + '" style="' + colorOf(id) + '"><div class="stage">' + drawCharacter(id) + '</div><b>' + CHARACTERS[id].name + '</b></button>'; }).join("") +
      '</div><button class="mom-card" data-id="mom" style="' + colorOf("mom") + '">' + drawCharacter("mom") + '<span class="mc-text"><b>' + CHARACTERS.mom.name + '</b><small>לראות מה כולם בחרו</small></span></button>' +
      (demo || isInstalled() ? "" : '<button class="install" id="install" type="button">' + SHARE_ICO + ' התקנה למסך הבית</button>') +
      '<footer class="credit"><div class="cr"><div class="by"><span>נבנה על ידי אבא אורן</span><span class="tzav">' + TURTLE + '</span></div><div class="ver">גרסה ' + esc(VERSION) + ' <button class="info" id="info" type="button" aria-label="מה חדש בגרסה"><i>i</i><span>לחצו לפרטים</span></button></div></div>' +
      (demo ? "" : '<button class="pill bell off" id="bell" type="button">תזכורות - כבוי</button>') + '</footer>');
    app.className = "home";
    setupBell();
    setupInstall();
    document.getElementById("info").onclick = openNotes;
    Array.prototype.forEach.call(app.querySelectorAll("[data-id]"), function (b) {
      b.onclick = function () { store("who", b.dataset.id); route(); };
    });
  }

  function verb(id) { return CHARACTERS[id].g === "f" ? "בחרה" : "בחר"; }
  function bindSwitch() {
    var sw = document.getElementById("switch");
    if (sw) sw.onclick = function () { screenWho(); };
  }

  // רמז לגלילה: אחרי שתי שניות בלי גלילה מופיע חץ שקוף, ונעלם ברגע שמתחילים לגלול
  function scrollHint(list) {
    if (store("scrolled")) return;
    var hint = document.createElement("div");
    hint.className = "scrollhint"; hint.innerHTML = '<span class="ar">⌄</span> יש עוד אפשרויות, אפשר לגלול';
    app.appendChild(hint);
    var gone = false;
    function hide() { if (gone) return; gone = true; clearTimeout(tm); hint.classList.remove("show"); setTimeout(function () { hint.remove(); }, 400); }
    var tm = setTimeout(function () {
      if (!gone && list.scrollHeight > list.clientHeight + 24 && list.scrollTop < 8) hint.classList.add("show");
    }, 2000);
    list.addEventListener("scroll", function () { if (list.scrollTop > 8) { store("scrolled", "1"); hide(); } }, {passive: true});
  }

  function screenPick(child) {
    var t = target(false);
    var forTxt = t.label === "מחר" ? "למחר" : "ל" + t.label;
    Promise.all([getAll(t.iso), getOff().catch(function () { return []; })]).then(function (res) {
      var rows = res[0], off = res[1];
      var mine = rows.filter(function (r) { return r.child === child; })[0];
      var cur = mine && canon(mine.dish);
      var bad = cur && off.indexOf(cur) >= 0 ? cur : null;
      function rank(d) { return off.indexOf(d.n) >= 0 ? 2 : d.isNew ? 0 : 1; }
      show('<header class="phead" style="' + colorOf(child) + '"><div class="ptop">' +
        '<button class="pill back" id="switch" type="button"><span>חזרה למסך הדמויות</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H5M11 5.5L4.5 12 11 18.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
        '<div class="greet">' + picBox(child) + '' +
        '<div class="bubble"><small>היי ' + CHARACTERS[child].name + '!</small><h1>בחירת סנדוויץ\' ' + forTxt + '</h1><p class="when">' + dayLabel(t.iso) + '</p><div class="ok" id="status"></div></div></div></header>' +
        '<div class="plist" style="' + colorOf(child) + '"><div class="grid">' + DISHES.map(function (d, i) { return {d: d, i: i}; })
          .sort(function (a, b) { return rank(a.d) - rank(b.d) || a.i - b.i; })
          .map(function (o) {
            var no = off.indexOf(o.d.n) >= 0;
            return '<button class="dish' + (no ? " off" : "") + '" data-i="' + o.i + '"' + (no ? " disabled" : "") + '>' + (no ? '<span class="offtag">לא זמין</span>' : o.d.isNew ? '<span class="newtag"><b>חדש!</b></span>' : '') + '<span class="em">' + ico(o.d.e) + '</span><span class="nm">' + esc(o.d.n) + '</span></button>';
          }).join("") + '</div></div>');
      app.className = "pick";
      bindSwitch();
      var status = document.getElementById("status");

      var dishes = Array.prototype.slice.call(app.querySelectorAll(".dish"));
      function paint(saved) {
        if (cur !== bad) bad = null;
        dishes.forEach(function (b) { b.classList.toggle("sel", DISHES[b.dataset.i].n === cur && !bad); });
        status.className = "ok" + (cur && !bad ? "" : " idle") + (bad ? " warn" : "") + (saved ? " pop" : "");
        status.innerHTML = bad
          ? '<span class="e">⚠️</span><span class="tx">' + esc(bad) + ' אזלה. ' + (CHARACTERS[child].g === "f" ? "בחרי" : "בחר") + ' מנה אחרת</span>'
          : cur
          ? '<span class="e">' + emoji(cur) + '</span><span class="tx">בחרת ' + esc(cur) + '!</span>'
          : '<span class="tx">לחצו על מנה כדי לבחור</span>';
      }
      paint(false);
      dishes.forEach(function (b) {
        b.onclick = function () {
          var name = DISHES[b.dataset.i].n;
          if (name === cur) {
            // לחיצה על המנה שכבר נבחרה: מורידים את הבחירה (נשמר כמנה ריקה)
            setChoice(child, t.iso, "").then(function () { cur = null; paint(false); })
              .catch(function () { toast("לא הצלחנו לבטל. נסו שוב"); });
            return;
          }
          setChoice(child, t.iso, name).then(function () {
            cur = name; paint(true); burstFrom(status);
          }).catch(function () { toast("לא הצלחנו לשמור. נסו שוב"); });
        };
      });
      scrollHint(app.querySelector(".plist"));
      // התזכורות שייכות למכשיר ומקושרות לילד שהפעיל אותן כאן (push_child). גלישה בדמויות אחרות לא מזיזה אותן.
      pushState().then(function (sub) {
        if (!sub) return;
        var owner = store("push_child");
        if (!owner) { owner = child; store("push_child", owner); }
        if (owner === child) saveSub(child, sub).catch(function () {});
      }).catch(function () {});
    }).catch(function () { show('<h1>אין חיבור 📡</h1><button class="main" id="retry">נסו שוב</button>'); document.getElementById("retry").onclick = route; });
  }

  // אמא ליאורי שולחת תזכורת (התראת דחיפה) לילד שעוד לא בחר. השרת מגביל: פעם בכל 10 דקות לילד.
  function sendNudge(k, btn, done) {
    var n = CHARACTERS[k].name;
    btn.disabled = true; btn.textContent = "שולח…";
    fetch(cfg.supabaseUrl + "/functions/v1/send-reminders?action=nudge&child=" + k, {
      method: "POST", headers: {apikey: cfg.supabaseAnonKey, Authorization: "Bearer " + (cfg.functionsKey || cfg.supabaseAnonKey)}
    }).then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); }).then(function (j) {
      if (j.result === "sent") { store("nudge_" + k, String(Date.now())); toast("נשלחה תזכורת ל" + n + " ✓"); }
      else if (j.result === "too_soon") { store("nudge_" + k, String(Date.now())); toast("כבר נשלחה תזכורת ל" + n + " לפני רגע"); }
      else if (j.result === "already_chosen") toast(n + " כבר " + verb(k) + "!");
      else toast(n + " עוד לא " + (CHARACTERS[k].g === "f" ? "הפעילה" : "הפעיל") + " תזכורות במכשיר שלו, אז אין לאן לשלוח");
    }).catch(function () { toast("לא הצלחנו לשלוח. נסו שוב"); }).then(done);
  }

  function screenMom() {
    var t = target(true), celebrated = false;
    show('<header class="phead" style="' + colorOf("mom") + '"><div class="ptop"><button class="pill back" id="switch" type="button"><span>חזרה למסך הדמויות</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H5M11 5.5L4.5 12 11 18.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
      '<div class="greet">' + picBox("mom") + '' +
      '<div class="bubble"><h1>הסנדוויצ\'ים של ' + t.label + ' בבוקר</h1><p class="when">' + dayLabel(t.iso) + '</p><div class="ok" id="status"><span class="tx">טוענים…</span></div></div></div></header>' +
      '<div class="plist" id="rows"></div>');
    app.className = "pick";
    bindSwitch();
    var status = document.getElementById("status"), box = document.getElementById("rows");
    // בונים את הרשימה והכפתור פעם אחת; בעדכון משנים רק את תוכן השורות (הדמות למעלה לא זזה)
    box.innerHTML = '<div class="progress"><i style="width:0"></i></div><div id="list"></div><button class="main refresh" id="refresh" type="button">רענון</button><button class="main sec" id="availBtn" type="button">מה יש בבית?</button><p class="momnote">אפשר לשלוח תזכורת לילדים החל מ-12:00 בצהריים.</p>';
    function render() {
      Promise.all([getAll(t.iso), getOff().catch(function () { return []; })]).then(function (res) {
        var rows = res[0], off = res[1];
        var by = {}; rows.forEach(function (r) { by[r.child] = canon(r.dish); });
        var done = KIDS.filter(function (k) { return by[k] && off.indexOf(by[k]) < 0; }).length;
        var all = done === KIDS.length;
        status.className = "ok" + (all ? " all" : " idle");
        status.innerHTML = '<span class="tx">' + (all ? "כולם בחרו 🎉" : done + " מתוך " + KIDS.length + " בחרו") + '</span>';
        box.querySelector(".progress i").style.width = (done / KIDS.length * 100) + "%";
        // כפתור "שלח תזכורת": רק כשליאורי רואה את אותו יום שהילדים בוחרים עליו עכשיו (אחרת אי אפשר כבר לבחור)
        var canNudge = !demo && t.iso === target(false).iso;
        document.getElementById("list").innerHTML = KIDS.map(function (k) {
          var d = by[k], last = parseInt(store("nudge_" + k) || "0", 10), recent = last && (Date.now() - last) < 10 * 60 * 1000;
          var bad = d && off.indexOf(d) >= 0;
          var chip = bad ? '<span class="chip bad">צריך להחליף</span>' : d ? '<span class="chip y">' + verb(k) + ' ✓</span>'
            : (canNudge ? (recent ? '<span class="chip y soft">תזכורת נשלחה ✓</span>' : '<button class="nudge" type="button" data-k="' + k + '">שלח תזכורת</button>')
              : '<span class="chip n">ממתין</span>');
          return '<div class="row ' + (d && !bad ? "done" : "wait") + '" style="' + colorOf(k) + '">' + drawCharacter(k, "face") + '<div><b>' + CHARACTERS[k].name + '</b>' +
            (d ? '<span class="d"><span class="em">' + emoji(d) + '</span>' + esc(d) + (bad ? ' (אזלה)' : '') + '</span>' : '<span class="none">עדיין לא ' + verb(k) + '…</span>') + '</div>' + chip + '</div>';
        }).join("");
        Array.prototype.forEach.call(document.querySelectorAll("#list .nudge"), function (b) {
          b.onclick = function () { sendNudge(b.dataset.k, b, render); };
        });
        if (all && !celebrated) { celebrated = true; burstFrom(status); }
      }).catch(function () { status.innerHTML = '<span class="tx">אין חיבור 📡</span>'; });
    }
    document.getElementById("refresh").onclick = render;
    document.getElementById("availBtn").onclick = screenAvail;
    render();
    timer = setInterval(render, 20000);
  }

  // ליאורי: מה זמין ומה לא. מה שלא זמין יורד לתחתית הרשימה של הילדים עד שהיא מחזירה.
  function screenAvail() {
    getOff().then(function (off) {
      show('<header class="ahead"><button class="pill back" id="switch" type="button"><span>חזרה</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H5M11 5.5L4.5 12 11 18.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
        '<h1>מה יש בבית?</h1><p>מה שלא זמין יורד לתחתית הרשימה של הילדים. מחזירים כשיש שוב.</p></header><div class="plist alist" id="alist"></div>');
      app.className = "pick";
      document.getElementById("switch").onclick = screenMom;
      var box = document.getElementById("alist");
      function paint() {
        box.innerHTML = DISHES.map(function (d, i) {
          var no = off.indexOf(d.n) >= 0;
          return '<div class="arow' + (no ? " no" : "") + '"><span class="em">' + ico(d.e) + '</span><span class="nm">' + esc(d.n) + '</span>' +
            '<button class="sw" type="button" role="switch" aria-checked="' + (!no) + '" data-i="' + i + '">' + (no ? "לא זמין" : "זמין") + '</button></div>';
        }).join("");
        Array.prototype.forEach.call(box.querySelectorAll(".sw"), function (b) {
          b.onclick = function () {
            var n = DISHES[b.dataset.i].n, goOff = off.indexOf(n) < 0;
            b.disabled = true;
            setOff(n, goOff).then(function () {
              off = goOff ? off.concat([n]) : off.filter(function (x) { return x !== n; });
              paint();
              if (goOff) toast(n + " סומנה כלא זמינה. מי שבחר אותה יקבל התראה");
            }).catch(function () { b.disabled = false; toast("לא הצלחנו לשמור. נסו שוב"); });
          };
        });
      }
      paint();
    }).catch(function () { toast("אין חיבור. נסו שוב"); });
  }

  function route() {
    var who = store("who");
    if (!who || !CHARACTERS[who]) return screenWho();
    if (who === "mom") return screenMom();
    screenPick(who);
  }

  // iOS, אפליקציה שנפתחת ממסך הבית: בראש המסך יש שורת שעה וגם אזור מעומעם מתחת לאיילנד (גבוה יותר מהשורה עצמה).
  // לכן מורידים את התוכן: אזור בטוח (או לפי גודל המסך אם הטלפון מדווח 0) ועוד כ-8 פיקסלים.
  (function () {
    try {
      var probe = document.createElement("div");
      probe.style.cssText = "position:fixed;top:0;left:0;visibility:hidden;padding-top:env(safe-area-inset-top,0px)";
      document.body.appendChild(probe);
      var inset = parseFloat(getComputedStyle(probe).paddingTop) || 0;
      probe.remove();
      var standalone = window.navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
      var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (!standalone || !ios) return;
      var h = Math.max(screen.width, screen.height);
      var base = inset || (h >= 852 ? 59 : h >= 812 ? 47 : 20);
      document.documentElement.style.setProperty("--st", (base + (base >= 44 ? 8 : 0)) + "px");
    } catch (e) {}
  })();
  // הסרגל העליון והעמוד לא נגללים: רק רשימת המנות (.plist) גוללת. חוסמים גרירה בשאר המסך (גם "קפיץ" של iOS).
  document.addEventListener("touchmove", function (e) {
    if (e.touches && e.touches.length > 1) return;
    var t = e.target;
    while (t && t !== document.body) { if (t.classList && t.classList.contains("plist")) return; t = t.parentNode; }
    e.preventDefault();
  }, {passive: false});
  // בלי זום בטעות: לא מגיבים לצביטה ב-iOS, ולחיצה כפולה לא מקרבת (touch-action ב-CSS)
  ["gesturestart", "gesturechange", "gestureend"].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); }); });
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(function () {});
  if (demo) document.getElementById("demo").hidden = false;
  route();
})();
