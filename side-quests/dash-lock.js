// Dashboard lock (Oren 9.11.2026): a 4-digit code every time a protected dashboard opens, also inside the app.
// The code is not in the repo: the page compares sha256(salt + ":" + code) with settings/dash_lock in sq_docs.
// 24.8 (Oren 19.11.2026): Face ID (sq-fid.js, load it before this file) opens the lock by itself when it is on for this device
// (⚙️ ← "Face ID לדשבורדים נעולים"); the 4-digit pad is always there as a fallback.
// Load right after sq-db.js. The page stays covered until the code matches; it locks again after 60s in the background.
(function () {
  var css = "#dlk{position:fixed;inset:0;z-index:9990;background:var(--bg,#F3F6F8);color:var(--ink,#15212A);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;font-family:Assistant,system-ui,sans-serif;direction:rtl;padding:24px;touch-action:manipulation}" +
    "#dlk .lt{font-size:30px;line-height:1}#dlk .dots{display:flex;gap:14px;direction:ltr;height:18px}#dlk .dots i{width:16px;height:16px;border-radius:50%;border:2px solid currentColor;display:block;transition:background .12s}" +
    "#dlk .dots i.on{background:currentColor}#dlk.bad .dots{animation:dlks .35s}@keyframes dlks{25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}" +
    "#dlk .pad{display:grid;grid-template-columns:repeat(3,72px);gap:1px;background:var(--line,#D6DFE5);border:1px solid var(--line,#D6DFE5);border-radius:16px;overflow:hidden;direction:ltr}" +
    "#dlk .pad button{height:60px;border:0;background:var(--surface,#fff);color:inherit;font:700 24px Rubik,Assistant,sans-serif;cursor:pointer}#dlk .pad button:active{background:var(--sunk,#E7EDF1)}" +
    "#dlk .pad .x{font-size:18px}#dlk .msg{height:20px;font-size:14px;color:var(--muted,#5A6873);font-weight:700}" +
    "#dlk .bk{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));right:16px;font-weight:800;font-size:15px;color:var(--link,#2C6E86);text-decoration:none}" +
    "html.dlk-on body{overflow:hidden}html.embed #dlk .bk{display:none}" +
    "#dlk .fid{width:218px;height:46px;border:1px solid var(--line,#D6DFE5);border-radius:999px;background:var(--surface,#fff);color:inherit;font:700 16px Assistant,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;direction:rtl}" +
    "#dlk .fid svg{width:22px;height:22px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}" +
    "#dlk .fid:active{background:var(--sunk,#E7EDF1)}#dlk.fw .fid{animation:dlkp 1.6s ease-in-out infinite}@keyframes dlkp{50%{opacity:.55}}" +
    "#dlk.ff .fid{border-color:#F28C38;box-shadow:0 0 0 3px rgba(242,140,56,.18)}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  document.documentElement.classList.add("dlk-on");
  var cfg = null, code = "", bad = 0, waitUntil = 0, el = null, hiddenAt = 0;
  var F = window.SQFid, fidOn = !!(F && F.on());
  var FACE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M9 9v1M15 9v1M12 9v4h-1M9 16c1.7 1.3 4.3 1.3 6 0"/></svg>';
  if (fidOn) F.prep();
  // Face ID: tried by itself when the lock shows; if the phone wants a tap (or it failed) the button stays, and the code always works.
  function fid(auto) {
    if (!fidOn || !el || el.classList.contains("fw")) return;
    el.classList.remove("ff"); el.classList.add("fw"); msg("");
    F.auth().then(function () { unlock(); }, function (e) {
      if (!el) return; el.classList.remove("fw"); el.classList.add("ff");
      if (!auto) msg("Face ID לא עבר · אפשר עם הקוד");
    });
  }

  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); }
  function sha(s) { return crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)).then(hex); }

  function build() {
    if (el) return;
    el = document.createElement("div"); el.id = "dlk"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "קוד");
    var keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "x"];
    el.innerHTML = '<a class="bk" href="./">→ Side Quests</a><div class="lt">🔒</div>' + (fidOn ? '<button type="button" class="fid">' + FACE + '<span>כניסה עם Face ID</span></button>' : '') + '<div class="dots"><i></i><i></i><i></i><i></i></div><div class="pad">' +
      keys.map(function (k) { return k === "" ? "<span style='background:var(--surface,#fff)'></span>" : '<button type="button" data-k="' + k + '"' + (k === "x" ? ' class="x" aria-label="מחק">⌫' : ">" + k) + "</button>"; }).join("") +
      '</div><div class="msg"></div>';
    el.addEventListener("click", function (e) { var b = e.target.closest("button[data-k]"); if (b) key(b.getAttribute("data-k")); else if (e.target.closest(".fid")) fid(false); });
    (document.body || document.documentElement).appendChild(el);
    dots();
    if (fidOn) setTimeout(function () { fid(true); }, 60);
  }
  function dots() { if (!el) return; var d = el.querySelectorAll(".dots i"); for (var i = 0; i < d.length; i++) d[i].className = i < code.length ? "on" : ""; }
  function msg(t) { if (el) el.querySelector(".msg").textContent = t || ""; }
  function key(k) {
    if (Date.now() < waitUntil) { msg("לחכות " + Math.ceil((waitUntil - Date.now()) / 1000) + " שנ׳"); return; }
    if (k === "x") { code = code.slice(0, -1); dots(); return; }
    if (code.length >= 4) return;
    code += k; dots();
    if (code.length === 4) check();
  }
  function check() {
    if (!cfg) { msg("טוען…"); return; }
    var c = code;
    sha(cfg.salt + ":" + c).then(function (h) {
      if (h === cfg.hash) { unlock(); return; }
      bad++; code = ""; el.classList.remove("bad"); void el.offsetWidth; el.classList.add("bad");
      setTimeout(dots, 200);
      if (bad >= 5) { waitUntil = Date.now() + 60000; bad = 0; msg("לחכות דקה"); } else msg("");
    });
  }
  function unlock() { code = ""; if (el) { el.remove(); el = null; } document.documentElement.classList.remove("dlk-on"); }
  function lock() { if (el) return; document.documentElement.classList.add("dlk-on"); if (fidOn) F.prep(); build(); }

  if (document.body) build(); else document.addEventListener("DOMContentLoaded", build);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > 60000) lock();
  });
  if (window.claude && window.claude.use) window.claude.use("db").then(function (db) {
    if (!db) return;
    db.doc("settings/dash_lock").onSnapshot(function (s) {
      var d = s && s.exists ? s.data() : null;
      if (d && d.salt && d.hash) { var was = !cfg; cfg = d; if (was && code.length === 4) check(); }
      else msg("אין קוד מוגדר");
    }, function () { msg("אין חיבור"); });
  });
})();
